const express = require('express');
let router = express.Router();
const workController = require('../controllers/works.controller');
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
    .get(workController.findAll)
    .post(workController.create);
router.route('/:workId')
    .get(workController.findWork)
    .patch(workController.updateWorkById)
    .delete(workController.removeWorkById)
router.route('/:workId/editions')
    .get(workController.getEditions)
    .post(workController.addEdition)
router.route('/:workId/editions/:bookEditionId')
    .get(workController.getBookEdition)
    .patch(workController.updateBookEdition)
    .delete(workController.removeBookEdition);
router.route('/:workId/reviews')
    //.get(workController.getReviews)
    //.post(workController.addReview)
router.route('/:workId/reviews/:reviewId/comments')
    //.get(workController.getReviewsComments)
    //.post(workController.addCommentToReview)
    //.patch(workController.editCommentOfReview)
    //.delete(workController.removeCommentFromReview)
router.route('/:workId/reviews/:reviewId')
    //.patch(workController.updateReview)
    //.delete(workController.deleteReview)

//send a predefined error message for invalid routes on works
router.all('*', function (req, res) {
    res.status(404).json({ message: 'The requested work resource could not be found. Please check the URL and API documentation.' });
})
// EXPORT ROUTES (required by APP)
module.exports = router;