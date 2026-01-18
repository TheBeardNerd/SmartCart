import axios from 'axios';

// API Base URLs
const CATALOG_SERVICE_URL = process.env.NEXT_PUBLIC_CATALOG_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3002';
const ORDER_SERVICE_URL = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || 'http://localhost:3003';
const NOTIFICATION_SERVICE_URL = process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const COUPON_SERVICE_URL = process.env.NEXT_PUBLIC_COUPON_SERVICE_URL || 'http://localhost:3005';
const RECOMMENDATION_SERVICE_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL || 'http://localhost:3006';
const INVENTORY_SERVICE_URL = process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL || 'http://localhost:3007';
const DELIVERY_SERVICE_URL = process.env.NEXT_PUBLIC_DELIVERY_SERVICE_URL || 'http://localhost:3008';
const OPTIMIZATION_SERVICE_URL = process.env.NEXT_PUBLIC_OPTIMIZATION_SERVICE_URL || 'http://localhost:3009';

// Create axios instances for each service
export const catalogApi = axios.create({
  baseURL: CATALOG_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userApi = axios.create({
  baseURL: USER_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const orderApi = axios.create({
  baseURL: ORDER_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const notificationApi = axios.create({
  baseURL: NOTIFICATION_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const couponApi = axios.create({
  baseURL: COUPON_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const recommendationApi = axios.create({
  baseURL: RECOMMENDATION_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const inventoryApi = axios.create({
  baseURL: INVENTORY_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const deliveryApi = axios.create({
  baseURL: DELIVERY_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const optimizationApi = axios.create({
  baseURL: OPTIMIZATION_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
const addAuthInterceptor = (api: typeof axios) => {
  api.interceptors.request.use(
    (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

// Response interceptor to handle token refresh
const addResponseInterceptor = (api: typeof axios) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and not already retried, try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (typeof window !== 'undefined') {
          const refreshToken = localStorage.getItem('refreshToken');

          if (refreshToken) {
            try {
              const response = await userApi.post('/api/auth/refresh', {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data.data;

              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            } catch (refreshError) {
              // Refresh failed, clear tokens and redirect to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
              return Promise.reject(refreshError);
            }
          }
        }
      }

      return Promise.reject(error);
    }
  );
};

// Add interceptors to all APIs
[catalogApi, userApi, orderApi, notificationApi, couponApi, recommendationApi, inventoryApi, deliveryApi, optimizationApi].forEach((api) => {
  addAuthInterceptor(api);
  addResponseInterceptor(api);
});

// Helper to handle API errors
export function handleApiError(error: any): string {
  if (error.response) {
    return error.response.data?.message || error.response.data?.error || 'An error occurred';
  } else if (error.request) {
    return 'No response from server. Please check your connection.';
  } else {
    return error.message || 'An unexpected error occurred';
  }
}
