import { PriceOptimizationEngine, CartItem, OptimizationStrategy } from '../src/optimization/price-optimizer';

describe('PriceOptimizationEngine', () => {
  let optimizer: PriceOptimizationEngine;

  beforeEach(() => {
    optimizer = new PriceOptimizationEngine();
  });

  const sampleCart: CartItem[] = [
    {
      productId: '123456789012',
      name: 'Organic Bananas',
      quantity: 2,
      category: 'produce',
    },
    {
      productId: '234567890123',
      name: 'Whole Milk',
      quantity: 1,
      category: 'dairy',
    },
    {
      productId: '345678901234',
      name: 'Organic Eggs',
      quantity: 1,
      category: 'dairy',
    },
  ];

  describe('Budget Optimizer', () => {
    it('should find the lowest total cost', async () => {
      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
        maxStores: 1,
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      expect(result.strategy).toBe('budget');
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.storeCount).toBeLessThanOrEqual(1);
      expect(result.itemCount).toBe(sampleCart.length);
      expect(result.optimizationTime).toBeGreaterThan(0);
    });

    it('should calculate savings correctly', async () => {
      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
        maxStores: 1,
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      expect(result.estimatedSavings).toBeGreaterThanOrEqual(0);
      expect(result.savingsPercentage).toBeGreaterThanOrEqual(0);
      expect(result.savingsPercentage).toBeLessThanOrEqual(100);
    });

    it('should include all cart items in optimization', async () => {
      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
        maxStores: 1,
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      const totalItems = result.storeBreakdown.reduce(
        (sum, store) => sum + store.items.length,
        0
      );

      expect(totalItems).toBe(sampleCart.length);
    });
  });

  describe('Split-Cart Maximizer', () => {
    it('should optimize for best per-item prices', async () => {
      const strategy: OptimizationStrategy = {
        type: 'split-cart',
        deliveryPreference: 'cheapest',
        maxStores: 4,
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      expect(result.strategy).toBe('split-cart');
      expect(result.storeCount).toBeGreaterThan(0);
      expect(result.storeCount).toBeLessThanOrEqual(4);
    });

    it('should respect preferred stores when specified', async () => {
      const strategy: OptimizationStrategy = {
        type: 'split-cart',
        deliveryPreference: 'cheapest',
        maxStores: 4,
        preferredStores: ['kroger', 'walmart'],
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      // All stores should be from preferred list
      const storeIds = result.storeBreakdown.map((s) => s.storeId);
      storeIds.forEach((storeId) => {
        expect(['kroger', 'walmart']).toContain(storeId);
      });
    });
  });

  describe('Convenience Optimizer', () => {
    it('should minimize number of stores', async () => {
      const strategy: OptimizationStrategy = {
        type: 'convenience',
        deliveryPreference: 'fastest',
        maxStores: 2,
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      expect(result.strategy).toBe('convenience');
      expect(result.storeCount).toBeLessThanOrEqual(2);
    });

    it('should prefer single store when possible', async () => {
      const strategy: OptimizationStrategy = {
        type: 'convenience',
        deliveryPreference: 'fastest',
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      // Convenience should prefer fewer stores
      expect(result.storeCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Meal Plan Optimizer', () => {
    it('should balance cost with quality', async () => {
      const strategy: OptimizationStrategy = {
        type: 'meal-plan',
        deliveryPreference: 'single-trip',
        maxStores: 2,
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      expect(result.strategy).toBe('meal-plan');
      expect(result.storeCount).toBeGreaterThan(0);
      expect(result.storeCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Optimization Performance', () => {
    it('should complete optimization within performance targets', async () => {
      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
      };

      const startTime = Date.now();
      const result = await optimizer.optimizeCart(sampleCart, strategy);
      const endTime = Date.now();

      // Should complete in under 2 seconds for typical cart
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle large carts efficiently', async () => {
      const largeCart: CartItem[] = Array.from({ length: 50 }, (_, i) => ({
        productId: `product_${i}`,
        name: `Product ${i}`,
        quantity: Math.floor(Math.random() * 5) + 1,
      }));

      const strategy: OptimizationStrategy = {
        type: 'split-cart',
        deliveryPreference: 'cheapest',
        maxStores: 4,
      };

      const startTime = Date.now();
      const result = await optimizer.optimizeCart(largeCart, strategy);
      const endTime = Date.now();

      // Even large carts should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      expect(result.itemCount).toBe(largeCart.length);
    });
  });

  describe('Delivery Windows', () => {
    it('should provide delivery windows for each store', async () => {
      const strategy: OptimizationStrategy = {
        type: 'split-cart',
        deliveryPreference: 'cheapest',
        maxStores: 3,
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      expect(result.deliveryWindows).toBeDefined();
      expect(result.deliveryWindows.length).toBe(result.storeCount);

      result.deliveryWindows.forEach((window) => {
        expect(window.storeId).toBeDefined();
        expect(window.earliestDelivery).toBeInstanceOf(Date);
        expect(window.latestDelivery).toBeInstanceOf(Date);
        expect(window.deliveryFee).toBeGreaterThan(0);
      });
    });
  });

  describe('Store Breakdown', () => {
    it('should provide detailed breakdown by store', async () => {
      const strategy: OptimizationStrategy = {
        type: 'split-cart',
        deliveryPreference: 'cheapest',
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      expect(result.storeBreakdown).toBeDefined();
      expect(result.storeBreakdown.length).toBeGreaterThan(0);

      result.storeBreakdown.forEach((store) => {
        expect(store.storeId).toBeDefined();
        expect(store.storeName).toBeDefined();
        expect(store.items).toBeInstanceOf(Array);
        expect(store.items.length).toBeGreaterThan(0);
        expect(store.subtotal).toBeGreaterThan(0);
        expect(store.deliveryFee).toBeGreaterThanOrEqual(0);

        store.items.forEach((item) => {
          expect(item.productId).toBeDefined();
          expect(item.name).toBeDefined();
          expect(item.quantity).toBeGreaterThan(0);
          expect(item.price).toBeGreaterThan(0);
          expect(item.totalPrice).toBe(item.price * item.quantity);
        });
      });
    });

    it('should calculate subtotals correctly', async () => {
      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
      };

      const result = await optimizer.optimizeCart(sampleCart, strategy);

      result.storeBreakdown.forEach((store) => {
        const calculatedSubtotal = store.items.reduce(
          (sum, item) => sum + item.totalPrice,
          0
        );
        expect(store.subtotal).toBeCloseTo(calculatedSubtotal, 2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cart gracefully', async () => {
      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
      };

      await expect(optimizer.optimizeCart([], strategy)).rejects.toThrow();
    });

    it('should handle single item cart', async () => {
      const singleItemCart: CartItem[] = [
        {
          productId: '123456789012',
          name: 'Organic Bananas',
          quantity: 1,
        },
      ];

      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
      };

      const result = await optimizer.optimizeCart(singleItemCart, strategy);

      expect(result.itemCount).toBe(1);
      expect(result.storeCount).toBeGreaterThan(0);
    });

    it('should handle items with max price constraints', async () => {
      const constrainedCart: CartItem[] = [
        {
          productId: '123456789012',
          name: 'Organic Bananas',
          quantity: 2,
          maxPrice: 1.0,
        },
      ];

      const strategy: OptimizationStrategy = {
        type: 'budget',
        deliveryPreference: 'cheapest',
      };

      const result = await optimizer.optimizeCart(constrainedCart, strategy);

      // Should still return a result, possibly with items filtered by price
      expect(result).toBeDefined();
    });
  });
});
