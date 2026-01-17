import { catalogApi, handleApiError } from './client';

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface OptimizationStrategy {
  type: 'budget' | 'convenience' | 'split-cart' | 'meal-plan';
  maxStores?: number;
  deliveryPreference?: 'fastest' | 'cheapest' | 'combined';
  prioritizeQuality?: boolean;
}

export const optimizationService = {
  /**
   * Optimize cart with a specific strategy
   */
  async optimizeCart(cart: CartItem[], strategy: OptimizationStrategy, userId?: string) {
    try {
      const response = await catalogApi.post('/api/optimize', {
        cart,
        strategy,
        userId,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Compare all optimization strategies
   */
  async compareStrategies(cart: CartItem[], userId?: string) {
    try {
      const response = await catalogApi.post('/api/optimize/compare', {
        cart,
        userId,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get available optimization strategies
   */
  async getStrategies() {
    try {
      const response = await catalogApi.get('/api/optimize/strategies');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get quick savings estimate
   */
  async estimateSavings(cart: CartItem[]) {
    try {
      const response = await catalogApi.post('/api/optimize/estimate-savings', {
        cart,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
