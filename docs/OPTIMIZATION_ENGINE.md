# SmartCart Price Optimization Engine

The Price Optimization Engine is the intelligent core of SmartCart that analyzes shopping carts and finds the optimal combination of stores to minimize cost, maximize convenience, or balance between different priorities.

## Overview

The optimization engine implements four distinct strategies, each designed for a specific user persona and shopping behavior:

1. **Budget Optimizer** - Absolute lowest total cost
2. **Convenience Seeker** - Minimize stores and delivery time
3. **Split-Cart Maximizer** - Best price for each individual item
4. **Meal Planner** - Balance cost with quality for healthy eating

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Price Optimization Engine                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Budget     │  │ Convenience  │  │  Split-Cart  │ │
│  │  Optimizer   │  │   Optimizer  │  │  Maximizer   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Meal Planner │  │ Price Fetch  │  │  Delivery    │ │
│  │  Optimizer   │  │   Service    │  │   Windows    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Redis Cache Layer   │
              └───────────────────────┘
```

## API Endpoints

### 1. Optimize Cart

**Endpoint:** `POST /api/optimize`

Optimize a shopping cart based on a specific strategy.

**Request Body:**
```json
{
  "cart": [
    {
      "productId": "123456789012",
      "name": "Organic Bananas",
      "quantity": 2,
      "category": "produce"
    },
    {
      "productId": "234567890123",
      "name": "Whole Milk",
      "quantity": 1,
      "category": "dairy"
    }
  ],
  "strategy": {
    "type": "budget",
    "deliveryPreference": "cheapest",
    "maxStores": 1
  },
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "strategy": "budget",
    "totalCost": 18.43,
    "estimatedSavings": 4.52,
    "savingsPercentage": 19.7,
    "storeBreakdown": [
      {
        "storeId": "walmart",
        "storeName": "Walmart",
        "items": [
          {
            "productId": "123456789012",
            "name": "Organic Bananas",
            "quantity": 2,
            "price": 0.54,
            "totalPrice": 1.08
          },
          {
            "productId": "234567890123",
            "name": "Whole Milk",
            "quantity": 1,
            "price": 3.78,
            "totalPrice": 3.78
          }
        ],
        "subtotal": 4.86,
        "deliveryFee": 7.95,
        "savings": 4.52
      }
    ],
    "deliveryWindows": [
      {
        "storeId": "walmart",
        "earliestDelivery": "2026-01-17T12:00:00Z",
        "latestDelivery": "2026-01-18T10:00:00Z",
        "deliveryFee": 7.95
      }
    ],
    "optimizationTime": 245,
    "itemCount": 2,
    "storeCount": 1
  },
  "meta": {
    "processingTime": 247,
    "itemsOptimized": 2,
    "strategyUsed": "budget"
  }
}
```

### 2. Compare Strategies

**Endpoint:** `POST /api/optimize/compare`

Compare all optimization strategies for a cart to find the best option.

**Request Body:**
```json
{
  "cart": [
    {
      "productId": "123456789012",
      "name": "Organic Bananas",
      "quantity": 2
    },
    {
      "productId": "234567890123",
      "name": "Whole Milk",
      "quantity": 1
    },
    {
      "productId": "345678901234",
      "name": "Organic Eggs",
      "quantity": 1
    }
  ],
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "comparisons": [
      {
        "strategy": "budget",
        "result": {
          "totalCost": 23.78,
          "estimatedSavings": 6.12,
          "savingsPercentage": 20.5,
          "storeCount": 1
        }
      },
      {
        "strategy": "convenience",
        "result": {
          "totalCost": 25.45,
          "estimatedSavings": 4.45,
          "savingsPercentage": 14.9,
          "storeCount": 1
        }
      },
      {
        "strategy": "split-cart",
        "result": {
          "totalCost": 22.10,
          "estimatedSavings": 7.80,
          "savingsPercentage": 26.1,
          "storeCount": 3
        }
      },
      {
        "strategy": "meal-plan",
        "result": {
          "totalCost": 24.32,
          "estimatedSavings": 5.58,
          "savingsPercentage": 18.7,
          "storeCount": 2
        }
      }
    ],
    "recommendation": {
      "strategy": "split-cart",
      "reason": "Offers 26.1% savings ($7.80)",
      "result": {
        "totalCost": 22.10,
        "estimatedSavings": 7.80,
        "savingsPercentage": 26.1,
        "storeCount": 3
      }
    }
  },
  "meta": {
    "processingTime": 892,
    "itemsAnalyzed": 3,
    "strategiesCompared": 4
  }
}
```

### 3. Get Available Strategies

**Endpoint:** `GET /api/optimize/strategies`

Get list of available optimization strategies with descriptions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "budget",
      "name": "Budget Optimizer",
      "description": "Find the absolute lowest total cost across all stores",
      "bestFor": "Families looking to maximize savings on their grocery budget",
      "typicalSavings": "15-25%",
      "storeCount": "1-2 stores",
      "deliveryPreference": "cheapest"
    },
    {
      "id": "convenience",
      "name": "Convenience Seeker",
      "description": "Minimize shopping complexity with single or dual-store orders",
      "bestFor": "Busy professionals who value time over maximum savings",
      "typicalSavings": "5-10%",
      "storeCount": "1 store preferred",
      "deliveryPreference": "fastest"
    },
    {
      "id": "split-cart",
      "name": "Split-Cart Maximizer",
      "description": "Get the best price for each item across multiple stores",
      "bestFor": "Strategic shoppers who want the absolute best deal on every item",
      "typicalSavings": "10-15%",
      "storeCount": "2-4 stores",
      "deliveryPreference": "coordinated"
    },
    {
      "id": "meal-plan",
      "name": "Meal Planner",
      "description": "Balance cost with quality for meal prep and healthy eating",
      "bestFor": "Health-conscious shoppers and meal preppers",
      "typicalSavings": "8-12%",
      "storeCount": "1-2 stores",
      "deliveryPreference": "quality-focused"
    }
  ]
}
```

