// controllers/couponController.js

const asyncHandler = require('express-async-handler');
const Coupon = require('../models/couponModel');
const Order = require('../models/orderModel'); // We might need this later

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
const getCoupons = asyncHandler(async (req, res) => {
    const coupons = await Coupon.find({});
    res.json(coupons);
});

// @desc    Create a new coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
    const { code, discountType, discountValue, expiryDate, minPurchase, usageLimit } = req.body;

    const couponExists = await Coupon.findOne({ code });
    if (couponExists) {
        res.status(400);
        throw new Error('Coupon with this code already exists');
    }

    const coupon = new Coupon({
        code,
        discountType,
        discountValue,
        expiryDate,
        minPurchase,
        usageLimit
    });

    const createdCoupon = await coupon.save();
    res.status(201).json(createdCoupon);
});

// @desc    Update a coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
const updateCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (coupon) {
        coupon.discountType = req.body.discountType || coupon.discountType;
        coupon.discountValue = req.body.discountValue || coupon.discountValue;
        coupon.expiryDate = req.body.expiryDate || coupon.expiryDate;
        coupon.minPurchase = req.body.minPurchase ?? coupon.minPurchase; // Use ?? to allow 0
        coupon.usageLimit = req.body.usageLimit ?? coupon.usageLimit;
        coupon.isActive = req.body.isActive ?? coupon.isActive;

        const updatedCoupon = await coupon.save();
        res.json(updatedCoupon);
    } else {
        res.status(404);
        throw new Error('Coupon not found');
    }
});

// @desc    Delete a coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (coupon) {
        await coupon.deleteOne();
        res.json({ message: 'Coupon removed' });
    } else {
        res.status(404);
        throw new Error('Coupon not found');
    }
});

// @desc    Validate a coupon code and calculate the discount
// @route   POST /api/coupons/validate
// @access  Public
const validateCoupon = asyncHandler(async (req, res) => {
    const { couponCode, subtotal } = req.body;

    if (!couponCode || !subtotal) {
        res.status(400);
        throw new Error('Coupon code and subtotal are required');
    }

    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

    if (!coupon) { res.status(404); throw new Error('Coupon not found'); }
    if (!coupon.isValid) { res.status(400); throw new Error('This coupon is not active or has expired'); }
    if (subtotal < coupon.minPurchase) { res.status(400); throw new Error(`Order total must be at least $${coupon.minPurchase}`); }
    
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
        discountAmount = (subtotal * coupon.discountValue) / 100;
    } else { // Fixed
        discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, subtotal);
    const newTotal = subtotal - discountAmount;
    
    res.json({
        message: 'Coupon applied successfully!',
        discountAmount: discountAmount.toFixed(2),
        newTotal: newTotal.toFixed(2)
    });
});

module.exports = {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
};