// Import DB configuration and Sequelize operators
const db = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const dayjs = require('dayjs');
const { Op, ValidationError, where } = require('sequelize');


// Access models through the centralized db object
const { User, UserConfiguration, Configuration, SessionLog, Token, PostalCode, Block, NavigationHistory, EntityType, Listing, BookEdition, UserFavoriteAuthor, UserFavoriteGenre, Genre, Person   } = db;
const { issueAccessToken, handleRefreshToken } = require('../middleware/authJwt'); 

const MAX_ENTRIES_PER_TYPE = 3;
const MAX_SEARCH_ENTRIES =2;

// Retrieve all users
exports.findAll = async (req, res) => {
    // Extract parameters and ensure they are integers
    const { username = "" } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    try {
        const { count, rows } = await db.User.findAndCountAll({
            where: {
                username: {
                    [Op.like]: `%${username}%`
                }
            },
            attributes: [
                'profileImage',
                'username',
                [db.sequelize.fn("ROUND", db.sequelize.fn("AVG", db.sequelize.col("SellerReviews.sellerRating")), 1), 'averageRating'],
                [db.sequelize.fn("COUNT", db.sequelize.col("SellerReviews.sellerUserId")), 'reviewsCount']
            ],
            include: [{
                model: db.PurchaseReview,
                as: 'SellerReviews',  
                attributes: [],
                duplicating: false
            }],            
            group: ['User.userId'],
            order: [
                ['username', 'ASC']
            ],
            limit,
            offset
        });
        
        const totalUsers = count.reduce((total, curr) => total + curr.count, 0);
        const totalPages = Math.ceil(totalUsers / limit);

        res.status(200).json({
            data: rows,
            currentPage: page,
            totalPages,
            totalUsers
        });

    } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ message: "Error retrieving users", error: error.message });
    }
};

/**
 * Retrieves detailed information about a specific user based on user ID and optional tab parameter.
 * It conditionally fetches listings, feedback, or literary reviews based on the provided tab query.
 * @param {Request} req - The request object containing user ID in params and optional tab query.
 * @param {Response} res - The response object used to return data or error messages.
 */
exports.findOne = async (req, res) => {
    const { id } = req.params;
    const tab = req.query.tab; 

    try {
        const user = await db.User.findByPk(id, {
            attributes: [
                'userId',
                'username', 
                'profileImage', 
                'about',
                'deliverByHand',
                
                [db.sequelize.fn("ROUND", db.sequelize.fn("AVG", db.sequelize.col("SellerReviews.sellerRating")), 1), 'averageRating'],
                [db.sequelize.fn("COUNT", db.sequelize.col("SellerReviews.sellerUserId")), 'reviewsCount'],
                
            ],
            include: [
                {
                    model: db.UserSocialMedia,
                    as: 'userSocialMedias',
                    attributes: ['socialMediaName', 'profileUrl']
                },
                
                {
                    model: db.PostalCode,
                    as: 'postalCodeDetails',
                    attributes: ['locality', 'country'],
                    required: false, // Only include if showCity is true
                    where: db.sequelize.where(db.sequelize.col('User.showCity'), true),
                },                
                {
                    model: db.FollowRelationship,
                    as: 'Followings',
                    attributes: []
                },
                {
                    model: db.FollowRelationship,
                    as: 'Followers',
                    attributes: []
                },
                {
                    model: db.PurchaseReview,
                    as: 'SellerReviews',
                    attributes: []
                }
            ],
            
            group: ['User.userId']
        });
        
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }
        
        
        // Enhance user object with counts from follow relationships
        const followingCount = await db.FollowRelationship.count({ where: { mainUserId: id } });
        const followersCount = await db.FollowRelationship.count({ where: { followedUserId: id } });
        
        // Constructing the full response object
        const responseData  = {
            ...user.dataValues,
            // locality: user.PostalCode ? `${user.PostalCode.locality}, ${user.PostalCode.country}` : null,
            followingCount,
            followersCount
        };
        
        
        // Conditionally fetch data based on the 'tab' parameter
        if (!tab || tab === 'listings') {
          responseData.listings = await fetchListings(id);
        }        
        if (tab === 'feedback') {
            responseData.feedback = await fetchFeedback(id);
        }
        
        if (tab === 'literaryReviews') {
            responseData.literaryReviews = await fetchLiteraryReviews(id);
        }
        
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error retrieving user and related data:", error);
        res.status(500).json({ message: "Error retrieving user and related data", error: error.message });
    }
};


/**
 * Fetches listings for a given seller user with pagination, adjusting for grouped count.
 * @param {number} sellerUserId - The ID of the user whose listings to fetch.
 * @param {number} [page=1] - The page number of the listings to fetch.
 * @param {number} [limit=10] - The number of listings to fetch per page.
 * @returns {Object} An object containing the total count of listings, the listings themselves, and the total number of pages.
 */
async function fetchListings(sellerUserId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await db.Listing.findAndCountAll({
        where: { sellerUserId: sellerUserId },
        attributes: [
            'listingId',
            'listingTitle',
            'price',
            'listingCondition',
            [db.sequelize.literal(`(SELECT COUNT(*) FROM wishlist WHERE wishlist.listingId = Listing.listingId)`), 'likesCount'],
        ],
        include: [
            {
                model: db.BookEdition,
                attributes: ['title']
            },
            {
                model: db.ListingImage,
                attributes: ['imageUrl'],
                limit: 1
            },
        ],
        group: ['Listing.listingId'],
        limit,
        offset,
        subQuery: false,
        order: [['listingId', 'ASC']] // Sorting by listing ID for consistency
    });

    // Calculate the total count from grouped results
    const totalCount = count.reduce((total, item) => total + item.count, 0);

    return {
        count: totalCount,
        rows,
        totalPages: Math.ceil(totalCount / limit)
    };
}


/**
 * Fetches feedback (purchase reviews) for a given seller with pagination.
 * @param {number} sellerUserId - The user ID of the seller whose feedback is to be retrieved.
 * @param {number} [page=1] - The page number for pagination.
 * @param {number} [limit=10] - The number of feedback entries per page.
 * @returns {Object} An object containing the count of feedback, array of feedback, and total pages.
 */
async function fetchFeedback(sellerUserId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return await db.PurchaseReview.findAndCountAll({
        where: { sellerUserId: sellerUserId },
        attributes: [
            'sellerReview', 
            'sellerRating', 
            'sellerResponse', 
            'reviewDate'
        ],
        include: [{
            model: db.User,
            as: 'Buyer',
            attributes: ['username', 'profileImage']
        }],
        limit,
        offset
    });
}

