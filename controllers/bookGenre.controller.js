const db = require("../models/db.js");
const BookGenre = db.bookGenre;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize


exports.findAll = async (req, res) => {
    try {
        const bookGenres = await BookGenre.findAll(); // Wait for the promise to resolve
        return res.status(200).send(bookGenres);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}
exports.findBookGenre = async (req, res) => {
    try {
        let genre = await BookGenre.findAll({ where: { workId: { [Op.eq]: req.params.workId} } ,
            include: [{
                model: db.genre,
                attributes: ['genreName']
            }]});
        if (genre === null){
            return res.status(404).json({
                success: false,
                msg: `No genre found for work with id ${req.params.workId}`
            })
        }
        return res.json({
            success: true, 
            data:genre,
        })
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}