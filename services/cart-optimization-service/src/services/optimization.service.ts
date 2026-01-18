import axios from 'axios';
import { config } from '../config';
import { redisClient } from '../utils/redis';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  store: string;
  quantity: number;
  imageUrl?: string;
  category?: string;
}

interface ProductAlternative {
  productId: string;
  name: string;
  price: number;
  store: string;
  imageUrl?: string;
  category?: string;
  inStock: boolean;
  savings: number;
  savingsPercent: number;
}

interface StoreGroup {
  store: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  qualifiesForFreeDelivery: boolean;
}

interface OptimizationResult {
  mode: 'price' | 'time' | 'convenience';
  originalTotal: number;
  optimizedTotal: number;
  totalSavings: number;
  savingsPercent: number;
  storeGroups: StoreGroup[];
  recommendations: OptimizationRecommendation[];
  alternatives: Map<string, ProductAlternative[]>;
}

interface OptimizationRecommendation {
  type: 'bundle' | 'switch_store' | 'alternative_product' | 'remove_item';
  message: string;
  potentialSavings: number;
  itemId?: string;
  suggestedStore?: string;
  suggestedProduct?: ProductAlternative;
}

class OptimizationService {
  private catalogApi = axios.create({ baseURL: config.catalogServiceUrl });
  private inventoryApi = axios.create({ baseURL: config.inventoryServiceUrl });
  private deliveryApi = axios.create({ baseURL: config.deliveryServiceUrl });

