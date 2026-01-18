'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { ordersService } from '@/lib/api/orders';
import { couponService, ApplyCouponResponse } from '@/lib/api/coupon';
import { deliveryService, DeliverySlot, DeliveryPreference } from '@/lib/api/delivery';
import { inventoryService } from '@/lib/api/inventory';
import { MapPin, Clock, Phone, Mail, Tag, X, Truck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, optimizationResult, selectedStrategy, clearCart, getSubtotal } = useCartStore();
  const { user } = useAuthStore();
  const reservationIdRef = useRef<string | null>(null);

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    instructions: '',
  });

  // Replace manual delivery window with slot selection
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [deliveryPreference, setDeliveryPreference] = useState<DeliveryPreference>(
    DeliveryPreference.LEAVE_AT_DOOR
  );
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Stock reservation state
  const [stockReserved, setStockReserved] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

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

  // Load delivery slots and reserve stock on mount
  useEffect(() => {
    loadDeliverySlots();
    reserveStock();

    // Release reservation when leaving page
    return () => {
      if (reservationIdRef.current) {
        inventoryService.releaseReservation(reservationIdRef.current).catch(console.error);
      }
    };
  }, []);

  const loadDeliverySlots = async () => {
    setLoadingSlots(true);
    try {
      const slots = await deliveryService.getAvailableSlots();
      setDeliverySlots(slots.filter(slot => slot.available));
    } catch (error) {
      console.error('Failed to load delivery slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const reserveStock = async () => {
    try {
      const stockItems = items.map((item) => ({
        productId: item.productId,
        store: item.storeName,
        quantity: item.quantity,
      }));

      const result = await inventoryService.reserveStock(stockItems);
      if (result.reservations.length > 0) {
        reservationIdRef.current = result.reservations[0].id;
        setStockReserved(true);
        setReservationError(null);
      }
    } catch (error: any) {
      setReservationError(error.message);
      setStockReserved(false);
    }
  };

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

    // Validate stock reservation
    if (!stockReserved) {
      setError('Stock could not be reserved. Please try again or adjust your cart.');
      return;
    }

    // Validate delivery slot selection
    if (!selectedSlot) {
      setError('Please select a delivery slot');
      return;
    }

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
        deliveryWindow: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        },
        customerNotes,
        contactPhone: contactInfo.phone,
        contactEmail: contactInfo.email,
        optimizationStrategy: selectedStrategy || undefined,
        estimatedSavings: optimizationResult?.estimatedSavings,
        couponCode: appliedCoupon?.coupon.code,
      });

      // Schedule delivery with selected slot
      await deliveryService.scheduleDelivery({
        orderId: order.id,
        slotId: selectedSlot.id,
        preference: deliveryPreference,
        addressLine1: deliveryAddress.street,
        addressLine2: deliveryAddress.apartment,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        zipCode: deliveryAddress.zipCode,
        deliveryInstructions: deliveryAddress.instructions,
      });

      // Complete stock reservation
      if (reservationIdRef.current) {
        await inventoryService.completeReservation(reservationIdRef.current);
        reservationIdRef.current = null;
      }

      // Clear cart and redirect to order confirmation
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to group slots by date
  const groupSlotsByDate = () => {
    const grouped: Record<string, DeliverySlot[]> = {};
    deliverySlots.forEach((slot) => {
      const date = slot.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });
    return grouped;
  };

  const getSlotTypeLabel = (type: string) => {
    switch (type) {
      case 'SAME_DAY':
        return 'Same Day';
      case 'NEXT_DAY':
        return 'Next Day';
      case 'EXPRESS':
        return 'Express';
      case 'SCHEDULED':
        return 'Scheduled';
      default:
        return type;
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

              {/* Stock Reservation Status */}
              {reservationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-800">Stock Reservation Failed</p>
                      <p className="text-sm text-red-600 mt-1">{reservationError}</p>
                    </div>
                  </div>
                </div>
              )}

              {stockReserved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700">
                      Items reserved for 15 minutes. Complete checkout to secure your order.
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Slot Selection */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Select Delivery Slot</h2>
                </div>

                {loadingSlots ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading available slots...</p>
                  </div>
                ) : deliverySlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Clock className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p>No delivery slots available. Please try again later.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupSlotsByDate()).map(([date, slots]) => (
                      <div key={date}>
                        <h3 className="font-semibold text-gray-900 mb-3">
                          {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {slots.map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-4 border-2 rounded-lg text-left transition ${
                                selectedSlot?.id === slot.id
                                  ? 'border-green-600 bg-green-50'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-600" />
                                    <span className="font-semibold">
                                      {format(parseISO(slot.startTime), 'h:mm a')} -{' '}
                                      {format(parseISO(slot.endTime), 'h:mm a')}
                                    </span>
                                  </div>
                                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    {getSlotTypeLabel(slot.slotType)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-700">${slot.price.toFixed(2)}</p>
                                  <p className="text-xs text-gray-500">
                                    {slot.booked}/{slot.capacity} booked
                                  </p>
                                </div>
                              </div>
                              {selectedSlot?.id === slot.id && (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                  <span className="text-sm text-green-700 font-medium">Selected ✓</span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery Preference */}
                {selectedSlot && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Delivery Preference
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(DeliveryPreference).map((pref) => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => setDeliveryPreference(pref)}
                          className={`p-3 border-2 rounded-lg text-sm transition ${
                            deliveryPreference === pref
                              ? 'border-green-600 bg-green-50 text-green-900'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {pref.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
