import { deliveryApi, handleApiError } from './client';

export enum DeliveryStatus {
  SCHEDULED = 'SCHEDULED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryPreference {
  LEAVE_AT_DOOR = 'LEAVE_AT_DOOR',
  HAND_TO_CUSTOMER = 'HAND_TO_CUSTOMER',
  SIGNATURE_REQUIRED = 'SIGNATURE_REQUIRED',
  CONCIERGE = 'CONCIERGE',
}

export enum SlotType {
  SAME_DAY = 'SAME_DAY',
  NEXT_DAY = 'NEXT_DAY',
  SCHEDULED = 'SCHEDULED',
  EXPRESS = 'EXPRESS',
}

export interface DeliverySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  slotType: SlotType;
  capacity: number;
  booked: number;
  price: number;
  available: boolean;
  availableCapacity?: number;
  isFull?: boolean;
}

export interface Delivery {
  id: string;
  orderId: string;
  userId: string;
  slotId?: string;
  driverId?: string;
  status: DeliveryStatus;
  preference: DeliveryPreference;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryInstructions?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
  slot?: DeliverySlot;
  driver?: Driver;
  updates?: DeliveryUpdate[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  rating: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface DeliveryUpdate {
  id: string;
  status: DeliveryStatus;
  message?: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface TrackingInfo {
  id: string;
  orderId: string;
  status: DeliveryStatus;
  estimatedDelivery?: string;
  actualDelivery?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  driver?: {
    name: string;
    phone: string;
    vehicleType: string;
    rating: number;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  timeline: DeliveryUpdate[];
}

export interface ScheduleDeliveryInput {
  orderId: string;
  slotId?: string;
  preference: DeliveryPreference;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryInstructions?: string;
}

class DeliveryService {
  // Get available delivery slots
  async getAvailableSlots(date?: string): Promise<DeliverySlot[]> {
    try {
      const params = date ? { date } : {};
      const response = await deliveryApi.get('/api/delivery/slots', { params });
      return response.data.data.slots;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Schedule a delivery (authenticated)
  async scheduleDelivery(input: ScheduleDeliveryInput): Promise<Delivery> {
    try {
      const response = await deliveryApi.post('/api/delivery/schedule', input);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get delivery by ID (authenticated)
  async getDelivery(deliveryId: string): Promise<Delivery> {
    try {
      const response = await deliveryApi.get(`/api/delivery/delivery/${deliveryId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get delivery by order ID (authenticated)
  async getDeliveryByOrderId(orderId: string): Promise<Delivery> {
    try {
      const response = await deliveryApi.get(`/api/delivery/order/${orderId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get user's deliveries (authenticated)
  async getUserDeliveries(): Promise<Delivery[]> {
    try {
      const response = await deliveryApi.get('/api/delivery/my-deliveries');
      return response.data.data.deliveries;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Update delivery preferences (authenticated)
  async updatePreferences(
    deliveryId: string,
    preference: DeliveryPreference,
    instructions?: string
  ): Promise<Delivery> {
    try {
      const response = await deliveryApi.put(`/api/delivery/delivery/${deliveryId}/preferences`, {
        preference,
        instructions,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get delivery tracking info
  async getTrackingInfo(deliveryId: string): Promise<TrackingInfo> {
    try {
      const response = await deliveryApi.get(`/api/delivery/track/${deliveryId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Simulate delivery progress (for development/testing)
  async simulateDeliveryProgress(deliveryId: string): Promise<void> {
    try {
      await deliveryApi.post(`/api/delivery/delivery/${deliveryId}/simulate`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Generate delivery slots (admin)
  async generateSlots(daysAhead?: number): Promise<void> {
    try {
      await deliveryApi.post('/api/delivery/slots/generate', { daysAhead });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const deliveryService = new DeliveryService();
