import { reviewApi, handleApiError } from './client';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

export enum VoteType {
  HELPFUL = 'HELPFUL',
  NOT_HELPFUL = 'NOT_HELPFUL',
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  content: string;
  verifiedPurchase: boolean;
  orderId?: string;
  status: ReviewStatus;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
  photos?: ReviewPhoto[];
}

export interface ReviewPhoto {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  verifiedReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CreateReviewInput {
  productId: string;
  productName: string;
  rating: number;
  title?: string;
  content: string;
  photoUrls?: string[];
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  content?: string;
}

export interface GetReviewsOptions {
  page?: number;
  limit?: number;
  rating?: number;
  verifiedOnly?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
}

class ReviewService {
  // Create a review (authenticated)
  async createReview(input: CreateReviewInput): Promise<Review> {
    try {
      const response = await reviewApi.post('/api/reviews', input);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get reviews for a product
  async getProductReviews(productId: string, options: GetReviewsOptions = {}): Promise<{
    reviews: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await reviewApi.get(`/api/products/${productId}/reviews`, {
        params: options,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get review summary for a product
  async getProductReviewSummary(productId: string): Promise<ReviewSummary> {
    try {
      const response = await reviewApi.get(`/api/products/${productId}/reviews/summary`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Vote on a review (authenticated)
  async voteOnReview(reviewId: string, voteType: VoteType): Promise<Review> {
    try {
      const response = await reviewApi.post(`/api/reviews/${reviewId}/vote`, { voteType });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Update a review (authenticated)
  async updateReview(reviewId: string, input: UpdateReviewInput): Promise<Review> {
    try {
      const response = await reviewApi.put(`/api/reviews/${reviewId}`, input);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Delete a review (authenticated)
  async deleteReview(reviewId: string): Promise<void> {
    try {
      await reviewApi.delete(`/api/reviews/${reviewId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get user's reviews (authenticated)
  async getUserReviews(): Promise<Review[]> {
    try {
      const response = await reviewApi.get('/api/my-reviews');
      return response.data.data.reviews;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const reviewService = new ReviewService();
