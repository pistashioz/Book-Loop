const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { verifyToken } = require('../middleware/authJwt');

// Middleware to log request details and compute response time
router.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        console.log(`${req.method} ${req.originalUrl} took ${duration.toFixed(3)} seconds`);
    });
    next(); // Proceed to the next middleware or route handler
});

// Optional: Middleware to check if user is authenticated
/*router.use((req, res, next) => {
    if (req.isAuthenticated()) { // Assuming req.isAuthenticated() is a method of checking login - still needs to be implemented
        next(); // User is authenticated, proceed to the next handler
    } else {
        res.status(401).json({ message: "Unauthorized: Please log in." });
    }
});*/

// Routes configuration
router.route('/')
    .get(usersController.findAll)
    .post(usersController.create);

router.route('/:id')
    .get(usersController.findOne)
    .put(usersController.update)
    .delete(usersController.delete);

router.post('/login', usersController.login);

router.post('/logout', verifyToken, usersController.logout);

router.get('/validate-session', verifyToken, usersController.validateSession); // Verify session and return user info

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'USERS: Route not found. Please check your URL.' });
});

module.exports = router;
