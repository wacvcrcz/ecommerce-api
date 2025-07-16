const express = require('express');
const { proxyImage } = require('../controllers/imageController');

const router = express.Router();

// This defines the public-facing URL for our image proxy.
// It's designed to be secure, only allowing images that belong to a product.
// e.g., GET /api/images/product/60d5f1.../index/0
router.get('/product/:productId/index/:imageIndex', proxyImage);

module.exports = router;