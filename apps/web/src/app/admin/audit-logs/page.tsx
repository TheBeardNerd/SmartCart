'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { FileText, Search, Download, Calendar, User, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResource, setSelectedResource] = useState('');

  // Mock audit log data
  const auditLogs = [
    {
      id: '1',
      adminEmail: 'admin@smartcart.com',
      adminName: 'John Admin',
      action: 'UPDATE',
      resource: 'product',
      resourceId: 'prod-123',
      details: { field: 'price', oldValue: 4.99, newValue: 5.99 },
      ipAddress: '192.168.1.100',
      createdAt: '2024-01-16T14:30:00Z',
    },
    {
      id: '2',
      adminEmail: 'moderator@smartcart.com',
      adminName: 'Jane Moderator',
      action: 'CREATE',
      resource: 'review',
      resourceId: 'rev-456',
      details: { status: 'APPROVED' },
      ipAddress: '192.168.1.101',
      createdAt: '2024-01-16T13:15:00Z',
    },
    {
      id: '3',
      adminEmail: 'admin@smartcart.com',
      adminName: 'John Admin',
      action: 'DELETE',
      resource: 'coupon',
      resourceId: 'cpn-789',
      details: { code: 'EXPIRED10' },
      ipAddress: '192.168.1.100',
      createdAt: '2024-01-16T11:45:00Z',
    },
    {
      id: '4',
      adminEmail: 'support@smartcart.com',
      adminName: 'Bob Support',
      action: 'VIEW',
      resource: 'order',
      resourceId: 'ord-2024-001',
      details: null,
      ipAddress: '192.168.1.102',
      createdAt: '2024-01-16T10:20:00Z',
    },
    {
      id: '5',
      adminEmail: 'admin@smartcart.com',
      adminName: 'John Admin',
      action: 'UPDATE',
      resource: 'user',
      resourceId: 'usr-321',
      details: { field: 'isActive', oldValue: true, newValue: false },
      ipAddress: '192.168.1.100',
      createdAt: '2024-01-16T09:00:00Z',
    },
  ];

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      VIEW: 'bg-gray-100 text-gray-800',
      EXPORT: 'bg-purple-100 text-purple-800',
      LOGIN: 'bg-yellow-100 text-yellow-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '+';
      case 'UPDATE':
        return '✎';
      case 'DELETE':
        return '×';
      case 'VIEW':
        return '👁';
      case 'EXPORT':
        return '↓';
      case 'LOGIN':
        return '→';
      default:
        return '•';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
            <p className="text-gray-600 mt-1">Track all admin actions and system events</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
                <p className="text-sm text-gray-600">Total Logs</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">89</p>
                <p className="text-sm text-blue-700">Today</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">12</p>
                <p className="text-sm text-purple-700">Active Admins</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">523</p>
                <p className="text-sm text-green-700">This Week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="VIEW">View</option>
              <option value="EXPORT">Export</option>
              <option value="LOGIN">Login</option>
            </select>

            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Resources</option>
              <option value="product">Products</option>
              <option value="order">Orders</option>
              <option value="user">Users</option>
              <option value="review">Reviews</option>
              <option value="coupon">Coupons</option>
              <option value="inventory">Inventory</option>
            </select>

            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Audit Logs List */}
        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:border-gray-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Action Badge */}
                  <div className={`px-3 py-1.5 rounded-lg font-mono text-lg font-bold ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Log Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">{log.resource}</span>
                        {log.resourceId && (
                          <span className="text-gray-500"> #{log.resourceId}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{log.adminName}</span>
                        <span className="text-gray-400">({log.adminEmail})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <div className="text-gray-400">
                        IP: {log.ipAddress}
                      </div>
                    </div>

                    {/* Details */}
                    {log.details && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono">
                        <pre className="text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
            <span className="font-medium">1,234</span> results
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
    </AdminLayout>
  );
}
