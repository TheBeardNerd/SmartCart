import { FastifyInstance } from 'fastify';
import { recommendationService } from '../services/recommendation.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export async function recommendationRoutes(fastify: FastifyInstance) {
  // Get personalized recommendations (combines all strategies)
  fastify.get('/recommendations', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;
      const token = request.headers.authorization?.split(' ')[1] || '';

      const recommendations = await recommendationService.getPersonalizedRecommendations(userId, token);

      reply.send({
        success: true,
        data: recommendations,
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to generate recommendations',
      });
    }
  });

  // Get collaborative filtering recommendations
  fastify.get('/recommendations/collaborative', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;

      const recommendations = await recommendationService.getCollaborativeRecommendations(userId);

      reply.send({
        success: true,
        data: { recommendations },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to generate collaborative recommendations',
      });
    }
  });

  // Get content-based recommendations
  fastify.get('/recommendations/content-based', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;

      const recommendations = await recommendationService.getContentBasedRecommendations(userId);

      reply.send({
        success: true,
        data: { recommendations },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to generate content-based recommendations',
      });
    }
  });

  // Get reorder predictions
  fastify.get('/recommendations/reorder', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;

      const predictions = await recommendationService.getReorderPredictions(userId);

      reply.send({
        success: true,
        data: { predictions },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to generate reorder predictions',
      });
    }
  });

  // Get deal alerts
  fastify.get('/recommendations/deals', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;
      const token = request.headers.authorization?.split(' ')[1] || '';

      const dealAlerts = await recommendationService.getDealAlerts(userId, token);

      reply.send({
        success: true,
        data: { dealAlerts },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to generate deal alerts',
      });
    }
  });

  // Clear user's recommendation cache
  fastify.delete('/recommendations/cache', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;

      await recommendationService.clearUserCache(userId);

      reply.send({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to clear cache',
      });
    }
  });
}
