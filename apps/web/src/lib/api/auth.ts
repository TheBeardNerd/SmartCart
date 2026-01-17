import { userApi, handleApiError } from './client';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await userApi.post('/api/auth/register', data);
      const authData = response.data.data;

      // Store tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('refreshToken', authData.refreshToken);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }

      return authData;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await userApi.post('/api/auth/login', data);
      const authData = response.data.data;

      // Store tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('refreshToken', authData.refreshToken);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }

      return authData;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await userApi.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const response = await userApi.get('/api/auth/me');
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('accessToken');
    }
    return false;
  },
};
