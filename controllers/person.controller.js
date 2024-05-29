const db = require('../models');
const { Person, Work, BookAuthor, BookEdition, BookContributor, LiteraryReview, BookInSeries, Role, PersonRole } = db;
const { ValidationError, Op, fn, col } = require('sequelize');

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

        let where = {};
        if (role) {
            const roleData = await Role.findOne({ where: { roleName: role } });
            if (roleData) {
                const personIds = await PersonRole.findAll({ where: { roleId: roleData.roleId }, attributes: ['personId'] });
                where = { personId: { [Op.in]: personIds.map(pr => pr.personId) } };
            } else {
                where = { personId: -1 }; // No such role, return empty result
            }
        }

        const { count, rows: persons } = await Person.findAndCountAll({
            where,
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        // Fetch detailed counts for each person
        const detailedPersons = await Promise.all(persons.map(async person => {
            const worksCount = await BookAuthor.count({ where: { personId: person.personId } });
            const audiobookCount = await BookContributor.count({
                where: {
                    personId: person.personId,
                    editionISBN: { [Op.in]: (await BookEdition.findAll({ where: { editionType: 'Audiobook' }, attributes: ['ISBN'] })).map(be => be.ISBN) }
                }
            });
            const translationCount = await BookContributor.count({
                where: {
                    personId: person.personId,
                    editionISBN: { [Op.in]: (await BookEdition.findAll({ where: { editionType: { [Op.ne]: 'Audiobook' } }, attributes: ['ISBN'] })).map(be => be.ISBN) }
                }
            });

            const roles = await PersonRole.findAll({ where: { personId: person.personId }, include: Role });
            return {
                ...person.toJSON(),
                worksCount,
                audiobookCount,
                translationCount,
                roles: roles.map(r => r.Role.roleName)
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
    const t = await db.sequelize.transaction();
    try {
        const { personName, roles } = req.body;

        // Ensure roles are valid and exist
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ success: false, message: 'Roles are required and should be a non-empty array.' });
        }

        const validRoles = await Role.findAll({ where: { roleName: { [Op.in]: roles } } });
        if (validRoles.length !== roles.length) {
            return res.status(400).json({ success: false, message: `Some roles are invalid.` });
        }

        // Check if person already exists
        const existingPerson = await Person.findOne({ where: { personName } });
        if (existingPerson) {
            return res.status(400).json({ success: false, message: 'Person with this name already exists.' });
        }

        // Create new person
        const newPerson = await Person.create({ personName }, { transaction: t });

        // Create person-role associations
        for (const role of validRoles) {
            await PersonRole.create({ personId: newPerson.personId, roleId: role.roleId }, { transaction: t });
        }

        await t.commit();

        res.status(201).json({
            success: true,
            message: 'New Person created',
            URL: `/persons/${newPerson.personId}`
        });
    } catch (err) {
        await t.rollback();
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
 * Retrieve all available roles.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.getAllRoles = async (req, res) => {
    try {
        const roles = await Role.findAll({
            attributes: ['roleId', 'roleName']
        });
        res.status(200).json({ success: true, roles });
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching roles" });
    }
};

/**
 * Add a role to a person.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.addRole = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { personId } = req.params;
        const { role } = req.body;

        // Ensure role is valid and exists
        const validRole = await Role.findOne({ where: { roleName: role }, transaction: t });
        if (!validRole) {
            return res.status(400).json({ success: false, message: `Invalid role: ${role}.` });
        }

        // Check if person exists
        const person = await Person.findByPk(personId, { transaction: t });
        if (!person) {
            return res.status(404).json({ success: false, message: 'Person not found.' });
        }

        // Check if role association already exists
        const existingAssociation = await PersonRole.findOne({ where: { personId, roleId: validRole.roleId }, transaction: t });
        if (existingAssociation) {
            return res.status(400).json({ success: false, message: 'Role already associated with this person.' });
        }

        // Create person-role association
        await PersonRole.create({ personId, roleId: validRole.roleId }, { transaction: t });

        await t.commit();

        res.status(201).json({ success: true, message: 'Role added to person successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error adding role to person:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while adding the role to the person." });
    }
};

/**
 * Remove a role from a person.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.removeRole = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { personId } = req.params;
        const { role } = req.body;

        // Ensure role is valid and exists
        const validRole = await Role.findOne({ where: { roleName: role }, transaction: t });
        if (!validRole) {
            return res.status(400).json({ success: false, message: `Invalid role: ${role}.` });
        }

        // Check if person exists
        const person = await Person.findByPk(personId, { transaction: t });
        if (!person) {
            return res.status(404).json({ success: false, message: 'Person not found.' });
        }

        // Check if role association exists
        const existingAssociation = await PersonRole.findOne({ where: { personId, roleId: validRole.roleId }, transaction: t });
        if (!existingAssociation) {
            return res.status(400).json({ success: false, message: 'Role not associated with this person.' });
        }

        // Remove person-role association
        await PersonRole.destroy({ where: { personId, roleId: validRole.roleId }, transaction: t });

        await t.commit();

        res.status(200).json({ success: true, message: 'Role removed from person successfully.' });
    } catch (err) {
        await t.rollback();
        console.error("Error removing role from person:", err);
        res.status(500).json({ success: false, message: err.message || "Some error occurred while removing the role from the person." });
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

        const roles = await PersonRole.findAll({ where: { personId: person.personId }, include: Role });

        res.status(200).json({
            success: true,
            person: {
                personId: person.personId,
                personName: person.personName,
                roles: roles.map(r => r.Role.roleName),
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
 * Update a person's name by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updatePerson = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { personId } = req.params;
        const { personName } = req.body;

        // Check if the person exists
        const person = await Person.findByPk(personId, { transaction: t });
        if (!person) {
            await t.rollback();
            return res.status(404).json({ success: false, msg: `Person with ID ${personId} not found.` });
        }

        // Validate personName
        if (personName === undefined || personName === null || personName.trim() === '') {
            await t.rollback();
            return res.status(400).json({ success: false, msg: 'personName is required and cannot be empty.' });
        }

        // Update person details if valid personName is provided
        await person.update({ personName }, { transaction: t });

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
