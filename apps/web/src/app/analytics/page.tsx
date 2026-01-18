'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { analyticsService, AnalyticsOverview, SpendingTrends, CategoryBreakdown, StoreBreakdown, TopProduct, ShoppingFrequency } from '@/lib/api/analytics';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Percent, Calendar,
  Tag, Store, Package, Clock, BarChart3, PieChart, Award
} from 'lucide-react';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrends | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [storeBreakdown, setStoreBreakdown] = useState<StoreBreakdown[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [frequency, setFrequency] = useState<ShoppingFrequency | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadAnalytics();
  }, [isAuthenticated, selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load all analytics data in parallel
      const [overviewData, trendsData, categoriesData, storesData, productsData, frequencyData] = await Promise.all([
        analyticsService.getOverview(selectedPeriod),
        analyticsService.getSpendingTrends('year'),
        analyticsService.getCategoryBreakdown(),
        analyticsService.getStoreBreakdown(),
        analyticsService.getTopProducts(5),
        analyticsService.getShoppingFrequency(),
      ]);

      setOverview(overviewData);
      setSpendingTrends(trendsData);
      setCategoryBreakdown(categoriesData.categories);
      setStoreBreakdown(storesData.stores);
      setTopProducts(productsData.products);
      setFrequency(frequencyData);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      alert(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const periods: { label: string; value: Period }[] = [
    { label: 'Last Week', value: 'week' },
    { label: 'Last Month', value: 'month' },
    { label: 'Last 3 Months', value: 'quarter' },
    { label: 'Last Year', value: 'year' },
    { label: 'All Time', value: 'all' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Analytics</h1>
          <p className="text-gray-600">Insights into your spending, savings, and shopping habits</p>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto">
            {periods.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                  selectedPeriod === period.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Spent */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">{overview.period}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                ${overview.totalSpent.toFixed(2)}
              </h3>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-xs text-gray-500 mt-2">
                {overview.totalOrders} {overview.totalOrders === 1 ? 'order' : 'orders'}
              </p>
            </div>

            {/* Total Savings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-green-600 font-medium">{overview.savingsPercentage}%</span>
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-1">
                ${overview.totalSavings.toFixed(2)}
              </h3>
              <p className="text-sm text-gray-600">Total Saved</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <Tag className="w-3 h-3" />
                <span>${overview.couponSavings.toFixed(2)} from coupons</span>
              </div>
            </div>

            {/* Average Order */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                ${overview.averageOrderValue.toFixed(2)}
              </h3>
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-xs text-gray-500 mt-2">
                {overview.totalItems} total items
              </p>
            </div>

            {/* Shopping Frequency */}
            {frequency && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {frequency.averageDaysBetweenOrders > 0
                    ? `${frequency.averageDaysBetweenOrders} days`
                    : 'N/A'
                  }
                </h3>
                <p className="text-sm text-gray-600">Between Orders</p>
                <p className="text-xs text-gray-500 mt-2">
                  {frequency.totalOrders} lifetime orders
                </p>
              </div>
            )}
          </div>
        )}

        {/* Spending Trends Chart */}
        {spendingTrends && spendingTrends.trends.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Spending Trends</h2>
            </div>

            <div className="space-y-3">
              {spendingTrends.trends.map((trend, index) => {
                const maxSpent = Math.max(...spendingTrends.trends.map(t => t.totalSpent));
                const widthPercentage = maxSpent > 0 ? (trend.totalSpent / maxSpent) * 100 : 0;

                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{trend.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">{trend.orderCount} orders</span>
                        <span className="font-semibold text-gray-900">
                          ${trend.totalSpent.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="absolute h-full bg-gradient-to-r from-green-500 to-green-600 rounded-lg transition-all duration-500"
                        style={{ width: `${widthPercentage}%` }}
                      />
                      {trend.totalSavings > 0 && (
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <span className="text-xs font-medium text-white">
                            Saved ${trend.totalSavings.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <PieChart className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Top Categories</h2>
              </div>

              <div className="space-y-4">
                {categoryBreakdown.slice(0, 5).map((category, index) => {
                  const maxSpent = Math.max(...categoryBreakdown.map(c => c.totalSpent));
                  const widthPercentage = (category.totalSpent / maxSpent) * 100;
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">{category.category}</span>
                        <span className="font-semibold text-gray-900">
                          ${category.totalSpent.toFixed(2)}
                        </span>
                      </div>
                      <div className="relative h-6 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className={`absolute h-full ${colors[index % colors.length]} rounded-lg transition-all duration-500`}
                          style={{ width: `${widthPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {category.itemCount} items · ${category.averageItemPrice.toFixed(2)} avg
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Store Breakdown */}
          {storeBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Store className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Favorite Stores</h2>
              </div>

              <div className="space-y-4">
                {storeBreakdown.slice(0, 5).map((store, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{store.store}</h3>
                      <p className="text-sm text-gray-600">
                        {store.orderCount} orders · {store.itemCount} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${store.totalSpent.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">${store.averageOrderValue.toFixed(2)} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Most Purchased Products</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{product.productName}</h3>
                    <p className="text-sm text-gray-600">{product.store}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-green-600">
                        ${product.totalSpent.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {product.purchaseCount}x purchased
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shopping Pattern */}
        {frequency && frequency.dayOfWeekDistribution && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Shopping Pattern</h2>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">Preferred Shopping Days</h3>
            <div className="grid grid-cols-7 gap-2">
              {frequency.dayOfWeekDistribution.map((day, index) => {
                const maxCount = Math.max(...frequency.dayOfWeekDistribution.map(d => d.count));
                const heightPercentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;

                return (
                  <div key={index} className="text-center">
                    <div className="h-32 flex items-end justify-center mb-2">
                      <div
                        className="w-full bg-green-500 rounded-t-lg transition-all duration-500 flex items-end justify-center pb-1"
                        style={{ height: `${heightPercentage}%`, minHeight: day.count > 0 ? '20px' : '0' }}
                      >
                        {day.count > 0 && (
                          <span className="text-xs font-semibold text-white">{day.count}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-700">{day.day.slice(0, 3)}</p>
                    {day.count > 0 && (
                      <p className="text-xs text-gray-500">{day.percentage}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {overview && overview.totalOrders === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-4">Start shopping to see your analytics</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
