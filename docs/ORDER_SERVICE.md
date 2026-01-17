# Order Service Documentation

## Overview

The Order Service is the central orchestration hub for SmartCart's order processing, built with NestJS. It manages the complete order lifecycle from creation to delivery, coordinates multi-store fulfillment, and integrates with all other platform services.

## Features

### Order Management
- Order creation with validation
- Multi-store order splitting and coordination
- Order status tracking and history
- Real-time order updates via notifications
- Order cancellation and refunds

### State Machine
- Robust order state transitions
- Validation of status changes
- Terminal state handling
- Automatic notification triggers

### Multi-Store Fulfillment
- Automatic order splitting by store
- Independent store fulfillment tracking
- Coordinated delivery windows
- Store-specific pricing breakdown

### Integration
- User Service - Authentication and profile data
- Catalog Service - Product and store information
- Notification Service - Real-time order updates
- Payment Service - Payment processing (future)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Order Service (NestJS)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Order State Machine                       │  │
│  │  PENDING → PAYMENT_PROCESSING → CONFIRMED → ...      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Orders     │  │    Store     │  │   Notification   │ │
│  │   Service    │  │  Fulfillment │  │   Integration    │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Prisma ORM + PostgreSQL Database              │  │
│  │    Orders │ OrderItems │ StoreFulfillments            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Order Model

```prisma
model Order {
  id                String         @id @default(uuid())
  orderNumber       String         @unique
  userId            String

  // Status
  status            OrderStatus    @default(PENDING)
  paymentStatus     PaymentStatus  @default(PENDING)
  fulfillmentType   FulfillmentType

  // Pricing
  subtotal          Decimal
  tax               Decimal
  deliveryFee       Decimal
  serviceFee        Decimal
  discount          Decimal
  total             Decimal

  // Delivery
  deliveryAddress   Json?
  deliveryWindow    Json?
  estimatedDelivery DateTime?
  actualDelivery    DateTime?

  // Relations
  items             OrderItem[]
  storeFulfillments StoreFulfillment[]
  statusHistory     OrderStatusHistory[]

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}
```

### Order Status Enum

```typescript
enum OrderStatus {
  PENDING           // Order created, awaiting payment
  PAYMENT_PROCESSING // Payment in progress
  CONFIRMED         // Payment confirmed
  PREPARING         // Being prepared by stores
  READY_FOR_PICKUP  // Ready for delivery/pickup
  OUT_FOR_DELIVERY  // In transit
  DELIVERED         // Successfully delivered
  CANCELLED         // Order cancelled
  FAILED            // Order failed
  REFUNDED          // Order refunded
}
```

### Fulfillment Type

```typescript
enum FulfillmentType {
  DELIVERY          // Home delivery
  PICKUP            // Store pickup
  CURBSIDE          // Curbside pickup
}
```

## REST API Endpoints

Base URL: `http://localhost:3003/api/orders`

### Create Order

**Endpoint:** `POST /api/orders`

Create a new order with items from one or more stores.

**Request Body:**
```json
{
  "userId": "user_123",
  "fulfillmentType": "DELIVERY",
  "items": [
    {
      "productId": "prod_123",
      "productName": "Organic Bananas",
      "productImage": "https://example.com/bananas.jpg",
      "sku": "BAN-ORG-001",
      "storeId": "store_kroger",
      "storeName": "Kroger",
      "quantity": 2,
      "unitPrice": 1.99,
      "attributes": {
        "weight": "1 lb",
        "organic": true
      }
    },
    {
      "productId": "prod_456",
      "productName": "Whole Milk",
      "storeId": "store_walmart",
      "storeName": "Walmart",
      "quantity": 1,
      "unitPrice": 3.99
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "apartment": "Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94102",
    "instructions": "Leave at door"
  },
  "deliveryWindow": {
    "startTime": "2026-01-18T14:00:00Z",
    "endTime": "2026-01-18T16:00:00Z"
  },
  "customerNotes": "Please ring doorbell",
  "contactPhone": "+14155551234",
  "contactEmail": "customer@example.com",
  "optimizationStrategy": "budget",
  "estimatedSavings": 4.50,
  "paymentMethodId": "pm_123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ord_abc123",
    "orderNumber": "ORD-L9XYZ123",
    "userId": "user_123",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "fulfillmentType": "DELIVERY",
    "subtotal": 7.97,
    "tax": 0.64,
    "deliveryFee": 4.99,
    "serviceFee": 2.99,
    "discount": 0,
    "total": 16.59,
    "estimatedDelivery": "2026-01-18T15:00:00Z",
    "items": [...],
    "storeFulfillments": [
      {
        "id": "sf_1",
        "storeId": "store_kroger",
        "storeName": "Kroger",
        "status": "PENDING",
        "subtotal": 3.98,
        "tax": 0.32,
        "deliveryFee": 2.50,
        "total": 6.80
      },
      {
        "id": "sf_2",
        "storeId": "store_walmart",
        "storeName": "Walmart",
        "status": "PENDING",
        "subtotal": 3.99,
        "tax": 0.32,
        "deliveryFee": 2.49,
        "total": 6.80
      }
    ],
    "createdAt": "2026-01-17T12:00:00Z",
    "updatedAt": "2026-01-17T12:00:00Z"
  }
}
```

