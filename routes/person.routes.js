const express = require('express');
const router = express.Router();
const personController = require('../controllers/person.controller');
const { verifyToken } = require('../middleware/authJwt');
const { isAdmin } = require('../middleware/admin');


// Middleware to log request details and compute response time
router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        console.log(`${req.method} ${req.originalUrl} completed in ${duration.toFixed(3)} seconds`);
    });
    next();
});

router.route('/')
    .get(personController.findAll)
    .post(verifyToken, isAdmin, personController.create);

router.route('/:personId')
    .get(personController.findPerson) // This might not be needed! Otherwise, we would need to make  a person profile page
    .patch(verifyToken, isAdmin, personController.updatePerson)
    .delete(verifyToken, isAdmin, personController.removePerson);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'The requested author resource could not be found. Please check the URL and API documentation.' });
});

module.exports = router;
