const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors =require('colors');

// Load env vars
dotenv.config();

// Load models
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Order = require('../models/orderModel');

// Load sample data
const users = require('./users');
const products = require('./products');
const sampleCategories = require('./categories');

// Connect to DB
const connectDB = async () => {
    try {
        // Updated connection options for modern Mongoose
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
        // Clear existing data
        await Order.deleteMany();
        await Product.deleteMany();
        await User.deleteMany();
        await Category.deleteMany();
        console.log('Data Cleared!'.yellow.inverse);

        // --- THE FIX IS HERE ---
        // Use Category.create() to trigger the 'pre-save' middleware for slug generation
        const createdCategories = await Category.create(sampleCategories);
        const electronicsCategoryId = createdCategories.find(cat => cat.name === 'Electronics')._id;
        const apparelCategoryId = createdCategories.find(cat => cat.name === 'Apparel')._id;
        console.log('Categories Imported!'.green.inverse);
        
        // Insert Users (passwords will be hashed by the pre-save hook in userModel)
        await User.create(users);
        console.log('Users Imported!'.green.inverse);

        // Add category IDs to products
        const productsWithCategories = products.map((product, index) => {
            let categoryId;
            if (product.tags.includes('electronics')) {
                categoryId = electronicsCategoryId;
            } else if (product.tags.includes('fashion') || product.tags.includes('jewelry')) {
                categoryId = apparelCategoryId;
            } else {
                 // Fallback to the first category if no match
                categoryId = createdCategories[0]._id;
            }
            return { ...product, category: categoryId };
        });


        // insertMany is fine here as Products don't have special pre-save hooks
        await Product.insertMany(productsWithCategories);
        console.log('Products Imported!'.green.inverse);
        
        console.log('Data Imported Successfully!'.cyan.bold);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

// Function to destroy data (remains the same)
const destroyData = async () => {
    try {
        await Order.deleteMany();
        await Product.deleteMany();
        await User.deleteMany();
        await Category.deleteMany();

        console.log('Data Destroyed!'.red.inverse);
        process.exit();
    } catch (error) {
        console.error(`${error}`.red.inverse);
        process.exit(1);
    }
};

// IIFE (remains the same)
(async () => {
    await connectDB();
    if (process.argv[2] === '-d') {
        await destroyData();
    } else {
        await importData();
    }
})();