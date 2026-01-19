'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { SkeletonStats, SkeletonList } from '@/components/skeleton-loaders';
import { Star, Search, Check, X, Flag, Eye, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminReviewsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('PENDING');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock data - will be replaced with real API calls
  const reviews = [
    {
      id: '1',
      productId: 'prod-1',
      productName: 'Organic Bananas',
      userId: 'user-1',
      userName: 'John Doe',
      rating: 5,
      content: 'Excellent quality! Fresh and delicious. Will definitely buy again.',
      status: 'PENDING',
      verifiedPurchase: true,
      flagCount: 0,
      createdAt: '2024-01-16T10:30:00Z',
    },
    {
      id: '2',
      productId: 'prod-2',
      productName: 'Whole Milk 1 Gallon',
      userId: 'user-2',
      userName: 'Jane Smith',
      rating: 4,
      content: 'Good milk, but the packaging could be better. Overall satisfied with the purchase.',
      status: 'PENDING',
      verifiedPurchase: true,
      flagCount: 0,
      createdAt: '2024-01-16T14:20:00Z',
    },
    {
      id: '3',
      productId: 'prod-3',
      productName: 'Free Range Eggs',
      userId: 'user-3',
      userName: 'Bob Johnson',
      rating: 2,
      content: 'Several eggs were broken when delivered. Quality not as expected.',
      status: 'PENDING',
      verifiedPurchase: false,
      flagCount: 1,
      createdAt: '2024-01-15T09:15:00Z',
    },
    {
      id: '4',
      productId: 'prod-4',
      productName: 'Artisan Bread',
      userId: 'user-4',
      userName: 'Alice Williams',
      rating: 5,
      content: 'Best bread I have ever had! Fresh, soft, and perfect texture. Highly recommended!',
      status: 'APPROVED',
      verifiedPurchase: true,
      flagCount: 0,
      createdAt: '2024-01-14T16:45:00Z',
    },
    {
      id: '5',
      productId: 'prod-5',
      productName: 'Fresh Strawberries',
      userId: 'user-5',
      userName: 'Charlie Brown',
      rating: 1,
      content: 'This is spam content with inappropriate language.',
      status: 'FLAGGED',
      verifiedPurchase: false,
      flagCount: 3,
      createdAt: '2024-01-15T11:20:00Z',
    },
  ];

  const totalReviews = reviews.length;
  const pendingReviews = reviews.filter(r => r.status === 'PENDING').length;
  const approvedReviews = reviews.filter(r => r.status === 'APPROVED').length;
  const flaggedReviews = reviews.filter(r => r.status === 'FLAGGED' || r.flagCount > 0).length;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      FLAGGED: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Review Moderation</h2>
            <p className="text-gray-600 mt-1">Approve, reject, or flag customer reviews</p>
          </div>
        </div>

        {/* Stats */}
        {isLoading ? (
          <SkeletonStats count={4} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalReviews}</p>
                <p className="text-sm text-gray-600">Total Reviews</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-900">{pendingReviews}</p>
                <p className="text-sm text-yellow-700">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-lg">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{approvedReviews}</p>
                <p className="text-sm text-green-700">Approved</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-lg">
                <Flag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">{flaggedReviews}</p>
                <p className="text-sm text-orange-700">Flagged</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews by product or user..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FLAGGED">Flagged</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">All Purchases</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <SkeletonList items={5} />
        ) : (
        <div className="space-y-4">
          {reviews
            .filter(r => !selectedStatus || r.status === selectedStatus)
            .map((review) => (
              <div
                key={review.id}
                className={`bg-white rounded-lg shadow-sm p-6 border-2 ${
                  review.flagCount > 0 ? 'border-orange-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{review.productName}</h3>
                      {renderStars(review.rating)}
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          <Check className="w-3 h-3" />
                          Verified Purchase
                        </span>
                      )}
                      {review.flagCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          <Flag className="w-3 h-3" />
                          {review.flagCount} {review.flagCount === 1 ? 'Flag' : 'Flags'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      By <span className="font-medium">{review.userName}</span> on{' '}
                      {format(new Date(review.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="text-gray-800">{review.content}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(review.status)}`}>
                    {review.status}
                  </span>
                </div>

                {/* Actions */}
                {review.status === 'PENDING' && (
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
                      <Flag className="w-4 h-4" />
                      Flag
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium ml-auto">
                      <Eye className="w-4 h-4" />
                      View Product
                    </button>
                  </div>
                )}

                {review.status === 'FLAGGED' && (
                  <div className="flex items-center gap-3 pt-4 border-t border-orange-200 bg-orange-50 -mx-6 -mb-6 px-6 pb-6 mt-4 rounded-b-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <p className="text-sm text-orange-800 flex-1">
                      This review has been flagged by users. Please review for inappropriate content.
                    </p>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                      Approve
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
        )}

        {/* Pagination */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
            <span className="font-medium">47</span> results
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
    </AdminLayout>
  );
}
