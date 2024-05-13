const db = require("../models/db.js");
const BookAuthor = db.bookAuthor;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize


exports.findAuthors = async (req, res) => {
    try {
        const authors = await BookAuthor.findAll({
            include: [{
                model: db.person,
                attributes: ['personName']
            }]
        }); // Wait for the promise to resolve
        return res.status(200).send(authors);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}
exports.findAuthor = async (req, res) => {
    try {
        console.log(req.params.personId)
        let author = await BookAuthor.findOne({where: {personId: {[Op.eq]: req.params.personId}}})
        console.log(author)
        if (author === null){
            return res.status(404).json({
                success: false,
                msg: `No author found with id ${req.params.personId}`
            })
        }
        return res.json({
            success: true, 
            data:author,
            links:  [
                { "rel": "self", "href": `/authors/${author.personId}`, "method": "GET" },
                { "rel": "delete", "href": `/authors/${author.personId}`, "method": "DELETE" },
                { "rel": "modify", "href": `/authors/${author.personId}`, "method": "PUT" },
            ],
        })
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}