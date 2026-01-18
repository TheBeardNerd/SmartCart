'use client';

import { useState } from 'react';
import { deliveryService, DeliveryPreference } from '@/lib/api/delivery';
import { Home, User, FileSignature, Building2 } from 'lucide-react';

interface DeliveryPreferencesProps {
  onPreferenceSelected: (preference: DeliveryPreference, instructions?: string) => void;
  selectedPreference?: DeliveryPreference;
  deliveryInstructions?: string;
}

const preferenceOptions = [
  {
    value: DeliveryPreference.LEAVE_AT_DOOR,
    label: 'Leave at Door',
    description: 'Leave package at the door, no signature required',
    icon: Home,
  },
  {
    value: DeliveryPreference.HAND_TO_CUSTOMER,
    label: 'Hand to Customer',
    description: 'Deliver directly to customer, no signature required',
    icon: User,
  },
  {
    value: DeliveryPreference.SIGNATURE_REQUIRED,
    label: 'Signature Required',
    description: 'Requires signature upon delivery',
    icon: FileSignature,
  },
  {
    value: DeliveryPreference.CONCIERGE,
    label: 'Concierge/Front Desk',
    description: 'Deliver to building concierge or front desk',
    icon: Building2,
  },
];

export function DeliveryPreferences({
  onPreferenceSelected,
  selectedPreference = DeliveryPreference.LEAVE_AT_DOOR,
  deliveryInstructions = '',
}: DeliveryPreferencesProps) {
  const [preference, setPreference] = useState(selectedPreference);
  const [instructions, setInstructions] = useState(deliveryInstructions);

  const handlePreferenceChange = (newPreference: DeliveryPreference) => {
    setPreference(newPreference);
    onPreferenceSelected(newPreference, instructions);
  };

  const handleInstructionsChange = (newInstructions: string) => {
    setInstructions(newInstructions);
    onPreferenceSelected(preference, newInstructions);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Delivery Preferences</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {preferenceOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = preference === option.value;

          return (
            <button
              key={option.value}
              onClick={() => handlePreferenceChange(option.value)}
              className={`p-4 rounded-lg border-2 text-left transition ${
                isSelected
                  ? 'bg-green-50 border-green-600'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-1">{option.label}</p>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor="delivery-instructions" className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Instructions (Optional)
        </label>
        <textarea
          id="delivery-instructions"
          value={instructions}
          onChange={(e) => handleInstructionsChange(e.target.value)}
          placeholder="e.g., Ring doorbell twice, beware of dog, gate code is 1234..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Provide any special instructions for your delivery driver
        </p>
      </div>
    </div>
  );
}
