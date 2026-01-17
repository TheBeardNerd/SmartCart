# Notification Service Documentation

## Overview

The Notification Service is a real-time communication hub for SmartCart, built with Express.js and Socket.io. It handles:

- **Real-time notifications** via WebSocket connections
- **Email notifications** via SendGrid
- **SMS notifications** via Twilio
- **Background job processing** via BullMQ
- **Horizontal scaling** via Redis adapter

## Features

### Real-Time Communication
- WebSocket connections with JWT authentication
- Redis adapter for horizontal scaling
- User-specific rooms and subscriptions
- Price updates, cart sync, and order notifications

### Asynchronous Notifications
- Email service with HTML templates
- SMS service for critical updates
- Background job queue for reliable delivery
- Priority-based message processing

### Production Ready
- Comprehensive health checks
- Connection tracking and statistics
- Graceful error handling
- Full logging and monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Service                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │   Express    │  │  Socket.io   │  │   BullMQ Queue    │ │
│  │  REST API    │  │  WebSocket   │  │  Background Jobs  │ │
│  └──────────────┘  └──────────────┘  └───────────────────┘ │
│         │                  │                    │            │
│         └──────────────────┴────────────────────┘            │
│                            │                                 │
│                    ┌───────┴────────┐                       │
│                    │      Redis      │                       │
│                    │  Pub/Sub + Jobs │                       │
│                    └────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
           │                │                │
    ┌──────┴───┐    ┌──────┴───────┐  ┌────┴──────┐
    │ SendGrid │    │    Twilio    │  │  Clients  │
    │  Email   │    │     SMS      │  │ WebSocket │
    └──────────┘    └──────────────┘  └───────────┘
```

## REST API Endpoints

Base URL: `http://localhost:3004/api`

### Price Update Notification

**Endpoint:** `POST /api/notifications/price-update`

Trigger a real-time price update notification for a product.

**Request Body:**
```json
{
  "productId": "prod_123",
  "oldPrice": 2.99,
  "newPrice": 1.99,
  "store": "Kroger",
  "inStock": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Price update notification sent"
}
```

**WebSocket Event Emitted:**
- Event: `price:update`
- Room: `price:{productId}`
- Data includes percentage change and stock status

---

### Cart Update Notification

**Endpoint:** `POST /api/notifications/cart-update`

Synchronize cart updates across user devices.

**Request Body:**
```json
{
  "userId": "user_123",
  "cartData": {
    "items": [
      {
        "productId": "prod_123",
        "name": "Organic Bananas",
        "quantity": 2,
        "price": 1.99
      }
    ],
    "total": 3.98,
    "itemCount": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cart update notification sent"
}
```

**WebSocket Event Emitted:**
- Event: `cart:update`
- Room: `cart:{userId}`
- Syncs cart across all user's connected devices

---

### Order Status Update

**Endpoint:** `POST /api/notifications/order-update`

Send order status update notifications.

**Request Body:**
```json
{
  "userId": "user_123",
  "orderNumber": "ORD-789",
  "status": "delivered",
  "total": 50.99,
  "estimatedDelivery": "2026-01-18T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order update notification sent"
}
```

**Notifications Sent:**
- WebSocket: Real-time notification to user
- Email: Queued email with order details

---

### Order Confirmation

**Endpoint:** `POST /api/notifications/order-confirmation`

Send order confirmation with full details.

**Request Body:**
```json
{
  "userId": "user_123",
  "email": "customer@example.com",
  "orderNumber": "ORD-456",
  "total": 75.50,
  "items": [
    {
      "name": "Organic Bananas",
      "quantity": 2,
      "price": 1.99
    },
    {
      "name": "Whole Milk",
      "quantity": 1,
      "price": 3.99
    }
  ],
  "estimatedDelivery": "2026-01-18T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order confirmation sent"
}
```

**Notifications Sent:**
- WebSocket: Real-time confirmation
- Email: HTML email with order summary

---

### Welcome Notification

**Endpoint:** `POST /api/notifications/welcome`

Send welcome notification to new users.

**Request Body:**
```json
{
  "userId": "user_123",
  "email": "newuser@example.com",
  "firstName": "John"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Welcome notification sent"
}
```

**Notifications Sent:**
- WebSocket: Real-time welcome message
- Email: Welcome email with getting started guide

---

### Price Drop Alert

**Endpoint:** `POST /api/notifications/price-drop-alert`

Alert users about price drops on tracked items.

**Request Body:**
```json
{
  "userId": "user_123",
  "email": "user@example.com",
  "productName": "Organic Bananas",
  "oldPrice": 2.99,
  "newPrice": 1.99,
  "savings": 1.00,
  "store": "Kroger"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Price drop alert sent"
}
```

**Notifications Sent:**
- WebSocket: Real-time price drop notification
- Email: Price drop alert with savings

