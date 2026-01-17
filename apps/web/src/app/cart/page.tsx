'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { optimizationService } from '@/lib/api/optimization';
import { Trash2, ShoppingCart, TrendingDown } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getSubtotal, setOptimizationResult, setSelectedStrategy } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [comparisons, setComparisons] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedStrategyLocal, setSelectedStrategyLocal] = useState<string | null>(null);

  const subtotal = getSubtotal();

  const handleOptimize = async () => {
    if (items.length === 0) return;

    setIsOptimizing(true);
    try {
      const cart = items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
      }));

      const result = await optimizationService.compareStrategies(cart, user?.id);
      setComparisons(result);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSelectStrategy = (strategyType: string, result: any) => {
    setSelectedStrategyLocal(strategyType);
    setSelectedStrategy(strategyType);
    setOptimizationResult(result);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Items ({items.length})</h2>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.storeId}`}
                      className="flex items-center gap-4 py-4 border-b last:border-b-0"
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
                  ))}
                </div>
              </div>
            </div>

            {/* Optimization Button */}
            <div className="mt-6">
              <button
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
              >
                <TrendingDown className="w-6 h-6" />
                {isOptimizing ? 'Optimizing...' : 'Compare Optimization Strategies'}
              </button>
            </div>
          </div>

          {/* Cart Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (est.)</span>
                  <span className="font-semibold">${(subtotal * 0.08).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-semibold">
                    {subtotal >= 35 ? 'FREE' : '$4.99'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="font-semibold">$2.99</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>
                    ${(
                      subtotal +
                      subtotal * 0.08 +
                      (subtotal >= 35 ? 0 : 4.99) +
                      2.99
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
              >
                Proceed to Checkout
              </button>

              {!isAuthenticated && (
                <p className="text-sm text-gray-600 mt-3 text-center">
                  You'll need to sign in to complete your order
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Optimization Comparisons */}
        {comparisons && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Optimization Strategies</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(comparisons).map(([strategyType, result]: [string, any]) => (
                <div
                  key={strategyType}
                  className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-all ${
                    selectedStrategyLocal === strategyType
                      ? 'ring-2 ring-green-500 shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleSelectStrategy(strategyType, result)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg capitalize">{strategyType.replace('-', ' ')}</h3>
                    {result.estimatedSavings > 0 && (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        Save ${result.estimatedSavings.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold">${result.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stores:</span>
                      <span className="font-semibold">{result.storeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Savings:</span>
                      <span className="font-semibold text-green-600">
                        {result.savingsPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-600">
                      {strategyType === 'budget' && 'Lowest total cost'}
                      {strategyType === 'convenience' && 'Fewest stores'}
                      {strategyType === 'split-cart' && 'Best price per item'}
                      {strategyType === 'meal-plan' && 'Balance cost & quality'}
                    </p>
                  </div>

                  {selectedStrategyLocal === strategyType && (
                    <div className="mt-4">
                      <span className="text-green-600 font-semibold text-sm">Selected ✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
