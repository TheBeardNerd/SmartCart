import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth';
import { cacheUser, invalidateUserCache } from '../utils/redis';

const prisma = new PrismaClient();

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  profile: z.record(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
});

const addAddressSchema = z.object({
  label: z.string().optional(),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().default('US'),
  isDefault: z.boolean().default(false),
});

const updateAddressSchema = addAddressSchema.partial();

export async function userRoutes(fastify: FastifyInstance) {
  /**
   * GET /users/profile
   * Get user profile
   */
  fastify.get(
    '/users/profile',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get user profile',
        tags: ['users'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: request.user.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            profile: true,
            preferences: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          reply.status(404).send({
            success: false,
            error: 'User not found',
          });
          return;
        }

        reply.send({
          success: true,
          data: { user },
        });
      } catch (error) {
        fastify.log.error('Get profile error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get profile',
        });
      }
    }
  );

  /**
   * PUT /users/profile
   * Update user profile
   */
  fastify.put(
    '/users/profile',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Update user profile',
        tags: ['users'],
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            profile: { type: 'object' },
            preferences: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const body = updateProfileSchema.parse(request.body);

        const user = await prisma.user.update({
          where: { id: request.user.userId },
          data: body,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            profile: true,
            preferences: true,
            updatedAt: true,
          },
        });

        // Invalidate cache
        await invalidateUserCache(user.id);

        fastify.log.info(`Profile updated for user: ${request.user.email}`);

        reply.send({
          success: true,
          data: { user },
        });
      } catch (error) {
        fastify.log.error('Update profile error:', error);

        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
          return;
        }

        reply.status(500).send({
          success: false,
          error: 'Failed to update profile',
        });
      }
    }
  );

  /**
   * GET /users/addresses
   * Get user addresses
   */
  fastify.get(
    '/users/addresses',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get user addresses',
        tags: ['users'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const addresses = await prisma.address.findMany({
          where: { userId: request.user.userId },
          orderBy: { createdAt: 'desc' },
        });

        reply.send({
          success: true,
          data: { addresses },
        });
      } catch (error) {
        fastify.log.error('Get addresses error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get addresses',
        });
      }
    }
  );

  /**
   * POST /users/addresses
   * Add new address
   */
  fastify.post(
    '/users/addresses',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Add new address',
        tags: ['users'],
        body: {
          type: 'object',
          required: ['addressLine1', 'city', 'state', 'postalCode'],
          properties: {
            label: { type: 'string' },
            addressLine1: { type: 'string' },
            addressLine2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            isDefault: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const body = addAddressSchema.parse(request.body);

        // If this is set as default, unset other defaults
        if (body.isDefault) {
          await prisma.address.updateMany({
            where: {
              userId: request.user.userId,
              isDefault: true,
            },
            data: { isDefault: false },
          });
        }

        const address = await prisma.address.create({
          data: {
            ...body,
            userId: request.user.userId,
          },
        });

        fastify.log.info(`Address added for user: ${request.user.email}`);

        reply.status(201).send({
          success: true,
          data: { address },
        });
      } catch (error) {
        fastify.log.error('Add address error:', error);

        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
          return;
        }

        reply.status(500).send({
          success: false,
          error: 'Failed to add address',
        });
      }
    }
  );

  /**
   * PUT /users/addresses/:id
   * Update address
   */
  fastify.put(
    '/users/addresses/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Update address',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const { id } = request.params as { id: string };
        const body = updateAddressSchema.parse(request.body);

        // Verify address belongs to user
        const existingAddress = await prisma.address.findUnique({
          where: { id },
        });

        if (!existingAddress || existingAddress.userId !== request.user.userId) {
          reply.status(404).send({
            success: false,
            error: 'Address not found',
          });
          return;
        }

        // If setting as default, unset other defaults
        if (body.isDefault) {
          await prisma.address.updateMany({
            where: {
              userId: request.user.userId,
              isDefault: true,
            },
            data: { isDefault: false },
          });
        }

        const address = await prisma.address.update({
          where: { id },
          data: body,
        });

        reply.send({
          success: true,
          data: { address },
        });
      } catch (error) {
        fastify.log.error('Update address error:', error);

        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Invalid request data',
            details: error.errors,
          });
          return;
        }

        reply.status(500).send({
          success: false,
          error: 'Failed to update address',
        });
      }
    }
  );

  /**
   * DELETE /users/addresses/:id
   * Delete address
   */
  fastify.delete(
    '/users/addresses/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Delete address',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const { id } = request.params as { id: string };

        // Verify address belongs to user
        const existingAddress = await prisma.address.findUnique({
          where: { id },
        });

        if (!existingAddress || existingAddress.userId !== request.user.userId) {
          reply.status(404).send({
            success: false,
            error: 'Address not found',
          });
          return;
        }

        await prisma.address.delete({
          where: { id },
        });

        reply.send({
          success: true,
          message: 'Address deleted successfully',
        });
      } catch (error) {
        fastify.log.error('Delete address error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to delete address',
        });
      }
    }
  );

  /**
   * DELETE /users/account
   * Delete user account (soft delete)
   */
  fastify.delete(
    '/users/account',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Delete user account',
        tags: ['users'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        // Soft delete
        await prisma.user.update({
          where: { id: request.user.userId },
          data: { deletedAt: new Date() },
        });

        // Invalidate cache and revoke tokens
        await invalidateUserCache(request.user.userId);

        fastify.log.info(`Account deleted for user: ${request.user.email}`);

        reply.send({
          success: true,
          message: 'Account deleted successfully',
        });
      } catch (error) {
        fastify.log.error('Delete account error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to delete account',
        });
      }
    }
  );
}
