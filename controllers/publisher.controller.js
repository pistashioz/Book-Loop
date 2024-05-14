const db = require('../models');
const { Publisher, Work, BookEdition } = db;
const { ValidationError, Op } = require('sequelize');

// Retrieve all publishers
exports.findAll = async (req, res) => {
    try {
        const publishers = await Publisher.findAll();
        res.status(200).json(publishers);
    } catch (error) {
        console.error("Error fetching publishers:", error);
        res.status(400).json({ message: error.message || "Some error occurred while fetching publishers" });
    }
};

// Retrieve works by a specific publisher
exports.findPublishersWorks = async (req, res) => {
    try {
        const publisherId = parseInt(req.params.publisherId, 10);
        if (isNaN(publisherId)) {
            return res.status(400).json({ error: "Invalid publisher ID" });
        }

        const worksFound = await BookEdition.findAll({
            where: { publisherId }
        });

        if (worksFound.length === 0) {
            return res.status(404).json({ error: 'No works found for this publisher' });
        }

        res.status(200).json(worksFound);
    } catch (error) {
        console.error("Error fetching works for publisher:", error);
        if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ message: error.message || "Some error occurred while fetching the works" });
        }
    }
};

// Create a new publisher
exports.create = async (req, res) => {
    try {
        const newPublisher = await Publisher.create(req.body);
        console.log('NEW PUBLISHER:', newPublisher);
        res.status(201).json({
            success: true,
            msg: 'New Publisher created',
            URL: `/publishers/${newPublisher.publisherId}`
        });
    } catch (error) {
        console.error("Error creating publisher:", error);
        if (error instanceof ValidationError) {
            res.status(400).json({ success: false, message: error.errors.map(e => e.message) });
        } else {
            res.status(500).json({ message: error.message || "Some error occurred while creating the publisher" });
        }
    }
};
