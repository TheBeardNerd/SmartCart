import axios from 'axios';
import { config } from '../config';

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  inStock: boolean;
}

export class KrogerApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.stores.kroger.apiKey;
    this.baseUrl = config.stores.kroger.apiUrl;
  }

  async searchProducts(query: string): Promise<StoreProduct[]> {
    // Mock implementation - replace with actual Kroger API integration
    try {
      if (!this.apiKey) {
        return this.getMockProducts(query);
      }

      const response = await axios.get(`${this.baseUrl}/products/search`, {
        params: { q: query },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 3000,
      });

      return response.data.products.map(this.transformProduct);
    } catch (error) {
      console.error('Kroger API error:', error);
      return this.getMockProducts(query);
    }
  }

  async getPrice(productId: string) {
    // Mock implementation
    try {
      if (!this.apiKey) {
        return this.getMockPrice(productId);
      }

      const response = await axios.get(`${this.baseUrl}/products/${productId}/price`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 2000,
      });

      return {
        price: response.data.price,
        inStock: response.data.inStock,
        lastUpdated: new Date(),
      };
    } catch (error) {
      return this.getMockPrice(productId);
    }
  }

  async checkInventory(productId: string) {
    // Mock implementation
    return {
      inStock: Math.random() > 0.2,
      quantity: Math.floor(Math.random() * 100),
      lastUpdated: new Date(),
    };
  }

  private transformProduct(krogerProduct: any): StoreProduct {
    return {
      id: krogerProduct.upc || krogerProduct.id,
      name: krogerProduct.description || krogerProduct.name,
      price: krogerProduct.price || 0,
      category: krogerProduct.categories?.[0] || 'general',
      imageUrl: krogerProduct.images?.[0]?.url,
      inStock: krogerProduct.inventory?.inStock !== false,
    };
  }

  private getMockProducts(query: string): StoreProduct[] {
    // Return mock data for development/testing
    return [
      {
        id: 'kroger-001',
        name: `Kroger ${query}`,
        price: 2.99 + Math.random() * 5,
        category: 'grocery',
        inStock: true,
      },
      {
        id: 'kroger-002',
        name: `Organic ${query}`,
        price: 4.99 + Math.random() * 5,
        category: 'organic',
        inStock: true,
      },
    ];
  }

  private getMockPrice(productId: string) {
    return {
      price: 2.99 + Math.random() * 10,
      inStock: Math.random() > 0.1,
      lastUpdated: new Date(),
    };
  }
}
