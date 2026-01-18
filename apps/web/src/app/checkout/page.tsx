'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { ordersService } from '@/lib/api/orders';
import { couponService, ApplyCouponResponse } from '@/lib/api/coupon';
import { MapPin, Clock, Phone, Mail, Tag, X } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, optimizationResult, selectedStrategy, clearCart, getSubtotal } = useCartStore();
  const { user } = useAuthStore();

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    instructions: '',
  });

  const [deliveryWindow, setDeliveryWindow] = useState({
    date: '',
    startTime: '09:00',
    endTime: '11:00',
  });

  const [contactInfo, setContactInfo] = useState({
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ApplyCouponResponse | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  const subtotal = getSubtotal();
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const subtotalAfterCoupon = subtotal - couponDiscount;
  const tax = subtotalAfterCoupon * 0.08;
  const deliveryFee = subtotalAfterCoupon >= 35 ? 0 : 4.99;
  const serviceFee = 2.99;
  const total = subtotalAfterCoupon + tax + deliveryFee + serviceFee;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      // Prepare cart items for coupon validation
      const cartItems = items.map((item) => ({
        productId: item.productId,
        store: item.storeName,
        category: item.attributes?.category || '',
        price: item.unitPrice,
        quantity: item.quantity,
      }));

      const result = await couponService.applyCoupon({
        code: couponCode.toUpperCase(),
        cartItems,
        subtotal,
      });

      setAppliedCoupon(result);
      setCouponCode('');
    } catch (error: any) {
      setCouponError(error.message || 'Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error('You must be logged in to place an order');
      }

      // Prepare order items
      const orderItems = items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        sku: item.sku,
        storeId: item.storeId,
        storeName: item.storeName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        attributes: item.attributes,
      }));

      // Create order
      const order = await ordersService.createOrder({
        userId: user.id,
        fulfillmentType: 'DELIVERY',
        items: orderItems,
        deliveryAddress,
        deliveryWindow: deliveryWindow.date
          ? {
              startTime: `${deliveryWindow.date}T${deliveryWindow.startTime}:00Z`,
              endTime: `${deliveryWindow.date}T${deliveryWindow.endTime}:00Z`,
            }
          : undefined,
        customerNotes,
        contactPhone: contactInfo.phone,
        contactEmail: contactInfo.email,
        optimizationStrategy: selectedStrategy || undefined,
        estimatedSavings: optimizationResult?.estimatedSavings,
      });

      // Clear cart and redirect to order confirmation
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Delivery Address</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress.street}
                      onChange={(e) =>
                        setDeliveryAddress({ ...deliveryAddress, street: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apartment/Unit
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.apartment}
                      onChange={(e) =>
                        setDeliveryAddress({ ...deliveryAddress, apartment: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress.city}
                      onChange={(e) =>
                        setDeliveryAddress({ ...deliveryAddress, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress.state}
                      onChange={(e) =>
                        setDeliveryAddress({ ...deliveryAddress, state: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="CA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress.zipCode}
                      onChange={(e) =>
                        setDeliveryAddress({ ...deliveryAddress, zipCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="94102"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Instructions
                    </label>
                    <textarea
                      value={deliveryAddress.instructions}
                      onChange={(e) =>
                        setDeliveryAddress({ ...deliveryAddress, instructions: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      rows={2}
                      placeholder="Leave at door, ring bell, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Window */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Delivery Window</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={deliveryWindow.date}
                      onChange={(e) =>
                        setDeliveryWindow({ ...deliveryWindow, date: e.target.value })
                      }
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <select
                      value={deliveryWindow.startTime}
                      onChange={(e) =>
                        setDeliveryWindow({ ...deliveryWindow, startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="09:00">9:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="17:00">5:00 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <select
                      value={deliveryWindow.endTime}
                      onChange={(e) =>
                        setDeliveryWindow({ ...deliveryWindow, endTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="11:00">11:00 AM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="19:00">7:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Contact Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactInfo.phone}
                      onChange={(e) =>
                        setContactInfo({ ...contactInfo, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactInfo.email}
                      onChange={(e) =>
                        setContactInfo({ ...contactInfo, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Any special requests or notes for your order..."
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.storeId}`} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="font-semibold">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>

                  {/* Coupon Section */}
                  <div className="pt-2 pb-2 border-b border-gray-200">
                    {!appliedCoupon ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Have a coupon code?
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCoupon();
                              }
                            }}
                            placeholder="SAVE10"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={isApplyingCoupon}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {isApplyingCoupon ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                <Tag className="w-4 h-4" />
                                Apply
                              </>
                            )}
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-xs text-red-600 mt-1">{couponError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">
                              {appliedCoupon.coupon.code}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-green-700 hover:text-green-900"
                            title="Remove coupon"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-green-700">{appliedCoupon.coupon.title}</p>
                        <p className="text-xs text-green-600 mt-1">
                          Saving ${appliedCoupon.discountAmount.toFixed(2)} on {appliedCoupon.eligibleItems} item(s)
                        </p>
                      </div>
                    )}
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span className="font-semibold">-${couponDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-semibold">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-semibold">
                      {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="font-semibold">${serviceFee.toFixed(2)}</span>
                  </div>

                  {optimizationResult && optimizationResult.estimatedSavings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Estimated Savings</span>
                      <span className="font-semibold">
                        -${optimizationResult.estimatedSavings.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </button>

                <p className="text-xs text-gray-600 mt-3 text-center">
                  By placing your order, you agree to our Terms of Service
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
