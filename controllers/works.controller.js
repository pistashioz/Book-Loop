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
    User,
    Publisher,
    BookGenre,
    Language,
    Genre,
    Role,
    PersonRole,
    BookContributor 
} = db;
const { ValidationError, Op, Sequelize, fn, col, literal } = require('sequelize');



/**
* Fetch all works with pagination, average rating, and associated data.
* Allows filtering by genres, authors, dates, languages, and average literary rating.
* Also allows sorting by publication date, average rating, or total reviews.
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with works data and pagination info
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
            orderClause.push([Sequelize.col(sortBy), sortOrder.toUpperCase()]);
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
                'primaryEditionUUID'
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
* Create a new work along with its initial book edition.
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and message
*/
exports.create = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { title, series = {}, seriesOrder = null, authors = [], genres = [], edition } = req.body;
        
        // Ensure the edition and ISBN are provided for non-audiobook editions
        if (!edition || (!edition.ISBN && edition.editionType !== 'Audiobook')) {
            return res.status(400).json({ success: false, message: 'Edition information with ISBN is required for non-audiobook editions.' });
        }
        
        // Check for duplicate work using primaryEditionUUID
        const existingWork = await Work.findOne({
            include: [{
                model: BookEdition,
                as: 'PrimaryEdition',
                where: { ISBN: edition.ISBN }
            }]
        });
        
        if (existingWork) {
            return res.status(400).json({ success: false, message: 'Work already exists with the same ISBN.' });
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
        
        // Collect non-existent authors
        const nonExistentAuthors = [];
        for (const authorName of authors) {
            const existingAuthor = await Person.findOne({
                where: { personName: authorName }
            });
            if (!existingAuthor) {
                nonExistentAuthors.push({ personName: authorName });
            }
        }
        
        if (nonExistentAuthors.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following author(s) do not exist:",
                nonExistentAuthors,
                links: [{ rel: 'create-author', href: '/persons', method: 'POST' }]
            });
        }
        
        // Collect non-existent genres
        const nonExistentGenres = [];
        for (const genreName of genres) {
            const existingGenre = await Genre.findOne({ where: { genreName } });
            if (!existingGenre) {
                nonExistentGenres.push({ genreName });
            }
        }
        
        if (nonExistentGenres.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following genre(s) do not exist:",
                nonExistentGenres,
                links: [{ rel: 'create-genre', href: '/book-genres', method: 'POST' }]
            });
        }
        
        // Check if the provided languageId exists
        const language = await Language.findOne({ where: { languageId: edition.languageId } });
        if (!language) {
            return res.status(400).json({
                success: false,
                message: `Language with ID "${edition.languageId}" does not exist.`,
                links: [{ rel: 'create-language', href: '/languages', method: 'POST' }]
            });
        }
        
        // Find the publisher
        const publisher = await Publisher.findOne({ where: { publisherName: edition.publisherName } });
        if (!publisher) {
            return res.status(400).json({
                success: false,
                message: `The publisher you're trying to use does not exist:`,
                publisherName: edition.publisherName,
                links: [{ rel: 'create-publisher', href: '/publishers', method: 'POST' }]
            });
        }
        
        // Create initial book edition
        const { ISBN, synopsis, editionType, languageId, pageNumber, coverImage, publicationDate } = edition;
        const newEdition = await BookEdition.create({
            ISBN,
            title,
            workId: null, // Temporarily set to null, will update later
            publisherId: publisher.publisherId,
            synopsis,
            editionType,
            publicationDate,
            languageId,
            pageNumber,
            coverImage
        }, { transaction: t });
        
        // Create new work
        const newWork = await Work.create({
            averageLiteraryRating: 0, // default value
            totalReviews: 0, // default value
            seriesId,
            seriesOrder,
            primaryEditionUUID: newEdition.UUID
        }, { transaction: t });
        
        // Update the workId in the BookEdition now that the Work is created
        await newEdition.update({ workId: newWork.workId }, { transaction: t });
        
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
            return res.status(404).json({
                success: false,
                message: 'Work not found.',
                links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
            });
        }
        
        // Collect non-existent authors
        const nonExistentAuthors = [];
        for (const authorName of authors) {
            const existingAuthor = await Person.findOne({
                where: { personName: authorName }
            });
            
            if (!existingAuthor) {
                nonExistentAuthors.push({ personName: authorName });
                continue;
            }
            
            const authorRole = await PersonRole.findOne({
                where: {
                    personId: existingAuthor.personId,
                    roleId: 1 // '1' is the roleId for 'author'
                }
            });
            
            if (!authorRole) {
                nonExistentAuthors.push({ personName: authorName, message: 'does not have the "author" role.' });
                continue;
            }
            
            // Check if the author is already associated with the work
            const existingAssociation = await BookAuthor.findOne({
                where: { workId: work.workId, personId: existingAuthor.personId }
            });
            
            if (existingAssociation) {
                nonExistentAuthors.push({ personName: authorName, message: 'is already associated with this work.' });
                continue;
            }
            
            await BookAuthor.create({ workId: work.workId, personId: existingAuthor.personId }, { transaction: t });
        }
        
        if (nonExistentAuthors.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following author(s) could not be added:",
                nonExistentAuthors,
                links: [{ rel: 'create-author', href: '/persons', method: 'POST' }]
            });
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
        const { workId, authorId } = req.params;
        
        // Check if work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Work not found.',
                links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
            });
        }
        
        // Check if the author association exists
        const authorAssociation = await BookAuthor.findOne({ where: { workId, personId: authorId } });
        if (!authorAssociation) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Author association not found for this work.',
                links: [{ rel: 'add-author', href: `/works/${workId}/authors`, method: 'POST' }]
            });
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
            return res.status(404).json({
                success: false,
                message: 'Work not found.',
                links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
            });
        }
        
        let nonexistentGenres = [];
        let alreadyAssociatedGenres = [];
        
        // Validate and associate genres
        for (const genreName of genres) {
            const existingGenre = await Genre.findOne({ where: { genreName } });
            if (!existingGenre) {
                nonexistentGenres.push({ genreName });
                continue;
            }
            
            // Check if the genre is already associated with the work
            const existingAssociation = await BookGenre.findOne({ where: { workId, genreId: existingGenre.genreId } });
            if (existingAssociation) {
                alreadyAssociatedGenres.push({ genreName });
                continue;
            }
            
            await BookGenre.create({ workId: work.workId, genreId: existingGenre.genreId }, { transaction: t });
        }
        
        if (nonexistentGenres.length > 0 || alreadyAssociatedGenres.length > 0) {
            let errorMessages = [];
            
            if (nonexistentGenres.length > 0) {
                errorMessages.push(`The following genre(s) do not exist:`);
            }
            
            if (alreadyAssociatedGenres.length > 0) {
                errorMessages.push(`The following genre(s) are already associated with this work:`);
            }
            
            return res.status(400).json({
                success: false,
                message: errorMessages.join(' '),
                nonexistentGenres,
                alreadyAssociatedGenres,
                links: [{ rel: 'create-genre', href: '/genres', method: 'POST' }]
            });
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
        const { workId, genreId } = req.params;
        
        // Check if work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Work not found.',
                links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
            });
        }
        
        // Check if the genre association exists
        const genreAssociation = await BookGenre.findOne({ where: { workId, genreId } });
        if (!genreAssociation) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Genre association not found for this work.',
                links: [{ rel: 'add-genre', href: `/works/${workId}/genres`, method: 'POST' }]
            });
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

