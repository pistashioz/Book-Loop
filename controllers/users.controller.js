// Import DB configuration and Sequelize operators
const db = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const dayjs = require('dayjs');
const { Op, ValidationError } = require('sequelize');


// Access models through the centralized db object
const { User, UserConfiguration, Configuration, SessionLog, Token, PostalCode, Block, NavigationHistory, EntityType, Listing, BookEdition, UserFavoriteAuthor, UserFavoriteGenre, Genre, Person, Role, PersonRole   } = db;
const { issueAccessToken, handleRefreshToken } = require('../middleware/authJwt'); 

const MAX_ENTRIES_PER_TYPE = 30;
const MAX_SEARCH_ENTRIES = 10;

// Retrieve all users
exports.findAll = async (req, res) => {
    const { username = "", status = "all" } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    try {
        let whereClause = {
            username: {
                [Op.like]: `%${username}%`
            }
        };

        if (status !== "all") {
            whereClause.isActiveStatus = status; // Apply filter based on status
        }

        const { count, rows } = await db.User.findAndCountAll({
            where: whereClause,
            attributes: [
                'userId',
                'profileImage',
                'username',
                'sellerAverageRating',
                'sellerReviewCount',
                'isActiveStatus',
                'registrationDate',
                'isAdmin',
                'deletionScheduleDate'
            ],
            order: [
                ['username', 'ASC']
            ],
            limit,
            offset
        });

        const totalUsers = count;
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

// Retrieves detailed information about a specific user based on user ID and optional tab parameter
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
                'totalFollowers',
                'totalFollowing',
                'sellerAverageRating',
                'sellerReviewCount'
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
                    required: false,
                    where: db.sequelize.where(db.sequelize.col('User.showCity'), true),
                }
            ]
        });

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        const isCurrentUser = req.userId === user.userId;
        let isFollowing = false;
        if (!isCurrentUser && req.userId) {
            const followRelationship = await db.FollowRelationship.findOne({
                where: {
                    mainUserId: req.userId,
                    followedUserId: user.userId
                }
            });
            isFollowing = !!followRelationship;
        } else {
            isFollowing = false;
        }

        const responseData = {
            ...user.dataValues,
            followingCount: user.totalFollowing || 0,
            followersCount: user.totalFollowers || 0,
            isCurrentUser,
            isFollowing 
        };
        if (!tab || tab === 'listings') {
            responseData.listings = await fetchListings(id, req.userId);
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

async function fetchListings(sellerUserId, currentUserId, page = 1, limit = 8) {
    const offset = (page - 1) * limit;
    const { count, rows } = await db.Listing.findAndCountAll({
        where: { sellerUserId: sellerUserId },
        attributes: [
            'listingId',
            'listingTitle',
            'price',
            'listingCondition',
            [db.sequelize.literal(`(SELECT COUNT(*) FROM wishlist WHERE wishlist.listingId = Listing.listingId)`), 'likesCount'],
            [db.sequelize.literal(`EXISTS (SELECT 1 FROM wishlist WHERE wishlist.listingId = Listing.listingId AND wishlist.userId = ${currentUserId})`), 'isLiked']
        ],
        include: [
            {
                model: db.BookEdition,
                attributes: ['title', 'UUID'],
                include: {
                    model: db.Work,
                    as: 'PrimaryWork',
                    attributes: ['workId']
                }
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
        order: [['listingId', 'ASC']]
    });

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
            'totalLikes',
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
    
/* // Update a user
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
}; */
    

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
function setTokenCookies(res, accessToken, accessTokenCookieExpiry, refreshToken, refreshTokenCookieExpiry) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/users/me/refresh' });

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        expires: accessTokenCookieExpiry,
        sameSite: isProduction ? 'None' : 'Strict'
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        expires: refreshTokenCookieExpiry,
        sameSite: isProduction ? 'None' : 'Strict',
        path: '/users/me/refresh'
    });

    console.log('Access Token and Refresh Token cookies set with paths: "/" and "/users/me/refresh" respectively.');
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

        // Invalidate existing session if found
        if (existingSession) {
            await SessionLog.update(
                { endTime: new Date() },
                { where: { sessionId: existingSession.sessionId }, transaction: t }
            );
            await Token.update(
                { invalidated: true, lastUsedAt: new Date() },
                { where: { sessionId: existingSession.sessionId, invalidated: false }, transaction: t }
            );
        }
        
        const sessionLog = await SessionLog.create({
            userId: user.userId,
            startTime: new Date(),
            ipAddress: req.ip,
            deviceInfo: req.headers['user-agent']
        }, { transaction: t });
        
        const { token: accessToken, cookieExpires: accessTokenCookieExpires } = issueAccessToken(user.userId, sessionLog.sessionId);
        const { refreshToken, expires: refreshTokenExpires, cookieExpires: refreshTokenCookieExpires } = handleRefreshToken(user.userId, sessionLog.sessionId);
        
        createTokenEntry(refreshToken, 'refresh', user.userId, sessionLog.sessionId, refreshTokenExpires);
        
        console.log(`access token cookie has been set with expiry: ${accessTokenCookieExpires}`);
        console.log(`refresh token cookie has been set with expiry: ${refreshTokenCookieExpires}`);

        setTokenCookies(res, accessToken, accessTokenCookieExpires, refreshToken, refreshTokenCookieExpires);
        
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
    const refreshToken = req.cookies.refreshToken;
    console.log(`Received refreshToken: ${refreshToken}`);
    
    if (!refreshToken) {
        return res.status(403).json({ message: "No refresh token found. Please log in again.", redirectTo: '/login' }); 
    }

    try {
        console.log(`Attempting to refresh tokens for user with refreshToken: ${refreshToken}`);
        const existingToken = await Token.findOne({
            where: { tokenKey: refreshToken, tokenType: 'refresh' }
        });
        
        console.log('Existing token found:', existingToken);
        
        if (!existingToken || existingToken.expiresAt < new Date() || existingToken.invalidated) {
            if (existingToken) {
                await Token.update({ invalidated: true, lastUsedAt: new Date() }, { where: { tokenKey: refreshToken } });
                console.log('Existing token invalidated due to expiration or invalidation.');
            }
            return res.status(401).json({ message: "Token expired or invalidated, please log in again.", redirectTo: '/login' });
        }

        const { id, session } = jwt.verify(refreshToken, config.secret);
        console.log(`Verified JWT. User ID: ${id}, Session ID: ${session}`);

        const { token: newAccessToken, expires: accessTokenExpires, cookieExpires: accessTokenCookieExpires } = issueAccessToken(id, session);
        const { refreshToken: newRefreshToken, expires: refreshTokenExpires, cookieExpires: refreshTokenCookieExpires } = handleRefreshToken(id, session);

        await createTokenEntry(newRefreshToken, 'refresh', id, session, refreshTokenExpires, true);
        console.log('New tokens issued and database updated.');

        setTokenCookies(res, newAccessToken, accessTokenCookieExpires, newRefreshToken, refreshTokenCookieExpires);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Failed to refresh tokens:", error);
        return res.status(500).send({ message: "Failed to refresh tokens. Please try again later." });
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
        
        // Clear token cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/users/me/refresh' }); // Specify the path to match the cookie

        await t.commit();
        
        res.status(200).json({ message: "Logout successful.", logout: true });
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

/**
 * Update or create a user address and corresponding postal code.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updateUserAddress = async (req, res) => {
    const userId = req.userId; // from middleware
    const { street, streetNumber, postalCode, locality, country } = req.body;

    const t = await db.sequelize.transaction();
    let postalCodeRecord;

    console.log(street, streetNumber, postalCode, locality, country);

    try {
        let errorFields = [];

        // Validate that street and street number are provided together or not at all
        if ((street !== undefined && streetNumber === undefined) || (street === undefined && streetNumber !== undefined)) {
            if (street === undefined) errorFields.push('street');
            if (streetNumber === undefined) errorFields.push('streetNumber');
            await t.rollback();
            return res.status(400).json({ message: "Both street and street number must be provided together.", missingFields: errorFields });
        }

        // Validate that postal code, locality, and country are provided together or not at all
        if ((postalCode !== undefined && (locality === undefined || country === undefined)) ||
            (postalCode === undefined && (locality !== undefined || country !== undefined))) {
            if (postalCode === undefined) errorFields.push('postalCode');
            if (locality === undefined) errorFields.push('locality');
            if (country === undefined) errorFields.push('country');
            await t.rollback();
            return res.status(400).json({ message: "Postal code, locality, and country must be provided together.", missingFields: errorFields });
        }

        // Find user
        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "User not found." });
        }

        // Update street and street number if provided
        if (street !== undefined && streetNumber !== undefined) {
            user.street = street;
            user.streetNumber = streetNumber;
        } else if (street === undefined && streetNumber === undefined) {
            console.log('Street and street number are not provided. Setting them to null.');
            user.street = null;
            user.streetNumber = null;
        }

        // Update postal code details if provided
        if (postalCode !== undefined && locality !== undefined && country !== undefined) {
            postalCodeRecord = await PostalCode.findByPk(postalCode, { transaction: t });
            if (!postalCodeRecord) {
                postalCodeRecord = await PostalCode.create({ postalCode, locality, country }, { transaction: t });
            } else {
                await postalCodeRecord.update({ locality, country }, { transaction: t });
            }
            user.postalCode = postalCode;
        } else if (postalCode === undefined && locality === undefined && country === undefined) {
            user.postalCode = null;
        }

        // Commit the transaction and save user details
        await user.save({ transaction: t });
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
        attributes: ['userId','username', 'email', 'profileImage', 'about', 'defaultLanguage','showCity',
            'street','streetNumber', 'postalCode',
         ],
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
/*         
        username: userProfile.username,
        email: userProfile.email, */
        userId: userProfile.userId,
        profileImage: userProfile.profileImage,
        about: userProfile.about,
        defaultLanguage: userProfile.defaultLanguage,
        address: {
            streetName: userProfile.street,
            streetNumber: userProfile.streetNumber,
            postalCode: userProfile.postalCode,
            locality: userProfile.postalCodeDetails?.locality ? userProfile.postalCodeDetails.locality : null,
            country: userProfile.postalCodeDetails?.country ? userProfile.postalCodeDetails.country : null
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
        let updateResult;
        switch (type) {
            case 'profile':
                updateResult = await updateProfileSettings(userId, req.body);
                break;
            case 'account':
                updateResult = await updateAccountSettings(userId, req.body);
                break;
            case 'notifications':
                updateResult = await updateNotificationSettings(userId, req.body);
                break;
            case 'privacy':
                updateResult = await updatePrivacySettings(userId, req.body);
                break;
            default:
                return res.status(400).json({ message: "Invalid settings type specified" });
        }

        return res.status(updateResult.status).json(updateResult.data);
    } catch (error) {
        console.error('Error updating user settings', error);
        return res.status(500).json({ message: "Error updating settings", error: error.message });
    }
};

async function updateProfileSettings(userId, body) {
    const { about, defaultLanguage, showCity } = body; // const { about, defaultLanguage, showCity, profileImage } = body;
    console.log(body)
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
async function updateAccountSettings(userId, body) {
    const { email, username, name, birthdayDate, holidayMode, currentPassword, newPassword, confirmPassword } = body;
    console.log('updateAccountSettings', body);

    let transaction;

    try {
        transaction = await db.sequelize.transaction();

        const user = await db.User.findByPk(userId, { transaction });
        if (!user) {
            await transaction.rollback();
            return { status: 404, data: { message: "User not found." } };
        }

        // Collect validation errors
        const validationErrors = [];
        
        if (!email) {
            validationErrors.push({ message: "Email cannot be null or empty!", field: 'email' });
        }
        if (!username) {
            validationErrors.push({ message: "Username cannot be null or empty!", field: 'username' });
        }
        if (!birthdayDate) {
            validationErrors.push({ message: "Birth date cannot be null or empty!", field: 'birthDate' });
        }

        if (validationErrors.length > 0) {
            return { status: 400, data: { message: "Validation errors occurred.", errors: validationErrors } };
        }

        // Check if the update includes password changes
        if (currentPassword || newPassword || confirmPassword) {
            // Validate presence of password fields
            if (!currentPassword || !newPassword || !confirmPassword) {
                await transaction.rollback();
                return { status: 400, data: { message: "All password fields must be provided.", errors: [{ message: "All password fields must be provided.", field: 'password' }] } };
            }

            // Validate current password
            if (!(await user.validPassword(currentPassword))) {
                await transaction.rollback();
                return { status: 401, data: { message: "Invalid current password.", errors: [{ message: "Invalid current password.", field: 'currentPassword' }] } };
            }

            // Validate new password confirmation
            if (newPassword !== confirmPassword) {
                await transaction.rollback();
                return { status: 400, data: { message: "New passwords do not match.", errors: [{ message: "New passwords do not match.", field: 'newPassword' }] } };
            }

            // Update the user's password and mark as changed
            user.password = newPassword;
            user.changed('password', true);
            
            // Invalidate all sessions due to password change
            await logoutUserSessions(userId, transaction);
        }

        let isEmailChanged = email && email !== user.email;
        const updateData = {
            email,
            username,
            name,
            birthDate: birthdayDate,
            holidayMode,
            isVerified: !isEmailChanged ? user.isVerified : false
        };

        // Update user details with validation
        await user.update(updateData, { transaction, validate: true });

        // Send verification email if email changed
        if (isEmailChanged) {
            sendVerificationEmail(user.email);
        }

        await transaction.commit();

        return {
            status: 200,
            data: {
                message: "User account updated successfully",
                user: {
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    birthDate: user.birthDate,
                    holidayMode: user.holidayMode,
                    isVerified: user.isVerified
                }
            }
        };
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error during the transaction:", error);
        if (error instanceof ValidationError) {
            return { status: 400, data: { message: "Validation error", errors: error.errors.map(e => ({ message: e.message, field: e.path })) } };
        }
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
        console.log(settings);

        // Extract the notifications object from settings
        const notificationSettings = settings.notifications;
        if (!notificationSettings) {
            throw new Error("Notification settings not provided");
        }

        for (const [configKey, configValue] of Object.entries(notificationSettings)) {
            console.log(typeof configKey); // Should be string
            console.log(configValue); // Should be the value of the configKey

            // First, fetch the corresponding configuration ID
            const config = await db.Configuration.findOne({
                where: {
                    configKey: configKey,
                    configType: 'notifications'
                }
            });

            // Throw an error if the configuration key is invalid (does not exist in the database)
            if (!config) {
                throw new Error(`Invalid config key: ${configKey}`);
            }

            // Convert the configValue to a string
            const configValueStr = String(configValue);

            // Check if the user configuration entry exists
            const userConfig = await db.UserConfiguration.findOne({
                where: {
                    userId: userId,
                    configId: config.configId
                },
                transaction: transaction
            });

            if (userConfig) {
                // Update the existing user configuration entry
                await db.UserConfiguration.update({
                    configValue: configValueStr
                }, {
                    where: {
                        userId: userId,
                        configId: config.configId
                    },
                    transaction: transaction
                });
            } else {
                // Insert a new user configuration entry
                await db.UserConfiguration.create({
                    userId: userId,
                    configId: config.configId,
                    configValue: configValueStr
                }, {
                    transaction: transaction
                });
            }
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
        console.log(settings);

        // Extract the privacy object from settings
        const privacySettings = settings.privacy;
        if (!privacySettings) {
            throw new Error("Privacy settings not provided");
        }

        for (const [configKey, configValue] of Object.entries(privacySettings)) {
            console.log(typeof configKey); // Should be string
            console.log(configValue); // Should be the value of the configKey

            // First, fetch the corresponding configuration ID
            const config = await db.Configuration.findOne({
                where: {
                    configKey: configKey,
                    configType: 'privacy'
                }
            });

            // Throw an error if the configuration key is invalid (does not exist in the database)
            if (!config) {
                throw new Error(`Invalid config key: ${configKey}`);
            }

            // Convert the configValue to a string
            const configValueStr = String(configValue);

            // Check if the user configuration entry exists
            const userConfig = await db.UserConfiguration.findOne({
                where: {
                    userId: userId,
                    configId: config.configId
                },
                transaction: transaction
            });

            if (userConfig) {
                // Update the existing user configuration entry
                await db.UserConfiguration.update({
                    configValue: configValueStr
                }, {
                    where: {
                        userId: userId,
                        configId: config.configId
                    },
                    transaction: transaction
                });
            } else {
                // Insert a new user configuration entry
                await db.UserConfiguration.create({
                    userId: userId,
                    configId: config.configId,
                    configValue: configValueStr
                }, {
                    transaction: transaction
                });
            }
        }

        await transaction.commit();
        return { message: "Privacy settings updated successfully" };
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error("Error updating privacy settings", error);
        throw new Error("Failed to update privacy settings");
    }
}




// Follow another user
exports.followUser = async (req, res) => {

    const { targetUserId } = req.body;
    const userId = req.userId;
    console.log(`following ${targetUserId}`)
    if (userId == targetUserId) {
        return res.status(400).json({ message: "Cannot follow yourself." });
    }

    try {
        const userExists = await db.User.findByPk(targetUserId);
        if (!userExists) {
            return res.status(404).json({ message: "User not found!" });
        }

        const [followRelationship, created] = await db.FollowRelationship.findCreateFind({
            where: { mainUserId: userId, followedUserId: targetUserId }
        });

        console.log(followRelationship, created);
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

// Lists the users that the specified user is following.
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

/**
* Create a new navigation history entry
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<void>} JSON response with success status or an error message
*/
exports.createEntry = async (req, res) => {
    try {
        const { entityTypeId, elementId, searchTerm, visitDuration, actionType } = req.body;
        const userId = req.userId;
        
        // Validate entityTypeId and elementId
        if (entityTypeId === 1) {
            const user = await User.findByPk(elementId);
            if (!user) {
                return res.status(404).json({ message: 'User does not exist.' });
            }
            if (elementId === userId) {
                return res.status(400).json({ message: 'Cannot create navigation history entry for viewing own profile.' });
            }
        } else if (entityTypeId === 2) {
            const listing = await Listing.findByPk(elementId);
            if (!listing) {
                return res.status(404).json({ message: 'Listing does not exist.' });
            }
            if (listing.sellerUserId === userId) {
                return res.status(400).json({ message: 'Cannot create navigation history entry for viewing own listing.' });
            }
        } else if (entityTypeId === 3) {
            const bookEdition = await BookEdition.findByPk(elementId);
            if (!bookEdition) {
                return res.status(404).json({ message: 'Book edition does not exist.' });
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
                        'sellerAverageRating', // Use stored value for average rating
                        'sellerReviewCount'    // Use stored value for review count
                    ]
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
                                'totalReviews', 
                                'averageLiteraryRating' 
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
    console.log("Fetching favorite genres for user", req.userId);
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
        console.log("Adding favorite genre", genreName);
        // Check if the genre exists
        const genre = await Genre.findOne({ where: { genreName } });
        if (!genre) {
            return res.status(404).json({ success: false,  message: 'Genre not found' });
        }

        // Check if the user already has 5 favorite genres
        const favoriteCount = await UserFavoriteGenre.count({ where: { userId } });
        if (favoriteCount >= 5) {
            return res.status(400).json({  success: false, message: 'You can only have up to 5 favorite genres' });
        }

        // Check if the genre is already a favorite
        const existingFavorite = await UserFavoriteGenre.findOne({ where: { userId, genreId: genre.genreId } });
        if (existingFavorite) {
            return res.status(400).json({ success: false, message: 'Genre is already a favorite' });
        }

        const favoriteGenre = await UserFavoriteGenre.create({ userId, genreId: genre.genreId });
        res.status(201).json({  success: true , message: `Genre '${genreName}' added to favorites` });
    } catch (error) {
        console.error("Error adding favorite genre:", error);
        res.status(500).json({  success: false, message: 'Error adding favorite genre', error: error.message });
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
            return res.status(404).json({  success: false, message: 'Favorite genre not found' });
        }

        res.status(200).json({ success: true, message: 'Favorite genre removed successfully' });
    } catch (error) {
        console.error("Error removing favorite genre:", error);
        res.status(500).json({  success: false, message: 'Error removing favorite genre', error: error.message });
    }
};


// Get user's favorite authors
exports.getFavoriteAuthors = async (req, res) => {
    console.log('Fetching favorite authors for user', req.userId);
    try {
        const userId = req.userId;
        const favoriteAuthors = await UserFavoriteAuthor.findAll({
            where: { userId },
            attributes: [],
            include: [{ model: Person, attributes: ['personId', 'personName'] }]
        });
        res.status(200).json(favoriteAuthors);
    } catch (error) {
        console.error("Error fetching favorite authors:", error);
        res.status(500).json({ message: 'Error fetching favorite authors', error: error.message });
    }
};


/**
 * Add a favorite author for a user.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addFavoriteAuthor = async (req, res) => {
    try {
        const userId = req.userId;
        const { personName } = req.body;

        // Check if the person exists and has the 'author' role
        const person = await Person.findOne({
            where: { personName },
            include: {
                model: PersonRole,
                attributes: [],
                include: {
                    model: Role,
                    where: { roleName: 'author' }
                },
            }
        });

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

        // Add the author to the user's favorites
        await UserFavoriteAuthor.create({ userId, personId: person.personId });
        res.status(201).json({ success: true, message: `Author '${personName}' added to favorites` });
    } catch (error) {
        console.error("Error adding favorite author:", error);
        res.status(500).json({ message: 'Error adding favorite author', error: error.message });
    }
};

/**
 * Remove a favorite author for a user.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeFavoriteAuthor = async (req, res) => {
    try {
        const userId = req.userId;
        const { personId } = req.params;

        // Check if the favorite author entry exists
        const favoriteAuthor = await UserFavoriteAuthor.findOne({ where: { userId, personId } });
        if (!favoriteAuthor) {
            return res.status(404).json({ message: 'Favorite author not found' });
        }

        // Remove the favorite author entry
        await UserFavoriteAuthor.destroy({ where: { userId, personId } });
        res.status(200).json({ message: 'Favorite author removed successfully' });
    } catch (error) {
        console.error("Error removing favorite author:", error);
        res.status(500).json({ message: 'Error removing favorite author', error: error.message });
    }
};

