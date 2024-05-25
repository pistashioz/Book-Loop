const jwt = require('jsonwebtoken');
const db = require('../models');
const { User } = db;
const { verifyTokenHelper } = require('../utils/jwtHelpers');

// Middleware to extract user ID and admin status from the token
const extractUserId = async (req, res, next) => {
    // Retrieve token from cookies 
    const token = req.cookies?.accessToken;

    if (!token) {
        return next(); // No token, proceed without setting userId
    }

    try {
        const decoded = await verifyTokenHelper(token);

        // Fetch the user details to check if the user is an admin
        const user = await User.findByPk(decoded.id);
        if (user) {
            req.userId = decoded.id;
            req.sessionId = decoded.session;
            req.isAdmin = user.isAdmin;
        } else {
            return res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({ message: 'Token has expired. Please log in again.' });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token. Please log in again.' });
        } else {
            console.error('Error decoding token:', err);
            return res.status(500).json({ message: 'Failed to authenticate token.' });
        }
    }
    next();
};

module.exports = extractUserId;
