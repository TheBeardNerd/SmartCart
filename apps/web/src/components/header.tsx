'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ShoppingCart, User, LogOut, Package, Menu, X, Wifi, WifiOff, Bell } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { isConnected } = useWebSocket();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const itemCount = getItemCount();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-green-600">
            SmartCart
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-green-600 font-medium"
            >
              Home
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/orders"
                  className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Orders
                </Link>

                <Link
                  href="/cart"
                  className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2 relative"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Cart
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/price-tracking"
                  className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Price Alerts
                </Link>

                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {/* WebSocket Status */}
                {isAuthenticated && (
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                      isConnected
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                    title={isConnected ? 'Real-time updates active' : 'Connecting...'}
                  >
                    {isConnected ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">
                      {isConnected ? 'Live' : 'Offline'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-700 hover:text-red-600 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-green-600 font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-green-600 font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    href="/orders"
                    className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Package className="w-4 h-4" />
                    Orders
                  </Link>

                  <Link
                    href="/cart"
                    className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Cart
                    {itemCount > 0 && (
                      <span className="bg-green-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {itemCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/price-tracking"
                    className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Bell className="w-4 h-4" />
                    Price Alerts
                  </Link>

                  <Link
                    href="/profile"
                    className="text-gray-700 hover:text-green-600 font-medium flex items-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>

                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 text-gray-700 hover:text-red-600 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-green-600 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
