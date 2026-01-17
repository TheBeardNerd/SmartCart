'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { ordersService } from '@/lib/api/orders';
import { Package, MapPin, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/orders');
      return;
    }

    loadOrder();
    loadTracking();
  }, [params.id, isAuthenticated, user]);

  const loadOrder = async () => {
    try {
      const orderData = await ordersService.getOrder(params.id as string, user?.id);
      setOrder(orderData);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTracking = async () => {
    try {
      const trackingData = await ordersService.getOrderTracking(
        params.id as string,
        user?.id
      );
      setTracking(trackingData);
    } catch (err: any) {
      console.error('Failed to load tracking:', err);
    }
  };

  const handleCancelOrder = async () => {
    if (!user || !confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancelling(true);
    try {
      await ordersService.cancelOrder(params.id as string, user.id, 'Cancelled by customer');
      await loadOrder();
      await loadTracking();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'CANCELLED':
      case 'FAILED':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'OUT_FOR_DELIVERY':
        return <Truck className="w-6 h-6 text-blue-600" />;
      default:
        return <Package className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'text-yellow-600',
      CONFIRMED: 'text-blue-600',
      PREPARING: 'text-purple-600',
      OUT_FOR_DELIVERY: 'text-indigo-600',
      DELIVERED: 'text-green-600',
      CANCELLED: 'text-red-600',
      FAILED: 'text-red-600',
    };
    return colors[status] || 'text-gray-600';
  };

  const canCancelOrder = (status: string) => {
    return !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error || 'Order not found'}</p>
            <button
              onClick={() => router.push('/orders')}
              className="mt-4 text-green-600 hover:text-green-700 font-semibold"
            >
              ← Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <button
          onClick={() => router.push('/orders')}
          className="text-green-600 hover:text-green-700 font-semibold mb-6"
        >
          ← Back to Orders
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Order {order.orderNumber}</h1>
                  <p className="text-gray-600">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusIcon(order.status)}
                  <span className={`text-lg font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Order Timeline */}
              {tracking && tracking.statusHistory && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-4">Order Timeline</h3>
                  <div className="space-y-4">
                    {tracking.statusHistory.map((history: any, index: number) => (
                      <div key={history.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          />
                          {index < tracking.statusHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-300 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-semibold">{history.toStatus.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-600">{history.reason}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(history.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Info */}
            {order.deliveryAddress && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Delivery Address</h3>
                </div>
                <div className="text-gray-700">
                  <p>{order.deliveryAddress.street}</p>
                  {order.deliveryAddress.apartment && <p>{order.deliveryAddress.apartment}</p>}
                  <p>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}{' '}
                    {order.deliveryAddress.zipCode}
                  </p>
                  {order.deliveryAddress.instructions && (
                    <p className="mt-2 text-sm text-gray-600">
                      Instructions: {order.deliveryAddress.instructions}
                    </p>
                  )}
                </div>

                {order.estimatedDelivery && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700">
                        Estimated Delivery:{' '}
                        <span className="font-semibold">
                          {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Order Items ({order.items.length})</h3>
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex gap-4 py-3 border-b last:border-b-0">
                    {item.productImage && (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.productName}</h4>
                      <p className="text-sm text-gray-600">Store: {item.storeName}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${parseFloat(item.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ${parseFloat(item.unitPrice).toFixed(2)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Store Fulfillments */}
            {tracking && tracking.storeFulfillments && tracking.storeFulfillments.length > 1 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Store Fulfillments</h3>
                <div className="space-y-4">
                  {tracking.storeFulfillments.map((fulfillment: any) => (
                    <div
                      key={fulfillment.storeId}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{fulfillment.storeName}</h4>
                        <span className="text-sm text-gray-600">
                          {fulfillment.status.replace('_', ' ')}
                        </span>
                      </div>
                      {fulfillment.trackingNumber && (
                        <p className="text-sm text-gray-600">
                          Tracking: {fulfillment.trackingNumber}
                        </p>
                      )}
                      {fulfillment.estimatedDelivery && (
                        <p className="text-sm text-gray-600">
                          ETA: {new Date(fulfillment.estimatedDelivery).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">
                    ${parseFloat(order.subtotal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold">${parseFloat(order.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">
                    ${parseFloat(order.deliveryFee).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="font-semibold">
                    ${parseFloat(order.serviceFee).toFixed(2)}
                  </span>
                </div>

                {order.estimatedSavings && parseFloat(order.estimatedSavings) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Savings</span>
                    <span className="font-semibold">
                      -${parseFloat(order.estimatedSavings).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>

              {canCancelOrder(order.status) && (
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="w-full mt-6 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}

              {order.customerNotes && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-2">Your Notes</h4>
                  <p className="text-sm text-gray-700">{order.customerNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
