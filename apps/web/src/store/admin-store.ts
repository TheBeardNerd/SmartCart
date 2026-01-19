import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminUser, Permission } from '@/lib/api/admin';

interface AdminStore {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  setAdmin: (admin: AdminUser | null) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (...permissions: Permission[]) => boolean;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,

      setAdmin: (admin) =>
        set({
          admin,
          isAuthenticated: !!admin,
        }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('adminToken');
        }
        set({
          admin: null,
          isAuthenticated: false,
        });
      },

      hasPermission: (permission) => {
        const { admin } = get();
        if (!admin) return false;
        if (admin.role === 'SUPER_ADMIN') return true;
        return admin.permissions.includes(permission);
      },

      hasAnyPermission: (...permissions) => {
        const { admin } = get();
        if (!admin) return false;
        if (admin.role === 'SUPER_ADMIN') return true;
        return permissions.some((perm) => admin.permissions.includes(perm));
      },
    }),
    {
      name: 'admin-storage',
    }
  )
);
