'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { userService, PriceTracking } from '@/lib/api/user';
import {
  Bell,
  Trash2,
  TrendingDown,
  TrendingUp,
  Loader2,
  Settings,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function PriceTrackingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [trackings, setTrackings] = useState<PriceTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    targetPrice: 0,
    priceDropPercent: 10,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadTrackings();
  }, [isAuthenticated, router]);

  const loadTrackings = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getPriceTrackings();
      setTrackings(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load price trackings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this product?')) {
      return;
    }

    try {
      await userService.deletePriceTracking(id);
      await loadTrackings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete price tracking');
    }
  };

  const handleEdit = (tracking: PriceTracking) => {
    setEditingId(tracking.id);
    setEditForm({
      targetPrice: tracking.targetPrice || 0,
      priceDropPercent: tracking.priceDropPercent || 10,
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      await userService.updatePriceTracking(id, {
        targetPrice: editForm.targetPrice || undefined,
        priceDropPercent: editForm.priceDropPercent,
      });
      setEditingId(null);
      await loadTrackings();
    } catch (err: any) {
      alert(err.message || 'Failed to update price tracking');
    }
  };

  const getPriceChange = (tracking: PriceTracking) => {
    const initial = Number(tracking.initialPrice);
    const current = Number(tracking.currentPrice);
    const change = ((current - initial) / initial) * 100;
    return change;
  };

  const getPriceDifference = (tracking: PriceTracking) => {
    const initial = Number(tracking.initialPrice);
    const current = Number(tracking.currentPrice);
    return current - initial;
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-green-600" />
            Price Tracking
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor your favorite products and get notified when prices drop
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {trackings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No products tracked yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start tracking products from the search page to get price drop alerts
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {trackings.map((tracking) => {
              const priceChange = getPriceChange(tracking);
              const priceDiff = getPriceDifference(tracking);
              const isDropped = priceChange < 0;
              const isEditing = editingId === tracking.id;

              return (
                <div
                  key={tracking.id}
                  className={`bg-white rounded-lg shadow-sm p-6 border-2 transition ${
                    tracking.notified
                      ? 'border-green-500 bg-green-50'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    {tracking.imageUrl && (
                      <img
                        src={tracking.imageUrl}
                        alt={tracking.productName}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">
                        {tracking.productName}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {tracking.store}
                        </span>
                        {tracking.category && (
                          <span className="text-xs text-gray-600">
                            {tracking.category}
                          </span>
                        )}
                      </div>

                      {/* Price Information */}
                      <div className="flex items-center gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600">Initial Price</p>
                          <p className="text-lg font-semibold">
                            ${Number(tracking.initialPrice).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isDropped ? (
                            <TrendingDown className="w-5 h-5 text-green-600" />
                          ) : priceDiff > 0 ? (
                            <TrendingUp className="w-5 h-5 text-red-600" />
                          ) : null}
                          <div>
                            <p className="text-xs text-gray-600">Current Price</p>
                            <p className="text-lg font-semibold">
                              ${Number(tracking.currentPrice).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {priceDiff !== 0 && (
                          <div
                            className={`px-3 py-1 rounded-lg ${
                              isDropped
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <p className="text-sm font-semibold">
                              {isDropped ? '' : '+'}${priceDiff.toFixed(2)} (
                              {priceChange.toFixed(1)}%)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tracking Settings */}
                      {!isEditing ? (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div>
                            Alert at:{' '}
                            <span className="font-semibold">
                              {tracking.priceDropPercent || 10}% drop
                            </span>
                          </div>
                          {tracking.targetPrice && (
                            <div>
                              or{' '}
                              <span className="font-semibold">
                                ${Number(tracking.targetPrice).toFixed(2)}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => handleEdit(tracking)}
                            className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                          >
                            <Settings className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Price Drop Percent
                              </label>
                              <select
                                value={editForm.priceDropPercent}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    priceDropPercent: Number(e.target.value),
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value={5}>5% or more</option>
                                <option value={10}>10% or more</option>
                                <option value={15}>15% or more</option>
                                <option value={20}>20% or more</option>
                                <option value={25}>25% or more</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Target Price (optional)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.targetPrice || ''}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      targetPrice: e.target.value
                                        ? Number(e.target.value)
                                        : 0,
                                    })
                                  }
                                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(tracking.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notification Badge & Actions */}
                    <div className="flex flex-col items-end gap-2">
                      {tracking.notified && (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-sm font-semibold">
                          <CheckCircle className="w-4 h-4" />
                          Price Dropped!
                        </div>
                      )}
                      <button
                        onClick={() => handleDelete(tracking.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Stop tracking"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <p className="text-xs text-gray-500 text-right mt-auto">
                        Tracking since{' '}
                        {new Date(tracking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
