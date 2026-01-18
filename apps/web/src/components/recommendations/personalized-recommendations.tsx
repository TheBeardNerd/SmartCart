'use client';

import { useState, useEffect } from 'react';
import { recommendationService, Recommendation } from '@/lib/api/recommendations';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { Sparkles, ShoppingCart, ExternalLink } from 'lucide-react';

interface PersonalizedRecommendationsProps {
  limit?: number;
}

export function PersonalizedRecommendations({ limit = 6 }: PersonalizedRecommendationsProps) {
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecommendations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await recommendationService.getPersonalizedRecommendations();
      setRecommendations(data.recommendations.slice(0, limit));
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (rec: Recommendation) => {
    addItem({
      productId: rec.productId,
      name: rec.productName,
      price: rec.price,
      store: rec.store,
      quantity: 1,
      imageUrl: rec.imageUrl,
    });
  };

  if (!isAuthenticated || (!loading && recommendations.length === 0)) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-900">Recommended For You</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg mb-3"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-3 gap-4">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {rec.imageUrl ? (
                <img
                  src={rec.imageUrl}
                  alt={rec.productName}
                  className="w-full h-40 object-cover rounded-md mb-3"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                  <ExternalLink className="w-12 h-12 text-gray-400" />
                </div>
              )}

              <div className="mb-3">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                  {rec.productName}
                </h3>
                <p className="text-sm text-gray-600">{rec.store}</p>
                {rec.category && (
                  <p className="text-xs text-gray-500 mt-1">{rec.category}</p>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-gray-900">
                  ${rec.price.toFixed(2)}
                </span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {rec.reason}
                </span>
              </div>

              <button
                onClick={() => handleAddToCart(rec)}
                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
