'use client';

import { useState, useEffect } from 'react';
import { Coupon, couponService } from '@/lib/api/coupon';
import { useAuthStore } from '@/lib/store/auth';
import { Tag, Percent, DollarSign, Truck, Star, Calendar, Users, Bookmark, BookmarkCheck } from 'lucide-react';

export default function CouponsPage() {
  const { isAuthenticated } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedCouponIds, setSavedCouponIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    store: '',
    category: '',
    discountType: '',
    featured: false,
  });

  useEffect(() => {
    loadCoupons();
    if (isAuthenticated) {
      loadSavedCoupons();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [coupons, filters]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponService.getCoupons({ limit: 100 });
      setCoupons(data.coupons);
    } catch (error: any) {
      alert(error.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedCoupons = async () => {
    try {
      const data = await couponService.getMySavedCoupons();
      const ids = new Set(data.savedCoupons.map((sc) => sc.couponId));
      setSavedCouponIds(ids);
    } catch (error) {
      // Silent fail - not critical
    }
  };

  const applyFilters = () => {
    let filtered = [...coupons];

    if (filters.store) {
      filtered = filtered.filter((c) => c.store === filters.store || !c.store);
    }

    if (filters.category) {
      filtered = filtered.filter((c) => c.category === filters.category || !c.category);
    }

    if (filters.discountType) {
      filtered = filtered.filter((c) => c.discountType === filters.discountType);
    }

    if (filters.featured) {
      filtered = filtered.filter((c) => c.isFeatured);
    }

    setFilteredCoupons(filtered);
  };

  const handleSaveCoupon = async (couponId: string) => {
    if (!isAuthenticated) {
      alert('Please login to save coupons');
      return;
    }

    setSaving(couponId);
    try {
      if (savedCouponIds.has(couponId)) {
        await couponService.removeSavedCoupon(couponId);
        setSavedCouponIds((prev) => {
          const next = new Set(prev);
          next.delete(couponId);
          return next;
        });
      } else {
        await couponService.saveCoupon(couponId);
        setSavedCouponIds((prev) => new Set(prev).add(couponId));
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save coupon');
    } finally {
      setSaving(null);
    }
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

  const getDiscountDisplay = (coupon: Coupon) => {
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

  const uniqueStores = Array.from(new Set(coupons.filter((c) => c.store).map((c) => c.store)));
  const uniqueCategories = Array.from(new Set(coupons.filter((c) => c.category).map((c) => c.category)));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Coupons & Promotions</h1>
          <p className="text-gray-600">Save money with our exclusive deals and promotional codes</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store</label>
              <select
                value={filters.store}
                onChange={(e) => setFilters({ ...filters, store: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Stores</option>
                {uniqueStores.map((store) => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
              <select
                value={filters.discountType}
                onChange={(e) => setFilters({ ...filters, discountType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="PERCENTAGE">Percentage Off</option>
                <option value="FIXED_AMOUNT">Dollar Amount Off</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
                <option value="BOGO">Buy One Get One</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.featured}
                  onChange={(e) => setFilters({ ...filters, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Featured Only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Coupons Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No coupons found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoupons.map((coupon) => {
              const isExpiringSoon =
                coupon.expiresAt &&
                new Date(coupon.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
              const isSaved = savedCouponIds.has(coupon.id);

              return (
                <div
                  key={coupon.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Coupon Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {getDiscountIcon(coupon.discountType)}
                        <span className="text-2xl font-bold">{getDiscountDisplay(coupon)}</span>
                      </div>
                      {coupon.isFeatured && <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{coupon.title}</h3>
                    {coupon.description && <p className="text-sm text-blue-100">{coupon.description}</p>}
                  </div>

                  {/* Coupon Body */}
                  <div className="p-4">
                    {/* Coupon Code */}
                    <div className="bg-gray-100 rounded-md p-3 mb-4">
                      <div className="text-xs text-gray-600 mb-1">Coupon Code</div>
                      <div className="font-mono font-bold text-lg text-gray-900 tracking-wider">
                        {coupon.code}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm mb-4">
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
                            isExpiringSoon ? 'text-red-600 font-medium' : 'text-gray-600'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          <span>
                            Expires {new Date(coupon.expiresAt).toLocaleDateString()}
                            {isExpiringSoon && ' (Soon!)'}
                          </span>
                        </div>
                      )}
                      {coupon._count && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{coupon._count.usages} uses</span>
                        </div>
                      )}
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveCoupon(coupon.id)}
                      disabled={saving === coupon.id}
                      className={`w-full py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                        isSaved
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {saving === coupon.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : isSaved ? (
                        <>
                          <BookmarkCheck className="w-5 h-5" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-5 h-5" />
                          Save Coupon
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
