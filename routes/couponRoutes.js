// routes/couponRoutes.js

const express = require('express');
const router = express.Router();
const {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
} = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

// All routes here are protected and admin-only
router.use(protect, admin);

router.post('/validate', validateCoupon);

router.route('/')
    .get(getCoupons)
    .post(createCoupon);

router.route('/:id')
    .put(updateCoupon)
    .delete(deleteCoupon);

module.exports = router;