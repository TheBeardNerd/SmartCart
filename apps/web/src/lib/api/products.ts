import axios from 'axios';

const catalogServiceUrl = process.env.NEXT_PUBLIC_CATALOG_SERVICE_URL || 'http://localhost:3001';

export interface SearchProductsParams {
  query: string;
  store?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  store: string;
  category: string;
  imageUrl?: string;
  inStock: boolean;
}

export interface SearchProductsResponse {
  success: boolean;
  data: Product[];
  total: number;
  page: number;
}

export async function searchProducts(params: SearchProductsParams): Promise<SearchProductsResponse> {
  try {
    const response = await axios.get(`${catalogServiceUrl}/api/products/search`, {
      params: {
        query: params.query,
        store: params.store,
        category: params.category,
        limit: params.limit || 20,
        offset: params.offset || 0,
      },
      timeout: 5000,
    });

    return response.data;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}

export async function getProductPrices(productId: string) {
  try {
    const response = await axios.get(`${catalogServiceUrl}/api/products/${productId}/prices`, {
      timeout: 3000,
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching product prices:', error);
    throw error;
  }
}

export async function checkInventory(productIds: string[]) {
  try {
    const response = await axios.post(
      `${catalogServiceUrl}/api/products/inventory`,
      { productIds },
      { timeout: 3000 }
    );

    return response.data;
  } catch (error) {
    console.error('Error checking inventory:', error);
    throw error;
  }
}