/**
* Retrieve a specific work by ID with all associated information.
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and data
*/
exports.findWork = async (req, res) => {
    try {
        const { workId } = req.params;
        const { page = 1, limit = 5 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        
        // Fetch the work with primary edition, authors, genres, series info, and average rating
        const work = await Work.findByPk(workId, {
            include: [
                {
                    model: BookEdition,
                    as: 'PrimaryEdition',
                    attributes: ['title', 'publicationDate', 'synopsis', 'coverImage'],
                    include: [
                        {
                            model: Language,
                            as: 'Language',
                            attributes: ['languageName']
                        }
                    ]
                },
                {
                    model: BookAuthor,
                    as: 'BookAuthors',
                    include: {
                        model: Person,
                        as: 'Person',
                        attributes: ['personId', 'personName']
                    }
                },
                {
                    model: BookGenre,
                    as: 'BookGenres',
                    include: {
                        model: Genre,
                        as: 'Genre',
                        attributes: ['genreId', 'genreName']
                    }
                },
                {
                    model: BookInSeries,
                    as: 'BookInSeries',
                    attributes: ['seriesName'],
                    required: false // Left join
                }
            ]
        });
        
        if (!work) {
            return res.status(404).json({
                success: false,
                message: `No work found with id ${workId}`,
                links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
            });
        }
        
        // Fetch the count of editions
        const editionCount = await BookEdition.count({ where: { workId } });
        
        // Fetch other editions with pagination
        const otherEditions = await BookEdition.findAll({
            where: { workId, UUID: { [Op.ne]: work.primaryEditionUUID } },
            attributes: ['title', 'coverImage', 'pageNumber'],
            include: [
                {
                    model: Language,
                    as: 'Language',
                    attributes: ['languageName']
                }
            ],
            order: [['publicationDate', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            raw: false,
        });
        
        // Prepare the response data
        const responseData = {
            workId: work.workId,
            averageLiteraryRating: work.averageLiteraryRating || 0,
            totalReviews: work.totalReviews || 0,
            seriesId: work.seriesId,
            seriesOrder: work.seriesOrder,
            seriesName: work.BookInSeries ? work.BookInSeries.seriesName : 'Not part of a series',
            primaryEdition: work.PrimaryEdition ? {
                title: work.PrimaryEdition.title,
                publicationDate: work.PrimaryEdition.publicationDate,
                synopsis: work.PrimaryEdition.synopsis,
                coverImage: work.PrimaryEdition.coverImage,
                language: work.PrimaryEdition.Language.languageName
            } : null,
            authors: work.BookAuthors.map(author => ({
                personId: author.Person.personId,
                personName: author.Person.personName
            })),
            genres: work.BookGenres.map(genre => ({
                genreId: genre.Genre.genreId,
                genreName: genre.Genre.genreName
            })),
            editionCount,
            otherEditions: otherEditions.map(edition => ({
                title: edition.title,
                coverImage: edition.coverImage,
                pageNumber: edition.pageNumber,
                language: edition.Language.languageName
            }))
        };
        
        return res.json({
            success: true,
            data: responseData,
            links: [
                { rel: "self", href: `/works/${work.workId}`, method: "GET" },
                { rel: "delete", href: `/works/${work.workId}`, method: "DELETE" },
                { rel: "modify", href: `/works/${work.workId}`, method: "PUT" },
                { rel: "add-edition", href: `/works/${work.workId}/editions`, method: "POST" },
                { rel: "add-author", href: `/works/${work.workId}/authors`, method: "POST" },
                { rel: "add-genre", href: `/works/${work.workId}/genres`, method: "POST" },
            ],
            pagination: {
                totalEditions: editionCount,
                totalPages: Math.ceil(editionCount / parseInt(limit, 10)),
                currentPage: parseInt(page, 10)
            }
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
        const { seriesId, seriesOrder } = req.body;
        
        // Check if the work exists
        const foundWork = await Work.findOne({
            where: { workId },
            include: [
                {
                    model: BookEdition,
                    as: 'PrimaryEdition',
                    attributes: ['title', 'publicationDate'],
                }
            ]
        });
        if (!foundWork) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: `Work with ID ${workId} not found.`,
                links: [{ rel: "create-work", href: "/works", method: "POST" }]
            });
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
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Cannot set seriesOrder without seriesId.' });
            }
            
            if (seriesId !== undefined && seriesId !== null) {
                const foundSeries = await BookInSeries.findOne({ where: { seriesId } });
                if (!foundSeries) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Series does not exist.',
                        links: [{ rel: "create-series", href: "/book-in-series", method: "POST" }]
                    });
                }
                
                if (foundWork.seriesId === seriesId && foundWork.seriesOrder === seriesOrder) {
                    seriesUpdateMessage = `This work is already within the series "${foundSeries.seriesName}" and at the order ${seriesOrder}.`;
                } else {
                    const conflictingWork = await Work.findOne({ where: { seriesId, seriesOrder } });
                    if (conflictingWork && conflictingWork.workId !== workId) {
                        await t.rollback();
                        return res.status(400).json({
                            success: false,
                            message: `Another work with seriesOrder ${seriesOrder} already exists in this series.`,
                            links: [{ rel: "conflicting-work", href: `/works/${conflictingWork.workId}`, method: "GET" }]
                        });
                    }
                    
                    // Check for revisions needed
                    const previousSeriesId = foundWork.seriesId;
                    const previousSeriesName = previousSeriesId ? (await BookInSeries.findOne({ where: { seriesId: previousSeriesId } })).seriesName : null;
                    workUpdates.seriesId = seriesId;
                    workUpdates.seriesOrder = seriesOrder;
                    
                    const previousSeriesWorks = previousSeriesId ? await Work.findAll({
                        where: { seriesId: previousSeriesId },
                        include: [{
                            model: BookEdition,
                            as: 'PrimaryEdition',
                            attributes: ['title', 'publicationDate']
                        }]
                    }) : [];
                    
                    const worksInSeries = seriesId ? await Work.findAll({
                        where: { seriesId },
                        include: [{
                            model: BookEdition,
                            as: 'PrimaryEdition',
                            attributes: ['title', 'publicationDate']
                        }, {
                            model: BookInSeries,
                            as: 'BookInSeries',
                            attributes: ['seriesName']
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
                                title: work.PrimaryEdition.title,
                                publicationDate: work.PrimaryEdition.publicationDate,
                                averageLiteraryRating: work.averageLiteraryRating,
                                seriesOrder: work.seriesOrder
                            }))
                        } : 'Not part of a series before updating.',
                        worksInSeries: {
                            series: {
                                seriesId,
                                seriesName: foundSeries.seriesName
                            },
                            works: newSeriesWorks.map(work => ({
                                workId: work.workId,
                                title: work.PrimaryEdition.title,
                                publicationDate: work.PrimaryEdition.publicationDate,
                                averageLiteraryRating: work.averageLiteraryRating,
                                seriesOrder: work.seriesOrder
                            }))
                        },
                        updatedWork: {
                            workId: foundWork.workId,
                            title: foundWork.PrimaryEdition.title,
                            publicationDate: foundWork.PrimaryEdition.publicationDate,
                            averageLiteraryRating: foundWork.averageLiteraryRating,
                            seriesOrder: seriesOrder
                        }
                    });
                }
            }
        }
        
        // Update the work fields
        await Work.update(workUpdates, { where: { workId }, transaction: t });
        
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
                    model: BookEdition,
                    as: 'PrimaryEdition',
                    attributes: ['title', 'publicationDate']
                }, {
                    model: BookInSeries,
                    as: 'BookInSeries',
                    attributes: ['seriesName']
                }]
            });
            
            // Filter out the updated work from previousSeriesWorks if seriesId remains the same
            const filteredWorksInSeries = worksInSeries.filter(work => work.workId !== workId);
            
            response.worksInSeries = {
                series: {
                    seriesId,
                    seriesName: (await BookInSeries.findOne({ where: { seriesId } })).seriesName
                },
                works: filteredWorksInSeries.map(work => ({
                    workId: work.workId,
                    title: work.PrimaryEdition.title,
                    publicationDate: work.PrimaryEdition.publicationDate,
                    averageLiteraryRating: work.averageLiteraryRating,
                    seriesOrder: work.seriesOrder
                }))
            };
        }
        
        return res.status(200).json(response);
    } catch (err) {
        if (t.finished !== 'commit') {
            await t.rollback();
        }
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
            return res.status(404).json({
                success: false,
                message: `Cannot find any work with ID ${workId}.`,
                links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
            });
        }
        
        // Delete the work, which will cascade delete associated book editions
        await Work.destroy({ where: { workId } });
        
        return res.status(200).json({
            success: true,
            message: `Work with ID ${workId} was successfully deleted.`,
            links: [{ rel: 'list-works', href: '/works', method: 'GET' }]
        });
    } catch (err) {
        console.error("Error deleting work:", err);
        
        // Handle different error types
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        }
        return res.status(500).json({ success: false, message: err.message || 'Some error occurred while deleting the work.' });
    }
};

