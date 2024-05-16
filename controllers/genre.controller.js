const db = require('../models');
const {Genre, Work, BookGenre, LiteraryReview, BookInSeries, BookEdition} = db;
const { ValidationError, Op } = require('sequelize');

exports.createGenre = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { genreName, works } = req.body;

        // Validate genreName
        if (!genreName) {
            return res.status(400).json({ success: false, message: "Genre name cannot be empty!" });
        }

        // Check if genre already exists
        const existingGenre = await Genre.findOne({ where: { genreName } });
        if (existingGenre) {
            return res.status(400).json({
                success: false,
                message: "Genre already exists.",
                links: [{ rel: 'self', href: `/genres/${existingGenre.genreId}`, method: 'GET' }]
            });
        }

        // Create new genre
        const newGenre = await Genre.create({ genreName }, { transaction: t });

        // Handle associations with works if provided
        if (works) {
            for (const workId of works) {
                const work = await Work.findByPk(workId);
                if (!work) {
                    await t.rollback();
                    return res.status(404).json({
                        success: false,
                        message: `Work with ID ${workId} not found.`,
                        links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
                    });
                }
                await BookGenre.create({ workId, genreId: newGenre.genreId }, { transaction: t });
            }
        }

        await t.commit();
        res.status(201).json({
            success: true,
            message: 'New genre created successfully.',
            genre: newGenre,
            links: [{ rel: 'self', href: `/genres/${newGenre.genreId}`, method: 'GET' }]
        });
    } catch (err) {
        await t.rollback();
        console.error("Error creating genre:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: err.message || "Some error occurred while creating the genre." });
        }
    }
};

