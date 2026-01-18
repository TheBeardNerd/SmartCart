'use client';

import { useState, useEffect } from 'react';
import { inventoryService, StockInfo } from '@/lib/api/inventory';
import { Package, AlertTriangle, XCircle, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

interface StockIndicatorProps {
  productId: string;
  productName: string;
  store: string;
  variant?: 'badge' | 'detailed';
}

export function StockIndicator({ productId, store, productName, variant = 'badge' }: StockIndicatorProps) {
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    loadStockInfo();
  }, [productId, store]);

  const loadStockInfo = async () => {
    try {
      setLoading(true);
      const info = await inventoryService.getStock(productId, store);
      setStockInfo(info);
    } catch (error) {
      console.error('Failed to load stock info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyMe = async () => {
    if (!isAuthenticated || !user?.email) {
      alert('Please login to subscribe to stock notifications');
      return;
    }

    try {
      setNotifying(true);
      await inventoryService.subscribeToStockNotification(productId, store, user.email);
      alert('You will be notified when this item is back in stock!');
    } catch (error) {
      console.error('Failed to subscribe to notification:', error);
      alert('Failed to subscribe to notification. Please try again.');
    } finally {
      setNotifying(false);
    }
  };

  if (loading) {
    return (
      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded animate-pulse">
        Loading...
      </span>
    );
  }

  if (!stockInfo) {
    return (
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
        Stock Unknown
      </span>
    );
  }

  const getStockColor = () => {
    switch (stockInfo.status) {
      case 'IN_STOCK':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'LOW_STOCK':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStockIcon = () => {
    switch (stockInfo.status) {
      case 'IN_STOCK':
        return <Package className="w-3 h-3" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="w-3 h-3" />;
      case 'OUT_OF_STOCK':
        return <XCircle className="w-3 h-3" />;
      default:
        return <Package className="w-3 h-3" />;
    }
  };

  const getStockText = () => {
    switch (stockInfo.status) {
      case 'IN_STOCK':
        return `In Stock (${stockInfo.available})`;
      case 'LOW_STOCK':
        return `Only ${stockInfo.available} left`;
      case 'OUT_OF_STOCK':
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  };

  if (variant === 'badge') {
    return (
      <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${getStockColor()}`}>
        {getStockIcon()}
        {getStockText()}
      </span>
    );
  }

  // Detailed variant with notify button for out of stock
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${getStockColor()}`}>
        {getStockIcon()}
        {getStockText()}
      </span>
      {stockInfo.status === 'OUT_OF_STOCK' && (
        <button
          onClick={handleNotifyMe}
          disabled={notifying}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition flex items-center gap-1 disabled:opacity-50"
          title="Get notified when back in stock"
        >
          <Bell className="w-3 h-3" />
          {notifying ? 'Subscribing...' : 'Notify Me'}
        </button>
      )}
    </div>
  );
}
