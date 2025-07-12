const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    // Note: The request sends 'orderItems', but our database schema uses 'products'.
    // This is perfectly fine; we just need to handle the mapping correctly.
    const { orderItems, shippingAddress, contact } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('No order items');
    }

    // --- FIX 1: Get product IDs from the request using `item.productId` ---
    const productIds = orderItems.map(item => item.productId);

    // Fetch all products from DB in a single query for efficiency
    const productsFromDB = await Product.find({ _id: { $in: productIds } });

    // This helps quickly look up products by their ID in the next step
    const productsMap = new Map(productsFromDB.map(p => [p._id.toString(), p]));

    let totalAmount = 0;
    
    // Build the final array for our order schema
    const finalOrderItems = orderItems.map(item => {
        // --- FIX 2: Find the matching product from our map using `item.productId` ---
        const product = productsMap.get(item.productId);
        
        // --- FIX 3: Update error message to use the correct variable for accurate debugging ---
        if (!product) {
            // Throw a 404 error because the resource (product) was not found
            res.status(404);
            throw new Error(`Product with id ${item.productId} not found`);
        }
        
        if (product.stock < item.quantity) {
            // Throw a 400 bad request error because the requested quantity is too high
            res.status(400);
            throw new Error(`Not enough stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`);
        }
        
        totalAmount += product.price * item.quantity;
        
        // Return an object that matches the `products` array in our orderSchema
        return {
            product: product._id,       // This field is named 'product' in the schema
            quantity: item.quantity,
            price: product.price,       // Always use the price from the DB to prevent client-side manipulation
        };
    });

    const order = new Order({
        user: req.user._id,
        products: finalOrderItems, // The array we just created
        shippingAddress,
        contact,
        totalAmount,
    });
    
    const createdOrder = await order.save();
    
    // TODO: Implement WhatsApp notification logic here
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
    // The `.populate` in the schema's 'pre-find' hook will run here automatically
    const order = await Order.findById(req.params.id);
    
    if (order) {
        // Check if the user is the owner or an admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403); // Forbidden
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