const db = require('../models');
const {Person, Work, BookAuthor, BookEdition, BookContributor, LiteraryReview, BookInSeries} = db;
const { ValidationError, Op, fn, col } = require('sequelize'); // necessary for model validations using sequelize



/**
 * Retrieve all persons with pagination and role filtering.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { role } = req.query;

        const where = {};
        if (role) {
            where.roles = { [Op.contains]: [role] };
        }

        const { count, rows: persons } = await Person.findAndCountAll({
            where,
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        // Fetch detailed counts for each person
        const detailedPersons = await Promise.all(persons.map(async person => {
            const worksCountQuery = `
                SELECT COUNT(*) as worksCount
                FROM bookAuthor
                WHERE personId = ${person.personId}
            `;
            const [worksCountResult] = await db.sequelize.query(worksCountQuery);
            const worksCount = worksCountResult[0].worksCount;

            const audiobookCountQuery = `
                SELECT COUNT(*) as audiobookCount
                FROM bookContributor
                JOIN bookEdition ON bookContributor.editionISBN = bookEdition.ISBN
                WHERE personId = ${person.personId} AND editionType = 'Audiobook'
            `;
            const [audiobookCountResult] = await db.sequelize.query(audiobookCountQuery);
            const audiobookCount = audiobookCountResult[0].audiobookCount;

            const translationCountQuery = `
                SELECT COUNT(*) as translationCount
                FROM bookContributor
                JOIN bookEdition ON bookContributor.editionISBN = bookEdition.ISBN
                WHERE personId = ${person.personId} AND editionType != 'Audiobook'
            `;
            const [translationCountResult] = await db.sequelize.query(translationCountQuery);
            const translationCount = translationCountResult[0].translationCount;

            return {
                ...person.toJSON(),
                worksCount,
                audiobookCount,
                translationCount
            };
        }));

        res.status(200).json({
            success: true,
            totalItems: count,
            totalPages,
            currentPage: page,
            persons: detailedPersons
        });
    } catch (error) {
        console.error("Error fetching persons:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching persons" });
    }
};


/**
 * Create a new person.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.create = async (req, res) => {
    try {
        const { personName, roles } = req.body;
        const validRoles = ['author', 'translator', 'narrator'];

        // Ensure roles are valid
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ success: false, message: 'Roles are required and should be a non-empty array.' });
        }
        
        for (const role of roles) {
            if (!validRoles.includes(role)) {
                return res.status(400).json({ success: false, message: `Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}.` });
            }
        }

        // Check if person already exists
        const existingPerson = await Person.findOne({ where: { personName } });
        if (existingPerson) {
            return res.status(400).json({ success: false, message: 'Person with this name already exists.' });
        }

        const newPerson = await Person.create({ personName, roles });
        res.status(201).json({
            success: true,
            message: 'New Person created',
            URL: `/persons/${newPerson.personId}`
        });
    } catch (err) {
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            return res.status(500).json({
                message: err.message || "Some error occurred while creating the person"
            });
        }
    }
};


/**
 * Find a person by ID with detailed information.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findPerson = async (req, res) => {
    try {
        const { personId } = req.params;

        // Check if the person exists
        const person = await Person.findByPk(personId, {
            include: [
                {
                    model: BookAuthor,
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
                },
                {
                    model: BookContributor,
                    include: [
                        {
                            model: BookEdition
                        }
                    ]
                }
            ]
        });

        if (!person) {
            return res.status(404).json({
                success: false,
                msg: `No person found with ID ${personId}`
            });
        }

        // Transform works to include additional information
        const works = await Promise.all(person.bookAuthors.map(async (bookAuthor) => {
            const work = bookAuthor.Work;
            const literaryReviewsCount = await LiteraryReview.count({ where: { workId: work.workId } });
            const averageRating = await LiteraryReview.findOne({
                where: { workId: work.workId },
                attributes: [[db.sequelize.fn('AVG', db.sequelize.col('literaryRating')), 'averageRating']],
                raw: true
            });
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
                averageRating: averageRating ? averageRating.averageRating : null,
                coverImage: coverEdition ? coverEdition.coverImage : null,
                editionsCount
            };
        }));

        // Transform editions to include additional information
        const editions = person.bookContributors.map((bookContributor) => {
            const edition = bookContributor.BookEdition;
            return {
                ISBN: edition.ISBN,
                title: edition.title,
                editionType: edition.editionType,
                language: edition.language,
                pageNumber: edition.pageNumber,
                publicationDate: edition.publicationDate,
                coverImage: edition.coverImage
            };
        });

        res.status(200).json({
            success: true,
            person: {
                personId: person.personId,
                personName: person.personName,
                roles: person.roles,
                worksCount: works.length,
                editionsCount: editions.length,
                works,
                editions
            },
            links: [
                { rel: "self", href: `/persons/${person.personId}`, method: "GET" },
                { rel: "delete", href: `/persons/${person.personId}`, method: "DELETE" },
                { rel: "modify", href: `/persons/${person.personId}`, method: "PATCH" }
            ]
        });
    } catch (error) {
        console.error("Error fetching person:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching the person" });
    }
};



/**
 * Update a person by ID
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updatePerson = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { personId } = req.params;
        const { personName, roles, works, editions } = req.body;

        // Check if the person exists
        const person = await Person.findByPk(personId);
        if (!person) {
            await t.rollback();
            return res.status(404).json({ success: false, msg: `Person with ID ${personId} not found.` });
        }

        // Update person details if provided
        if (personName || roles) {
            await person.update({ personName, roles }, { transaction: t });
        }

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
                await BookAuthor.create({ workId, personId }, { transaction: t });
            }
        }

        // Handle associations with editions if provided
        if (editions) {
            for (const editionISBN of editions) {
                const edition = await BookEdition.findByPk(editionISBN);
                if (!edition) {
                    await t.rollback();
                    return res.status(404).json({
                        success: false,
                        message: `Edition with ISBN ${editionISBN} not found.`,
                        links: [{ rel: 'create-edition', href: '/editions', method: 'POST' }]
                    });
                }
                await BookContributor.create({ editionISBN, personId }, { transaction: t });
            }
        }

        await t.commit();
        return res.json({ success: true, msg: `Person with ID ${personId} was updated successfully.` });
    } catch (err) {
        await t.rollback();
        console.error("Error updating person:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, msg: err.message || "Some error occurred while updating the person." });
        }
    }
};



/**
 * Remove a person by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removePerson = async (req, res) => {
    const { personId } = req.params;
    try {
        // Check if the person exists
        const person = await Person.findByPk(personId);
        if (!person) {
            return res.status(404).json({ success: false, message: 'Person not found.' });
        }

        // Check if the person is associated with any works
        const associatedWorksCount = await BookAuthor.count({ where: { personId } });
        if (associatedWorksCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete person with associated works.',
                links: [{ rel: 'self', href: `/persons/${personId}/works`, method: 'GET' }]
            });
        }

        // Check if the person is associated with any book editions
        const associatedEditionsCount = await BookContributor.count({ where: { personId } });
        if (associatedEditionsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete person with associated book editions.',
                links: [{ rel: 'self', href: `/persons/${personId}/editions`, method: 'GET' }]
            });
        }

        // Delete the person
        await person.destroy();
        res.status(204).json({ success: true, message: 'Person deleted successfully.' });
    } catch (error) {
        console.error("Error deleting person:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while deleting the person." });
    }
};