const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    const { orderItems, shippingAddress, contact } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('No order items');
    }

    // Fetch products from DB to ensure prices are correct and stock is available
    const productIds = orderItems.map(item => item.product);
    const productsFromDB = await Product.find({ _id: { $in: productIds } });

    let totalAmount = 0;
    const finalOrderItems = orderItems.map(item => {
        const product = productsFromDB.find(p => p._id.toString() === item.product);
        if (!product) throw new Error(`Product with id ${item.product} not found`);
        if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);
        
        totalAmount += product.price * item.quantity;
        return {
            product: product._id,
            quantity: item.quantity,
            price: product.price // Use price from DB, not from client
        };
    });

    const order = new Order({
        user: req.user._id,
        products: finalOrderItems,
        shippingAddress,
        contact,
        totalAmount,
    });
    
    const createdOrder = await order.save();
    
    // TODO: Implement WhatsApp notification logic here
    // e.g., using Twilio API
    console.log(`--- WHATSAPP SIMULATION ---`);
    console.log(`To: ${process.env.WHATSAPP_ADMIN_NUMBER}`);
    console.log(`New Order #${createdOrder._id} from ${req.user.name}. Total: $${totalAmount}. Contact: ${contact}`);
    console.log(`-------------------------`);
    
    res.status(201).json(createdOrder);
});

// @desc    Get logged in user's orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    
    if (order) {
        // Check if the user is the owner or an admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to view this order');
        }
        res.json(order);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Update order status (by Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.status = req.body.status || order.status;
        
        // Mark as notified if status is 'confirmed'
        if (req.body.status === 'confirmed') {
            order.whatsappNotified = true;
        }

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Get all orders (by Admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
});


module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getAllOrders
};