const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listings.controller');
const { verifyToken } = require('../middleware/authJwt');
const extractUserId = require('../middleware/extractUserId');

// Middleware to log request details and compute response time
router.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        console.log(`${req.method} ${req.originalUrl} took ${duration.toFixed(3)} seconds`);
    });
    next(); // Proceed to the next middleware or route handler
});

router.route('/')
    .post(verifyToken, listingsController.createListing)
    .get(listingsController.findAllListings)

/* // Route to create a new listing
router.post('/', verifyToken, listingsController.createListing); */

router.route('/:listingId')
    .get( extractUserId, listingsController.findListingById)
    .patch(verifyToken, listingsController.updateListing)


module.exports = router;
