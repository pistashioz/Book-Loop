const db = require("../models/db.js");
const Person = db.person;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize


exports.findAll = async (req, res) => {
    try {
        const persons = await Person.findAll(); // Wait for the promise to resolve
        return res.status(200).send(persons);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}

exports.create = async (req, res) => {
    try {
        const { roles } = req.body; 
        if (roles.toLowerCase() !== 'translator' && roles.toLowerCase() !== 'author') {
            return res.status(400).json({ error: "Invalid role" }); 
        }
        const newPerson = await Person.create(req.body);
        console.log('NEW AUTHOR:', newPerson)
        res.status(201).json({success: true, msg: 'New Person created', URL: `/authors/${newPerson.personId}`});
    } catch(err) {
        if (err instanceof ValidationError) {
            res.status(400).json({success: false, message: err.errors.map(e => e.message)})
        }
        else {
            res.status(500).json({message: err.message || "Some error occurred while creating the person"})
        }
    }
}
