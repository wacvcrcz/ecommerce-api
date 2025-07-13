const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Review = require('../models/reviewModel');

// --- Helper Function to Build the Aggregation's $match Stage ---

const buildMatchStage = async (queryParams) => {
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
            // If no matching category is found, we add a condition that will result in zero matches.
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

    // 6. Filter by average rating (applied after calculating it)
    if (minRating && !isNaN(Number(minRating))) {
        // This will be used in a $match stage *after* the rating calculation
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

    // --- Aggregation Pipeline ---
    // Aggregation allows for more complex data processing like joins and computed fields.
    
    // Note: This assumes you have a `reviews` collection and a 'rating' field in it.
    // If not, you can remove the first two stages ($lookup, $addFields) and the 'averageRating' logic.
    const aggregationPipeline = [
        // Stage 1: (Optional but recommended) Join with reviews to get ratings
        {
            $lookup: {
                from: 'reviews', // The name of your reviews collection
                localField: '_id',
                foreignField: 'product', // The field in the review model that references the product
                as: 'reviews'
            }
        },
        // Stage 2: (Optional) Calculate the average rating and count
        {
            $addFields: {
                averageRating: { $ifNull: [ { $avg: '$reviews.rating' }, 0 ] },
                reviewCount: { $size: '$reviews' }
            }
        },
        // Stage 3: Apply all the filters (from our helper function)
        { $match: matchStage },
        
        // Stage 4: Use $facet to run two parallel operations:
        // 1. Get the total count of documents that match the filter
        // 2. Get the paginated subset of documents
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [
                    { $sort: sortStage }, 
                    { $skip: skip }, 
                    { $limit: limit },
                    { $project: { reviews: 0 } } // Optional: Exclude the full reviews array from final output
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

// The rest of the controller can remain largely the same, but here they are for completeness.

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
    // We can also use aggregation here to include averageRating on the single product page
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
        // For a single product, you might want to show the reviews. If not, project them out.
        // { $project: { 'reviews.product': 0, 'reviews.__v': 0 } } // Example of cleaning up review data
    ];

    const result = await Product.aggregate(aggregationPipeline);
    const product = result[0];

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
    const { name, description, price, images, stock, category, tags } = req.body;
    
    const product = new Product({
        name, description, price, images, stock, category, tags
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
        // More robustly update fields only if they are provided in the request body
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
        await product.deleteOne(); // Mongoose 6+ recommended way
        // TODO: Also consider deleting associated reviews, cart items, etc.
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});


// --- NEW FUNCTION: Create a product review ---
// @desc    Create a new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const { id: productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    // Check if the user has already reviewed this product
    const alreadyReviewed = await Review.findOne({
        product: productId,
        user: req.user._id, // Assumes `protect` middleware adds user to req
    });

    if (alreadyReviewed) {
        res.status(400);
        throw new Error('You have already reviewed this product');
    }
    
    // Create the review
    const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
        product: productId,
    };
    
    const createdReview = await Review.create(review);
    
    // Respond successfully
    res.status(201).json(createdReview);
});

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview
};