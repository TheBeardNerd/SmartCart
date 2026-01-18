'use client';

import { useState, useEffect } from 'react';
import { deliveryService, TrackingInfo, DeliveryStatus } from '@/lib/api/delivery';
import { Package, Loader2, CheckCircle, TruckIcon, Home, XCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface OrderTrackerProps {
  orderId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function OrderTracker({ orderId, autoRefresh = true, refreshInterval = 30000 }: OrderTrackerProps) {
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTracking();

    if (autoRefresh) {
      const interval = setInterval(loadTracking, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [orderId, autoRefresh, refreshInterval]);

  const loadTracking = async () => {
    try {
      setError(null);
      const delivery = await deliveryService.getDeliveryByOrderId(orderId);
      const trackingInfo = await deliveryService.getTrackingInfo(delivery.id);
      setTracking(trackingInfo);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.SCHEDULED:
        return <Clock className="w-5 h-5" />;
      case DeliveryStatus.PREPARING:
        return <Package className="w-5 h-5" />;
      case DeliveryStatus.READY_FOR_PICKUP:
        return <CheckCircle className="w-5 h-5" />;
      case DeliveryStatus.OUT_FOR_DELIVERY:
        return <TruckIcon className="w-5 h-5" />;
      case DeliveryStatus.DELIVERED:
        return <Home className="w-5 h-5" />;
      case DeliveryStatus.FAILED:
      case DeliveryStatus.CANCELLED:
        return <XCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED:
        return 'bg-green-100 text-green-700 border-green-300';
      case DeliveryStatus.OUT_FOR_DELIVERY:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case DeliveryStatus.FAILED:
      case DeliveryStatus.CANCELLED:
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-orange-100 text-orange-700 border-orange-300';
    }
  };

  const getStatusLabel = (status: DeliveryStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading tracking information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Failed to load tracking: {error}</p>
        <button
          onClick={loadTracking}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600">No tracking information available for this order.</p>
      </div>
    );
  }

  const statusOrder = [
    DeliveryStatus.SCHEDULED,
    DeliveryStatus.PREPARING,
    DeliveryStatus.READY_FOR_PICKUP,
    DeliveryStatus.OUT_FOR_DELIVERY,
    DeliveryStatus.DELIVERED,
  ];

  const currentStatusIndex = statusOrder.indexOf(tracking.status);

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <div className={`p-6 rounded-lg border-2 ${getStatusColor(tracking.status)}`}>
        <div className="flex items-center gap-3 mb-4">
          {getStatusIcon(tracking.status)}
          <h3 className="text-xl font-bold">{getStatusLabel(tracking.status)}</h3>
        </div>

        {tracking.estimatedDelivery && !tracking.actualDelivery && (
          <p className="text-sm">
            Estimated Delivery: {format(parseISO(tracking.estimatedDelivery), 'EEEE, MMMM d, h:mm a')}
          </p>
        )}

        {tracking.actualDelivery && (
          <p className="text-sm">
            Delivered: {format(parseISO(tracking.actualDelivery), 'EEEE, MMMM d, h:mm a')}
          </p>
        )}
      </div>

      {/* Driver Information */}
      {tracking.driver && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-green-600" />
            Driver Information
          </h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Name:</span> {tracking.driver.name}
            </p>
            <p>
              <span className="font-medium">Vehicle:</span> {tracking.driver.vehicleType}
            </p>
            <p>
              <span className="font-medium">Phone:</span>{' '}
              <a href={`tel:${tracking.driver.phone}`} className="text-green-600 hover:underline">
                {tracking.driver.phone}
              </a>
            </p>
            <p>
              <span className="font-medium">Rating:</span> ⭐ {tracking.driver.rating.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Progress Timeline */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-semibold mb-4">Delivery Timeline</h4>
        <div className="relative space-y-6">
          {statusOrder.map((status, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const update = tracking.timeline.find((u) => u.status === status);

            return (
              <div key={status} className="relative flex items-start gap-4">
                {/* Timeline Line */}
                {index < statusOrder.length - 1 && (
                  <div
                    className={`absolute left-[15px] top-[30px] w-0.5 h-12 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  />
                )}

                {/* Status Icon */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isCompleted
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : getStatusIcon(status)}
                </div>

                {/* Status Details */}
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {getStatusLabel(status)}
                    </p>
                    {isCurrent && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                        Current
                      </span>
                    )}
                  </div>

                  {update && (
                    <>
                      {update.message && (
                        <p className="text-sm text-gray-600 mb-1">{update.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {format(parseISO(update.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Updates */}
      {tracking.timeline.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-4">All Updates</h4>
          <div className="space-y-3">
            {tracking.timeline.map((update, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0"
              >
                <div className={`p-2 rounded-lg ${getStatusColor(update.status)}`}>
                  {getStatusIcon(update.status)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{getStatusLabel(update.status)}</p>
                  {update.message && <p className="text-sm text-gray-600">{update.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {format(parseISO(update.timestamp), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