**Features:**
- Automatically calculates tax, delivery fees, and total
- Splits order into store fulfillments
- Generates unique order number
- Sends order confirmation notification
- Creates initial status history entry

---

### Get All Orders for User

**Endpoint:** `GET /api/orders?userId={userId}&limit={limit}&offset={offset}`

Retrieve all orders for a specific user.

**Query Parameters:**
- `userId` (required) - User ID
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ord_abc123",
      "orderNumber": "ORD-L9XYZ123",
      "status": "DELIVERED",
      "total": 16.59,
      "createdAt": "2026-01-17T12:00:00Z",
      "items": [...]
    }
  ],
  "count": 1
}
```

---

### Get Order by ID

**Endpoint:** `GET /api/orders/:id?userId={userId}`

Retrieve a specific order by ID.

**URL Parameters:**
- `id` (required) - Order ID

**Query Parameters:**
- `userId` (optional) - User ID for ownership verification

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ord_abc123",
    "orderNumber": "ORD-L9XYZ123",
    "status": "OUT_FOR_DELIVERY",
    "total": 16.59,
    "items": [...],
    "storeFulfillments": [...],
    "statusHistory": [
      {
        "id": "hist_1",
        "fromStatus": "CONFIRMED",
        "toStatus": "PREPARING",
        "reason": "Order accepted by store",
        "changedBy": "system",
        "createdAt": "2026-01-17T12:30:00Z"
      }
    ]
  }
}
```

---

### Get Order by Order Number

**Endpoint:** `GET /api/orders/number/:orderNumber?userId={userId}`

Retrieve order by order number (customer-friendly lookup).

**URL Parameters:**
- `orderNumber` (required) - Order number (e.g., ORD-L9XYZ123)

**Query Parameters:**
- `userId` (optional) - User ID for ownership verification

**Response:** Same as Get Order by ID

---

### Update Order Status

**Endpoint:** `PATCH /api/orders/:id/status`

Update the status of an order (admin/system operation).

**Request Body:**
```json
{
  "status": "CONFIRMED",
  "reason": "Payment successful",
  "notes": "Payment processed via Stripe",
  "changedBy": "system"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ord_abc123",
    "status": "CONFIRMED",
    "confirmedAt": "2026-01-17T12:05:00Z",
    ...
  },
  "message": "Order status updated to CONFIRMED"
}
```

**Valid Status Transitions:**

| From                | To                                           |
|---------------------|----------------------------------------------|
| PENDING             | PAYMENT_PROCESSING, CANCELLED, FAILED        |
| PAYMENT_PROCESSING  | CONFIRMED, FAILED, CANCELLED                 |
| CONFIRMED           | PREPARING, CANCELLED                         |
| PREPARING           | READY_FOR_PICKUP, OUT_FOR_DELIVERY, CANCELLED|
| READY_FOR_PICKUP    | DELIVERED, CANCELLED                         |
| OUT_FOR_DELIVERY    | DELIVERED, FAILED                            |
| DELIVERED           | REFUNDED                                     |
| CANCELLED           | REFUNDED                                     |
| FAILED              | PENDING, REFUNDED                            |
| REFUNDED            | (terminal state)                             |

**Notes:**
- Invalid transitions will return `400 Bad Request`
- Status changes trigger notifications to customer
- All changes are logged in status history

---

### Cancel Order

**Endpoint:** `POST /api/orders/:id/cancel`

Cancel an order (customer operation).

**Request Body:**
```json
{
  "userId": "user_123",
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ord_abc123",
    "status": "CANCELLED",
    "cancelledAt": "2026-01-17T12:10:00Z",
    ...
  },
  "message": "Order cancelled successfully"
}
```

