'use client';

import { useState, useEffect } from 'react';
import { UserCoupon, couponService } from '@/lib/api/coupon';
import { useAuthStore } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';
import { Tag, Percent, DollarSign, Truck, Calendar, Trash2, Copy, CheckCircle } from 'lucide-react';

export default function MyCouponsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [activeCoupons, setActiveCoupons] = useState<UserCoupon[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadSavedCoupons();
  }, [isAuthenticated]);

  const loadSavedCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponService.getMySavedCoupons();
      setActiveCoupons(data.activeCoupons);
      setExpiredCoupons(data.expiredCoupons);
    } catch (error: any) {
      alert(error.message || 'Failed to load saved coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = async (couponId: string) => {
    if (!confirm('Remove this coupon from your saved list?')) return;

    setRemoving(couponId);
    try {
      await couponService.removeSavedCoupon(couponId);
      setActiveCoupons((prev) => prev.filter((c) => c.couponId !== couponId));
      setExpiredCoupons((prev) => prev.filter((c) => c.couponId !== couponId));
    } catch (error: any) {
      alert(error.message || 'Failed to remove coupon');
    } finally {
      setRemoving(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
        return <Percent className="w-5 h-5" />;
      case 'FIXED_AMOUNT':
        return <DollarSign className="w-5 h-5" />;
      case 'FREE_SHIPPING':
        return <Truck className="w-5 h-5" />;
      case 'BOGO':
        return <Tag className="w-5 h-5" />;
      default:
        return <Tag className="w-5 h-5" />;
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

  const renderCouponCard = (userCoupon: UserCoupon) => {
    const { coupon } = userCoupon;
    const isExpiringSoon =
      coupon.expiresAt && new Date(coupon.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();

    return (
      <div
        key={userCoupon.id}
        className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
          isExpired ? 'opacity-60' : ''
        }`}
      >
        {/* Coupon Header */}
        <div
          className={`${
            isExpired
              ? 'bg-gradient-to-r from-gray-400 to-gray-500'
              : 'bg-gradient-to-r from-blue-600 to-blue-700'
          } text-white p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getDiscountIcon(coupon.discountType)}
              <span className="text-2xl font-bold">{getDiscountDisplay(coupon)}</span>
            </div>
            <button
              onClick={() => handleRemoveCoupon(coupon.id)}
              disabled={removing === coupon.id}
              className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
              title="Remove coupon"
            >
              {removing === coupon.id ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
          <h3 className="text-lg font-semibold mb-1">{coupon.title}</h3>
          {coupon.description && <p className="text-sm text-blue-100">{coupon.description}</p>}
        </div>

        {/* Coupon Body */}
        <div className="p-4">
          {/* Coupon Code */}
          <div className="bg-gray-100 rounded-md p-3 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 mb-1">Coupon Code</div>
              <div className="font-mono font-bold text-lg text-gray-900 tracking-wider">{coupon.code}</div>
            </div>
            <button
              onClick={() => handleCopyCode(coupon.code)}
              className="p-2 hover:bg-gray-200 rounded-md transition-colors"
              title="Copy code"
            >
              {copiedCode === coupon.code ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            {coupon.store && (
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4" />
                <span>Valid at {coupon.store}</span>
              </div>
            )}
            {coupon.category && (
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4" />
                <span>{coupon.category} products</span>
              </div>
            )}
            {coupon.minPurchase && (
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>Min. purchase: ${coupon.minPurchase}</span>
              </div>
            )}
            {coupon.expiresAt && (
              <div
                className={`flex items-center gap-2 ${
                  isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {isExpired ? 'Expired' : 'Expires'} {new Date(coupon.expiresAt).toLocaleDateString()}
                  {isExpiringSoon && !isExpired && ' (Soon!)'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-500 text-xs pt-2 border-t">
              <Calendar className="w-3 h-3" />
              <span>Saved {new Date(userCoupon.savedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Saved Coupons</h1>
          <p className="text-gray-600">Manage your saved coupons and promotional codes</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'active'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Coupons ({activeCoupons.length})
              </button>
              <button
                onClick={() => setActiveTab('expired')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'expired'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Expired Coupons ({expiredCoupons.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading your coupons...</p>
          </div>
        ) : (
          <>
            {activeTab === 'active' && (
              <>
                {activeCoupons.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg">
                    <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No active coupons</h3>
                    <p className="text-gray-600 mb-4">You haven't saved any coupons yet</p>
                    <button
                      onClick={() => router.push('/coupons')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Browse Coupons
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeCoupons.map(renderCouponCard)}
                  </div>
                )}
              </>
            )}

            {activeTab === 'expired' && (
              <>
                {expiredCoupons.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg">
                    <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No expired coupons</h3>
                    <p className="text-gray-600">You don't have any expired coupons</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {expiredCoupons.map(renderCouponCard)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