/**
* Retrieve all editions with optional filtering, pagination, and additional information.
*
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and data
*/
exports.getEditions = async (req, res) => {
    try {
        const { 
            title, 
            editionType, 
            publisherName, 
            publicationDate, 
            pageNumber, 
            language, 
            authors, 
            sortBy = 'publicationDate', 
            sortOrder = 'DESC',
            page = 1, 
            limit = 5 
        } = req.query;
        
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        
        // Build the filtering conditions
        const whereClause = {};
        if (title) {
            whereClause.title = { [Op.like]: `%${title}%` };
        }
        if (editionType) {
            whereClause.editionType = editionType;
        }
        if (publicationDate) {
            whereClause.publicationDate = publicationDate;
        }
        if (pageNumber) {
            whereClause.pageNumber = pageNumber;
        }
        
        let workIds = [];
        // Filter by authors
        if (authors) {
            const authorWorkIds = await BookAuthor.findAll({
                attributes: ['workId'],
                include: [{
                    model: Person,
                    as: 'Person',
                    where: { personName: { [Op.like]: `%${authors}%` } }
                }]
            });
            workIds = authorWorkIds.map(author => author.workId);
            whereClause.workId = { [Op.in]: workIds };
            /*             if (authorWorkIds.length > 0) {
                workIds = authorWorkIds.map(author => author.workId);
                whereClause.workId = { [Op.in]: workIds };
            } */
        }
        
        // Build order clause
        const orderClause = [[sortBy, sortOrder.toUpperCase()]];
        
        // Fetch book editions with pagination and filtering
        const { count: groupCounts, rows: foundEditions } = await BookEdition.findAndCountAll({
            where: whereClause,
            attributes: [
                'ISBN', 'title', 'publisherId', 'publicationDate', 'coverImage', 'editionType', 'pageNumber', 'languageId', 'UUID',
                [Sequelize.literal(`(SELECT COUNT(*) FROM bookEdition WHERE workId = BookEdition.workId)`), 'editionCount']
            ],
            include: [
                {
                    model: Publisher,
                    attributes: ['publisherId', 'publisherName'],
                    where: publisherName ? { publisherName: { [Op.like]: `%${publisherName}%` } } : {}
                },
                {
                    model: Language,
                    attributes: ['languageId', 'languageName'],
                    where: language ? { languageName: language } : {}
                },
                {
                    model: BookContributor,
                    attributes: ['roleId', 'editionUUID', 'personId'],
                    include: [
                        {
                            model: Person,
                            attributes: ['personId', 'personName'],
                        },
                        {
                            model: Role,
                            attributes: ['roleId', 'roleName']
                        }
                    ]
                },
                {
                    model: Work,
                    attributes: ['workId', 'averageLiteraryRating', 'totalReviews'],
                    include: [{
                        model: BookAuthor,
                        as: 'BookAuthors',
                        attributes: ['workId', 'personId'],
                        include: [{
                            model: Person,
                            as: 'Person',
                            attributes: ['personId', 'personName']
                        }]
                    }]
                }
            ],
            limit: parseInt(limit, 10),
            offset: offset,
            group: ['UUID'],
            order: orderClause
        });
        
        const totalEditions = groupCounts.length;
        
        if (foundEditions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No book editions found.",
                links: [{ rel: 'create-edition', href: '/editions', method: 'POST' }]
            });
        }
        
        // Map editions to the desired response format
        const editions = foundEditions.map(edition => ({
            ISBN: edition.ISBN,
            title: edition.title,
            editionType: edition.editionType,
            publisherId: edition.publisherId,
            publisherName: edition.Publisher ? edition.Publisher.publisherName : null,
            publicationDate: edition.publicationDate,
            coverImage: edition.coverImage,
            pageNumber: edition.pageNumber,
            language: edition.Language ? edition.Language.languageName : null,
            authors: edition.Work.BookAuthors.map(bookAuthor => ({
                personId: bookAuthor.Person.personId,
                personName: bookAuthor.Person.personName
            })),
            contributors: edition.bookContributors.map(contributor => ({
                personId: contributor.personId,
                personName: contributor.person.personName,
                role: contributor.Role.roleName,
            })),
            averageLiteraryRating: edition.Work.averageLiteraryRating || 0,
            totalReviews: edition.Work.totalReviews || 0,
            editionCount: edition.getDataValue('editionCount') || 0
        }));
        
        const totalPages = Math.ceil(totalEditions / parseInt(limit, 10));
        
        return res.status(200).json({
            success: true,
            message: `Found ${totalEditions} book editions.`,
            totalEditions,
            totalPages,
            currentPage: parseInt(page, 10),
            editions,
            links: [
                { rel: 'self', href: '/editions', method: 'GET' },
                { rel: 'create-edition', href: '/editions', method: 'POST' }
            ]
        });
    } catch (err) {
        console.error("Error fetching editions:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Some error occurred while retrieving book editions."
        });
    }
};


