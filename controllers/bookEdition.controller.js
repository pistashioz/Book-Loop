const db = require("../models/db.js");
const BookEdition = db.bookEdition;
const { ValidationError, ForeignKeyConstraintError  } = require('sequelize'); //necessary for model validations using sequelize
exports.findAll = async (req, res) => {
    try {
        const bookEdition = await BookEdition.findAll(); // Wait for the promise to resolve
        return res.status(200).send(bookEdition);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
};

exports.create = async (req, res) => {
    try {
        const { workId, publisherId } = req.body; 
        console.log(req.body)
        if (!parseInt(publisherId)) {
            return res.status(400).json({ error: "Invalid publisher ID" });
        }
        else if (!parseInt(workId)) {
            return res.status(400).json({ error: "Invalid Work ID" });
        }

        const newBookEdition = await BookEdition.create(req.body);
        console.log('NEW BOOK EDITION:', newBookEdition)
        res.status(201).json({success: true, msg: 'New Book Edition created', URL: `/book-editions/${newBookEdition.ISBN}`});
    } catch(err) {
        if (err instanceof ValidationError) {
            res.status(400).json({success: false, message: err.errors.map(e => e.message)})
        } else if (err instanceof ForeignKeyConstraintError) {
            res.status(400).json({ success: false, message: "Invalid Publisher ID provided" });
          } 
        else {
            res.status(500).json({message: err.message || "Some error occurred while creating the book edition"})
        }
    }
}

