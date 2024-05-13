const db = require("../models/db.js");
const BookAuthor = db.bookAuthor;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize

// find all authors
exports.findAuthors = async (req, res) => {
    try {
        const authors = await BookAuthor.findAll({
            include: [{
                model: db.person,
                attributes: ['personName']
            },
        {
            model: db.work,
            attributes: ['originalTitle']
        }]
        }); // Wait for the promise to resolve
        if (authors.length === 0) {
            return res.status(200).json({
                success: true,
                msg: 'No authors found.',
                data: []
            });
        }

        res.status(200).json({
            success: true,
            data: authors
        });
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}
// find a single author
exports.findAuthor = async (req, res) => {
    try {
        console.log(req.params.personId)
        let author = await BookAuthor.findOne({where: {workId: {[Op.eq]: req.params.workId}},
            include: [{
                model: db.person,
                attributes: ['personName']
            },
        {
            model: db.work,
            attributes: ['originalTitle']
        }]})
        console.log(author)
        if (author === null){
            return res.status(404).json({
                success: false,
                msg: `No author found for work with id ${req.params.workId}`
            })
        }
        return res.json({
            success: true, 
            data:author
        })
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}