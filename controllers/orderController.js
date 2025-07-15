const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Coupon = require('../models/couponModel');


// --- ADDED ---
// This can be moved to a global config or admin settings model later
const CUSTOMIZATION_FEE = 3.00;


// @desc    Create new order with size, customization, and optional coupon
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    // Destructure all expected fields from the request body
    const { orderItems, shippingAddress, contact, couponCode } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400); throw new Error('No order items in the cart');
    }

    // Get all product details from the database at once for efficiency
    const productIds = orderItems.map(item => item._id);
    const productsFromDB = await Product.find({ _id: { $in: productIds } });
    const productsMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

    let subtotal = 0;
    const finalOrderItems = []; // This is the array we will build correctly

    // Loop through the items sent from the frontend
    for (const item of orderItems) {
        const product = productsMap.get(item._id);
        if (!product) {
            res.status(404); throw new Error(`Product with name ${item.name} not found.`);
        }

        // 1. Validate size and stock for that size
        if (!item.size) {
            res.status(400); throw new Error(`Size must be specified for ${product.name}.`);
        }
        const sizeInventory = product.inventory.find(inv => inv.size === item.size);
        if (!sizeInventory || sizeInventory.quantity < item.quantity) {
            res.status(400);
            throw new Error(`Not enough stock for ${product.name} (Size: ${item.size}). Requested: ${item.quantity}, Available: ${sizeInventory?.quantity || 0}`);
        }

        // 2. Calculate price including any customization fee
        let customizationFeeApplied = 0;
        const customizationData = {}; // Start with an empty object
        if (item.customization && (item.customization.name || item.customization.number)) {
            customizationFeeApplied = CUSTOMIZATION_FEE * item.quantity;
            customizationData.name = item.customization.name;
            customizationData.number = item.customization.number;
            customizationData.appliedFee = CUSTOMIZATION_FEE;
        }
        
        // Add product price and fees to subtotal
        subtotal += (product.price * item.quantity) + customizationFeeApplied;
        
        // --- 3. THE CRITICAL FIX: Push a complete object to the array ---
        finalOrderItems.push({
            product: product._id,
            quantity: item.quantity,
            price: product.price,       // Price of the item itself
            size: item.size,            // <-- PASSING THE SIZE
            customization: customizationData, // <-- PASSING THE CUSTOMIZATION
        });
    }

    // 4. Coupon and Discount Logic (This logic is fine as is)
    let discountAmount = 0;
    let finalTotalAmount = subtotal;
    let couponAppliedData = null;
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
        if (coupon && coupon.isValid && subtotal >= coupon.minPurchase) {
            discountAmount = coupon.discountType === 'percentage' ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
            discountAmount = Math.min(discountAmount, subtotal);
            finalTotalAmount = subtotal - discountAmount;
            couponAppliedData = { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue };
            await Coupon.findByIdAndUpdate(coupon._id, { $inc: { timesUsed: 1 } });
        } else {
             res.status(400).json({ message: 'Invalid or inapplicable coupon code.'});
             return;
        }
    }

    // 5. Create and Save the Order document
    const order = new Order({
        user: req.user._id,
        products: finalOrderItems, // Use the correctly built array
        shippingAddress,
        contact,
        totalAmount: finalTotalAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        couponApplied: couponAppliedData,
    });
    
    const createdOrder = await order.save(); // This will now pass validation
    
    // 6. Update stock for each specific item and size
    for (const item of finalOrderItems) {
        await Product.updateOne(
            { _id: item.product, "inventory.size": item.size },
            { $inc: { "inventory.$.quantity": -item.quantity } }
        );
    }
    
    res.status(201).json(createdOrder);
});

// ... The rest of the functions from your provided code, no changes needed ...

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
        // Ensure user is the owner or an admin
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

// @desc    Cancel an order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.user._id.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }
    
    if (order.status !== 'pending') {
        res.status(400);
        throw new Error(`Order cannot be cancelled. Status is: ${order.status}`);
    }

    // Return stock for cancelled items
    for (const item of order.products) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    
    order.status = 'cancelled';
    const updatedOrder = await order.save();
    res.json(updatedOrder);
});

// @desc    Update shipping details
// @route   PUT /api/orders/:id/shipping
// @access  Private
const updateShippingDetails = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.user._id.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }

    if (order.status !== 'pending') {
        res.status(400);
        throw new Error(`Shipping details cannot be updated. Order status is: ${order.status}`);
    }
    
    const { shippingAddress, contact } = req.body;
    order.shippingAddress = shippingAddress || order.shippingAddress;
    order.contact = contact || order.contact;
    
    const updatedOrder = await order.save();
    res.json(updatedOrder);
});


module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getAllOrders,
    cancelOrder, 
    updateShippingDetails 
};