exports.addEdition = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId } = req.params;
        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }
        
        const foundWork = await Work.findByPk(workId);
        if (!foundWork) {
            return res.status(404).json({
                success: false,
                message: "Work not found",
                links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
            });
        }
        
        const primaryEdition = await BookEdition.findOne({ where: { workId, UUID: foundWork.primaryEditionUUID } });
        
        const { ISBN, publisherName, title, synopsis, editionType, publicationDate, languageId, pageNumber, coverImage, contributors = [] } = req.body;
        
        if (!title || !publisherName || !synopsis || !editionType || !publicationDate || !languageId || !pageNumber || !coverImage) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        
        
        /*                 // Require ISBN for non-audiobook editions
        if (editionType !== 'Audiobook' && !ISBN) {
            return res.status(400).json({ success: false, message: "ISBN is required for non-audiobook editions" });
        } */
        
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
        if (primaryEdition.languageId !== languageId && !contributors.some(c => c.roles.includes('translator'))) {
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
            ISBN,
            workId,
            publisherId: publisher.publisherId,
            title,
            synopsis,
            editionType,
            publicationDate,
            languageId,
            pageNumber,
            coverImage
        }, { transaction: t });
        
        // Collect non-existent contributors
        const nonExistentContributors = [];
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
                nonExistentContributors.push({ personName });
                continue;
            }
            const validRoles = await Role.findAll({ where: { roleName: { [Op.in]: roles } } });
            if (validRoles.length !== roles.length) {
                return res.status(400).json({ success: false, message: `Some roles are invalid.` });
            }
            for (const role of validRoles) {
                await BookContributor.create({ editionUUID: newBookEdition.UUID, personId: person.personId, roleId: role.roleId }, { transaction: t });
            }
        }
        
        if (nonExistentContributors.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following contributor(s) do not exist:",
                nonExistentContributors,
                links: [{ rel: 'create-person', href: '/persons', method: 'POST' }]
            });
        }
        
        await t.commit();
        
        res.status(201).json({
            success: true,
            message: 'New book edition created successfully',
            book: newBookEdition,
            links: [
                { rel: 'get-edition', href: `/works/${newBookEdition.workId}/editions/${newBookEdition.UUID}`, method: 'GET' },
                { rel: 'edit-edition', href: `/works/${newBookEdition.workId}/editions/${newBookEdition.UUID}`, method: 'PATCH' },
                { rel: 'remove-edition', href: `/works/${newBookEdition.workId}/editions/${newBookEdition.UUID}`, method: 'DELETE' },
                { rel: 'post-editions', href: `/works/${newBookEdition.workId}/editions`, method: 'POST' }
            ]
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
        const { workId, editionUUID } = req.params;
        const { contributors } = req.body;
        
        console.log(`workId: ${workId}, editionUUID: ${editionUUID}`);
        
        // Check if book edition exists
        const edition = await BookEdition.findOne({ where: { UUID: editionUUID, workId } });
        if (!edition) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Book edition not found.',
                links: [{ rel: 'create-edition', href: `/works/${workId}/editions`, method: 'POST' }]
            });
        }
        
        // Fetch work to check primary edition
        const work = await Work.findOne({
            where: { workId },
            include: [{
                model: BookEdition,
                as: 'PrimaryEdition'
            }]
        });
        
        if (!work || !work.PrimaryEdition) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Primary edition not found for the work.',
            });
        }
        
        const primaryEdition = work.PrimaryEdition;
        
        // Check if the edition is the primary edition
        if (primaryEdition.UUID === edition.UUID) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot add contributors to the primary edition of a work.',
            });
        }
        
        // Validate specific roles for edition type and language
        const needsTranslator = primaryEdition.languageId !== edition.languageId;
        const needsNarrator = edition.editionType === 'Audiobook';
        
        const validContributors = [];
        const nonExistentPersons = [];
        const personsWithoutRole = [];
        const nonExistentRoles = [];
        const invalidRoles = [];
        
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
            
            if (roleName.toLowerCase() === 'author') {
                invalidRoles.push(roleName);
                continue;
            }
            
            const person = await Person.findOne({ where: { personName } });
            if (!person) {
                nonExistentPersons.push(personName);
                continue;
            }
            const role = await Role.findOne({ where: { roleName } });
            if (!role) {
                nonExistentRoles.push(roleName);
                continue;
            }
            const personRole = await PersonRole.findOne({ where: { personId: person.personId, roleId: role.roleId } });
            if (!personRole) {
                personsWithoutRole.push({ personName, roleName });
                continue;
            }
            validContributors.push({ person, role });
        }
        
        if (nonExistentPersons.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following person(s) do not exist:",
                nonExistentPersons,
                links: [{ rel: 'create-person', href: '/persons', method: 'POST' }]
            });
        }
        
        if (nonExistentRoles.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following role(s) do not exist:",
                nonExistentRoles,
                links: [{ rel: 'create-role', href: '/roles', method: 'POST' }]
            });
        }
        
        if (personsWithoutRole.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following person(s) do not have the specified role(s):",
                personsWithoutRole,
                links: [{ rel: 'assign-role', href: '/person-roles', method: 'POST' }]
            });
        }
        
        if (invalidRoles.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "The following role(s) are invalid for contributors:",
                invalidRoles
            });
        }
        
        if (needsTranslator && !validContributors.some(c => c.role.roleName === 'translator')) {
            return res.status(400).json({
                success: false,
                message: "A translator is required for editions in a different language.",
            });
        }
        
        if (needsNarrator && !validContributors.some(c => c.role.roleName === 'narrator')) {
            return res.status(400).json({
                success: false,
                message: "A narrator is required for audiobook editions.",
            });
        }
        
        // Associate contributors
        for (const { person, role } of validContributors) {
            await BookContributor.create({
                editionUUID: edition.UUID,
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
        const { workId, editionUUID } = req.params;
        const { personId, roleName } = req.body;
        
        if (roleName.toLowerCase() === 'author') {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove author through this endpoint. Use the appropriate endpoint for authors.',
                links: [{ rel: 'remove-author', href: `/works/${workId}/authors/${personId}`, method: 'DELETE' }]
            });
        }
        
        // Check if book edition exists
        const edition = await BookEdition.findOne({ where: { UUID: editionUUID, workId } });
        if (!edition) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Book edition not found.',
                links: [{ rel: 'create-edition', href: `/works/${workId}/editions`, method: 'POST' }]
            });
        }
        
        // Check if the contributor exists
        const role = await db.Role.findOne({ where: { roleName } });
        if (!role) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: `Role "${roleName}" does not exist.`,
                links: [{ rel: 'create-role', href: '/roles', method: 'POST' }]
            });
        }
        
        const contributor = await BookContributor.findOne({ where: { editionUUID: edition.UUID, personId, roleId: role.roleId } });
        if (!contributor) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Contributor with specified role not found for this book edition.',
                links: [{ rel: 'add-contributor', href: `/works/${workId}/editions/${editionUUID}/contributors`, method: 'POST' }]
            });
        }
        
        // Count current contributors
        const currentContributorsCount = await BookContributor.count({ where: { editionUUID: edition.UUID } });
        
        // If there's only one contributor left, don't allow deletion
        if (currentContributorsCount <= 1) {
            await t.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot remove the only contributor from the book edition. Add another contributor before removing this one.',
                links: [{ rel: 'add-contributor', href: `/works/${workId}/editions/${editionUUID}/contributors`, method: 'POST' }]
            });
        }
        
        // Remove contributor association
        await BookContributor.destroy({ where: { editionUUID: edition.UUID, personId, roleId: role.roleId }, transaction: t });
        
        await t.commit();
        res.status(200).json({ success: true, message: 'Contributor removed from book edition successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error removing contributor:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while removing the contributor from the book edition." });
    }
};


