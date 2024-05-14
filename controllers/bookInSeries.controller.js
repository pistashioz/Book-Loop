const db = require('../models');
const { BookInSeries, Work } = db;
const { ValidationError, Op } = require('sequelize');

// Retrieve all books in series
exports.find = async (req, res) => {
    try {
        const books = await BookInSeries.findAll();
        return res.status(200).json(books);
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Some error occurred while retrieving books in series'
        });
    }
};

// Retrieve all works for a specific series
exports.findAll = async (req, res) => {
    try {
        const seriesId = parseInt(req.params.seriesId);

        if (!seriesId) {
            return res.status(404).json({ message: 'Invalid series ID' });
        }

        const worksFound = await Work.findAll({ where: { seriesId: { [Op.eq]: seriesId } } });

        if (!worksFound.length) {
            return res.status(404).json({ message: 'Books in series not found' });
        }

        return res.status(200).json(worksFound);
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({ success: false, message: error.errors.map(e => e.message) });
        } else {
            return res.status(500).json({
                message: error.message || 'Some error occurred while retrieving works in series'
            });
        }
    }
};

// Create a new book in series
exports.create = async (req, res) => {
    try {
        const newBookInSeries = await BookInSeries.create(req.body);
        console.log('NEW BOOK IN SERIES:', newBookInSeries);

        res.status(201).json({
            success: true,
            message: 'New book in series created',
            bookInSeries: newBookInSeries
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({ success: false, message: error.errors.map(e => e.message) });
        } else {
            return res.status(500).json({
                message: error.message || 'Some error occurred while creating the book in series'
            });
        }
    }
};
