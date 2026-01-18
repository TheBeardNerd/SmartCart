import { recommendationApi, handleApiError } from './client';

// TypeScript interfaces
export interface Recommendation {
  productId: string;
  productName: string;
  store: string;
  category?: string;
  price: number;
  imageUrl?: string;
  score: number;
  reason: string;
}

export interface ReorderPrediction {
  productId: string;
  productName: string;
  store: string;
  lastPurchased: string;
  frequency: number;
  nextPredictedDate: string;
  confidence: number;
  imageUrl?: string;
  lastPrice: number;
}

export interface DealAlert {
  coupon: {
    id: string;
    code: string;
    title: string;
    description?: string;
    discountType: string;
    discountValue: number;
    expiresAt?: string;
  };
  relevantProducts: any[];
  estimatedSavings: number;
}

export interface PersonalizedRecommendations {
  recommendations: Recommendation[];
  reorderReminders: ReorderPrediction[];
  dealAlerts: DealAlert[];
}

class RecommendationService {
  // Get all personalized recommendations
  async getPersonalizedRecommendations(): Promise<PersonalizedRecommendations> {
    try {
      const response = await recommendationApi.get('/api/recommendations');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get collaborative filtering recommendations
  async getCollaborativeRecommendations(): Promise<Recommendation[]> {
    try {
      const response = await recommendationApi.get('/api/recommendations/collaborative');
      return response.data.data.recommendations;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get content-based recommendations
  async getContentBasedRecommendations(): Promise<Recommendation[]> {
    try {
      const response = await recommendationApi.get('/api/recommendations/content-based');
      return response.data.data.recommendations;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get reorder predictions
  async getReorderPredictions(): Promise<ReorderPrediction[]> {
    try {
      const response = await recommendationApi.get('/api/recommendations/reorder');
      return response.data.data.predictions;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get deal alerts
  async getDealAlerts(): Promise<DealAlert[]> {
    try {
      const response = await recommendationApi.get('/api/recommendations/deals');
      return response.data.data.dealAlerts;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Clear recommendation cache
  async clearCache(): Promise<void> {
    try {
      await recommendationApi.delete('/api/recommendations/cache');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const recommendationService = new RecommendationService();