/**
* Get a specific book edition by work ID and book edition ID (UUID).
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and message
*/
exports.getBookEdition = async (req, res) => {
    try {
        const { workId, editionUUID } = req.params;
        const { page = 1, limit = 5 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        
        if (!workId || !editionUUID) {
            return res.status(400).json({ 
                success: false, 
                message: "workId and editionUUID are required in the query parameters" 
            });
        }
        
        const bookEdition = await BookEdition.findOne({
            where: { workId, UUID: editionUUID },
            include: [
                {
                    model: Publisher,
                    attributes: ['publisherId', 'publisherName']
                },
                {
                    model: Work,
                    attributes: ['workId', 'seriesId', 'seriesOrder', 'primaryEditionUUID', 'averageLiteraryRating', 'totalReviews'],
                    include: [
                        {
                            model: BookInSeries,
                            as: 'BookInSeries',
                            attributes: ['seriesId', 'seriesName', 'seriesDescription']
                        },
                        {
                            model: BookAuthor,
                            as: 'BookAuthors',
                            include: [
                                {
                                    model: Person,
                                    as: 'Person',
                                    attributes: ['personId', 'personName']
                                }
                            ]
                        },
                        {
                            model: BookEdition,
                            as: 'PrimaryEdition',
                            attributes: ['publicationDate', 'pageNumber', 'editionType'],
                            where: { UUID: Sequelize.col('Work.primaryEditionUUID') }
                        },
                        {
                            model: BookGenre,
                            as: 'BookGenres',
                            attributes: ['genreId'],
                            include: [{
                                model: Genre,
                                as: 'Genre',
                                attributes: ['genreName']
                            }]
                        }
                    ]
                },
                {
                    model: BookContributor,
                    include: [
                        {
                            model: Person,
                            attributes: ['personId', 'personName'],
                        },
                        {
                            model: Role,
                            attributes: ['roleName'],
                        }
                    ]
                },
                {
                    model: Language,
                    attributes: ['languageName']
                }
            ]
        });
        
        if (!bookEdition) {
            return res.status(404).json({ 
                success: false, 
                message: "Book edition not found" 
            });
        }
        
        const editionCount = await BookEdition.count({ where: { workId } });
        
        // Fetch other editions with pagination
        const otherEditions = await BookEdition.findAll({
            where: { workId, UUID: { [Op.ne]: editionUUID } },
            attributes: ['UUID', 'title', 'coverImage', 'pageNumber', 'publicationDate'],
            include: [
                {
                    model: Language,
                    attributes: ['languageName']
                },
                {
                    model: Publisher,
                    attributes: ['publisherId', 'publisherName']
                }
            ],
            order: [['publicationDate', 'DESC']], // Sorted by publication date in descending order
            limit: parseInt(limit, 10),
            offset: offset,
            raw: false,
        });
        
        // Fetch literary reviews and calculate rating distribution
        const ratingData = await LiteraryReview.findAll({
            where: { workId },
            attributes: [
                [literal('ROUND(literaryRating)'), 'rating'],
                [fn('COUNT', col('literaryRating')), 'count']
            ],
            group: ['rating'],
            raw: true
        });
        
        const totalRatings = ratingData.reduce((sum, item) => sum + parseInt(item.count, 10), 0);
        const ratingDistribution = ratingData.map(item => ({
            stars: parseInt(item.rating, 10),
            count: parseInt(item.count, 10),
            percentage: ((item.count / totalRatings) * 100).toFixed(2) + '%'
        }));
        
        const response = {
            success: true,
            bookEdition: {
                UUID: bookEdition.UUID,
                ISBN: bookEdition.ISBN,
                title: bookEdition.title,
                publicationDate: bookEdition.publicationDate,
                synopsis: bookEdition.synopsis,
                editionType: bookEdition.editionType,
                language: bookEdition.Language.languageName,
                pageNumber: bookEdition.pageNumber,
                coverImage: bookEdition.coverImage,
                publisherId: bookEdition.Publisher.publisherId,
                publisherName: bookEdition.Publisher.publisherName,
                averageLiteraryRating: bookEdition.Work.averageLiteraryRating,
                totalReviews: bookEdition.Work.totalReviews,
                ratingDistribution,
                Work: {
                    workId: bookEdition.Work.workId,
                    firstPublishedDate: bookEdition.Work.PrimaryEdition.publicationDate,
                    authors: bookEdition.Work.BookAuthors.map(ba => ({
                        personId: ba.Person.personId,
                        personName: ba.Person.personName
                    })),
                    pageNumber: bookEdition.Work.PrimaryEdition.pageNumber,
                    editionType: bookEdition.Work.PrimaryEdition.editionType,
                    Series: bookEdition.Work.BookInSeries ? {
                        seriesId: bookEdition.Work.BookInSeries.seriesId,
                        seriesName: bookEdition.Work.BookInSeries.seriesName,
                        seriesDescription: bookEdition.Work.BookInSeries.seriesDescription,
                        seriesOrder: bookEdition.Work.seriesOrder
                    } : null,
                    Genres: bookEdition.Work.BookGenres.map(bg => ({
                        genreId: bg.genreId,
                        genreName: bg.Genre.genreName
                    }))
                },
                contributors: bookEdition.bookContributors.map(bc => ({
                    personId: bc.person.personId,
                    personName: bc.person.personName,
                    roles: bc.Role.roleName
                }))
            },
            otherEditions: otherEditions.map(edition => ({
                UUID: edition.UUID,
                title: edition.title,
                coverImage: edition.coverImage,
                pageNumber: edition.pageNumber,
                language: edition.Language.languageName,
                publicationDate: edition.publicationDate,
                publisherName: edition.Publisher.publisherName
            })),
            pagination: {
                totalEditions: editionCount,
                totalPages: Math.ceil(editionCount / parseInt(limit, 10)),
                currentPage: parseInt(page, 10)
            }
        };
        
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
* Update a specific book edition by work ID and book edition ID (UUID).
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and message
*/
exports.updateBookEdition = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId, editionUUID } = req.params;
        const updatedData = req.body;
        
        // Create a mapping of field names to human-readable names
        const fieldNames = {
            title: 'Title',
            synopsis: 'Synopsis',
            editionType: 'Edition type',
            pageNumber: 'Page number',
            coverImage: 'Cover image',
            publisherName: 'Publisher name',
            languageId: 'Language'
        };
        
        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Work not found.',
                nonExistentInstance: { workId }
            });
        }
        
        // Check if the book edition exists
        const bookEdition = await BookEdition.findOne({ where: { workId, UUID: editionUUID } });
        if (!bookEdition) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Book Edition not found.',
                nonExistentInstance: { editionUUID }
            });
        }
        
        // Validate ISBN if it is being updated
        if (updatedData.ISBN && updatedData.ISBN !== bookEdition.ISBN) {
            const existingEdition = await BookEdition.findOne({ where: { ISBN: updatedData.ISBN } });
            if (existingEdition) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'ISBN already in use.',
                    links: [{ rel: 'existing-edition', href: `/works/${existingEdition.workId}/editions/${existingEdition.UUID}`, method: 'GET' }]
                });
            }
        }
        
        // Validate workId if it is being updated
        if (updatedData.workId && updatedData.workId !== bookEdition.workId) {
            const newWork = await Work.findByPk(updatedData.workId);
            if (!newWork) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'New work ID does not exist.',
                    nonExistentInstance: { workId: updatedData.workId },
                    links: [{ rel: 'create-work', href: '/works', method: 'POST' }]
                });
            }
        }
        
        // Validate publisherName if it is being updated
        if (updatedData.publisherName) {
            const newPublisher = await Publisher.findOne({ where: { publisherName: updatedData.publisherName } });
            if (!newPublisher) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Publisher does not exist.',
                    nonExistentInstance: { publisherName: updatedData.publisherName },
                    links: [{ rel: 'create-publisher', href: '/publishers', method: 'POST' }]
                });
            }
            updatedData.publisherId = newPublisher.publisherId;
        }
        
        // Validate languageId if it is being updated
        if (updatedData.languageId) {
            const newLanguage = await Language.findByPk(updatedData.languageId);
            if (!newLanguage) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Language does not exist.',
                    nonExistentInstance: { languageId: updatedData.languageId },
                    links: [{ rel: 'create-language', href: '/languages', method: 'POST' }]
                });
            }
        }
        
        // Ensure no field is updated to null/empty/undefined if the field is present in the request body
        const requiredFields = ['title', 'synopsis', 'editionType', 'pageNumber', 'coverImage'];
        for (const field of requiredFields) {
            if (updatedData.hasOwnProperty(field) && (updatedData[field] === null || updatedData[field] === undefined || updatedData[field] === '')) {
                const readableField = fieldNames[field] || field;
                return res.status(400).json({ success: false, message: `${readableField} cannot be null or empty.` });
            }
        }
        
        // Ensure ISBN is not set to null unless it's an Audiobook
        const newEditionType = updatedData.editionType || bookEdition.editionType;
        if (updatedData.hasOwnProperty('ISBN') && updatedData.ISBN === null && newEditionType !== 'Audiobook') {
            return res.status(400).json({ 
                success: false, 
                message: `ISBN cannot be null for ${newEditionType} editions.`
            });
        }
        
        // Update the book edition
        await BookEdition.update(updatedData, { where: { workId, UUID: editionUUID }, transaction: t });
        
        await t.commit();
        
        const updatedBookEdition = await BookEdition.findOne({ where: { workId, UUID: editionUUID } });
        
   
        res.status(200).json({
            success: true,
            message: 'Book edition updated successfully.',
            previousData: bookEdition,
            updatedBookEdition
        });
    } catch (err) {
        await t.rollback();
        console.error('Error updating book edition:', err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: 'Invalid or incomplete data provided' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Some error occurred while updating the book edition.' });
    }
};


