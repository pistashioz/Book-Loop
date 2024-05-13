const express = require('express');
let router = express.Router();
const genreController = require('../controllers/genre.controller');
// middleware for all routes related with works
router.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => { // finish event is emitted once the response is sent to the client
        const diffSeconds = (Date.now() - start) / 1000; // figure out how many seconds elapsed
        console.log(`${req.method} ${req.originalUrl} completed in ${diffSeconds} seconds`);
    });
    next()
})
router.route('/')
    .get(genreController.findGenres)
router.route('/:genreName')
    .get(genreController.findGenre)
//send a predefined error message for invalid routes on works
router.all('*', function (req, res) {
    res.status(404).json({ message: 'The requested genre could not be found. Please check the URL and API documentation.' });
})
// EXPORT ROUTES (required by APP)
module.exports = router;