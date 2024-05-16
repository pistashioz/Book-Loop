const db = require('../models');
const { BookInSeries, Work, BookAuthor, Person, LiteraryReview, BookEdition} = db;
const { ValidationError, Op } = require('sequelize');


/**
 * Create a new book series.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.createSeries = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { seriesName, seriesDescription, works } = req.body;

        // Validate seriesName
        if (!seriesName) {
            return res.status(400).json({ success: false, message: "Series name cannot be empty!" });
        }

        // Check if series already exists
        const existingSeries = await BookInSeries.findOne({ where: { seriesName } });
        if (existingSeries) {
            return res.status(400).json({
                success: false,
                message: "Series already exists.",
                links: [{ rel: 'self', href: `/series/${existingSeries.seriesId}`, method: 'GET' }]
            });
        }

        // Create new series
        const newSeries = await BookInSeries.create({ seriesName, seriesDescription }, { transaction: t });

        // Handle associations with works if provided
        let invalidWorkEntries = [];
        if (works) {
            for (const work of works) {
                const { workId, seriesOrder } = work;
                if (!workId || !seriesOrder) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: "Both workId and seriesOrder are required." });
                    continue; // Skip invalid entries
                }
                const workInstance = await Work.findByPk(workId);
                if (!workInstance) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: `Work with ID ${workId} not found.` });
                    continue; // Skip invalid entries
                }
                if (workInstance.seriesId) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: `Work with ID ${workId} is already associated with a series.` });
                    continue; // Skip invalid entries
                }
                await workInstance.update({ seriesId: newSeries.seriesId, seriesOrder }, { transaction: t });
            }
        }

        await t.commit();

        const response = {
            success: true,
            message: 'New series created successfully.',
            series: newSeries,
            links: [{ rel: 'self', href: `/series/${newSeries.seriesId}`, method: 'GET' }]
        };

        if (invalidWorkEntries.length > 0) {
            response.invalidWorkEntries = invalidWorkEntries;
        }

        res.status(201).json(response);
    } catch (err) {
        await t.rollback();
        console.error("Error creating series:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: err.message || "Some error occurred while creating the series." });
        }
    }
};



/**
 * Update a book series by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updateSeries = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { seriesId } = req.params;
        const { seriesName, seriesDescription, works } = req.body;

        // Check if the series exists
        const series = await BookInSeries.findByPk(seriesId);
        if (!series) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }

        // Update series name if provided and differs from current name
        let seriesNameUpdated = false;
        if (seriesName && seriesName !== series.seriesName) {
            const existingSeries = await BookInSeries.findOne({ where: { seriesName } });
            if (existingSeries && existingSeries.seriesId !== seriesId) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Series name already exists.",
                    links: [{ rel: 'self', href: `/series/${existingSeries.seriesId}`, method: 'GET' }]
                });
            }
            series.seriesName = seriesName;
            seriesNameUpdated = true;
        }

        // Update series description if provided
        if (seriesDescription !== undefined) {
            series.seriesDescription = seriesDescription;
        }

        // Update associations with works if provided and differ from current associations
        let worksUpdated = false;
        let invalidWorkEntries = [];
        if (works) {
            for (const work of works) {
                const { workId, seriesOrder } = work;
                console.log(`Processing workId: ${workId}, seriesOrder: ${seriesOrder}`);
                if (!workId || !seriesOrder) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: "Both workId and seriesOrder are required." });
                    continue; // Skip invalid entries
                }
                const workInstance = await Work.findByPk(workId);
                console.log(`Found workInstance for workId: ${workId}`);
                if (!workInstance) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: `Work with ID ${workId} not found.` });
                    continue; // Skip invalid entries
                }
                // Ensure `seriesOrder` is set correctly
                if (workInstance.seriesId !== seriesId || workInstance.seriesOrder !== seriesOrder) {
                    await workInstance.update({ seriesId, seriesOrder }, { transaction: t });
                    worksUpdated = true;
                }
            }
        }

        // Save the series if name was updated
        if (seriesNameUpdated || seriesDescription !== undefined) {
            await series.save({ transaction: t });
        }

        // Commit the transaction
        await t.commit();

        // Re-fetch the updated series including its associations
        const updatedSeries = await BookInSeries.findByPk(seriesId, {
            include: [{ model: Work }]
        });

        // Determine the response message
        let message = 'Series updated successfully.';
        if (!seriesNameUpdated && seriesDescription === undefined && !worksUpdated) {
            message = 'No changes made to the series.';
        }

        // Add the HATEOAS links for the associated works
        updatedSeries.Works.forEach(work => {
            work.dataValues.links = [{ rel: "self", href: `/works/${work.workId}`, method: "GET" }];
        });

        const response = {
            success: true,
            message,
            series: updatedSeries,
            links: [{ rel: 'self', href: `/series/${seriesId}`, method: 'GET' }]
        };

        if (invalidWorkEntries.length > 0) {
            response.invalidWorkEntries = invalidWorkEntries;
        }

        res.status(200).json(response);
    } catch (err) {
        await t.rollback();
        console.error("Error updating series:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: err.message || "Some error occurred while updating the series." });
        }
    }
};



/**
 * Delete a book series by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.deleteSeries = async (req, res) => {
    try {
        const { seriesId } = req.params;

        // Check if the series exists
        const series = await BookInSeries.findByPk(seriesId);
        if (!series) {
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }

        // Check if the series has any associated works
        const associatedWorksCount = await Work.count({ where: { seriesId } });
        if (associatedWorksCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete series with associated works.',
                links: [{ rel: 'self', href: `/series/${seriesId}/works`, method: 'GET' }]
            });
        }

        // Delete the series
        await series.destroy();
        res.status(204).json({ success: true, message: 'Series deleted successfully.' });
    } catch (error) {
        console.error("Error deleting series:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while deleting the series." });
    }
};

/**
 * Retrieve all series with optional filtering, pagination, and additional details.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findAllSeries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { seriesName } = req.query;

        const where = {};
        if (seriesName) {
            where.seriesName = {
                [Op.like]: `%${seriesName}%`
            };
        }

        const { rows: series, count } = await BookInSeries.findAndCountAll({
            where,
            limit,
            offset,
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM work AS w
                            WHERE
                                w.seriesId = BookInSeries.seriesId
                        )`),
                        'worksCount'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT MIN(w.firstPublishedDate)
                            FROM work AS w
                            WHERE
                                w.seriesId = BookInSeries.seriesId
                        )`),
                        'firstPublishedDate'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT MAX(w.firstPublishedDate)
                            FROM work AS w
                            WHERE
                                w.seriesId = BookInSeries.seriesId
                        )`),
                        'lastPublishedDate'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT GROUP_CONCAT(p.personName SEPARATOR ', ')
                            FROM person AS p
                            JOIN bookAuthor AS ba ON p.personId = ba.personId
                            JOIN work AS w ON ba.workId = w.workId
                            WHERE w.seriesId = BookInSeries.seriesId
                        )`),
                        'authors'
                    ]
                ]
            },
            group: ['BookInSeries.seriesId'],
            order: [['seriesId', 'ASC']]
        });

        const totalPages = Math.ceil(count / limit);

        res.status(200).json({
            success: true,
            totalItems: count,
            totalPages,
            currentPage: page,
            series: series.map(s => {
                let publicationRange = 'Unknown';
                if (s.dataValues.firstPublishedDate && s.dataValues.lastPublishedDate) {
                    publicationRange = `${s.dataValues.firstPublishedDate.split('-')[0]} - ${s.dataValues.lastPublishedDate.split('-')[0]}`;
                } else if (s.dataValues.firstPublishedDate) {
                    publicationRange = `${s.dataValues.firstPublishedDate.split('-')[0]} - Present`;
                } else if (s.dataValues.lastPublishedDate) {
                    publicationRange = `Unknown - ${s.dataValues.lastPublishedDate.split('-')[0]}`;
                }

                return {
                    seriesId: s.seriesId,
                    seriesName: s.seriesName,
                    seriesDescription: s.seriesDescription ? s.seriesDescription.substring(0, 100) + '...' : null,
                    worksCount: s.dataValues.worksCount,
                    authors: s.dataValues.authors,
                    publicationRange,
                    links: [{ rel: "self", href: `/series/${s.seriesId}`, method: "GET" }]
                };
            })
        });
    } catch (error) {
        console.error("Error fetching series:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching series." });
    }
};


/**
 * Retrieve a single series by ID with detailed information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findSeriesById = async (req, res) => {
    try {
        const { seriesId } = req.params;

        // Check if the series exists
        const series = await BookInSeries.findByPk(seriesId, {
            include: [
                {
                    model: Work,
                    include: [
                        {
                            model: BookAuthor,
                            include: {
                                model: Person,
                                attributes: ['personId', 'personName']
                            }
                        },
                        {
                            model: LiteraryReview,
                            attributes: []
                        }
                    ]
                }
            ]
        });

        // If the series is not found, return a 404 error
        if (!series) {
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }

        // Count the number of works in the series
        const worksCount = await Work.count({ where: { seriesId } });

        // Prepare the response data
        const seriesData = {
            seriesId: series.seriesId,
            seriesName: series.seriesName,
            seriesDescription: series.seriesDescription,
            worksCount,
            works: await Promise.all(series.Works.map(async work => {
                // Find the book edition that matches the original title and publication date of the work
                const bookEdition = await BookEdition.findOne({
                    where: {
                        workId: work.workId,
                        title: { [Op.eq]: work.originalTitle },
                        publicationDate: { [Op.eq]: work.firstPublishedDate }
                    },
                    order: [['publicationDate', 'ASC']],
                    limit: 1,
                    attributes: ['ISBN', 'title', 'publicationDate', 'synopsis', 'coverImage']
                });

                // Calculate the average rating for the work
                const averageRating = await LiteraryReview.findOne({
                    where: { workId: work.workId },
                    attributes: [[db.sequelize.fn('AVG', db.sequelize.col('literaryRating')), 'averageRating']],
                    raw: true
                });

                // Count the number of reviews and editions for the work
                const reviewsCount = await LiteraryReview.count({ where: { workId: work.workId } });
                const editionsCount = await BookEdition.count({ where: { workId: work.workId } });

                // Prepare the work data
                return {
                    workId: work.workId,
                    originalTitle: work.originalTitle,
                    firstPublishedDate: work.firstPublishedDate,
                    authors: work.bookAuthors.map(ba => ba.person.personName).join(', '),
                    averageRating: averageRating ? parseFloat(averageRating.averageRating).toFixed(2) : '0.00',
                    reviewsCount,
                    editionsCount,
                    synopsis: bookEdition ? bookEdition.synopsis : 'Synopsis not available.',
                    coverImage: bookEdition ? bookEdition.coverImage : 'Cover image not available.',
                    links: [{ rel: "self", href: `/works/${work.workId}`, method: "GET" }]
                };
            }))
        };

        // Send the response with the series data
        res.status(200).json({
            success: true,
            series: seriesData,
            links: [{ rel: 'self', href: `/series/${seriesId}`, method: 'GET' }]
        });
    } catch (error) {
        // Log and send the error response
        console.error("Error fetching series:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching the series." });
    }
};


/* 
exports.findSeriesById = async (req, res) => {
    try {
        const { seriesId } = req.params;

        // Check if the series exists
        const series = await BookInSeries.findByPk(seriesId, {
            include: [
                {
                    model: Work,
                    include: [
                        {
                            model: BookAuthor,
                            include: {
                                model: Person,
                                attributes: ['personId', 'personName']
                            }
                        },
                        {
                            model: LiteraryReview,
                            attributes: []
                        },
                       /*  {
                            model: BookEdition,
                            where: {
                                title: { [Op.eq]: Work.originalTitle },
                                publicationDate: { [Op.eq]: Work.firstPublishedDate }
                            },
                            order: [['publicationDate', 'ASC']],
                            limit: 1,
                            attributes: ['ISBN', 'title', 'publicationDate', 'synopsis', 'coverImage']
                        } 
                    ]
                }
            ]
        });

        if (!series) {
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }
        // console.log(series.Works[0]);
        // Count the number of works in the series
        const worksCount = await Work.count({ where: { seriesId } });

        // Prepare the response data
        const seriesData = {
            seriesId: series.seriesId,
            seriesName: series.seriesName,
            seriesDescription: series.seriesDescription,
            worksCount,
            works: await Promise.all(series.Works.map(async work => {
                console.log(work.originalTitle);
                console.log(work.firstPublishedDate);
                console.log(`The typeof work.originalTitle is ${typeof work.originalTitle}`);
                console.log(`The typeof work.firstPublishedDate is ${typeof work.firstPublishedDate}`);
                const bookEdition = await BookEdition.findOne({
                    where: {
                        workId: work.workId,
                         title: { [Op.eq]: work.originalTitle },
                        publicationDate: { [Op.eq]: work.firstPublishedDate } 
                    },
                    order: [['publicationDate', 'ASC']],
                    limit: 1,
                    attributes: ['ISBN', 'title', 'publicationDate','synopsis', 'coverImage']
                });
                const averageRating = await LiteraryReview.findOne({
                    where: { workId: work.workId },
                    attributes: [[db.sequelize.fn('AVG', db.sequelize.col('literaryRating')), 'averageRating']],
                    raw: true
                });
                const reviewsCount = await LiteraryReview.count({ where: { workId: work.workId } });
                const editionsCount = await BookEdition.count({ where: { workId: work.workId } });
                // const firstEdition = work.BookEditions.length > 0 ? work.BookEditions[0] : null;

                return {
                    workId: work.workId,
                    originalTitle: work.originalTitle,
                    firstPublishedDate: work.firstPublishedDate,
                    authors: work.bookAuthors.map(ba => ba.person.personName).join(', '),
                    averageRating: averageRating ? parseFloat(averageRating.averageRating).toFixed(2) : '0.00',
                    reviewsCount,
                    editionsCount,
                    synopsis: bookEdition ? bookEdition.synopsis : 'Synopsis not available.',
                    coverImage: bookEdition ? bookEdition.coverImage : 'Cover image not available.',
                    links: [{ rel: "self", href: `/works/${work.workId}`, method: "GET" }]
                };
            }))
        };

        res.status(200).json({
            success: true,
            series: seriesData,
            links: [{ rel: 'self', href: `/series/${seriesId}`, method: 'GET' }]
        });
    } catch (error) {
        console.error("Error fetching series:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching the series." });
    }
};


 */