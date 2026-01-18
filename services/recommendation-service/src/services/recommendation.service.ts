import axios from 'axios';
import { config } from '../config';
import { redisClient } from '../utils/redis';

interface OrderItem {
  productId: string;
  productName: string;
  storeName: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  productImage?: string;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  createdAt: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  store: string;
  category?: string;
  price: number;
  imageUrl?: string;
}

interface Recommendation {
  productId: string;
  productName: string;
  store: string;
  category?: string;
  price: number;
  imageUrl?: string;
  score: number;
  reason: string;
}

interface ReorderPrediction {
  productId: string;
  productName: string;
  store: string;
  lastPurchased: string;
  frequency: number; // days between purchases
  nextPredictedDate: string;
  confidence: number;
  imageUrl?: string;
  lastPrice: number;
}

export class RecommendationService {
  // Cache key generators
  private getCacheKey(userId: string, type: string): string {
    return `recommendations:${userId}:${type}`;
  }

  // Fetch user's order history
  private async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const response = await axios.get(`${config.services.order}/api/orders`, {
        params: { userId, limit: 100 },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
      return [];
    }
  }

  // Fetch user's favorites
  private async getUserFavorites(userId: string, token: string): Promise<any[]> {
    try {
      const response = await axios.get(`${config.services.user}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data?.favorites || [];
    } catch (error) {
      console.error('Failed to fetch user favorites:', error);
      return [];
    }
  }

  // Fetch user's shopping lists
  private async getUserLists(userId: string, token: string): Promise<any[]> {
    try {
      const response = await axios.get(`${config.services.user}/api/shopping-lists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch user lists:', error);
      return [];
    }
  }

  // Fetch products from catalog
  private async searchProducts(query?: string, category?: string, limit: number = 20): Promise<Product[]> {
    try {
      const params: any = { limit };
      if (query) params.query = query;
      if (category) params.category = category;

      const response = await axios.get(`${config.services.catalog}/api/products/search`, {
        params,
      });
      return response.data.data?.products || [];
    } catch (error) {
      console.error('Failed to search products:', error);
      return [];
    }
  }

  // Calculate similarity between two product sets (Jaccard similarity)
  private calculateSimilarity(items1: string[], items2: string[]): number {
    const set1 = new Set(items1);
    const set2 = new Set(items2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Collaborative Filtering: "Users who bought X also bought Y"
  async getCollaborativeRecommendations(userId: string): Promise<Recommendation[]> {
    const cacheKey = this.getCacheKey(userId, 'collaborative');

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const userOrders = await this.getUserOrders(userId);
    const userProductIds = new Set(
      userOrders.flatMap(order => order.items.map(item => item.productId))
    );

    // In a real implementation, we'd query all users' orders
    // For now, we'll simulate with a simpler approach
    const recommendations: Recommendation[] = [];

    // Get frequently co-purchased items from user's own history
    const productPairs = new Map<string, Map<string, number>>();

    userOrders.forEach(order => {
      const products = order.items.map(item => item.productId);

      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const product1 = products[i];
          const product2 = products[j];

          if (!productPairs.has(product1)) {
            productPairs.set(product1, new Map());
          }
          if (!productPairs.has(product2)) {
            productPairs.set(product2, new Map());
          }

          const pairs1 = productPairs.get(product1)!;
          const pairs2 = productPairs.get(product2)!;

          pairs1.set(product2, (pairs1.get(product2) || 0) + 1);
          pairs2.set(product1, (pairs2.get(product1) || 0) + 1);
        }
      }
    });

    // Find products that were frequently bought together
    const recommendedProducts = new Map<string, { count: number; item: OrderItem }>();

    productPairs.forEach((pairs, productId) => {
      pairs.forEach((count, pairedProductId) => {
        if (!userProductIds.has(pairedProductId)) {
          // Find the item details
          const item = userOrders
            .flatMap(o => o.items)
            .find(i => i.productId === pairedProductId);

          if (item) {
            const existing = recommendedProducts.get(pairedProductId);
            if (!existing || existing.count < count) {
              recommendedProducts.set(pairedProductId, { count, item });
            }
          }
        }
      });
    });

    // Convert to recommendations
    recommendedProducts.forEach(({ count, item }) => {
      recommendations.push({
        productId: item.productId,
        productName: item.productName,
        store: item.storeName,
        category: item.category,
        price: item.unitPrice,
        imageUrl: item.productImage,
        score: count / userOrders.length,
        reason: 'Frequently bought together',
      });
    });

    // Sort by score and limit
    const sorted = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, config.recommendations.maxRecommendations);

    // Cache for 1 hour
    await redisClient.setex(cacheKey, config.recommendations.cacheExpiry, JSON.stringify(sorted));

    return sorted;
  }

