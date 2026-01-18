'use client';

import { OptimizationMode } from '@/lib/api/optimization';
import { DollarSign, Clock, ShoppingBag } from 'lucide-react';

interface OptimizationControlsProps {
  selectedMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  disabled?: boolean;
}

const modes: Array<{
  mode: OptimizationMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    mode: 'price',
    label: 'Best Price',
    description: 'Minimize total cost across all stores',
    icon: DollarSign,
  },
  {
    mode: 'time',
    label: 'Fastest Delivery',
    description: 'Minimize delivery time and number of deliveries',
    icon: Clock,
  },
  {
    mode: 'convenience',
    label: 'Single Store',
    description: 'Buy everything from one store for maximum convenience',
    icon: ShoppingBag,
  },
];

export function OptimizationControls({
  selectedMode,
  onModeChange,
  disabled = false,
}: OptimizationControlsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Optimization Mode
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map(({ mode, label, description, icon: Icon }) => {
          const isSelected = selectedMode === mode;

          return (
            <button
              key={mode}
              onClick={() => !disabled && onModeChange(mode)}
              disabled={disabled}
              className={`p-4 rounded-lg border-2 text-left transition ${
                isSelected
                  ? 'bg-green-50 border-green-600 shadow-sm'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{label}</p>
                    {isSelected && (
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
