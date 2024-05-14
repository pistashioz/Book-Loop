const db = require('../models');
const {
    Work,
    Person,
    BookEdition,
    LiteraryReview,
    LiteraryComments,
    User,
    LikeReview,
    LikeComment
} = db;
const { ValidationError, Op } = require('sequelize');

// Fetch all works
exports.findAll = async (req, res) => {
    try {
        const works = await Work.findAll({ raw: true });
        works.forEach(work => {
            work.links = [
                { rel: "self", href: `/works/${work.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${work.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${work.workId}`, method: "PUT" },
            ];
        });
        return res.status(200).json({
            success: true,
            data: works,
            links: [{ rel: "add-work", href: `/work`, method: "POST" }]
        });
    } catch (error) {
        console.error("Error fetching works:", error);
        return res.status(400).json({ message: error.message || "Some error occurred" });
    }
};

// Create a new work
exports.create = async (req, res) => {
    try {
        const { originalTitle, firstPublishedDate, averageLiteraryRating, seriesId, seriesOrder } = req.body;
        const newWork = await Work.create({ originalTitle, firstPublishedDate, averageLiteraryRating, seriesId, seriesOrder });
        res.status(201).json({
            success: true,
            message: 'New work created successfully',
            work: newWork,
            links: [
                { rel: "self", href: `/works/${newWork.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${newWork.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${newWork.workId}`, method: "PUT" },
            ]
        });
    } catch (err) {
        console.error("Error creating work:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, msg: err.message || "Some error occurred while creating the work." });
        }
    }
};

// Find a specific work by ID
exports.findWork = async (req, res) => {
    try {
        const work = await Work.findByPk(req.params.workId, {
            include: [{
                model: BookEdition,
                attributes: ['ISBN', 'title', 'synopsis']
            }]
        });
        if (!work) {
            return res.status(404).json({ success: false, msg: `No work found with id ${req.params.workId}` });
        }
        return res.json({
            success: true,
            data: work,
            links: [
                { rel: "self", href: `/works/${work.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${work.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${work.workId}`, method: "PUT" },
            ],
        });
    } catch (err) {
        console.error("Error finding work:", err);
        return res.status(400).json({ message: err.message || "Some error occurred" });
    }
};

// Update a specific work by ID
exports.updateWorkById = async (req, res) => {
    try {
        const affectedRows = await Work.update(req.body, { where: { workId: req.params.workId } });
        if (affectedRows[0] === 0) {
            return res.status(200).json({ success: true, msg: `No updates were made on work with ID ${req.params.workId}` });
        }
        return res.json({ success: true, msg: `Work with ID ${req.params.workId} was updated successfully.` });
    } catch (err) {
        console.error("Error updating work:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, msg: err.message || "Some error occurred while updating the work." });
        }
    }
};

// Remove a specific work by ID
exports.removeWorkById = async (req, res) => {
    try {
        const workId = req.params.workId;
        const found = await Work.destroy({ where: { workId } });
        if (found === 1) {
            return res.status(204).json({ success: true, msg: `Work with id ${workId} was successfully deleted!` });
        }
        return res.status(404).json({ success: false, msg: `Cannot find any work with ID ${workId}` });
    } catch (err) {
        console.error("Error deleting work:", err);
        return res.status(400).json({ message: err.message || 'Invalid or incomplete data provided.' });
    }
};

// Get editions of a specific work by ID
exports.getEditions = async (req, res) => {
    try {
        const { workId } = req.params;
        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }
        const foundEditions = await BookEdition.findAll({ where: { workId: { [Op.eq]: workId } } });
        if (foundEditions.length === 0) {
            return res.status(404).json({ success: false, message: "No book editions found for this work" });
        }
        return res.status(200).json({ success: true, editions: foundEditions });
    } catch (err) {
        console.error("Error fetching editions:", err);
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving book editions" });
    }
};

// Add a new edition to a specific work by ID
exports.addEdition = async (req, res) => {
    try {
        const { workId } = req.params;
        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }
        const foundWork = await Work.findOne({ where: { workId: { [Op.eq]: workId } } });
        if (!foundWork) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }
        const workIdInt = parseInt(workId, 10);
        if (isNaN(workIdInt)) {
            return res.status(400).json({ success: false, message: "workId must be a valid integer" });
        }
        const { ISBN, publisherId, title, synopsis, editionType, publicationDate, language, pageNumber, coverImage } = req.body;
        const publicationDateObj = new Date(publicationDate);
        const newBookEdition = await BookEdition.create({
            ISBN, workId: workIdInt, publisherId, title, synopsis, editionType, publicationDate: publicationDateObj, language, pageNumber, coverImage
        });
        res.status(201).json({
            success: true,
            message: 'New book edition created successfully',
            book: newBookEdition,
        });
    } catch (err) {
        console.error("Error adding edition:", err);
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
};

// Get a specific book edition by work ID and book edition ID (ISBN)
exports.getBookEdition = async (req, res) => {
    try {
        const { workId, bookEditionId } = req.params;
        const bookEdition = await BookEdition.findOne({
            where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId }
        });
        if (!bookEdition) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }
        return res.status(200).json(bookEdition);
    } catch (err) {
        console.error("Error fetching book edition:", err);
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
};

