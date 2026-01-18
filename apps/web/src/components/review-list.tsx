'use client';

import { useState, useEffect } from 'react';
import { reviewService, Review, VoteType, GetReviewsOptions } from '@/lib/api/reviews';
import { Star, ThumbsUp, ThumbsDown, CheckCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/auth-store';

interface ReviewListProps {
  productId: string;
  refreshTrigger?: number;
}

export function ReviewList({ productId, refreshTrigger = 0 }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterRating, setFilterRating] = useState<number | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<GetReviewsOptions['sortBy']>('recent');
  const [votingReview, setVotingReview] = useState<string | null>(null);

  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    loadReviews();
  }, [productId, page, filterRating, verifiedOnly, sortBy, refreshTrigger]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await reviewService.getProductReviews(productId, {
        page,
        limit: 10,
        rating: filterRating,
        verifiedOnly,
        sortBy,
      });

      setReviews(result.reviews);
      setTotalPages(result.pagination.pages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (reviewId: string, voteType: VoteType) => {
    if (!isAuthenticated) {
      alert('Please log in to vote on reviews');
      return;
    }

    try {
      setVotingReview(reviewId);
      await reviewService.voteOnReview(reviewId, voteType);
      // Reload reviews to get updated counts
      await loadReviews();
    } catch (err: any) {
      console.error('Failed to vote:', err);
    } finally {
      setVotingReview(null);
    }
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

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading reviews...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Failed to load reviews: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters & Sorting */}
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-gray-200">
        {/* Filter by Rating */}
        <select
          value={filterRating || ''}
          onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : undefined)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>

        {/* Verified Only */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <span className="text-sm text-gray-700">Verified Purchases Only</span>
        </label>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as GetReviewsOptions['sortBy'])}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ml-auto"
        >
          <option value="recent">Most Recent</option>
          <option value="helpful">Most Helpful</option>
          <option value="rating_high">Highest Rating</option>
          <option value="rating_low">Lowest Rating</option>
        </select>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{review.userName}</p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(review.createdAt), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Review Title */}
              {review.title && (
                <h4 className="font-semibold text-lg mb-2">{review.title}</h4>
              )}

              {/* Review Content */}
              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.content}</p>

              {/* Review Photos */}
              {review.photos && review.photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {review.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.caption || 'Review photo'}
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                      onClick={() => window.open(photo.url, '_blank')}
                    />
                  ))}
                </div>
              )}

              {/* Helpful Voting */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">Was this helpful?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(review.id, VoteType.HELPFUL)}
                    disabled={!isAuthenticated || votingReview === review.id}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Yes ({review.helpfulCount})</span>
                  </button>
                  <button
                    onClick={() => handleVote(review.id, VoteType.NOT_HELPFUL)}
                    disabled={!isAuthenticated || votingReview === review.id}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>No ({review.notHelpfulCount})</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
