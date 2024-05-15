const db = require('../models');
const {
    Work,
    Person,
    BookEdition,
    LiteraryReview,
    CommentReview,
    User,
    LikeReview,
    LikeComment
} = db;
const { ValidationError, Op, where } = require('sequelize');

/**
 * Fetch all works with pagination and average rating.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters from the request
 * @param {number} req.query.page - Page number for pagination (default is 1)
 * @param {number} req.query.limit - Number of items per page for pagination (default is 10)
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status, message, works data, and pagination info
 */
exports.findAll = async (req, res) => {
    try {
        // Extract pagination parameters from query, with defaults
        const { page = 1, limit = 10 } = req.query; // Default to page 1, 10 items per page
        const offset = (page - 1) * limit;

        // Get the total count of works in the database
        const totalWorks = await Work.count();

        // Fetch paginated results with associated data
        const { count, rows } = await Work.findAndCountAll({
            attributes: [
                'workId',
                'originalTitle',
                'firstPublishedDate',
                'seriesId',
                'seriesOrder',
                // Calculate average literary rating
                [db.sequelize.literal(`ROUND((SELECT AVG(literaryReview.literaryRating) FROM literaryReview WHERE literaryReview.workId = Work.workId), 2)`), 'averageLiteraryRating']
            ],
            include: [
                {
                    model: db.LiteraryReview,
                    attributes: [], // Exclude LiteraryReview attributes from the main result
                },
                {
                    model: db.BookInSeries,
                    as: 'BookInSeries', // Use alias defined in the model association
                    attributes: ['seriesName'],
                    required: false // Left join
                }
            ],
            group: ['Work.workId'], 
            order: [['firstPublishedDate', 'DESC']], 
            limit, // Limit results to the specified page size
            offset // Offset results for pagination
        });

        // Handle case where no works are found
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "No works found" });
        }

        // Map works to the desired response format
        const works = rows.map(work => ({
            workId: work.workId,
            originalTitle: work.originalTitle,
            firstPublishedDate: work.firstPublishedDate,
            averageRating: work.dataValues.averageLiteraryRating || 0,
            Series: {
                seriesId: work.seriesId,
                seriesOrder: work.seriesOrder,
                seriesName: work.BookInSeries ? work.BookInSeries.seriesName : 'Not part of a series'
            },
            links: [
                { rel: "self", href: `/works/${work.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${work.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${work.workId}`, method: "PATCH" },
            ]
        }));

        // Calculate total number of pages
        const totalPages = Math.ceil(totalWorks / limit);

        // Send the response with works data and pagination info
        return res.status(200).json({
            success: true,
            message: `Found ${rows.length} works`,
            totalWorks: totalWorks,
            totalPages,
            currentPage: parseInt(page, 10),
            works,
            links: [{ rel: "add-work", href: `/work`, method: "POST" }]
        });
    } catch (error) {
        // Log error and send response with error message
        console.error("Error fetching works:", error);
        return res.status(500).json({ success: false, message: error.message || "Some error occurred" });
    }
};



/**
 * Create a new work along with an optional initial book edition.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.create = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { originalTitle, firstPublishedDate, seriesId = null, seriesOrder = null, authors = [], genres = [], edition = null } = req.body;

        // Check for duplicate work
        const existingWork = await Work.findOne({
            where: { originalTitle, firstPublishedDate },
            include: [{
                model: db.BookAuthor,
                include: [{
                    model: db.Person,
                    where: { personName: authors }
                }]
            }]
        });

        if (existingWork) {
            return res.status(400).json({ success: false, message: 'Work already exists with the same title and publication date by the same author.' });
        }

        // Create new work
        const newWork = await Work.create({ originalTitle, firstPublishedDate, seriesId, seriesOrder }, { transaction: t });

        // Associate authors
        for (const authorName of authors) {
            const author = await findOrCreateAuthor(authorName, t);
            await db.BookAuthor.create({ workId: newWork.workId, personId: author.personId }, { transaction: t });
        }

        // Associate genres
        for (const genreName of genres) {
            const genre = await findOrCreateGenre(genreName, t);
            await db.BookGenre.create({ workId: newWork.workId, genreId: genre.genreId }, { transaction: t });
        }

        // Create initial book edition if provided
        if (edition) {
            const { ISBN, publisherId, title, synopsis, editionType, publicationDate, language, pageNumber, coverImage } = edition;
            await db.BookEdition.create({
                ISBN, workId: newWork.workId, publisherId, title, synopsis, editionType, publicationDate, language, pageNumber, coverImage
            }, { transaction: t });
        }

        await t.commit();

        res.status(201).json({
            success: true,
            message: 'New work and its initial book edition created successfully',
            work: newWork,
            links: [
                { rel: "self", href: `/works/${newWork.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${newWork.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${newWork.workId}`, method: "PUT" },
            ]
        });
    } catch (err) {
        await t.rollback();
        console.error("Error creating work and its edition:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: err.message || "Some error occurred while creating the work." });
        }
    }
};

/**
 * Helper function to find or create an author.
 * 
 * @param {string} authorName - Name of the author
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Promise<Object>} Author instance
 */