---

### Broadcast Announcement

**Endpoint:** `POST /api/notifications/broadcast`

Broadcast system-wide announcements.

**Request Body:**
```json
{
  "title": "New Feature Available",
  "message": "Check out our new meal planning feature!",
  "type": "info"
}
```

**Type Options:** `"info"`, `"warning"`, `"success"`

**Response:**
```json
{
  "success": true,
  "message": "Announcement broadcasted"
}
```

**WebSocket Event Emitted:**
- Event: `announcement`
- Broadcast to all connected clients

---

### Service Statistics

**Endpoint:** `GET /api/notifications/stats`

Get notification service statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConnections": 42,
    "timestamp": "2026-01-17T12:00:00Z"
  }
}
```

---

## WebSocket API

### Connection

**URL:** `ws://localhost:3004`

**Authentication:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3004', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client Events (Emit)

#### Subscribe to Price Updates
```javascript
socket.emit('subscribe:prices', {
  productIds: ['prod_123', 'prod_456']
});

// Response
socket.on('subscribed:prices', (data) => {
  console.log(`Subscribed to ${data.count} products`);
});
```

#### Unsubscribe from Price Updates
```javascript
socket.emit('unsubscribe:prices', {
  productIds: ['prod_123']
});

socket.on('unsubscribed:prices', (data) => {
  console.log('Unsubscribed from products:', data.productIds);
});
```

#### Subscribe to Cart Updates
```javascript
socket.emit('subscribe:cart');

socket.on('subscribed:cart', (data) => {
  console.log('Subscribed to cart updates for user:', data.userId);
});
```

#### Subscribe to Order Updates
```javascript
socket.emit('subscribe:orders');

socket.on('subscribed:orders', (data) => {
  console.log('Subscribed to order updates');
});
```

#### Subscribe to All Notifications
```javascript
socket.emit('subscribe:notifications');

socket.on('subscribed:notifications', (data) => {
  console.log('Subscribed to all notifications');
});
```

### Server Events (Listen)

#### Connection Established
```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data.message);
  console.log('Time:', data.timestamp);
});
```

#### Price Update
```javascript
socket.on('price:update', (data) => {
  console.log('Price update:', data);
  // {
  //   productId: 'prod_123',
  //   oldPrice: 2.99,
  //   newPrice: 1.99,
  //   store: 'Kroger',
  //   percentageChange: -33.4,
  //   inStock: true,
  //   timestamp: '2026-01-17T12:00:00Z'
  // }
});
```

#### Cart Update
```javascript
socket.on('cart:update', (data) => {
  console.log('Cart updated:', data);
  // Update local cart state
});
```

#### Order Update
```javascript
socket.on('order:update', (data) => {
  console.log('Order update:', data);
  // {
  //   orderNumber: 'ORD-123',
  //   status: 'delivered',
  //   total: 50.99,
  //   estimatedDelivery: '2026-01-18T14:00:00Z',
  //   timestamp: '2026-01-17T12:00:00Z'
  // }
});
```

#### General Notification
```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data);
  // {
  //   type: 'order_confirmed',
  //   title: 'Order Confirmed',
  //   message: 'Your order #ORD-123 has been confirmed!',
  //   orderData: {...},
  //   timestamp: '2026-01-17T12:00:00Z'
  // }
});
```

#### System Announcement
```javascript
socket.on('announcement', (data) => {
  console.log('Announcement:', data);
  // {
  //   title: 'New Feature Available',
  //   message: 'Check out our new meal planning feature!',
  //   type: 'info',
  //   timestamp: '2026-01-17T12:00:00Z'
  // }
});
```

---

## Email Templates

### Welcome Email

**Trigger:** User registration

**Content:**
- Welcome message with user's first name
- Quick start guide
- Feature highlights

**Example:**
```html
Welcome to SmartCart, John!

Thank you for joining SmartCart. Start saving money on your groceries today!

Get started by:
- Adding items to your cart
- Using our price optimization engine
- Comparing prices across multiple stores

Happy shopping!
The SmartCart Team
```

### Order Confirmation

**Trigger:** Order placement

**Content:**
- Order number
- Total amount
- Itemized list
- Estimated delivery time

### Price Drop Alert

**Trigger:** Tracked product price decrease

**Content:**
- Product name
- Old vs. new price
- Savings amount
- Store information

### Password Reset

**Trigger:** Password reset request

**Content:**
- Reset link (expires in 1 hour)
- Security reminder

---

## SMS Templates

### Order Status Update

**Format:**
```
SmartCart: Your order #{orderNumber} is now {status}. Track it in the app!
```

### Delivery Notification

**Format:**
```
SmartCart: Your order #{orderNumber} will arrive around {estimatedTime}. Thank you for shopping with us!
```

### Verification Code

**Format:**
```
SmartCart: Your verification code is {code}. Valid for 10 minutes.
```

