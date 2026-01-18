'use client';

import { use } from 'react';
import { OrderTracker } from '@/components/order-tracker';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
          <p className="text-gray-600">Order ID: {orderId}</p>
        </div>

        <OrderTracker orderId={orderId} />
      </div>
    </div>
  );
}
