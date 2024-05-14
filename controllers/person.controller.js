const db = require('../models');
const Person = db.person;
const { ValidationError, Op } = require('sequelize'); // necessary for model validations using sequelize

// Find all persons
exports.findAll = async (req, res) => {
    try {
        const persons = await Person.findAll(); // Wait for the promise to resolve
        return res.status(200).json({
            success: true,
            data: persons
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message || "Some error occurred"
        });
    }
};

// Create a new person
exports.create = async (req, res) => {
    try {
        const { roles } = req.body; 
        const validRoles = ['translator', 'author'];
        const rolesArray = roles.split(',').map(role => role.trim().toLowerCase());

        // Validate roles
        for (const role of rolesArray) {
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: "Invalid role" });
            }
        }

        const newPerson = await Person.create(req.body);
        res.status(201).json({
            success: true,
            msg: 'New Person created',
            URL: `/authors/${newPerson.personId}`
        });
    } catch (err) {
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({
                message: err.message || "Some error occurred while creating the person"
            });
        }
    }
};

// Find a person by ID
exports.findPerson = async (req, res) => {
    try {
        const person = await Person.findByPk(req.params.personId);
        if (person === null) {
            return res.status(404).json({
                success: false,
                msg: `No person found with id ${req.params.personId}`
            });
        }
        return res.status(200).json({
            success: true,
            data: person,
            links: [
                { "rel": "self", "href": `/persons/${person.personId}`, "method": "GET" },
                { "rel": "delete", "href": `/persons/${person.personId}`, "method": "DELETE" },
                { "rel": "modify", "href": `/persons/${person.personId}`, "method": "PUT" }
            ]
        });
    } catch (err) {
        return res.status(400).json({ message: err.message || "Some error occurred" });
    }
};

// Update a person by ID
exports.updatePerson = async (req, res) => {
    try {
        const affectedRows = await Person.update(req.body, { where: { personId: req.params.personId } });
        if (affectedRows[0] === 0) {
            return res.status(200).json({
                success: true,
                msg: `No updates were made on person with ID ${req.params.personId}`
            });
        }
        return res.json({
            success: true,
            msg: `Person with ID ${req.params.personId} was updated successfully.`
        });
    } catch (err) {
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({
                success: false, msg: err.message || "Some error occurred while updating the person."
            });
        }
    }
};

// Remove a person by ID
exports.removePerson = async (req, res) => {
    try {
        const personId = req.params.personId;
        const found = await Person.destroy({ where: { personId } });
        if (found === 1) {
            return res.status(204).json({
                success: true,
                msg: `Person with id ${personId} was successfully deleted!`
            });
        }
        return res.status(404).json({
            success: false, msg: `Cannot find any person with ID ${personId}`
        });
    } catch (err) {
        return res.status(400).json({ message: err.message || 'Invalid or incomplete data provided.' });
    }
};
