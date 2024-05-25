const db = require('../models');
const { User } = db;

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
    // Fetch the user details
    const user = await User.findByPk(req.userId);
    if (!user) {
        return res.status(404).send({ message: "User not found." });
    }

    if (!user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
};

module.exports = { isAdmin };