async function findOrCreateAuthor(authorName, transaction) {
    let author = await db.Person.findOne({ where: { personName: authorName }, transaction });
    if (!author) {
        author = await db.Person.create({ personName: authorName, roles: 'author' }, { transaction });
    }
    return author;
}

/**
 * Helper function to find or create a genre.
 * 
 * @param {string} genreName - Name of the genre
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Promise<Object>} Genre instance
 */
async function findOrCreateGenre(genreName, transaction) {
    let genre = await db.Genre.findOne({ where: { genreName: genreName }, transaction });
    if (!genre) {
        genre = await db.Genre.create({ genreName: genreName }, { transaction });
    }
    return genre;
}

/**
 * Helper function to find or create an author.
 * 
 * @param {string} authorName - Name of the author
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Promise<Object>} Author instance
 */
async function findOrCreateAuthor(authorName, transaction) {
    let author = await db.Person.findOne({ where: { personName: authorName }, transaction });
    if (!author) {
        author = await db.Person.create({ personName: authorName, roles: 'author' }, { transaction });
    }
    return author;
}

/**
 * Helper function to find or create a genre.
 * 
 * @param {string} genreName - Name of the genre
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Promise<Object>} Genre instance
 */
async function findOrCreateGenre(genreName, transaction) {
    let genre = await db.Genre.findOne({ where: { genreName: genreName }, transaction });
    if (!genre) {
        genre = await db.Genre.create({ genreName: genreName }, { transaction });
    }
    return genre;
}


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

