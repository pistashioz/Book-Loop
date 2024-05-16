const db = require('../models');
const { Publisher, Work, BookEdition } = db;
const { ValidationError, Op } = require('sequelize');


/**
 * Create a new publisher.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.create = async (req, res) => {
    try {
        const { publisherName } = req.body;

        // Check for duplicate publisher name
        const existingPublisher = await Publisher.findOne({ where: { publisherName } });
        if (existingPublisher) {
            return res.status(400).json({ success: false, message: 'Publisher with this name already exists.' });
        }

        // Create new publisher
        const newPublisher = await Publisher.create({ publisherName });
        res.status(201).json({
            success: true,
            message: 'New Publisher created successfully',
            publisher: newPublisher,
            links: [
                { rel: "self", href: `/publishers/${newPublisher.publisherId}`, method: "GET" },
                { rel: "delete", href: `/publishers/${newPublisher.publisherId}`, method: "DELETE" },
                { rel: "modify", href: `/publishers/${newPublisher.publisherId}`, method: "PUT" },
            ]
        });
    } catch (error) {
        console.error("Error creating publisher:", error);
        if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: error.message || "Some error occurred while creating the publisher" });
        }
    }
};


/**
 * Retrieve all publishers with pagination.
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

        // Fetch total count of publishers
        const totalItems = await Publisher.count();

        // Fetch paginated publishers with related book editions
        const publishers = await Publisher.findAll({
            limit,
            offset,
            include: [{
                model: BookEdition,
                attributes: ['ISBN']
            }]
        });

        const totalPages = Math.ceil(totalItems / limit);

        // Add debug logging
        console.log(`Total publishers in database: ${totalItems}`);
        console.log(`Total pages: ${totalPages}`);
        console.log(`Current page: ${page}`);
        console.log(`Publishers fetched:`, publishers.map(pub => pub.publisherName));

        // Transform publishers to include publication count
        const publishersWithCount = publishers.map(publisher => {
            const publicationCount = publisher.BookEditions.length;
            return {
                ...publisher.toJSON(),
                publicationCount
            };
        });

        res.status(200).json({
            success: true,
            totalItems,
            totalPages,
            currentPage: page,
            publishers: publishersWithCount
        });
    } catch (error) {
        console.error("Error fetching publishers:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching publishers" });
    }
};




/**
 * Retrieve all book editions for a specific publisher with pagination.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.findEditionsByPublisher = async (req, res) => {
    try {
        const { publisherId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Check if the publisher exists
        const publisher = await Publisher.findByPk(publisherId);
        if (!publisher) {
            return res.status(404).json({ success: false, message: 'Publisher not found.' });
        }

        // Fetch total count of book editions for the publisher
        const totalItems = await BookEdition.count({ where: { publisherId } });

        // Fetch paginated book editions with required details
        const editions = await BookEdition.findAll({
            where: { publisherId },
            limit,
            offset,
            attributes: ['ISBN', 'title', 'editionType', 'language', 'pageNumber', 'publicationDate', 'coverImage'],
        });

        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true,
            totalItems,
            totalPages,
            currentPage: page,
            editions
        });
    } catch (error) {
        console.error("Error fetching editions by publisher:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching editions" });
    }
};




/**
 * Delete a publisher by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.deletePublisher = async (req, res) => {
    const { publisherId } = req.params;
    try {
        // Check if the publisher exists
        const publisher = await Publisher.findByPk(publisherId);
        if (!publisher) {
            return res.status(404).json({ success: false, message: 'Publisher not found.' });
        }

        // Check if the publisher has any associated book editions
        const associatedEditionsCount = await BookEdition.count({ where: { publisherId } });
        if (associatedEditionsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete publisher with associated book editions.',
                links: [{ rel: 'self', href: `/publishers/${publisherId}/editions`, method: 'GET' }]
            });
        }

        // Delete the publisher
        await publisher.destroy();
        res.status(204).json({ success: true, message: 'Publisher deleted successfully.' });
    } catch (error) {
        console.error("Error deleting publisher:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while deleting the publisher." });
    }
};