// Update a specific book edition by work ID and book edition ID (ISBN)
exports.updateBookEdition = async (req, res) => {
    try {
        const { workId, bookEditionId } = req.params;
        const updatedData = req.body;
        const found = await BookEdition.findOne({ where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId } });
        if (!found) {
            return res.status(404).json({ success: false, message: "Book Edition not found." });
        }
        await BookEdition.update(updatedData, { where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId } });
        res.status(200).json({ message: "Book data updated successfully", book: updatedData });
    } catch (err) {
        console.error("Error updating book edition:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Invalid or incomplete data provided' });
        }
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
};

// Remove a specific book edition by work ID and book edition ID (ISBN)
exports.removeBookEdition = async (req, res) => {
    try {
        const { workId, bookEditionId } = req.params;
        const found = await BookEdition.findOne({ where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId } });
        if (!found) {
            return res.status(404).json({ success: false, message: "Book Edition not found." });
        }
        await BookEdition.destroy({ where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId } });
        res.status(204).json({ message: "Book Edition deleted successfully" });
    } catch (err) {
        console.error("Error deleting book edition:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Invalid or incomplete data provided' });
        }
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
};

// Get reviews for a specific work by ID
exports.getReviews = async (req, res) => {
    try {
        const reviews = await LiteraryReview.findAll({
            where: { workId: { [Op.eq]: req.params.workId } },
            raw: true
        });
        reviews.forEach(review => {
            review.links = [
                { rel: "self", href: `/works/${review.workId}/reviews/${review.literaryReviewId}`, method: "GET" },
                { rel: "delete", href: `/works/${review.workId}/reviews/${review.literaryReviewId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${review.workId}/reviews/${review.literaryReviewId}`, method: "PUT" },
            ];
        });
        res.status(200).json({
            success: true,
            data: reviews,
            links: [{ rel: "add-literary-review", href: `/works/${req.params.workId}/reviews/`, method: "POST" }]
        });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).json({ success: false, msg: err.message || "Some error occurred while retrieving the reviews." });
    }
};

// Add a review to a specific work by ID
exports.addReview = async (req, res) => {
    try {
        const work = await Work.findByPk(req.params.workId);
        if (!work) {
            return res.status(404).json({ success: false, msg: `No work found with id ${req.params.workId}` });
        }
        const { userId, LiteraryReview, literaryRating } = req.body;
        const newReview = await LiteraryReview.create({
            workId: req.params.workId,
            userId,
            LiteraryReview,
            literaryRating
        });
        return res.status(201).json({
            success: true,
            msg: `Review created successfully`,
            data: newReview
        });
    } catch (err) {
        console.error("Error adding review:", err);
        res.status(500).json({ success: false, msg: `Error adding review ${req.body}.` });
    }
};

// Update a review for a specific work by ID
exports.updateReview = async (req, res) => {
    try {
        const affectedRows = await LiteraryReview.update(req.body, { where: { literaryReviewId: req.params.literaryReviewId } });
        if (affectedRows[0] === 0) {
            return res.status(200).json({ success: true, msg: `No updates were made on review with ID ${req.params.literaryReviewId}.` });
        }
        return res.json({ success: true, msg: `Review with ID ${req.params.literaryReviewId} was updated successfully.` });
    } catch (err) {
        console.error("Error updating review:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, msg: err.message || "Some error occurred while updating the review." });
        }
    }
};

// Get a specific review by work ID and review ID
exports.getReview = async (req, res) => {
    try {
        const review = await LiteraryReview.findOne({
            where: { literaryReviewId: req.params.literaryReviewId },
            raw: true
        });
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }
        res.status(200).json({
            success: true,
            data: review,
            links: [{ rel: "add-review", href: `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}`, method: "POST" }]
        });
    } catch (err) {
        console.error("Error fetching review:", err);
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the review" });
    }
};

// Delete a review by review ID
exports.deleteReview = async (req, res) => {
    try {
        const result = await LiteraryReview.destroy({ where: { literaryReviewId: req.params.literaryReviewId } });
        if (result === 1) {
            return res.status(200).json({ success: true, msg: `Review with id ${req.params.literaryReviewId} was successfully deleted!` });
        }
        return res.status(404).json({ success: false, msg: `Cannot find any review with ID ${req.params.literaryReviewId}` });
    } catch (err) {
        console.error("Error deleting review:", err);
        res.status(500).json({ success: false, msg: `Error deleting review with ID ${req.params.idT}.` });
    }
};

// Like a review by review ID
exports.likeReview = async (req, res) => {
    try {
        const reviewId = req.params.literaryReviewId;
        const userId = req.userId;
        const review = await LiteraryReview.findByPk(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, msg: 'Literary review not found' });
        }
        const existingLike = await LikeReview.findOne({ where: { literaryReviewId: reviewId, userId } });
        if (existingLike) {
            return res.status(400).json({ success: false, msg: 'You already liked this review' });
        }
        const newLike = await LikeReview.create({ literaryReviewId: reviewId, userId });
        return res.status(201).json({ success: true, msg: 'Literary review liked successfully.', data: newLike });
    } catch (err) {
        console.error("Error liking review:", err);
        res.status(500).json({ success: false, msg: 'Error liking literary review.' });
    }
};

