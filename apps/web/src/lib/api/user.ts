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

export interface PriceTracking {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  store: string;
  initialPrice: number;
  currentPrice: number;
  targetPrice?: number;
  priceDropPercent?: number;
  imageUrl?: string;
  category?: string;
  isActive: boolean;
  notified: boolean;
  lastChecked: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeToPriceDropData {
  productId: string;
  productName: string;
  store: string;
  currentPrice: number;
  targetPrice?: number;
  priceDropPercent?: number;
  imageUrl?: string;
  category?: string;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  items?: ShoppingListItem[];
  totalItems?: number;
  checkedItems?: number;
  completionPercentage?: number;
}

export interface ShoppingListItem {
  id: string;
  listId: string;
  productId: string;
  productName: string;
  store: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  quantity: number;
  checked: boolean;
  notes?: string;
  addedAt: string;
}

export interface CreateShoppingListData {
  name: string;
  description?: string;
  isDefault?: boolean;
  color?: string;
  icon?: string;
}

export interface AddListItemData {
  productId: string;
  productName: string;
  store: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  quantity?: number;
  notes?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  store: string;
  price: number;
  imageUrl?: string;
  category?: string;
  addedAt: string;
}

export interface AddFavoriteData {
  productId: string;
  productName: string;
  store: string;
  price: number;
  imageUrl?: string;
  category?: string;
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

  /**
   * Get all price tracking subscriptions
   */
  async getPriceTrackings(): Promise<PriceTracking[]> {
    try {
      const response = await userApi.get('/api/price-tracking');
      return response.data.data.trackings;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Subscribe to price drop notifications
   */
  async subscribeToPriceDrop(data: SubscribeToPriceDropData): Promise<PriceTracking> {
    try {
      const response = await userApi.post('/api/price-tracking', data);
      return response.data.data.tracking;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get price tracking by ID
   */
  async getPriceTracking(id: string): Promise<PriceTracking> {
    try {
      const response = await userApi.get(`/api/price-tracking/${id}`);
      return response.data.data.tracking;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update price tracking
   */
  async updatePriceTracking(
    id: string,
    data: Partial<Pick<PriceTracking, 'targetPrice' | 'priceDropPercent' | 'isActive'>>
  ): Promise<PriceTracking> {
    try {
      const response = await userApi.patch(`/api/price-tracking/${id}`, data);
      return response.data.data.tracking;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Delete price tracking subscription
   */
  async deletePriceTracking(id: string): Promise<void> {
    try {
      await userApi.delete(`/api/price-tracking/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Check if a product is being tracked
   */
  async checkPriceTracking(productId: string, store?: string): Promise<{ isTracking: boolean; tracking: PriceTracking | null }> {
    try {
      const params = store ? { store } : {};
      const response = await userApi.get(`/api/price-tracking/product/${productId}`, { params });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // ============ Shopping Lists ============

  /**
   * Get all shopping lists
   */
  async getShoppingLists(): Promise<ShoppingList[]> {
    try {
      const response = await userApi.get('/api/shopping-lists');
      return response.data.data.lists;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Create a new shopping list
   */
  async createShoppingList(data: CreateShoppingListData): Promise<ShoppingList> {
    try {
      const response = await userApi.post('/api/shopping-lists', data);
      return response.data.data.list;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get a specific shopping list
   */
  async getShoppingList(id: string): Promise<ShoppingList> {
    try {
      const response = await userApi.get(`/api/shopping-lists/${id}`);
      return response.data.data.list;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update a shopping list
   */
  async updateShoppingList(id: string, data: Partial<CreateShoppingListData>): Promise<ShoppingList> {
    try {
      const response = await userApi.patch(`/api/shopping-lists/${id}`, data);
      return response.data.data.list;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Delete a shopping list
   */
  async deleteShoppingList(id: string): Promise<void> {
    try {
      await userApi.delete(`/api/shopping-lists/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Add item to shopping list
   */
  async addItemToList(listId: string, data: AddListItemData): Promise<ShoppingListItem> {
    try {
      const response = await userApi.post(`/api/shopping-lists/${listId}/items`, data);
      return response.data.data.item;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update shopping list item
   */
  async updateListItem(
    listId: string,
    itemId: string,
    data: Partial<Pick<ShoppingListItem, 'quantity' | 'checked' | 'notes'>>
  ): Promise<ShoppingListItem> {
    try {
      const response = await userApi.patch(`/api/shopping-lists/${listId}/items/${itemId}`, data);
      return response.data.data.item;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Delete shopping list item
   */
  async deleteListItem(listId: string, itemId: string): Promise<void> {
    try {
      await userApi.delete(`/api/shopping-lists/${listId}/items/${itemId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Clear all checked items from list
   */
  async clearCheckedItems(listId: string): Promise<{ deletedCount: number }> {
    try {
      const response = await userApi.post(`/api/shopping-lists/${listId}/clear-checked`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // ============ Favorites ============

  /**
   * Get all favorites
   */
  async getFavorites(): Promise<Favorite[]> {
    try {
      const response = await userApi.get('/api/favorites');
      return response.data.data.favorites;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Add to favorites
   */
  async addFavorite(data: AddFavoriteData): Promise<Favorite> {
    try {
      const response = await userApi.post('/api/favorites', data);
      return response.data.data.favorite;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Remove from favorites
   */
  async deleteFavorite(id: string): Promise<void> {
    try {
      await userApi.delete(`/api/favorites/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Check if a product is favorited
   */
  async checkFavorite(productId: string, store?: string): Promise<{ isFavorite: boolean; favorite: Favorite | null }> {
    try {
      const params = store ? { store } : {};
      const response = await userApi.get(`/api/favorites/check/${productId}`, { params });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
