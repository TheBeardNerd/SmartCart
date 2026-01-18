'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { userService, ShoppingList, ShoppingListItem } from '@/lib/api/user';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Circle,
  Loader2,
  Search,
  X,
  Minus,
  Edit2,
} from 'lucide-react';
import { searchProducts } from '@/lib/api/products';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';

export default function ListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults } = useQuery({
    queryKey: ['products-search', debouncedQuery],
    queryFn: () => searchProducts({ query: debouncedQuery, limit: 10 }),
    enabled: debouncedQuery.length > 0 && showAddItemModal,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadList();
  }, [isAuthenticated, router, listId]);

  const loadList = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getShoppingList(listId);
      setList(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load shopping list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCheck = async (item: ShoppingListItem) => {
    try {
      await userService.updateListItem(listId, item.id, {
        checked: !item.checked,
      });
      await loadList();
    } catch (err: any) {
      alert(err.message || 'Failed to update item');
    }
  };

  const handleUpdateQuantity = async (item: ShoppingListItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;

    try {
      await userService.updateListItem(listId, item.id, {
        quantity: newQuantity,
      });
      await loadList();
    } catch (err: any) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this item from the list?')) return;

    try {
      await userService.deleteListItem(listId, itemId);
      await loadList();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleAddToCart = (item: ShoppingListItem) => {
    addItem({
      productId: item.productId,
      name: item.productName,
      price: item.price ? Number(item.price) : 0,
      store: item.store,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
    });
  };

  const handleAddAllToCart = () => {
    if (!list?.items) return;

    list.items.forEach((item) => {
      if (!item.checked) {
        addItem({
          productId: item.productId,
          name: item.productName,
          price: item.price ? Number(item.price) : 0,
          store: item.store,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        });
      }
    });

    alert(`Added ${list.items.filter((i) => !i.checked).length} items to cart!`);
  };

  const handleClearChecked = async () => {
    if (!confirm('Clear all checked items from this list?')) return;

    try {
      const result = await userService.clearCheckedItems(listId);
      alert(`Cleared ${result.deletedCount} checked items`);
      await loadList();
    } catch (err: any) {
      alert(err.message || 'Failed to clear checked items');
    }
  };

  const handleAddProduct = async (product: any) => {
    try {
      await userService.addItemToList(listId, {
        productId: product.id,
        productName: product.name,
        store: product.store,
        category: product.category,
        imageUrl: product.imageUrl,
        price: product.price,
        quantity: 1,
      });
      await loadList();
      setSearchQuery('');
      setShowAddItemModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add item');
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">List not found</p>
          <button
            onClick={() => router.push('/lists')}
            className="text-green-600 hover:text-green-700 font-semibold"
          >
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  const uncheckedItems = list.items?.filter((item) => !item.checked) || [];
  const checkedItems = list.items?.filter((item) => item.checked) || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/lists')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Lists
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{list.name}</h1>
                {list.description && (
                  <p className="text-gray-600 mt-1">{list.description}</p>
                )}
              </div>
              {list.isDefault && (
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                  Default
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{list.totalItems || 0} items</span>
              <span>•</span>
              <span>{list.checkedItems || 0} checked</span>
              <span>•</span>
              <span className="font-semibold text-green-600">
                {list.completionPercentage || 0}% complete
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${list.completionPercentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowAddItemModal(true)}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Items
          </button>
          <button
            onClick={handleAddAllToCart}
            disabled={uncheckedItems.length === 0}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            Add All to Cart ({uncheckedItems.length})
          </button>
          <button
            onClick={handleClearChecked}
            disabled={checkedItems.length === 0}
            className="px-6 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            Clear Checked
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Items List */}
        {(!list.items || list.items.length === 0) ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No items in this list yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start adding products to your shopping list
            </p>
            <button
              onClick={() => setShowAddItemModal(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unchecked Items */}
            {uncheckedItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-lg mb-4">
                  To Buy ({uncheckedItems.length})
                </h3>
                <div className="space-y-3">
                  {uncheckedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <button
                        onClick={() => handleToggleCheck(item)}
                        className="flex-shrink-0"
                      >
                        <Circle className="w-6 h-6 text-gray-400 hover:text-green-600" />
                      </button>

                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.productName}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {item.store}
                          </span>
                          {item.price && (
                            <span className="font-semibold text-green-700">
                              ${Number(item.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-semibold w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Add to cart"
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove from list"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checked Items */}
            {checkedItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-500">
                  Checked ({checkedItems.length})
                </h3>
                <div className="space-y-3">
                  {checkedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-gray-50 opacity-60"
                    >
                      <button
                        onClick={() => handleToggleCheck(item)}
                        className="flex-shrink-0"
                      >
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </button>

                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate line-through">
                          {item.productName}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">
                            {item.store}
                          </span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Remove from list"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Item Modal */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Add Items to List</h2>
                <button
                  onClick={() => {
                    setShowAddItemModal(false);
                    setSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>

              {searchResults?.data && searchResults.data.length > 0 && (
                <div className="space-y-2">
                  {searchResults.data.map((product: any) => (
                    <div
                      key={`${product.id}-${product.store}`}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddProduct(product)}
                    >
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {product.store}
                          </span>
                          <span className="font-semibold text-green-700">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults?.data?.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                  No products found for "{searchQuery}"
                </div>
              )}

              {!searchQuery && (
                <div className="text-center py-8 text-gray-500">
                  Search for products to add to your list
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
