const db = require("../models/db.js");
const Person = db.person;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize
const Author = db.author

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
exports.findPerson = async (req, res) =>  {
    try{
        let person = await Person.findByPk(req.params.personId)
        if (person === null){
            return res.status(404).json({
                success: false,
                msg: `No person found with id ${req.params.personId}`
            })
        }
        return res.json({
            success: true, 
            data:person,
            links:  [
                { "rel": "self", "href": `/persons/${person.personId}`, "method": "GET" },
                { "rel": "delete", "href": `/persons/${person.personId}`, "method": "DELETE" },
                { "rel": "modify", "href": `/persons/${person.personId}`, "method": "PUT" },
            ],
        })
    } catch(err) {
        return  res.status(400).json({message: err.message || "Some error ocurred"})
    }
}