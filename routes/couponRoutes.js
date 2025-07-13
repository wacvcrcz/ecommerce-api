// routes/couponRoutes.js  (This is now for ADMIN only)

const express = require('express');
const router = express.Router();
const {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
} = require('../controllers/couponController'); // Removed validateCoupon from here
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// All routes in this file are for admins.
router.use(protect, admin);

router.route('/')
    .get(getCoupons)
    .post(createCoupon);

router.route('/:id')
    .put(updateCoupon)
    .delete(deleteCoupon);

module.exports = router;