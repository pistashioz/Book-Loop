// Import express and initialize the router
const express = require('express');
const router = express.Router();

// Import the users controller
const usersController = require('../controllers/users.controller');

// Route configurations for '/users'
router.route('/')
    .get(usersController.findAll)    // GET all users
    .post(usersController.create);   // POST a new user

// Routes for operations on a specific user by ID
router.route('/:id')
    .get(usersController.findOne)    // GET a single user by ID
    .put(usersController.update)     // PUT update a user by ID
    .delete(usersController.delete); // DELETE a user by ID

// POST route for user login
router.post('/login', usersController.login);


// Catch-all for unsupported routes under '/users'
router.all('*', (req, res) => {
    res.status(404).json({ message: 'USERS: Route not found. Please check your URL.' });
});

// Export the configured router
module.exports = router;