  // Content-Based Filtering: Similar products based on category/attributes
  async getContentBasedRecommendations(userId: string): Promise<Recommendation[]> {
    const cacheKey = this.getCacheKey(userId, 'content');

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const userOrders = await this.getUserOrders(userId);

    // Analyze user's purchase patterns
    const categoryPreferences = new Map<string, number>();
    const storePreferences = new Map<string, number>();

    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.category) {
          categoryPreferences.set(
            item.category,
            (categoryPreferences.get(item.category) || 0) + item.quantity
          );
        }
        storePreferences.set(
          item.storeName,
          (storePreferences.get(item.storeName) || 0) + 1
        );
      });
    });

    // Get top categories
    const topCategories = Array.from(categoryPreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    // Fetch products from preferred categories
    const recommendations: Recommendation[] = [];
    const userProductIds = new Set(
      userOrders.flatMap(order => order.items.map(item => item.productId))
    );

    for (const category of topCategories) {
      const products = await this.searchProducts(undefined, category, 10);

      products.forEach(product => {
        if (!userProductIds.has(product.id)) {
          const categoryScore = (categoryPreferences.get(product.category || '') || 0) /
            Math.max(...Array.from(categoryPreferences.values()));

          recommendations.push({
            productId: product.id,
            productName: product.name,
            store: product.store,
            category: product.category,
            price: product.price,
            imageUrl: product.imageUrl,
            score: categoryScore,
            reason: `Popular in ${category}`,
          });
        }
      });
    }

    // Sort and limit
    const sorted = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, config.recommendations.maxRecommendations);

    // Cache
    await redisClient.setex(cacheKey, config.recommendations.cacheExpiry, JSON.stringify(sorted));

    return sorted;
  }

  // Reorder Predictions: Predict when user needs to reorder based on purchase frequency
  async getReorderPredictions(userId: string): Promise<ReorderPrediction[]> {
    const cacheKey = this.getCacheKey(userId, 'reorder');

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const userOrders = await this.getUserOrders(userId);

    // Group purchases by product
    const productPurchases = new Map<string, {
      item: OrderItem;
      dates: Date[];
    }>();

    userOrders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.productId}-${item.storeName}`;

        if (!productPurchases.has(key)) {
          productPurchases.set(key, {
            item,
            dates: [],
          });
        }

        productPurchases.get(key)!.dates.push(new Date(order.createdAt));
      });
    });

    // Calculate frequency and predict next purchase
    const predictions: ReorderPrediction[] = [];
    const now = new Date();

    productPurchases.forEach(({ item, dates }, key) => {
      if (dates.length < 2) return; // Need at least 2 purchases to calculate frequency

      // Sort dates
      dates.sort((a, b) => a.getTime() - b.getTime());

      // Calculate average days between purchases
      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const days = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(days);
      }

      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const lastPurchaseDate = dates[dates.length - 1];
      const daysSinceLastPurchase = (now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24);

      // Predict next purchase date
      const nextPredictedDate = new Date(lastPurchaseDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);

      // Calculate confidence (based on consistency of intervals)
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgInterval;
      const confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation));

      // Only recommend if it's time to reorder (within 7 days of predicted date)
      const daysUntilReorder = (nextPredictedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilReorder <= 7 && daysUntilReorder >= -3) {
        predictions.push({
          productId: item.productId,
          productName: item.productName,
          store: item.storeName,
          lastPurchased: lastPurchaseDate.toISOString(),
          frequency: Math.round(avgInterval),
          nextPredictedDate: nextPredictedDate.toISOString(),
          confidence: Number(confidence.toFixed(2)),
          imageUrl: item.productImage,
          lastPrice: item.unitPrice,
        });
      }
    });

    // Sort by confidence and urgency
    const sorted = predictions.sort((a, b) => {
      const urgencyA = new Date(a.nextPredictedDate).getTime() - now.getTime();
      const urgencyB = new Date(b.nextPredictedDate).getTime() - now.getTime();

      // Prioritize items that are due soon with high confidence
      return (urgencyA * (1 - a.confidence)) - (urgencyB * (1 - b.confidence));
    });

    // Cache
    await redisClient.setex(cacheKey, config.recommendations.cacheExpiry, JSON.stringify(sorted));

    return sorted;
  }

  // Deal Alerts: Match user's favorites/frequently bought items with active coupons
  async getDealAlerts(userId: string, token: string): Promise<any[]> {
    const cacheKey = this.getCacheKey(userId, 'deals');

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Get user's favorites and frequent purchases
      const [favorites, orders] = await Promise.all([
        this.getUserFavorites(userId, token),
        this.getUserOrders(userId),
      ]);

      // Get product IDs from favorites and orders
      const productIds = new Set([
        ...favorites.map((f: any) => f.productId),
        ...orders.flatMap(order => order.items.map(item => item.productId)),
      ]);

      // Fetch active coupons
      const couponsResponse = await axios.get(`${config.services.coupon}/api/coupons`, {
        params: { limit: 100 },
      });

      const coupons = couponsResponse.data.data?.coupons || [];

      // Match coupons to user's products
      const dealAlerts: any[] = [];

      coupons.forEach((coupon: any) => {
        // Check if coupon applies to user's products
        let relevantProducts: any[] = [];

        if (coupon.productId) {
          // Product-specific coupon
          if (productIds.has(coupon.productId)) {
            const favorite = favorites.find((f: any) => f.productId === coupon.productId);
            const orderItem = orders
              .flatMap(o => o.items)
              .find(item => item.productId === coupon.productId);

            relevantProducts = [favorite || orderItem].filter(Boolean);
          }
        } else if (coupon.category) {
          // Category-specific coupon
          relevantProducts = [
            ...favorites.filter((f: any) => f.category === coupon.category),
            ...orders
              .flatMap(o => o.items)
              .filter(item => item.category === coupon.category),
          ];
        } else if (coupon.store) {
          // Store-specific coupon
          relevantProducts = [
            ...favorites.filter((f: any) => f.store === coupon.store),
            ...orders
              .flatMap(o => o.items)
              .filter(item => item.storeName === coupon.store),
          ];
        } else {
          // General coupon applies to all
          relevantProducts = [...favorites, ...orders.flatMap(o => o.items)].slice(0, 5);
        }

        if (relevantProducts.length > 0) {
          dealAlerts.push({
            coupon,
            relevantProducts: relevantProducts.slice(0, 3),
            estimatedSavings: this.calculateEstimatedSavings(coupon, relevantProducts),
          });
        }
      });

      // Sort by estimated savings
      const sorted = dealAlerts.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

      // Cache
      await redisClient.setex(cacheKey, config.recommendations.cacheExpiry, JSON.stringify(sorted));

      return sorted;
    } catch (error) {
      console.error('Failed to generate deal alerts:', error);
      return [];
    }
  }

  private calculateEstimatedSavings(coupon: any, products: any[]): number {
    if (products.length === 0) return 0;

    const totalPrice = products.reduce((sum, p) => sum + (p.price || p.unitPrice || 0), 0);

    switch (coupon.discountType) {
      case 'PERCENTAGE':
        return (totalPrice * coupon.discountValue) / 100;
      case 'FIXED_AMOUNT':
        return coupon.discountValue;
      case 'BOGO':
        return totalPrice * 0.5;
      default:
        return 0;
    }
  }

  // Get personalized recommendations (combines multiple strategies)
  async getPersonalizedRecommendations(userId: string, token: string): Promise<any> {
    try {
      const [collaborative, contentBased, reorderPredictions, dealAlerts] = await Promise.all([
        this.getCollaborativeRecommendations(userId),
        this.getContentBasedRecommendations(userId),
        this.getReorderPredictions(userId),
        this.getDealAlerts(userId, token),
      ]);

      // Combine and deduplicate recommendations
      const allRecommendations = [...collaborative, ...contentBased];
      const uniqueRecommendations = new Map<string, Recommendation>();

      allRecommendations.forEach(rec => {
        const key = `${rec.productId}-${rec.store}`;
        const existing = uniqueRecommendations.get(key);

        if (!existing || existing.score < rec.score) {
          uniqueRecommendations.set(key, rec);
        }
      });

      return {
        recommendations: Array.from(uniqueRecommendations.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, config.recommendations.maxRecommendations),
        reorderReminders: reorderPredictions,
        dealAlerts: dealAlerts.slice(0, 5),
      };
    } catch (error) {
      console.error('Failed to generate personalized recommendations:', error);
      throw error;
    }
  }

  // Clear cache for a user
  async clearUserCache(userId: string): Promise<void> {
    const types = ['collaborative', 'content', 'reorder', 'deals'];

    await Promise.all(
      types.map(type => redisClient.del(this.getCacheKey(userId, type)))
    );
  }
}

export const recommendationService = new RecommendationService();