/**
 * Fetches literary reviews for a given user.
 *
 * @param {number} userId - The ID of the user whose reviews to fetch.
 * @param {number} [page=1] - The page number of the reviews to fetch. Default is 1.
 * @param {number} [limit=10] - The number of reviews to fetch per page. Default is 10.
 *
 * @returns {Object} An object containing the total count of reviews, the reviews themselves, and the total number of pages.
 * @returns {Object.count} The total count of reviews.
 * @returns {Object.rows} An array of review objects.
 * @returns {Object.totalPages} The total number of pages of reviews.
 */
async function fetchLiteraryReviews(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await db.LiteraryReview.findAndCountAll({
        where: { userId: userId },
        attributes: [
            'literaryReviewId', 
            'literaryReview', 
            'literaryRating',
            'creationDate',
            [db.sequelize.literal(`(SELECT COUNT(*) FROM likeReview WHERE likeReview.literaryReviewId = LiteraryReview.literaryReviewId)`), 'likeCount'],
            [db.sequelize.literal(`(SELECT COUNT(*) FROM commentReview WHERE commentReview.literaryReviewId = LiteraryReview.literaryReviewId)`), 'commentCount']
        ],
        include: [{
            model: db.Work,
            attributes: ['originalTitle'],
            include: [{
                model: db.BookEdition,
                attributes: ['coverImage', 'ISBN', 'title'],
                where: {
                    title: {[Op.eq]: db.sequelize.col('Work.originalTitle')}
                },
                required: false 
            }]
        }],
        limit,
        offset,
        order: [['creationDate', 'DESC']],
        subQuery: false
    });

    const reviews = rows.map(review => ({
        literaryReviewId: review.literaryReviewId,
        literaryReview: review.literaryReview,
        literaryRating: review.literaryRating,
        creationDate: review.creationDate,
        likeCount: review.dataValues.likeCount,
        commentCount: review.dataValues.commentCount,
        workTitle: review.Work.originalTitle,
        bookEdition: review.Work.BookEditions[0]? {
            coverImage: review.Work.BookEditions[0].coverImage,
            ISBN: review.Work.BookEditions[0].ISBN,
            title: review.Work.BookEditions[0].title
        } : null
    }));
    console.log(count)
    return {
        count,
        rows: reviews,
        totalPages: Math.ceil(count / limit)
    };
}


// Create a new user
exports.create = async (req, res) => {

// Extract the required fields from the request body
const { username, email, password, birthDate, activateConfigs, acceptTAndC } = req.body;

if (!username || !email || !password || !birthDate || !acceptTAndC) {
    return res.status(400).json({ message: "All fields including birth date must be provided and Terms must be accepted" });
}

// Start a transaction - either all goes well, or none at all
const t = await db.sequelize.transaction();

try {
    // Create a new user
    const newUser = await User.create({ username, 
        email, 
        password,
        birthDate }, { transaction: t });
        
        
        // Fetch all configurations from the configuration table
        const configurations = await Configuration.findAll({ transaction: t });
        
        // Create a userConfiguration record for each configuration
        const configPromises = configurations.map(config => 
            UserConfiguration.create({
                userId: newUser.userId,
                configId: config.configId,
                configValue: activateConfigs ? 'true' : 'false'  // Set based on activateConfigs flag
            }, { transaction: t })
        );
        
        // Wait for all promises to resolve
        await Promise.all(configPromises);
        
        
        // Commit the transaction
        await t.commit();
        
        res.status(201).json({
            message: "User registered successfully.",
            user: newUser
        });    
    } catch (error) {
        console.error("Detailed error: ", error);
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors.map(e => e.message)
            });
        }
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
};
    
// Update a user
exports.update = async (req, res) => {
const { id } = req.params;
try {
    const [updated] = await User.update(req.body, { where: { userId: id } });
    if (updated) {
        const updatedUser = await User.findByPk(id);
        res.status(200).json({ message: "User updated successfully.", user: updatedUser });
    } else {
        res.status(404).json({ message: "User not found." });
    }
} catch (error) {
    if (error instanceof ValidationError) {
        return res.status(400).json({
            message: "Validation error",
            errors: error.errors.map(e => e.message)
        });
    }
    res.status(500).json({ message: "Error updating user", error: error.message });
}
};
    
    
// Delete a user - this needs to be turned into a patch request to alter just the isActive status and set a deletion date
exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await User.destroy({ where: { userId: id } });
        if (deleted) {
            res.status(200).json({ message: "User deleted successfully." });
        } else {
            res.status(404).json({ message: "User not found." });
        }
    } catch (error) {
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
};
    
// Helper function to create a token entry in the token table
async function createTokenEntry(tokenKey, tokenType, userId, sessionId, expires, invalidateOldToken = false) {
    const t = await db.sequelize.transaction();
    try {
        if (invalidateOldToken) {
            await Token.update({ invalidated: true, lastUsedAt: new Date() },
                               { where: { sessionId: sessionId, invalidated: false }, transaction: t });
        }
        await Token.create({
            tokenKey,
            tokenType,
            userId,
            sessionId,
            expiresAt: expires,
            invalidated: false
        }, { transaction: t });
        await t.commit();
    } catch (error) {
        await t.rollback();
        console.error("Failed to create token entry:", error);
        throw error;
    }
}

// Helper function to set cookies for refresh token and access token
function setTokenCookies(res, accessToken, accessTokenExpiry, refreshToken, refreshTokenExpiry) {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        expires: accessTokenExpiry,
        sameSite: 'Strict'
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        expires: refreshTokenExpiry,
        path: '/users/me/refresh',
        sameSite: 'Strict'
    });
}

