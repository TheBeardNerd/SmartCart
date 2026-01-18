import { optimizationApi, handleApiError } from './client';

export type OptimizationMode = 'price' | 'time' | 'convenience';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  store: string;
  quantity: number;
  imageUrl?: string;
  category?: string;
}

export interface ProductAlternative {
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

export interface StoreGroup {
  store: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  qualifiesForFreeDelivery: boolean;
}

export interface OptimizationRecommendation {
  type: 'bundle' | 'switch_store' | 'alternative_product' | 'remove_item';
  message: string;
  potentialSavings: number;
  itemId?: string;
  suggestedStore?: string;
  suggestedProduct?: ProductAlternative;
}

export interface OptimizationResult {
  mode: OptimizationMode;
  originalTotal: number;
  optimizedTotal: number;
  totalSavings: number;
  savingsPercent: number;
  storeGroups: StoreGroup[];
  recommendations: OptimizationRecommendation[];
  alternatives: Record<string, ProductAlternative[]>;
}

export interface StoreComparison {
  productId: string;
  name: string;
  category: string;
  stores: Array<{
    store: string;
    price: number;
    inStock: boolean;
    productId: string;
  }>;
  cheapestStore: string;
  cheapestPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export interface SavingsSummary {
  totalOrders: number;
  totalSpent: number;
  potentialSavings: number;
  savingsPercent: number;
  averageSavingsPerOrder: number;
}

class OptimizationService {
  // Optimize cart
  async optimizeCart(items: CartItem[], mode: OptimizationMode = 'price'): Promise<OptimizationResult> {
    try {
      const response = await optimizationApi.post('/api/optimize/optimize', {
        items,
        mode,
      });

      // Convert alternatives object to Map for compatibility
      const result = response.data.data;
      return {
        ...result,
        alternatives: result.alternatives || {},
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Compare stores for specific products
  async compareStores(productIds: string[]): Promise<StoreComparison[]> {
    try {
      const response = await optimizationApi.post('/api/optimize/compare', {
        productIds,
      });
      return response.data.data.comparisons;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get savings summary (authenticated)
  async getSavingsSummary(): Promise<SavingsSummary> {
    try {
      const response = await optimizationApi.get('/api/optimize/savings-summary');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const optimizationService = new OptimizationService();
