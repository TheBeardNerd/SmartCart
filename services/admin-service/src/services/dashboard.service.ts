import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import Redis from 'ioredis';
import { DashboardMetrics } from '../types';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3001';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3007';
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://localhost:3010';
const COUPON_SERVICE_URL = process.env.COUPON_SERVICE_URL || 'http://localhost:3005';

export class DashboardService {
  private readonly CACHE_TTL = 300; // 5 minutes

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Try to get from cache first
    const cached = await redis.get('dashboard:metrics');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch data from all services in parallel
    const [
      orderStats,
      productStats,
      inventoryStats,
      reviewStats,
      couponStats,
    ] = await Promise.allSettled([
      this.getOrderStats(),
      this.getProductStats(),
      this.getInventoryStats(),
      this.getReviewStats(),
      this.getCouponStats(),
    ]);

    const metrics: DashboardMetrics = {
      totalOrders: orderStats.status === 'fulfilled' ? orderStats.value.totalOrders : 0,
      totalRevenue: orderStats.status === 'fulfilled' ? orderStats.value.totalRevenue : 0,
      totalUsers: orderStats.status === 'fulfilled' ? orderStats.value.totalUsers : 0,
      totalProducts: productStats.status === 'fulfilled' ? productStats.value.totalProducts : 0,
      pendingOrders: orderStats.status === 'fulfilled' ? orderStats.value.pendingOrders : 0,
      lowStockProducts: inventoryStats.status === 'fulfilled' ? inventoryStats.value.lowStockCount : 0,
      pendingReviews: reviewStats.status === 'fulfilled' ? reviewStats.value.pendingCount : 0,
      activePromotions: couponStats.status === 'fulfilled' ? couponStats.value.activeCount : 0,
      revenueByDay: orderStats.status === 'fulfilled' ? orderStats.value.revenueByDay : [],
      topProducts: orderStats.status === 'fulfilled' ? orderStats.value.topProducts : [],
      ordersByStatus: orderStats.status === 'fulfilled' ? orderStats.value.ordersByStatus : {},
      userGrowth: orderStats.status === 'fulfilled' ? orderStats.value.userGrowth : [],
    };

    // Cache the results
    await redis.setex('dashboard:metrics', this.CACHE_TTL, JSON.stringify(metrics));

    return metrics;
  }

  private async getOrderStats() {
    try {
      const response = await axios.get(`${ORDER_SERVICE_URL}/api/orders/analytics/dashboard`, {
        timeout: 5000,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalUsers: 0,
        pendingOrders: 0,
        revenueByDay: [],
        topProducts: [],
        ordersByStatus: {},
        userGrowth: [],
      };
    }
  }

  private async getProductStats() {
    try {
      const response = await axios.get(`${CATALOG_SERVICE_URL}/api/products/analytics/stats`, {
        timeout: 5000,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch product stats:', error);
      return { totalProducts: 0 };
    }
  }

  private async getInventoryStats() {
    try {
      const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/inventory/analytics/stats`, {
        timeout: 5000,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch inventory stats:', error);
      return { lowStockCount: 0 };
    }
  }

  private async getReviewStats() {
    try {
      const response = await axios.get(`${REVIEW_SERVICE_URL}/api/reviews/analytics/stats`, {
        timeout: 5000,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
      return { pendingCount: 0 };
    }
  }

  private async getCouponStats() {
    try {
      const response = await axios.get(`${COUPON_SERVICE_URL}/api/coupons/analytics/stats`, {
        timeout: 5000,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch coupon stats:', error);
      return { activeCount: 0 };
    }
  }

  async invalidateCache() {
    await redis.del('dashboard:metrics');
  }

  async getRecentActivity(limit: number = 20) {
    const logs = await prisma.auditLog.findMany({
      take: limit,
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
      id: log.id,
      adminEmail: log.admin.email,
      adminName: `${log.admin.firstName} ${log.admin.lastName}`,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details,
      createdAt: log.createdAt,
    }));
  }
}

export const dashboardService = new DashboardService();
