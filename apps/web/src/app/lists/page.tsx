'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { userService, ShoppingList } from '@/lib/api/user';
import {
  List,
  Plus,
  Trash2,
  Edit2,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

export default function ShoppingListsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadLists();
  }, [isAuthenticated, router]);

  const loadLists = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getShoppingLists();
      setLists(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load shopping lists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingList) {
        await userService.updateShoppingList(editingList.id, formData);
      } else {
        await userService.createShoppingList(formData);
      }
      await loadLists();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save list');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this list?')) {
      return;
    }

    try {
      await userService.deleteShoppingList(id);
      await loadLists();
    } catch (err: any) {
      alert(err.message || 'Failed to delete list');
    }
  };

  const handleEdit = (list: ShoppingList) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || '',
      isDefault: list.isDefault,
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', isDefault: false });
    setEditingList(null);
    setShowCreateModal(false);
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
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <List className="w-8 h-8 text-green-600" />
              Shopping Lists
            </h1>
            <p className="text-gray-600 mt-2">
              Create and manage your shopping lists
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New List
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {lists.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <List className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No shopping lists yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first list to start organizing your shopping
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <div
                key={list.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer border-2 border-transparent hover:border-green-500"
                onClick={() => router.push(`/lists/${list.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{list.name}</h3>
                    {list.description && (
                      <p className="text-sm text-gray-600">{list.description}</p>
                    )}
                  </div>
                  {list.isDefault && (
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Items</span>
                    <span className="font-semibold">{list.totalItems || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Checked</span>
                    <span className="font-semibold text-green-600">
                      {list.checkedItems || 0}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold">
                        {list.completionPercentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${list.completionPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(list)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingList ? 'Edit List' : 'Create New List'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    List Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Weekly Groceries"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Add a description..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">
                    Set as default list
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    {editingList ? 'Update List' : 'Create List'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
