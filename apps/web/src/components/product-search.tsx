'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { searchProducts } from '@/lib/api/products';
import { PriceTrackingButton } from '@/components/price-tracking-button';
import { FavoriteButton } from '@/components/favorite-button';
import { AddToListButton } from '@/components/add-to-list-button';
import { StockIndicator } from '@/components/stock-indicator';
import { useCartStore } from '@/store/cart-store';

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { addItem } = useCartStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', debouncedQuery],
    queryFn: () => searchProducts({ query: debouncedQuery, limit: 20 }),
    enabled: debouncedQuery.length > 0,
  });

  const handleAddToCart = (product: any) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      store: product.store,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          placeholder="Search for products (e.g., organic bananas, whole milk, bread...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition"
        />
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Error loading products. Please try again.
        </div>
      )}

      {data && data.data && data.data.length > 0 && (
        <div className="mt-6 grid gap-4">
          {data.data.map((product: any) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition flex items-center gap-4"
            >
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {product.store}
                  </span>
                  <StockIndicator
                    productId={product.id}
                    productName={product.name}
                    store={product.store}
                    variant="detailed"
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-700">
                  ${product.price.toFixed(2)}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                  >
                    Add to Cart
                  </button>
                  <div className="flex items-center gap-2">
                    <FavoriteButton
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        store: product.store,
                        imageUrl: product.imageUrl,
                        category: product.category,
                      }}
                      variant="icon"
                      size="sm"
                    />
                    <AddToListButton
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        store: product.store,
                        imageUrl: product.imageUrl,
                        category: product.category,
                      }}
                      variant="icon"
                      size="sm"
                    />
                    <PriceTrackingButton
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        store: product.store,
                        imageUrl: product.imageUrl,
                        category: product.category,
                      }}
                      variant="icon"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {debouncedQuery && data && data.data && data.data.length === 0 && (
        <div className="mt-6 text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No products found for "{debouncedQuery}"</p>
          <p className="text-sm text-gray-500 mt-2">Try searching for something else</p>
        </div>
      )}
    </div>
  );
}
