'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { userService } from '@/lib/api/user';
import { useAuthStore } from '@/store/auth-store';

interface PriceTrackingButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    store: string;
    imageUrl?: string;
    category?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'full';
  onToggle?: (isTracking: boolean) => void;
}

export function PriceTrackingButton({
  product,
  size = 'md',
  variant = 'full',
  onToggle,
}: PriceTrackingButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const [isTracking, setIsTracking] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [targetPrice, setTargetPrice] = useState<number | undefined>();
  const [priceDropPercent, setPriceDropPercent] = useState(10);

  // Check if product is already being tracked
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTracking = async () => {
      try {
        const result = await userService.checkPriceTracking(product.id, product.store);
        setIsTracking(result.isTracking);
        if (result.tracking) {
          setTrackingId(result.tracking.id);
          setTargetPrice(result.tracking.targetPrice || undefined);
          setPriceDropPercent(result.tracking.priceDropPercent || 10);
        }
      } catch (error) {
        console.error('Error checking tracking status:', error);
      }
    };

    checkTracking();
  }, [isAuthenticated, product.id, product.store]);

  const handleToggleTracking = async () => {
    if (!isAuthenticated) {
      alert('Please login to track prices');
      return;
    }

    setIsLoading(true);
    try {
      if (isTracking && trackingId) {
        // Unsubscribe
        await userService.deletePriceTracking(trackingId);
        setIsTracking(false);
        setTrackingId(null);
        onToggle?.(false);
      } else {
        // Subscribe
        const tracking = await userService.subscribeToPriceDrop({
          productId: product.id,
          productName: product.name,
          store: product.store,
          currentPrice: product.price,
          targetPrice,
          priceDropPercent,
          imageUrl: product.imageUrl,
          category: product.category,
        });
        setIsTracking(true);
        setTrackingId(tracking.id);
        onToggle?.(true);
        setShowSettings(false);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update price tracking');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleTracking}
        disabled={isLoading}
        className={`${sizeClasses[size]} rounded-lg border transition disabled:opacity-50 ${
          isTracking
            ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
        title={isTracking ? 'Stop tracking price' : 'Track price drops'}
      >
        {isLoading ? (
          <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
        ) : isTracking ? (
          <Bell className={iconSizeClasses[size]} />
        ) : (
          <BellOff className={iconSizeClasses[size]} />
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => (isTracking ? handleToggleTracking() : setShowSettings(!showSettings))}
        disabled={isLoading}
        className={`${sizeClasses[size]} rounded-lg border font-semibold transition disabled:opacity-50 flex items-center gap-2 ${
          isTracking
            ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        {isLoading ? (
          <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
        ) : isTracking ? (
          <Bell className={iconSizeClasses[size]} />
        ) : (
          <BellOff className={iconSizeClasses[size]} />
        )}
        {isTracking ? 'Tracking' : 'Track Price'}
      </button>

      {/* Settings Dropdown for new tracking */}
      {showSettings && !isTracking && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
          <h4 className="font-semibold mb-3">Price Drop Alert Settings</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Notify me when price drops by:
              </label>
              <select
                value={priceDropPercent}
                onChange={(e) => setPriceDropPercent(Number(e.target.value))}
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
              <label className="block text-sm text-gray-600 mb-1">
                Or when price reaches (optional):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={product.price}
                  value={targetPrice || ''}
                  onChange={(e) => setTargetPrice(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={(product.price * 0.9).toFixed(2)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current price: ${product.price.toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleToggleTracking}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {isLoading ? 'Subscribing...' : 'Start Tracking'}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
