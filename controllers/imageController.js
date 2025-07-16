const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const axios = require('axios');
const Product = require('../models/productModel');

// @desc    Fetches a product image from its source and streams it to the client
// @route   GET /api/images/product/:productId/index/:imageIndex
// @access  Public
const proxyImage = asyncHandler(async (req, res) => {
    const { productId, imageIndex } = req.params;

    // --- 1. Validate the inputs for security and correctness ---
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        res.status(400);
        throw new Error('Invalid Product ID format');
    }

    const index = parseInt(imageIndex, 10);
    if (isNaN(index) || index < 0) {
        res.status(400);
        throw new Error('Image index must be a valid non-negative number');
    }

    // --- 2. Find the product and get the specific image URL ---
    // .select('images') and .lean() make this query highly optimized.
    // We are overriding the default `pre('find')` populate hook by not asking for it.
    const product = await Product.findById(productId).select('images').lean();

    if (!product || !product.images || index >= product.images.length) {
        res.status(404);
        throw new Error('Image not found');
    }

    const imageUrl = product.images[index];

    try {
        // --- 3. Fetch the image from its original source as a stream ---
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream', // Key for memory efficiency!
        });

        // --- 4. Pipe the image stream directly to the client's response ---
        
        // Forward the original Content-Type header (e.g., 'image/jpeg', 'image/png')
        res.setHeader('Content-Type', response.headers['content-type']);
        
        // Add caching headers for client-side performance.
        // The browser will cache this image for 1 day (86400 seconds).
        res.setHeader('Cache-Control', 'public, max-age=86400');

        response.data.pipe(res);

    } catch (error) {
        // Handle cases where the original image URL is broken or the host is down
        console.error('Image Proxy Error:', error.message);
        res.status(502); // 502 Bad Gateway is a standard error for proxy failures
        throw new Error('Could not retrieve the image from the source.');
    }
});

module.exports = {
    proxyImage,
};