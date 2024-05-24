const jwt = require('jsonwebtoken');
const db = require('../models');
const { User } = db;


// Middleware to extract user ID and admin status from the token
const extractUserId = async (req, res, next) => {
    // Retrieve token from cookies 
    const token = req.cookies?.accessToken 

    if (!token) {
        return next(); // No token, proceed without setting userId
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        

        // Fetch the user details to check if the user is an admin
        const user = await User.findByPk(decoded.id);
        if (user) {
            req.userId = decoded.id;
            req.isAdmin = user.isAdmin;
        }
    } catch (err) {
        console.error('Error decoding token:', err);
    }

    next();
};

module.exports = extractUserId;