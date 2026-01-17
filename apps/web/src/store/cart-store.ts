import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartProduct {
  productId: string;
  productName: string;
  productImage?: string;
  sku?: string;
  storeId: string;
  storeName: string;
  quantity: number;
  unitPrice: number;
  attributes?: any;
}

interface CartStore {
  items: CartProduct[];
  optimizationResult: any | null;
  selectedStrategy: string | null;

  // Actions
  addItem: (item: CartProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setOptimizationResult: (result: any) => void;
  setSelectedStrategy: (strategy: string | null) => void;

  // Getters
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      optimizationResult: null,
      selectedStrategy: null,

      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.productId === item.productId && i.storeId === item.storeId
          );

          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.storeId === item.storeId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }

          return { items: [...state.items, item] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        })),

      clearCart: () =>
        set({
          items: [],
          optimizationResult: null,
          selectedStrategy: null,
        }),

      setOptimizationResult: (result) =>
        set({ optimizationResult: result }),

      setSelectedStrategy: (strategy) =>
        set({ selectedStrategy: strategy }),

      getItemCount: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.unitPrice * item.quantity,
          0
        );
      },
    }),
    {
      name: 'smartcart-cart',
    }
  )
);
