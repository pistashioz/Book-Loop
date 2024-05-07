const db = require("../models/db.js");
const Publisher = db.publisher;
const Work = db.work;
const BookEdition = db.bookEdition;
const { ValidationError, Op  } = require('sequelize'); //necessary for model validations using sequelize


exports.findAll = async (req, res) => {
    try {
        const publishers = await Publisher.findAll(); // Wait for the promise to resolve
        return res.status(200).send(publishers);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}

exports.findPublishersWorks = async (req, res) => {
    try {
        if (!parseInt(req.params.publisherId)){
            return res.status(404).json({error:  "Invalid publisher ID"});
        }
        const  worksFound = await BookEdition.findAll({where:{publisherId: {[Op.eq]: req.params.publisherId}}});
        if (worksFound){
            return res.status(200).json(worksFound);
        }
        res.status(404).json({error: 'Works from publisher not found'})
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
        const { publisherId } = req.body; 
        console.log(req.body)
        if (!parseInt(publisherId)) {
            return res.status(400).json({ error: "Invalid publisher ID" });
        }
        const newPublisher = await Publisher.create(req.body);
        console.log('NEW PUBLISHER:', newPublisher)
        res.status(201).json({success: true, msg: 'New Publisher created', URL: `/book-in-series/${newPublisher.publisherId}`});
    } catch(err) {
        if (err instanceof ValidationError) {
            res.status(400).json({success: false, message: err.errors.map(e => e.message)})
        }
        else {
            res.status(500).json({message: err.message || "Some error occurred while creating the publisher"})
        }
    }
}
