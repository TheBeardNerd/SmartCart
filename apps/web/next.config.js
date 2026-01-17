/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@smartcart/shared', '@smartcart/ui-components'],
  images: {
    domains: ['images.smartcart.com', 'cdn.kroger.com', 'cdn.safeway.com', 'cdn.walmart.com'],
  },
  env: {
    CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://localhost:3001',
    USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'http://localhost:3004',
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
