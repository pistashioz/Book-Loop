const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist.controller');
const { verifyToken } = require('../middleware/authJwt');


router.route('/')
    .post(verifyToken, wishlistController.addListingToWishlist) // Add listing to wishlist
    .get(verifyToken, wishlistController.getWishlist); // Get wishlist

// Remove listing from wishlist
router.delete('/:listingId', verifyToken, wishlistController.removeListingFromWishlist);

module.exports = router;
