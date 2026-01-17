import { create } from 'zustand';
import { authService } from '@/lib/api/auth';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  login: async (email, password) => {
    try {
      const authData = await authService.login({ email, password });
      set({
        user: authData.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    try {
      const authData = await authService.register(data);
      set({
        user: authData.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initAuth: () => {
    const user = authService.getStoredUser();
    const isAuthenticated = authService.isAuthenticated();

    set({
      user,
      isAuthenticated,
      isLoading: false,
    });
  },
}));
