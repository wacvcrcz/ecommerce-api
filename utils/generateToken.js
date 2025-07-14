// utils/generateToken.js

const jwt = require('jsonwebtoken'); // Use CommonJS require

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = generateToken; // Use CommonJS module.exports