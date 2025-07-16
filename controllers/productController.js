const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Review = require('../models/reviewModel');

// --- Helper Function to Build the Aggregation's $match Stage ---

const buildMatchStage = async (queryParams) => {
    // Note: The `inStock` parameter is handled here because `stock` is a direct field on the model.
    const { search, category, tags, tagMode, min, max, inStock, minRating } = queryParams;
    
    const matchStage = {};

    // 1. Fuzzy search on name and description
    if (search) {
        matchStage.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    // 2. Filter by category (supports multiple comma-separated categories)
    if (category) {
        const categoryNames = category.split(',').map(c => c.trim());
        // Find all category documents matching the names/slugs
        const categories = await Category.find({
            $or: [
                { name: { $in: categoryNames.map(c => new RegExp(c, 'i')) } },
                { slug: { $in: categoryNames.map(s => new RegExp(s, 'i')) } },
            ]
        }).select('_id');
        
        // If categories were found, filter by their IDs
        if (categories.length > 0) {
            matchStage.category = { $in: categories.map(c => c._id) };
        } else {
            // If no matching category is found, add a condition that will result in zero matches.
            matchStage.category = new mongoose.Types.ObjectId(); 
        }
    }

    // 3. Filter by tags (supports 'any' or 'all' logic)
    if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim());
        // Default to $in (matches any tag) unless tagMode is 'all'
        matchStage.tags = { [tagMode === 'all' ? '$all' : '$in']: tagList };
    }

    // 4. Filter by price range
    const priceFilter = {};
    if (min && !isNaN(Number(min))) {
        priceFilter.$gte = Number(min);
    }
    if (max && !isNaN(Number(max))) {
        priceFilter.$lte = Number(max);
    }
    if (Object.keys(priceFilter).length > 0) {
        matchStage.price = priceFilter;
    }

    // 5. Filter by stock status
    if (inStock) {
        if (inStock === 'true') {
            matchStage.stock = { $gt: 0 };
        } else if (inStock === 'false') {
            matchStage.stock = { $eq: 0 };
        }
    }

    // 6. Filter by average rating (will be applied *after* calculation)
    if (minRating && !isNaN(Number(minRating))) {
        // We will add another $match stage later in the pipeline for this
        matchStage.averageRating = { $gte: Number(minRating) };
    }

    return matchStage;
};


// @desc    Fetch all products with smart filtering & aggregation
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
    // Sanitize pagination inputs
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    // Build the initial filtering stage
    const matchStage = await buildMatchStage(req.query);

    // Build the sorting stage
    const sortStage = {};
    if (req.query.sort) {
        const sortFields = req.query.sort.split(',');
        sortFields.forEach(field => {
            const [key, order] = field.split(':');
            sortStage[key.trim()] = order === 'desc' ? -1 : 1;
        });
    } else {
        sortStage.createdAt = -1; // Default sort
    }
    
    const aggregationPipeline = [
        // Join with reviews to get ratings for calculation
        {
            $lookup: {
                from: 'reviews', 
                localField: '_id',
                foreignField: 'product',
                as: 'reviews'
            }
        },
        // Calculate the average rating and count
        {
            $addFields: {
                averageRating: { $ifNull: [ { $avg: '$reviews.rating' }, 0 ] },
                reviewCount: { $size: '$reviews' }
            }
        },
        // Apply all the filters (from our helper function)
        { $match: matchStage },
        
        // Use $facet to run two parallel operations:
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [
                    { $sort: sortStage }, 
                    { $skip: skip }, 
                    { $limit: limit },
                    { $project: { reviews: 0 } } // Exclude the full reviews array from final output
                ]
            }
        }
    ];

    const result = await Product.aggregate(aggregationPipeline);

    const products = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
    
    res.json({
        products,
        page,
        pages: Math.ceil(total / limit),
        total,
    });
});


// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
    // Use aggregation to include calculated fields like averageRating
    const aggregationPipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
            $lookup: {
                from: 'reviews',
                localField: '_id',
                foreignField: 'product',
                as: 'reviews'
            }
        },
        {
            $addFields: {
                averageRating: { $ifNull: [ { $avg: '$reviews.rating' }, 0 ] },
                reviewCount: { $size: '$reviews' }
            }
        },
    ];

    const result = await Product.aggregate(aggregationPipeline);
    // Find the original document to populate the 'category' virtual field
    const product = await Product.findById(req.params.id);
    const aggregatedData = result[0];
    
    if (product && aggregatedData) {
        // Combine the populated document with the aggregated data
        const finalProduct = {
            ...product.toObject(),
            ...aggregatedData
        };

        res.json(finalProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});


// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
    const { name, description, price, images, inventory, category, tags } = req.body;
    
    const product = new Product({
        name, description, price, images, inventory, category, tags
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});


// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        // Dynamically update fields only if they are provided in the request body
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                product[key] = req.body[key];
            }
        });

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
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne(); 
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});


// @desc    Create a new review for a product
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const { id: productId } = req.params;
    const user = req.user; // Assuming protect middleware sets req.user

    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    // Check if the user has already reviewed this product
    const alreadyReviewed = await Review.findOne({
        product: productId,
        user: user._id,
    });

    if (alreadyReviewed) {
        res.status(400);
        throw new Error('You have already reviewed this product');
    }
    
    // Create the new review
    const review = await Review.create({
        name: user.name,
        rating: Number(rating),
        comment,
        user: user._id,
        product: productId,
    });
    
    res.status(201).json(review);
});

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview
};