**Cancellation Rules:**
- Cannot cancel DELIVERED, CANCELLED, or REFUNDED orders
- Triggers cancellation notification
- Updates all store fulfillments to CANCELLED
- May initiate refund process

---

### Get Order Tracking

**Endpoint:** `GET /api/orders/:id/tracking?userId={userId}`

Get detailed tracking information for an order.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-L9XYZ123",
    "status": "OUT_FOR_DELIVERY",
    "estimatedDelivery": "2026-01-18T15:00:00Z",
    "actualDelivery": null,
    "storeFulfillments": [
      {
        "storeId": "store_kroger",
        "storeName": "Kroger",
        "status": "OUT_FOR_DELIVERY",
        "trackingNumber": "TRK-KRO-123456",
        "estimatedDelivery": "2026-01-18T15:00:00Z"
      },
      {
        "storeId": "store_walmart",
        "storeName": "Walmart",
        "status": "PREPARING",
        "trackingNumber": null,
        "estimatedDelivery": "2026-01-18T15:30:00Z"
      }
    ],
    "statusHistory": [
      {
        "fromStatus": null,
        "toStatus": "PENDING",
        "reason": "Order created",
        "createdAt": "2026-01-17T12:00:00Z"
      },
      {
        "fromStatus": "PENDING",
        "toStatus": "CONFIRMED",
        "reason": "Payment successful",
        "createdAt": "2026-01-17T12:05:00Z"
      },
      {
        "fromStatus": "CONFIRMED",
        "toStatus": "PREPARING",
        "reason": "Order accepted by stores",
        "createdAt": "2026-01-17T12:30:00Z"
      },
      {
        "fromStatus": "PREPARING",
        "toStatus": "OUT_FOR_DELIVERY",
        "reason": "Dispatched from Kroger",
        "createdAt": "2026-01-17T14:00:00Z"
      }
    ]
  }
}
```

---

## Order State Machine

The Order Service implements a robust state machine to ensure valid order status transitions.

### State Diagram

```
PENDING
  ├─→ PAYMENT_PROCESSING
  │     ├─→ CONFIRMED
  │     │     ├─→ PREPARING
  │     │     │     ├─→ READY_FOR_PICKUP → DELIVERED → REFUNDED
  │     │     │     └─→ OUT_FOR_DELIVERY → DELIVERED → REFUNDED
  │     │     │                            └─→ FAILED → REFUNDED
  │     │     └─→ CANCELLED → REFUNDED
  │     ├─→ FAILED → PENDING (retry)
  │     │         └─→ REFUNDED
  │     └─→ CANCELLED → REFUNDED
  ├─→ CANCELLED → REFUNDED
  └─→ FAILED → REFUNDED
```

### State Machine Methods

```typescript
// Check if transition is valid
stateMachine.canTransition(currentStatus, newStatus): boolean

// Validate and throw if invalid
stateMachine.validateTransition(currentStatus, newStatus): void

// Get valid next states
stateMachine.getValidTransitions(currentStatus): OrderStatus[]

// Check if status is terminal
stateMachine.isTerminalStatus(status): boolean

// Check if customer should be notified
stateMachine.shouldNotifyCustomer(status): boolean

// Check if order can be cancelled
stateMachine.canCancel(status): boolean