// Login action for user
exports.login = async (req, res) => {
    const { usernameOrEmail, password, reactivate } = req.body;
    try {
        const t = await db.sequelize.transaction();
        
        const user = await User.findOne({
            where: { [Op.or]: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
            transaction: t
        });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "User not found" });
        }
        
        // Check if the account is deactivated or scheduled for deletion beyond grace period
        if (!reactivate && (user.isActiveStatus === 'deactivated' || 
        (user.isActiveStatus === 'to be deleted' && new Date(user.deletionScheduleDate) < new Date()))) {
            return res.status(403).json({
                message: "Account is deactivated or past the scheduled deletion date. Reactivation is not possible.",
                actionRequired: false
            });
        }
        
        
        const isValidPassword = await user.validPassword(password);
        if (!isValidPassword) {
            await t.rollback();
            return res.status(401).json({ message: "Invalid username or password" });
        }
        
        const existingSession = await SessionLog.findOne({
            where: { userId: user.userId, ipAddress: req.ip, deviceInfo: req.headers['user-agent'], endTime: null },
            transaction: t
        });
        if (existingSession) {
            await t.rollback();
            return res.status(409).json({ message: "Active session already exists for this device and browser." });
        }
        
        const sessionLog = await SessionLog.create({
            userId: user.userId,
            startTime: new Date(),
            ipAddress: req.ip,
            deviceInfo: req.headers['user-agent']
        }, { transaction: t });
        
        const { token: accessToken, expires: accessTokenExpires } = issueAccessToken(user.userId, sessionLog.sessionId);
        const { refreshToken, expires: refreshTokenExpires } = handleRefreshToken(user.userId, sessionLog.sessionId);
        
        createTokenEntry(refreshToken, 'refresh', user.userId, sessionLog.sessionId, refreshTokenExpires);
        
        setTokenCookies(res, accessToken, accessTokenExpires, refreshToken, refreshTokenExpires);
        
        
        // Reactivate the account if requested
        if (reactivate) {
            await User.update({
                isActiveStatus: 'active',
                deletionScheduleDate: null
            }, {
                where: { userId: user.userId },
                transaction: t
            });
        }
        
        // Commit transaction and return success
        await t.commit();
        res.status(200).json({
            message: "Login successful",
            user: { id: user.userId, username: user.username, email: user.email, isAdmin: user.isAdmin }
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
};

// Function to refresh tokens (to be called by a dedicated refresh endpoint)
exports.refreshTokens = async (req, res) => {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
        return res.status(403).send("Session invalid, please log in again.");
    }

    try {
        const existingToken = await Token.findOne({
            where: { tokenKey: refreshToken, tokenType: 'refresh' }
        });
        if (!existingToken || existingToken.expiresAt < new Date() || existingToken.invalidated) {
            if (existingToken) {
                await Token.update({ invalidated: true, lastUsedAt: new Date() }, { where: { tokenKey: refreshToken } });
            }
            return res.status(403).send("Token expired or invalidated, please log in again.");
        }

        const { id, session } = jwt.verify(refreshToken, config.secret);

        const { token: newAccessToken, expires: accessTokenExpires } = issueAccessToken(id, session);
        const { refreshToken: newRefreshToken, expires: refreshTokenExpires } = handleRefreshToken(id, session);

        createTokenEntry(newRefreshToken, 'refresh', id, session, refreshTokenExpires, true);

        setTokenCookies(res, newAccessToken, accessTokenExpires, newRefreshToken, refreshTokenExpires);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Failed to refresh tokens:", error);
        res.status(403).send({ message: "Failed to refresh tokens. Please log in again." });
    }
};


// Log out action for user
exports.logout = async (req, res) => {
    const sessionId = req.sessionId; // The current session ID obtained from the authenticated user's request
    
    // Start a transaction for database operations
    const t = await db.sequelize.transaction();
    
    try {
        // Invalidate the session
        await SessionLog.update({
            endTime: new Date()
        }, {
            where: {
                sessionId: sessionId
            },
            transaction: t
        });
        
        // Invalidate the refresh token
        await Token.update({
            invalidated: true,
            lastUsedAt: new Date()
        }, {
            where: {
                sessionId: sessionId,
                tokenType: 'refresh',
                invalidated: false // Only update if it's not already invalidated
            },
            transaction: t
        });
        
        // We could delete the session log entry instead of invalidating it
        // await SessionLog.destroy({
        //     where: {
        //         sessionId: sessionId
        //     },
        //     transaction: t
        // });
        
        // Clear the access token cookie
        res.clearCookie('accessToken')
        
        await t.commit();
        
        res.status(200).json({ message: "Logout successful.", logout: true});
    } catch (error) {
        console.error("Failed operation: ", error);
        await t.rollback();
        res.status(500).json({ message: "Error during logout", error: error.message });
    }
};

// Controller to handle account deactivation
exports.deactivateAccount = async (req, res) => {
    const id = req.userId;  // Extracted from verifyToken middleware
    try {
/*         // Check for active listings or ongoing conversations - still need to implement these models
        const activeListings = await db.Listing.count({
            where: { sellerUserId: id, availability: 'Active' }
        });
        const activeConversations = await db.ConversationParticipant.count({
            where: { userId: id },
            include: [{
                model: db.Conversation,
                where: { conversationType: 'transaction' } // The conversations type that we want to check
            }]
        });

        if (activeListings > 0 || activeConversations > 0) {
            return res.status(403).json({ message: "Cannot deactivate account with active listings or ongoing conversations." });
        } */

        // Proceed to deactivate
        const result = await db.User.update({
            isActiveStatus: 'deactivated'
        }, {
            where: { userId: id }
        });

        if (result == 0) {
            return res.status(404).json({ message: "User not found." });
        }

        // Logout from all sessions
        await logoutUserSessions(id, null); 
        res.status(200).json({ message: "Account has been deactivated." });
    } catch (error) {
        console.error("Error deactivating account:", error);
        res.status(500).json({ message: "Error deactivating account", error: error.message });
    }
};

// Controller to handle account deletion request
exports.initiateAccountDeletion = async (req, res) => {
    const id = req.userId;
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30); // Set 30 days from now

    try {
/*         // Similar check as in deactivation
        const activeListings = await db.Listing.count({
            where: { sellerUserId: id, availability: 'Active' }
        });
        const activeConversations = await db.ConversationParticipant.count({
            where: { userId: id },
            include: [{
                model: db.Conversation,
                where: { conversationType: 'transaction' }
            }]
        });

        if (activeListings > 0 || activeConversations > 0) {
            return res.status(403).json({ message: "Cannot delete account with active listings or ongoing conversations." });
        } */

        const result = await db.User.update({
            isActiveStatus: 'to be deleted',
            deletionScheduleDate: deletionDate
        }, {
            where: { userId: id }
        });

        if (result == 0) {
            return res.status(404).json({ message: "User not found." });
        }

        // Logout from all sessions
        await logoutUserSessions(id, null);

        res.status(200).json({ message: "Account deletion initiated. Account will be deleted after 30 days unless cancelled." });
    } catch (error) {
        console.error("Error initiating account deletion:", error);
        res.status(500).json({ message: "Error initiating account deletion", error: error.message });
    }
};


    
// Session validation to verify active user sessions
exports.validateSession = (req, res) => {
    // This callback only runs if verifyToken calls next(), meaning the token is valid
    res.status(200).json({
        message: "Session is valid.",
        user: {
            id: req.userId,  
            username: req.username // I think we might need to fetch the username from the database here, cb the middleware is not adding it to the request!
        }
    });
};

