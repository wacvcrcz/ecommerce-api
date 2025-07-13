// models/couponModel.js

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        trim: true,
        uppercase: true, // Automatically convert coupon codes to uppercase
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: [true, 'Discount type is required'],
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: 0,
    },
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required'],
    },
    minPurchase: {
        type: Number,
        default: 0, // Minimum purchase amount to be eligible for the coupon
    },
    usageLimit: {
        type: Number,
        default: 1, // How many times a coupon can be used in total
    },
    timesUsed: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true
});

// Virtual to check if the coupon is still valid (not expired and within usage limit)
couponSchema.virtual('isValid').get(function() {
    return this.isActive && new Date() < this.expiryDate && this.timesUsed < this.usageLimit;
});

module.exports = mongoose.model('Coupon', couponSchema);