// Check if order can be refunded
stateMachine.canRefund(status): boolean
```

---

## Pricing Calculation

### Order Pricing Breakdown

```typescript
{
  "subtotal": 7.97,      // Sum of all items
  "tax": 0.64,           // subtotal × tax rate (8%)
  "deliveryFee": 4.99,   // Base delivery fee (free over $35)
  "serviceFee": 2.99,    // Platform service fee
  "discount": 0,         // Promo code discounts (future)
  "total": 16.59         // Sum of all above
}
```

### Fee Rules

1. **Delivery Fee**
   - Base fee: $4.99
   - Free delivery threshold: $35.00 subtotal
   - Split evenly across stores for multi-store orders

2. **Service Fee**
   - Flat fee: $2.99 per order
   - Applied once per order regardless of store count

3. **Tax Rate**
   - Configurable via `DEFAULT_TAX_RATE` environment variable
   - Default: 8% (0.08)
   - Applied to subtotal only (not fees)

4. **Discounts** (Future)
   - Promo codes
   - First-time user discounts
   - Loyalty rewards

---

## Multi-Store Fulfillment

When an order contains items from multiple stores, the service automatically:

1. **Groups items by store**
2. **Creates separate StoreFulfillment records**
3. **Splits delivery fees proportionally**
4. **Tracks each store independently**

### Example Multi-Store Order

**Order Items:**
- 2x Bananas from Kroger ($1.99 each)
- 1x Milk from Walmart ($3.99)

**Store Fulfillments Created:**

```json
{
  "storeFulfillments": [
    {
      "storeId": "store_kroger",
      "storeName": "Kroger",
      "subtotal": 3.98,
      "tax": 0.32,
      "deliveryFee": 2.50,  // Split delivery fee
      "total": 6.80,
      "status": "PREPARING",
      "estimatedDelivery": "2026-01-18T15:00:00Z"
    },
    {
      "storeId": "store_walmart",
      "storeName": "Walmart",
      "subtotal": 3.99,
      "tax": 0.32,
      "deliveryFee": 2.49,  // Split delivery fee
      "total": 6.80,
      "status": "CONFIRMED",
      "estimatedDelivery": "2026-01-18T15:30:00Z"
    }
  ]
}
```

**Benefits:**
- Independent tracking per store
- Flexible delivery windows
- Better customer visibility
- Easier troubleshooting

---

## Notification Integration

The Order Service integrates with the Notification Service to send real-time updates.

### Automatic Notifications

1. **Order Created** (PENDING)
   - Email: Order confirmation with items and total
   - WebSocket: Real-time confirmation to user

2. **Order Confirmed** (CONFIRMED)
   - Email: Payment confirmed, order accepted
   - WebSocket: Status update

3. **Order Preparing** (PREPARING)
   - WebSocket: "Your order is being prepared"

4. **Out for Delivery** (OUT_FOR_DELIVERY)
   - Email: Order on the way
   - SMS: Delivery notification (if enabled)
   - WebSocket: Real-time tracking update

5. **Delivered** (DELIVERED)
   - Email: Delivery confirmation
   - SMS: "Your order has been delivered"
   - WebSocket: Completion notification

6. **Cancelled** (CANCELLED)
   - Email: Cancellation confirmation
   - WebSocket: Cancellation notice

---

## Configuration

### Environment Variables

```bash
# Server
PORT=3003
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smartcart_orders

# JWT (for future auth middleware)
JWT_SECRET=your-super-secret-jwt-key

# Service URLs
CATALOG_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005

# Redis
REDIS_URL=redis://localhost:6379

# Pricing Configuration
DEFAULT_TAX_RATE=0.08
BASE_DELIVERY_FEE=4.99
SERVICE_FEE=2.99
FREE_DELIVERY_THRESHOLD=35.00

# Order Configuration
ORDER_TIMEOUT_MINUTES=30
MAX_ITEMS_PER_ORDER=100
```

---

## Integration Examples

### Frontend (Next.js/React)

#### Create Order

```typescript
// app/checkout/actions.ts
'use server';

import axios from 'axios';

