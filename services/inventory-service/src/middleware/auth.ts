import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { config } from '../config';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
  };
}

export async function authenticate(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'No authorization token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
    };

    request.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

export async function optionalAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email: string;
      };

      request.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    }
  } catch (error) {
    request.user = undefined;
  }
}
