import { mongoClient } from '../utils/mongodb';
import { KrogerApiClient } from '../integrations/kroger-client';
import { SafewayApiClient } from '../integrations/safeway-client';
import { WalmartApiClient } from '../integrations/walmart-client';
import { TargetApiClient } from '../integrations/target-client';

export interface Product {
  id: string;
  name: string;
  price: number;
  store: string;
  category: string;
  imageUrl?: string;
  inStock: boolean;
}

export interface SearchParams {
  query: string;
  store?: string;
  category?: string;
  limit: number;
  offset: number;
}

export interface PriceData {
  storeId: string;
  price: number;
  inStock: boolean;
  lastUpdated: Date;
}

export class ProductService {
  private storeClients = {
    kroger: new KrogerApiClient(),
    safeway: new SafewayApiClient(),
    walmart: new WalmartApiClient(),
    target: new TargetApiClient(),
  };

  async searchProducts(params: SearchParams) {
    const { query, store, category, limit, offset } = params;

    // If searching local database first
    const productsCollection = mongoClient.getCollection('products');

    // Build MongoDB query
    const mongoQuery: any = {
      $text: { $search: query },
    };

    if (category) {
      mongoQuery.category = { $in: [category] };
    }

    if (store) {
      mongoQuery['stores.storeId'] = store;
    }

    try {
      // Search local database
      const products = await productsCollection
        .find(mongoQuery)
        .skip(offset)
        .limit(limit)
        .toArray();

      const total = await productsCollection.countDocuments(mongoQuery);

      // Transform products to response format
      const items = products.flatMap((product: any) => {
        return product.stores
          .filter((s: any) => !store || s.storeId === store)
          .map((storeData: any) => ({
            id: `${product._id}_${storeData.storeId}`,
            name: product.name,
            price: storeData.price,
            store: storeData.storeId,
            category: product.category[0],
            imageUrl: product.images?.[0] || storeData.imageUrl,
            inStock: storeData.inStock,
          }));
      });

      return { items, total };
    } catch (error) {
      console.error('Error searching products:', error);

      // Fallback to live API search if database search fails
      return await this.searchProductsFromApis(params);
    }
  }

  private async searchProductsFromApis(params: SearchParams) {
    const { query, store, limit } = params;

    const storeApis = store
      ? [{ name: store, client: this.storeClients[store as keyof typeof this.storeClients] }]
      : Object.entries(this.storeClients).map(([name, client]) => ({ name, client }));

    // Parallel API calls for optimal performance
    const promises = storeApis.map(async ({ name, client }) => {
      try {
        const products = await client.searchProducts(query);
        return products.map((product: any) => ({
          ...product,
          store: name,
        }));
      } catch (error) {
        console.error(`Error fetching from ${name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allProducts = results.flat();

    // Sort by price and apply pagination
    const sortedProducts = allProducts.sort((a, b) => a.price - b.price).slice(0, limit);

    return {
      items: sortedProducts,
      total: allProducts.length,
    };
  }

  async getPrices(productId: string) {
    // Fetch prices from all stores in parallel
    const pricePromises = Object.entries(this.storeClients).map(async ([storeName, client]) => {
      try {
        const price = await client.getPrice(productId);
        return price ? { ...price, storeId: storeName } : null;
      } catch (error) {
        console.error(`Error fetching price from ${storeName}:`, error);
        return null;
      }
    });

    const prices = await Promise.allSettled(pricePromises);

    const validPrices = prices
      .filter((result) => result.status === 'fulfilled' && result.value !== null)
      .map((result) => (result as PromiseFulfilledResult<any>).value)
      .filter(Boolean);

    const lowestPrice =
      validPrices.length > 0
        ? validPrices.reduce((min, current) => (current.price < min.price ? current : min))
        : null;

    return { validPrices, lowestPrice };
  }

  async checkInventory(productIds: string[]) {
    const inventoryChecks = productIds.map(async (productId) => {
      const storeChecks = await Promise.allSettled(
        Object.entries(this.storeClients).map(async ([storeName, client]) => {
          try {
            const inventory = await client.checkInventory(productId);
            return { storeId: storeName, ...inventory };
          } catch (error) {
            console.error(`Error checking inventory at ${storeName}:`, error);
            return null;
          }
        })
      );

      const stores = storeChecks
        .filter((result) => result.status === 'fulfilled' && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<any>).value)
        .filter(Boolean);

      return {
        productId,
        stores,
        available: stores.some((s) => s.inStock),
      };
    });

    return Promise.all(inventoryChecks);
  }

  async getProductById(productId: string) {
    const productsCollection = mongoClient.getCollection('products');

    try {
      const product = await productsCollection.findOne({ _id: productId });
      return product;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }
}
