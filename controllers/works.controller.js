const db = require('../models');
const {
    Work,
    Person,
    BookEdition,
    LiteraryReview,
    CommentReview,
    BookAuthor,
    LikeReview,
    LikeComment,
    BookInSeries,
    Publisher,
    BookGenre,
    Language,
    Genre,
    BookContributor 
} = db;
const { ValidationError, Op, Sequelize } = require('sequelize');


/**
 * Fetch all works with pagination, average rating, and associated data.
 * Allows filtering by genres, authors, dates, languages, and average literary rating.
 * Also allows sorting by publication date, average rating, or total reviews.
 */
exports.findAll = async (req, res) => {
    try {
        // Extract query parameters
        const { 
            page = 1, 
            limit = 10, 
            genres, 
            authors, 
            startDate, 
            endDate, 
            language, 
            minRating, 
            maxRating, 
            sortBy = 'publicationDate', 
            sortOrder = 'DESC' 
        } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        // Build filtering conditions
        let whereClause = {};
        let havingClause = {};
        let orderClause = [];
        let workIds = [];

        // Filter by rating
        if (minRating || maxRating) {
            havingClause.averageLiteraryRating = {};
            if (minRating) havingClause.averageLiteraryRating[Op.gte] = parseFloat(minRating);
            if (maxRating) havingClause.averageLiteraryRating[Op.lte] = parseFloat(maxRating);
        }

        // Filter by publication date in the PrimaryEdition table
        let primaryEditionWhereClause = {};
        if (startDate || endDate) {
            primaryEditionWhereClause.publicationDate = {};
            if (startDate) primaryEditionWhereClause.publicationDate[Op.gte] = startDate;
            if (endDate) primaryEditionWhereClause.publicationDate[Op.lte] = endDate;
        }

        // Sorting
        if (sortBy && sortOrder) {
            orderClause.push([Sequelize.col(sortBy), sortOrder]);
        }

        // Filter by genres
        if (genres) {
            const genreWorkIds = await BookGenre.findAll({
                attributes: ['workId'],
                include: [{
                    model: Genre,
                    as: 'Genre',
                    where: { genreName: { [Op.in]: genres.split(',') } }
                }]
            });
            workIds = genreWorkIds.map(genre => genre.workId);
        }

        // Filter by authors
        if (authors) {
            const authorWorkIds = await BookAuthor.findAll({
                attributes: ['workId'],
                include: [{
                    model: Person,
                    as: 'Person',
                    where: { personName: { [Op.in]: authors.split(',') } }
                }]
            });
            if (workIds.length > 0) {
                const authorWorkIdsList = authorWorkIds.map(author => author.workId);
                workIds = workIds.filter(workId => authorWorkIdsList.includes(workId));
            } else {
                workIds = authorWorkIds.map(author => author.workId);
            }
        }

        // If workIds array is not empty, add it to the where clause
        if (workIds.length > 0) {
            whereClause.workId = { [Op.in]: workIds };
        }

        // Count total works based on filters
        const totalWorks = await Work.count({
            where: whereClause,
            include: [
                {
                    model: BookEdition,
                    as: 'PrimaryEdition',
                    where: primaryEditionWhereClause,
                    include: [
                        {
                            model: Language,
                            as: 'Language',
                            where: language ? { languageName: language } : {}
                        }
                    ]
                }
            ]
        });

        // Fetch main works with pagination
        const works = await Work.findAll({
            attributes: [
                'workId',
                'averageLiteraryRating',
                'totalReviews',
                'seriesId',
                'seriesOrder',
                'primaryEditionISBN'
            ],
            where: whereClause,
            include: [
                {
                    model: BookEdition,
                    as: 'PrimaryEdition',
                    attributes: ['title', 'publicationDate', 'synopsis', 'coverImage'],
                    where: primaryEditionWhereClause,
                    include: [
                        {
                            model: Language,
                            as: 'Language',
                            attributes: ['languageName'],
                            where: language ? { languageName: language } : {}
                        }
                    ]
                },
                {
                    model: BookInSeries,
                    as: 'BookInSeries',
                    attributes: ['seriesName'],
                    required: false // Left join
                }
            ],
            group: ['Work.workId'],
            having: havingClause,
            order: orderClause,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        });

        // Handle case where no works are found
        if (works.length === 0) {
            return res.status(404).json({ success: false, message: "No works found" });
        }

        // Fetch Genres and Authors for each work separately
        for (let work of works) {
            const genres = await BookGenre.findAll({
                include: [{
                    model: Genre,
                    as: 'Genre',
                    attributes: ['genreId', 'genreName'],
                }],
                where: { workId: work.workId }
            });
            work.dataValues.Genres = genres.map(genre => genre.Genre);

            const authors = await BookAuthor.findAll({
                include: [{
                    model: Person,
                    as: 'Person',
                    attributes: ['personId', 'personName'],
                }],
                where: { workId: work.workId }
            });
            work.dataValues.Authors = authors.map(author => author.Person);
        }

        // Map works to the desired response format
        const result = works.map(work => ({
            workId: work.workId,
            title: work.PrimaryEdition ? work.PrimaryEdition.title : null,
            publicationDate: work.PrimaryEdition ? work.PrimaryEdition.publicationDate : null,
            synopsis: work.PrimaryEdition ? work.PrimaryEdition.synopsis : null,
            coverImage: work.PrimaryEdition ? work.PrimaryEdition.coverImage : null,
            language: work.PrimaryEdition && work.PrimaryEdition.Language ? work.PrimaryEdition.Language.languageName : null,
            averageRating: work.averageLiteraryRating || 0,
            totalReviews: work.totalReviews || 0,
            Series: {
                seriesId: work.seriesId,
                seriesOrder: work.seriesOrder,
                seriesName: work.BookInSeries ? work.BookInSeries.seriesName : 'Not part of a series'
            },
            Authors: work.dataValues.Authors,
            Genres: work.dataValues.Genres,
            links: [
                { rel: "self", href: `/works/${work.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${work.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${work.workId}`, method: "PATCH" }
            ]
        }));

        // Calculate total number of pages
        const totalPages = Math.ceil(totalWorks / parseInt(limit, 10));

        // Send the response with works data and pagination info
        return res.status(200).json({
            success: true,
            message: `Found ${works.length} works`,
            totalWorks,
            totalPages,
            currentPage: parseInt(page, 10),
            works: result,
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
        const { originalTitle, firstPublishedDate, series = {}, seriesOrder = null, authors = [], genres = [], edition = null } = req.body;

        // Check for duplicate work using title and firstPublishedDate
        const existingWork = await Work.findOne({
            where: { originalTitle, firstPublishedDate },
            include: [{
                model: BookAuthor,
                include: [{
                    model: Person,
                    where: { personName: { [Op.in]: authors } }
                }]
            }]
        });

        if (existingWork) {
            return res.status(400).json({ success: false, message: 'Work already exists with the same title, publication date, and author.' });
        }

        // Check and prompt for series creation if needed
        let seriesId = null;
        if (series.name) {
            const existingSeries = await BookInSeries.findOne({ where: { seriesName: series.name } });
            if (!existingSeries) {
                return res.status(400).json({
                    success: false,
                    message: 'Series does not exist.',
                    links: [{ rel: 'create-series', href: '/book-in-series', method: 'POST' }]
                });
            }
            seriesId = existingSeries.seriesId;
        }

        // Check and prompt for author creation if needed
        for (const authorName of authors) {
            const existingAuthor = await Person.findOne({
                where: { personName: authorName },
                include: [{
                    model: PersonRole,
                    include: [{
                        model: Role,
                        where: { roleName: 'author' }
                    }]
                }]
            });
            if (!existingAuthor) {
                return res.status(400).json({
                    success: false,
                    message: `Author "${authorName}" does not exist or is not assigned the role of 'author'.`,
                    links: [{ rel: 'create-author', href: '/persons', method: 'POST' }]
                });
            }
        }

        // Check and prompt for genre creation if needed
        for (const genreName of genres) {
            const existingGenre = await Genre.findOne({ where: { genreName } });
            if (!existingGenre) {
                return res.status(400).json({
                    success: false,
                    message: `Genre "${genreName}" does not exist.`,
                    links: [{ rel: 'create-genre', href: '/book-genres', method: 'POST' }]
                });
            }
        }

        // Create new work
        const newWork = await Work.create({ originalTitle, firstPublishedDate, seriesId, seriesOrder }, { transaction: t });

        // Associate authors
        for (const authorName of authors) {
            const author = await Person.findOne({ where: { personName: authorName } });
            await BookAuthor.create({ workId: newWork.workId, personId: author.personId }, { transaction: t });
        }

        // Associate genres
        for (const genreName of genres) {
            const genre = await Genre.findOne({ where: { genreName } });
            await BookGenre.create({ workId: newWork.workId, genreId: genre.genreId }, { transaction: t });
        }

/*         // Create initial book edition if provided
        if (edition) {
            const { ISBN, publisherName, synopsis, editionType, language, pageNumber, coverImage } = edition;

            // Find the publisher
            const publisher = await Publisher.findOne({ where: { publisherName } });
            if (!publisher) {
                return res.status(400).json({
                    success: false,
                    message: 'Publisher does not exist.',
                    links: [{ rel: 'create-publisher', href: '/publishers', method: 'POST' }]
                });
            }

            await BookEdition.create({
                ISBN,
                workId: newWork.workId,
                publisherId: publisher.publisherId,
                title: originalTitle,  // Ensure title matches originalTitle
                synopsis,
                editionType,
                publicationDate: firstPublishedDate,  // Ensure publicationDate matches firstPublishedDate
                language,
                pageNumber,
                coverImage
            }, { transaction: t });
        } */

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
 * Add an author to a work.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addAuthor = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId } = req.params;
        const { authors } = req.body;

        // Check if work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Validate and associate authors
        for (const authorName of authors) {
            const existingAuthor = await Person.findOne({
                where: { personName: authorName },
                include: {
                    model: Role,
                    where: { roleName: 'author' },
                    through: { attributes: [] } // Exclude PersonRole attributes from the result???
                }
            });

            if (!existingAuthor) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Author "${authorName}" does not exist or does not have the 'author' role.`,
                    links: [{ rel: 'create-author', href: '/persons', method: 'POST' }]
                });
            }

            await BookAuthor.create({ workId: work.workId, personId: existingAuthor.personId }, { transaction: t });
        }

        await t.commit();

        res.status(201).json({ success: true, message: 'Authors added to work successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error adding authors to work:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while adding authors to the work." });
    }
};


/**
 * Remove an author from a work.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeAuthor = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId } = req.params;
        const { authorId } = req.body;

        // Check if work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the author association exists
        const authorAssociation = await BookAuthor.findOne({ where: { workId, personId: authorId } });
        if (!authorAssociation) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Author association not found for this work.' });
        }

        // Count current authors
        const currentAuthorsCount = await BookAuthor.count({ where: { workId } });

        // If there's only one author left, don't allow deletion
        if (currentAuthorsCount <= 1) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot remove the only author from the work. Add another author before removing this one.',
                links: [{ rel: 'add-author', href: `/works/${workId}/authors`, method: 'POST' }]
            });
        }

        // Remove author association
        await BookAuthor.destroy({ where: { workId, personId: authorId }, transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: 'Author removed from work successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error removing author from work:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while removing the author from the work." });
    }
};


/**
 * Add a genre to a work.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addGenre = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId } = req.params;
        const { genres } = req.body;

        // Check if work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check and prompt for genre creation if needed
        for (const genreName of genres) {
            const existingGenre = await Genre.findOne({ where: { genreName } });
            if (!existingGenre) {
                return res.status(400).json({
                    success: false,
                    message: `Genre "${genreName}" does not exist.`,
                    links: [{ rel: 'create-genre', href: '/genres', method: 'POST' }]
                });
            }
            await BookGenre.create({ workId: work.workId, genreId: existingGenre.genreId }, { transaction: t });
        }

        await t.commit();

        res.status(201).json({ success: true, message: 'Genres added to work successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error adding genres to work:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while adding genres to the work." });
    }
};

/**
 * Remove a genre from a work.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeGenre = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId } = req.params;
        const { genreId } = req.body;

        // Check if work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the genre association exists
        const genreAssociation = await BookGenre.findOne({ where: { workId, genreId } });
        if (!genreAssociation) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Genre association not found for this work.' });
        }

        // Count current genres
        const currentGenresCount = await BookGenre.count({ where: { workId } });

        // If there's only one genre left, don't allow deletion
        if (currentGenresCount <= 1) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot remove the only genre from the work. Add another genre before removing this one.',
                links: [{ rel: 'add-genre', href: `/works/${workId}/genres`, method: 'POST' }]
            });
        }

        // Remove genre association
        await BookGenre.destroy({ where: { workId, genreId }, transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: 'Genre removed from work successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error removing genre from work:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while removing the genre from the work." });
    }
};



// NEED TO REVIEW - i DONT NEED THE BOOK EDITIONS HERE, HE WANT INSTEAD THE COUNT OF IT, AND THEN GET AUTHORS AND GENRES
// Find a specific work by ID
/**
 * Retrieve a specific work by ID with author and genre information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findWork = async (req, res) => {
    try {
        const work = await Work.findByPk(req.params.workId, {
            include: [
                {
                    model: Person,
                    as: 'Authors',
                    through: {
                        attributes: []
                    },
                    attributes: ['personId', 'personName']
                },
                {
                    model: Genre,
                    as: 'Genres',
                    through: {
                        attributes: []
                    },
                    attributes: ['genreId', 'genreName']
                },
                {
                    model: BookEdition,
                    attributes: [],
                }
            ],
            attributes: {
                include: [
                    [
                        db.sequelize.fn('COUNT', db.sequelize.col('BookEditions.ISBN')),
                        'editionCount'
                    ]
                ]
            },
            group: ['Work.workId'] //'Authors.personId', 'Genres.genreId'
        });

        if (!work) {
            return res.status(404).json({ success: false, message: `No work found with id ${req.params.workId}` });
        }

        return res.json({
            success: true,
            data: {
                workId: work.workId,
                originalTitle: work.originalTitle,
                firstPublishedDate: work.firstPublishedDate,
                seriesId: work.seriesId,
                seriesOrder: work.seriesOrder,
                authors: work.Authors.map(author => ({
                    personId: author.personId,
                    personName: author.personName
                })),
                genres: work.Genres.map(genre => ({
                    genreId: genre.genreId,
                    genreName: genre.genreName
                })),
                editionCount: work.dataValues.editionCount,
            },
            links: [
                { rel: "self", href: `/works/${work.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${work.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${work.workId}`, method: "PUT" },
                { rel: "add-edition", href: `/works/${work.workId}/editions`, method: "POST" },
                { rel: "add-author", href: `/works/${work.workId}/authors`, method: "POST" },
                { rel: "add-genre", href: `/works/${work.workId}/genres`, method: "POST" },
            ],
        });
    } catch (err) {
        console.error("Error finding work:", err);
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the work" });
    }
};


/**
 * Update a specific work by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updateWorkById = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId } = req.params;
        const { originalTitle, firstPublishedDate, seriesId, seriesOrder } = req.body;

        // Check if the work exists
        const foundWork = await Work.findOne({ where: { workId } });
        if (!foundWork) {
            return res.status(404).json({ success: false, message: `Work with ID ${workId} not found.` });
        }

        // Prepare work updates
        const workUpdates = {};
        let seriesUpdated = false;
        let seriesUpdateMessage = null;

        // Validate series update
        if (seriesId === null && seriesOrder === null) {
            workUpdates.seriesId = null;
            workUpdates.seriesOrder = null;
        }

        if (seriesId !== undefined || seriesOrder !== undefined) {
            if ((seriesId === undefined || seriesId === null) && (seriesOrder !== undefined && seriesOrder !== null)) {
                return res.status(400).json({ success: false, message: 'Cannot set seriesOrder without seriesId.' });
            }

            if (seriesId !== undefined && seriesId !== null) {
                const foundSeries = await db.BookInSeries.findOne({ where: { seriesId } });
                if (!foundSeries) {
                    return res.status(400).json({ success: false, message: 'Series does not exist.', links: [{ rel: "create-series", href: "/book-in-series", method: "POST" }] });
                }

                if (foundWork.seriesId === seriesId && foundWork.seriesOrder === seriesOrder) {
                    seriesUpdateMessage = `This work is already within the series "${foundSeries.seriesName}" and at the order ${seriesOrder}.`;
                } else {
                    const conflictingWork = await Work.findOne({ where: { seriesId, seriesOrder } });
                    if (conflictingWork && conflictingWork.workId !== workId) {
                        return res.status(400).json({ success: false, message: `Another work with seriesOrder ${seriesOrder} already exists in this series.`, links: [{ rel: "conflicting-work", href: `/works/${conflictingWork.workId}`, method: "GET" }] });
                    }

                    // Check for revisions needed
                    const previousSeriesId = foundWork.seriesId;
                    const previousSeriesName = previousSeriesId ? (await db.BookInSeries.findOne({ where: { seriesId: previousSeriesId } })).seriesName : null;
                    workUpdates.seriesId = seriesId;
                    workUpdates.seriesOrder = seriesOrder;

                    const previousSeriesWorks = previousSeriesId ? await Work.findAll({ where: { seriesId: previousSeriesId } }) : [];
                    const worksInSeries = seriesId ? await Work.findAll({
                        where: { seriesId },
                        include: [{
                            model: db.BookInSeries,
                            as: 'BookInSeries',
                            attributes: ['seriesName'],
                            raw: true,
                        }]
                    }) : [];
                    

                  

                    seriesUpdated = true;

                    await Work.update(workUpdates, { where: { workId }, transaction: t });
                    await t.commit();

                    // Filter out the updated work from previousSeriesWorks if seriesId remains the same
                    const newSeriesWorks = worksInSeries.filter(work => work.workId !== Number(workId));

                    return res.status(200).json({
                        success: true,
                        message: `Series updated. Please review the works in the previous and new series.`,
                        previousSeriesWorks: previousSeriesWorks.length > 0 ? {
                            series: {
                                seriesId: previousSeriesId,
                                seriesName: previousSeriesName
                            },
                            works: previousSeriesWorks.map(work => ({
                                workId: work.workId,
                                originalTitle: work.originalTitle,
                                firstPublishedDate: work.firstPublishedDate,
                                averageLiteraryRating: work.averageLiteraryRating,
                                seriesOrder: work.seriesOrder
                            }))
                        } : 'Not on a book series before updating.',
                        worksInSeries: {
                            series: {
                                seriesId,
                                seriesName: foundSeries.seriesName
                            },
                            works: newSeriesWorks.map(work => ({
                                workId: work.workId,
                                originalTitle: work.originalTitle,
                                firstPublishedDate: work.firstPublishedDate,
                                averageLiteraryRating: work.averageLiteraryRating,
                                seriesOrder: work.seriesOrder
                            }))
                        },
                        updatedWork: {
                            workId: foundWork.workId,
                            originalTitle: originalTitle || foundWork.originalTitle,
                            firstPublishedDate: firstPublishedDate || foundWork.firstPublishedDate,
                            averageLiteraryRating: foundWork.averageLiteraryRating,
                            seriesOrder: seriesOrder
                        }
                    });
                }
            }
        }

        if (originalTitle) {
            workUpdates.originalTitle = originalTitle;
        }
        if (firstPublishedDate) {
            workUpdates.firstPublishedDate = firstPublishedDate;
        }

        // Update the work fields
        await Work.update(workUpdates, { where: { workId }, transaction: t });

        // Reflect changes in Book Editions
        if (originalTitle || firstPublishedDate) {
            const updatedFields = {};
            if (originalTitle) updatedFields.title = originalTitle;
            if (firstPublishedDate) updatedFields.publicationDate = firstPublishedDate;

            // Fetch book editions that match originalTitle and firstPublishedDate before the update
            const originalTitleBeforeUpdate = foundWork.previous('originalTitle');
            const firstPublishedDateBeforeUpdate = foundWork.previous('firstPublishedDate');
            const relevantEditions = await BookEdition.findAll({
                where: { workId, title: originalTitleBeforeUpdate, publicationDate: firstPublishedDateBeforeUpdate }
            });

            for (const edition of relevantEditions) {
                await edition.update(updatedFields, { transaction: t });
            }
        }

        await t.commit();

        const response = {
            success: true,
            message: `Work with ID ${workId} was updated successfully.`,
            updatedWork: { ...foundWork.dataValues, ...workUpdates }
        };

        if (seriesUpdateMessage) {
            response.seriesUpdateMessage = seriesUpdateMessage;
        }

        if (seriesUpdated) {
            const worksInSeries = await Work.findAll({
                where: { seriesId },
                include: [{
                    model: db.BookInSeries,
                    as: 'BookInSeries',
                    attributes: ['seriesName']
                }]
            });

            // Filter out the updated work from previousSeriesWorks if seriesId remains the same
            const filteredWorksInSeries = worksInSeries.filter(work => work.workId !== workId);

            response.worksInSeries = {
                series: {
                    seriesId,
                    seriesName: (await db.BookInSeries.findOne({ where: { seriesId } })).seriesName
                },
                works: filteredWorksInSeries.map(work => ({
                    workId: work.workId,
                    originalTitle: work.originalTitle,
                    firstPublishedDate: work.firstPublishedDate,
                    averageLiteraryRating: work.averageLiteraryRating,
                    seriesOrder: work.seriesOrder
                }))
            };
        }

        // Provide HATEOAS link to view all editions for revision if originalTitle or firstPublishedDate were updated
        if (originalTitle || firstPublishedDate) {
            response.message += " Please review the book editions.";
            response.links = [{ rel: "review-editions", href: `/works/${workId}/editions`, method: "GET" }];
        }

        return res.status(200).json(response);
    } catch (err) {
        await t.rollback();
        console.error("Error updating work:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        }
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while updating the work." });
    }
};

/**
 * Remove a specific work by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeWorkById = async (req, res) => {
    try {
        const { workId } = req.params;

        // Check if the work exists
        const foundWork = await Work.findOne({ where: { workId } });
        if (!foundWork) {
            return res.status(404).json({ success: false, message: `Cannot find any work with ID ${workId}.` });
        }

        // Delete the work, which will cascade delete associated book editions
        await Work.destroy({ where: { workId } });

        return res.status(200).json({ success: true, message: `Work with ID ${workId} was successfully deleted.` });
    } catch (err) {
        console.error("Error deleting work:", err);

        // Handle different error types
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        }
        return res.status(500).json({ success: false, message: err.message || 'Some error occurred while deleting the work.' });
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


/**
 * Add a new edition to a specific work by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addEdition = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId } = req.params;
        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }

        const foundWork = await Work.findOne({ where: { workId } });
        if (!foundWork) {
            return res.status(404).json({ success: false, message: "Work not found" });
        }

        const { ISBN, publisherName, title, synopsis, editionType, publicationDate, language, pageNumber, coverImage, contributors = [] } = req.body;

        if (!ISBN || !publisherName || !title || !synopsis || !editionType || !publicationDate || !language || !pageNumber || !coverImage) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Check for existing ISBN
        const existingEdition = await BookEdition.findOne({ where: { ISBN } });
        if (existingEdition) {
            return res.status(400).json({
                success: false,
                message: 'ISBN already in use.',
                links: [{ rel: 'existing-edition', href: `/works/${existingEdition.workId}/editions/${existingEdition.ISBN}`, method: 'GET' }]
            });
        }

        // Check for existing publisher
        const publisher = await Publisher.findOne({ where: { publisherName } });
        if (!publisher) {
            return res.status(400).json({
                success: false,
                message: 'Publisher does not exist.',
                links: [{ rel: 'create-publisher', href: '/publishers', method: 'POST' }]
            });
        }

        // Validate contributors based on the edition type and language
        if (foundWork.language !== language && !contributors.some(c => c.roles.includes('translator'))) {
            return res.status(400).json({
                success: false,
                message: "A translator is required for editions in a different language."
            });
        }

        if (editionType === 'Audiobook' && !contributors.some(c => c.roles.includes('narrator'))) {
            return res.status(400).json({
                success: false,
                message: "A narrator is required for audiobook editions."
            });
        }

        // Create new book edition
        const newBookEdition = await BookEdition.create({
            ISBN, workId, publisherId: publisher.publisherId, title, synopsis, editionType, publicationDate, language, pageNumber, coverImage
        }, { transaction: t });

        // Validate and associate contributors
        for (const contributor of contributors) {
            const { personName, roles } = contributor;
            if (!personName || !roles) {
                return res.status(400).json({
                    success: false,
                    message: "Each contributor must have a personName and roles.",
                    links: [{ rel: 'create-person', href: '/persons', method: 'POST' }]
                });
            }
            const person = await Person.findOne({ where: { personName } });
            if (!person) {
                return res.status(400).json({
                    success: false,
                    message: `Contributor "${personName}" does not exist.`,
                    links: [{ rel: 'create-person', href: '/persons', method: 'POST' }]
                });
            }
            const validRoles = await Role.findAll({ where: { roleName: { [Op.in]: roles } } });
            if (validRoles.length !== roles.length) {
                return res.status(400).json({ success: false, message: `Some roles are invalid.` });
            }
            for (const role of validRoles) {
                await BookContributor.create({ editionISBN: newBookEdition.ISBN, personId: person.personId, roleId: role.roleId }, { transaction: t });
            }
        }

        await t.commit();

        res.status(201).json({
            success: true,
            message: 'New book edition created successfully',
            book: newBookEdition,
        });
    } catch (err) {
        await t.rollback();
        console.error("Error adding edition:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: err.errors ? err.errors.map(e => e.message) : err.message
            });
        }
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while adding the book edition" });
    }
};



/**
 * Add contributors to a book edition.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addContributor = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId, editionISBN } = req.params;
        const { contributors } = req.body;

        // Check if book edition exists
        const edition = await BookEdition.findOne({
            where: { ISBN: editionISBN, workId },
            include: [{ model: db.Work, attributes: ['firstPublishedDate', 'originalTitle'] }]
        });
        if (!edition) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Book edition not found.' });
        }

        // Validate specific roles for edition type and language
        const originalWork = edition.Work;
        const needsTranslator = originalWork.firstPublishedDate !== edition.publicationDate && edition.language !== originalWork.language;
        const needsNarrator = edition.editionType === 'Audiobook';

        const validContributors = [];
        for (const contributor of contributors) {
            const { personName, roleName } = contributor;
            if (!personName || !roleName) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Each contributor must have a personName and roleName.",
                    links: [{ rel: 'create-person', href: '/persons', method: 'POST' }]
                });
            }
            const person = await Person.findOne({
                where: { personName },
                include: [{ model: Role, as: 'Roles', where: { roleName } }]
            });
            if (!person) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Contributor "${personName}" does not exist or does not have the role "${roleName}".`,
                    links: [{ rel: 'create-person', href: '/persons', method: 'POST' }]
                });
            }
            validContributors.push({ person, roleName });
        }

        if (needsTranslator && !validContributors.some(c => c.roleName === 'translator')) {
            return res.status(400).json({
                success: false,
                message: "A translator is required for editions in a different language."
            });
        }

        if (needsNarrator && !validContributors.some(c => c.roleName === 'narrator')) {
            return res.status(400).json({
                success: false,
                message: "A narrator is required for audiobook editions."
            });
        }

        // Associate contributors
        for (const { person, roleName } of validContributors) {
            const role = await Role.findOne({ where: { roleName } });
            await BookContributor.create({
                editionISBN: edition.ISBN,
                personId: person.personId,
                roleId: role.roleId
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, message: 'Contributors added to book edition successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error adding contributors:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while adding contributors to the book edition." });
    }
};


/**
 * Remove a contributor from a book edition.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeContributor = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId, editionISBN } = req.params;
        const { personId } = req.body;

        // Check if book edition exists
        const edition = await BookEdition.findOne({ where: { ISBN: editionISBN, workId } });
        if (!edition) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Book edition not found.' });
        }

        // Check if the contributor exists
        const contributor = await BookContributor.findOne({ where: { editionISBN, personId } });
        if (!contributor) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Contributor not found for this book edition.' });
        }

        // Count current contributors
        const currentContributorsCount = await BookContributor.count({ where: { editionISBN } });

        // If there's only one contributor left, don't allow deletion
        if (currentContributorsCount <= 1) {
            await t.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot remove the only contributor from the book edition. Add another contributor before removing this one.',
                links: [{ rel: 'add-contributor', href: '/works/:workId/editions/:editionISBN/contributors', method: 'POST' }]
            });
        }

        // Remove contributor association
        await BookContributor.destroy({ where: { editionISBN, personId }, transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: 'Contributor removed from book edition successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error removing contributor:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while removing the contributor from the book edition." });
    }
};


/**
 * Get a specific book edition by work ID and book edition ID (ISBN).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
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
                    attributes: ['workId', 'firstPublishedDate', 'seriesId', 'seriesOrder'],
                    include: [
                        {
                            model: db.BookInSeries,
                            as: 'BookInSeries',
                            attributes: ['seriesId', 'seriesName', 'seriesDescription']
                        },
                        {
                            model: db.BookAuthor,
                            include: [
                                {
                                    model: db.Person,
                                    attributes: ['personId', 'personName']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: db.BookContributor,
                    include: [
                        {
                            model: db.Person,
                            attributes: ['personId', 'personName'],
                            include: {
                                model: db.Role,
                                through: { attributes: [] },
                                attributes: ['roleName']
                            }
                        }
                    ]
                }
            ]
        });

        if (!bookEdition) {
            return res.status(404).json({ success: false, message: "Book edition not found" });
        }

        const response = {
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
                Work: {
                    workId: bookEdition.Work.workId,
                    firstPublishedDate: bookEdition.Work.firstPublishedDate,
                    authors: bookEdition.Work.BookAuthors.map(ba => ({
                        personId: ba.Person.personId,
                        personName: ba.Person.personName
                    }))
                },
                contributors: bookEdition.BookContributors.map(bc => ({
                    personId: bc.Person.personId,
                    personName: bc.Person.personName,
                    roles: bc.Person.Roles.map(role => role.roleName)
                }))
            }
        };

        // Include series information if the work is part of a series
        if (bookEdition.Work.seriesId) {
            response.bookEdition.Work.series = {
                seriesId: bookEdition.Work.seriesId,
                seriesName: bookEdition.Work.BookInSeries.seriesName,
                seriesDescription: bookEdition.Work.BookInSeries.seriesDescription,
                seriesOrder: bookEdition.Work.seriesOrder
            };
        }

        return res.status(200).json(response);
    } catch (err) {
        console.error("Error fetching book edition:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Some error occurred while retrieving the book edition"
        });
    }
};


/**
 * Update a specific book edition by work ID and book edition ID (ISBN).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updateBookEdition = async (req, res) => {
    try {
        const { workId, bookEditionId } = req.params;
        const updatedData = req.body;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the book edition exists
        const bookEdition = await BookEdition.findOne({ where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId } });
        if (!bookEdition) {
            return res.status(404).json({ success: false, message: 'Book Edition not found.' });
        }

        // Validate ISBN if it is being updated
        if (updatedData.ISBN && updatedData.ISBN !== bookEdition.ISBN) {
            const existingEdition = await BookEdition.findOne({ where: { ISBN: updatedData.ISBN } });
            if (existingEdition) {
                return res.status(400).json({
                    success: false,
                    message: 'ISBN already in use.',
                    links: [{ rel: 'existing-edition', href: `/works/${existingEdition.workId}/editions/${existingEdition.ISBN}`, method: 'GET' }]
                });
            }
        }

        // Validate workId if it is being updated
        if (updatedData.workId && updatedData.workId !== bookEdition.workId) {
            const newWork = await Work.findByPk(updatedData.workId);
            if (!newWork) {
                return res.status(400).json({
                    success: false,
                    message: 'New work ID does not exist.',
                    links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
                });
            }
        }

        // Validate publisherId if it is being updated
        if (updatedData.publisherId && updatedData.publisherId !== bookEdition.publisherId) {
            const newPublisher = await Publisher.findByPk(updatedData.publisherId);
            if (!newPublisher) {
                return res.status(400).json({
                    success: false,
                    message: 'New publisher ID does not exist.',
                    links: [{ rel: 'create-publisher', href: '/publishers', method: 'POST' }]
                });
            }
        }

        // Ensure no field is updated to null/empty/undefined if the field is present in the request body
        const requiredFields = ['title', 'synopsis', 'editionType', 'language', 'pageNumber', 'coverImage'];
        for (const field of requiredFields) {
            if (updatedData.hasOwnProperty(field) && (updatedData[field] === null || updatedData[field] === undefined || updatedData[field] === '')) {
                return res.status(400).json({ success: false, message: `${field} cannot be null or empty.` });
            }
        }

        // Update the book edition
        await BookEdition.update(updatedData, { where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId } });

        const updatedBookEdition = await BookEdition.findOne({ where: { workId: { [Op.eq]: workId }, ISBN: updatedData.ISBN || bookEditionId } });

        res.status(200).json({
            success: true,
            message: 'Book edition updated successfully.',
            previousISBN: bookEdition.ISBN !== updatedData.ISBN ? bookEdition.ISBN : null,
            updatedBookEdition
        });
    } catch (err) {
        console.error('Error updating book edition:', err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: 'Invalid or incomplete data provided' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Some error occurred while updating the book edition.' });
    }
};

/**
 * Remove a specific book edition by work ID and book edition ID (ISBN).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeBookEdition = async (req, res) => {
    try {
        const { workId, bookEditionId } = req.params;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the book edition exists
        const bookEdition = await BookEdition.findOne({ where: { workId: { [Op.eq]: workId }, ISBN: bookEditionId } });
        if (!bookEdition) {
            return res.status(404).json({ success: false, message: 'Book Edition not found.' });
        }

        // Delete the book edition
        await bookEdition.destroy();
        res.status(204).json({ success: true, message: 'Book Edition deleted successfully.' });
    } catch (err) {
        console.error('Error deleting book edition:', err);
        return res.status(500).json({ success: false, message: err.message || 'Some error occurred while deleting the book edition.' });
    }
};


// Get reviews for a specific work by ID
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
                'totalLikes',
                [db.sequelize.literal('(SELECT COUNT(*) FROM commentReview WHERE commentReview.literaryReviewId = LiteraryReview.literaryReviewId)'), 'commentCount']
            ],
            include: [
                {
                    model: db.User,
                    attributes: [
                        'userId',
                        'username',
                        'profileImage',
                        'totalReviews', 
                        'totalFollowers' 
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
                reviewCount: review.User.totalReviews || 0,
                followersCount: review.User.totalFollowers || 0
            },
            likeCount: review.totalLikes || 0,
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




/**
 * Add a review to a specific work by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addReview = async (req, res) => {
    try {
        const { workId } = req.params;
        const { literaryReview, literaryRating } = req.body;

        // Check if the work exists
        const work = await Work.findByPk(workId, {
            include: [{
                model: db.BookInSeries,
                as: 'BookInSeries',
                attributes: ['seriesId', 'seriesName', 'seriesDescription']
            }]
        });
        if (!work) {
            return res.status(404).json({ success: false, message: `No work found with ID ${workId}` });
        }

        // Validate the required fields
        if (!req.userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }
        if (literaryRating === undefined || literaryRating === null) {
            return res.status(400).json({ success: false, message: 'Literary rating is required' });
        }

        // Create the new review
        const newReview = await db.LiteraryReview.create({
            workId,
            userId: req.userId,
            literaryReview,
            literaryRating,
            creationDate: new Date()
        });

        // Prepare response data
        const response = {
            success: true,
            message: 'Review created successfully',
            data: newReview
        };

        // If the work is part of a series, add the series information
        if (work.BookInSeries) {
            response.series = {
                seriesId: work.BookInSeries.seriesId,
                seriesName: work.BookInSeries.seriesName,
                seriesDescription: work.BookInSeries.seriesDescription,
                seriesOrder: work.seriesOrder
            };
        }

        return res.status(201).json(response);
    } catch (err) {
        console.error("Error adding review:", err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Some error occurred while adding the review'
        });
    }
};


/**
* Update a review for a specific work by ID.
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and message
*/
exports.updateReview = async (req, res) => {
    try {
        const { workId, literaryReviewId } = req.params;
        const { literaryReview, literaryRating } = req.body;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the review exists
        const review = await LiteraryReview.findByPk(literaryReviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: `No review found with ID ${literaryReviewId}` });
        }

        // Check if the review belongs to the user making the request
        if (review.userId !== req.userId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this review.' });
        }

        // Validate that literaryRating is provided and valid
        if (literaryRating === undefined || literaryRating === null) {
            return res.status(400).json({ success: false, message: 'Literary rating is required.' });
        }

        // Prepare the update fields
        const reviewUpdates = {
            literaryReview,
            literaryRating,
            creationDate: new Date() // Update to current date/time
        };

        // Update the review
        const [affectedRows] = await LiteraryReview.update(reviewUpdates, { where: { literaryReviewId } });

        if (affectedRows === 0) {
            return res.status(200).json({ success: true, message: `No updates were made on review with ID ${literaryReviewId}.` });
        }

        return res.json({ success: true, message: `Review with ID ${literaryReviewId} was updated successfully.` });
    } catch (err) {
        console.error("Error updating review:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            return res.status(500).json({ success: false, message: err.message || "Some error occurred while updating the review." });
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

/**
 * Deletes a literary review for a specific work and user.
 *
 * @param {Object} req - The request object containing parameters and user information.
 * @param {string} req.params.workId - The ID of the work.
 * @param {string} req.params.literaryReviewId - The ID of the literary review.
 * @param {string} req.userId - The ID of the user making the request.
 * @param {Object} res - The response object to send back to the client.
 *
 * @returns {Object} - The response object containing success status, message, and any additional data.
 *
 * @throws {Error} - If an error occurs during the deletion process.
 */
exports.deleteReview = async (req, res) => {
    try {
        const { workId, literaryReviewId } = req.params;
        const userId = req.userId;

        // Find the review to ensure it exists and belongs to the user
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId, userId } });

        if (!review) {
            return res.status(404).json({ success: false, msg: `No review found with ID ${literaryReviewId} for the given work and user.` });
        }

        // Delete the review
        await LiteraryReview.destroy({ where: { literaryReviewId } });

        return res.status(200).json({ success: true, msg: `Review with ID ${literaryReviewId} was successfully deleted!` });
    } catch (err) {
        console.error("Error deleting review:", err);
        return res.status(500).json({ success: false, msg: err.message || `Error deleting review with ID ${req.params.literaryReviewId}.` });
    }
};

/**
 * Like a review by review ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.likeReview = async (req, res) => {
    try {
        const { workId, literaryReviewId } = req.params;
        const userId = req.userId;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Find the review to ensure it exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Literary review not found.' });
        }

        // Check if the user has already liked the review
        const existingLike = await LikeReview.findOne({ where: { literaryReviewId, userId } });
        if (existingLike) {
            return res.status(400).json({ success: false, message: 'You have already liked this review.' });
        }

        // Create a new like
        const newLike = await LikeReview.create({ literaryReviewId, userId });
        return res.status(201).json({ success: true, message: 'Literary review liked successfully.', data: newLike });
    } catch (err) {
        console.error("Error liking review:", err);
        return res.status(500).json({ success: false, message: 'Error liking literary review.' });
    }
};

/**
 * Remove like from a review by review ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeLikeReview = async (req, res) => {
    try {
        const { workId, literaryReviewId } = req.params;
        const userId = req.userId;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Find the like to ensure it exists
        const existingLike = await LikeReview.findOne({ where: { literaryReviewId, userId } });
        if (!existingLike) {
            return res.status(404).json({ success: false, message: 'Like not found.' });
        }

        // Delete the like
        await existingLike.destroy();
        return res.status(200).json({ success: true, message: 'Literary review unliked successfully.' });
    } catch (err) {
        console.error("Error unliking review:", err);
        return res.status(500).json({ success: false, message: 'Error unliking literary review.' });
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

/**
 * Add a comment to a specific review by work ID and review ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addCommentToReview = async (req, res) => {
    try {
        const { workId, literaryReviewId } = req.params;
        const userId = req.userId;
        const { comment } = req.body;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the review exists
        const review = await LiteraryReview.findOne({
            where: {
                literaryReviewId,
                workId
            }
        });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Literary review not found.' });
        }

        // Validate comment length
        if (!comment || comment.length > 255) {
            return res.status(400).json({ success: false, message: 'Comment cannot be empty and must be less than 255 characters.' });
        }

        // Create the new comment
        const newComment = await CommentReview.create({
            literaryReviewId,
            userId,
            comment,
            creationDate: new Date()
        });

        return res.status(201).json({
            success: true,
            message: 'Comment created successfully.',
            data: newComment
        });
    } catch (err) {
        console.error("Error adding comment:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        }
        return res.status(500).json({
            success: false,
            message: 'Error adding comment.'
        });
    }
};

/**
 * Edit a comment for a specific review by comment ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.editCommentOfReview = async (req, res) => {
    try {
        const { workId, literaryReviewId, commentId } = req.params;
        const userId = req.userId;
        const { comment } = req.body;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Literary review not found.' });
        }

        // Check if the comment exists and if the user is the owner of the comment
        const existingComment = await CommentReview.findOne({ where: { commentId, literaryReviewId, userId } });
        if (!existingComment) {
            return res.status(404).json({ success: false, message: 'Comment not found or you do not have permission to edit this comment.' });
        }

        // Validate comment length
        if (!comment || comment.length > 255) {
            return res.status(400).json({ success: false, message: 'Comment cannot be empty and must be less than 255 characters.' });
        }

        // Update the comment
        existingComment.comment = comment;
        existingComment.creationDate = new Date(); // Update the creationDate to the current date and time
        await existingComment.save();

        return res.status(200).json({
            success: true,
            message: `Comment with ID ${commentId} was updated successfully.`,
            data: existingComment
        });
    } catch (err) {
        console.error("Error updating comment:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            return res.status(500).json({ success: false, message: err.message || "Some error occurred while updating the comment." });
        }
    }
};

/**
 * Remove a comment from a specific review by comment ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeCommentFromReview = async (req, res) => {
    try {
        const { workId, literaryReviewId, commentId } = req.params;
        const userId = req.userId;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Literary review not found.' });
        }

        // Check if the comment exists and if the user is the owner of the comment
        const existingComment = await CommentReview.findOne({ where: { commentId, literaryReviewId, userId } });
        if (!existingComment) {
            return res.status(404).json({ success: false, message: 'Comment not found or you do not have permission to delete this comment.' });
        }

        // Delete the comment
        await existingComment.destroy();

        return res.status(200).json({ success: true, message: `Comment with ID ${commentId} was successfully deleted.` });
    } catch (err) {
        console.error("Error deleting comment:", err);
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while deleting the comment." });
    }
};

/**
 * Like a comment by comment ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.likeComment = async (req, res) => {
    try {
        const { workId, literaryReviewId, commentId } = req.params;
        const userId = req.userId;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Literary review not found.' });
        }

        // Check if the comment exists
        const comment = await CommentReview.findOne({ where: { commentId, literaryReviewId } });
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        // Check if the user already liked the comment
        const existingLike = await LikeComment.findOne({ where: { commentId, userId } });
        if (existingLike) {
            return res.status(400).json({ success: false, message: 'Comment already liked.' });
        }

        // Create a new like
        const newLike = await LikeComment.create({ commentId, userId, likeDate: new Date() });
        return res.status(201).json({ success: true, message: 'Comment liked successfully.', data: newLike });
    } catch (err) {
        console.error("Error liking comment:", err);
        return res.status(500).json({ success: false, message: 'Error liking comment.' });
    }
};

/**
 * Remove like from a comment by comment ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeLikeComment = async (req, res) => {
    try {
        const { workId, literaryReviewId, commentId } = req.params;
        const userId = req.userId;

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ success: false, message: 'Work not found.' });
        }

        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Literary review not found.' });
        }

        // Check if the comment exists
        const comment = await CommentReview.findOne({ where: { commentId, literaryReviewId } });
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        // Check if the like exists
        const existingLike = await LikeComment.findOne({ where: { commentId, userId } });
        if (!existingLike) {
            return res.status(404).json({ success: false, message: 'Like not found.' });
        }

        // Delete the like
        await existingLike.destroy();
        return res.status(200).json({ success: true, message: 'Comment unliked successfully.' });
    } catch (err) {
        console.error("Error unliking comment:", err);
        return res.status(500).json({ success: false, message: 'Error unliking comment.' });
    }
};