/**
 * Update a genre by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updateGenre = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { genreId } = req.params;
        const { genreName, works } = req.body;

        // Check if the genre exists
        const genre = await Genre.findByPk(genreId, {
            include: [{ model: BookGenre }]
        });
        if (!genre) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Genre not found.' });
        }

        // Update genre name if provided and differs from current name
        let genreNameUpdated = false;
        if (genreName && genreName !== genre.genreName) {
            const existingGenre = await Genre.findOne({ where: { genreName } });
            if (existingGenre && existingGenre.genreId !== genreId) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Genre name already exists.",
                    links: [{ rel: 'self', href: `/genres/${existingGenre.genreId}`, method: 'GET' }]
                });
            }
            genre.genreName = genreName;
            genreNameUpdated = true;
        }

        // Update associations with works if provided and differ from current associations
        let worksUpdated = false;
        if (works) {
            const currentWorkIds = genre.bookGenres.map(bg => bg.workId);
            const newWorkIds = works.filter(workId => !currentWorkIds.includes(workId));
            const removedWorkIds = currentWorkIds.filter(workId => !works.includes(workId));

            if (newWorkIds.length > 0 || removedWorkIds.length > 0) {
                // Remove old associations
                await BookGenre.destroy({ where: { genreId }, transaction: t });
                // Create new associations
                for (const workId of works) {
                    const work = await Work.findByPk(workId);
                    if (!work) {
                        await t.rollback();
                        return res.status(404).json({
                            success: false,
                            message: `Work with ID ${workId} not found.`,
                            links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
                        });
                    }
                    await BookGenre.create({ workId, genreId }, { transaction: t });
                }
                worksUpdated = true;
            }
        }

        // Save the genre if name was updated
        if (genreNameUpdated) {
            await genre.save({ transaction: t });
        }

        // Commit the transaction
        await t.commit();

        // Re-fetch the updated genre including its associations
        const updatedGenre = await Genre.findByPk(genreId, {
            include: [{ model: BookGenre }]
        });

        // Determine the response message
        let message = 'Genre updated successfully.';
        if (!genreNameUpdated && !worksUpdated) {
            message = 'No changes made to the genre.';
        }

        // Add the HATEOAS links for the associated works
        const links = [{ rel: 'self', href: `/genres/${genreId}`, method: 'GET' }];
        updatedGenre.bookGenres.forEach(bookGenre => {
            links.push({ rel: 'work', href: `/works/${bookGenre.workId}`, method: 'GET' });
        });

        res.status(200).json({
            success: true,
            message,
            genre: updatedGenre,
            links
        });
    } catch (err) {
        await t.rollback();
        console.error("Error updating genre:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: err.message || "Some error occurred while updating the genre." });
        }
    }
};




/**
 * Delete a genre by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.deleteGenre = async (req, res) => {
    try {
        const { genreId } = req.params;

        // Check if the genre exists
        const genre = await Genre.findByPk(genreId);
        if (!genre) {
            return res.status(404).json({ success: false, message: 'Genre not found.' });
        }

        // Check if the genre has any associated works
        const associatedWorksCount = await BookGenre.count({ where: { genreId } });
        if (associatedWorksCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete genre with associated works.',
                links: [{ rel: 'self', href: `/genres/${genreId}/works`, method: 'GET' }]
            });
        }

        // Delete the genre
        await genre.destroy();
        res.status(204).json({ success: true, message: 'Genre deleted successfully.' });
    } catch (error) {
        console.error("Error deleting genre:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while deleting the genre." });
    }
};

/**
 * Retrieve all genres with pagination and work count.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findGenres = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { genreName } = req.query;

        const where = {};
        if (genreName) {
            where.genreName = {
                [Op.like]: `%${genreName}%`
            };
        }

        // Fetch the total count of genres
        const totalCount = await Genre.count({ where });

        // Fetch the paginated genres with work count
        const genres = await Genre.findAll({
            where,
            limit,
            offset,
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM bookGenre AS bg
                            WHERE
                                bg.genreId = genre.genreId
                        )`),
                        'worksCount'
                    ]
                ]
            },
            order: [['genreId', 'ASC']]
        });

        const totalPages = Math.ceil(totalCount / limit);

        // Adding HATEOAS links to each genre
        const genresWithLinks = genres.map(genre => ({
            ...genre.toJSON(),
            links: [
                { rel: 'self', href: `/genres/${genre.genreId}`, method: 'GET' },
                { rel: 'update', href: `/genres/${genre.genreId}`, method: 'PATCH' },
                { rel: 'delete', href: `/genres/${genre.genreId}`, method: 'DELETE' }
            ]
        }));

        res.status(200).json({
            success: true,
            totalItems: totalCount,
            totalPages,
            currentPage: page,
            genres: genresWithLinks
        });
    } catch (error) {
        console.error("Error fetching genres:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching genres." });
    }
};




/**
 * Retrieve a single genre by ID with associated works and additional details.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findGenre = async (req, res) => {
    try {
        const { genreId } = req.params;

        const genre = await Genre.findByPk(genreId, {
            include: [
                {
                    model: BookGenre,
                    include: [
                        {
                            model: Work,
                            include: [
                                {
                                    model: LiteraryReview,
                                    attributes: []
                                },
                                {
                                    model: BookInSeries,
                                    as: 'BookInSeries',
                                    attributes: ['seriesName']
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!genre) {
            return res.status(404).json({
                success: false,
                message: 'Genre not found.'
            });
        }

        const works = await Promise.all(genre.bookGenres.map(async (bookGenre) => {
            const work = bookGenre.Work;
            const literaryReviewsCount = await LiteraryReview.count({ where: { workId: work.workId } });
            const averageRatingResult = await LiteraryReview.findOne({
                where: { workId: work.workId },
                attributes: [[db.sequelize.fn('AVG', db.sequelize.col('literaryRating')), 'averageRating']],
                raw: true
            });
            const averageRating = averageRatingResult ? parseFloat(Number(averageRatingResult.averageRating)).toFixed(2) : null;
            const coverEdition = await BookEdition.findOne({
                where: {
                    title: work.originalTitle,
                    publicationDate: work.firstPublishedDate
                },
                attributes: ['coverImage']
            });
            const editionsCount = await BookEdition.count({ where: { workId: work.workId } });

            return {
                workId: work.workId,
                originalTitle: work.originalTitle,
                firstPublishedDate: work.firstPublishedDate,
                seriesId: work.seriesId,
                seriesName: work.BookInSeries ? work.BookInSeries.seriesName : null,
                seriesOrder: work.seriesOrder,
                reviewsCount: literaryReviewsCount,
                averageRating,
                coverImage: coverEdition ? coverEdition.coverImage : null,
                editionsCount,
                links: [{ rel: "self", href: `/works/${work.workId}`, method: "GET" }]
            };
        }));

        res.status(200).json({
            success: true,
            genre: {
                genreId: genre.genreId,
                genreName: genre.genreName,
                worksCount: genre.bookGenres.length,
                works
            },
            links: [{ rel: "self", href: `/genres/${genreId}`, method: "GET" }]
        });
    } catch (error) {
        console.error("Error fetching genre:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching the genre." });
    }
};
