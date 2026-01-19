'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminStore } from '@/store/admin-store';
import { adminService, Permission } from '@/lib/api/admin';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Star,
  Tag,
  Truck,
  FileText,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: Permission.VIEW_ANALYTICS },
  { href: '/admin/products', label: 'Products', icon: Package, permission: Permission.VIEW_PRODUCTS },
  { href: '/admin/inventory', label: 'Inventory', icon: ShoppingCart, permission: Permission.VIEW_INVENTORY },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, permission: Permission.VIEW_ORDERS },
  { href: '/admin/users', label: 'Users', icon: Users, permission: Permission.VIEW_USERS },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, permission: Permission.VIEW_REVIEWS },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag, permission: Permission.VIEW_COUPONS },
  { href: '/admin/delivery', label: 'Delivery', icon: Truck, permission: Permission.VIEW_DELIVERY },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText, permission: Permission.VIEW_AUDIT_LOGS },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isAuthenticated, logout, hasPermission } = useAdminStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isAuthenticated, pathname, router]);

  useEffect(() => {
    // Fetch admin data on mount if authenticated
    if (isAuthenticated && !admin) {
      adminService.getCurrentAdmin().then((data) => {
        useAdminStore.getState().setAdmin(data);
      }).catch(() => {
        logout();
        router.push('/admin/login');
      });
    }
  }, [isAuthenticated, admin, logout, router]);

  const handleLogout = () => {
    adminService.logout();
    logout();
    router.push('/admin/login');
  };

  if (!isAuthenticated || !admin) {
    return null;
  }

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-green-500" />
              <span className="text-xl font-bold">SmartCart</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Admin Info */}
          <div className="px-6 py-4 border-b border-gray-800">
            <p className="text-sm text-gray-400">Logged in as</p>
            <p className="font-semibold">{admin.firstName} {admin.lastName}</p>
            <p className="text-xs text-gray-500 mt-1">{admin.email}</p>
            <span className="inline-block mt-2 px-2 py-1 bg-green-900 text-green-200 text-xs rounded">
              {admin.role.replace('_', ' ')}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-4 py-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>

            <h1 className="text-2xl font-bold text-gray-900">
              {navItems.find((item) => item.href === pathname)?.label || 'Admin'}
            </h1>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
