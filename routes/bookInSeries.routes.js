const express = require('express');
const router = express.Router();
const bookInSeriesController = require('../controllers/bookInSeries.controller');
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
    .post(verifyToken, isAdmin, bookInSeriesController.createSeries)
    .get(bookInSeriesController.findAllSeries);

router.route('/:seriesId')
    .patch(verifyToken, isAdmin, bookInSeriesController.updateSeries)
    .delete(verifyToken, isAdmin, bookInSeriesController.deleteSeries)
    .get(bookInSeriesController.findSeriesById);


// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'The requested Book in Series resource could not be found. Please check the URL and API documentation.' });
});

module.exports = router;
