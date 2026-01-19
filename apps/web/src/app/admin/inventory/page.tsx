'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { SkeletonStats, SkeletonTable } from '@/components/skeleton-loaders';
import { Package, Search, AlertTriangle, TrendingDown, Plus, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminInventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock data - will be replaced with real API calls
  const inventory = [
    {
      id: '1',
      productId: 'prod-1',
      productName: 'Organic Bananas',
      sku: 'BAN001',
      store: 'Whole Foods',
      quantity: 150,
      reserved: 12,
      available: 138,
      status: 'IN_STOCK',
      reorderPoint: 50,
      lastRestocked: '2024-01-14T10:00:00Z',
    },
    {
      id: '2',
      productId: 'prod-2',
      productName: 'Whole Milk 1 Gallon',
      sku: 'MLK001',
      store: 'Safeway',
      quantity: 35,
      reserved: 8,
      available: 27,
      status: 'LOW_STOCK',
      reorderPoint: 30,
      lastRestocked: '2024-01-15T14:30:00Z',
    },
    {
      id: '3',
      productId: 'prod-3',
      productName: 'Free Range Eggs',
      sku: 'EGG001',
      store: 'Trader Joes',
      quantity: 0,
      reserved: 0,
      available: 0,
      status: 'OUT_OF_STOCK',
      reorderPoint: 20,
      lastRestocked: '2024-01-10T09:00:00Z',
    },
    {
      id: '4',
      productId: 'prod-4',
      productName: 'Artisan Bread',
      sku: 'BRD001',
      store: 'Whole Foods',
      quantity: 45,
      reserved: 5,
      available: 40,
      status: 'LOW_STOCK',
      reorderPoint: 40,
      lastRestocked: '2024-01-16T08:00:00Z',
    },
    {
      id: '5',
      productId: 'prod-5',
      productName: 'Fresh Strawberries',
      sku: 'STR001',
      store: 'Safeway',
      quantity: 85,
      reserved: 15,
      available: 70,
      status: 'IN_STOCK',
      reorderPoint: 30,
      lastRestocked: '2024-01-15T11:00:00Z',
    },
  ];

  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.status === 'LOW_STOCK').length;
  const outOfStockCount = inventory.filter(i => i.status === 'OUT_OF_STOCK').length;
  const totalValue = inventory.reduce((sum, i) => sum + (i.quantity * 5.99), 0); // Mock calculation

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      IN_STOCK: 'bg-green-100 text-green-800',
      LOW_STOCK: 'bg-yellow-100 text-yellow-800',
      OUT_OF_STOCK: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'OUT_OF_STOCK') return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (status === 'LOW_STOCK') return <TrendingDown className="w-4 h-4 text-yellow-600" />;
    return <Package className="w-4 h-4 text-green-600" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
            <p className="text-gray-600 mt-1">Monitor and manage stock levels across all stores</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            <Plus className="w-4 h-4" />
            Add Inventory
          </button>
        </div>

        {/* Stats */}
        {isLoading ? (
          <SkeletonStats count={4} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                <p className="text-sm text-gray-600">Total Items</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500 rounded-lg">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-900">{lowStockCount}</p>
                <p className="text-sm text-yellow-700">Low Stock</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">{outOfStockCount}</p>
                <p className="text-sm text-red-700">Out of Stock</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">${totalValue.toFixed(0)}</p>
                <p className="text-sm text-green-700">Total Value</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name or SKU..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Stores</option>
              <option value="Whole Foods">Whole Foods</option>
              <option value="Safeway">Safeway</option>
              <option value="Trader Joes">Trader Joes</option>
              <option value="Target">Target</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">All Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        {isLoading ? (
          <SkeletonTable rows={5} columns={9} />
        ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reserved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Restocked
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${item.status === 'OUT_OF_STOCK' ? 'bg-red-50/30' : item.status === 'LOW_STOCK' ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.store}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-orange-600">{item.reserved}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        item.available === 0 ? 'text-red-600' :
                        item.available <= item.reorderPoint ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {item.available}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.reorderPoint}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(item.lastRestocked), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
              <span className="font-medium">47</span> results
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Alerts */}
        {outOfStockCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Out of Stock Alert</h3>
                <p className="text-sm text-red-700 mt-1">
                  {outOfStockCount} {outOfStockCount === 1 ? 'item is' : 'items are'} currently out of stock. Please restock immediately.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
