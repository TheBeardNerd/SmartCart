'use client';

import { StoreGroup } from '@/lib/api/optimization';
import { Store, Package, TruckIcon } from 'lucide-react';

interface CartBreakdownProps {
  storeGroups: StoreGroup[];
  showDeliveryFees?: boolean;
}

export function CartBreakdown({ storeGroups, showDeliveryFees = true }: CartBreakdownProps) {
  if (storeGroups.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600">Your cart is empty</p>
      </div>
    );
  }

  const totalItems = storeGroups.reduce((sum, group) => sum + group.itemCount, 0);
  const grandTotal = storeGroups.reduce((sum, group) => sum + group.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-green-600" />
          Cart Breakdown ({storeGroups.length} store{storeGroups.length > 1 ? 's' : ''})
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-600">{totalItems} items</p>
          <p className="text-lg font-bold text-green-700">${grandTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {storeGroups.map((group, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
          >
            {/* Store Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Store className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <h4 className="font-semibold">{group.store}</h4>
                  <p className="text-xs text-gray-500">{group.itemCount} items</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="font-bold text-green-700">${group.subtotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-2 mb-3">
              {group.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-start gap-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">${item.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Fee */}
            {showDeliveryFees && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TruckIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Delivery Fee</span>
                    {group.qualifiesForFreeDelivery && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                        FREE
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      group.qualifiesForFreeDelivery ? 'text-green-600 line-through' : ''
                    }`}
                  >
                    ${group.deliveryFee.toFixed(2)}
                  </span>
                </div>

                {!group.qualifiesForFreeDelivery && (
                  <p className="text-xs text-gray-500 mt-1">
                    Add ${(35 - group.subtotal).toFixed(2)} more for free delivery
                  </p>
                )}

                {/* Total for this store */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <span className="font-semibold">Store Total</span>
                  <span className="font-bold text-green-700">${group.total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Grand Total */}
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Grand Total</span>
          <span className="text-2xl font-bold text-green-700">${grandTotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {storeGroups.length} separate deliver{storeGroups.length > 1 ? 'ies' : 'y'} · {totalItems}{' '}
          items total
        </p>
      </div>
    </div>
  );
}
