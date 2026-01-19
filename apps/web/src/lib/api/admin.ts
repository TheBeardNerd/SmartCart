import axios from 'axios';

const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://localhost:3011';

// Create axios instance with admin auth
const createAdminApi = () => {
  const api = axios.create({
    baseURL: ADMIN_API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add auth token to requests
  api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return api;
};

export const adminApi = createAdminApi();

export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Types
export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  permissions: Permission[];
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  SUPPORT = 'SUPPORT',
}

export enum Permission {
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  VIEW_PRODUCTS = 'VIEW_PRODUCTS',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  VIEW_INVENTORY = 'VIEW_INVENTORY',
  MANAGE_ORDERS = 'MANAGE_ORDERS',
  VIEW_ORDERS = 'VIEW_ORDERS',
  REFUND_ORDERS = 'REFUND_ORDERS',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_USERS = 'VIEW_USERS',
  MODERATE_REVIEWS = 'MODERATE_REVIEWS',
  VIEW_REVIEWS = 'VIEW_REVIEWS',
  MANAGE_COUPONS = 'MANAGE_COUPONS',
  VIEW_COUPONS = 'VIEW_COUPONS',
  MANAGE_DELIVERY = 'MANAGE_DELIVERY',
  VIEW_DELIVERY = 'VIEW_DELIVERY',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  EXPORT_DATA = 'EXPORT_DATA',
  MANAGE_ADMINS = 'MANAGE_ADMINS',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
}

export interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStockProducts: number;
  pendingReviews: number;
  activePromotions: number;
  revenueByDay: Array<{ date: string; revenue: number }>;
  topProducts: Array<{ productId: string; name: string; sales: number; revenue: number }>;
  ordersByStatus: Record<string, number>;
  userGrowth: Array<{ date: string; count: number }>;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

// Admin Service
class AdminService {
  async login(email: string, password: string): Promise<{ admin: AdminUser; token: string }> {
    try {
      const response = await adminApi.post('/api/admin/auth/login', { email, password });
      const { admin, token } = response.data.data;

      // Store token
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminToken', token);
      }

      return { admin, token };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
    }
  }

  async getCurrentAdmin(): Promise<AdminUser> {
    try {
      const response = await adminApi.get('/api/admin/auth/me');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await adminApi.post('/api/admin/auth/change-password', { oldPassword, newPassword });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await adminApi.get('/api/admin/dashboard/metrics');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async getRecentActivity(limit?: number): Promise<any[]> {
    try {
      const response = await adminApi.get('/api/admin/dashboard/activity', {
        params: { limit },
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async refreshDashboard(): Promise<void> {
    try {
      await adminApi.post('/api/admin/dashboard/refresh');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async getAuditLogs(filters?: {
    adminId?: string;
    resource?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const response = await adminApi.get('/api/admin/dashboard/audit-logs', {
        params: filters,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  hasPermission(admin: AdminUser | null, permission: Permission): boolean {
    if (!admin) return false;
    if (admin.role === AdminRole.SUPER_ADMIN) return true;
    return admin.permissions.includes(permission);
  }
}

export const adminService = new AdminService();
