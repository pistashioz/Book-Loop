const db = require("../models/db.js");
const Genre = db.genre;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize


exports.findGenres = async (req, res) => {
    try {
        const genres = await Genre.findAll(); // Wait for the promise to resolve
        return res.status(200).send(genres);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}
exports.findGenre = async (req, res) => {
    try {
        const genreName = req.params.genreName.replace(/-/g, " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        let genre = await Genre.findOne({ where: { genreName: { [Op.eq]: genreName} } });
        if (genre === null){
            return res.status(404).json({
                success: false,
                msg: `No genre found named ${req.params.genreName}`
            })
        }
        return res.json({
            success: true, 
            data:genre,
            links:  [
                { "rel": "self", "href": `/genres/${genre.genreName}`, "method": "GET" },
                { "rel": "delete", "href": `/genres/${genre.genreName}`, "method": "DELETE" },
                { "rel": "modify", "href": `/genres/${genre.genreName}`, "method": "PUT" },
            ],
        })
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}