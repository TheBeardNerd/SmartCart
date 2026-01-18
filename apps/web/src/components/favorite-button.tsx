'use client';

import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { userService } from '@/lib/api/user';
import { useAuthStore } from '@/store/auth-store';

interface FavoriteButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    store: string;
    imageUrl?: string;
    category?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'full';
  onToggle?: (isFavorite: boolean) => void;
}

export function FavoriteButton({
  product,
  size = 'md',
  variant = 'icon',
  onToggle,
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if product is already favorited
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkFavorite = async () => {
      try {
        const result = await userService.checkFavorite(product.id, product.store);
        setIsFavorite(result.isFavorite);
        if (result.favorite) {
          setFavoriteId(result.favorite.id);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavorite();
  }, [isAuthenticated, product.id, product.store]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert('Please login to save favorites');
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorite && favoriteId) {
        // Remove from favorites
        await userService.deleteFavorite(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
        onToggle?.(false);
      } else {
        // Add to favorites
        const favorite = await userService.addFavorite({
          productId: product.id,
          productName: product.name,
          store: product.store,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
        });
        setIsFavorite(true);
        setFavoriteId(favorite.id);
        onToggle?.(true);
      }
    } catch (error: any) {
      // Handle duplicate favorites gracefully
      if (error.message.includes('already in favorites')) {
        setIsFavorite(true);
      } else {
        alert(error.message || 'Failed to update favorites');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleFavorite}
        disabled={isLoading}
        className={`${sizeClasses[size]} rounded-lg transition disabled:opacity-50 ${
          isFavorite
            ? 'bg-red-50 hover:bg-red-100'
            : 'bg-gray-50 hover:bg-gray-100'
        }`}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isLoading ? (
          <Loader2 className={`${iconSizeClasses[size]} animate-spin text-gray-600`} />
        ) : (
          <Heart
            className={`${iconSizeClasses[size]} ${
              isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600'
            }`}
          />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`${sizeClasses[size]} px-4 rounded-lg border font-semibold transition disabled:opacity-50 flex items-center gap-2 ${
        isFavorite
          ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
      ) : (
        <Heart
          className={`${iconSizeClasses[size]} ${
            isFavorite ? 'fill-red-500' : ''
          }`}
        />
      )}
      {isFavorite ? 'Favorited' : 'Favorite'}
    </button>
  );
}
