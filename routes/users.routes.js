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
router.post('/me/deactivate', verifyToken, usersController.deactivateAccount);
router.post('/me/delete', verifyToken, usersController.initiateAccountDeletion);

// Following a user
router.post('/me/follow', verifyToken, usersController.followUser);

// Blocking a user
router.post('/me/block', verifyToken, usersController.blockUser);

/* // Getting list of followers and followings
router.get('/:userId/following', usersController.getFollowing);
router.get('/:userId/followers', usersController.getFollowers); */

// Unfollowing and unblocking
router.delete('/me/following/:followedUserId', verifyToken, usersController.unfollowUser);
router.delete('/me/blocked/:blockedUserId', verifyToken, usersController.unblockUser);

// General user routes
router.route('/')
    .get(usersController.findAll)
    .post(usersController.create);

router.route('/:id')
    .get(usersController.findOne)
/*     .put(usersController.update)
    .delete(usersController.delete); */

router.post('/login', usersController.login);
router.post('/logout', verifyToken, usersController.logout);
router.get('/validate-session', verifyToken, usersController.validateSession);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'USERS: Route not found. Please check your URL.' });
});

module.exports = router;
