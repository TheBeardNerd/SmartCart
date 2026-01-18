'use client';

import { useState, useEffect } from 'react';
import { deliveryService, DeliverySlot, SlotType } from '@/lib/api/delivery';
import { Calendar, Clock, TruckIcon, Zap, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface DeliverySlotSelectorProps {
  onSlotSelected: (slotId: string | undefined, slotPrice: number) => void;
  selectedSlotId?: string;
}

export function DeliverySlotSelector({ onSlotSelected, selectedSlotId }: DeliverySlotSelectorProps) {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedSlots, setGroupedSlots] = useState<Map<string, DeliverySlot[]>>(new Map());

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      const availableSlots = await deliveryService.getAvailableSlots();
      setSlots(availableSlots);

      // Group slots by date
      const grouped = new Map<string, DeliverySlot[]>();
      availableSlots.forEach((slot) => {
        const dateKey = format(parseISO(slot.date), 'yyyy-MM-dd');
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(slot);
      });

      setGroupedSlots(grouped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSlotTypeLabel = (type: SlotType) => {
    switch (type) {
      case SlotType.SAME_DAY:
        return 'Same Day';
      case SlotType.NEXT_DAY:
        return 'Next Day';
      case SlotType.EXPRESS:
        return 'Express';
      default:
        return 'Scheduled';
    }
  };

  const getSlotTypeIcon = (type: SlotType) => {
    switch (type) {
      case SlotType.SAME_DAY:
      case SlotType.EXPRESS:
        return <Zap className="w-4 h-4" />;
      case SlotType.NEXT_DAY:
        return <TruckIcon className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getSlotTypeColor = (type: SlotType) => {
    switch (type) {
      case SlotType.SAME_DAY:
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case SlotType.EXPRESS:
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case SlotType.NEXT_DAY:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading delivery slots...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Failed to load delivery slots: {error}</p>
        <button
          onClick={loadSlots}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600">No delivery slots available at this time.</p>
        <p className="text-sm text-gray-500 mt-2">Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Choose Delivery Time</h3>
        <button
          onClick={() => onSlotSelected(undefined, 0)}
          className={`text-sm px-4 py-2 rounded-lg border-2 transition ${
            !selectedSlotId
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }`}
        >
          Standard (Free)
        </button>
      </div>

      {Array.from(groupedSlots.entries()).map(([dateKey, dateSlots]) => (
        <div key={dateKey} className="space-y-3">
          <h4 className="font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(parseISO(dateKey), 'EEEE, MMMM d')}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dateSlots.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const isAvailable = !slot.isFull && slot.available;

              return (
                <button
                  key={slot.id}
                  onClick={() => isAvailable && onSlotSelected(slot.id, slot.price)}
                  disabled={!isAvailable}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    isSelected
                      ? 'bg-green-50 border-green-600'
                      : isAvailable
                      ? 'bg-white border-gray-300 hover:border-gray-400'
                      : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    {slot.price > 0 && (
                      <span className="text-sm font-semibold text-green-700">
                        +${slot.price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${getSlotTypeColor(
                        slot.slotType
                      )}`}
                    >
                      {getSlotTypeIcon(slot.slotType)}
                      {getSlotTypeLabel(slot.slotType)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    {slot.availableCapacity || 0} slot{slot.availableCapacity !== 1 ? 's' : ''} remaining
                  </div>

                  {!isAvailable && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      {slot.isFull ? 'Fully Booked' : 'Not Available'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
