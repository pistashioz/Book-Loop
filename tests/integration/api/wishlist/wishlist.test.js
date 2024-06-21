const db = require('../models');
const { Wishlist, Listing, User } = db;
const { Op, ValidationError } = require('sequelize');

// Add a listing to the wishlist
exports.addListingToWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { listingId } = req.body;

        // Check if listing exists and ensure it doesn't belong to the user
        const listing = await Listing.findByPk(listingId, {
            attributes: ['sellerUserId', 'availability']
        });

        if (!listing || listing.availability === 'Hidden') {
            return res.status(400).json({ message: 'Cannot add a non-existing or hidden listing to wishlist' });
        }

        if (listing.sellerUserId === userId) {
            return res.status(400).json({ message: 'Cannot add your own listing to wishlist' });
        }

        // Check if the listing is already in the wishlist
        const existingWishlistEntry = await Wishlist.findOne({ where: { userId, listingId } });
        if (existingWishlistEntry) {
            return res.status(400).json({ message: 'Listing already in wishlist' });
        }

        // Add listing to wishlist
        await Wishlist.create({ userId, listingId });
        res.status(201).json({ message: 'Listing added to wishlist' });
    } catch (error) {
        console.error("Error adding listing to wishlist:", error);
        res.status(500).json({ message: 'Error adding listing to wishlist', error: error.message });
    }
};

// Get wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.userId;

        const wishlist = await Wishlist.findAll({
            where: { userId },
            include: {
                model: Listing,
                as: 'Listing', 
                attributes: ['listingId', 'listingTitle', 'price', 'listingCondition', 'availability'],
                where: { availability: { [Op.ne]: 'Hidden' } },
                include: [
                    { model: db.BookEdition, attributes: ['title'], as: 'BookEdition' },
                    { model: db.ListingImage, attributes: ['imageUrl'], as: 'ListingImages', limit: 1 }
                ]
            }
        });

        const formattedWishlist = wishlist.map(item => ({
            listingId: item.Listing.listingId,
            listingTitle: item.Listing.listingTitle,
            price: item.Listing.price,
            listingCondition: item.Listing.listingCondition,
            listingImage: item.Listing.ListingImages.length > 0 ? item.Listing.ListingImages[0].imageUrl : null,
            bookEditionTitle: item.Listing.BookEdition.title,
            addedDate: item.addedDate
        }));

        res.status(200).json(formattedWishlist);
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
    }
};

// Remove a listing from the wishlist
exports.removeListingFromWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { listingId } = req.params;

        // Fetch the listing to check its availability
        const listing = await Listing.findByPk(listingId, {
            attributes: ['availability']
        });

        if (!listing || listing.availability === 'Hidden') {
            return res.status(400).json({ message: 'Cannot remove a non-existing or hidden listing from wishlist' });
        }

        const deleted = await Wishlist.destroy({
            where: {
                userId,
                listingId
            }
        });

        if (deleted) {
            res.status(200).json({ message: 'Listing removed from wishlist' });
        } else {
            res.status(404).json({ message: 'Listing not found in wishlist' });
        }
    } catch (error) {
        console.error("Error removing listing from wishlist:", error);
        res.status(500).json({ message: 'Error removing listing from wishlist', error: error.message });
    }
};