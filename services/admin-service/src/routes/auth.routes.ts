import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { authenticateAdmin, requirePermission } from '../middleware/auth';
import { AdminRole, Permission, AuditAction } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(AdminRole),
  permissions: z.array(z.nativeEnum(Permission)).optional(),
});

const updateAdminSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.nativeEnum(AdminRole).optional(),
  permissions: z.array(z.nativeEnum(Permission)).optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/api/admin/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const admin = await authService.login(
        body.email,
        body.password,
        request.ip,
        request.headers['user-agent']
      );

      const token = fastify.jwt.sign({
        id: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      });

      return reply.send({
        success: true,
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            permissions: admin.permissions,
          },
          token,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // Get current admin info
  fastify.get(
    '/api/admin/auth/me',
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      try {
        const admin = await authService.getAdminById(request.admin!.id);

        if (!admin) {
          return reply.status(404).send({
            success: false,
            error: 'Admin not found',
          });
        }

        return reply.send({
          success: true,
          data: admin,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Change password
  fastify.post(
    '/api/admin/auth/change-password',
    { preHandler: [authenticateAdmin] },
    async (request, reply) => {
      try {
        const body = changePasswordSchema.parse(request.body);

        await authService.changePassword(
          request.admin!.id,
          body.oldPassword,
          body.newPassword
        );

        await auditService.logAction({
          adminId: request.admin!.id,
          action: AuditAction.UPDATE,
          resource: 'admin',
          resourceId: request.admin!.id,
          details: { action: 'change_password' },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.send({
          success: true,
          message: 'Password changed successfully',
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Create admin (super admin only)
  fastify.post(
    '/api/admin/auth/create',
    {
      preHandler: [
        authenticateAdmin,
        requirePermission(Permission.MANAGE_ADMINS),
      ],
    },
    async (request, reply) => {
      try {
        const body = createAdminSchema.parse(request.body);

        const admin = await authService.createAdmin(body);

        await auditService.logAction({
          adminId: request.admin!.id,
          action: AuditAction.CREATE,
          resource: 'admin',
          resourceId: admin.id,
          details: { role: admin.role },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.status(201).send({
          success: true,
          data: admin,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // List admins
  fastify.get(
    '/api/admin/auth/list',
    {
      preHandler: [
        authenticateAdmin,
        requirePermission(Permission.MANAGE_ADMINS),
      ],
    },
    async (request, reply) => {
      try {
        const { role, isActive } = request.query as any;

        const admins = await authService.listAdmins({
          role: role as AdminRole,
          isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });

        return reply.send({
          success: true,
          data: admins,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Update admin
  fastify.put(
    '/api/admin/auth/:id',
    {
      preHandler: [
        authenticateAdmin,
        requirePermission(Permission.MANAGE_ADMINS),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateAdminSchema.parse(request.body);

        const admin = await authService.updateAdmin(id, body);

        await auditService.logAction({
          adminId: request.admin!.id,
          action: AuditAction.UPDATE,
          resource: 'admin',
          resourceId: id,
          details: body,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.send({
          success: true,
          data: admin,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Delete admin
  fastify.delete(
    '/api/admin/auth/:id',
    {
      preHandler: [
        authenticateAdmin,
        requirePermission(Permission.MANAGE_ADMINS),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        // Prevent self-deletion
        if (id === request.admin!.id) {
          return reply.status(400).send({
            success: false,
            error: 'Cannot delete your own account',
          });
        }

        await authService.deleteAdmin(id);

        await auditService.logAction({
          adminId: request.admin!.id,
          action: AuditAction.DELETE,
          resource: 'admin',
          resourceId: id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.send({
          success: true,
          message: 'Admin deleted successfully',
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
}
