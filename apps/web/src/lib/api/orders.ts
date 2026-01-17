import { orderApi, handleApiError } from './client';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  sku?: string;
  storeId: string;
  storeName: string;
  quantity: number;
  unitPrice: number;
  attributes?: any;
}

export interface DeliveryAddress {
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  instructions?: string;
}

export interface CreateOrderData {
  userId: string;
  fulfillmentType: 'DELIVERY' | 'PICKUP' | 'CURBSIDE';
  items: OrderItem[];
  deliveryAddress?: DeliveryAddress;
  deliveryWindow?: {
    startTime: string;
    endTime: string;
  };
  customerNotes?: string;
  contactPhone?: string;
  contactEmail?: string;
  optimizationStrategy?: string;
  estimatedSavings?: number;
  paymentMethodId?: string;
}

export const ordersService = {
  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderData) {
    try {
      const response = await orderApi.post('/api/orders', data);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get all orders for a user
   */
  async getUserOrders(userId: string, limit = 50, offset = 0) {
    try {
      const response = await orderApi.get('/api/orders', {
        params: { userId, limit, offset },
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get order by ID
   */
  async getOrder(orderId: string, userId?: string) {
    try {
      const response = await orderApi.get(`/api/orders/${orderId}`, {
        params: userId ? { userId } : undefined,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string, userId?: string) {
    try {
      const response = await orderApi.get(`/api/orders/number/${orderNumber}`, {
        params: userId ? { userId } : undefined,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, userId: string, reason?: string) {
    try {
      const response = await orderApi.post(`/api/orders/${orderId}/cancel`, {
        userId,
        reason,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get order tracking information
   */
  async getOrderTracking(orderId: string, userId?: string) {
    try {
      const response = await orderApi.get(`/api/orders/${orderId}/tracking`, {
        params: userId ? { userId } : undefined,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
