const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    console.log('--- DEBUG: Authorization Header ---');
    console.log(req.headers.authorization);
    console.log('------------------------------------');

    // Check if the Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (e.g., "Bearer <token>" -> "<token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify token's signature and check if it's expired.
            // This will throw an error if the token is invalid.
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch the user from the database using the ID from the token payload.
            // We exclude the password from the user object attached to the request.
            req.user = await User.findById(decoded.id).select('-password');
            
            // Check if user still exists in the database
            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            // If everything is okay, proceed to the next middleware or route handler.
            next();
        } catch (error) {
            // This catch block handles errors from jwt.verify (e.g., invalid signature, expired token)
            console.error('Authentication Error:', error.message);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    // If no token is found in the header
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token provided');
    }
});

module.exports = { protect };