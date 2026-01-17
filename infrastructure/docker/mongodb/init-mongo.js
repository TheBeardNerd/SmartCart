// SmartCart MongoDB Initialization

db = db.getSiblingDB('smartcart');

// Create products collection with sample data
db.products.insertMany([
  {
    upc: '123456789012',
    name: 'Organic Bananas',
    brand: 'Fresh Farms',
    category: ['produce', 'organic', 'fruits'],
    searchTerms: ['banana', 'organic', 'fruit', 'fresh'],
    description: 'Fresh organic bananas, perfect for snacking',
    images: [
      'https://images.smartcart.com/products/organic-bananas.jpg'
    ],
    nutritionFacts: {
      servingSize: '1 medium (118g)',
      calories: 105,
      totalFat: '0.4g',
      sodium: '1mg',
      totalCarbohydrate: '27g',
      protein: '1.3g',
      sugars: '14g',
      fiber: '3.1g'
    },
    stores: [
      {
        storeId: 'kroger',
        price: 0.59,
        salePrice: 0.49,
        onSale: true,
        inStock: true,
        productUrl: 'https://kroger.com/p/organic-bananas',
        storeSpecificId: 'kroger-banana-001',
        lastUpdated: new Date()
      },
      {
        storeId: 'safeway',
        price: 0.69,
        inStock: true,
        productUrl: 'https://safeway.com/p/organic-bananas',
        storeSpecificId: 'safeway-banana-001',
        lastUpdated: new Date()
      },
      {
        storeId: 'walmart',
        price: 0.54,
        inStock: true,
        productUrl: 'https://walmart.com/p/organic-bananas',
        storeSpecificId: 'walmart-banana-001',
        lastUpdated: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    upc: '234567890123',
    name: 'Whole Milk',
    brand: 'Dairy Fresh',
    category: ['dairy', 'milk'],
    searchTerms: ['milk', 'whole milk', 'dairy', 'gallon'],
    description: 'Fresh whole milk, 1 gallon',
    images: [
      'https://images.smartcart.com/products/whole-milk.jpg'
    ],
    nutritionFacts: {
      servingSize: '1 cup (240ml)',
      calories: 150,
      totalFat: '8g',
      sodium: '120mg',
      totalCarbohydrate: '12g',
      protein: '8g',
      sugars: '12g',
      calcium: '30% DV'
    },
    stores: [
      {
        storeId: 'kroger',
        price: 3.99,
        inStock: true,
        productUrl: 'https://kroger.com/p/whole-milk',
        storeSpecificId: 'kroger-milk-001',
        lastUpdated: new Date()
      },
      {
        storeId: 'safeway',
        price: 4.29,
        inStock: true,
        productUrl: 'https://safeway.com/p/whole-milk',
        storeSpecificId: 'safeway-milk-001',
        lastUpdated: new Date()
      },
      {
        storeId: 'walmart',
        price: 3.78,
        inStock: true,
        productUrl: 'https://walmart.com/p/whole-milk',
        storeSpecificId: 'walmart-milk-001',
        lastUpdated: new Date()
      },
      {
        storeId: 'target',
        price: 4.19,
        inStock: true,
        productUrl: 'https://target.com/p/whole-milk',
        storeSpecificId: 'target-milk-001',
        lastUpdated: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    upc: '345678901234',
    name: 'Organic Eggs',
    brand: 'Happy Hens',
    category: ['dairy', 'eggs', 'organic'],
    searchTerms: ['eggs', 'organic eggs', 'dozen', 'free range'],
    description: 'Organic free-range eggs, 12 count',
    images: [
      'https://images.smartcart.com/products/organic-eggs.jpg'
    ],
    nutritionFacts: {
      servingSize: '1 large egg (50g)',
      calories: 70,
      totalFat: '5g',
      sodium: '70mg',
      totalCarbohydrate: '0g',
      protein: '6g',
      cholesterol: '185mg'
    },
    stores: [
      {
        storeId: 'kroger',
        price: 5.99,
        salePrice: 4.99,
        onSale: true,
        inStock: true,
        productUrl: 'https://kroger.com/p/organic-eggs',
        storeSpecificId: 'kroger-eggs-001',
        lastUpdated: new Date()
      },
      {
        storeId: 'safeway',
        price: 6.49,
        inStock: true,
        productUrl: 'https://safeway.com/p/organic-eggs',
        storeSpecificId: 'safeway-eggs-001',
        lastUpdated: new Date()
      },
      {
        storeId: 'target',
        price: 5.79,
        inStock: true,
        productUrl: 'https://target.com/p/organic-eggs',
        storeSpecificId: 'target-eggs-001',
        lastUpdated: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Create text indexes for search
db.products.createIndex({ name: 'text', searchTerms: 'text' }, { name: 'product_search_idx' });
db.products.createIndex({ 'stores.storeId': 1, category: 1 }, { name: 'store_category_idx' });
db.products.createIndex({ upc: 1 }, { unique: true, name: 'upc_idx' });

// Create recipes collection
db.recipes.insertMany([
  {
    name: 'Simple Banana Smoothie',
    description: 'A healthy and delicious breakfast smoothie',
    prepTime: 5,
    servings: 2,
    difficulty: 'easy',
    ingredients: [
      {
        name: 'Organic Bananas',
        quantity: 2,
        unit: 'whole',
        upc: '123456789012'
      },
      {
        name: 'Whole Milk',
        quantity: 1,
        unit: 'cup',
        upc: '234567890123'
      }
    ],
    instructions: [
      'Peel and slice bananas',
      'Add bananas and milk to blender',
      'Blend until smooth',
      'Serve immediately'
    ],
    tags: ['breakfast', 'healthy', 'quick', 'vegetarian'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Create categories collection
db.categories.insertMany([
  { name: 'Produce', slug: 'produce', description: 'Fresh fruits and vegetables' },
  { name: 'Dairy', slug: 'dairy', description: 'Milk, eggs, cheese, and dairy products' },
  { name: 'Meat & Seafood', slug: 'meat-seafood', description: 'Fresh meat and seafood' },
  { name: 'Bakery', slug: 'bakery', description: 'Fresh baked goods' },
  { name: 'Pantry', slug: 'pantry', description: 'Canned goods, grains, and staples' },
  { name: 'Frozen', slug: 'frozen', description: 'Frozen foods and ice cream' },
  { name: 'Beverages', slug: 'beverages', description: 'Drinks and beverages' },
  { name: 'Snacks', slug: 'snacks', description: 'Chips, cookies, and snacks' },
  { name: 'Organic', slug: 'organic', description: 'Certified organic products' }
]);

print('SmartCart MongoDB initialized successfully with sample data');
