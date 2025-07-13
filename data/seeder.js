const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load env vars
dotenv.config();

// Load models
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Order = require('../models/orderModel');

// Load sample data
const products = require('./products');
const sampleCategories = require('./categories');

// Connect to DB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding...'.cyan.underline);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

// Function to import data
const importData = async () => {
  try {
    // Clear relevant collections
    await Order.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    console.log('Orders, Products, and Categories Cleared!'.yellow.inverse);

    // Insert categories (trigger pre-save hooks like slug generation)
    const createdCategories = await Category.create(sampleCategories);
    console.log('Categories Imported!'.green.inverse);

    // Match product tags with actual category IDs
    const productsWithCategories = products.map(product => {
      const matchedCategory = createdCategories.find(cat =>
        product.tags.some(tag => tag.toLowerCase().includes(cat.name.toLowerCase()))
      );

      return {
        ...product,
        category: matchedCategory ? matchedCategory._id : createdCategories[0]._id, // fallback to first
      };
    });

    await Product.insertMany(productsWithCategories);
    console.log('Products Imported!'.green.inverse);

    console.log('Data Import Complete ✅'.cyan.bold);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

// Function to destroy data
const destroyData = async () => {
  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    console.log('Orders, Products, and Categories Destroyed!'.red.inverse);
    process.exit();
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

// Run script
(async () => {
  await connectDB();
  if (process.argv[2] === '-d') {
    await destroyData();
  } else {
    await importData();
  }
})();
