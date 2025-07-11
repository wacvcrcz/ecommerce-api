const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware'); 
const { admin } = require('../middleware/adminMiddleware'); 

router.route('/')
    .post(protect, createOrder)
    .get(protect, getMyOrders);

router.route('/:id')
    .get(protect, getOrderById);
    
router.route('/:id/status')
    .put(protect, admin, updateOrderStatus);

module.exports = router;