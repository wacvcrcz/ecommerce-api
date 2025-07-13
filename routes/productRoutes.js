const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview,
} = require('../controllers/productController');


const { protect } = require('../middleware/authMiddleware'); 
const { admin } = require('../middleware/adminMiddleware');   

router.route('/')
    .get(getProducts)
    .post(protect, admin, createProduct); // This will now work correctly

router.route('/:id')
    .get(getProductById)
    .put(protect, admin, updateProduct)
    .delete(protect, admin, deleteProduct);


router.route('/:id/reviews')
    .post(protect, createProductReview);

module.exports = router;