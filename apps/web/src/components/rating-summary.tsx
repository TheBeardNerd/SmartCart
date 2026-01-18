'use client';

import { useState, useEffect } from 'react';
import { reviewService, ReviewSummary } from '@/lib/api/reviews';
import { Star, CheckCircle, Loader2 } from 'lucide-react';

interface RatingSummaryProps {
  productId: string;
  onWriteReviewClick?: () => void;
  refreshTrigger?: number;
}

export function RatingSummary({ productId, onWriteReviewClick, refreshTrigger = 0 }: RatingSummaryProps) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [productId, refreshTrigger]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reviewService.getProductReviewSummary(productId);
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 ${
              star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getDistributionPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        Failed to load rating summary
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const hasReviews = summary.totalReviews > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Overall Rating */}
      <div className="flex items-start gap-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {hasReviews ? summary.averageRating.toFixed(1) : '0.0'}
          </div>
          {renderStars(summary.averageRating)}
          <p className="text-sm text-gray-600 mt-2">
            {summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}
          </p>
          {summary.verifiedReviews > 0 && (
            <div className="flex items-center justify-center gap-1 text-xs text-green-700 mt-1">
              <CheckCircle className="w-3 h-3" />
              <span>{summary.verifiedReviews} verified</span>
            </div>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = summary.ratingDistribution[rating as keyof typeof summary.ratingDistribution];
            const percentage = getDistributionPercentage(count, summary.totalReviews);

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium text-gray-700">{rating}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>

                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verified Purchase Percentage */}
      {hasReviews && summary.verifiedReviews > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Verified Purchases</span>
            <span className="font-semibold text-green-700">
              {Math.round((summary.verifiedReviews / summary.totalReviews) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Write Review Button */}
      {onWriteReviewClick && (
        <button
          onClick={onWriteReviewClick}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
        >
          Write a Review
        </button>
      )}

      {/* No Reviews Message */}
      {!hasReviews && (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-3">No reviews yet</p>
          {onWriteReviewClick && (
            <p className="text-sm text-gray-500">Be the first to review this product!</p>
          )}
        </div>
      )}
    </div>
  );
}
