const db = require('../models');
const BookGenre = db.bookGenre;
const { ValidationError, Op } = require('sequelize');

// Retrieve all book genres
exports.findAll = async (req, res) => {
    try {
        const bookGenres = await BookGenre.findAll();
        return res.status(200).json(bookGenres);
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Some error occurred while retrieving book genres'
        });
    }
};

// Retrieve genres for a specific work
exports.findBookGenre = async (req, res) => {
    try {
        const genres = await BookGenre.findAll({
            where: { workId: { [Op.eq]: req.params.workId } },
            include: [{
                model: db.genre,
                attributes: ['genreName']
            }]
        });

        if (genres.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No genre found for work with id ${req.params.workId}`
            });
        }

        return res.status(200).json({
            success: true,
            data: genres
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Some error occurred while retrieving genres for the specified work'
        });
    }
};
