const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Order must belong to a user'],
    },
    products: [{
        product: {
            type: mongoose.Schema.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        price: { // Price at the time of order
            type: Number,
            required: true,
        },
        // --- ADDED ---
        size: {
            type: String,
            required: [true, 'Each product in an order must have a size specified.'],
        },
        customization: { // Optional customization details
            name: { type: String, trim: true },
            number: { type: Number },
            appliedFee: { type: Number, default: 0 } // Store the fee that was applied
        }
    }],
    totalAmount: {
        type: Number,
        required: [true, 'Order must have a total amount'],
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    couponApplied: {
        code: String,
        discountType: String,
        discountValue: Number,
    },
    discountAmount: {
        type: Number,
        default: 0,
    },
    contact: {
        type: String,
        required: [true, 'Please provide a contact number for the order'],
    },
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
    },
    whatsappNotified: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// Populate user and product details
orderSchema.pre(/^find/, function(next) {
    this.populate('user', 'name email').populate({
        path: 'products.product',
        select: 'name price images',
    });
    next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;