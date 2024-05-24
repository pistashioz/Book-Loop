const jwt = require('jsonwebtoken');
const db = require('../models');
const { User } = db;


// Middleware to extract user ID and admin status from the token
const extractUserId = async (req, res, next) => {
    // Retrieve token from cookies or authorization header
    const token = req.cookies?.accessToken 

    if (!token) {
        return next(); // No token, proceed without setting userId
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;

        // Fetch the user details to check if the user is an admin
        const user = await User.findByPk(req.userId);
        if (user) {
            req.isAdmin = user.isAdmin;
        }
    } catch (err) {
        console.error('Error decoding token:', err);
    }

    next();
};

module.exports = extractUserId;