// Update or create a user address and corresponding postal code
exports.updateUserAddress = async (req, res) => {
    const userId = req.userId;  // from middleware
    const { street, streetNumber, postalCode, locality, country } = req.body;
    
    const t = await db.sequelize.transaction();
    
    try {
        // First, check if all address fields are provided or if all are empty
        const addressFields = [street, streetNumber, postalCode];
        const allFieldsProvided = addressFields.every(field => field);
        const noFieldsProvided = addressFields.every(field => !field);
        
        if (!allFieldsProvided && !noFieldsProvided) {
            await t.rollback();
            return res.status(400).json({ message: "All address fields must be provided together or none at all." });
        }
        
        // Handle updates or creation of address details
        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "User not found." });
        }
        
        if (allFieldsProvided) {
            // Verify that locality and country are provided when postal code is involved
            if (!locality || !country) {
                await t.rollback();
                return res.status(400).json({ message: "Both locality and country must be provided with postal code." });
            }
            
            // Check for existing postal code or create new one
            let postalCodeRecord = await PostalCode.findByPk(postalCode, { transaction: t });
            if (!postalCodeRecord) {
                postalCodeRecord = await PostalCode.create({ postalCode, locality, country }, { transaction: t });
            } else {
                await postalCodeRecord.update({ locality, country }, { transaction: t });
            }
            
            // Update user's address fields
            await user.update({ street, streetNumber, postalCode }, { transaction: t });
        } else {
            // If no fields are provided and user intends to clear address, reset the fields
            await user.update({ street: null, streetNumber: null, postalCode: null }, { transaction: t });
        }
        
        await t.commit();
        return res.status(200).json({
            message: "User address updated successfully",
            user: {
                street: user.street,
                streetNumber: user.streetNumber,
                postalCode: user.postalCode,
                locality: postalCodeRecord ? postalCodeRecord.locality : null,
                country: postalCodeRecord ? postalCodeRecord.country : null
            }
        });
        
    } catch (error) {
        await t.rollback();
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors.map(e => e.message)
            });
        }
        console.error("Error updating user address:", error);
        return res.status(500).json({ message: "Error updating user address", error: error.message });
    }
};
       
// Get user settings accordingly to query params
exports.getUserSettings = async (req, res) => {
    const userId = req.userId; // gotten from verifyToken middleware
    const type = req.query.type;
    
    try {
        switch (type) {
            case 'profile':
            const profileData = await fetchProfileSettings(userId);
            res.status(200).json(profileData);
            break;
            case 'account':
            const accountData = await fetchAccountSettings(userId);
            res.status(200).json(accountData);
            break;
            case 'notifications':
            const notificationsData = await fetchNotificationsSettings(userId);
            res.status(200).json(notificationsData);
            break;
            case 'privacy':
            const privacyData = await fetchPrivacySettings(userId);
            res.status(200).json(privacyData);
            break;
            default:
            res.status(400).json({ message: "Invalid settings type specified" });
            break;
        } 
    } catch (error) {
        console.error('Error fetching user settings', error);
        res.status(500).json({ message: "Error retrieving settings", error: error.message });
    }
};

async function fetchProfileSettings(userId) {
    const userProfile = await db.User.findByPk(userId, {
        include: [
            {
                model: db.PostalCode,
                as: 'postalCodeDetails',
            }
        ]
    });
    
    if (!userProfile) {
        throw new Error('User not found');
    }
    
    // Construct a response object
    return {
        username: userProfile.username,
        email: userProfile.email,
        profileImage: userProfile.profileImage,
        about: userProfile.about,
        defaultLanguage: userProfile.defaultLanguage,
        address: {
            streetName: userProfile.street,
            streetNumber: userProfile.streetNumber,
            postalCode: userProfile.postalCodeDetails.postalCode,
            locality: userProfile.postalCodeDetails.locality,
            country: userProfile.postalCodeDetails.country
        },
        showCity: userProfile.showCity
    };
}
    
// Fetches the account settings of a user.
async function fetchAccountSettings(userId) {
    const user = await db.User.findByPk(userId, {
        include: [
            {
                model: db.UserSocialMedia,
                as: 'userSocialMedias',
            }
        ]
    });
    
    if (!user) {
        throw new Error('User not found');
    }
    
    return {
        email: user.email,
        username: user.username,
        name: user.name,
        birthdayDate: user.birthDate,
        holidayMode: user.holidayMode,
        socialMediaProfiles: user.userSocialMedias? user.userSocialMedias.map(sm => ({
            socialMediaName: sm.socialMediaName,
            profileUrl: sm.profileUrl
        })) : []
    };
}

// Helper function to fetch notification settings for a user
async function fetchNotificationsSettings(userId) {
    try {
        // Fetch configurations related to 'notifications' from the Configuration table
        // including the user-specific settings from the UserConfiguration table if they exist.
        const configs = await db.Configuration.findAll({
            where: { configType: 'notifications' },
            include: [{
                model: db.UserConfiguration,
                where: { userId: userId },
                attributes: ['configValue'],
                as: 'userConfiguration',
                required: false  // Ensures all notifications configs are returned even if no user-specific setting exists
            }],
            attributes: ['configKey', 'description'],
            raw: true,
            nest: true,
            order: [['configKey', 'ASC']]  // Sorts the configurations by key for consistent ordering
        });

        // Transform the raw config data into a more manageable format
        const transformedConfigs = configs.map(config => ({
            configKey: config.configKey,
            description: config.description,
            configValue: config.userConfiguration ? config.userConfiguration.configValue : 'false'  // Defaults to 'false' if not specifically set by the user
        }));

        // Define response structure with categorized settings
        const response = {
            main: {},
            news: {},
            highPriority: {},
            other: {}
        };

        // Map to categorize each config setting based on its key
        const categoryMap = {
            enable_email_notifications: 'main',
            platform_updates: 'news',
            marketing_communications: 'news',
            new_messages: 'highPriority',
            new_reviews: 'highPriority',
            price_changes: 'other',
            bookmarked_books: 'other',
            new_followers: 'other',
            new_listings: 'news'
        };

        // Populate the response object based on predefined categories
        transformedConfigs.forEach(config => {
            const category = categoryMap[config.configKey];
            response[category][config.configKey] = {
                description: config.description,
                value: config.configValue  // Use the transformed value
            };
        });

        return response;
    } catch (error) {
        console.error("Error fetching notification settings", error);
        throw new Error("Failed to retrieve notification settings");
    }
}

