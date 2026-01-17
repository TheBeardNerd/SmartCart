# SmartCart: Mobile Grocery E-Commerce Aggregation Platform

SmartCart revolutionizes grocery shopping by intelligently aggregating products and prices across multiple stores, enabling users to optimize their shopping experience based on their unique priorities—whether seeking maximum savings, ultimate convenience, strategic multi-store optimization, or seamless meal planning integration.

## Core Value Propositions

- **Budget Optimizer**: Achieve 15-25% savings through intelligent price comparison and deal aggregation
- **Convenience Seeker**: Complete grocery orders in under 60 seconds with AI-powered recommendations
- **Split-Cart Maximizer**: Optimize multi-store purchases with unified delivery coordination
- **Meal Planner**: Transform recipes into optimized shopping lists with nutritional tracking

## Technology Stack

### Frontend
- **Web**: Next.js 14+ with TypeScript and React Server Components
- **Mobile**: React Native for cross-platform iOS and Android
- **Styling**: Tailwind CSS with shadcn/ui components

### Backend Services
- **API Gateway**: Kong/Express Gateway for routing and rate limiting
- **User Service**: Fastify (high-performance authentication and profile management)
- **Catalog Service**: Fastify (product search and price aggregation)
- **Order Service**: NestJS (complex order processing and business logic)
- **Payment Service**: Express (Stripe/PayPal integration)
- **Notification Service**: Express + Socket.io (real-time updates)

### Databases
- **PostgreSQL**: Transactional data (users, orders, payments)
- **MongoDB**: Product catalog and flexible schemas
- **Redis**: Caching, sessions, and message queues
- **Elasticsearch**: Search and analytics

### Infrastructure
- **Containerization**: Docker and Docker Compose
- **Orchestration**: Kubernetes (production)
- **Message Queue**: BullMQ with Redis
- **Real-time**: Socket.io with Redis adapter
- **Cloud**: DigitalOcean/AWS

## Project Structure

```
smartcart-platform/
├── apps/
│   ├── web/                    # Next.js frontend
│   ├── mobile/                 # React Native app
│   └── admin/                  # Admin dashboard
├── services/
│   ├── user-service/           # Authentication & profiles (Fastify)
│   ├── catalog-service/        # Product search & aggregation (Fastify)
│   ├── order-service/          # Order processing (NestJS)
│   ├── payment-service/        # Payment processing (Express)
│   └── notification-service/   # Real-time notifications (Socket.io)
├── packages/
│   ├── shared/                 # Shared TypeScript types
│   ├── ui-components/          # React component library
│   └── utils/                  # Common utilities
├── infrastructure/
│   ├── docker/                 # Container configurations
│   ├── k8s/                    # Kubernetes manifests
│   └── terraform/              # Infrastructure as code
└── tests/
    ├── integration/           # Integration tests
    ├── e2e/                  # End-to-end tests
    └── load/                 # Performance tests
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 15+
- MongoDB 6+
- Redis 7+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YourUsername/SmartCart.git
cd SmartCart
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start infrastructure services:
```bash
npm run docker:up
```

5. Run database migrations:
```bash
npm run migrate
```

6. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Web: http://localhost:3000
- Catalog Service: http://localhost:3001
- User Service: http://localhost:3002
- Order Service: http://localhost:3003

## Development

### Available Scripts

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services for production
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

### Service-Specific Commands

Each service can be run independently:

```bash
# User Service
cd services/user-service
npm run dev

# Catalog Service
cd services/catalog-service
npm run dev

