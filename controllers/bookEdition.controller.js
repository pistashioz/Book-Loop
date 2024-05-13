const db = require("../models/db.js");
const BookEdition = db.bookEdition;
const { ValidationError, ForeignKeyConstraintError  } = require('sequelize'); //necessary for model validations using sequelize

// find all book editions
exports.findAll = async (req, res) => {
    try {
        const bookEditions = await BookEdition.findAll(); // Wait for the promise to resolve
        if (bookEditions.length === 0) {
            return res.status(200).json({
                success: true,
                msg: 'No book editions found.',
                data: []
            });
        }
        res.status(200).json({
            success: true,
            data: bookEditions
        });
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured" // log the error
        })
    }
};

// create a new book edition
exports.create = async (req, res) => {
    try {
        const { workId, publisherId } = req.body; 
        console.log(req.body)
        // input validation
        if (!parseInt(publisherId)) {
            return res.status(400).json({ error: "Invalid publisher ID" });
        }
        else if (!parseInt(workId)) {
            return res.status(400).json({ error: "Invalid Work ID" });
        }

        const newBookEdition = await BookEdition.create(req.body);
        res.status(201).json({
            success: true,
            msg: 'New Book Edition created',
            data: newBookEdition, 
            links: [{ rel: "self", href: `/book-editions/${newBookEdition.ISBN}`, method: "GET" }] 
        });
    } catch(err) {
        if (err instanceof ValidationError) {
            res.status(400).json({success: false, message: err.errors.map(e => e.message)}) // array of validation error messages
        } else if (err instanceof ForeignKeyConstraintError) {
            res.status(400).json({ success: false, message: "Invalid Publisher ID provided" });
          } 
        else {
            res.status(500).json({message: err.message || "Some error occurred while creating the book edition"})
        }
    }
}