/**
* Remove a specific book edition by work ID and book edition ID (UUID).
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and message
*/
exports.removeBookEdition = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { workId, editionUUID } = req.params;
        
        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Work not found.',
                nonExistentInstance: { workId }
            });
        }
        
        // Check if the book edition exists
        const bookEdition = await BookEdition.findOne({ where: { workId, UUID: editionUUID } });
        if (!bookEdition) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Book Edition not found.',
                nonExistentInstance: { editionUUID }
            });
        }
        
        // Delete the book edition
        await bookEdition.destroy({ transaction: t });
        await t.commit();
        
        res.status(204).json({ success: true, message: 'Book Edition deleted successfully.' });
    } catch (err) {
        await t.rollback();
        console.error('Error deleting book edition:', err);
        return res.status(500).json({ success: false, message: err.message || 'Some error occurred while deleting the book edition.' });
    }
};



/**
* Get literary reviews for a specific work with pagination.
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and data
*/
exports.getReviews = async (req, res) => {
    try {
        const { workId } = req.params;
        let { page = 1, limit = 10 } = req.query;
        
        // Ensure limit and page are integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        
        if (isNaN(page) || page <= 0) {
            return res.status(400).json({ success: false, message: "Page must be a positive integer" });
        }
        if (isNaN(limit) || limit <= 0) {
            return res.status(400).json({ success: false, message: "Limit must be a positive integer" });
        }
        
        const offset = (page - 1) * limit;

        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }
        
        const reviews = await LiteraryReview.findAll({
            where: { workId },
            attributes: [
                'literaryReviewId',
                'literaryReview',
                'literaryRating',
                'creationDate',
                'totalLikes',
                'totalComments'
            ],
            include: [
                {
                    model: User,
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
            reviewContent: review.literaryReview, // Full content
            createdAt: review.creationDate,
            user: {
                userId: review.User.userId,
                username: review.User.username,
                profileImageUrl: review.User.profileImage,
                reviewCount: review.User.totalReviews || 0,
                followersCount: review.User.totalFollowers || 0
            },
            likeCount: review.totalLikes || 0,
            commentCount: review.totalComments || 0,
            literaryRating: review.literaryRating,
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
            currentPage: page,
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
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ 
                success: false, 
                message: `No work found with ID ${workId}` 
            });
        }
        
        // Validate the required fields
        if (!req.userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        if (literaryRating === undefined || literaryRating === null) {
            return res.status(400).json({ 
                success: false, 
                message: 'Literary rating is required' 
            });
        }
        if (!literaryReview || literaryReview.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'Literary review content cannot be empty' 
            });
        }
        
        // Create the new review
        const newReview = await LiteraryReview.create({
            workId,
            userId: req.userId,
            literaryReview,
            literaryRating,
            creationDate: new Date()
        });

        // Fetch the user's total reviews and total followers to include in the response
        const user = await User.findByPk(req.userId, {
            attributes: ['userId', 'username', 'profileImage', 'totalReviews', 'totalFollowers']
        });
        
        // Prepare response data
        const response = {
            success: true,
            message: 'Review created successfully',
            review: {
                literaryReviewId: newReview.literaryReviewId,
                literaryReview: newReview.literaryReview,
                literaryRating: newReview.literaryRating,
                creationDate: newReview.creationDate,
                totalLikes: newReview.totalLikes,
                totalComments: newReview.totalComments,
                user: {
                    userId: user.userId,
                    username: user.username,
                    profileImageUrl: user.profileImage,
                    reviewCount: user.totalReviews,
                    followersCount: user.totalFollowers
                }
            }
        };
        
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

        // Validate parameters
        if (!workId || !literaryReviewId) {
            return res.status(400).json({ 
                success: false, 
                message: "workId and literaryReviewId are required in the query parameters" 
            });
        }

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ 
                success: false, 
                message: 'Work not found.',
                workId
            });
        }

        // Check if the review exists
        const review = await LiteraryReview.findByPk(literaryReviewId);
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: `No review found with ID ${literaryReviewId}`,
                reviewId: literaryReviewId
            });
        }

        // Check if the review belongs to the user making the request
        if (review.userId !== req.userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'You are not authorized to update this review.',
                reviewId: literaryReviewId,
                userId: req.userId
            });
        }

        // Validate that literaryRating is provided and valid
        if (literaryRating === undefined || literaryRating === null) {
            return res.status(400).json({ 
                success: false, 
                message: 'Literary rating is required.' 
            });
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
            return res.status(200).json({ 
                success: true, 
                message: `No updates were made on review with ID ${literaryReviewId}.`,
                reviewId: literaryReviewId
            });
        }

        // Fetch the updated review for response
        const updatedReview = await LiteraryReview.findByPk(literaryReviewId);

        return res.status(200).json({ 
            success: true, 
            message: `Review with ID ${literaryReviewId} was updated successfully.`,
            review: updatedReview
        });
    } catch (err) {
        console.error("Error updating review:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error',
                errors: err.errors.map(e => e.message)
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: err.message || "Some error occurred while updating the review." 
            });
        }
    }
};


