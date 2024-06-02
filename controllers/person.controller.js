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

        // Validate input data
        if (!personName) {
            return res.status(400).json({ success: false, message: 'Person name is required.' });
        }

        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ success: false, message: 'Roles are required and should be a non-empty array.' });
        }

        // Ensure roles are valid and exist
        const validRoles = await Role.findAll({ where: { roleName: { [Op.in]: roles } } });
        if (validRoles.length !== roles.length) {
            const invalidRoles = roles.filter(role => !validRoles.map(vr => vr.roleName).includes(role));
            return res.status(400).json({
                success: false,
                message: 'Some roles are invalid.',
                invalidRoles
            });
        }

        // Check if person already exists
        const existingPerson = await Person.findOne({ where: { personName } });
        if (existingPerson) {
            return res.status(400).json({ success: false, message: 'Person with this name already exists.' });
        }

        // Create new person
        const newPerson = await Person.create({ personName }, { transaction: t });

        // Create person-role associations
        const personRoles = validRoles.map(role => ({ personId: newPerson.personId, roleId: role.roleId }));
        await PersonRole.bulkCreate(personRoles, { transaction: t });

        await t.commit();

        return res.status(201).json({
            success: true,
            message: 'New person created successfully',
            person: newPerson,
            links: [
                { rel: "self", href: `/persons/${newPerson.personId}`, method: "GET" },
                { rel: "delete", href: `/persons/${newPerson.personId}`, method: "DELETE" },
                { rel: "modify", href: `/persons/${newPerson.personId}`, method: "PUT" }
            ]
        });
    } catch (err) {
        await t.rollback();
        console.error("Error creating person:", err);
        if (err instanceof ValidationError) {
            return res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            return res.status(500).json({
                success: false,
                message: err.message || "Some error occurred while creating the person."
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
        
        if (!roles || roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No roles found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Found ${roles.length} roles`,
            roles,
            links: [
                { rel: "self", href: `/roles`, method: "GET" },
                { rel: "create", href: `/roles`, method: "POST" }
            ]
        });
    } catch (error) {
        console.error("Error fetching roles:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Some error occurred while fetching roles."
        });
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

        // Validate input
        if (!role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Role is required.' 
            });
        }

        // Ensure role is valid and exists
        const validRole = await Role.findOne({ where: { roleName: role }, transaction: t });
        if (!validRole) {
            return res.status(404).json({ 
                success: false, 
                message: `Role '${role}' not found.`,
                invalidRole: role
            });
        }

        // Check if person exists
        const person = await Person.findByPk(personId, { transaction: t });
        if (!person) {
            return res.status(404).json({ 
                success: false, 
                message: `Person with ID '${personId}' not found.`,
                personId
            });
        }

        // Check if role association already exists
        const existingAssociation = await PersonRole.findOne({ 
            where: { personId, roleId: validRole.roleId }, 
            transaction: t 
        });
        if (existingAssociation) {
            return res.status(400).json({ 
                success: false, 
                message: `Role '${role}' is already associated with this person.`,
                personId,
                personName: person.personName,
                roleId: validRole.roleId
            });
        }

        // Create person-role association
        await PersonRole.create({ personId, roleId: validRole.roleId }, { transaction: t });
        await t.commit();

        return res.status(201).json({ 
            success: true, 
            message: `Role '${role}' added to person successfully.`,
            personId,
            roleId: validRole.roleId,
            links: [
                { rel: "self", href: `/persons/${personId}`, method: "GET" },
                { rel: "delete", href: `/persons/${personId}`, method: "DELETE" },
                { rel: "modify", href: `/persons/${personId}`, method: "PUT" }
            ]
        });
    } catch (err) {
        await t.rollback();
        console.error("Error adding role to person:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || "Some error occurred while adding the role to the person." 
        });
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

        // Validate input
        if (!role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Role is required.' 
            });
        }

        // Ensure role is valid and exists
        const validRole = await Role.findOne({ where: { roleName: role }, transaction: t });
        if (!validRole) {
            return res.status(404).json({ 
                success: false, 
                message: `Role '${role}' not found.`,
                invalidRole: role
            });
        }

        // Check if person exists
        const person = await Person.findByPk(personId, { transaction: t });
        if (!person) {
            return res.status(404).json({ 
                success: false, 
                message: `Person with ID '${personId}' not found.`,
                personId
            });
        }

        // Check if role association exists
        const existingAssociation = await PersonRole.findOne({ where: { personId, roleId: validRole.roleId }, transaction: t });
        if (!existingAssociation) {
            return res.status(400).json({ 
                success: false, 
                message: `Role '${role}' is not associated with this person.`,
                personId,
                roleId: validRole.roleId
            });
        }

        // Check if this is the only role associated with the person
        const roleCount = await PersonRole.count({ where: { personId }, transaction: t });
        if (roleCount <= 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot remove the only role associated with this person.',
                personId,
                roleId: validRole.roleId
            });
        }

        // Remove person-role association
        await PersonRole.destroy({ where: { personId, roleId: validRole.roleId }, transaction: t });
        await t.commit();

        return res.status(200).json({ 
            success: true, 
            message: `Role '${role}' removed from person successfully.`,
            personId,
            roleId: validRole.roleId
        });
    } catch (err) {
        await t.rollback();
        console.error("Error removing role from person:", err);
        return res.status(500).json({ 
            success: false, 
            message: err.message || "Some error occurred while removing the role from the person." 
        });
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
    const t = await db.sequelize.transaction();
    const { personId } = req.params;
    try {
        // Check if the person exists
        const person = await Person.findByPk(personId, { transaction: t });
        if (!person) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: `Person with ID ${personId} not found.`,
                personId
            });
        }

        // Check if the person is associated with any works
        const associatedWorksCount = await BookAuthor.count({ where: { personId }, transaction: t });
        if (associatedWorksCount > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot delete person with associated works.',
                personId,
                links: [{ rel: 'self', href: `/persons/${personId}/works`, method: 'GET' }]
            });
        }

        // Check if the person is associated with any book editions
        const associatedEditionsCount = await BookContributor.count({ where: { personId }, transaction: t });
        if (associatedEditionsCount > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot delete person with associated book editions.',
                personId,
                links: [{ rel: 'self', href: `/persons/${personId}/editions`, method: 'GET' }]
            });
        }

        // Delete any associated roles
        await PersonRole.destroy({ where: { personId }, transaction: t });

        // Delete the person
        await person.destroy({ transaction: t });
        await t.commit();
        return res.status(200).json({ 
            success: true, 
            message: `Person with ID ${personId} deleted successfully.`,
            personId
        });
    } catch (error) {
        await t.rollback();
        console.error("Error deleting person:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Some error occurred while deleting the person." 
        });
    }
};

