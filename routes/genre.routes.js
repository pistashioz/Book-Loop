const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');
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

///////////////////// PRECISA DE REVISÃO - Like a post request to create the connection on bookGenre

router.route('/')
    .post(verifyToken, isAdmin, genreController.createGenre)
    .get(genreController.findGenres);

router.route('/:genreId')
    .get(genreController.findGenre)
    .patch(verifyToken, isAdmin, genreController.updateGenre)
    .delete(verifyToken, isAdmin, genreController.deleteGenre);

    router.route('/:genreId/remove-associations')
    .delete(verifyToken, isAdmin, genreController.removeAssociations);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'The requested genre could not be found. Please check the URL and API documentation.' });
});

module.exports = router;