---

## Configuration

### Environment Variables

```bash
# Server
PORT=3004
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# Redis
REDIS_URL=redis://localhost:6379

# JWT (for WebSocket authentication)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Service URLs
CATALOG_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003

# SendGrid (Email)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@smartcart.com
EMAIL_ENABLED=false  # Set to 'true' in production

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_ENABLED=false  # Set to 'true' in production

# Push Notifications (Future)
PUSH_ENABLED=false
```

### Development Mode

In development, emails and SMS are **logged** instead of sent:

```
Email disabled, would have sent:
  to: user@example.com
  subject: Welcome to SmartCart!

SMS disabled, would have sent:
  to: +1234567890
  message: Your order #ORD-123 is now delivered
```

---

## Integration Examples

### Frontend (React/Next.js)

#### WebSocket Connection

```typescript
// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useNotifications(token: string) {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3004', {
      auth: { token }
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to notifications');
    });

    newSocket.on('notification', (notification) => {
      setNotifications(prev => [...prev, notification]);
    });

    newSocket.on('price:update', (data) => {
      console.log('Price updated:', data);
      // Update product prices in UI
    });

    newSocket.on('cart:update', (data) => {
      console.log('Cart synced:', data);
      // Update cart state
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  return { socket, notifications };
}
```

#### Subscribe to Products

```typescript
// components/ProductList.tsx
function ProductList() {
  const { socket } = useNotifications(token);

  useEffect(() => {
    if (socket && products.length > 0) {
      const productIds = products.map(p => p.id);

      // Subscribe to price updates
      socket.emit('subscribe:prices', { productIds });

      // Subscribe to cart and orders
      socket.emit('subscribe:cart');
      socket.emit('subscribe:orders');
    }
  }, [socket, products]);

  return <div>...</div>;
}
```

### Backend (Service-to-Service)

#### Trigger Notification from Catalog Service

```typescript
// services/catalog-service/src/services/price-tracker.ts
import axios from 'axios';

async function notifyPriceChange(productId: string, oldPrice: number, newPrice: number) {
  try {
    await axios.post('http://localhost:3004/api/notifications/price-update', {
      productId,
      oldPrice,
      newPrice,
      store: 'Kroger',
      inStock: true
    });
  } catch (error) {
    console.error('Failed to send price notification:', error);
  }
}
```

#### Send Welcome Email from User Service

```typescript
// services/user-service/src/routes/auth.ts
import axios from 'axios';

// After user registration
async function sendWelcomeEmail(userId: string, email: string, firstName: string) {
  try {
    await axios.post('http://localhost:3004/api/notifications/welcome', {
      userId,
      email,
      firstName
    });
  } catch (error) {
    console.error('Failed to send welcome notification:', error);
  }
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
  "service": "notification-service"
}
```

### Detailed Health Check

**Endpoint:** `GET /health/detailed`

```json
{
  "status": "ok",
  "timestamp": "2026-01-17T12:00:00Z",
  "service": "notification-service",
  "dependencies": {
    "redis": "ok"
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

## Background Job Processing

### BullMQ Queue

The notification service uses BullMQ for reliable background job processing.

#### Job Types

1. **Email Jobs**
   - Welcome emails
   - Order confirmations
   - Price drop alerts
   - Password reset

2. **SMS Jobs**
   - Order status updates
   - Delivery notifications
   - Verification codes

3. **Push Notifications** (Future)

#### Job Priorities

- `high`: Order confirmations, delivery updates
- `medium`: Welcome emails, price alerts
- `low`: Marketing emails, newsletters

#### Retry Logic

- Failed jobs are retried up to 3 times
- Exponential backoff: 1s, 5s, 15s
- Dead letter queue for permanently failed jobs

---

## Testing

### Run Tests

```bash
cd services/notification-service
npm test
```

### Example Tests

```typescript
// tests/notification-service.test.ts
import { EmailService } from '../src/services/email-service';
import { SMSService } from '../src/services/sms-service';

describe('Email Service', () => {
  it('should send welcome email', async () => {
    await expect(
      EmailService.sendWelcomeEmail('test@example.com', 'John')
    ).resolves.not.toThrow();
  });

  it('should send order confirmation', async () => {
    const orderData = {
      orderNumber: 'ORD-123',
      total: 50.99,
      items: [
        { name: 'Bananas', quantity: 2, price: 1.99 }
      ],
      estimatedDelivery: '2026-01-18T14:00:00Z'
    };

    await expect(
      EmailService.sendOrderConfirmation('test@example.com', orderData)
    ).resolves.not.toThrow();
  });
});

