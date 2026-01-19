import { PrismaClient, AuditAction } from '@prisma/client';
import { AuditLogEntry } from '../types';

const prisma = new PrismaClient();

export class AuditService {
  async logAction(data: {
    adminId: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await prisma.auditLog.create({
      data,
    });
  }

  async getAuditLogs(filters?: {
    adminId?: string;
    resource?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const where: any = {};

    if (filters?.adminId) where.adminId = filters.adminId;
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        adminEmail: log.admin.email,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId || undefined,
        details: log.details,
        ipAddress: log.ipAddress || undefined,
        createdAt: log.createdAt,
      })),
      total,
    };
  }

  async getAdminActivity(adminId: string, limit: number = 20) {
    const logs = await prisma.auditLog.findMany({
      where: { adminId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  async exportAuditLogs(filters?: {
    resource?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.resource) where.resource = filters.resource;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      timestamp: log.createdAt.toISOString(),
      admin: `${log.admin.firstName} ${log.admin.lastName} (${log.admin.email})`,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress,
    }));
  }
}

export const auditService = new AuditService();
