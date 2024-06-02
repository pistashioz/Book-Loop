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

        if (isNaN(page) || page <= 0) {
            return res.status(400).json({ success: false, message: "Page must be a positive integer" });
        }
        if (isNaN(limit) || limit <= 0) {
            return res.status(400).json({ success: false, message: "Limit must be a positive integer" });
        }
        

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
                            SELECT MIN(be.publicationDate)
                            FROM bookEdition AS be
                            JOIN work AS w ON be.UUID = w.primaryEditionUUID
                            WHERE w.seriesId = BookInSeries.seriesId
                        )`),
                        'firstPublishedDate'
                    ],
                    [
                        db.sequelize.literal(`(
                            SELECT MAX(be.publicationDate)
                            FROM bookEdition AS be
                            JOIN work AS w ON be.UUID = w.primaryEditionUUID
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
                    include: [
                        {
                            model: BookEdition,
                            attributes: ['coverImage'],
                            where: { UUID: { [Op.eq]: db.sequelize.col('primaryEditionUUID') } }
                        },
                        {
                            model: BookAuthor,
                            as: 'BookAuthors',
                            attributes: ['personId'],
                            include: [{
                                model: Person,
                                as: 'Person',
                                attributes: ['personName']
                            }]
                        }
                    ]
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
                if (s.dataValues.firstPublishedDate && s.dataValues.lastPublishedDate && (s.dataValues.firstPublishedDate != s.dataValues.lastPublishedDate)) {
                    publicationRange = `${s.dataValues.firstPublishedDate.split('-')[0]} - ${s.dataValues.lastPublishedDate.split('-')[0]}`;
                } else if (s.dataValues.firstPublishedDate && !s.dataValues.lastPublishedDate || s.dataValues.firstPublishedDate == s.dataValues.lastPublishedDate ) {
                    publicationRange = `${s.dataValues.firstPublishedDate.split('-')[0]} - Present`;
                } else if (!s.dataValues.firstPublishedDate && s.dataValues.lastPublishedDate || (s.dataValues.firstPublishedDate && !s.dataValues.lastPublishedDate)) {
                    publicationRange = `${s.dataValues.lastPublishedDate.split('-')[0]}`;
                }

                // Retrieve cover images for primary editions
                const coverImages = s.Works.map(work => work.BookEditions[0]?.coverImage).filter(Boolean);

                // Retrieve authors for the series
                const authors = [];
                s.Works.forEach(work => {
                    work.BookAuthors.forEach(author => {
                        if (!authors.some(a => a.personId === author.personId)) {
                            authors.push({
                                personId: author.personId,
                                personName: author.Person.personName
                            });
                        }
                    });
                });

                return {
                    seriesId: s.seriesId,
                    seriesName: s.seriesName,
                    seriesDescription: s.seriesDescription ? s.seriesDescription.substring(0, 100) + '...' : null,
                    worksCount: s.dataValues.worksCount,
                    totalReviews: s.dataValues.totalReviews,
                    averageLiteraryRating: s.dataValues.averageLiteraryRating ? parseFloat(s.dataValues.averageLiteraryRating).toFixed(2) : null,
                    authors: authors,
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
                    attributes: ['workId', 'averageLiteraryRating', 'seriesOrder', 'totalReviews', 'primaryEditionUUID'],
                    include: [
                        {
                            model: BookAuthor,
                            as: 'BookAuthors',
                            attributes: ['personId'],
                            include: {
                                model: Person,
                                as: 'Person',
                                attributes: ['personName']
                            }
                        },
                        {
                            model: BookEdition,
                            as: 'BookEditions',
                            where: { UUID: { [Op.eq]: db.sequelize.col('primaryEditionUUID') } },
                            attributes: ['title', 'publicationDate', 'synopsis', 'coverImage']
                        }
                    ]
                }
            ]
        });
        
        // If the series is not found, return a 404 error
        if (!series) {
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }

        // Prepare the response data
        const seriesData = {
            seriesId: series.seriesId,
            seriesName: series.seriesName,
            seriesDescription: series.seriesDescription,
            works: series.Works.map(work => ({
                workId: work.workId,
                seriesOrder: work.seriesOrder,
                authors: work.BookAuthors.map(author => ({
                    personId: author.personId,
                    personName: author.Person.personName
                })),
                averageLiteraryRating: work.averageLiteraryRating ? parseFloat(work.averageLiteraryRating).toFixed(2) : null,
                totalReviews: work.totalReviews,
                editionsCount: work.BookEditions.length,
                primaryEdition: work.BookEditions[0] ? {
                    title: work.BookEditions[0].title,
                    publicationDate: work.BookEditions[0].publicationDate,
                    synopsis: work.BookEditions[0].synopsis,
                    coverImage: work.BookEditions[0].coverImage
                } : {}
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

