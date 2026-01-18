import { couponApi, handleApiError } from './client';

// TypeScript interfaces
export interface Coupon {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BOGO' | 'FREE_SHIPPING';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  store?: string;
  category?: string;
  productId?: string;
  startsAt?: string;
  expiresAt?: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'DEPLETED';
  isStackable: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    usages: number;
    savedBy: number;
  };
}

export interface UserCoupon {
  id: string;
  userId: string;
  couponId: string;
  savedAt: string;
  isNotificationEnabled: boolean;
  coupon: Coupon;
}

export interface CartItem {
  productId: string;
  store: string;
  category?: string;
  price: number;
  quantity: number;
}

export interface ApplyCouponResponse {
  coupon: {
    id: string;
    code: string;
    title: string;
    description?: string;
    discountType: string;
  };
  eligibleItems: number;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  savings: number;
}

class CouponService {
  // Get all coupons with optional filters
  async getCoupons(params?: {
    store?: string;
    category?: string;
    productId?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ coupons: Coupon[]; total: number; limit: number; offset: number }> {
    try {
      const response = await couponApi.get('/api/coupons', { params });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get featured coupons
  async getFeaturedCoupons(): Promise<Coupon[]> {
    try {
      const response = await couponApi.get('/api/coupons/featured');
      return response.data.data.coupons;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get specific coupon
  async getCoupon(id: string): Promise<Coupon> {
    try {
      const response = await couponApi.get(`/api/coupons/${id}`);
      return response.data.data.coupon;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Validate coupon code
  async validateCoupon(code: string): Promise<{ coupon: Coupon; valid: boolean; errors?: string[] }> {
    try {
      const response = await couponApi.get(`/api/coupons/validate/${code}`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Apply coupon to cart
  async applyCoupon(data: {
    code: string;
    cartItems: CartItem[];
    subtotal: number;
  }): Promise<ApplyCouponResponse> {
    try {
      const response = await couponApi.post('/api/coupons/apply', data);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get user's saved coupons
  async getMySavedCoupons(): Promise<{
    savedCoupons: UserCoupon[];
    activeCoupons: UserCoupon[];
    expiredCoupons: UserCoupon[];
    total: number;
  }> {
    try {
      const response = await couponApi.get('/api/my-coupons');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Save a coupon
  async saveCoupon(couponId: string): Promise<UserCoupon> {
    try {
      const response = await couponApi.post(`/api/my-coupons/${couponId}`);
      return response.data.data.savedCoupon;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Remove saved coupon
  async removeSavedCoupon(couponId: string): Promise<void> {
    try {
      await couponApi.delete(`/api/my-coupons/${couponId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const couponService = new CouponService();
