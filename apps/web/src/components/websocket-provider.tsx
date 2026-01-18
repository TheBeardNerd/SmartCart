'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotificationStore } from '@/store/notification-store';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected, subscribe, unsubscribe, emit } = useWebSocket();
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    // Subscribe to notifications when connected
    if (user) {
      emit('subscribe:notifications', {});
      emit('subscribe:cart', {});
      emit('subscribe:orders', {});
      emit('subscribe:price-tracking', {});
    }

    // Handle price drop alerts (from price tracking)
    const handlePriceDrop = (data: any) => {
      console.log('💰 Price drop alert received:', data);

      addNotification({
        type: 'success',
        title: data.title || 'Price Drop Alert!',
        message: data.message,
      });
    };

    // Handle price updates
    const handlePriceUpdate = (data: any) => {
      console.log('📊 Price update received:', data);

      const percentageChange = data.percentageChange || 0;
      const changeType = percentageChange < 0 ? 'decreased' : 'increased';
      const changeAmount = Math.abs(percentageChange).toFixed(1);

      addNotification({
        type: percentageChange < 0 ? 'success' : 'info',
        title: 'Price Update',
        message: `Price ${changeType} by ${changeAmount}% at ${data.store}`,
      });
    };

    // Handle cart updates
    const handleCartUpdate = (data: any) => {
      console.log('🛒 Cart update received:', data);

      addNotification({
        type: 'info',
        title: 'Cart Synced',
        message: 'Your cart has been updated across devices',
      });
    };

    // Handle order updates
    const handleOrderUpdate = (data: any) => {
      console.log('📦 Order update received:', data);

      const statusMessages: Record<string, string> = {
        CONFIRMED: 'Your order has been confirmed!',
        PREPARING: 'Your order is being prepared',
        OUT_FOR_DELIVERY: 'Your order is out for delivery!',
        DELIVERED: 'Your order has been delivered!',
        CANCELLED: 'Your order has been cancelled',
      };

      const message = statusMessages[data.status] || `Order status: ${data.status}`;

      addNotification({
        type: data.status === 'DELIVERED' ? 'success' : 'info',
        title: `Order ${data.orderNumber}`,
        message,
      });
    };

    // Handle general notifications
    const handleNotification = (data: any) => {
      console.log('🔔 Notification received:', data);

      addNotification({
        type: data.type || 'info',
        title: data.title || 'Notification',
        message: data.message,
      });
    };

    // Handle announcements
    const handleAnnouncement = (data: any) => {
      console.log('📢 Announcement received:', data);

      addNotification({
        type: data.type || 'info',
        title: data.title,
        message: data.message,
      });
    };

    // Subscribe to events
    subscribe('price_drop', handlePriceDrop);
    subscribe('price:update', handlePriceUpdate);
    subscribe('cart:update', handleCartUpdate);
    subscribe('order:update', handleOrderUpdate);
    subscribe('notification', handleNotification);
    subscribe('announcement', handleAnnouncement);

    // Cleanup
    return () => {
      unsubscribe('price_drop', handlePriceDrop);
      unsubscribe('price:update', handlePriceUpdate);
      unsubscribe('cart:update', handleCartUpdate);
      unsubscribe('order:update', handleOrderUpdate);
      unsubscribe('notification', handleNotification);
      unsubscribe('announcement', handleAnnouncement);
    };
  }, [socket, isConnected, user, subscribe, unsubscribe, emit, addNotification]);

  return <>{children}</>;
}
