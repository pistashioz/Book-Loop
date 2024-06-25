const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const adminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/authJwt');
const { isAdmin } = require('../middleware/admin');
const {uploadProfilePicture} = require('../middleware/uploadFile');

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

// Delete a user
router.delete('/:userId', verifyToken, isAdmin, adminController.deleteUser);



// Admin routes
// Toggle suspension of a user (suspend/unsuspend)
router.patch('/:userId', verifyToken, isAdmin, adminController.toggleSuspension);




// Define specific routes for "me" to handle profile or settings access
// router.get('/me', verifyToken, usersController.getMyProfile);
router.route('/me/settings') 
.get(verifyToken, usersController.getUserSettings)
.patch(verifyToken, uploadProfilePicture, usersController.updateUserSettings);

router.patch('/me/address', verifyToken, usersController.updateUserAddress);

router.post('/me/refresh', usersController.refreshTokens);
router.post('/resend-verification-email', usersController.resendVerificationEmail);

router.post('/request-password-reset', usersController.requestPasswordReset);
router.post('/reset-password', usersController.resetPassword);

// Routes for handling account deactivation and deletion requests
router.patch('/me/deactivate', verifyToken, usersController.deactivateAccount);
router.patch('/me/delete', verifyToken, usersController.initiateAccountDeletion);

// Following a user
router.post('/me/follow', verifyToken, usersController.followUser);

// Blocking a user
router.post('/me/block', verifyToken, usersController.blockUser);

// Getting list of followers and followings
router.get('/:id/following', extractUserId, usersController.listFollowing);
router.get('/:id/followers', extractUserId, usersController.listFollowers);

// Unfollowing and unblocking
router.delete('/me/following/:followedUserId', verifyToken, usersController.unfollowUser);
router.delete('/me/followers/:followerUserId', verifyToken, usersController.removeFollower);
router.delete('/me/blocked/:blockedUserId', verifyToken, usersController.unblockUser);

// Get list of blocked users
router.get('/me/blocked', verifyToken, usersController.listBlockedUsers);

// Navigation history routes
router.route('/me/navigation-history')
.post(verifyToken, usersController.createEntry)
.get(verifyToken, usersController.getEntries);

router.delete('/me/navigation-history/:id?', verifyToken, usersController.deleteEntries);

// Routes for favorite genres
router.route('/me/favorite-genres')
.get(verifyToken, usersController.getFavoriteGenres)
.post(verifyToken, usersController.addFavoriteGenre);

router.delete('/me/favorite-genres/:genreId', verifyToken, usersController.removeFavoriteGenre);

// Routes for favorite authors
router.route('/me/favorite-authors')
.get(verifyToken, usersController.getFavoriteAuthors)
.post(verifyToken, usersController.addFavoriteAuthor);

router.delete('/me/favorite-authors/:personId', verifyToken, usersController.removeFavoriteAuthor);


// General user routes
router.route('/')
.get(usersController.findAll)
.post(usersController.create);

router.get('/verify-email', usersController.verifyEmail);

// Get users eligible for deletion
router.get('/scheduled-to-delete', verifyToken, isAdmin, adminController.getUsersForDeletion);
router.get('/suspended-users', verifyToken, isAdmin, adminController.getSuspendedUsers)

router.route('/:id')
.get(extractUserId, usersController.findOne)
/*     .put(usersController.update)
.delete(usersController.delete); */

router.post('/login', usersController.login);
router.post('/logout', usersController.logout);


// router.get('/validate-session', verifyToken, usersController.validateSession);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'USERS: Route not found. Please check your URL.' });
});

module.exports = router;
