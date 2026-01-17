import { MongoClient, Db, Collection } from 'mongodb';
import { config } from '../config';

class MongoDB {
  private client: MongoClient;
  private db: Db | null = null;

  constructor() {
    this.client = new MongoClient(config.mongodb.url, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(config.mongodb.dbName);
      console.log('MongoDB connected successfully');

      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db;
  }

  getCollection<T = any>(name: string): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  private async createIndexes(): Promise<void> {
    try {
      const productsCollection = this.getCollection('products');

      // Create text index for product search
      await productsCollection.createIndex(
        { name: 'text', searchTerms: 'text' },
        { name: 'product_search_idx' }
      );

      // Create compound index for efficient queries
      await productsCollection.createIndex(
        { 'stores.storeId': 1, category: 1 },
        { name: 'store_category_idx' }
      );

      // Create index for UPC lookups
      await productsCollection.createIndex(
        { upc: 1 },
        { unique: true, name: 'upc_idx' }
      );

      console.log('MongoDB indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }
}

export const mongoClient = new MongoDB();
