import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminPayload, Permission } from '../types';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminPayload;
  }
}

export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const payload = await request.server.jwt.verify<AdminPayload>(token);
    request.admin = payload;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

export function requirePermission(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.admin) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    // Super admins have all permissions
    if (request.admin.role === 'SUPER_ADMIN') {
      return;
    }

    const hasPermission = permissions.some((perm) =>
      request.admin!.permissions.includes(perm)
    );

    if (!hasPermission) {
      return reply.status(403).send({
        success: false,
        error: 'Insufficient permissions',
      });
    }
  };
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.admin) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(request.admin.role)) {
      return reply.status(403).send({
        success: false,
        error: 'Insufficient permissions',
      });
    }
  };
}
