import { AdminRole, Permission, AuditAction } from '@prisma/client';

export interface AdminPayload {
  id: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
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

export interface ProductManagement {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stockCount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderManagement {
  id: string;
  userId: string;
  userEmail: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  fulfillmentType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserManagement {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  orderCount: number;
  totalSpent: number;
  createdAt: Date;
  lastOrderAt?: Date;
}

export interface InventoryManagement {
  id: string;
  productId: string;
  productName: string;
  store: string;
  quantity: number;
  reserved: number;
  available: number;
  status: string;
  lastRestocked?: Date;
}

export interface ReviewModeration {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  status: string;
  verifiedPurchase: boolean;
  flagCount: number;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: Date;
}

export { AdminRole, Permission, AuditAction };