# Order Service
cd services/order-service
npm run dev
```

## Architecture

### Microservices Architecture

SmartCart uses a microservices architecture with the following key components:

1. **API Gateway Layer**: Kong/Express Gateway handles routing, rate limiting, and authentication
2. **Service Layer**: Independent microservices for user, catalog, order, payment, and notifications
3. **Data Layer**: PostgreSQL for transactional data, MongoDB for product catalogs, Redis for caching
4. **Real-time Layer**: Socket.io for live price updates and cart synchronization

### Performance Targets

- Price aggregation API: <500ms per store
- Product search: <1 second response time
- Cart updates: <300ms latency
- App launch time: <3 seconds
- Shopping list building: <2 seconds

### Database Schema

#### PostgreSQL (Transactional Data)

- **users**: User accounts and authentication
- **stores**: Partner store configurations
- **orders**: Order history and transactions
- **price_history**: Historical pricing data for analytics

#### MongoDB (Product Catalog)

- **products**: Flexible product schemas with store-specific pricing
- **categories**: Product categorization
- **recipes**: Meal planning recipes
- **nutritional_data**: Nutritional information

## Price Optimization Engine 🚀

SmartCart's intelligent optimization engine analyzes your cart and finds the best combination of stores based on your priorities:

### Optimization Strategies

1. **Budget Optimizer** - Find absolute lowest total cost (15-25% savings)
2. **Convenience Seeker** - Minimize stores and delivery time (5-10% savings)
3. **Split-Cart Maximizer** - Best price for each item (10-20% savings)
4. **Meal Planner** - Balance cost with quality (8-12% savings)

### Quick Example

```bash
curl -X POST http://localhost:3001/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [
      {"productId": "123456789012", "name": "Bananas", "quantity": 2},
      {"productId": "234567890123", "name": "Milk", "quantity": 1}
    ],
    "strategy": {
      "type": "budget",
      "deliveryPreference": "cheapest"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCost": 18.43,
    "estimatedSavings": 4.52,
    "savingsPercentage": 19.7,
    "storeCount": 1,
    "storeBreakdown": [...]
  }
}
```

📖 **Full Documentation:** See [OPTIMIZATION_ENGINE.md](docs/OPTIMIZATION_ENGINE.md) for detailed API reference and integration examples.

## API Documentation

### Catalog Service API

**Search Products**
```
GET /api/products/search?query=bananas&limit=20
```

**Get Price Comparison**
```
GET /api/products/:productId/prices
```

**Check Inventory**
```
GET /api/products/:productId/inventory
```

### Optimization API

**Optimize Cart**
```
POST /api/optimize
```

**Compare Strategies**
```
POST /api/optimize/compare
```

**Get Available Strategies**
```
GET /api/optimize/strategies
```

**Estimate Savings**
```
POST /api/optimize/estimate-savings
```

### User Service API 🔐

**Register User**
```
POST /api/auth/register
```

**Login**
```
POST /api/auth/login
```

**Refresh Token**
```
POST /api/auth/refresh
```

**Get Current User**
```
GET /api/auth/me
```

**Update Profile**
```
PUT /api/users/profile
```

**Manage Addresses**
```
GET /api/users/addresses
POST /api/users/addresses
PUT /api/users/addresses/:id
DELETE /api/users/addresses/:id
```

📖 **Full Documentation:** See [USER_SERVICE.md](docs/USER_SERVICE.md) for complete authentication flow and API reference.

## Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Load Tests
```bash
npm run test:load
```

## Deployment

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

```bash
kubectl apply -f infrastructure/k8s/
```

### Environment Variables

Required environment variables for each service are documented in `.env.example` files in each service directory.

## Performance Monitoring

SmartCart includes comprehensive monitoring and analytics:

- **Application Performance**: Response times, error rates, throughput
- **User Analytics**: Engagement metrics, retention, conversion rates
- **Business Metrics**: Revenue, CAC, LTV, savings generated
- **Real-time Dashboards**: Live system health and user activity

## Security

- JWT-based authentication with refresh tokens
- HTTPS/TLS encryption for all communications
- PCI DSS compliance for payment processing (via Stripe)
- GDPR and CCPA compliance for data privacy
- Rate limiting and DDoS protection
- SQL injection and XSS prevention

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Roadmap

### Phase 1: MVP (Months 1-4)
- ✅ Core price comparison engine
- ✅ Multi-store product search
- ✅ User authentication and profiles
- ✅ Basic cart optimization
- ✅ Mobile app (React Native)
- 🔄 3+ store integrations

### Phase 2: Feature Expansion (Months 5-7)
- 📋 Advanced optimization algorithms
- 📋 Real-time price updates
- 📋 Meal planning integration
- 📋 8+ store partnerships
- 📋 Personalization engine

### Phase 3: Scale (Months 8-12)
- 📋 AI-powered recommendations
- 📋 Multi-region deployment
- 📋 B2B platform
- 📋 Advanced analytics
- 📋 15+ store partnerships

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@smartcart.com or join our Discord community.

## Acknowledgments

- Built with love by the SmartCart team
- Powered by Node.js, Next.js, Fastify, and NestJS
- Special thanks to our store partners

---

**SmartCart** - Revolutionizing grocery shopping through intelligent aggregation and optimization.
