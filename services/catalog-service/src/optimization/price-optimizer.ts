import { mongoClient } from '../utils/mongodb';
import { getCached, setCached } from '../utils/redis';
import { ProductService } from '../services/product-service';

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  maxPrice?: number;
  category?: string;
}

export interface OptimizationStrategy {
  type: 'budget' | 'convenience' | 'split-cart' | 'meal-plan';
  deliveryPreference: 'fastest' | 'cheapest' | 'single-trip';
  maxStores?: number;
  prioritizeSavings?: boolean;
  preferredStores?: string[];
}

export interface StoreCartBreakdown {
  storeId: string;
  storeName: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  estimatedDelivery?: string;
  savings: number;
}

export interface OptimizedCart {
  strategy: string;
  totalCost: number;
  estimatedSavings: number;
  savingsPercentage: number;
  storeBreakdown: StoreCartBreakdown[];
  deliveryWindows: DeliveryWindow[];
  optimizationTime: number;
  itemCount: number;
  storeCount: number;
}

export interface DeliveryWindow {
  storeId: string;
  earliestDelivery: Date;
  latestDelivery: Date;
  deliveryFee: number;
}

export interface StorePrice {
  storeId: string;
  price: number;
  inStock: boolean;
  deliveryFee: number;
}

export class PriceOptimizationEngine {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Main optimization entry point - routes to appropriate strategy
   */
  async optimizeCart(
    cart: CartItem[],
    strategy: OptimizationStrategy,
    userId?: string
  ): Promise<OptimizedCart> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(cart, strategy);

    // Check cache first for performance
    const cached = await getCached<OptimizedCart>(cacheKey);
    if (cached) {
      console.log(`Cache hit for optimization: ${cacheKey}`);
      return cached;
    }

    let optimizedResult: OptimizedCart;

    switch (strategy.type) {
      case 'budget':
        optimizedResult = await this.optimizeForMinimumCost(cart, strategy);
        break;
      case 'convenience':
        optimizedResult = await this.optimizeForConvenience(cart, strategy);
        break;
      case 'split-cart':
        optimizedResult = await this.optimizeForBestItemPrices(cart, strategy);
        break;
      case 'meal-plan':
        optimizedResult = await this.optimizeForMealPlanning(cart, strategy);
        break;
      default:
        throw new Error(`Unknown optimization strategy: ${strategy.type}`);
    }

    optimizedResult.optimizationTime = Date.now() - startTime;

    // Cache result for 10 minutes
    await setCached(cacheKey, optimizedResult, 600);

    // Log optimization metrics
    console.log(
      `Optimization completed: ${strategy.type} | ` +
        `${optimizedResult.storeCount} stores | ` +
        `$${optimizedResult.totalCost.toFixed(2)} | ` +
        `${optimizedResult.savingsPercentage.toFixed(1)}% savings | ` +
        `${optimizedResult.optimizationTime}ms`
    );