// Helper function to fetch privacy settings for a user
async function fetchPrivacySettings(userId) {
    try {
        // Fetch privacy configurations from the Configuration table
        // including the user-specific settings from the UserConfiguration table if they exist.
        const configs = await db.Configuration.findAll({
            where: { configType: 'privacy' },
            include: [{
                model: db.UserConfiguration,
                where: { userId: userId },
                attributes: ['configValue'],
                as: 'userConfiguration',
                required: false  // Ensures all privacy configs are returned even if no user-specific setting exists
            }],
            attributes: ['configKey', 'description'],
            raw: true,
            nest: true,
            order: [['configKey', 'ASC']]  // Optional: sorts the configurations by key for consistent ordering
        });

        // Transform the raw config data into a structured format for ease of use
        const transformedConfigs = configs.map(config => ({
            configKey: config.configKey,
            description: config.description,
            configValue: config.userConfiguration ? config.userConfiguration.configValue : 'false'  // Defaults to 'false' if not specifically set by the user
        }));

        // Define response structure for categorized settings, if necessary
        const response = {
            dataTracking: {},
            personalization: {},
            marketing: {},
            account: {}
        };

        // Map to categorize each config setting based on its key
        const categoryMap = {
            allow_data_tracking: 'dataTracking',
            personalise_experience: 'personalization',
            feature_books_in_marketing: 'marketing',
            notify_owners_on_bookmark: 'marketing',
            allow_see_following: 'account',
            allow_see_followers: 'account'
        };

        // Populate the response object based on predefined categories
        transformedConfigs.forEach(config => {
            const category = categoryMap[config.configKey];
            response[category][config.configKey] = {
                description: config.description,
                value: config.configValue  // Use the transformed value
            };
        });

        return response;
    } catch (error) {
        console.error("Error fetching privacy settings", error);
        throw new Error("Failed to retrieve privacy settings");
    }
}



/////


// Update user settings based on type
exports.updateUserSettings = async (req, res) => {
    const userId = req.userId;  // Extracted from verifyToken middleware
    const type = req.query.type;
    
    try {
        switch (type) {
            case 'profile':
                const profileUpdateData = await updateProfileSettings(userId, req.body);
                res.status(200).json(profileUpdateData);
                break;
            case 'account':
                const accountUpdateData = await updateAccountSettings(userId, req.body, res);
                res.status(200).json(accountUpdateData);
                break;
            case 'notifications':
                const notificationsUpdateData = await updateNotificationSettings(userId, req.body);
                res.status(200).json(notificationsUpdateData);
                break;
            case 'privacy':
                const privacyUpdateData = await updatePrivacySettings(userId, req.body);
                res.status(200).json(privacyUpdateData);
                break;
            default:
                res.status(400).json({ message: "Invalid settings type specified" });
                break;
        }
    } catch (error) {
        console.error('Error updating user settings', error);
        res.status(500).json({ message: "Error updating settings", error: error.message });
    }
};

async function updateProfileSettings(userId, body) {
    const { about, defaultLanguage, showCity } = body; // const { about, defaultLanguage, showCity, profileImage } = body;
    const t = await db.sequelize.transaction();

    try {
        const user = await db.User.findByPk(userId, { transaction: t });

        if (!user) {
            await t.rollback();
            return { status: 404, data: { message: "User not found." } };
        }

        // Update user profile details within a transaction
        await user.update({
            about: about !== undefined ? about : user.about,
            defaultLanguage: defaultLanguage || user.defaultLanguage,
            showCity: showCity !== undefined ? showCity : user.showCity,
            // profileImage: profileImage || user.profileImage
        }, { transaction: t });

        await t.commit();
        return {
            message: "User profile updated successfully",
            user: {
                about: user.about,
                defaultLanguage: user.defaultLanguage,
                showCity: user.showCity,
                // profileImage: user.profileImage
            }
        };
    } catch (error) {
        await t.rollback();
        if (error instanceof ValidationError) {
            return { status: 400, data: { message: "Validation error", errors: error.errors.map(e => e.message) } };
        }
        console.error("Error updating user profile:", error);
        return { status: 500, data: { message: "Error updating user profile", error: error.message } };
    }
}

// Update user account settings
async function updateAccountSettings(userId, body, res) {
    const { email, username, name, birthdayDate, holidayMode, currentPassword, newPassword, confirmPassword } = body;

    // Validate presence of password fields
    if (!currentPassword || !newPassword || !confirmPassword) {
        return { status: 400, data: { message: "All password fields must be provided." } };
    }

    let transaction;

    try {
        transaction = await db.sequelize.transaction();

        const user = await db.User.findByPk(userId, { transaction });
        if (!user) {
            await transaction.rollback();
            return { status: 404, data: { message: "User not found." } };
        }

        // Validate current password
        if (!(await user.validPassword(currentPassword))) {
            await transaction.rollback();
            return { status: 401, data: { message: "Invalid current password." } };
        }
        
        // Validate new password confirmation
        if (newPassword !== confirmPassword) {
            await transaction.rollback();
            return { status: 400, data: { message: "New passwords do not match." } };
        }

        // Update the user's password and mark as changed
        user.password = newPassword;
        user.changed('password', true);

        let isEmailChanged = email && email !== user.email;
        const updateData = {
            email: email || user.email,
            username: username || user.username,
            name: name || user.name,
            birthDate: birthdayDate || user.birthDate,
            holidayMode: holidayMode !== undefined ? holidayMode : user.holidayMode,
            isVerified: !isEmailChanged ? user.isVerified : false
        };

        // Save changes
        await user.save({ transaction });

        if (newPassword) {
            // Invalidate all sessions due to password change
            await logoutUserSessions(userId, transaction);
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
        }

        if (isEmailChanged) {
            sendVerificationEmail(user.email);
        }

        await transaction.commit();
        return {
            message: "User account updated successfully",
            user: {
                email: user.email,
                username: user.username,
                name: user.name,
                birthdayDate: user.birthDate,
                holidayMode: user.holidayMode,
                isVerified: user.isVerified
            }
        };
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error during the transaction:", error);
        return { status: 500, data: { message: "Error updating user account", error: error.message } };
    }
}

// Logout from all sessions globally
async function logoutUserSessions(userId, transaction) {
    console.log(`Logging out all sessions globally for user ${userId}...`);
    try {
        // Invalidate all session logs for the user
        await SessionLog.update({
            endTime: new Date()
        }, {
            where: {
                userId: userId,
                endTime: null
            },
            transaction
        });
        
        // Invalidate all tokens for the user
        await Token.update({
            invalidated: true,
            lastUsedAt: new Date()
        }, {
            where: {
                userId: userId,
                invalidated: false,
                lastUsedAt: null
            },
            transaction
        });
    } catch (error) {
        console.error("Failed to log out sessions globally", error);
        throw error;  // Propagate this error up to catch it in the calling function
    }
}

