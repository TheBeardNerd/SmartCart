'use client';

import { useState, useEffect } from 'react';
import { recommendationService, DealAlert } from '@/lib/api/recommendations';
import { useAuthStore } from '@/store/auth-store';
import { Zap, Tag, TrendingDown, ExternalLink } from 'lucide-react';

export function DealAlerts() {
  const { isAuthenticated } = useAuthStore();
  const [dealAlerts, setDealAlerts] = useState<DealAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadDealAlerts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadDealAlerts = async () => {
    try {
      setLoading(true);
      const data = await recommendationService.getDealAlerts();
      setDealAlerts(data.slice(0, 3));
    } catch (error) {
      console.error('Failed to load deal alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDiscountDisplay = (coupon: any) => {
    switch (coupon.discountType) {
      case 'PERCENTAGE':
        return `${coupon.discountValue}% OFF`;
      case 'FIXED_AMOUNT':
        return `$${coupon.discountValue} OFF`;
      case 'FREE_SHIPPING':
        return 'FREE SHIPPING';
      case 'BOGO':
        return 'BOGO';
      default:
        return 'DISCOUNT';
    }
  };

  if (!isAuthenticated || (!loading && dealAlerts.length === 0)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Hot Deals For You</h2>
        {dealAlerts.length > 0 && (
          <span className="ml-auto bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            {dealAlerts.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg p-4">
              <div className="bg-gray-200 h-6 rounded w-3/4 mb-3"></div>
              <div className="bg-gray-200 h-4 rounded w-1/2 mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {dealAlerts.map((alert, index) => {
            const expiresAt = alert.coupon.expiresAt
              ? new Date(alert.coupon.expiresAt)
              : null;
            const daysUntilExpiry = expiresAt
              ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div
                key={index}
                className="bg-white rounded-lg p-4 border-l-4 border-green-500 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-600 text-white px-3 py-1 rounded-md font-bold">
                      {getDiscountDisplay(alert.coupon)}
                    </div>
                    {daysUntilExpiry && daysUntilExpiry <= 7 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md">
                        Expires in {daysUntilExpiry}d
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-green-600 font-semibold">
                    <TrendingDown className="w-4 h-4" />
                    Save ${alert.estimatedSavings.toFixed(2)}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2">{alert.coupon.title}</h3>
                {alert.coupon.description && (
                  <p className="text-sm text-gray-600 mb-3">{alert.coupon.description}</p>
                )}

                <div className="bg-gray-50 rounded-md p-3 mb-3">
                  <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Coupon Code
                  </div>
                  <div className="font-mono font-bold text-gray-900 tracking-wider">
                    {alert.coupon.code}
                  </div>
                </div>

                {alert.relevantProducts.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-2">
                      Applies to {alert.relevantProducts.length} of your favorite{' '}
                      {alert.relevantProducts.length === 1 ? 'product' : 'products'}
                    </p>
                    <div className="flex gap-2 overflow-x-auto">
                      {alert.relevantProducts.slice(0, 3).map((product: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden"
                        >
                          {product.imageUrl || product.productImage ? (
                            <img
                              src={product.imageUrl || product.productImage}
                              alt={product.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ExternalLink className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
