const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/authJwt');
const { isAdmin } = require('../middleware/admin');

// Toggle suspension of a user (suspend/unsuspend)
router.patch('/users/:userId', verifyToken, isAdmin, adminController.toggleSuspension);

// Get users eligible for deletion
router.get('/users/scheduled_to_delete', verifyToken, isAdmin, adminController.getUsersForDeletion);

// Delete a user
router.delete('/users/:userId', verifyToken, isAdmin, adminController.deleteUser);

module.exports = router;
