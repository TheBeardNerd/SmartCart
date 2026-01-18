'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { optimizationService, OptimizationMode, OptimizationResult } from '@/lib/api/optimization';
import { inventoryService, StockCheckResult } from '@/lib/api/inventory';
import { OptimizationControls } from '@/components/optimization-controls';
import { CartBreakdown } from '@/components/cart-breakdown';
import { SavingsCalculator } from '@/components/savings-calculator';
import { Trash2, ShoppingCart, AlertTriangle, Loader2 } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getSubtotal, setOptimizationResult, setSelectedStrategy } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<OptimizationMode>('price');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [stockChecks, setStockChecks] = useState<StockCheckResult[]>([]);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const subtotal = getSubtotal();

  // Auto-optimize cart when items or mode changes
  useEffect(() => {
    if (items.length > 0) {
      handleOptimize();
      checkStock();
    } else {
      setOptimization(null);
      setStockChecks([]);
    }
  }, [items, selectedMode]);

  const handleOptimize = async () => {
    if (items.length === 0) return;

    setIsOptimizing(true);
    try {
      const cartItems = items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        price: item.unitPrice,
        store: item.storeName,
        quantity: item.quantity,
        imageUrl: item.productImage,
      }));

      const result = await optimizationService.optimizeCart(cartItems, selectedMode);
      setOptimization(result);
      setOptimizationResult(result);
      setSelectedStrategy(selectedMode);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const checkStock = async () => {
    if (items.length === 0) return;

    setIsCheckingStock(true);
    setStockError(null);
    try {
      const stockItems = items.map((item) => ({
        productId: item.productId,
        store: item.storeName,
        quantity: item.quantity,
      }));

      const results = await inventoryService.checkStockBatch(stockItems);
      setStockChecks(results);
    } catch (error: any) {
      console.error('Stock check failed:', error);
      setStockError(error.message);
    } finally {
      setIsCheckingStock(false);
    }
  };

  const handleModeChange = (mode: OptimizationMode) => {
    setSelectedMode(mode);
  };

  const getStockStatus = (productId: string) => {
    return stockChecks.find((check) => check.productId === productId);
  };

  const hasStockIssues = stockChecks.some((check) => !check.inStock);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }

    // Final stock check before checkout
    await checkStock();

    if (hasStockIssues) {
      alert('Some items in your cart are out of stock. Please review your cart.');
      return;
    }

    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Your cart is empty</h2>
            <p className="mt-2 text-gray-600">Start shopping to add items to your cart</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        {/* Stock Error Alert */}
        {stockError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-semibold">Stock Check Failed</p>
            </div>
            <p className="text-sm mt-1">{stockError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Cart Items */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Items ({items.length})</h2>

                {isCheckingStock && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking stock availability...</span>
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((item) => {
                    const stockStatus = getStockStatus(item.productId);
                    const hasStockIssue = stockStatus && !stockStatus.inStock;

                    return (
                      <div
                        key={`${item.productId}-${item.storeId}`}
                        className={`flex items-center gap-4 py-4 border-b last:border-b-0 ${
                          hasStockIssue ? 'bg-red-50 -mx-4 px-4 rounded' : ''
                        }`}
                      >
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                        )}

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                          <p className="text-sm text-gray-600">Store: {item.storeName}</p>
                          <p className="text-lg font-bold text-green-600 mt-1">
                            ${item.unitPrice.toFixed(2)}
                          </p>

                          {/* Stock Warning */}
                          {hasStockIssue && (
                            <div className="flex items-center gap-1 mt-2 text-red-600 text-sm font-medium">
                              <AlertTriangle className="w-4 h-4" />
                              <span>
                                Only {stockStatus.available} available (requested {stockStatus.requested})
                              </span>
                            </div>
                          )}
                          {stockStatus && stockStatus.status === 'LOW_STOCK' && stockStatus.inStock && (
                            <div className="flex items-center gap-1 mt-2 text-orange-600 text-sm">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Low stock - only {stockStatus.available} left</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            disabled={stockStatus && item.quantity >= stockStatus.available}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                        </div>

                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Optimization Controls */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <OptimizationControls
                selectedMode={selectedMode}
                onModeChange={handleModeChange}
                disabled={isOptimizing}
              />
            </div>

            {/* Cart Breakdown by Store */}
            {optimization && optimization.storeGroups.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <CartBreakdown storeGroups={optimization.storeGroups} showDeliveryFees={true} />
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Savings Calculator */}
            <SavingsCalculator optimization={optimization} loading={isOptimizing} />

            {/* Checkout Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <button
                onClick={handleCheckout}
                disabled={hasStockIssues || isCheckingStock || items.length === 0}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {hasStockIssues ? 'Stock Issues - Cannot Checkout' : 'Proceed to Checkout'}
              </button>

              {hasStockIssues && (
                <p className="text-sm text-red-600 mt-3 text-center">
                  Please adjust quantities or remove out-of-stock items
                </p>
              )}

              {!isAuthenticated && (
                <p className="text-sm text-gray-600 mt-3 text-center">
                  You'll need to sign in to complete your order
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
