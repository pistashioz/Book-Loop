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
        const { seriesName, seriesDescription } = req.body;
        
        // Validate seriesName
        if (!seriesName || seriesName.trim() === '') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Series name cannot be empty!" });
        }
        
        // Check if series already exists
        const existingSeries = await BookInSeries.findOne({ where: { seriesName: { [Op.eq]: seriesName } } });
        if (existingSeries) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Series already exists.",
                existingSeries: { seriesId: existingSeries.seriesId, seriesName: existingSeries.seriesName },
                links: [{ rel: 'self', href: `/series/${existingSeries.seriesId}`, method: 'GET' }]
            });
        }
        
        // Create new series
        const newSeries = await BookInSeries.create({ seriesName, seriesDescription }, { transaction: t });
        
        await t.commit();
        res.status(201).json({
            success: true,
            message: 'New series created successfully.',
            series: newSeries,
            links: [{ rel: 'self', href: `/series/${newSeries.seriesId}`, method: 'GET' }]
        });
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
        const { seriesName, seriesDescription } = req.body;
        
        // Check if the series exists
        const series = await BookInSeries.findByPk(seriesId);
        if (!series) {
            // await t.rollback();
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }
        
        // Validate and update series name
        
        if (seriesName.trim() === "") {
            console.log('Series name cannot be empty.');
            return res.status(400).json({ success: false, message: "Series name cannot be empty." });
        }
        
        if (seriesName) {
            const existingSeries = await BookInSeries.findOne({ where: { seriesName } });
            
            if (existingSeries && existingSeries.seriesId !== Number(seriesId)) {
                // await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Series name already exists.",
                    existingSeries: {
                        seriesId: existingSeries.seriesId,
                        seriesName: existingSeries.seriesName
                    },
                    links: [{ rel: 'self', href: `/series/${existingSeries.seriesId}`, method: 'GET' }]
                });
            }
            if (existingSeries && existingSeries.seriesId === Number(seriesId)) {
                // If the series name is the same as the existing one for the same series ID
                // await t.commit();
                return res.status(200).json({
                    success: true,
                    message: 'Series name is unchanged.',
                    series: series,
                    links: [{ rel: 'self', href: `/series/${seriesId}`, method: 'GET' }]
                });
            }
            series.seriesName = seriesName;
        }
        
        // Update series description
        if (seriesDescription !== undefined) {
            series.seriesDescription = seriesDescription;
        }
        
        // Save the series
        await series.save({ transaction: t });
        await t.commit();
        
        // Re-fetch the updated series
        const updatedSeries = await BookInSeries.findByPk(seriesId);
        
        res.status(200).json({
            success: true,
            message: 'Series updated successfully.',
            series: updatedSeries,
            links: [{ rel: 'self', href: `/series/${seriesId}`, method: 'GET' }]
        });
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
        res.status(200).json({ success: true, message: 'Series deleted successfully.' });
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
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const { seriesName } = req.query;

        const where = {};
        if (seriesName) {
            where.seriesName = {
                [Op.like]: `%${seriesName}%`
            };
        }

        // Fetch series with works count, total reviews, and average literary rating
        const series = await BookInSeries.findAll({
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
                            SELECT SUM(w.totalReviews)
                            FROM work AS w
                            WHERE
                            w.seriesId = BookInSeries.seriesId
                        )`),
                        'totalReviews'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT AVG(w.averageLiteraryRating)
                            FROM work AS w
                            WHERE
                            w.seriesId = BookInSeries.seriesId
                        )`),
                        'averageLiteraryRating'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT GROUP_CONCAT(DISTINCT p.personName ORDER BY p.personName SEPARATOR ', ')
                            FROM person AS p
                            JOIN bookAuthor AS ba ON p.personId = ba.personId
                            JOIN work AS w ON ba.workId = w.workId
                            WHERE w.seriesId = BookInSeries.seriesId
                        )`),
                        'authors'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT MIN(be.publicationDate)
                            FROM bookEdition AS be
                            JOIN work AS w ON be.workId = w.workId
                            WHERE w.seriesId = BookInSeries.seriesId
                        )`),
                        'firstPublishedDate'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT MAX(be.publicationDate)
                            FROM bookEdition AS be
                            JOIN work AS w ON be.workId = w.workId
                            WHERE w.seriesId = BookInSeries.seriesId
                        )`),
                        'lastPublishedDate'
                    ],
                ]
            },
            include: [
                {
                    model: Work,
                    attributes: ['primaryEditionUUID'],
                    include: [{
                        model: BookEdition,
                        attributes: ['coverImage'],
                        where: { UUID: { [Op.eq]: db.sequelize.col('primaryEditionUUID') } }
                    }]
                }
            ],
            group: ['BookInSeries.seriesId'],
            order: [['seriesId', 'ASC']]
        });

        // Fetch the total count of series without pagination
        const totalCount = await BookInSeries.count({
            where,
        });

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({
            success: true,
            totalItems: totalCount,
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

                // Retrieve cover images for primary editions
                const coverImages = s.Works.map(work => work.BookEditions[0]?.coverImage).filter(Boolean);

                return {
                    seriesId: s.seriesId,
                    seriesName: s.seriesName,
                    seriesDescription: s.seriesDescription ? s.seriesDescription.substring(0, 100) + '...' : null,
                    worksCount: s.dataValues.worksCount,
                    totalReviews: s.dataValues.totalReviews,
                    averageLiteraryRating: s.dataValues.averageLiteraryRating ? parseFloat(s.dataValues.averageLiteraryRating).toFixed(2) : null,
                    authors: s.dataValues.authors,
                    publicationRange,
                    coverImages: coverImages,
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
