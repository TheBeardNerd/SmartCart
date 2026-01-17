import { userApi, handleApiError } from './client';

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: string;
  cardLast4?: string;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface CreateAddressData {
  label: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface CreatePaymentMethodData {
  type: string;
  cardNumber: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  isDefault?: boolean;
}

export const userService = {
  /**
   * Get user profile
   */
  async getProfile() {
    try {
      const response = await userApi.get('/api/users/profile');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData) {
    try {
      const response = await userApi.put('/api/users/profile', data);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get all addresses for user
   */
  async getAddresses(): Promise<Address[]> {
    try {
      const response = await userApi.get('/api/users/addresses');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Create new address
   */
  async createAddress(data: CreateAddressData): Promise<Address> {
    try {
      const response = await userApi.post('/api/users/addresses', data);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update address
   */
  async updateAddress(id: string, data: Partial<CreateAddressData>): Promise<Address> {
    try {
      const response = await userApi.put(`/api/users/addresses/${id}`, data);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Delete address
   */
  async deleteAddress(id: string): Promise<void> {
    try {
      await userApi.delete(`/api/users/addresses/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get all payment methods for user
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await userApi.get('/api/users/payment-methods');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Create new payment method
   */
  async createPaymentMethod(data: CreatePaymentMethodData): Promise<PaymentMethod> {
    try {
      const response = await userApi.post('/api/users/payment-methods', data);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Delete payment method
   */
  async deletePaymentMethod(id: string): Promise<void> {
    try {
      await userApi.delete(`/api/users/payment-methods/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string) {
    try {
      const response = await userApi.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
