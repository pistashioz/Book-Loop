const db = require('../models');
const Genre = db.genre;
const { ValidationError, Op } = require('sequelize');

// Retrieve all genres from the database
exports.findGenres = async (req, res) => {
    try {
        const genres = await Genre.findAll(); // Wait for the promise to resolve
        return res.status(200).json(genres);
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Some error occurred while retrieving genres'
        });
    }
};

// Retrieve a specific genre by name from the database
exports.findGenre = async (req, res) => {
    try {
        const genreName = req.params.genreName.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const genre = await Genre.findOne({ where: { genreName: { [Op.eq]: genreName } } });

        if (!genre) {
            return res.status(404).json({
                success: false,
                message: `No genre found named ${req.params.genreName}`
            });
        }

        return res.json({
            success: true,
            data: genre,
            links: [
                { rel: 'self', href: `/genres/${genre.genreName}`, method: 'GET' },
                { rel: 'delete', href: `/genres/${genre.genreName}`, method: 'DELETE' },
                { rel: 'modify', href: `/genres/${genre.genreName}`, method: 'PUT' }
            ]
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message || 'Some error occurred while retrieving the genre'
        });
    }
};
