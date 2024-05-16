const { Op, ValidationError } = require("sequelize");
const db = require('../models')
const { Listing, BookEdition, User, PurchaseReview, NavigationHistory, Wishlist, Work, BookAuthor, Person, BookGenre, Genre, PostalCode } = db;

/**
 * Create a new listing.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.createListing = async (req, res) => {
    try {
        const { sellerUserId, ISBN, listingTitle, price, listingCondition, listingDescription } = req.body;

        // Check if ISBN exists in the BookEdition table
        const bookEdition = await BookEdition.findByPk(ISBN);

        // Set availability based on the existence of the ISBN in the database
        let availability = bookEdition ? 'Active' : 'Pending Approval';

        // Create a new listing
        const newListing = await Listing.create({
            sellerUserId,
            ISBN,
            listingTitle,
            listingDate: new Date(),
            price,
            listingCondition,
            availability,
            listingDescription
        });

        res.status(201).json({
            success: true,
            message: "Listing created successfully.",
            listing: newListing
        });
    } catch (error) {
        console.error("Error creating listing:", error);
        if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: error.message || "Some error occurred while creating the listing." });
        }
    }
};



/**
 * Update an existing listing.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updateListing = async (req, res) => {
    try {
        const { listingId } = req.params;
        const { ISBN, listingTitle, price, listingCondition, availability, listingDescription } = req.body;

        // Find the listing by ID
        const listing = await Listing.findByPk(listingId);

        // If listing is not found, return 404 error
        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found." });
        }

        // Update fields if provided and valid
        if (ISBN && listing.availability === 'Pending Approval') {
            const bookEdition = await BookEdition.findByPk(ISBN);
            listing.ISBN = ISBN;
            listing.availability = bookEdition ? 'Active' : 'Pending Approval';
        }

        if (listingTitle) {
            listing.listingTitle = listingTitle;
        }

        if (price) {
            listing.price = price;
        }

        if (listingCondition) {
            listing.listingCondition = listingCondition;
        }

        if (availability && listing.availability !== 'Pending Approval') {
            listing.availability = availability;
        }

        if (listingDescription) {
            listing.listingDescription = listingDescription;
        }

        // Save the updated listing
        await listing.save();

        res.status(200).json({
            success: true,
            message: "Listing updated successfully.",
            listing
        });
    } catch (error) {
        console.error("Error updating listing:", error);
        if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: error.message || "Some error occurred while updating the listing." });
        }
    }
};


/**
 * Retrieve a specific listing by ID with detailed information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findListingById = async (req, res) => {
    try {
        const { listingId } = req.params;
        const { userId, isAdmin } = req;

        // Find the listing by ID with related information
        const listing = await Listing.findByPk(listingId, {
            include: [
                {
                    model: User,
                    attributes: ['userId', 'username', 'profileImage', 'showCity', 'postalCode', 'averageRating'],
                    include: {
                        model: PostalCode,
                        as: 'postalCodeDetails',
                        attributes: ['locality', 'country']
                    }
                },
                {
                    model: BookEdition,
                    include: {
                        model: Work,
                        include: [
                            {
                                model: BookAuthor,
                                include: {
                                    model: Person,
                                    attributes: ['personName']
                                }
                            },
                            {
                                model: BookGenre,
                                include: {
                                    model: Genre,
                                    attributes: ['genreName']
                                }
                            }
                        ]
                    },
                    attributes: ['ISBN', 'title', 'language', 'editionType', 'pageNumber']
                }
            ]
        });

        // Check if listing exists
        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found.' });
        }

        // Check if the user is allowed to view the listing
        const isSeller = listing.sellerUserId === userId;

        if (!isSeller && !isAdmin && (listing.availability === 'Hidden' || listing.availability === 'Pending Approval')) {
            return res.status(403).json({ success: false, message: 'You are not authorized to view this listing.' });
        }

        if (isAdmin && listing.availability === 'Hidden') {
            return res.status(403).json({ success: false, message: 'You are not authorized to view hidden listings.' });
        }

        // Get additional details: views count and wishlist count
        const viewsCount = await NavigationHistory.count({
            where: {
                entityTypeId: 2,
                elementId: listingId.toString(),
                actionType: 'view'
            }
        });

        const wishlistCount = await Wishlist.count({ where: { listingId } });

        // Prepare the response data
        const seller = listing.User;
        const bookEdition = listing.BookEdition;
        const work = bookEdition.Work;
        const authors = work.bookAuthors.map(ba => ba.person.personName).join(', ');
        const genres = work.bookGenres.map(bg => bg.genre.genreName).join(', ');

        const response = {
            listingId: listing.listingId,
            listingTitle: listing.listingTitle,
            listingDescription: listing.listingDescription,
            price: listing.price,
            listingDate: listing.listingDate,
            listingCondition: listing.listingCondition,
            availability: listing.availability,
            seller: {
                username: seller.username,
                profileImage: seller.profileImage,
                averageRating: seller.averageRating,
                purchaseReviewsCount: await PurchaseReview.count({ where: { sellerUserId: seller.userId } }),
                locality: seller.showCity && seller.postalCode ? seller.postalCodeDetails.locality : null,
                country: seller.showCity && seller.postalCode ? seller.postalCodeDetails.country : null
            },
            viewsCount,
            wishlistCount,
            book: {
                ISBN: bookEdition.ISBN,
                title: bookEdition.title,
                language: bookEdition.language,
                editionType: bookEdition.editionType,
                pageNumber: bookEdition.pageNumber,
                authors,
                genres
            },
            links: [{ rel: "self", href: `/listings/${listing.listingId}`, method: "GET" }]
        };

        res.status(200).json({ success: true, listing: response });
    } catch (error) {
        console.error("Error fetching listing:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching the listing." });
    }
};