import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(period: string): { startDate: Date | null; endDate: Date } {
    const endDate = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate = null; // No start date means all time
    }

    return { startDate, endDate };
  }

  async getOverview(userId: string, period: string = 'all') {
    const { startDate, endDate } = this.getDateRange(period);

    const whereClause: any = {
      userId,
      status: { not: 'CANCELLED' },
    };

    if (startDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
      },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const totalSavings = orders.reduce(
      (sum, order) => sum + Number(order.estimatedSavings || 0),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const totalItems = orders.reduce((sum, order) => sum + order.items.length, 0);

    // Calculate savings breakdown
    const couponSavings = orders.reduce(
      (sum, order) => sum + Number(order.discountAmount || 0),
      0
    );
    const optimizationSavings = totalSavings - couponSavings;

    return {
      period,
      totalOrders,
      totalSpent: Number(totalSpent.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
      couponSavings: Number(couponSavings.toFixed(2)),
      optimizationSavings: Number(optimizationSavings.toFixed(2)),
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      totalItems,
      savingsPercentage:
        totalSpent > 0 ? Number(((totalSavings / (totalSpent + totalSavings)) * 100).toFixed(2)) : 0,
    };
  }

  async getSavings(userId: string, period: string = 'all') {
    const { startDate, endDate } = this.getDateRange(period);

    const whereClause: any = {
      userId,
      status: { not: 'CANCELLED' },
    };

    if (startDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        estimatedSavings: true,
        discountAmount: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const savingsOverTime = orders.map((order) => ({
      date: order.createdAt,
      totalSavings: Number(order.estimatedSavings || 0),
      couponSavings: Number(order.discountAmount || 0),
      optimizationSavings: Number(order.estimatedSavings || 0) - Number(order.discountAmount || 0),
      orderTotal: Number(order.totalAmount),
    }));

    const totalSavings = orders.reduce(
      (sum, order) => sum + Number(order.estimatedSavings || 0),
      0
    );

    return {
      period,
      totalSavings: Number(totalSavings.toFixed(2)),
      savingsOverTime,
    };
  }

  async getSpendingTrends(userId: string, period: string = 'year') {
    const { startDate, endDate } = this.getDateRange(period);

    const whereClause: any = {
      userId,
      status: { not: 'CANCELLED' },
    };

    if (startDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        totalAmount: true,
        subtotal: true,
        estimatedSavings: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by month
    const monthlyData = new Map<string, any>();

    orders.forEach((order) => {
      const monthKey = order.createdAt.toISOString().slice(0, 7); // YYYY-MM

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          totalSpent: 0,
          totalSavings: 0,
          orderCount: 0,
        });
      }

      const data = monthlyData.get(monthKey);
      data.totalSpent += Number(order.totalAmount);
      data.totalSavings += Number(order.estimatedSavings || 0);
      data.orderCount += 1;
    });

    const trends = Array.from(monthlyData.values()).map((data) => ({
      ...data,
      totalSpent: Number(data.totalSpent.toFixed(2)),
      totalSavings: Number(data.totalSavings.toFixed(2)),
      averageOrderValue: Number((data.totalSpent / data.orderCount).toFixed(2)),
    }));

    return {
      period,
      trends,
    };
  }

  async getCategoryBreakdown(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
      },
      include: {
        items: true,
      },
    });

    const categoryStats = new Map<string, any>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.attributes?.category || 'Uncategorized';

        if (!categoryStats.has(category)) {
          categoryStats.set(category, {
            category,
            totalSpent: 0,
            itemCount: 0,
            orderCount: 0,
          });
        }

        const stats = categoryStats.get(category);
        stats.totalSpent += Number(item.unitPrice) * item.quantity;
        stats.itemCount += item.quantity;
        stats.orderCount += 1;
      });
    });

    const breakdown = Array.from(categoryStats.values())
      .map((stats) => ({
        ...stats,
        totalSpent: Number(stats.totalSpent.toFixed(2)),
        averageItemPrice: Number((stats.totalSpent / stats.itemCount).toFixed(2)),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      categories: breakdown,
      totalCategories: breakdown.length,
    };
  }

  async getStoreBreakdown(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
      },
      include: {
        items: true,
      },
    });

    const storeStats = new Map<string, any>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const store = item.storeName;

        if (!storeStats.has(store)) {
          storeStats.set(store, {
            store,
            totalSpent: 0,
            itemCount: 0,
            orderCount: new Set(),
          });
        }

        const stats = storeStats.get(store);
        stats.totalSpent += Number(item.unitPrice) * item.quantity;
        stats.itemCount += item.quantity;
        stats.orderCount.add(order.id);
      });
    });

    const breakdown = Array.from(storeStats.values())
      .map((stats) => ({
        store: stats.store,
        totalSpent: Number(stats.totalSpent.toFixed(2)),
        itemCount: stats.itemCount,
        orderCount: stats.orderCount.size,
        averageOrderValue: Number((stats.totalSpent / stats.orderCount.size).toFixed(2)),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      stores: breakdown,
      totalStores: breakdown.length,
    };
  }

  async getTopProducts(userId: string, limit: number = 10) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
      },
      include: {
        items: true,
      },
    });

    const productStats = new Map<string, any>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.productId}-${item.storeName}`;

        if (!productStats.has(key)) {
          productStats.set(key, {
            productId: item.productId,
            productName: item.productName,
            store: item.storeName,
            totalQuantity: 0,
            totalSpent: 0,
            purchaseCount: 0,
            imageUrl: item.productImage,
          });
        }

        const stats = productStats.get(key);
        stats.totalQuantity += item.quantity;
        stats.totalSpent += Number(item.unitPrice) * item.quantity;
        stats.purchaseCount += 1;
      });
    });

    const topProducts = Array.from(productStats.values())
      .map((stats) => ({
        ...stats,
        totalSpent: Number(stats.totalSpent.toFixed(2)),
        averagePrice: Number((stats.totalSpent / stats.totalQuantity).toFixed(2)),
      }))
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, limit);

    return {
      products: topProducts,
    };
  }

  async getShoppingFrequency(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (orders.length === 0) {
      return {
        totalOrders: 0,
        averageDaysBetweenOrders: 0,
        dayOfWeekDistribution: [],
        monthlyDistribution: [],
      };
    }

    // Calculate average days between orders
    const daysBetween: number[] = [];
    for (let i = 1; i < orders.length; i++) {
      const diff =
        (orders[i].createdAt.getTime() - orders[i - 1].createdAt.getTime()) / (1000 * 60 * 60 * 24);
      daysBetween.push(diff);
    }

    const averageDaysBetweenOrders =
      daysBetween.length > 0
        ? Number((daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length).toFixed(1))
        : 0;

    // Day of week distribution
    const dayOfWeekCounts = new Array(7).fill(0);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    orders.forEach((order) => {
      dayOfWeekCounts[order.createdAt.getDay()]++;
    });

    const dayOfWeekDistribution = dayOfWeekCounts.map((count, index) => ({
      day: dayNames[index],
      count,
      percentage: Number(((count / orders.length) * 100).toFixed(1)),
    }));

    // Monthly distribution (last 12 months)
    const monthlyDistribution: any[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = targetDate.toISOString().slice(0, 7);
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const count = orders.filter((order) => {
        const orderMonth = order.createdAt.toISOString().slice(0, 7);
        return orderMonth === monthKey;
      }).length;

      monthlyDistribution.push({
        month: monthName,
        count,
      });
    }

    return {
      totalOrders: orders.length,
      averageDaysBetweenOrders,
      dayOfWeekDistribution,
      monthlyDistribution,
    };
  }
}
