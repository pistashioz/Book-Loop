const db = require('../models');
const { Publisher, Work, BookEdition, BookInSeries, BookContributor, BookAuthor, Person, Role } = db;
const { ValidationError, Op } = require('sequelize');

exports.create = async (req, res) => {
    try {
        const { publisherName } = req.body;

        console.log(req.body)
        console.log("Creating publisher with name:", publisherName);

        if (!publisherName) {
            return res.status(400).json({ success: false, message: 'Publisher name is required.' });
        }

        const existingPublisher = await Publisher.findOne({ where: { publisherName } });
        if (existingPublisher) {
            return res.status(400).json({ 
                success: false, 
                message: 'Publisher with this name already exists.', 
                publisherName 
            });
        }

        const newPublisher = await Publisher.create({ publisherName });
        return res.status(201).json({
            success: true,
            message: 'New Publisher created successfully.',
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
            return res.status(400).json({ 
                success: false, 
                message: error.errors.map(e => e.message) 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: error.message || "Some error occurred while creating the publisher." 
            });
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
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);
        console.log(`Fetching publishers with page ${page} and limit ${limit}`);
        console.log(typeof page);

        if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
            return res.status(400).json({ success: false, message: "Page and limit must be positive integers." });
        }

        const offset = (page - 1) * limit;

        // Fetch total count of publishers
        const totalItems = await Publisher.count();

        // Fetch paginated publishers with related book editions and most recent publication date
        const publishers = await Publisher.findAll({
            limit,
            offset,
            include: [
                {
                    model: BookEdition,
                    attributes: ['publicationDate'],
                    required: false
                }
            ],
            order: [
                ['publisherName', 'ASC']
            ]
        });

        const totalPages = Math.ceil(totalItems / limit);

        // Add debug logging
        console.log(`Total publishers in database: ${totalItems}`);
        console.log(`Total pages: ${totalPages}`);
        console.log(`Current page: ${page}`);
        console.log(`Publishers fetched:`, publishers.map(pub => pub.publisherName));

        // Transform publishers to include publication count and most recent publication date
        const publishersWithDetails = publishers.map(publisher => {
            const publicationCount = publisher.BookEditions.length;
            const mostRecentPublication = publisher.BookEditions.reduce((latest, edition) => {
                return !latest || new Date(edition.publicationDate) > new Date(latest) ? edition.publicationDate : latest;
            }, null);
            return {
                publisherId: publisher.publisherId,
                publisherName: publisher.publisherName,
                publicationCount,
                mostRecentPublication
            };
        });

        res.status(200).json({
            success: true,
            totalItems,
            totalPages,
            currentPage: page,
            publishers: publishersWithDetails,
            links: [
                { rel: "self", href: `/publishers?page=${page}&limit=${limit}`, method: "GET" },
                { rel: "create", href: `/publishers`, method: "POST" }
            ]
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
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10);
        const offset = (page - 1) * limit;

        if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
            return res.status(400).json({ success: false, message: "Page and limit must be positive integers." });
        }

        const publisher = await Publisher.findByPk(publisherId);
        if (!publisher) {
            return res.status(404).json({ success: false, message: 'Publisher not found.' });
        }

        const totalItems = await BookEdition.count({ where: { publisherId } });

        const editions = await BookEdition.findAll({
            where: { publisherId },
            limit,
            offset,
            attributes: ['UUID', 'title', 'coverImage', 'publicationDate', 'pageNumber'],
            include: [
                {
                    model: Work,
                    attributes: ['totalReviews', 'averageLiteraryRating', 'seriesId', 'seriesOrder'],
                    include: [
                        {
                            model: BookInSeries,
                            as: 'BookInSeries',
                            attributes: ['seriesId', 'seriesName', 'seriesDescription']
                        },
                        {
                            model: BookAuthor,
                            as: 'BookAuthors',
                            attributes: ['personId'],
                            include: [
                                { model: Person, as: 'Person', attributes: ['personId', 'personName'] }
                            ]
                        }
                    ]
                },
                {
                    model: BookContributor,
                    include: [
                        {
                            model: Person,
                            attributes: ['personId', 'personName']
                        },
                        {
                            model: Role,
                            attributes: ['roleName']
                        }
                    ]
                }
            ],
            order: [['publicationDate', 'DESC']]
        });

        const formattedEditions = editions.map(edition => ({
            UUID: edition.UUID,
            title: edition.title,
            coverImage: edition.coverImage,
            publicationDate: edition.publicationDate,
            pageNumber: edition.pageNumber,
            workDetails: edition.Work ? {
                totalReviews: edition.Work.totalReviews,
                averageLiteraryRating: edition.Work.averageLiteraryRating,
                author: edition.Work.BookAuthors.map(author => ({
                    personId: author.Person.personId,
                    personName: author.Person.personName
                })),
                series: edition.Work.BookInSeries ? {
                    seriesId: edition.Work.BookInSeries.seriesId,
                    seriesName: edition.Work.BookInSeries.seriesName,
                    seriesDescription: edition.Work.BookInSeries.seriesDescription,
                    seriesOrder: edition.Work.seriesOrder
                } : null
            } : null,
            contributors: edition.bookContributors ? edition.bookContributors.map(contributor => ({
                personId: contributor.Person.personId,
                personName: contributor.Person.personName,
                roles: contributor.Role ? contributor.Role.roleName : null
            })) : []
        }));

        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            success: true,
            totalItems,
            totalPages,
            currentPage: page,
            editions: formattedEditions
        });
    } catch (error) {
        console.error("Error fetching editions by publisher:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while fetching editions" });
    }
};