// Remove like from a review by review ID
exports.removeLikeReview = async (req, res) => {
    try {
        const reviewId = req.params.literaryReviewId;
        const userId = req.userId;
        const existingLike = await LikeReview.findOne({ where: { literaryReviewId: reviewId, userId } });
        if (!existingLike) {
            return res.status(404).json({ success: false, msg: 'Like not found.' });
        }
        await existingLike.destroy();
        return res.status(200).json({ success: true, msg: 'Literary review unliked successfully.' });
    } catch (err) {
        console.error("Error unliking review:", err);
        res.status(500).json({ success: false, msg: 'Error unliking literary review.' });
    }
};

// Get comments for a specific review by work ID and review ID
exports.getReviewsComments = async (req, res) => {
    try {
        const comments = await LiteraryComments.findAll({
            where: { literaryReviewId: { [Op.eq]: req.params.literaryReviewId } },
            raw: true
        });
        comments.forEach(comment => {
            comment.links = [
                { rel: "self", href: `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments/${comment.commentId}`, method: "GET" },
                { rel: "delete", href: `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments/${comment.commentId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments/${comment.commentId}`, method: "PUT" },
            ];
        });
        res.status(200).json({
            success: true,
            data: comments,
            links: [{ rel: "add-comment-review", href: `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments`, method: "POST" }]
        });
    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ success: false, msg: err.message || "Some error occurred while retrieving the comments." });
    }
};

// Add a comment to a specific review by work ID and review ID
exports.addCommentToReview = async (req, res) => {
    try {
        const work = await Work.findByPk(req.params.workId);
        const review = await LiteraryReview.findByPk(req.params.literaryReviewId);
        if (!work || !review) {
            return res.status(404).json({ success: false, msg: `No work or review found with the provided IDs` });
        }
        const { userId, comment } = req.body;
        const newComment = await LiteraryComments.create({
            workId: req.params.workId,
            literaryReviewId: req.params.literaryReviewId,
            userId,
            comment,
        });
        return res.status(201).json({
            success: true,
            msg: `Comment created successfully`,
            data: newComment
        });
    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ success: false, msg: `Error adding comment ${req.body}.` });
    }
};

// Edit a comment for a specific review by comment ID
exports.editCommentOfReview = async (req, res) => {
    try {
        const affectedRows = await LiteraryComments.update(req.body, { where: { commentId: req.params.commentId } });
        if (affectedRows[0] === 0) {
            return res.status(200).json({ success: true, msg: `No updates were made on comment with ID ${req.params.commentId}.` });
        }
        return res.json({ success: true, msg: `Comment with ID ${req.params.commentId} was updated successfully.` });
    } catch (err) {
        console.error("Error updating comment:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, msg: err.message || "Some error occurred while updating the comment." });
        }
    }
};

// Remove a comment from a specific review by comment ID
exports.removeCommentFromReview = async (req, res) => {
    try {
        const result = await LiteraryComments.destroy({ where: { commentId: req.params.commentId } });
        if (result === 1) {
            return res.status(200).json({ success: true, msg: `Comment with ID ${req.params.commentId} was successfully deleted!` });
        }
        return res.status(404).json({ success: false, msg: `Cannot find any comment with ID ${req.params.commentId}` });
    } catch (err) {
        console.error("Error deleting comment:", err);
        res.status(500).json({ success: false, msg: `Error deleting comment with ID ${req.params.commentId}.` });
    }
};

// Like a comment by comment ID
exports.likeComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const userId = req.userId;
        const comment = await LiteraryComments.findByPk(commentId);
        if (!comment) {
            return res.status(404).json({ success: false, msg: 'Comment not found.' });
        }
        const existingLike = await LikeComment.findOne({ where: { commentId, userId } });
        if (existingLike) {
            return res.status(400).json({ success: false, msg: 'Comment already liked.' });
        }
        await LikeComment.create({ commentId, userId });
        return res.status(201).json({ success: true, msg: 'Comment liked successfully.' });
    } catch (err) {
        console.error("Error liking comment:", err);
        res.status(500).json({ success: false, msg: 'Error liking comment.' });
    }
};

// Remove like from a comment by comment ID
exports.removeLikeComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const userId = req.userId;
        const existingLike = await LikeComment.findOne({ where: { commentId, userId } });
        if (!existingLike) {
            return res.status(404).json({ success: false, msg: 'Like not found.' });
        }
        await existingLike.destroy();
        return res.status(200).json({ success: true, msg: 'Comment unliked successfully.' });
    } catch (err) {
        console.error("Error unliking comment:", err);
        res.status(500).json({ success: false, msg: 'Error unliking comment.' });
    }
};
