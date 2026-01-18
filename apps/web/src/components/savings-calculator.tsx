'use client';

import { OptimizationResult, OptimizationRecommendation } from '@/lib/api/optimization';
import { TrendingDown, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface SavingsCalculatorProps {
  optimization: OptimizationResult | null;
  loading?: boolean;
}

export function SavingsCalculator({ optimization, loading = false }: SavingsCalculatorProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!optimization) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Add items to your cart to see potential savings</p>
      </div>
    );
  }

  const hasSavings = optimization.totalSavings > 0;

  return (
    <div className="space-y-4">
      {/* Savings Summary Card */}
      <div
        className={`rounded-lg p-6 border-2 ${
          hasSavings
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className={`w-5 h-5 ${hasSavings ? 'text-green-600' : 'text-gray-500'}`} />
          <h3 className="text-lg font-semibold">
            {hasSavings ? 'Potential Savings' : 'Price Comparison'}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Original Price */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Original Total</p>
            <p className="text-2xl font-bold text-gray-700">
              ${optimization.originalTotal.toFixed(2)}
            </p>
          </div>

          {/* Optimized Price */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Optimized Total</p>
            <p className="text-2xl font-bold text-green-700">
              ${optimization.optimizedTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {hasSavings && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">You Save</p>
                <p className="text-3xl font-bold text-green-600">
                  ${optimization.totalSavings.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  <TrendingDown className="w-4 h-4" />
                  {optimization.savingsPercent.toFixed(1)}% off
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {optimization.recommendations && optimization.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h4 className="font-semibold">Smart Recommendations</h4>
          </div>

          <div className="space-y-3">
            {optimization.recommendations.slice(0, 3).map((rec, index) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Optimization Mode Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              {optimization.mode === 'price' && 'Best Price Mode'}
              {optimization.mode === 'time' && 'Fastest Delivery Mode'}
              {optimization.mode === 'convenience' && 'Single Store Mode'}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {optimization.mode === 'price' &&
                'Cart optimized to find the lowest prices across all stores.'}
              {optimization.mode === 'time' &&
                'Cart optimized to minimize delivery time and number of deliveries.'}
              {optimization.mode === 'convenience' &&
                'All items from a single store for maximum convenience.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({ recommendation }: { recommendation: OptimizationRecommendation }) {
  const getIcon = () => {
    switch (recommendation.type) {
      case 'bundle':
        return '📦';
      case 'switch_store':
        return '🔄';
      case 'alternative_product':
        return '💡';
      case 'remove_item':
        return '❌';
      default:
        return '💡';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <span className="text-2xl">{getIcon()}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{recommendation.message}</p>
        {recommendation.potentialSavings > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <ArrowRight className="w-3 h-3 text-green-600" />
            <span className="text-xs font-semibold text-green-600">
              Save ${recommendation.potentialSavings.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
