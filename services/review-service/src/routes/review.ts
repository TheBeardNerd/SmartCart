import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { reviewService } from '../services/review.service';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { ReviewStatus, VoteType } from '@prisma/client';

const CreateReviewSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(10),
  photoUrls: z.array(z.string().url()).max(5).optional(),
});

const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  content: z.string().min(10).optional(),
});

const VoteSchema = z.object({
  voteType: z.enum(['HELPFUL', 'NOT_HELPFUL']),
});

const ModerateReviewSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED']),
  notes: z.string().optional(),
});

const GetReviewsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  verifiedOnly: z.boolean().optional(),
  sortBy: z.enum(['recent', 'helpful', 'rating_high', 'rating_low']).optional(),
});

export async function reviewRoutes(fastify: FastifyInstance) {
  // Create a review (authenticated)
  fastify.post('/reviews', { preHandler: authenticate }, async (request, reply) => {
    try {
      const data = CreateReviewSchema.parse(request.body);

      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const token = request.headers.authorization?.substring(7);

      const review = await reviewService.createReview(
        {
          ...data,
          userId: request.user.userId,
          userName: request.user.name || request.user.email,
        },
        token
      );

      reply.send({
        success: true,
        data: review,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get reviews for a product
  fastify.get('/products/:productId/reviews', async (request, reply) => {
    try {
      const { productId } = request.params as { productId: string };
      const query = request.query as any;

      const options = GetReviewsSchema.parse({
        page: query.page ? parseInt(query.page) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        rating: query.rating ? parseInt(query.rating) : undefined,
        verifiedOnly: query.verifiedOnly === 'true',
        sortBy: query.sortBy,
      });

      const result = await reviewService.getProductReviews(productId, options);

      reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get review summary for a product
  fastify.get('/products/:productId/reviews/summary', async (request, reply) => {
    try {
      const { productId } = request.params as { productId: string };

      const summary = await reviewService.getProductReviewSummary(productId);

      reply.send({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Vote on a review (authenticated)
  fastify.post(
    '/reviews/:reviewId/vote',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { reviewId } = request.params as { reviewId: string };
        const data = VoteSchema.parse(request.body);

        if (!request.user) {
          return reply.status(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const review = await reviewService.voteOnReview(
          reviewId,
          request.user.userId,
          data.voteType as VoteType
        );

        reply.send({
          success: true,
          data: review,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }

        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Update a review (authenticated)
  fastify.put('/reviews/:reviewId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { reviewId } = request.params as { reviewId: string };
      const data = UpdateReviewSchema.parse(request.body);

      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const review = await reviewService.updateReview(reviewId, request.user.userId, data);

      reply.send({
        success: true,
        data: review,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      }

      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Delete a review (authenticated)
  fastify.delete('/reviews/:reviewId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { reviewId } = request.params as { reviewId: string };

      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      await reviewService.deleteReview(reviewId, request.user.userId);

      reply.send({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get user's reviews (authenticated)
  fastify.get('/my-reviews', { preHandler: authenticate }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const reviews = await reviewService.getUserReviews(request.user.userId);

      reply.send({
        success: true,
        data: { reviews },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Moderate a review (admin only - would need admin auth middleware)
  fastify.put(
    '/reviews/:reviewId/moderate',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { reviewId } = request.params as { reviewId: string };
        const data = ModerateReviewSchema.parse(request.body);

        // TODO: Add admin role check
        // if (request.user?.role !== 'admin') {
        //   return reply.status(403).send({ success: false, error: 'Forbidden' });
        // }

        const review = await reviewService.moderateReview(
          reviewId,
          data.status as ReviewStatus,
          data.notes
        );

        reply.send({
          success: true,
          data: review,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        }

        reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
}
