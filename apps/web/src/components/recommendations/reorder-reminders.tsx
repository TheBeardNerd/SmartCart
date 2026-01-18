'use client';

import { useState, useEffect } from 'react';
import { recommendationService, ReorderPrediction } from '@/lib/api/recommendations';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { Clock, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ReorderReminders() {
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const [predictions, setPredictions] = useState<ReorderPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadPredictions();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await recommendationService.getReorderPredictions();
      setPredictions(data);
    } catch (error) {
      console.error('Failed to load reorder predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (prediction: ReorderPrediction) => {
    addItem({
      productId: prediction.productId,
      name: prediction.productName,
      price: prediction.lastPrice,
      store: prediction.store,
      quantity: 1,
      imageUrl: prediction.imageUrl,
    });
  };

  const getUrgencyColor = (nextDate: string) => {
    const daysUntil = (new Date(nextDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysUntil < 0) return 'bg-red-100 text-red-700 border-red-200';
    if (daysUntil <= 3) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  if (!isAuthenticated || (!loading && predictions.length === 0)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Time to Reorder</h2>
        {predictions.length > 0 && (
          <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            {predictions.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg p-4">
              <div className="flex gap-4">
                <div className="bg-gray-200 w-20 h-20 rounded-md"></div>
                <div className="flex-1">
                  <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded w-1/2 mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {predictions.map((prediction, index) => {
            const daysUntil = Math.round(
              (new Date(prediction.nextPredictedDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={index}
                className="bg-white rounded-lg p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {prediction.imageUrl ? (
                    <img
                      src={prediction.imageUrl}
                      alt={prediction.productName}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{prediction.productName}</h3>
                    <p className="text-sm text-gray-600 mb-2">{prediction.store}</p>

                    <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                      <span className={`px-2 py-1 rounded-md border ${getUrgencyColor(prediction.nextPredictedDate)}`}>
                        {daysUntil < 0
                          ? `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`
                          : daysUntil === 0
                          ? 'Due today'
                          : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
                        }
                      </span>
                      <span className="text-gray-600">
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        Every {prediction.frequency} days
                      </span>
                      <span className="text-gray-600">
                        {Math.round(prediction.confidence * 100)}% confidence
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Last: {formatDistanceToNow(new Date(prediction.lastPurchased), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          ${prediction.lastPrice.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleReorder(prediction)}
                          className="bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 text-sm"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Reorder
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