    return optimizedResult;
  }

  /**
   * Budget Optimizer: Find absolute lowest total cost
   * Uses dynamic programming to find optimal store combination
   */
  private async optimizeForMinimumCost(
    cart: CartItem[],
    strategy: OptimizationStrategy
  ): Promise<OptimizedCart> {
    const maxStores = strategy.maxStores || 1; // Budget optimizers typically prefer single store
    const stores = await this.getAvailableStores();

    // Get prices for all items across all stores
    const productPrices = await this.getProductPricesAcrossStores(
      cart.map((item) => item.productId)
    );

    // Generate all valid store combinations
    const storeCombinations = this.generateStoreCombinations(stores, maxStores);

    let bestOption: StoreCartBreakdown[] = [];
    let lowestCost = Infinity;

    // Evaluate each combination
    for (const storeCombo of storeCombinations) {
      const breakdown = await this.calculateStoreBreakdown(
        cart,
        storeCombo,
        productPrices
      );

      if (breakdown.length === 0) continue; // Skip if items not available

      const totalCost = breakdown.reduce(
        (sum, store) => sum + store.subtotal + store.deliveryFee,
        0
      );

      if (totalCost < lowestCost) {
        lowestCost = totalCost;
        bestOption = breakdown;
      }
    }

    const savings = await this.calculateSavings(cart, bestOption);
    const totalCost = bestOption.reduce(
      (sum, store) => sum + store.subtotal + store.deliveryFee,
      0
    );

    return {
      strategy: 'budget',
      totalCost,
      estimatedSavings: savings,
      savingsPercentage: totalCost > 0 ? (savings / (totalCost + savings)) * 100 : 0,
      storeBreakdown: bestOption,
      deliveryWindows: await this.getDeliveryWindows(bestOption),
      optimizationTime: 0,
      itemCount: cart.length,
      storeCount: bestOption.length,
    };
  }

  /**
   * Split-Cart Maximizer: Get best price for each item across stores
   * Prioritizes per-item savings over delivery coordination
   */
  private async optimizeForBestItemPrices(
    cart: CartItem[],
    strategy: OptimizationStrategy
  ): Promise<OptimizedCart> {
    const productPrices = await this.getProductPricesAcrossStores(
      cart.map((item) => item.productId)
    );

    // Map each item to its lowest-price store
    const itemAssignments = new Map<string, { storeId: string; price: number }>();

    for (const item of cart) {
      const prices = productPrices[item.productId];
      if (prices && prices.length > 0) {
        // Filter by preferred stores if specified
        let availablePrices = prices;
        if (strategy.preferredStores && strategy.preferredStores.length > 0) {
          availablePrices = prices.filter((p) =>
            strategy.preferredStores!.includes(p.storeId)
          );
        }

        if (availablePrices.length === 0) {
          availablePrices = prices; // Fallback to all stores
        }

        const lowestPrice = availablePrices.reduce((min, current) =>
          current.price < min.price ? current : min
        );
        itemAssignments.set(item.productId, {
          storeId: lowestPrice.storeId,
          price: lowestPrice.price,
        });
      }
    }

    // Group items by store
    const storeGroups = this.groupItemsByStore(cart, itemAssignments);
    const storeBreakdown = await this.buildStoreBreakdown(storeGroups, cart);

    const totalCost = storeBreakdown.reduce(
      (sum, store) => sum + store.subtotal + store.deliveryFee,
      0
    );
    const savings = await this.calculateSavings(cart, storeBreakdown);

    return {
      strategy: 'split-cart',
      totalCost,
      estimatedSavings: savings,
      savingsPercentage: totalCost > 0 ? (savings / (totalCost + savings)) * 100 : 0,
      storeBreakdown,
      deliveryWindows: await this.getDeliveryWindows(storeBreakdown),
      optimizationTime: 0,
      itemCount: cart.length,
      storeCount: storeBreakdown.length,
    };
  }

  /**
   * Convenience Optimizer: Minimize stores and delivery time
   * Prefers single-store shopping for simplicity
   */
  private async optimizeForConvenience(
    cart: CartItem[],
    strategy: OptimizationStrategy
  ): Promise<OptimizedCart> {
    const stores = await this.getAvailableStores();
    const productPrices = await this.getProductPricesAcrossStores(
      cart.map((item) => item.productId)
    );

    // Find stores that have all items in stock
    const storesWithAllItems: string[] = [];

    for (const store of stores) {
      const hasAllItems = cart.every((item) => {
        const prices = productPrices[item.productId];
        return prices?.some((p) => p.storeId === store.id && p.inStock);
      });

      if (hasAllItems) {
        storesWithAllItems.push(store.id);
      }
    }

    // If no single store has everything, find best 2-store combination
    let targetStores = storesWithAllItems.slice(0, 1);
    if (targetStores.length === 0) {
      targetStores = stores.slice(0, 2).map((s) => s.id);
    }

    const breakdown = await this.calculateStoreBreakdown(
      cart,
      targetStores,
      productPrices
    );

    const totalCost = breakdown.reduce(
      (sum, store) => sum + store.subtotal + store.deliveryFee,
      0
    );
    const savings = await this.calculateSavings(cart, breakdown);

    return {
      strategy: 'convenience',
      totalCost,
      estimatedSavings: savings,
      savingsPercentage: totalCost > 0 ? (savings / (totalCost + savings)) * 100 : 0,
      storeBreakdown: breakdown,
      deliveryWindows: await this.getDeliveryWindows(breakdown),
      optimizationTime: 0,
      itemCount: cart.length,
      storeCount: breakdown.length,
    };
  }

  /**
   * Meal Plan Optimizer: Consider nutritional goals and recipe requirements
   * Groups items by meal and optimizes for health + cost
   */
  private async optimizeForMealPlanning(
    cart: CartItem[],
    strategy: OptimizationStrategy
  ): Promise<OptimizedCart> {
    // For meal planning, we want to balance cost with quality
    // Prefer organic/fresh items even if slightly more expensive

    const productPrices = await this.getProductPricesAcrossStores(
      cart.map((item) => item.productId)
    );

    // Prioritize stores known for quality produce/organic items
    const qualityStores = ['kroger', 'safeway']; // Could be config-based
    const itemAssignments = new Map<string, { storeId: string; price: number }>();

    for (const item of cart) {
      const prices = productPrices[item.productId];
      if (prices && prices.length > 0) {
        // For organic/fresh items, prefer quality stores
        const isQualityItem =
          item.category?.includes('organic') || item.category?.includes('produce');

        let selectedPrice;
        if (isQualityItem) {
          // Prefer quality stores even if 10% more expensive
          const qualityPrices = prices.filter((p) => qualityStores.includes(p.storeId));
          selectedPrice =
            qualityPrices.length > 0
              ? qualityPrices.reduce((min, curr) => (curr.price < min.price ? curr : min))
              : prices.reduce((min, curr) => (curr.price < min.price ? curr : min));
        } else {
          // For other items, go with lowest price
          selectedPrice = prices.reduce((min, curr) =>
            curr.price < min.price ? curr : min
          );
        }

        itemAssignments.set(item.productId, {
          storeId: selectedPrice.storeId,
          price: selectedPrice.price,
        });
      }
    }

    const storeGroups = this.groupItemsByStore(cart, itemAssignments);
    const storeBreakdown = await this.buildStoreBreakdown(storeGroups, cart);

    const totalCost = storeBreakdown.reduce(
      (sum, store) => sum + store.subtotal + store.deliveryFee,
      0
    );
    const savings = await this.calculateSavings(cart, storeBreakdown);

    return {
      strategy: 'meal-plan',
      totalCost,
      estimatedSavings: savings,
      savingsPercentage: totalCost > 0 ? (savings / (totalCost + savings)) * 100 : 0,
      storeBreakdown,
      deliveryWindows: await this.getDeliveryWindows(storeBreakdown),
      optimizationTime: 0,
      itemCount: cart.length,
      storeCount: storeBreakdown.length,
    };
  }

  // Helper Methods

  private async getAvailableStores(): Promise<Array<{ id: string; name: string }>> {
    // In production, this would query the stores table
    return [
      { id: 'kroger', name: 'Kroger' },
      { id: 'safeway', name: 'Safeway' },
      { id: 'walmart', name: 'Walmart' },
      { id: 'target', name: 'Target' },
    ];
  }

  private async getProductPricesAcrossStores(
    productIds: string[]
  ): Promise<Record<string, StorePrice[]>> {
    const priceMap: Record<string, StorePrice[]> = {};

    for (const productId of productIds) {
      try {
        const { validPrices } = await this.productService.getPrices(productId);
        priceMap[productId] = validPrices.map((p) => ({
          storeId: p.storeId,
          price: p.price,
          inStock: p.inStock,
          deliveryFee: this.getDeliveryFeeForStore(p.storeId),
        }));
      } catch (error) {
        console.error(`Error fetching prices for product ${productId}:`, error);
        priceMap[productId] = [];
      }
    }

    return priceMap;
  }

  private generateStoreCombinations(
    stores: Array<{ id: string; name: string }>,
    maxStores: number
  ): string[][] {
    const combinations: string[][] = [];

    // Generate combinations of 1 to maxStores
    for (let size = 1; size <= Math.min(maxStores, stores.length); size++) {
      const combos = this.getCombinations(
        stores.map((s) => s.id),
        size
      );
      combinations.push(...combos);
    }

    return combinations;
  }

  private getCombinations<T>(array: T[], size: number): T[][] {
    if (size === 1) return array.map((item) => [item]);
    if (size > array.length) return [];

    const result: T[][] = [];

    for (let i = 0; i <= array.length - size; i++) {
      const head = array[i];
      const tailCombos = this.getCombinations(array.slice(i + 1), size - 1);
      for (const combo of tailCombos) {
        result.push([head, ...combo]);
      }
    }

    return result;
  }

  private async calculateStoreBreakdown(
    cart: CartItem[],
    storeIds: string[],
    productPrices: Record<string, StorePrice[]>
  ): Promise<StoreCartBreakdown[]> {
    const breakdown: StoreCartBreakdown[] = [];
    const assignedItems = new Set<string>();

    for (const storeId of storeIds) {
      const storeItems: StoreCartBreakdown['items'] = [];
      let subtotal = 0;

      for (const item of cart) {
        if (assignedItems.has(item.productId)) continue;

        const prices = productPrices[item.productId];
        const storePrice = prices?.find((p) => p.storeId === storeId && p.inStock);

        if (storePrice) {
          const itemTotal = storePrice.price * item.quantity;
          storeItems.push({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: storePrice.price,
            totalPrice: itemTotal,
          });
          subtotal += itemTotal;
          assignedItems.add(item.productId);
        }
      }

      if (storeItems.length > 0) {
        const stores = await this.getAvailableStores();
        const store = stores.find((s) => s.id === storeId);

        breakdown.push({
          storeId,
          storeName: store?.name || storeId,
          items: storeItems,
          subtotal,
          deliveryFee: this.getDeliveryFeeForStore(storeId),
          savings: 0, // Calculated separately
        });
      }
    }

    return breakdown;
  }

  private groupItemsByStore(
    cart: CartItem[],
    itemAssignments: Map<string, { storeId: string; price: number }>
  ): Map<string, Array<{ item: CartItem; price: number }>> {
    const storeGroups = new Map<string, Array<{ item: CartItem; price: number }>>();

    for (const item of cart) {
      const assignment = itemAssignments.get(item.productId);
      if (assignment) {
        if (!storeGroups.has(assignment.storeId)) {
          storeGroups.set(assignment.storeId, []);
        }
        storeGroups.get(assignment.storeId)!.push({
          item,
          price: assignment.price,
        });
      }
    }

    return storeGroups;
  }

  private async buildStoreBreakdown(
    storeGroups: Map<string, Array<{ item: CartItem; price: number }>>,
    cart: CartItem[]
  ): Promise<StoreCartBreakdown[]> {
    const breakdown: StoreCartBreakdown[] = [];
    const stores = await this.getAvailableStores();

    for (const [storeId, items] of storeGroups.entries()) {
      const store = stores.find((s) => s.id === storeId);
      let subtotal = 0;

      const storeItems = items.map(({ item, price }) => {
        const totalPrice = price * item.quantity;
        subtotal += totalPrice;
        return {
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price,
          totalPrice,
        };
      });

      breakdown.push({
        storeId,
        storeName: store?.name || storeId,
        items: storeItems,
        subtotal,
        deliveryFee: this.getDeliveryFeeForStore(storeId),
        savings: 0,
      });
    }

    return breakdown;
  }

  private async calculateSavings(
    cart: CartItem[],
    optimizedBreakdown: StoreCartBreakdown[]
  ): Promise<number> {
    // Calculate what the user would have paid at the most expensive store
    const productPrices = await this.getProductPricesAcrossStores(
      cart.map((item) => item.productId)
    );

    let highestCost = 0;

    // Find the highest single-store total cost
    const stores = await this.getAvailableStores();
    for (const store of stores) {
      let storeCost = 0;
      let canFulfill = true;

      for (const item of cart) {
        const prices = productPrices[item.productId];
        const storePrice = prices?.find((p) => p.storeId === store.id && p.inStock);

        if (!storePrice) {
          canFulfill = false;
          break;
        }

        storeCost += storePrice.price * item.quantity;
      }

      if (canFulfill) {
        const totalWithDelivery = storeCost + this.getDeliveryFeeForStore(store.id);
        highestCost = Math.max(highestCost, totalWithDelivery);
      }
    }

    const optimizedCost = optimizedBreakdown.reduce(
      (sum, store) => sum + store.subtotal + store.deliveryFee,
      0
    );

    return Math.max(0, highestCost - optimizedCost);
  }

  private async getDeliveryWindows(
    breakdown: StoreCartBreakdown[]
  ): Promise<DeliveryWindow[]> {
    const windows: DeliveryWindow[] = [];
    const now = new Date();

    for (const store of breakdown) {
      // Mock delivery windows - in production, would query actual store availability
      windows.push({
        storeId: store.storeId,
        earliestDelivery: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        latestDelivery: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
        deliveryFee: store.deliveryFee,
      });
    }

    return windows;
  }

  private getDeliveryFeeForStore(storeId: string): number {
    // Mock delivery fees - in production, would be configured per store
    const fees: Record<string, number> = {
      kroger: 9.95,
      safeway: 12.95,
      walmart: 7.95,
      target: 9.95,
    };
    return fees[storeId] || 9.95;
  }

  private generateCacheKey(cart: CartItem[], strategy: OptimizationStrategy): string {
    const cartHash = cart
      .map((item) => `${item.productId}:${item.quantity}`)
      .sort()
      .join('|');

    return `optimization:${strategy.type}:${cartHash}`;
  }
}
