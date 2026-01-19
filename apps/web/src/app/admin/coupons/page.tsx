'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Tag, Search, Plus, Edit2, Trash2, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminCouponsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - will be replaced with real API calls
  const coupons = [
    {
      id: '1',
      code: 'SAVE10',
      title: '10% Off First Order',
      description: 'Get 10% off your first order',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minPurchase: 50,
      maxDiscount: 20,
      usageLimit: 1000,
      usageCount: 245,
      isActive: true,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
      createdAt: '2023-12-15T10:00:00Z',
    },
    {
      id: '2',
      code: 'WELCOME20',
      title: '20% Off Welcome Offer',
      description: 'Welcome new customers with 20% off',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minPurchase: 100,
      maxDiscount: 50,
      usageLimit: 500,
      usageCount: 423,
      isActive: true,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-06-30T23:59:59Z',
      createdAt: '2023-12-20T14:30:00Z',
    },
    {
      id: '3',
      code: 'FREESHIP',
      title: 'Free Shipping',
      description: 'Free delivery on orders over $35',
      discountType: 'FREE_SHIPPING',
      discountValue: 0,
      minPurchase: 35,
      maxDiscount: null,
      usageLimit: null,
      usageCount: 1567,
      isActive: true,
      startDate: '2024-01-01T00:00:00Z',
      endDate: null,
      createdAt: '2023-11-01T09:00:00Z',
    },
    {
      id: '4',
      code: 'SUMMER25',
      title: 'Summer Sale 25%',
      description: 'Summer special - 25% off everything',
      discountType: 'PERCENTAGE',
      discountValue: 25,
      minPurchase: 75,
      maxDiscount: 75,
      usageLimit: 2000,
      usageCount: 2000,
      isActive: false,
      startDate: '2023-06-01T00:00:00Z',
      endDate: '2023-08-31T23:59:59Z',
      createdAt: '2023-05-15T12:00:00Z',
    },
    {
      id: '5',
      code: 'BOGO50',
      title: 'Buy One Get One 50% Off',
      description: 'Buy one item, get another at 50% off',
      discountType: 'BOGO',
      discountValue: 50,
      minPurchase: 0,
      maxDiscount: null,
      usageLimit: 100,
      usageCount: 34,
      isActive: true,
      startDate: '2024-01-15T00:00:00Z',
      endDate: '2024-02-15T23:59:59Z',
      createdAt: '2024-01-10T16:00:00Z',
    },
  ];

  const activeCoupons = coupons.filter(c => c.isActive).length;
  const totalUsage = coupons.reduce((sum, c) => sum + c.usageCount, 0);
  const expiringLater Soon = coupons.filter(c => {
    if (!c.endDate) return false;
    const daysUntilExpiry = (new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  }).length;

  const getDiscountDisplay = (coupon: any) => {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}% off`;
    } else if (coupon.discountType === 'FIXED') {
      return `$${coupon.discountValue} off`;
    } else if (coupon.discountType === 'FREE_SHIPPING') {
      return 'Free Shipping';
    } else if (coupon.discountType === 'BOGO') {
      return `BOGO ${coupon.discountValue}%`;
    }
    return coupon.discountValue;
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    // Show toast notification in real implementation
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Coupon Management</h2>
            <p className="text-gray-600 mt-1">Create and manage promotional coupons</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
                <p className="text-sm text-gray-600">Total Coupons</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-lg">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{activeCoupons}</p>
                <p className="text-sm text-green-700">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500 rounded-lg">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{totalUsage}</p>
                <p className="text-sm text-purple-700">Total Uses</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-lg">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">{expiringSoon}</p>
                <p className="text-sm text-orange-700">Expiring Soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search coupons by code or title..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">All Types</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
              <option value="FREE_SHIPPING">Free Shipping</option>
              <option value="BOGO">BOGO</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Coupons Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coupon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded">
                          <Tag className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-gray-900">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(coupon.code)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy code"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600">{coupon.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {getDiscountDisplay(coupon)}
                      </div>
                      {coupon.minPurchase > 0 && (
                        <p className="text-xs text-gray-500">Min: ${coupon.minPurchase}</p>
                      )}
                      {coupon.maxDiscount && (
                        <p className="text-xs text-gray-500">Max: ${coupon.maxDiscount}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {coupon.usageCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : ''}
                      </div>
                      {coupon.usageLimit && (
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{format(new Date(coupon.startDate), 'MMM d, yyyy')}</div>
                      {coupon.endDate ? (
                        <div className="text-xs">to {format(new Date(coupon.endDate), 'MMM d, yyyy')}</div>
                      ) : (
                        <div className="text-xs text-green-600">No expiry</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {coupon.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        className={`mr-3 ${coupon.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                        title={coupon.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {coupon.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
              <span className="font-medium">12</span> results
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