/* // Get a specific review by work ID and review ID
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
}; */

/**
* Delete a literary review for a specific work and user.
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and message
*/
exports.deleteReview = async (req, res) => {
    try {
        const { workId, literaryReviewId } = req.params;
        const userId = req.userId;
        
        // Validate parameters
        if (!workId || !literaryReviewId || !userId) {
            return res.status(400).json({ 
                success: false, 
                message: "workId, literaryReviewId, and userId are required in the query parameters" 
            });
        }

        // Find the review to ensure it exists and belongs to the user
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId, userId } });
        
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: `No review found with ID ${literaryReviewId} for the specified work and user.`,
                reviewId: literaryReviewId
            });
        }
        
        // Delete the review
        await LiteraryReview.destroy({ where: { literaryReviewId } });
        
        return res.status(200).json({ 
            success: true, 
            message: `Review with ID ${literaryReviewId} was successfully deleted!`,
            reviewId: literaryReviewId
        });
    } catch (err) {
        console.error("Error deleting review:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || `Error deleting review with ID ${req.params.literaryReviewId}.` 
        });
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

        // Validate parameters
        if (!workId || !literaryReviewId) {
            return res.status(400).json({ 
                success: false, 
                message: "workId and literaryReviewId are required in the query parameters" 
            });
        }

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ 
                success: false, 
                message: 'Work not found.',
                workId
            });
        }

        // Find the review to ensure it exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: 'Literary review not found.',
                reviewId: literaryReviewId
            });
        }

        // Check if the user has already liked the review
        const existingLike = await LikeReview.findOne({ where: { literaryReviewId, userId } });
        if (existingLike) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already liked this review.',
                reviewId: literaryReviewId
            });
        }

        // Create a new like
        const newLike = await LikeReview.create({ literaryReviewId, userId });

        return res.status(201).json({ 
            success: true, 
            message: 'Literary review liked successfully.',
            data: newLike
        });
    } catch (err) {
        console.error("Error liking review:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || 'Error liking literary review.' 
        });
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

        // Validate parameters
        if (!workId || !literaryReviewId) {
            return res.status(400).json({ 
                success: false, 
                message: "workId and literaryReviewId are required in the query parameters" 
            });
        }

        // Check if the work exists
        const work = await Work.findByPk(workId);
        if (!work) {
            return res.status(404).json({ 
                success: false, 
                message: 'Work not found.',
                workId
            });
        }

        // Find the like to ensure it exists
        const existingLike = await LikeReview.findOne({ where: { literaryReviewId, userId } });
        if (!existingLike) {
            return res.status(404).json({ 
                success: false, 
                message: 'Like not found.',
                reviewId: literaryReviewId
            });
        }

        // Delete the like
        await existingLike.destroy();
        return res.status(200).json({ 
            success: true, 
            message: 'Literary review unliked successfully.'
        });
    } catch (err) {
        console.error("Error unliking review:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || 'Error unliking literary review.' 
        });
    }
};


