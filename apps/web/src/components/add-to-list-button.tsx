'use client';

import { useState, useEffect } from 'react';
import { ListPlus, Loader2, Check, X } from 'lucide-react';
import { userService, ShoppingList } from '@/lib/api/user';
import { useAuthStore } from '@/store/auth-store';

interface AddToListButtonProps {
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
}

export function AddToListButton({
  product,
  size = 'md',
  variant = 'icon',
}: AddToListButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (showModal && isAuthenticated) {
      loadLists();
    }
  }, [showModal, isAuthenticated]);

  const loadLists = async () => {
    try {
      const data = await userService.getShoppingLists();
      setLists(data);
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  const handleAddToLists = async () => {
    if (selectedLists.size === 0) {
      alert('Please select at least one list');
      return;
    }

    setIsLoading(true);
    try {
      const promises = Array.from(selectedLists).map((listId) =>
        userService.addItemToList(listId, {
          productId: product.id,
          productName: product.name,
          store: product.store,
          category: product.category,
          imageUrl: product.imageUrl,
          price: product.price,
          quantity: 1,
        })
      );

      await Promise.all(promises);
      alert(`Added to ${selectedLists.size} list(s)!`);
      setShowModal(false);
      setSelectedLists(new Set());
    } catch (error: any) {
      alert(error.message || 'Failed to add to lists');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleList = (listId: string) => {
    const newSelected = new Set(selectedLists);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedLists(newSelected);
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

  const button = variant === 'icon' ? (
    <button
      onClick={() => setShowModal(true)}
      className={`${sizeClasses[size]} rounded-lg bg-gray-50 hover:bg-gray-100 transition`}
      title="Add to list"
    >
      <ListPlus className={`${iconSizeClasses[size]} text-gray-600`} />
    </button>
  ) : (
    <button
      onClick={() => setShowModal(true)}
      className={`${sizeClasses[size]} px-4 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold transition flex items-center gap-2`}
    >
      <ListPlus className={iconSizeClasses[size]} />
      Add to List
    </button>
  );

  return (
    <>
      {button}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add to Shopping List</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 pb-4 border-b">
              <h3 className="font-medium text-sm text-gray-600 mb-2">Product</h3>
              <div className="flex items-center gap-3">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.store}</p>
                </div>
              </div>
            </div>

            {lists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You don't have any lists yet</p>
                <button
                  onClick={() => {
                    setShowModal(false);
                    window.location.href = '/lists';
                  }}
                  className="text-green-600 hover:text-green-700 font-semibold"
                >
                  Create Your First List
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => toggleList(list.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition ${
                        selectedLists.has(list.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{list.name}</h4>
                          {list.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {list.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {list.totalItems || 0} items
                          </p>
                        </div>
                        {selectedLists.has(list.id) && (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddToLists}
                    disabled={isLoading || selectedLists.size === 0}
                    className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>Add to {selectedLists.size} List(s)</>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedLists(new Set());
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
