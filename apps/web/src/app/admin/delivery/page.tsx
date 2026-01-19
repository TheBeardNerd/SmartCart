'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { SkeletonList, SkeletonTable } from '@/components/skeleton-loaders';
import { Truck, Search, Plus, MapPin, User, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDeliveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'deliveries' | 'slots' | 'drivers'>('deliveries');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock delivery data
  const deliveries = [
    {
      id: 'DEL-001',
      orderId: 'ORD-2024-001',
      customerName: 'John Doe',
      address: '123 Main St, Apt 4B, San Francisco, CA 94102',
      driverId: 'DRV-001',
      driverName: 'Mike Wilson',
      status: 'OUT_FOR_DELIVERY',
      slotType: 'SAME_DAY',
      scheduledTime: '2024-01-16T14:00:00Z',
      createdAt: '2024-01-16T09:30:00Z',
    },
    {
      id: 'DEL-002',
      orderId: 'ORD-2024-002',
      customerName: 'Jane Smith',
      address: '456 Oak Ave, Suite 200, San Francisco, CA 94103',
      driverId: 'DRV-002',
      driverName: 'Sarah Johnson',
      status: 'DELIVERED',
      slotType: 'NEXT_DAY',
      scheduledTime: '2024-01-16T10:00:00Z',
      createdAt: '2024-01-15T16:20:00Z',
    },
    {
      id: 'DEL-003',
      orderId: 'ORD-2024-003',
      customerName: 'Bob Johnson',
      address: '789 Pine St, San Francisco, CA 94104',
      driverId: null,
      driverName: null,
      status: 'SCHEDULED',
      slotType: 'EXPRESS',
      scheduledTime: '2024-01-17T09:00:00Z',
      createdAt: '2024-01-16T11:45:00Z',
    },
  ];

  // Mock slot data
  const slots = [
    {
      id: 'SLOT-001',
      date: '2024-01-17',
      startTime: '09:00',
      endTime: '11:00',
      type: 'SAME_DAY',
      capacity: 10,
      booked: 7,
      price: 9.99,
    },
    {
      id: 'SLOT-002',
      date: '2024-01-17',
      startTime: '13:00',
      endTime: '15:00',
      type: 'SAME_DAY',
      capacity: 10,
      booked: 10,
      price: 9.99,
    },
    {
      id: 'SLOT-003',
      date: '2024-01-18',
      startTime: '09:00',
      endTime: '12:00',
      type: 'NEXT_DAY',
      capacity: 15,
      booked: 5,
      price: 4.99,
    },
  ];

  // Mock driver data
  const drivers = [
    {
      id: 'DRV-001',
      name: 'Mike Wilson',
      phone: '+1 (555) 111-2222',
      vehicleType: 'Van',
      rating: 4.8,
      totalDeliveries: 1234,
      activeDeliveries: 3,
      isOnline: true,
    },
    {
      id: 'DRV-002',
      name: 'Sarah Johnson',
      phone: '+1 (555) 333-4444',
      vehicleType: 'Truck',
      rating: 4.9,
      totalDeliveries: 2156,
      activeDeliveries: 2,
      isOnline: true,
    },
    {
      id: 'DRV-003',
      name: 'Tom Brown',
      phone: '+1 (555) 555-6666',
      vehicleType: 'Van',
      rating: 4.7,
      totalDeliveries: 987,
      activeDeliveries: 0,
      isOnline: false,
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-yellow-100 text-yellow-800',
      OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Delivery Management</h2>
            <p className="text-gray-600 mt-1">Manage deliveries, slots, and drivers</p>
          </div>
          {selectedTab === 'slots' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              <Plus className="w-4 h-4" />
              Generate Slots
            </button>
          )}
          {selectedTab === 'drivers' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              <Plus className="w-4 h-4" />
              Add Driver
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setSelectedTab('deliveries')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                selectedTab === 'deliveries'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Deliveries
              </div>
            </button>
            <button
              onClick={() => setSelectedTab('slots')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                selectedTab === 'slots'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Slots
              </div>
            </button>
            <button
              onClick={() => setSelectedTab('drivers')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                selectedTab === 'drivers'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Drivers
              </div>
            </button>
          </nav>
        </div>

        {/* Deliveries Tab */}
        {selectedTab === 'deliveries' && (
          <>
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order ID or customer name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">All Status</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>
            </div>

            {/* Deliveries List */}
            {isLoading ? (
              <SkeletonList items={5} />
            ) : (
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{delivery.orderId}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                          {delivery.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">
                            <User className="w-4 h-4 inline mr-1" />
                            Customer: <span className="font-medium text-gray-900">{delivery.customerName}</span>
                          </p>
                          <p className="text-gray-600 flex items-start gap-1">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {delivery.address}
                          </p>
                        </div>
                        <div>
                          {delivery.driverName && (
                            <p className="text-gray-600 mb-1">
                              <Truck className="w-4 h-4 inline mr-1" />
                              Driver: <span className="font-medium text-gray-900">{delivery.driverName}</span>
                            </p>
                          )}
                          <p className="text-gray-600">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Scheduled: {format(new Date(delivery.scheduledTime), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {/* Slots Tab */}
        {selectedTab === 'slots' && (
          isLoading ? (
            <SkeletonTable rows={5} columns={6} />
          ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {slots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(slot.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {slot.startTime} - {slot.endTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {slot.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {slot.booked} / {slot.capacity}
                          </span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${slot.booked >= slot.capacity ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${(slot.booked / slot.capacity) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${slot.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {slot.booked >= slot.capacity ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                            Full
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                            Available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {/* Drivers Tab */}
        {selectedTab === 'drivers' && (
          isLoading ? (
            <SkeletonList items={6} />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <div key={driver.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {driver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                      <p className="text-sm text-gray-600">{driver.vehicleType}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    driver.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {driver.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">{driver.phone}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-semibold text-yellow-600">{driver.rating} ⭐</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Deliveries:</span>
                    <span className="font-semibold text-gray-900">{driver.totalDeliveries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Active Now:</span>
                    <span className="font-semibold text-blue-600">{driver.activeDeliveries}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}
