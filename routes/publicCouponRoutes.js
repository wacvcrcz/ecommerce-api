// routes/publicCouponRoutes.js

const express = require('express');
const router = express.Router();
const { validateCoupon } = require('../controllers/couponController');

// This is a public route, so no `protect` or `admin` middleware is used here.
router.post('/validate', validateCoupon);

module.exports = router;