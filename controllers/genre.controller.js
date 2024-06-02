const db = require('../models');
const {Genre, Work, BookGenre, LiteraryReview, BookInSeries, Language, BookEdition, BookContributor, Person, Role, BookAuthor} = db;
const { ValidationError, Op } = require('sequelize');


/**
 * Create a new genre.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.createGenre = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { genreName } = req.body;

        // Validate genreName
        if (!genreName || genreName.trim() === '') {
            await t.rollback();
            return res.status(400).json({ 
                success: false, 
                message: "Genre name cannot be empty!" 
            });
        }

        // Check if genre already exists
        const existingGenre = await Genre.findOne({ where: { genreName } });
        if (existingGenre) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Genre already exists.",
                existingGenreName: genreName,
                links: [{ rel: 'self', href: `/genres/${existingGenre.genreId}`, method: 'GET' }]
            });
        }

        // Create new genre
        const newGenre = await Genre.create({ genreName }, { transaction: t });

        await t.commit();
        return res.status(201).json({
            success: true,
            message: 'New genre created successfully.',
            genre: newGenre,
            links: [
                { rel: 'self', href: `/genres/${newGenre.genreId}`, method: 'GET' },
                { rel: 'delete', href: `/genres/${newGenre.genreId}`, method: 'DELETE' },
                { rel: 'modify', href: `/genres/${newGenre.genreId}`, method: 'PATCH' }
            ]
        });
    } catch (err) {
        await t.rollback();
        console.error("Error creating genre:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ 
                success: false, 
                message: err.errors.map(e => e.message) 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: err.message || "Some error occurred while creating the genre." 
            });
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
        const { genreName } = req.body;

        // Validate genreName
        if (!genreName) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Genre name cannot be empty!" });
        }

        // Check if the genre exists
        const genre = await Genre.findByPk(genreId);
        if (!genre) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Genre not found.' });
        }

        // Check if the new genre name already exists
        const existingGenre = await Genre.findOne({ where: { genreName } });
        if (existingGenre && existingGenre.genreId !== genreId) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Genre name already exists.",
                existingGenreName: genreName,
                links: [{ rel: 'self', href: `/genres/${existingGenre.genreId}`, method: 'GET' }]
            });
        }

        // Update genre name
        genre.genreName = genreName;
        await genre.save({ transaction: t });

        await t.commit();

        // Re-fetch the updated genre
        const updatedGenre = await Genre.findByPk(genreId);

        res.status(200).json({
            success: true,
            message: 'Genre updated successfully.',
            genre: updatedGenre,
            links: [
                { rel: 'self', href: `/genres/${updatedGenre.genreId}`, method: 'GET' },
                { rel: 'delete', href: `/genres/${updatedGenre.genreId}`, method: 'DELETE' },
                { rel: 'modify', href: `/genres/${updatedGenre.genreId}`, method: 'PATCH' }
            ]
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
                message: 'Cannot delete genre with associated works. Please remove associations first.',
                links: [{ rel: 'remove-associations', href: `/genres/${genreId}/remove-associations`, method: 'DELETE' }]
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
 * Remove all associations of a genre in the bookGenre table.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeAssociations = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { genreId } = req.params;

        // Check if the genre exists
        const genre = await Genre.findByPk(genreId, { transaction: t });
        if (!genre) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Genre not found.' });
        }

        // Check if the genre has any associations in the bookGenre table
        const associationsCount = await BookGenre.count({ where: { genreId }, transaction: t });
        if (associationsCount === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'No associations found for this genre.' });
        }

        // Remove all associations in the bookGenre table
        await BookGenre.destroy({ where: { genreId }, transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: 'All associations removed successfully.' });
    } catch (error) {
        await t.rollback();
        console.error("Error removing associations:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while removing associations." });
    }
};


// STILL NEED TO LOOK INTO THIS AS THE NUMBER OF EDITIONS BEING SHOWN WITH THE GENRES ARE NOT QUITE RIGHT I THINK!
/**
 * Retrieve all genres with pagination, work count, and book editions.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findGenres = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 4; // Fixed limit of 4 genres per page
        const offset = (page - 1) * limit;
        const { genreNames, language, filterPage = 1, filterLimit = 10, simple } = req.query;

        let genreWhere = {};
        let genreNameArray = [];

        if (genreNames) {
            genreNameArray = genreNames.split(',').slice(0, 4); // Allow up to 4 genres
            const existingGenres = await Genre.findAll({
                where: {
                    genreName: {
                        [Op.in]: genreNameArray
                    }
                }
            });

            const existingGenreNames = existingGenres.map(g => g.genreName);
            const invalidGenres = genreNameArray.filter(g => !existingGenreNames.includes(g));

            if (invalidGenres.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'The following genres provided as filters do not exist.',
                    invalidGenres,
                    links: [{ rel: 'create-genre', href: '/genres', method: 'POST' }]
                });
            }

            genreWhere.genreName = {
                [Op.in]: genreNameArray
            };
        }

        let languageWhere = {};
        if (language) {
            const languageData = await Language.findOne({ where: { languageName: language } });
            if (languageData) {
                languageWhere.languageId = languageData.languageId;
            } else {
                return res.status(404).json({ success: false, message: `Language '${language}' not found.` });
            }
        }

        // Fetch all genres with works for filters, with pagination
        const filterOffset = (parseInt(filterPage, 10) - 1) * parseInt(filterLimit, 10);

        if (simple) {
            const genresSimple = await Genre.findAll({
                where: genreWhere,
                attributes: ['genreId', 'genreName'],
                limit: filterLimit, // Apply correct limit
                offset: filterOffset, // Apply correct offset
                order: [['genreName', 'ASC']]
            });

            const totalCountSimple = await Genre.count({
                where: genreWhere
            });

            const totalPagesSimple = Math.ceil(totalCountSimple / filterLimit);

            return res.status(200).json({
                success: true,
                totalItems: totalCountSimple,
                totalPages: totalPagesSimple,
                currentPage: filterPage,
                genres: genresSimple,
                links: [
                    { rel: "self", href: `/genres?page=${filterPage}&limit=${filterLimit}&simple=true`, method: "GET" },
                    { rel: "create", href: `/genres`, method: "POST" }
                ]
            });
        }

        // Fetch genres with associated works count
        const filteredGenres = await Genre.findAll({
            where: genreWhere,
            attributes: {
                include: [
                    [
                        db.sequelize.literal(`(
                            SELECT COUNT(DISTINCT workId)
                            FROM bookGenre
                            WHERE
                                bookGenre.genreId = genre.genreId
                        )`),
                        'worksCount'
                    ]
                ]
            },
            having: db.sequelize.literal(`worksCount > 0`), // Exclude genres with no associated works
            order: [['genreId', 'ASC']],
            distinct: true
        });

        // Ensure we have enough genres to fill the 4 slots
        const additionalGenresNeeded = limit - filteredGenres.length;
        let additionalGenres = [];

        if (additionalGenresNeeded > 0) {
            additionalGenres = await Genre.findAll({
                where: {
                    genreId: {
                        [Op.notIn]: filteredGenres.map(g => g.genreId)
                    }
                },
                attributes: {
                    include: [
                        [
                            db.sequelize.literal(`(
                                SELECT COUNT(DISTINCT workId)
                                FROM bookGenre
                                WHERE
                                    bookGenre.genreId = genre.genreId
                            )`),
                            'worksCount'
                        ]
                    ]
                },
                having: db.sequelize.literal(`worksCount > 0`),
                order: [['genreId', 'ASC']],
                limit: additionalGenresNeeded,
                distinct: true
            });
        }

        const genres = filteredGenres.concat(additionalGenres).slice(0, limit);

        // Fetch the total count of genres with associated works
        const totalCount = await Genre.count({
            where: genreWhere,
            include: [{
                model: BookGenre,
                attributes: [],
                required: true // Ensures only genres with associated works are counted
            }]
        });

        const totalGenres = await Genre.count();

        const totalPages = Math.ceil(totalCount / limit);

        // Fetch the book editions for each genre
        const genresWithEditions = await Promise.all(genres.map(async genre => {
            const bookEditions = await BookEdition.findAll({
                where: {
                    workId: {
                        [Op.in]: db.sequelize.literal(`(
                            SELECT DISTINCT workId
                            FROM bookGenre
                            WHERE genreId = ${genre.genreId}
                        )`)
                    },
                    editionType: { [Op.ne]: 'Audiobook' },
                    ...languageWhere
                },
                attributes: ['title', 'coverImage', 'publicationDate', 'pageNumber', 'synopsis', 'ISBN', 'workId'],
                include: [
                    {
                        model: BookContributor,
                        attributes: ['roleId'],
                        include: [
                            {
                                model: Person,
                                attributes: ['personName']
                            },
                            {
                                model: Role,
                                attributes: ['roleName']
                            }
                        ]
                    },
                    {
                        model: Work,
                        attributes: ['averageLiteraryRating', 'totalReviews', 'primaryEditionUUID'],
                        include: [
                            {
                                model: BookAuthor,
                                as: 'BookAuthors',
                                include: [
                                    {
                                        model: Person,
                                        as: 'Person',
                                        attributes: ['personName']
                                    }
                                ]
                            },
                            {
                                model: BookInSeries,
                                as: 'BookInSeries',
                                attributes: ['seriesName', 'seriesDescription']
                            }
                        ]
                    },
                    {
                        model: Language,
                        attributes: ['languageName']
                    }
                ],
                order: [['publicationDate', 'DESC']],
                limit: 5
            });

            // Ensure unique works for each book edition
            const uniqueWorkEditions = [];
            const workIds = new Set();

            for (const edition of bookEditions) {
                if (!workIds.has(edition.workId)) {
                    uniqueWorkEditions.push(edition);
                    workIds.add(edition.workId);
                }
                if (uniqueWorkEditions.length === 5) break;
            }

            // Add genre details and book editions to the result
            return {
                genreId: genre.genreId,
                genreName: genre.genreName,
                worksCount: genre.dataValues.worksCount,
                bookEditions: uniqueWorkEditions.map(edition => ({
                    title: edition.title,
                    coverImage: edition.coverImage,
                    publicationDate: edition.publicationDate,
                    pageNumber: edition.pageNumber,
                    synopsis: edition.synopsis,
                    language: edition.Language.languageName || 'Various',
                    contributors: edition.bookContributors.map(contributor => ({
                        personId: contributor.personId,
                        personName: contributor.person.personName,
                        roleName: contributor.Role.roleName
                    })),
                    work: {
                        averageLiteraryRating: edition.Work.averageLiteraryRating,
                        totalReviews: edition.Work.totalReviews,
                        author: edition.Work.BookAuthors.map(author => author.Person.personName).join(', '),
                        series: edition.Work.BookInSeries ? {
                            seriesName: edition.Work.BookInSeries.seriesName,
                            seriesDescription: edition.Work.BookInSeries.seriesDescription
                        } : null
                    }
                }))
            };
        }));

        const genresForFilters = await Genre.findAll({
            include: [{
                model: BookGenre,
                attributes: [],
                required: true // Ensures only genres with associated works are included
            }],
            attributes: ['genreId', 'genreName'],
            group: ['genreId', 'genreName'],
            order: [['genreName', 'ASC']],
            offset: filterOffset,
            limit: parseInt(filterLimit, 10)
        });

        res.status(200).json({
            success: true,
            totalItems: totalGenres,
            totalPages,
            currentPage: page,
            genres: genresWithEditions,
            filterGenres: genresForFilters,
            links: [
                { rel: "self", href: `/genres?page=${page}&limit=${limit}`, method: "GET" },
                { rel: "create", href: `/genres`, method: "POST" }
            ]
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
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 30;
        const offset = (page - 1) * limit;
        const { language, date, sort } = req.query;

        const genre = await Genre.findByPk(genreId);

        if (!genre) {
            return res.status(404).json({
                success: false,
                message: 'Genre not found.'
            });
        }

        let languageWhere = {};
        if (language) {
            const languageData = await Language.findOne({ where: { languageName: language } });
            if (languageData) {
                languageWhere.languageId = languageData.languageId;
            } else {
                return res.status(404).json({ success: false, message: `Language '${language}' not found.` });
            }
        }

        let dateWhere = {};
        if (date) {
            dateWhere.publicationDate = {
                [Op.gte]: new Date(date)
            };
        }

        let order = [['publicationDate', 'DESC']];
        if (sort) {
            const sortParams = sort.split(',').map(param => {
                const [key, direction] = param.split(':');
                if (key === 'averageLiteraryRating' || key === 'totalReviews') {
                    return [{ model: Work, as: 'Work' }, key, direction.toUpperCase()];
                }
                return [key, direction.toUpperCase()];
            });
            order = sortParams;
        }

        const bookEditions = await BookEdition.findAll({
            where: {
                workId: {
                    [Op.in]: db.sequelize.literal(`(
                        SELECT DISTINCT workId
                        FROM bookGenre
                        WHERE genreId = ${genreId}
                    )`)
                },
                editionType: { [Op.ne]: 'Audiobook' },
                ...languageWhere,
                ...dateWhere
            },
            attributes: ['title', 'coverImage', 'publicationDate', 'pageNumber', 'synopsis', 'ISBN', 'workId'],
            include: [
                {
                    model: BookContributor,
                    attributes: ['roleId'],
                    include: [
                        {
                            model: Person,
                            attributes: ['personName']
                        },
                        {
                            model: Role,
                            attributes: ['roleName']
                        }
                    ]
                },
                {
                    model: Work,
                    attributes: ['averageLiteraryRating', 'totalReviews', 'seriesId', 'seriesOrder'],
                    include: [
                        {
                            model: BookAuthor,
                            as: 'BookAuthors',
                            include: [
                                {
                                    model: Person,
                                    as: 'Person',
                                    attributes: ['personName']
                                }
                            ]
                        },
                        {
                            model: BookInSeries,
                            as: 'BookInSeries',
                            attributes: ['seriesName', 'seriesDescription']
                        }
                    ]
                },
                {
                    model: Language,
                    attributes: ['languageName']
                }
            ],
            order: order,
            limit: limit,
            offset: offset
        });

        // Ensure unique works for each book edition
        const uniqueWorkEditions = [];
        const workIds = new Set();

        for (const edition of bookEditions) {
            if (!workIds.has(edition.workId)) {
                uniqueWorkEditions.push(edition);
                workIds.add(edition.workId);
            }
        }

        const totalEditionsCount = await BookEdition.count({
            where: {
                workId: {
                    [Op.in]: db.sequelize.literal(`(
                        SELECT DISTINCT workId
                        FROM bookGenre
                        WHERE genreId = ${genreId}
                    )`)
                },
                editionType: { [Op.ne]: 'Audiobook' },
                ...languageWhere,
                ...dateWhere
            }
        });

        const totalPages = Math.ceil(totalEditionsCount / limit);

        res.status(200).json({
            success: true,
            genre: {
                genreId: genre.genreId,
                genreName: genre.genreName,
                worksCount: uniqueWorkEditions.length,
                bookEditions: uniqueWorkEditions.map(edition => ({
                    title: edition.title,
                    coverImage: edition.coverImage,
                    publicationDate: edition.publicationDate,
                    pageNumber: edition.pageNumber,
                    synopsis: edition.synopsis,
                    language: edition.Language.languageName || 'Various',
                    contributors: edition.bookContributors.map(contributor => ({
                        personId: contributor.personId,
                        personName: contributor.person.personName,
                        roleName: contributor.Role.roleName
                    })),
                    work: {
                        averageLiteraryRating: edition.Work.averageLiteraryRating,
                        totalReviews: edition.Work.totalReviews,
                        seriesId: edition.Work.seriesId,
                        seriesOrder: edition.Work.seriesOrder,
                        series: edition.Work.BookInSeries ? {
                            seriesName: edition.Work.BookInSeries.seriesName,
                            seriesDescription: edition.Work.BookInSeries.seriesDescription
                        } : null,
                        author: edition.Work.BookAuthors.map(author => author.Person.personName).join(', ')
                    }
                }))
            },
            totalPages,
            currentPage: page,
            links: [
                { rel: "self", href: `/genres/${genreId}?page=${page}`, method: "GET" }
            ]
        });
    } catch (error) {
        console.error("Error fetching genre:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching the genre." });
    }
};
