'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { userService } from '@/lib/api/user';
import { User, MapPin, CreditCard, Lock } from 'lucide-react';
import { ProfileSettings } from '@/components/profile/profile-settings';
import { AddressManagement } from '@/components/profile/address-management';
import { PaymentManagement } from '@/components/profile/payment-management';
import { PasswordChange } from '@/components/profile/password-change';

type TabType = 'profile' | 'addresses' | 'payments' | 'security';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/profile');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'addresses' as TabType, label: 'Addresses', icon: MapPin },
    { id: 'payments' as TabType, label: 'Payment Methods', icon: CreditCard },
    { id: 'security' as TabType, label: 'Security', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-green-50 text-green-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'addresses' && <AddressManagement />}
            {activeTab === 'payments' && <PaymentManagement />}
            {activeTab === 'security' && <PasswordChange />}
          </div>
        </div>
      </div>
    </div>
  );
}
