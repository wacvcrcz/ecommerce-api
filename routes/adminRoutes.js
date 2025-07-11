const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const { admin } = require('../middleware/adminMiddleware'); 

// User Management Routes
const {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} = require('../controllers/userController');

router.route('/users').get(protect, admin, getUsers);
router.route('/users/:id')
    .get(protect, admin, getUserById)
    .put(protect, admin, updateUser)
    .delete(protect, admin, deleteUser);


// Order Management Route
const { getAllOrders } = require('../controllers/orderController');
router.route('/orders').get(protect, admin, getAllOrders);


// Dashboard & Analytics Routes
const {
    getDashboardStats,
    getOrdersOverview,
    getTopProducts,
    getSalesSummary,
} = require('../controllers/adminController');

router.get('/stats', protect, admin, getDashboardStats);
router.get('/orders-overview', protect, admin, getOrdersOverview);
router.get('/top-products', protect, admin, getTopProducts);
router.get('/sales-summary', protect, admin, getSalesSummary);

module.exports = router;