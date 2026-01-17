'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { ordersService } from '@/lib/api/orders';
import { Package, ChevronRight } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/orders');
      return;
    }

    loadOrders();
  }, [isAuthenticated, user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const userOrders = await ordersService.getUserOrders(user.id);
      setOrders(userOrders);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-purple-100 text-purple-800',
      OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <Package className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">No orders yet</h2>
            <p className="mt-2 text-gray-600">
              Start shopping to place your first order
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    Ordered on {formatDate(order.createdAt)}
                  </p>

                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <span className="font-semibold ml-2">{order.items?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold ml-2">
                        ${parseFloat(order.total).toFixed(2)}
                      </span>
                    </div>
                    {order.estimatedDelivery && (
                      <div>
                        <span className="text-gray-600">Delivery:</span>
                        <span className="font-semibold ml-2">
                          {new Date(order.estimatedDelivery).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
