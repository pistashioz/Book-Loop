const express = require('express');
const router = express.Router();
const workController = require('../controllers/works.controller');

// Middleware to log request details and compute response time
router.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        console.log(`${req.method} ${req.originalUrl} took ${duration.toFixed(3)} seconds`);
    });
    next(); // Proceed to the next middleware or route handler
});

// Route to handle operations on all works
router.route('/')
    .get(workController.findAll)
    .post(workController.create);

// Routes to handle operations on a specific work by ID
router.route('/:workId')
    .get(workController.findWork)
    .patch(workController.updateWorkById)
    .delete(workController.removeWorkById);

// Routes to handle operations on editions of a specific work by ID
router.route('/:workId/editions')
    .get(workController.getEditions)
    .post(workController.addEdition);

router.route('/:workId/editions/:bookEditionId')
    .get(workController.getBookEdition)
    .patch(workController.updateBookEdition)
    .delete(workController.removeBookEdition);

// Routes to handle operations on reviews of a specific work by ID
router.route('/:workId/reviews')
    .get(workController.getReviews)
    .post(workController.addReview);

router.route('/:workId/reviews/:literaryReviewId')
    .patch(workController.updateReview)
    .get(workController.getReview)
    .delete(workController.deleteReview);

router.route('/:workId/reviews/:literaryReviewId/likes')
    .post(workController.likeReview)
    .delete(workController.removeLikeReview);

// Routes to handle operations on comments of a specific review
router.route('/:workId/reviews/:literaryReviewId/comments')
    .get(workController.getReviewsComments)
    .post(workController.addCommentToReview);

router.route('/:workId/reviews/:literaryReviewId/comments/:commentId')
    .patch(workController.editCommentOfReview)
    .delete(workController.removeCommentFromReview);

router.route('/:workId/reviews/:literaryReviewId/comments/:commentId/likes')
    .post(workController.likeComment)
    .delete(workController.removeLikeComment);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'The requested work resource could not be found. Please check the URL and API documentation.' });
});


module.exports = router;