/**
* Get comments for a specific literary review with pagination.
* 
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Promise<Object>} JSON response with success status and message
*/
exports.getReviewsComments = async (req, res) => {
    try {
        const { workId, literaryReviewId } = req.params;
        let { page = 1, limit = 10 } = req.query;

        // Ensure page and limit are integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        const offset = (page - 1) * limit;

        // Fetch comments with pagination
        const comments = await CommentReview.findAll({
            where: { literaryReviewId },
            attributes: [
                'commentId',
                'literaryReviewId',
                'comment',
                'creationDate',
                'totalLikes'
            ],
            include: [
                {
                    model: db.User,
                    as: 'Commenter',
                    attributes: ['userId', 'username', 'profileImage']
                }
            ],
            order: [['creationDate', 'DESC']],
            offset,
            limit,
        });

        if (comments.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "No comments found for this review" 
            });
        }

        const formattedComments = comments.map(comment => ({
            commentId: comment.commentId,
            literaryReviewId: comment.literaryReviewId,
            comment: comment.comment,
            createdAt: comment.creationDate,
            likeCount: comment.totalLikes || 0,
            user: {
                userId: comment.Commenter.userId,
                username: comment.Commenter.username,
                profileImage: comment.Commenter.profileImage
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
            currentPage: page,
            comments: formattedComments,
            links: [{ rel: "add-comment-review", href: `/works/${workId}/reviews/${literaryReviewId}/comments`, method: "POST" }]
        });
    } catch (err) {
        console.error("Error fetching comments:", err);
        res.status(500).json({ 
            success: false, 
            message: err.message || "Some error occurred while retrieving the comments." 
        });
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
            return res.status(404).json({
                success: false,
                message: `No work found with ID ${workId}`,
                nonExistingInstance: 'Work'
            });
        }
        
        // Check if the review exists
        const review = await LiteraryReview.findOne({
            where: {
                literaryReviewId,
                workId
            }
        });
        if (!review) {
            return res.status(404).json({
                success: false,
                message: `No literary review found with ID ${literaryReviewId} for the given work.`,
                nonExistingInstance: 'Literary Review'
            });
        }
        
        // Validate comment length
        if (!comment || comment.length > 255) {
            return res.status(400).json({
                success: false,
                message: 'Comment cannot be empty and must be less than 255 characters.'
            });
        }
        
        // Create the new comment
        const newComment = await CommentReview.create({
            literaryReviewId,
            userId,
            comment,
            creationDate: new Date()
        });
        
        // Fetch the user data to include in the response
        const user = await User.findByPk(userId, {
            attributes: ['userId', 'username', 'profileImage']
        });

        return res.status(201).json({
            success: true,
            message: 'Comment created successfully.',
            data: {
                commentId: newComment.commentId,
                literaryReviewId: newComment.literaryReviewId,
                comment: newComment.comment,
                createdAt: newComment.creationDate,
                user: {
                    userId: user.userId,
                    username: user.username,
                    profileImage: user.profileImage
                },
                likeCount: newComment.totalLikes
            }
        });
    } catch (err) {
        console.error("Error adding comment:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                message: err.errors.map(e => e.message)
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Some error occurred while adding the comment.'
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
            return res.status(404).json({ 
                success: false, 
                message: `No work found with ID ${workId}`, 
                nonExistingInstance: 'Work'
            });
        }

        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: `No literary review found with ID ${literaryReviewId} for the given work.`, 
                nonExistingInstance: 'Literary Review'
            });
        }

        // Check if the comment exists and if the user is the owner of the comment
        const existingComment = await CommentReview.findOne({ where: { commentId, literaryReviewId, userId } });
        if (!existingComment) {
            return res.status(404).json({ 
                success: false, 
                message: `Comment not found or you do not have permission to edit this comment.`, 
                nonExistingInstance: 'Comment'
            });
        }

        // Validate comment length
        if (!comment || comment.length > 255) {
            return res.status(400).json({ 
                success: false, 
                message: 'Comment cannot be empty and must be less than 255 characters.'
            });
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
            return res.status(400).json({ 
                success: false, 
                message: err.errors.map(e => e.message) 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: err.message || "Some error occurred while updating the comment."
            });
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
            return res.status(404).json({ 
                success: false, 
                message: `No work found with ID ${workId}`, 
                nonExistingInstance: 'Work'
            });
        }

        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: `No literary review found with ID ${literaryReviewId} for the given work.`, 
                nonExistingInstance: 'Literary Review'
            });
        }

        // Check if the comment exists and if the user is the owner of the comment
        const existingComment = await CommentReview.findOne({ where: { commentId, literaryReviewId, userId } });
        if (!existingComment) {
            return res.status(404).json({ 
                success: false, 
                message: `Comment not found or you do not have permission to delete this comment.`, 
                nonExistingInstance: 'Comment'
            });
        }

        // Delete the comment
        await existingComment.destroy();

        return res.status(200).json({ 
            success: true, 
            message: `Comment with ID ${commentId} was successfully deleted.`
        });
    } catch (err) {
        console.error("Error deleting comment:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || "Some error occurred while deleting the comment."
        });
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
            return res.status(404).json({ 
                success: false, 
                message: `No work found with ID ${workId}`,
                nonExistingInstance: 'Work'
            });
        }
        
        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: `No literary review found with ID ${literaryReviewId} for the given work.`,
                nonExistingInstance: 'Literary Review'
            });
        }
        
        // Check if the comment exists
        const comment = await CommentReview.findOne({ where: { commentId, literaryReviewId } });
        if (!comment) {
            return res.status(404).json({ 
                success: false, 
                message: `No comment found with ID ${commentId} for the given review.`,
                nonExistingInstance: 'Comment'
            });
        }
        
        // Check if the user already liked the comment
        const existingLike = await LikeComment.findOne({ where: { commentId, userId } });
        if (existingLike) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already liked this comment.' 
            });
        }
        
        // Create a new like
        const newLike = await LikeComment.create({ commentId, userId, likeDate: new Date() });
        return res.status(201).json({ 
            success: true, 
            message: 'Comment liked successfully.', 
            data: newLike 
        });
    } catch (err) {
        console.error("Error liking comment:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || 'Error liking comment.' 
        });
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
            return res.status(404).json({ 
                success: false, 
                message: `No work found with ID ${workId}`,
                nonExistingInstance: 'Work'
            });
        }
        
        // Check if the review exists
        const review = await LiteraryReview.findOne({ where: { literaryReviewId, workId } });
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: `No literary review found with ID ${literaryReviewId} for the given work.`,
                nonExistingInstance: 'Literary Review'
            });
        }
        
        // Check if the comment exists
        const comment = await CommentReview.findOne({ where: { commentId, literaryReviewId } });
        if (!comment) {
            return res.status(404).json({ 
                success: false, 
                message: `No comment found with ID ${commentId} for the given review.`,
                nonExistingInstance: 'Comment'
            });
        }
        
        // Check if the like exists
        const existingLike = await LikeComment.findOne({ where: { commentId, userId } });
        if (!existingLike) {
            return res.status(404).json({ 
                success: false, 
                message: 'Like not found.' 
            });
        }
        
        // Delete the like
        await existingLike.destroy();
        return res.status(200).json({ 
            success: true, 
            message: 'Comment unliked successfully.' 
        });
    } catch (err) {
        console.error("Error unliking comment:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || 'Error unliking comment.' 
        });
    }
};
