import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from '../utils/jwt';
import { cacheUser, invalidateUserCache } from '../utils/redis';
import { authenticateUser } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/register
   * Register a new user
   */
  fastify.post(
    '/auth/register',
    {
      schema: {
        description: 'Register a new user account',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { type: 'object' },
                  tokens: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = registerSchema.parse(request.body);

        // Validate password strength
        const passwordValidation = validatePasswordStrength(body.password);
        if (!passwordValidation.isValid) {
          reply.status(400).send({
            success: false,
            error: 'Password does not meet requirements',
            details: passwordValidation.errors,
          });
          return;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: body.email.toLowerCase() },
        });

        if (existingUser) {
          reply.status(409).send({
            success: false,
            error: 'User with this email already exists',
          });
          return;
        }

        // Hash password
        const passwordHash = await hashPassword(body.password);

        // Create user
        const user = await prisma.user.create({
          data: {
            email: body.email.toLowerCase(),
            passwordHash,
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            preferences: {
              notifications: true,
              newsletter: true,
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        });

        // Generate tokens
        const tokens = await generateTokenPair(user.id, user.email);

        // Cache user
        await cacheUser(user.id, user);

        fastify.log.info(`New user registered: ${user.email}`);

        reply.status(201).send({
          success: true,
          data: {
            user,
            tokens,
          },
        });
      } catch (error) {
        fastify.log.error('Registration error:', error);

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
          error: 'Registration failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /auth/login
   * Login user
   */
  fastify.post(
    '/auth/login',
    {
      schema: {
        description: 'Login with email and password',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { type: 'object' },
                  tokens: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = loginSchema.parse(request.body);

        // Find user
        const user = await prisma.user.findUnique({
          where: { email: body.email.toLowerCase() },
        });

        if (!user) {
          reply.status(401).send({
            success: false,
            error: 'Invalid email or password',
          });
          return;
        }

        // Check if account is deleted
        if (user.deletedAt) {
          reply.status(403).send({
            success: false,
            error: 'Account has been deleted',
          });
          return;
        }

        // Verify password
        const isPasswordValid = await comparePassword(body.password, user.passwordHash);

        if (!isPasswordValid) {
          reply.status(401).send({
            success: false,
            error: 'Invalid email or password',
          });
          return;
        }

        // Generate tokens
        const tokens = await generateTokenPair(user.id, user.email);

        // Prepare user data (exclude sensitive fields)
        const userData = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          profile: user.profile,
          preferences: user.preferences,
          createdAt: user.createdAt,
        };

        // Cache user
        await cacheUser(user.id, userData);

        fastify.log.info(`User logged in: ${user.email}`);

        reply.send({
          success: true,
          data: {
            user: userData,
            tokens,
          },
        });
      } catch (error) {
        fastify.log.error('Login error:', error);

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
          error: 'Login failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  fastify.post(
    '/auth/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = refreshTokenSchema.parse(request.body);

        const tokens = await refreshAccessToken(body.refreshToken);

        reply.send({
          success: true,
          data: { tokens },
        });
      } catch (error) {
        fastify.log.error('Token refresh error:', error);

        reply.status(401).send({
          success: false,
          error: 'Invalid or expired refresh token',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /auth/logout
   * Logout user (revoke refresh token)
   */
  fastify.post(
    '/auth/logout',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Logout user and revoke refresh token',
        tags: ['auth'],
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as { refreshToken?: string };

        if (body.refreshToken) {
          await revokeRefreshToken(body.refreshToken);
        }

        // Invalidate user cache
        if (request.user) {
          await invalidateUserCache(request.user.userId);
        }

        fastify.log.info(`User logged out: ${request.user?.email}`);

        reply.send({
          success: true,
          message: 'Logged out successfully',
        });
      } catch (error) {
        fastify.log.error('Logout error:', error);

        reply.status(500).send({
          success: false,
          error: 'Logout failed',
        });
      }
    }
  );

  /**
   * POST /auth/logout-all
   * Logout from all devices
   */
  fastify.post(
    '/auth/logout-all',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Logout from all devices',
        tags: ['auth'],
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

        await revokeAllRefreshTokens(request.user.userId);
        await invalidateUserCache(request.user.userId);

        fastify.log.info(`User logged out from all devices: ${request.user.email}`);

        reply.send({
          success: true,
          message: 'Logged out from all devices',
        });
      } catch (error) {
        fastify.log.error('Logout all error:', error);

        reply.status(500).send({
          success: false,
          error: 'Logout failed',
        });
      }
    }
  );

  /**
   * POST /auth/change-password
   * Change user password
   */
  fastify.post(
    '/auth/change-password',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Change user password',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
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

        const body = changePasswordSchema.parse(request.body);

        // Validate new password strength
        const passwordValidation = validatePasswordStrength(body.newPassword);
        if (!passwordValidation.isValid) {
          reply.status(400).send({
            success: false,
            error: 'New password does not meet requirements',
            details: passwordValidation.errors,
          });
          return;
        }

        // Get user
        const user = await prisma.user.findUnique({
          where: { id: request.user.userId },
        });

        if (!user) {
          reply.status(404).send({
            success: false,
            error: 'User not found',
          });
          return;
        }

        // Verify current password
        const isPasswordValid = await comparePassword(body.currentPassword, user.passwordHash);

        if (!isPasswordValid) {
          reply.status(401).send({
            success: false,
            error: 'Current password is incorrect',
          });
          return;
        }

        // Hash new password
        const newPasswordHash = await hashPassword(body.newPassword);

        // Update password
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newPasswordHash },
        });

        // Revoke all refresh tokens (force re-login on all devices)
        await revokeAllRefreshTokens(user.id);
        await invalidateUserCache(user.id);

        fastify.log.info(`Password changed for user: ${user.email}`);

        reply.send({
          success: true,
          message: 'Password changed successfully. Please login again.',
        });
      } catch (error) {
        fastify.log.error('Change password error:', error);

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
          error: 'Password change failed',
        });
      }
    }
  );

  /**
   * GET /auth/me
   * Get current user
   */
  fastify.get(
    '/auth/me',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get current authenticated user',
        tags: ['auth'],
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string' },
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
        fastify.log.error('Get current user error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get user',
        });
      }
    }
  );
}
