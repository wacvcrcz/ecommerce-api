const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const salesData = await Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    
    const totalRevenue = salesData.length > 0 ? salesData[0].totalRevenue : 0;

    res.json({
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
    });
});

// @desc    Get orders overview (e.g., count by status)
// @route   GET /api/admin/orders-overview
// @access  Private/Admin
const getOrdersOverview = asyncHandler(async (req, res) => {
    const overview = await Order.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    res.json(overview);
});

// @desc    Get top selling products
// @route   GET /api/admin/top-products
// @access  Private/Admin
const getTopProducts = asyncHandler(async (req, res) => {
    const topProducts = await Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
        { $unwind: '$products' },
        {
            $group: {
                _id: '$products.product',
                totalSold: { $sum: '$products.quantity' }
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },
        {
            $project: {
                _id: 0,
                productId: '$_id',
                name: '$productDetails.name',
                totalSold: '$totalSold'
            }
        }
    ]);
    res.json(topProducts);
});

// @desc    Get sales summary by a time period (e.g., daily for last 30 days)
// @route   GET /api/admin/sales-summary
// @access  Private/Admin
const getSalesSummary = asyncHandler(async (req, res) => {
    const salesSummary = await Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalSales: { $sum: '$totalAmount' },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    res.json(salesSummary);
});

module.exports = {
    getDashboardStats,
    getOrdersOverview,
    getTopProducts,
    getSalesSummary,
};