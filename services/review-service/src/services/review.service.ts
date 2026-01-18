import { PrismaClient, ReviewStatus, VoteType } from '@prisma/client';
import axios from 'axios';
import { config } from '../config';
import { redisClient } from '../utils/redis';

const prisma = new PrismaClient();

interface CreateReviewInput {
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  content: string;
  photoUrls?: string[];
}

interface UpdateReviewInput {
  rating?: number;
  title?: string;
  content?: string;
}

class ReviewService {
  // Create a new review
  async createReview(input: CreateReviewInput, token?: string): Promise<any> {
    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Validate content length
    if (input.content.length < config.minReviewLength) {
      throw new Error(`Review must be at least ${config.minReviewLength} characters`);
    }

    if (input.content.length > config.maxReviewLength) {
      throw new Error(`Review must be less than ${config.maxReviewLength} characters`);
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: input.productId,
        userId: input.userId,
      },
    });

    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }

    // Check for verified purchase
    let verifiedPurchase = false;
    let orderId: string | undefined;

    if (token) {
      try {
        const orderResponse = await axios.get(
          `${config.orderServiceUrl}/api/orders/my-orders`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const orders = orderResponse.data.data.orders || [];

        // Find order containing this product
        const purchaseOrder = orders.find((order: any) =>
          order.items?.some((item: any) => item.productId === input.productId)
        );

        if (purchaseOrder) {
          verifiedPurchase = true;
          orderId = purchaseOrder.id;
        }
      } catch (error) {
        console.error('Failed to verify purchase:', error);
      }
    }

    // Determine initial status
    const status =
      config.autoApproveVerifiedPurchases && verifiedPurchase
        ? ReviewStatus.APPROVED
        : ReviewStatus.PENDING;

    // Create review
    const review = await prisma.review.create({
      data: {
        productId: input.productId,
        productName: input.productName,
        userId: input.userId,
        userName: input.userName,
        rating: input.rating,
        title: input.title,
        content: input.content,
        verifiedPurchase,
        orderId,
        status,
        photos: input.photoUrls
          ? {
              create: input.photoUrls.map((url, index) => ({
                url,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        photos: true,
      },
    });

    // Invalidate cache
    await this.invalidateProductCache(input.productId);

    return review;
  }

  // Get reviews for a product
  async getProductReviews(
    productId: string,
    options: {
      page?: number;
      limit?: number;
      rating?: number;
      verifiedOnly?: boolean;
      sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
    } = {}
  ): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    // Try cache first
    const cacheKey = `product:${productId}:reviews:${JSON.stringify(options)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build where clause
    const where: any = {
      productId,
      status: ReviewStatus.APPROVED,
    };

    if (options.rating) {
      where.rating = options.rating;
    }

    if (options.verifiedOnly) {
      where.verifiedPurchase = true;
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };

    switch (options.sortBy) {
      case 'helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
      case 'rating_high':
        orderBy = { rating: 'desc' };
        break;
      case 'rating_low':
        orderBy = { rating: 'asc' };
        break;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          photos: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    const result = {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  // Get review summary for a product
  async getProductReviewSummary(productId: string): Promise<any> {
    // Try cache first
    const cacheKey = `product:${productId}:review-summary`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const reviews = await prisma.review.findMany({
      where: {
        productId,
        status: ReviewStatus.APPROVED,
      },
      select: {
        rating: true,
        verifiedPurchase: true,
      },
    });

    const totalReviews = reviews.length;

    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        verifiedReviews: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

    const verifiedReviews = reviews.filter((r) => r.verifiedPurchase).length;

    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    const summary = {
      averageRating,
      totalReviews,
      verifiedReviews,
      ratingDistribution,
    };

    // Cache for 10 minutes
    await redisClient.setex(cacheKey, 600, JSON.stringify(summary));

    return summary;
  }

  // Vote on a review
  async voteOnReview(reviewId: string, userId: string, voteType: VoteType): Promise<any> {
    // Check if user already voted
    const existingVote = await prisma.reviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existingVote) {
      // Update existing vote if different
      if (existingVote.voteType !== voteType) {
        await prisma.$transaction([
          // Update vote
          prisma.reviewVote.update({
            where: { id: existingVote.id },
            data: { voteType },
          }),
          // Update review counts
          prisma.review.update({
            where: { id: reviewId },
            data: {
              helpfulCount:
                voteType === VoteType.HELPFUL
                  ? { increment: 1 }
                  : { decrement: 1 },
              notHelpfulCount:
                voteType === VoteType.NOT_HELPFUL
                  ? { increment: 1 }
                  : { decrement: 1 },
            },
          }),
        ]);
      }
    } else {
      // Create new vote
      await prisma.$transaction([
        prisma.reviewVote.create({
          data: {
            reviewId,
            userId,
            voteType,
          },
        }),
        prisma.review.update({
          where: { id: reviewId },
          data: {
            helpfulCount:
              voteType === VoteType.HELPFUL
                ? { increment: 1 }
                : undefined,
            notHelpfulCount:
              voteType === VoteType.NOT_HELPFUL
                ? { increment: 1 }
                : undefined,
          },
        }),
      ]);
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    // Invalidate cache
    if (review) {
      await this.invalidateProductCache(review.productId);
    }

    return review;
  }

  // Update a review
  async updateReview(reviewId: string, userId: string, input: UpdateReviewInput): Promise<any> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== userId) {
      throw new Error('Not authorized to update this review');
    }

    // Validate if updating
    if (input.rating && (input.rating < 1 || input.rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (
      input.content &&
      (input.content.length < config.minReviewLength ||
        input.content.length > config.maxReviewLength)
    ) {
      throw new Error(
        `Review must be between ${config.minReviewLength} and ${config.maxReviewLength} characters`
      );
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...input,
        status: ReviewStatus.PENDING, // Re-moderate after edit
      },
      include: {
        photos: true,
      },
    });

    // Invalidate cache
    await this.invalidateProductCache(review.productId);

    return updated;
  }

  // Delete a review
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== userId) {
      throw new Error('Not authorized to delete this review');
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Invalidate cache
    await this.invalidateProductCache(review.productId);
  }

  // Moderate a review (admin only)
  async moderateReview(reviewId: string, status: ReviewStatus, notes?: string): Promise<any> {
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        status,
        moderatorNotes: notes,
      },
    });

    // Invalidate cache
    await this.invalidateProductCache(review.productId);

    return review;
  }

  // Get user's reviews
  async getUserReviews(userId: string): Promise<any[]> {
    return await prisma.review.findMany({
      where: { userId },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Helper to invalidate product cache
  private async invalidateProductCache(productId: string): Promise<void> {
    const keys = await redisClient.keys(`product:${productId}:*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
}

export const reviewService = new ReviewService();