// Get editions of a specific work by ID with pagination
exports.getEditions = async (req, res) => {
    try {
        const { workId } = req.params;
        const { all, page = 1, limit = all ? 10 : 5 } = req.query; 
        const offset = (page - 1) * limit;

        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }

        const { count, rows: foundEditions } = await BookEdition.findAndCountAll({
            where: { workId: { [Op.eq]: workId } },
            attributes: all? ['ISBN', 'title', 'publisherId', 'publicationDate', 'coverImage', 'editionType', 'pageNumber', 'language'] : ['ISBN', 'title', 'publisherId', 'publicationDate', 'coverImage', 'editionType'],
            include: [
                {
                    model: db.Publisher,
                    attributes: ['publisherId', 'publisherName']
                },
                {
                    model: db.Work,
                    attributes: all ? ['workId','firstPublishedDate'] : ['workId'],
                    where: { workId }
                }
            ],
            limit,
            require: false,
            offset
        });

        if (foundEditions.length === 0) {
            return res.status(404).json({ success: false, message: "No book editions found for this work" });
        }

        const editions = foundEditions.map(edition => ({
            ISBN: edition.ISBN,
            title: edition.title,
            editionType: edition.editionType,
            publisherId: edition.publisherId,
            publisherName: edition.Publisher.publisherName,
            publicationDate: edition.publicationDate,
            coverImage: edition.coverImage,
            pageNumber: edition.pageNumber,
            language: edition.language,
            Work: edition.Work
            // firstPublishedDate: edition.Work ? edition.Work.firstPublishedDate : null
        }));

        const totalPages = Math.ceil(count / limit);

        return res.status(200).json({
            success: true,
            message: `Found ${foundEditions.length} book editions`,
            // editionsCount: foundEditions.length,
            totalEditions: count,
            totalPages,
            currentPage: parseInt(page, 10),
            editions
        });
    } catch (err) {
        console.error("Error fetching editions:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Some error occurred while retrieving book editions"
        });
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

        if (!workId || !bookEditionId) {
            return res.status(400).json({ success: false, message: "workId and bookEditionId are required in the query parameters" });
        }

        const bookEdition = await BookEdition.findOne({
            where: { workId, ISBN: bookEditionId },
            attributes: ['ISBN', 'title', 'publicationDate', 'synopsis', 'editionType', 'language', 'pageNumber', 'coverImage'],
            include: [
                {
                    model: db.Publisher,
                    attributes: ['publisherId', 'publisherName']
                },
                {
                    model: db.Work,
                    attributes: ['workId','firstPublishedDate']
                }
            ]
        });

        if (!bookEdition) {
            return res.status(404).json({ success: false, message: "Book edition not found" });
        }

        return res.status(200).json({
            success: true,
            bookEdition: {
                ISBN: bookEdition.ISBN,
                title: bookEdition.title,
                publicationDate: bookEdition.publicationDate,
                synopsis: bookEdition.synopsis,
                editionType: bookEdition.editionType,
                language: bookEdition.language,
                pageNumber: bookEdition.pageNumber,
                coverImage: bookEdition.coverImage,
                publisherId: bookEdition.Publisher.publisherId,
                publisherName: bookEdition.Publisher.publisherName,
                Work: bookEdition.Work
            }
        });
    } catch (err) {
        console.error("Error fetching book edition:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Some error occurred while retrieving the book edition"
        });
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
        const { workId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }

        const reviews = await LiteraryReview.findAll({
            where: { workId },
            attributes: [
                'literaryReviewId',
                'literaryReview',
                'creationDate',
                [db.sequelize.literal('(SELECT COUNT(*) FROM likeReview WHERE likeReview.literaryReviewId = LiteraryReview.literaryReviewId)'), 'likeCount'],
                [db.sequelize.literal('(SELECT COUNT(*) FROM commentReview WHERE commentReview.literaryReviewId = LiteraryReview.literaryReviewId)'), 'commentCount']
            ],
            include: [
                {
                    model: db.User,
                    attributes: [
                        'userId',
                        'username',
                        'profileImage',
                        [db.sequelize.literal('(SELECT COUNT(*) FROM literaryReview WHERE literaryReview.userId = User.userId)'), 'reviewCount'],
                        [db.sequelize.literal('(SELECT COUNT(*) FROM followRelationship WHERE followRelationship.followedUserId = User.userId)'), 'followersCount']
                    ]
                }
            ],
            limit,
            offset
        });

        if (reviews.length === 0) {
            return res.status(404).json({ success: false, message: "No reviews found for this work" });
        }
        
        const formattedReviews = reviews.map(review => ({
            literaryReviewId: review.literaryReviewId,
            reviewContent: review.literaryReview.substring(0, review.literaryReview.length / 3), // Preview content
            createdAt: review.creationDate,
            user: {
                userId: review.User.userId,
                username: review.User.username,
                profileImageUrl: review.User.profileImage,
                reviewCount: review.dataValues.User.dataValues.reviewCount || 0,
                followersCount: review.dataValues.User.dataValues.followersCount || 0
            },
            likeCount: review.dataValues.likeCount || 0,
            commentCount: review.dataValues.commentCount || 0,
            links: [
                { rel: "self", href: `/works/${review.workId}/reviews/${review.literaryReviewId}`, method: "GET" },
                { rel: "delete", href: `/works/${review.workId}/reviews/${review.literaryReviewId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${review.workId}/reviews/${review.literaryReviewId}`, method: "PATCH" }
            ]
        }));

        const totalReviews = await LiteraryReview.count({ where: { workId } });
        const totalPages = Math.ceil(totalReviews / limit);

        return res.status(200).json({
            success: true,
            message: `Found ${reviews.length} reviews`,
            totalReviews,
            totalPages,
            currentPage: parseInt(page, 10),
            reviews: formattedReviews,
            links: [{ rel: "add-literary-review", href: `/works/${workId}/reviews/`, method: "POST" }]
        });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the reviews." });
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
        const { workId, literaryReviewId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const comments = await CommentReview.findAll({
            where: { literaryReviewId },
            attributes: [
                'commentId', 
                'literaryReviewId', 
                'comment', 
                'creationDate',
                [db.sequelize.literal('(SELECT COUNT(*) FROM likeComment WHERE likeComment.commentId = CommentReview.commentId)'), 'likeCount']
            ],
            include: [
                {
                    model: db.User,
                    as: 'Commenter',
                    attributes: ['userId', 'username']
                }
            ],
            order: [['creationDate', 'DESC']],
            offset,
            limit,
        });

        if (comments.length === 0) {
            return res.status(404).json({ success: false, message: "No comments found for this review" });
        }

        const formattedComments = comments.map(comment => ({
            commentId: comment.commentId,
            literaryReviewId: comment.literaryReviewId,
            comment: comment.comment,
            createdAt: comment.creationDate,
            likeCount: comment.dataValues.likeCount || 0,
            User: {
                userId: comment.Commenter.userId,
                username: comment.Commenter.username
            },
            links: [
                { rel: "delete", href: `/works/${workId}/reviews/${literaryReviewId}/comments/${comment.commentId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${workId}/reviews/${literaryReviewId}/comments/${comment.commentId}`, method: "PATCH" }
            ]
        }));

        const totalComments = await CommentReview.count({ where: { literaryReviewId } });
        const totalPages = Math.ceil(totalComments / limit);

        res.status(200).json({
            success: true,
            message: `Found ${comments.length} comments`,
            totalComments,
            totalPages,
            currentPage: parseInt(page, 10),
            comments: formattedComments,
            links: [{ rel: "add-comment-review", href: `/works/${workId}/reviews/${literaryReviewId}/comments`, method: "POST" }]
        });
    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the comments." });
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
        const newComment = await CommentReview.create({
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
        const affectedRows = await CommentReview.update(req.body, { where: { commentId: req.params.commentId } });
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
        const result = await CommentReview.destroy({ where: { commentId: req.params.commentId } });
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
        const comment = await CommentReview.findByPk(commentId);
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
