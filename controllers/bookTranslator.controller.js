const db = require("../models/db.js");
const BookTranslator = db.bookTranslator;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize

//ta a dar  "message": "Unknown column 'bookTranslator.editionISBN' in 'field list'"
exports.findTranslators = async (req, res) => {
    try {
        const translators = await BookTranslator.findAll({
            include: [{
                model: db.person,
                attributes: ['personName']
            }]
        }); // Wait for the promise to resolve
        return res.status(200).send(translators);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}
exports.findTranslator = async (req, res) => {
    try {
        let translator = await BookTranslator.findOne({where: {personId: {[Op.eq]: req.params.personId}}})
        if (translator === null){
            return res.status(404).json({
                success: false,
                msg: `No translator found with id ${req.params.personId}`
            })
        }
        return res.json({
            success: true, 
            data:translator,
            links:  [
                { "rel": "self", "href": `/translators/${translator.personId}`, "method": "GET" },
                { "rel": "delete", "href": `/translators/${translator.personId}`, "method": "DELETE" },
                { "rel": "modify", "href": `/translators/${translator.personId}`, "method": "PUT" },
            ],
        })
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}