export async function createOrder(orderData) {
  try {
    const response = await axios.post(
      'http://localhost:3003/api/orders',
      orderData
    );

    return {
      success: true,
      order: response.data.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to create order'
    };
  }
}
```

#### Track Order

```typescript
// hooks/useOrderTracking.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useOrderTracking(orderId: string, userId: string) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3003/api/orders/${orderId}/tracking`,
          { params: { userId } }
        );
        setTracking(response.data.data);
      } catch (error) {
        console.error('Failed to fetch tracking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, [orderId, userId]);

  return { tracking, loading };
}
```

### Backend (Catalog Service Integration)

#### Validate Product Availability

```typescript
// services/catalog-service/src/orders/order-validator.ts
import axios from 'axios';

export async function validateOrderItems(items: OrderItem[]) {
  const productIds = items.map(item => item.productId);

  // Check inventory for all products
  const response = await axios.post(
    'http://localhost:3001/api/products/batch-check',
    { productIds }
  );

  const availability = response.data.data;

  // Validate each item
  for (const item of items) {
    const product = availability.find(p => p.id === item.productId);

    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    if (!product.inStock) {
      throw new Error(`${product.name} is out of stock`);
    }

    if (product.quantity < item.quantity) {
      throw new Error(`Only ${product.quantity} ${product.name} available`);
    }
  }

  return true;
}
```

---

## Health Checks

### Basic Health Check

**Endpoint:** `GET /health`

```json
{
  "status": "ok",
  "timestamp": "2026-01-17T12:00:00Z",
  "service": "order-service"
}
```

### Detailed Health Check

**Endpoint:** `GET /health/detailed`

```json
{
  "status": "ok",
  "timestamp": "2026-01-17T12:00:00Z",
  "service": "order-service",
  "dependencies": {
    "database": "ok"
  }
}
```

### Readiness Probe

**Endpoint:** `GET /ready`

```json
{
  "ready": true
}
```

### Liveness Probe

**Endpoint:** `GET /live`

```json
{
  "alive": true
}
```

---

## Testing

### Run Tests

```bash
cd services/order-service
npm test
```

### Example Test

```typescript
describe('OrdersService', () => {
  it('should create order successfully', async () => {
    const orderDto = {
      userId: 'user123',
      fulfillmentType: FulfillmentType.DELIVERY,
      items: [
        {
          productId: 'prod123',
          productName: 'Bananas',
          storeId: 'store1',
          storeName: 'Kroger',
          quantity: 2,
          unitPrice: 1.99
        }
      ],
      contactEmail: 'test@example.com'
    };

    const order = await service.create(orderDto);

    expect(order.orderNumber).toBeDefined();
    expect(order.status).toBe('PENDING');
    expect(order.total).toBeGreaterThan(0);
  });
});
```

---

## Error Handling

### Common Errors

#### 400 Bad Request

**Invalid transition:**
```json
{
  "statusCode": 400,
  "message": "Cannot transition from DELIVERED to PENDING. Valid transitions: REFUNDED",
  "error": "Bad Request"
}
```

**Empty order:**
```json
{
  "statusCode": 400,
  "message": "Order must contain at least one item",
  "error": "Bad Request"
}
```

#### 404 Not Found

**Order not found:**
```json
{
  "statusCode": 404,
  "message": "Order with ID ord_123 not found",
  "error": "Not Found"
}
```

**Unauthorized access:**
```json
{
  "statusCode": 404,
  "message": "Order ORD-ABC123 not found",
  "error": "Not Found"
}
```

---

## Performance Considerations

### Database Indexes

```prisma
@@index([userId])       // Fast user order lookups
@@index([orderNumber])  // Fast order number lookups
@@index([status])       // Status-based queries
@@index([createdAt])    // Date range queries
```

### Optimization Tips

1. **Batch Queries**
   - Use `include` to fetch related data in one query
   - Avoid N+1 queries

2. **Caching** (Future)
   - Cache order status in Redis
   - Cache user order counts
   - TTL: 5-10 minutes

3. **Pagination**
   - Always use `limit` and `offset`
   - Default limit: 50 orders

4. **Async Notifications**
   - Notifications sent asynchronously
   - Don't block order creation

---

## Security

### Data Protection

1. **User Ownership Verification**
   - Optional `userId` parameter validates ownership
   - Returns 404 instead of 403 to prevent enumeration

2. **Input Validation**
   - All DTOs validated with class-validator
   - Whitelist mode enabled
   - Transform types automatically

3. **SQL Injection Prevention**
   - Prisma ORM prevents SQL injection
   - All queries parameterized

### Future Enhancements

1. **JWT Authentication Middleware**
2. **Rate Limiting**
3. **Audit Logging**
4. **PCI Compliance** (with Payment Service)

---

## Future Enhancements

1. **Payment Integration**
   - Stripe payment processing
   - PayPal support
   - Payment authorization and capture

2. **Order Modifications**
   - Add/remove items before confirmation
   - Update delivery address
   - Change delivery window

3. **Subscriptions**
   - Recurring orders
   - Auto-reorder favorites

4. **Advanced Features**
   - Order splitting (partial delivery)
   - Substitution handling
   - Special instructions per item
   - Tipping for delivery drivers

---

## Troubleshooting

### Order Creation Fails

**Problem:** Order creation returns 400 Bad Request

**Solutions:**
- Verify all required fields are provided
- Check item prices are numbers
- Ensure quantities are positive integers
- Validate delivery address format

### Status Update Fails

**Problem:** Status update returns 400 Bad Request

**Solutions:**
- Check current order status
- Verify transition is valid (see state machine)
- Ensure order isn't in terminal state

### Notifications Not Sent

**Problem:** Customer not receiving order updates

**Solutions:**
- Verify Notification Service is running
- Check `NOTIFICATION_SERVICE_URL` is correct
- Review notification service logs
- Ensure contact email/phone is provided

---

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [SmartCart documentation](../docs/)
- Check service logs
- Verify environment configuration

---

**Built with:**
- NestJS - Progressive Node.js framework
- Prisma - Next-generation ORM
- PostgreSQL - Relational database
- TypeScript - Type-safe development