function sendVerificationEmail(email) {
    console.log(`Sending verification email to ${email}`);
    // email sending logic here
}

// Helper function to update notification settings for a user
async function updateNotificationSettings(userId, settings) {
    let transaction;
    try {
        transaction = await db.sequelize.transaction();

        // Iterate over the settings provided in the request body
        for (const [configKey, configValue] of Object.entries(settings)) {
            // First, fetch the corresponding configuration ID
            const config = await Configuration.findOne({
                where: {
                    configKey: configKey,
                    configType: 'notifications'
                }
            });

            // Throw an error if the configuration key is invalid (does not exist in the database)
            if (!config) {
                throw new Error(`Invalid config key: ${configKey}`);
            }

            // Update the user's configuration value
            await UserConfiguration.update({
                configValue: configValue
            }, {
                where: {
                    userId: userId,
                    configId: config.configId
                },
                transaction: transaction
            });
        }

        await transaction.commit();
        return { message: "Notification settings updated successfully" };
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error("Error updating notification settings", error);
        throw new Error("Failed to update notification settings");
    }
}

// Helper function to update privacy settings for a user
async function updatePrivacySettings(userId, settings) {
    let transaction;
    try {
        transaction = await db.sequelize.transaction();

        for (const [configKey, configValue] of Object.entries(settings)) {
            const config = await db.Configuration.findOne({
                where: { configKey, configType: 'privacy' }
            });

            if (!config) {
                throw new Error(`Invalid config key: ${configKey}`);
            }

            const result = await db.UserConfiguration.upsert({
                userId: userId,
                configId: config.configId,
                configValue: configValue
            }, { transaction: transaction });

            console.log(`Update result for ${configKey}:`, result);
        }

        await transaction.commit();
        return { message: "Privacy settings updated successfully" };
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error updating privacy settings", error);
        return { message: "Failed to update privacy settings", error: error.message || error.toString() };
    }
}


// Follow another user
exports.followUser = async (req, res) => {
    const { targetUserId } = req.body;
    const userId = req.userId;

    if (userId == targetUserId) {
        return res.status(400).json({ message: "Cannot follow yourself." });
    }

    try {
        const userExists = await db.User.findByPk(targetUserId);
        if (!userExists) {
            return res.status(404).json({ message: "User not found!" });
        }

        const [followRelationship, created] = await db.FollowRelationship.findOrCreate({
            where: { mainUserId: userId, followedUserId: targetUserId }
        });

        if (!created) {
            return res.status(400).json({ message: "Already following this user." });
        }

        res.status(200).json({ message: 'User followed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error following user', error: error.message });
    }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
    const { followedUserId } = req.params;
    const userId = req.userId;

    const relationship = await db.FollowRelationship.findOne({
        where: { mainUserId: userId, followedUserId }
    });

    if (!relationship) {
        return res.status(400).json({ message: "Not currently following this user." });
    }

    try {
        await relationship.destroy();
        res.status(200).json({ message: 'Unfollowed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error unfollowing user', error: error.message });
    }
};

// Remove a follower
exports.removeFollower = async (req, res) => {
    const { followerUserId } = req.params;
    const userId = req.userId; // The ID of the user initiating the request

    // Prevent a user from trying to remove themselves
    if (userId == followerUserId) {
        return res.status(400).json({ message: "Cannot remove yourself as a follower." });
    }

    try {
        const relationship = await db.FollowRelationship.findOne({
            where: { mainUserId: followerUserId, followedUserId: userId }
        });

        if (!relationship) {
            return res.status(404).json({ message: "This user is not following you." });
        }

        await relationship.destroy();
        res.status(200).json({ message: 'Follower removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing follower', error: error.message });
    }
};

/**
 * Lists the users that the specified user is following.
 *
 * @param {object} req - The request object
 * @param {object} res - The response object
 *
 * @returns {Promise<void>}
 *
 * @throws Will throw an error if the user's following list is private.
 * @throws Will throw an error if there is an issue retrieving the following list.
 */
exports.listFollowing = async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch the user's privacy setting for their following list
        const privacy = await db.UserConfiguration.findOne({
            where: { userId: id, configId: 14 },
            attributes: ['configValue']
        });

        // If the user's following list is private, return an error
        if (!privacy || privacy.configValue!== 'true') {
            return res.status(403).json({ message: "The user's following list is private." });
        }

        // Fetch the users that the specified user is following
        const following = await db.FollowRelationship.findAll({
            where: { mainUserId: id },
            include: {
                model: db.User,
                as: 'FollowedUser',
                attributes: ['userId', 'username', 'profileImage']
            }
        });

        // Return the list of users the specified user is following
        res.status(200).json(following);
    } catch (error) {
        // If there is an issue retrieving the following list, return an error
        res.status(500).json({ message: 'Error retrieving following list', error: error.message });
    }
};

exports.listFollowers = async (req, res) => {
    const { id } = req.params;

    try {
        const privacy = await db.UserConfiguration.findOne({
            where: { userId: id, configId: 15 },
            attributes: ['configValue']
        });

        if (!privacy || privacy.configValue !== 'true') {
            return res.status(403).json({ message: "The user's followers list is private." });
        }

        const followers = await db.FollowRelationship.findAll({
            where: { followedUserId: id },
            include: {
                model: db.User,
                as: 'MainUser',
                attributes: ['userId', 'username', 'profileImage']
            }
        });

        res.status(200).json(followers);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving followers list', error: error.message });
    }
};

// Block another user
exports.blockUser = async (req, res) => {
    const targetUserId = req.body.targetUserId; 
    const userId = req.userId; 


    if (userId == targetUserId) {
        return res.status(400).json({ message: "Cannot block yourself." });
    }

    try {
        const userExists = await User.findByPk(targetUserId);
        if (!userExists) {
            return res.status(404).json({ message: "User not found." });
        }

        const [block, created] = await Block.findOrCreate({
            where: { blockerUserId: userId, blockedUserId: targetUserId }
        });

        if (!created) {
            return res.status(400).json({ message: "User already blocked." });
        }

        res.status(200).json({ message: 'User blocked successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error blocking user', error: error.message });
    }
};

// Unblock a user
exports.unblockUser = async (req, res) => {
    const { blockedUserId } = req.params;
    const userId = req.userId;

    const block = await db.Block.findOne({
        where: { blockerUserId: userId, blockedUserId }
    });

    if (!block) {
        return res.status(400).json({ message: "User not currently blocked." });
    }

    try {
        await block.destroy();
        res.status(200).json({ message: 'User unblocked successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error unblocking user', error: error.message });
    }
};