### 4. Estimate Savings

**Endpoint:** `POST /api/optimize/estimate-savings`

Get a quick savings estimate without full optimization.

**Request Body:**
```json
{
  "cart": [
    {
      "productId": "123456789012",
      "quantity": 2
    },
    {
      "productId": "234567890123",
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "estimatedSavings": 4.52,
    "savingsPercentage": 19.7,
    "totalCost": 18.43,
    "message": "You could save $4.52 (19.7%) with SmartCart optimization"
  }
}
```

## Optimization Strategies Explained

### 1. Budget Optimizer

**Algorithm:** Dynamic programming approach to find absolute lowest total cost

**When to Use:**
- User explicitly wants to minimize spending
- Willing to coordinate multiple deliveries for savings
- Price is the #1 priority

**How it Works:**
1. Fetch prices for all items across all available stores
2. Generate all valid store combinations (up to `maxStores`)
3. Calculate total cost for each combination (items + delivery fees)
4. Select combination with lowest total cost
5. Calculate savings vs. most expensive single-store option

**Typical Results:**
- 15-25% savings compared to random store selection
- Usually results in 1-2 stores
- Delivery fees factored into optimization

**Example Use Case:**
```typescript
const result = await optimizer.optimizeCart(cart, {
  type: 'budget',
  deliveryPreference: 'cheapest',
  maxStores: 1  // Strictly minimize total cost
});
```

### 2. Convenience Seeker

**Algorithm:** Minimize store count while maintaining reasonable pricing

**When to Use:**
- User values time and simplicity
- Prefers single-store shopping
- Willing to pay slightly more for convenience

**How it Works:**
1. Identify stores that have ALL cart items in stock
2. If no single store has everything, find best 2-store combination
3. Prioritize stores with fastest delivery times
4. Balance cost vs. convenience

**Typical Results:**
- 5-10% savings
- Almost always results in 1 store
- Fastest delivery times

**Example Use Case:**
```typescript
const result = await optimizer.optimizeCart(cart, {
  type: 'convenience',
  deliveryPreference: 'fastest',
  maxStores: 1,
  preferredStores: ['kroger', 'safeway']  // Optional: prefer specific stores
});
```

### 3. Split-Cart Maximizer

**Algorithm:** Assign each item to its lowest-price store independently

**When to Use:**
- User wants absolute best price on every item
- Willing to coordinate deliveries from multiple stores
- Maximum savings is the goal

**How it Works:**
1. For each item, find the lowest price across all stores
2. Assign item to that store
3. Group items by store
4. Calculate delivery coordination
5. Provide unified delivery window options

**Typical Results:**
- 10-20% savings (highest among strategies)
- 2-4 stores typically
- May require coordinating multiple deliveries

**Example Use Case:**
```typescript
const result = await optimizer.optimizeCart(cart, {
  type: 'split-cart',
  deliveryPreference: 'cheapest',
  maxStores: 4  // Allow up to 4 stores for maximum savings
});
```

### 4. Meal Planner

**Algorithm:** Balance cost with quality for nutritional goals

**When to Use:**
- User is meal prepping or health-focused
- Quality of produce/organic items matters
- Willing to pay premium for better quality

**How it Works:**
1. Identify organic/fresh items in cart
2. For quality items, prefer stores known for produce quality (even if 10% more expensive)
3. For non-quality items, optimize for lowest price
4. Group items to minimize stores while maintaining quality

**Typical Results:**
- 8-12% savings
- 1-2 stores (balanced approach)
- Higher quality items at quality-focused stores

**Example Use Case:**
```typescript
const result = await optimizer.optimizeCart(cart, {
  type: 'meal-plan',
  deliveryPreference: 'single-trip',
  maxStores: 2
});
```

## Performance Characteristics