/**
 * Update a publisher's name by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updatePublisher = async (req, res) => {
    try {
        const { publisherId } = req.params;
        const { publisherName } = req.body;

        // Validate publisher name
        if (!publisherName) {
            return res.status(400).json({ success: false, message: 'Publisher name is required.' });
        }

        // Check if the publisher exists
        const publisher = await Publisher.findByPk(publisherId);
        if (!publisher) {
            return res.status(404).json({ success: false, message: 'Publisher not found.', publisherId });
        }

        // Check for duplicate publisher name
        const existingPublisher = await Publisher.findOne({ where: { publisherName } });
        if (existingPublisher && existingPublisher.publisherId !== publisherId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Publisher with this name already exists.', 
                publisherName 
            });
        }

        // Update publisher name
        publisher.publisherName = publisherName;
        await publisher.save();

        return res.status(200).json({
            success: true,
            message: 'Publisher name updated successfully.',
            publisher,
            links: [
                { rel: "self", href: `/publishers/${publisher.publisherId}`, method: "GET" },
                { rel: "delete", href: `/publishers/${publisher.publisherId}`, method: "DELETE" },
                { rel: "modify", href: `/publishers/${publisher.publisherId}`, method: "PUT" },
            ]
        });
    } catch (error) {
        console.error("Error updating publisher:", error);
        if (error instanceof ValidationError) {
            return res.status(400).json({ 
                success: false, 
                message: error.errors.map(e => e.message) 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: error.message || "Some error occurred while updating the publisher." 
            });
        }
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
            return res.status(404).json({ success: false, message: 'Publisher not found.', publisherId });
        }

        // Check if the publisher has any associated book editions
        const associatedEditionsCount = await BookEdition.count({ where: { publisherId } });
        if (associatedEditionsCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete publisher with associated book editions.',
                publisherId,
                links: [{ rel: 'self', href: `/publishers/${publisherId}/editions`, method: 'GET' }]
            });
        }

        // Delete the publisher
        await publisher.destroy();
        return res.status(200).json({ success: true, message: 'Publisher deleted successfully.' });
    } catch (error) {
        console.error("Error deleting publisher:", error);
        return res.status(500).json({ success: false, message: error.message || "Some error occurred while deleting the publisher." });
    }
};