exports.listBlockedUsers = async (req, res) => {
    const userId = req.userId; 

    try {
        const blockedUsers = await db.Block.findAll({
            where: { blockerUserId: userId },
            attributes: [],
            include: [{
                model: db.User,
                as: 'BlockedUser',
                attributes: ['userId', 'username', 'profileImage']
            }]
        });

        res.status(200).json(blockedUsers);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving blocked users', error: error.message });
    }
};

// Create a new navigation history entry
exports.createEntry = async (req, res) => {
    try {
        const { entityTypeId, elementId, searchTerm, visitDuration, actionType } = req.body;
        const userId = req.userId;

        // Validate entityTypeId and elementId
        if (entityTypeId === 1) {
            const user = await User.findByPk(elementId);
            if (!user) {
                return res.status(400).json({ message: 'User does not exist.' });
            }
            if (elementId === userId) {
                return res.status(400).json({ message: 'Cannot create navigation history entry for viewing own profile.' });
            }
        } else if (entityTypeId === 2) {
            const listing = await Listing.findByPk(elementId);
            if (!listing) {
                return res.status(400).json({ message: 'Listing does not exist.' });
            }
            if (listing.sellerUserId === userId) {
                return res.status(400).json({ message: 'Cannot create navigation history entry for viewing own listing.' });
            }
        } else if (entityTypeId === 3) {
            const bookEdition = await BookEdition.findByPk(elementId);
            if (!bookEdition) {
                return res.status(400).json({ message: 'Book edition does not exist.' });
            }
        }

        // Check if an entry with the same entityTypeId and elementId already exists
        let existingEntry;
        if (entityTypeId) {
            existingEntry = await NavigationHistory.findOne({
                where: {
                    userId,
                    entityTypeId,
                    elementId
                }
            });
        } else {
            existingEntry = await NavigationHistory.findOne({
                where: {
                    userId,
                    searchTerm
                }
            });
        }

        if (existingEntry) {
            // Update the existing entry's dateTime and visitDuration
            existingEntry.dateTime = new Date();
            existingEntry.visitDuration = visitDuration;
            await existingEntry.save();
        } else {
            // Count existing entries
            const count = await NavigationHistory.count({
                where: {
                    userId,
                    entityTypeId: entityTypeId ? entityTypeId : { [Op.is]: null }
                }
            });

            // Delete older entries if the limit is exceeded
            if (count >= (entityTypeId ? MAX_ENTRIES_PER_TYPE : MAX_SEARCH_ENTRIES)) {
                const oldestEntries = await NavigationHistory.findAll({
                    where: {
                        userId,
                        entityTypeId: entityTypeId ? entityTypeId : { [Op.is]: null }
                    },
                    order: [['dateTime', 'ASC']],
                    limit: 1
                });
                await NavigationHistory.destroy({ where: { historyId: oldestEntries.map(entry => entry.historyId) } });
            }

            // Create new entry
            await NavigationHistory.create({
                userId,
                entityTypeId,
                elementId,
                searchTerm,
                dateTime: new Date(),
                visitDuration,
                actionType
            });
        }

        res.status(201).send(); // No need to return the entry
    } catch (error) {
        console.error("Detailed error: ", error);
        if (error instanceof ValidationError) {
            return res.status(400).json({
                message: "Validation error",
                errors: error.errors.map(e => e.message)
            });
        }
        res.status(500).json({ message: "Error creating navigation history entry", error: error.message });
    }
};