  // Optimize cart based on mode (price, time, convenience)
  async optimizeCart(
    items: CartItem[],
    mode: 'price' | 'time' | 'convenience' = 'price'
  ): Promise<OptimizationResult> {
    // Try cache first
    const cacheKey = `cart:optimize:${mode}:${JSON.stringify(items)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let result: OptimizationResult;

    switch (mode) {
      case 'price':
        result = await this.optimizeByPrice(items);
        break;
      case 'time':
        result = await this.optimizeByTime(items);
        break;
      case 'convenience':
        result = await this.optimizeBySingleStore(items);
        break;
      default:
        result = await this.optimizeByPrice(items);
    }

    // Cache for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  // Optimize by price - find cheapest combination across stores
  private async optimizeByPrice(items: CartItem[]): Promise<OptimizationResult> {
    // Get product alternatives from other stores
    const alternatives = await this.getProductAlternatives(items);

    // Calculate original cart total
    const originalGroups = this.groupByStore(items);
    const originalTotal = this.calculateTotal(originalGroups);

    // Find best price for each item
    const optimizedItems: CartItem[] = [];
    for (const item of items) {
      const itemAlternatives = alternatives.get(item.productId) || [];
      const allOptions = [
        { ...item, savings: 0, savingsPercent: 0 },
        ...itemAlternatives.filter((alt) => alt.inStock),
      ];

      // Pick cheapest option
      const cheapest = allOptions.reduce((prev, curr) =>
        curr.price < prev.price ? curr : prev
      );

      optimizedItems.push({
        productId: cheapest.productId,
        name: cheapest.name,
        price: cheapest.price,
        store: cheapest.store,
        quantity: item.quantity,
        imageUrl: cheapest.imageUrl,
        category: cheapest.category,
      });
    }

    // Group optimized items and calculate delivery fees
    const optimizedGroups = this.groupByStore(optimizedItems);
    const optimizedTotal = this.calculateTotal(optimizedGroups);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      originalGroups,
      optimizedGroups,
      alternatives
    );

    return {
      mode: 'price',
      originalTotal,
      optimizedTotal,
      totalSavings: originalTotal - optimizedTotal,
      savingsPercent: ((originalTotal - optimizedTotal) / originalTotal) * 100,
      storeGroups: optimizedGroups,
      recommendations,
      alternatives,
    };
  }

  // Optimize by time - minimize delivery time
  private async optimizeByTime(items: CartItem[]): Promise<OptimizationResult> {
    // For time optimization, we want items from stores with fastest delivery
    // In a real implementation, we'd query delivery service for store delivery times
    // For now, we'll prefer grouping to reduce number of deliveries

    const groups = this.groupByStore(items);
    const originalTotal = this.calculateTotal(groups);

    // Sort stores by item count (more items = likely faster to consolidate)
    const sortedGroups = groups.sort((a, b) => b.itemCount - a.itemCount);

    return {
      mode: 'time',
      originalTotal,
      optimizedTotal: this.calculateTotal(sortedGroups),
      totalSavings: 0,
      savingsPercent: 0,
      storeGroups: sortedGroups,
      recommendations: [
        {
          type: 'bundle',
          message: `Your order will arrive in ${sortedGroups.length} delivery${
            sortedGroups.length > 1 ? 'ies' : ''
          }`,
          potentialSavings: 0,
        },
      ],
      alternatives: new Map(),
    };
  }

  // Optimize by convenience - single store
  private async optimizeBySingleStore(items: CartItem[]): Promise<OptimizationResult> {
    // Find store with most items or lowest total
    const groups = this.groupByStore(items);
    const originalTotal = this.calculateTotal(groups);

    // Pick store with most items
    const mainStore = groups.reduce((prev, curr) =>
      curr.itemCount > prev.itemCount ? curr : prev
    );

    return {
      mode: 'convenience',
      originalTotal,
      optimizedTotal: mainStore.total,
      totalSavings: originalTotal - mainStore.total,
      savingsPercent: ((originalTotal - mainStore.total) / originalTotal) * 100,
      storeGroups: [mainStore],
      recommendations: [
        {
          type: 'bundle',
          message: `Single delivery from ${mainStore.store} for maximum convenience`,
          potentialSavings: 0,
        },
      ],
      alternatives: new Map(),
    };
  }

  // Get product alternatives from other stores
  private async getProductAlternatives(items: CartItem[]): Promise<Map<string, ProductAlternative[]>> {
    const alternatives = new Map<string, ProductAlternative[]>();

    for (const item of items) {
      try {
        // Search for similar products across all stores
        const response = await this.catalogApi.get('/api/products/search', {
          params: {
            query: item.name,
            limit: 10,
          },
        });

        const similarProducts = response.data.data || [];

        // Filter to different stores and calculate savings
        const itemAlternatives: ProductAlternative[] = similarProducts
          .filter((p: any) => p.store !== item.store && p.id !== item.productId)
          .map((p: any) => ({
            productId: p.id,
            name: p.name,
            price: p.price,
            store: p.store,
            imageUrl: p.imageUrl,
            category: p.category,
            inStock: p.inStock !== false,
            savings: (item.price - p.price) * item.quantity,
            savingsPercent: ((item.price - p.price) / item.price) * 100,
          }))
          .filter((alt) => alt.savings > 0); // Only cheaper alternatives

        if (itemAlternatives.length > 0) {
          alternatives.set(item.productId, itemAlternatives);
        }
      } catch (error) {
        console.error(`Failed to get alternatives for ${item.productId}:`, error);
      }
    }

    return alternatives;
  }

  // Group cart items by store
  private groupByStore(items: CartItem[]): StoreGroup[] {
    const storeMap = new Map<string, CartItem[]>();

    items.forEach((item) => {
      if (!storeMap.has(item.store)) {
        storeMap.set(item.store, []);
      }
      storeMap.get(item.store)!.push(item);
    });

    const groups: StoreGroup[] = [];

    storeMap.forEach((storeItems, store) => {
      const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const qualifiesForFreeDelivery = subtotal >= config.freeDeliveryThreshold;
      const deliveryFee = qualifiesForFreeDelivery ? 0 : config.baseDeliveryFee;

      groups.push({
        store,
        items: storeItems,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        itemCount: storeItems.reduce((sum, item) => sum + item.quantity, 0),
        qualifiesForFreeDelivery,
      });
    });

    return groups;
  }

  // Calculate total with delivery fees
  private calculateTotal(groups: StoreGroup[]): number {
    return groups.reduce((sum, group) => sum + group.total, 0);
  }

  // Generate optimization recommendations
  private generateRecommendations(
    originalGroups: StoreGroup[],
    optimizedGroups: StoreGroup[],
    alternatives: Map<string, ProductAlternative[]>
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check for bundling opportunities
    for (const group of optimizedGroups) {
      const needed = config.freeDeliveryThreshold - group.subtotal;
      if (!group.qualifiesForFreeDelivery && needed < 10) {
        recommendations.push({
          type: 'bundle',
          message: `Add $${needed.toFixed(2)} more from ${group.store} for free delivery`,
          potentialSavings: config.baseDeliveryFee,
        });
      }
    }

    // Check for store switching opportunities
    alternatives.forEach((alts, productId) => {
      const bestAlt = alts[0]; // Already sorted by savings
      if (bestAlt && bestAlt.savings > 1) {
        recommendations.push({
          type: 'switch_store',
          message: `Switch to ${bestAlt.name} from ${bestAlt.store} to save $${bestAlt.savings.toFixed(
            2
          )}`,
          potentialSavings: bestAlt.savings,
          itemId: productId,
          suggestedStore: bestAlt.store,
          suggestedProduct: bestAlt,
        });
      }
    });

    // Sort by potential savings
    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 5);
  }

  // Compare prices across stores for specific products
  async compareStores(productIds: string[]): Promise<any> {
    const comparisons = [];

    for (const productId of productIds) {
      try {
        // Get product from catalog
        const response = await this.catalogApi.get(`/api/products/${productId}`);
        const product = response.data.data;

        // Search for same product across stores
        const searchResponse = await this.catalogApi.get('/api/products/search', {
          params: {
            query: product.name,
            limit: 20,
          },
        });

        const alternatives = searchResponse.data.data || [];

        // Group by store
        const storeMap = new Map<string, any>();
        alternatives.forEach((alt: any) => {
          if (!storeMap.has(alt.store) || alt.price < storeMap.get(alt.store).price) {
            storeMap.set(alt.store, alt);
          }
        });

        const stores = Array.from(storeMap.values()).map((item) => ({
          store: item.store,
          price: item.price,
          inStock: item.inStock !== false,
          productId: item.id,
        }));

        // Find cheapest
        const cheapest = stores.reduce((prev, curr) =>
          curr.inStock && curr.price < prev.price ? curr : prev
        );

        comparisons.push({
          productId: product.id,
          name: product.name,
          category: product.category,
          stores,
          cheapestStore: cheapest.store,
          cheapestPrice: cheapest.price,
          priceRange: {
            min: Math.min(...stores.map((s) => s.price)),
            max: Math.max(...stores.map((s) => s.price)),
          },
        });
      } catch (error) {
        console.error(`Failed to compare stores for ${productId}:`, error);
      }
    }

    return comparisons;
  }

  // Get savings summary
  async getSavingsSummary(userId: string, token: string): Promise<any> {
    try {
      // Get user's recent orders
      const ordersResponse = await axios.get(`${config.orderServiceUrl}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50 },
      });

      const orders = ordersResponse.data.data.orders || [];

      // Calculate total spent and potential savings
      let totalSpent = 0;
      let potentialSavings = 0;

      for (const order of orders) {
        totalSpent += order.total;

        // Simulate optimization for historical orders
        const items = order.items || [];
        if (items.length > 0) {
          try {
            const optimization = await this.optimizeByPrice(items);
            potentialSavings += optimization.totalSavings;
          } catch (error) {
            // Skip orders we can't optimize
          }
        }
      }

      return {
        totalOrders: orders.length,
        totalSpent,
        potentialSavings,
        savingsPercent: totalSpent > 0 ? (potentialSavings / totalSpent) * 100 : 0,
        averageSavingsPerOrder: orders.length > 0 ? potentialSavings / orders.length : 0,
      };
    } catch (error) {
      console.error('Failed to get savings summary:', error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        potentialSavings: 0,
        savingsPercent: 0,
        averageSavingsPerOrder: 0,
      };
    }
  }
}

export const optimizationService = new OptimizationService();
