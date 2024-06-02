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

// Define specific routes for "me" to handle profile or settings access
// router.get('/me', verifyToken, usersController.getMyProfile);
router.route('/me/settings') 
    .get(verifyToken, usersController.getUserSettings)
    .patch(verifyToken, usersController.updateUserSettings);
    
router.patch('/me/address', verifyToken, usersController.updateUserAddress);

router.post('/me/refresh', usersController.refreshTokens);

// Routes for handling account deactivation and deletion requests
router.patch('/me/deactivate', verifyToken, usersController.deactivateAccount);
router.patch('/me/delete', verifyToken, usersController.initiateAccountDeletion);

// Following a user
router.post('/me/follow', verifyToken, usersController.followUser);

// Blocking a user
router.post('/me/block', verifyToken, usersController.blockUser);

// Getting list of followers and followings
router.get('/:id/following', usersController.listFollowing);
router.get('/:id/followers', usersController.listFollowers);

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

router.route('/:id')
    .get(usersController.findOne)
/*     .put(usersController.update)
    .delete(usersController.delete); */


    
// // Toggle suspension of a user (suspend/unsuspend)
// router.patch('/users/:userId', verifyToken, isAdmin, adminController.toggleSuspension);

// // Get users eligible for deletion
// router.get('/users/scheduled_to_delete', verifyToken, isAdmin, adminController.getUsersForDeletion);

// // Delete a user
// router.delete('/users/:userId', verifyToken, isAdmin, adminController.deleteUser);

router.post('/login', usersController.login);
router.post('/logout', verifyToken, usersController.logout);

router.get('/validate-session', verifyToken, usersController.validateSession);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'USERS: Route not found. Please check your URL.' });
});

module.exports = router;
