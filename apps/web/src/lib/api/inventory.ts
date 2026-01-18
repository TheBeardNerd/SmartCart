import { inventoryApi, handleApiError } from './client';

export interface StockInfo {
  productId: string;
  store: string;
  available: number;
  total: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface StockCheckResult {
  productId: string;
  store: string;
  requested: number;
  available: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  inStock: boolean;
}

export interface StockReservation {
  id: string;
  inventoryId: string;
  userId: string;
  orderId?: string;
  quantity: number;
  status: 'ACTIVE' | 'RELEASED' | 'COMPLETED';
  expiresAt: string;
  createdAt: string;
}

export interface ReservationResult {
  reservations: StockReservation[];
  expiresAt: string;
}

export interface LowStockProduct {
  id: string;
  productId: string;
  productName: string;
  store: string;
  quantity: number;
  status: 'LOW_STOCK' | 'OUT_OF_STOCK';
}

class InventoryService {
  // Get stock level for a single product
  async getStock(productId: string, store: string): Promise<StockInfo> {
    try {
      const response = await inventoryApi.get('/api/inventory/stock', {
        params: { productId, store },
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Check stock for multiple items (cart validation)
  async checkStockBatch(items: Array<{ productId: string; store: string; quantity: number }>): Promise<StockCheckResult[]> {
    try {
      const response = await inventoryApi.post('/api/inventory/stock/check', { items });
      return response.data.data.results;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Reserve stock during checkout (authenticated)
  async reserveStock(
    items: Array<{ productId: string; store: string; quantity: number }>,
    orderId?: string
  ): Promise<ReservationResult> {
    try {
      const response = await inventoryApi.post('/api/inventory/stock/reserve', {
        items,
        orderId,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Release reservation (cancel checkout)
  async releaseReservation(reservationId: string): Promise<void> {
    try {
      await inventoryApi.post(`/api/inventory/stock/release/${reservationId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Complete reservation (order placed)
  async completeReservation(reservationId: string): Promise<void> {
    try {
      await inventoryApi.post(`/api/inventory/stock/complete/${reservationId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Subscribe to back-in-stock notifications (authenticated)
  async subscribeToStockNotification(productId: string, store: string, email: string): Promise<void> {
    try {
      await inventoryApi.post('/api/inventory/stock/notify', {
        productId,
        store,
        email,
      });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get low stock products
  async getLowStockProducts(store?: string): Promise<LowStockProduct[]> {
    try {
      const response = await inventoryApi.get('/api/inventory/stock/low', {
        params: store ? { store } : {},
      });
      return response.data.data.products;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const inventoryService = new InventoryService();
