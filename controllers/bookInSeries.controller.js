const db = require("../models/db.js");
const BookInSeries = db.bookInSeries;
const works = db.work;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize


exports.find = async (req, res) => {
    try {
        const books = await BookInSeries.findAll(); // Wait for the promise to resolve
        return res.status(200).send(books);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}

exports.findAll = async (req, res) => {
    try {
        if (!parseInt(req.params.seriesId)){
            return res.status(404).json({error:  "Invalid series ID"});
        }
        const  worksFound = await works.findAll({where:{seriesId: {[Op.eq]: req.params.seriesId}}});
        if (worksFound){
            return res.status(200).json(worksFound);
        }
        res.status(404).json({error: 'Book in Series not found'})
    }
    catch (err) {
        if (err instanceof ValidationError)
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        else
            res.status(500).json({
                message: err.message || "Some error occurred while creating the Work."
            });
    }
}
exports.create = async (req, res) => {
    try {
        const newBookInSeries = await BookInSeries.create(req.body);
        console.log('NEW BOOK:', newBookInSeries)
        res.status(201).json({success: true, msg: 'New Series created'});
    } catch(err) {
        if (err instanceof ValidationError) {
            res.status(400).json({success: false, message: err.errors.map(e => e.message)})
        }
        else {
            res.status(500).json({message: err.message || "Some error occurred while creating the Series"})
        }
    }
}