// Get all navigation history entries for the user, optionally filtered by type
exports.getEntries = async (req, res) => {
    try {
        const { type, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.userId;

        let whereClause = { userId };

        if (type) {
            if (type === 'search') {
                // Fetch search term entries
                whereClause.entityTypeId = { [Op.is]: null };
                whereClause.searchTerm = { [Op.not]: null };
            } else {
                const entityType = await EntityType.findOne({ where: { entityTypeName: type } });
                if (!entityType) {
                    return res.status(404).json({ message: 'Entity type not found' });
                }
                whereClause.entityTypeId = entityType.entityTypeId;
            }
        } else {
            // Default to listings if no type is provided
            const entityType = await EntityType.findOne({ where: { entityTypeName: 'listing' } });
            if (!entityType) {
                return res.status(404).json({ message: 'Default entity type (listing) not found' });
            }
            whereClause.entityTypeId = entityType.entityTypeId;
        }

        const { rows: entries, count: totalCount } = await NavigationHistory.findAndCountAll({
            where: whereClause,
            include: [{ model: EntityType, attributes: ['entityTypeName'] }],
            order: [['dateTime', 'DESC']],
            limit: type === 'search' ? 5 : limit,
            offset
        });

        // Retrieve additional details based on the entityType
        const detailedEntries = await Promise.all(entries.map(async (entry) => {
            let details = null;

            if (entry.entityTypeId === 1) { // User
                details = await User.findOne({
                    where: { userId: entry.elementId },
                    attributes: [
                        'userId',
                        'username',
                        'profileImage',
                        [db.sequelize.fn("ROUND", db.sequelize.fn("AVG", db.sequelize.col("SellerReviews.sellerRating")), 1), 'averageRating'],
                        [db.sequelize.fn("COUNT", db.sequelize.col("SellerReviews.sellerUserId")), 'reviewsCount']
                    ],
                    include: [{
                        model: db.PurchaseReview,
                        as: 'SellerReviews',
                        attributes: []
                    }],
                    group: ['User.userId']
                });
            } else if (entry.entityTypeId === 2) { // Listing
                const listing = await Listing.findOne({
                    where: { listingId: entry.elementId },
                    attributes: [
                        'listingId',
                        'listingTitle',
                        'price',
                        'listingCondition',
                        [db.sequelize.literal(`(SELECT COUNT(*) FROM wishlist WHERE wishlist.listingId = Listing.listingId)`), 'likesCount']
                    ],
                    include: [
                        { model: db.BookEdition, attributes: ['title'] },
                        { model: db.ListingImage, attributes: ['imageUrl'], limit: 1 }
                    ],
                    group: ['Listing.listingId']
                });

                if (listing) {
                    details = {
                        listingId: listing.listingId,
                        listingTitle: listing.listingTitle,
                        price: listing.price,
                        listingCondition: listing.listingCondition,
                        likesCount: listing.likesCount,
                        listingImage: listing.ListingImages.length > 0 ? listing.ListingImages[0].imageUrl : null,
                        BookEdition: listing.BookEdition
                    };
                }
            } else if (entry.entityTypeId === 3) { // Book Edition
                details = await BookEdition.findOne({
                    where: { ISBN: entry.elementId },
                    attributes: [
                        'title',
                        'coverImage',
                    ],
                    include: [
                        {
                            model: db.Work,
                            attributes: [
                                [db.sequelize.literal(`(SELECT COUNT(*) FROM literaryReview WHERE literaryReview.workId = Work.workId)`), 'literaryReviewsCount'],
                                [db.sequelize.literal(`ROUND((SELECT AVG(literaryReview.literaryRating) FROM literaryReview WHERE literaryReview.workId = Work.workId), 2)`), 'averageLiteraryRating']
                            ],
                            include: [{
                                model: db.LiteraryReview,
                                attributes: []
                            }],
                            group: ['Work.workId']
                        }
                    ],
                    group: ['BookEdition.ISBN']
                });
            } else if (entry.actionType === 'search') { // Search Term
                details = {
                    searchTerm: entry.searchTerm
                };
            }

            return {
                historyId: entry.historyId,
                details
            };
        }));

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({
            currentPage: parseInt(page, 10),
            totalPages,
            totalCount,
            data: detailedEntries
        });
    } catch (error) {
        console.error("Error fetching navigation history:", error);
        res.status(500).json({ message: 'Error fetching navigation history', error: error.message });
    }
};




// Delete navigation history entries
exports.deleteEntries = async (req, res) => {
    try {
        const { id } = req.params;

        if (id) {
            // Delete a specific entry
            const deleted = await NavigationHistory.destroy({ where: { historyId: id, userId: req.userId } });
            if (deleted) {
                return res.status(200).json({ message: 'Navigation history entry deleted successfully' });
            } else {
                return res.status(404).json({ message: 'Navigation history entry not found' });
            }
        } else {
            // Delete all entries
            await NavigationHistory.destroy({ where: { userId: req.userId } });
            return res.status(200).json({ message: 'All navigation history entries deleted successfully' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting navigation history entries', error: error.message });
    }
};

// Get user's favorite genres
exports.getFavoriteGenres = async (req, res) => {
    try {
        const userId = req.userId;
        const favoriteGenres = await UserFavoriteGenre.findAll({
            where: { userId },
            include: [{ model: Genre, attributes: ['genreId', 'genreName'] }]
        });
        res.status(200).json(favoriteGenres);
    } catch (error) {
        console.error("Error fetching favorite genres:", error);
        res.status(500).json({ message: 'Error fetching favorite genres', error: error.message });
    }
};


// Add a favorite genre
exports.addFavoriteGenre = async (req, res) => {
    try {
        const userId = req.userId;
        const { genreName } = req.body;

        // Check if the genre exists
        const genre = await Genre.findOne({ where: { genreName } });
        if (!genre) {
            return res.status(404).json({ message: 'Genre not found' });
        }

        // Check if the user already has 5 favorite genres
        const favoriteCount = await UserFavoriteGenre.count({ where: { userId } });
        if (favoriteCount >= 5) {
            return res.status(400).json({ message: 'You can only have up to 5 favorite genres' });
        }

        // Check if the genre is already a favorite
        const existingFavorite = await UserFavoriteGenre.findOne({ where: { userId, genreId: genre.genreId } });
        if (existingFavorite) {
            return res.status(400).json({ message: 'Genre is already a favorite' });
        }

        const favoriteGenre = await UserFavoriteGenre.create({ userId, genreId: genre.genreId });
        res.status(201).json({ message: `Genre '${genreName}' added to favorites` });
    } catch (error) {
        console.error("Error adding favorite genre:", error);
        res.status(500).json({ message: 'Error adding favorite genre', error: error.message });
    }
};

// Remove a favorite genre
exports.removeFavoriteGenre = async (req, res) => {
    try {
        const userId = req.userId;
        const { genreId } = req.params;

        const favoriteGenre = await UserFavoriteGenre.destroy({
            where: { userId, genreId }
        });

        if (!favoriteGenre) {
            return res.status(404).json({ message: 'Favorite genre not found' });
        }

        res.status(200).json({ message: 'Favorite genre removed successfully' });
    } catch (error) {
        console.error("Error removing favorite genre:", error);
        res.status(500).json({ message: 'Error removing favorite genre', error: error.message });
    }
};


// Get user's favorite authors
exports.getFavoriteAuthors = async (req, res) => {
    try {
        const userId = req.userId;
        const favoriteAuthors = await UserFavoriteAuthor.findAll({
            where: { userId },
            include: [{ model: Person, attributes: ['personId', 'personName'] }]
        });
        res.status(200).json(favoriteAuthors);
    } catch (error) {
        console.error("Error fetching favorite authors:", error);
        res.status(500).json({ message: 'Error fetching favorite authors', error: error.message });
    }
};

// Add a favorite author
exports.addFavoriteAuthor = async (req, res) => {
    try {
        const userId = req.userId;
        const { personName } = req.body;

        // Check if the person exists and is an author
        const person = await Person.findOne({ where: { personName, roles: { [Op.like]: '%author%' } } });
        if (!person) {
            return res.status(404).json({ message: 'Author not found' });
        }

        // Check if the user already has 5 favorite authors
        const favoriteCount = await UserFavoriteAuthor.count({ where: { userId } });
        if (favoriteCount >= 5) {
            return res.status(400).json({ message: 'You can only have up to 5 favorite authors' });
        }

        // Check if the author is already a favorite
        const existingFavorite = await UserFavoriteAuthor.findOne({ where: { userId, personId: person.personId } });
        if (existingFavorite) {
            return res.status(400).json({ message: 'Author is already a favorite' });
        }

        const favoriteAuthor = await UserFavoriteAuthor.create({ userId, personId: person.personId });
        res.status(201).json({ message: `Author '${personName}' added to favorites` });
    } catch (error) {
        console.error("Error adding favorite author:", error);
        res.status(500).json({ message: 'Error adding favorite author', error: error.message });
    }
};


// Remove a favorite author
exports.removeFavoriteAuthor = async (req, res) => {
    try {
        const userId = req.userId;
        const { personId } = req.params;

        const favoriteAuthor = await UserFavoriteAuthor.destroy({
            where: { userId, personId }
        });

        if (!favoriteAuthor) {
            return res.status(404).json({ message: 'Favorite author not found' });
        }

        res.status(200).json({ message: 'Favorite author removed successfully' });
    } catch (error) {
        console.error("Error removing favorite author:", error);
        res.status(500).json({ message: 'Error removing favorite author', error: error.message });
    }
};