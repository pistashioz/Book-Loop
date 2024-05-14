const db = require('../models');
const BookAuthor = db.bookAuthor;
const { ValidationError, Op } = require('sequelize');

/**
 * Find all authors.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.findAuthors = async (req, res) => {
    try {
        const authors = await BookAuthor.findAll({
            include: [
                {
                    model: db.person,
                    attributes: ['personName']
                },
                {
                    model: db.work,
                    attributes: ['originalTitle']
                }
            ]
        });

        if (authors.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No authors found.',
                data: []
            });
        }

        res.status(200).json({
            success: true,
            data: authors
        });
    } catch (error) {
        console.error("Error fetching authors:", error);
        return res.status(400).json({
            message: error.message || "Some error occurred while fetching authors."
        });
    }
};

/**
 * Find a single author by work ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.findAuthor = async (req, res) => {
    try {
        const { workId } = req.params;

        if (!parseInt(workId)) {
            return res.status(400).json({ error: "Invalid work ID" });
        }

        const author = await BookAuthor.findOne({
            where: { workId: { [Op.eq]: workId } },
            include: [
                {
                    model: db.person,
                    attributes: ['personName']
                },
                {
                    model: db.work,
                    attributes: ['originalTitle']
                }
            ]
        });

        if (!author) {
            return res.status(404).json({
                success: false,
                message: `No author found for work with ID ${workId}`
            });
        }

        res.status(200).json({
            success: true,
            data: author
        });
    } catch (error) {
        console.error("Error fetching author:", error);
        return res.status(400).json({
            message: error.message || "Some error occurred while fetching the author."
        });
    }
};
