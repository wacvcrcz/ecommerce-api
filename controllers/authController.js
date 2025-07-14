// src/controllers/authController.js

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel.js');
const generateToken = require('../utils/generateToken.js');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({ name, email, password });

    if (user) {
        generateToken(res, user._id); 

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            shippingAddress: user.shippingAddress,
            contact: user.contact,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // We still need .select('+password') here to ensure we fetch the password
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
        generateToken(res, user._id);

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            shippingAddress: user.shippingAddress,
            contact: user.contact,
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});


module.exports = { registerUser, loginUser }; // Use CommonJS module.exports