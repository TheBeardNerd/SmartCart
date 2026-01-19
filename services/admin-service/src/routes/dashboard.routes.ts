import { FastifyInstance } from 'fastify';
import { dashboardService } from '../services/dashboard.service';
import { auditService } from '../services/audit.service';
import { authenticateAdmin, requirePermission } from '../middleware/auth';
import { Permission, AuditAction } from '@prisma/client';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard metrics
  fastify.get(
    '/api/admin/dashboard/metrics',
    {
      preHandler: [
        authenticateAdmin,
        requirePermission(Permission.VIEW_ANALYTICS),
      ],
    },
    async (request, reply) => {
      try {
        const metrics = await dashboardService.getDashboardMetrics();

        await auditService.logAction({
          adminId: request.admin!.id,
          action: AuditAction.VIEW,
          resource: 'dashboard',
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.send({
          success: true,
          data: metrics,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Get recent activity
  fastify.get(
    '/api/admin/dashboard/activity',
    {
      preHandler: [authenticateAdmin],
    },
    async (request, reply) => {
      try {
        const { limit } = request.query as { limit?: string };

        const activity = await dashboardService.getRecentActivity(
          limit ? parseInt(limit) : 20
        );

        return reply.send({
          success: true,
          data: activity,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Invalidate dashboard cache
  fastify.post(
    '/api/admin/dashboard/refresh',
    {
      preHandler: [authenticateAdmin],
    },
    async (request, reply) => {
      try {
        await dashboardService.invalidateCache();

        return reply.send({
          success: true,
          message: 'Dashboard cache cleared',
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Get audit logs
  fastify.get(
    '/api/admin/dashboard/audit-logs',
    {
      preHandler: [
        authenticateAdmin,
        requirePermission(Permission.VIEW_AUDIT_LOGS),
      ],
    },
    async (request, reply) => {
      try {
        const {
          adminId,
          resource,
          action,
          startDate,
          endDate,
          limit,
          offset,
        } = request.query as any;

        const { logs, total } = await auditService.getAuditLogs({
          adminId,
          resource,
          action,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });

        return reply.send({
          success: true,
          data: {
            logs,
            total,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
          },
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Export audit logs
  fastify.get(
    '/api/admin/dashboard/audit-logs/export',
    {
      preHandler: [
        authenticateAdmin,
        requirePermission(Permission.EXPORT_DATA),
      ],
    },
    async (request, reply) => {
      try {
        const { resource, action, startDate, endDate } = request.query as any;

        const logs = await auditService.exportAuditLogs({
          resource,
          action,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        });

        await auditService.logAction({
          adminId: request.admin!.id,
          action: AuditAction.EXPORT,
          resource: 'audit_logs',
          details: { format: 'json' },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.send({
          success: true,
          data: logs,
        });
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
}
