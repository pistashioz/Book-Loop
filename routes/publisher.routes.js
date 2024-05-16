const express = require('express');
const router = express.Router();
const publisherController = require('../controllers/publisher.controller');
const { verifyToken } = require('../middleware/authJwt');
const { isAdmin } = require('../middleware/admin');

// Middleware to log request details and compute response time
router.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        console.log(`${req.method} ${req.originalUrl} took ${duration.toFixed(3)} seconds`);
    });
    next(); // Proceed to the next middleware or route handler
});

// Routes for handling publisher operations
router.route('/')
    .get(publisherController.findAll)
    .post(verifyToken, isAdmin, publisherController.create);


router.route('/:publisherId')
    .delete(verifyToken, isAdmin, publisherController.deletePublisher);

    router.route('/:publisherId/editions')
    .get(publisherController.findEditionsByPublisher);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'The requested publisher could not be found. Please check the URL and API documentation.' });
});


module.exports = router;
