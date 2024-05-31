const express = require('express');
const router = express.Router();
const workController = require('../controllers/works.controller');
const { verifyToken } = require('../middleware/authJwt');
const { isAdmin } = require('../middleware/admin');

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
    .get(verifyToken, isAdmin, workController.findAll)
    .post(verifyToken, isAdmin, workController.create);

    router.route('/editions')
    .get(workController.getEditions);


// Routes to handle operations on a specific work by ID
router.route('/:workId')
    .get(verifyToken, isAdmin, workController.findWork)
    .patch(verifyToken, isAdmin, workController.updateWorkById)
    .delete(verifyToken, isAdmin, workController.removeWorkById);



// Routes to handle operations on editions of a specific work by ID
router.route('/:workId/editions')
    .post(verifyToken, isAdmin, workController.addEdition);

    router.route('/:workId/editions/:editionISBN/contributors')
    .post(verifyToken, isAdmin, workController.addContributor)
    .delete(verifyToken, isAdmin, workController.removeContributor);

router.route('/:workId/editions/:bookEditionId') /// falta esta
    .get(workController.getBookEdition)
    .patch(verifyToken, isAdmin,workController.updateBookEdition)
    .delete(verifyToken, isAdmin, workController.removeBookEdition);

// Routes to handle operations on reviews of a specific work by ID
router.route('/:workId/reviews')
    .get(workController.getReviews)
    .post(verifyToken, workController.addReview);

router.route('/:workId/reviews/:literaryReviewId')
    .patch(verifyToken, workController.updateReview)
    // .get(workController.getReview) // i think this is not necessary for now as the info we would get it's the same we would get from .getReviews - if more features would be added in the future then it would be necessary to add this route
    .delete(verifyToken, workController.deleteReview);

router.route('/:workId/reviews/:literaryReviewId/likes')
    .post(verifyToken, workController.likeReview)
    .delete(verifyToken, workController.removeLikeReview);

// Routes to handle operations on comments of a specific review
router.route('/:workId/reviews/:literaryReviewId/comments')
    .get(workController.getReviewsComments)
    .post(verifyToken, workController.addCommentToReview);

router.route('/:workId/reviews/:literaryReviewId/comments/:commentId')
    .patch(verifyToken, workController.editCommentOfReview)
    .delete(verifyToken, workController.removeCommentFromReview);

router.route('/:workId/reviews/:literaryReviewId/comments/:commentId/likes')
    .post(verifyToken, workController.likeComment)
    .delete(verifyToken, workController.removeLikeComment);

    // Routes to handle operations on authors and genres of a specific work by ID
router.route('/:workId/authors')
.post(verifyToken, isAdmin, workController.addAuthor)

router.route('/:workId/authors/:authorId')
    .delete(verifyToken, isAdmin, workController.removeAuthor);

router.route('/:workId/genres')
.post(verifyToken, isAdmin, workController.addGenre);

router.route('/:workId/genres/:genreId')
    .delete(verifyToken, isAdmin, workController.removeGenre);

// Handle unsupported routes
router.all('*', (req, res) => {
    res.status(404).json({ message: 'The requested work resource could not be found. Please check the URL and API documentation.' });
});


module.exports = router;
