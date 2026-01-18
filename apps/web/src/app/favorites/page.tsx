'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { userService, Favorite } from '@/lib/api/user';
import { Heart, ShoppingCart, Trash2, Loader2, X } from 'lucide-react';

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadFavorites();
  }, [isAuthenticated, router]);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getFavorites();
      setFavorites(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    try {
      await userService.deleteFavorite(id);
      await loadFavorites();
    } catch (err: any) {
      alert(err.message || 'Failed to remove favorite');
    }
  };

  const handleAddToCart = (favorite: Favorite) => {
    addItem({
      productId: favorite.productId,
      name: favorite.productName,
      price: Number(favorite.price),
      store: favorite.store,
      quantity: 1,
      imageUrl: favorite.imageUrl,
    });
  };

  const handleAddAllToCart = () => {
    favorites.forEach((favorite) => {
      addItem({
        productId: favorite.productId,
        name: favorite.productName,
        price: Number(favorite.price),
        store: favorite.store,
        quantity: 1,
        imageUrl: favorite.imageUrl,
      });
    });

    alert(`Added ${favorites.length} items to cart!`);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              Favorites
            </h1>
            <p className="text-gray-600 mt-2">
              {favorites.length} {favorites.length === 1 ? 'product' : 'products'} saved
            </p>
          </div>
          {favorites.length > 0 && (
            <button
              onClick={handleAddAllToCart}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Add All to Cart
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No favorites yet
            </h2>
            <p className="text-gray-600 mb-6">
              Save products you love to easily find them later
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden group"
              >
                <div className="relative">
                  {favorite.imageUrl ? (
                    <img
                      src={favorite.imageUrl}
                      alt={favorite.productName}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveFavorite(favorite.id)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {favorite.productName}
                  </h3>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {favorite.store}
                    </span>
                    {favorite.category && (
                      <span className="text-xs text-gray-600">
                        {favorite.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-700">
                      ${Number(favorite.price).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAddToCart(favorite)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      title="Add to cart"
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Added {new Date(favorite.addedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