describe('SMS Service', () => {
  it('should send order status update', async () => {
    await expect(
      SMSService.sendOrderStatusUpdate('+1234567890', 'ORD-123', 'delivered')
    ).resolves.not.toThrow();
  });
});
```

---

## Performance

### WebSocket Scaling

The service uses Socket.io with Redis adapter for horizontal scaling:

- Multiple service instances can run simultaneously
- Redis pub/sub ensures messages reach all connected clients
- Automatic failover and load balancing

### Queue Performance

- BullMQ processes jobs concurrently
- Configurable concurrency (default: 5 jobs at once)
- Rate limiting to prevent API throttling

### Connection Limits

- No hard limit on WebSocket connections
- Redis tracks all active connections
- Graceful degradation under high load

---

## Security

### WebSocket Authentication

- JWT token required for all connections
- Token validated on connection
- Invalid tokens are immediately rejected

### CORS Configuration

- Configurable allowed origins
- Credentials support for cross-origin requests
- Secure WebSocket upgrade

### Input Validation

- All API endpoints validate required fields
- Type checking and sanitization
- Protection against injection attacks

---

## Monitoring & Logging

### Logging Levels

- `info`: Connection events, notifications sent
- `warn`: Missing credentials, configuration issues
- `error`: Failed deliveries, connection errors
- `debug`: Detailed WebSocket events

### Metrics to Track

- Active WebSocket connections
- Messages sent per minute
- Email/SMS delivery success rate
- Queue job processing time
- Failed job count

---

## Future Enhancements

1. **Push Notifications**
   - iOS (APNs) and Android (FCM) support
   - Device token management
   - Rich notifications with images

2. **In-App Notifications**
   - Persistent notification history
   - Read/unread status
   - Notification preferences

3. **Advanced Features**
   - Scheduled notifications
   - Notification templates management
   - A/B testing for messages
   - Analytics and tracking

4. **Performance**
   - Message batching
   - Intelligent retry strategies
   - Caching for frequently accessed data

---

## Troubleshooting

### WebSocket Connection Issues

**Problem:** Client can't connect

**Solutions:**
- Verify JWT token is valid and not expired
- Check CORS allowed origins include client URL
- Ensure Redis is running and accessible
- Check firewall rules allow WebSocket connections

### Email Not Sending

**Problem:** Emails not being sent

**Solutions:**
- Verify `EMAIL_ENABLED=true` in production
- Check SendGrid API key is configured
- Review SendGrid dashboard for bounces/blocks
- Check email logs for error messages

### SMS Not Sending

**Problem:** SMS messages not delivered

**Solutions:**
- Verify `SMS_ENABLED=true` in production
- Check Twilio credentials are correct
- Verify phone numbers are in E.164 format (+1234567890)
- Check Twilio console for delivery status

### Queue Jobs Stuck

**Problem:** Background jobs not processing

**Solutions:**
- Verify Redis is running
- Check BullMQ worker is started
- Review failed job queue
- Check Redis memory usage

---

## API Reference Summary

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/price-update` | Trigger price update |
| POST | `/api/notifications/cart-update` | Sync cart across devices |
| POST | `/api/notifications/order-update` | Send order status update |
| POST | `/api/notifications/order-confirmation` | Send order confirmation |
| POST | `/api/notifications/welcome` | Send welcome notification |
| POST | `/api/notifications/price-drop-alert` | Send price drop alert |
| POST | `/api/notifications/broadcast` | Broadcast announcement |
| GET | `/api/notifications/stats` | Get service statistics |
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed health check |
| GET | `/ready` | Readiness probe |
| GET | `/live` | Liveness probe |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:prices` | Client → Server | Subscribe to price updates |
| `subscribed:prices` | Server → Client | Price subscription confirmed |
| `unsubscribe:prices` | Client → Server | Unsubscribe from prices |
| `unsubscribed:prices` | Server → Client | Price unsubscribe confirmed |
| `subscribe:cart` | Client → Server | Subscribe to cart updates |
| `subscribed:cart` | Server → Client | Cart subscription confirmed |
| `subscribe:orders` | Client → Server | Subscribe to order updates |
| `subscribed:orders` | Server → Client | Order subscription confirmed |
| `subscribe:notifications` | Client → Server | Subscribe to all notifications |
| `subscribed:notifications` | Server → Client | Notification subscription confirmed |
| `connected` | Server → Client | Connection established |
| `price:update` | Server → Client | Price change notification |
| `cart:update` | Server → Client | Cart synchronized |
| `order:update` | Server → Client | Order status changed |
| `notification` | Server → Client | General notification |
| `announcement` | Server → Client | System announcement |

---

## Support

For issues or questions:
- Check the [main README](../README.md)
- Review [SmartCart documentation](../docs/)
- Check service logs for errors
- Verify environment configuration

---

**Built with:**
- Express.js - Web framework
- Socket.io - Real-time communication
- BullMQ - Job queue
- Redis - Pub/sub and caching
- SendGrid - Email delivery
- Twilio - SMS delivery
