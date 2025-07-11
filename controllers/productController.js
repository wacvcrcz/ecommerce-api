const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

// @desc    Fetch all products with smart filtering
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
    const { search, category, tags, min, max, sort, page = 1, limit = 12 } = req.query;

    // FIX: 'filter' object is now declared inside the function to prevent state persistence between requests.
    const filter = {};

    // Fuzzy search on name and description
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    // Filter by category (can be ID or name/slug)
    if (category) {
        // Check if category is a valid ObjectId, otherwise treat it as a name/slug
        const isObjectId = category.match(/^[0-9a-fA-F]{24}$/);
        const categoryFilter = isObjectId
            ? { _id: category }
            : { $or: [{ name: { $regex: category, $options: 'i' } }, { slug: { $regex: category, $options: 'i' } }] };

        const foundCategory = await Category.findOne(categoryFilter);
        if (foundCategory) {
            filter.category = foundCategory._id;
        } else {
            // If the specified category doesn't exist, return no products
            return res.json({ products: [], page: 1, pages: 0, total: 0 });
        }
    }

    // Filter by tags (comma-separated, matches any of the tags)
    if (tags) {
        filter.tags = { $in: tags.split(',').map(tag => tag.trim()) };
    }

    // Filter by price range (more robust implementation)
    if (min || max) {
        filter.price = {};
        if (min) {
            filter.price.$gte = Number(min);
        }
        if (max) {
            filter.price.$lte = Number(max);
        }
    }

    // Sorting options
    const sortOptions = {};
    if (sort) {
        // e.g., sort=price:desc or sort=createdAt:asc
        const [field, order] = sort.split(':');
        sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
        sortOptions.createdAt = -1; // Default sort
    }

    const count = await Product.countDocuments(filter);
    const products = await Product.find(filter)
        .sort(sortOptions)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .exec();

    res.json({
        products,
        page: Number(page),
        pages: Math.ceil(count / Number(limit)),
        total: count,
    });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
    // Note: Assuming validation for required fields is handled by Mongoose schema
    const { name, description, price, images, stock, category, tags } = req.body;
    
    const product = new Product({
        name,
        description,
        price,
        images,
        stock,
        category,
        tags,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
    const { name, description, price, images, stock, category, tags } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price === undefined ? product.price : price;
        product.images = images || product.images;
        product.stock = stock === undefined ? product.stock : stock;
        product.category = category || product.category;
        product.tags = tags || product.tags;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
    // Note: Mongoose 6+ uses 'deleteOne' on the model. `remove` is deprecated on documents.
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};