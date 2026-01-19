import { PrismaClient, AdminRole, Permission, AuditAction } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AdminPayload } from '../types';

const prisma = new PrismaClient();

export class AuthService {
  async createAdmin(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: AdminRole;
    permissions?: Permission[];
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const admin = await prisma.admin.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        permissions: data.permissions || this.getDefaultPermissions(data.role),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    return admin;
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Log the login
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: AuditAction.LOGIN,
        resource: 'admin',
        resourceId: admin.id,
        ipAddress,
        userAgent,
      },
    });

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions,
    };
  }

  async getAdminById(id: string) {
    return prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateAdmin(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      role?: AdminRole;
      permissions?: Permission[];
      isActive?: boolean;
    }
  ) {
    return prisma.admin.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const admin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);

    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async listAdmins(filters?: { role?: AdminRole; isActive?: boolean }) {
    return prisma.admin.findMany({
      where: filters,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAdmin(id: string) {
    await prisma.admin.delete({
      where: { id },
    });
  }

  private getDefaultPermissions(role: AdminRole): Permission[] {
    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return Object.values(Permission);

      case AdminRole.ADMIN:
        return [
          Permission.MANAGE_PRODUCTS,
          Permission.VIEW_PRODUCTS,
          Permission.MANAGE_INVENTORY,
          Permission.VIEW_INVENTORY,
          Permission.MANAGE_ORDERS,
          Permission.VIEW_ORDERS,
          Permission.REFUND_ORDERS,
          Permission.VIEW_USERS,
          Permission.MODERATE_REVIEWS,
          Permission.VIEW_REVIEWS,
          Permission.MANAGE_COUPONS,
          Permission.VIEW_COUPONS,
          Permission.MANAGE_DELIVERY,
          Permission.VIEW_DELIVERY,
          Permission.VIEW_ANALYTICS,
        ];

      case AdminRole.MODERATOR:
        return [
          Permission.VIEW_PRODUCTS,
          Permission.VIEW_INVENTORY,
          Permission.VIEW_ORDERS,
          Permission.VIEW_USERS,
          Permission.MODERATE_REVIEWS,
          Permission.VIEW_REVIEWS,
          Permission.VIEW_COUPONS,
          Permission.VIEW_DELIVERY,
        ];

      case AdminRole.SUPPORT:
        return [
          Permission.VIEW_PRODUCTS,
          Permission.VIEW_INVENTORY,
          Permission.VIEW_ORDERS,
          Permission.VIEW_USERS,
          Permission.VIEW_REVIEWS,
        ];

      default:
        return [];
    }
  }
}

export const authService = new AuthService();
