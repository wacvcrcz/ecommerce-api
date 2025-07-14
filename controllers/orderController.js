const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Coupon = require('../models/couponModel'); // --- IMPORT: Coupon model for validation

// @desc    Create new order with optional coupon
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    // --- DESTRUCTURE: Add couponCode to the request body variables ---
    const { orderItems, shippingAddress, contact, couponCode } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('No order items in the cart');
    }

    // --- Step 1: Calculate Subtotal & Prepare Order Items ---
    const productIds = orderItems.map(item => item._id); // Use _id from cart items
    const productsFromDB = await Product.find({ _id: { $in: productIds } });
    const productsMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

    let subtotal = 0;

    const finalOrderItems = orderItems.map(item => {
        const product = productsMap.get(item._id);

        if (!product) {
            res.status(404);
            throw new Error(`Product with name ${item.name} not found in database.`);
        }
        
        if (product.stock < item.quantity) {
            res.status(400);
            throw new Error(`Not enough stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`);
        }
        
        subtotal += product.price * item.quantity;
        
        return {
            product: product._id,
            quantity: item.quantity,
            price: product.price, // Always use price from DB for security
        };
    });

    // --- Step 2: Validate Coupon & Calculate Discount (if provided) ---
    let discountAmount = 0;
    let finalTotalAmount = subtotal;
    let couponAppliedData = null;
    let couponToUpdate = null; // To hold the Mongoose document for later update

    if (couponCode) {
        couponToUpdate = await Coupon.findOne({ code: couponCode.toUpperCase() });

        // Validation checks
        if (!couponToUpdate) { res.status(400); throw new Error('Invalid coupon code'); }
        if (!couponToUpdate.isValid) { res.status(400); throw new Error('This coupon is not active or has expired'); }
        if (subtotal < couponToUpdate.minPurchase) { res.status(400); throw new Error(`Order total must be at least $${couponToUpdate.minPurchase} to use this coupon`); }

        // Calculate discount based on type
        if (couponToUpdate.discountType === 'percentage') {
            discountAmount = (subtotal * couponToUpdate.discountValue) / 100;
        } else if (couponToUpdate.discountType === 'fixed') {
            discountAmount = couponToUpdate.discountValue;
        }

        // Ensure discount cannot be greater than the subtotal
        discountAmount = Math.min(discountAmount, subtotal);
        finalTotalAmount = subtotal - discountAmount;
        
        // Prepare data for storing in the Order document
        couponAppliedData = {
            code: couponToUpdate.code,
            discountType: couponToUpdate.discountType,
            discountValue: couponToUpdate.discountValue,
        };
    }

    // --- Step 3: Create and Save the Order ---
    const order = new Order({
        user: req.user._id,
        products: finalOrderItems,
        shippingAddress,
        contact,
        totalAmount: finalTotalAmount.toFixed(2), // Use the final, potentially discounted, amount
        discountAmount: discountAmount.toFixed(2),
        couponApplied: couponAppliedData,
    });
    
    const createdOrder = await order.save();
    
    // --- Step 4: Update Coupon Usage (if used) ---
    if (couponToUpdate) {
        couponToUpdate.timesUsed += 1;
        await couponToUpdate.save();
    }
    
    // --- Step 5: Post-Order Actions (e.g., reduce stock, send notifications) ---
    for (const item of finalOrderItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }
    
    // WhatsApp notification simulation
    console.log(`--- WHATSAPP SIMULATION ---`);
    console.log(`To: ${process.env.WHATSAPP_ADMIN_NUMBER}`);
    console.log(`New Order #${createdOrder._id} from ${req.user.name}. Total: $${createdOrder.totalAmount}. Contact: ${contact}`);
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
    if (order.user.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }
    
    // Only allow cancellation if status is 'pending'
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
    if (order.user.toString() !== req.user._id.toString()) { res.status(403); throw new Error('Not authorized'); }

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