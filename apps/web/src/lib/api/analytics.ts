import { orderApi, handleApiError } from './client';

// TypeScript interfaces
export interface AnalyticsOverview {
  period: string;
  totalOrders: number;
  totalSpent: number;
  totalSavings: number;
  couponSavings: number;
  optimizationSavings: number;
  averageOrderValue: number;
  totalItems: number;
  savingsPercentage: number;
}

export interface SavingsDataPoint {
  date: string;
  totalSavings: number;
  couponSavings: number;
  optimizationSavings: number;
  orderTotal: number;
}

export interface SavingsData {
  period: string;
  totalSavings: number;
  savingsOverTime: SavingsDataPoint[];
}

export interface SpendingTrendPoint {
  month: string;
  totalSpent: number;
  totalSavings: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface SpendingTrends {
  period: string;
  trends: SpendingTrendPoint[];
}

export interface CategoryBreakdown {
  category: string;
  totalSpent: number;
  itemCount: number;
  orderCount: number;
  averageItemPrice: number;
}

export interface StoreBreakdown {
  store: string;
  totalSpent: number;
  itemCount: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  store: string;
  totalQuantity: number;
  totalSpent: number;
  purchaseCount: number;
  imageUrl?: string;
  averagePrice: number;
}

export interface DayOfWeekDistribution {
  day: string;
  count: number;
  percentage: number;
}

export interface MonthlyDistribution {
  month: string;
  count: number;
}

export interface ShoppingFrequency {
  totalOrders: number;
  averageDaysBetweenOrders: number;
  dayOfWeekDistribution: DayOfWeekDistribution[];
  monthlyDistribution: MonthlyDistribution[];
}

class AnalyticsService {
  // Get analytics overview
  async getOverview(period: string = 'all'): Promise<AnalyticsOverview> {
    try {
      const response = await orderApi.get('/analytics/overview', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get savings data
  async getSavings(period: string = 'all'): Promise<SavingsData> {
    try {
      const response = await orderApi.get('/analytics/savings', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get spending trends
  async getSpendingTrends(period: string = 'year'): Promise<SpendingTrends> {
    try {
      const response = await orderApi.get('/analytics/spending-trends', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get category breakdown
  async getCategoryBreakdown(): Promise<{ categories: CategoryBreakdown[]; totalCategories: number }> {
    try {
      const response = await orderApi.get('/analytics/category-breakdown');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get store breakdown
  async getStoreBreakdown(): Promise<{ stores: StoreBreakdown[]; totalStores: number }> {
    try {
      const response = await orderApi.get('/analytics/store-breakdown');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get top products
  async getTopProducts(limit: number = 10): Promise<{ products: TopProduct[] }> {
    try {
      const response = await orderApi.get('/analytics/top-products', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get shopping frequency
  async getShoppingFrequency(): Promise<ShoppingFrequency> {
    try {
      const response = await orderApi.get('/analytics/shopping-frequency');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const analyticsService = new AnalyticsService();