### Optimization Speed

| Cart Size | Typical Optimization Time | Target |
|-----------|---------------------------|--------|
| 1-10 items | 50-200ms | <500ms |
| 11-25 items | 200-500ms | <1s |
| 26-50 items | 500-1000ms | <2s |
| 50+ items | 1-2s | <5s |

### Caching Strategy

The optimization engine uses Redis caching with a 10-minute TTL:

- **Cache Key:** Hash of cart items + strategy type
- **TTL:** 600 seconds (10 minutes)
- **Hit Rate:** Typically 40-60% for repeat customers
- **Performance Gain:** 10-20x faster for cached results

### Scaling Considerations

The engine is designed to handle:
- **Concurrent Requests:** 100+ simultaneous optimizations
- **Store Count:** Scales linearly with number of stores (tested up to 20 stores)
- **Item Count:** Efficient up to 100 items per cart
- **API Calls:** Parallel price fetching for sub-500ms response times

## Integration Examples

### Frontend Integration (Next.js)

```typescript
import { searchProducts } from '@/lib/api/products';
import { optimizeCart } from '@/lib/api/optimization';

async function handleOptimizeCart() {
  const cart = [
    { productId: '123456789012', name: 'Bananas', quantity: 2 },
    { productId: '234567890123', name: 'Milk', quantity: 1 },
  ];

  const result = await optimizeCart({
    cart,
    strategy: {
      type: 'budget',
      deliveryPreference: 'cheapest',
    },
  });

  console.log(`Save $${result.estimatedSavings.toFixed(2)}!`);
  console.log(`Total: $${result.totalCost.toFixed(2)}`);
}
```

### React Component

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { optimizeCart } from '@/lib/api/optimization';

export function CartOptimizer({ cart }) {
  const [strategy, setStrategy] = useState('budget');

  const { data, isLoading } = useQuery({
    queryKey: ['optimize', cart, strategy],
    queryFn: () => optimizeCart({
      cart,
      strategy: {
        type: strategy,
        deliveryPreference: 'cheapest',
      },
    }),
    enabled: cart.length > 0,
  });

  if (isLoading) return <div>Optimizing your cart...</div>;

  return (
    <div className="optimization-results">
      <h3>Optimization Results</h3>
      <p>Strategy: {data.strategy}</p>
      <p>Total Cost: ${data.totalCost.toFixed(2)}</p>
      <p>You Save: ${data.estimatedSavings.toFixed(2)} ({data.savingsPercentage.toFixed(1)}%)</p>

      <h4>Store Breakdown:</h4>
      {data.storeBreakdown.map((store) => (
        <div key={store.storeId}>
          <h5>{store.storeName}</h5>
          <ul>
            {store.items.map((item) => (
              <li key={item.productId}>
                {item.name} x{item.quantity} - ${item.totalPrice.toFixed(2)}
              </li>
            ))}
          </ul>
          <p>Subtotal: ${store.subtotal.toFixed(2)}</p>
          <p>Delivery: ${store.deliveryFee.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

The optimization engine handles various error scenarios:

```typescript
try {
  const result = await optimizeCart(cart, strategy);
} catch (error) {
  if (error.code === 'EMPTY_CART') {
    // Cart has no items
  } else if (error.code === 'NO_PRICES_AVAILABLE') {
    // Could not fetch prices for items
  } else if (error.code === 'OPTIMIZATION_TIMEOUT') {
    // Optimization took too long (>5 seconds)
  } else {
    // Generic error
  }
}
```

## Testing

Run the optimization engine tests:

```bash
cd services/catalog-service
npm test tests/optimization.test.ts
```

### Test Coverage

- ✅ Budget optimization algorithm
- ✅ Split-cart optimization algorithm
- ✅ Convenience optimization algorithm
- ✅ Meal plan optimization algorithm
- ✅ Savings calculations
- ✅ Store breakdown accuracy
- ✅ Delivery window generation
- ✅ Performance benchmarks
- ✅ Edge cases (empty cart, single item, etc.)

## Future Enhancements

1. **Machine Learning Integration**
   - Learn user preferences over time
   - Predict optimal strategy per user
   - Personalized savings recommendations

2. **Dynamic Delivery Coordination**
   - Real-time delivery slot availability
   - Automatic delivery window optimization
   - Multi-store delivery bundling

3. **Advanced Constraints**
   - Nutritional requirements
   - Dietary restrictions
   - Brand preferences
   - Store loyalty programs

4. **Real-Time Price Updates**
   - WebSocket integration for live pricing
   - Flash sale detection
   - Inventory-based optimization

## Support

For questions or issues with the optimization engine:

- **Documentation:** `/docs/OPTIMIZATION_ENGINE.md`
- **API Reference:** `/docs/API.md`
- **GitHub Issues:** https://github.com/TheBeardNerd/SmartCart/issues
- **Email:** support@smartcart.com
