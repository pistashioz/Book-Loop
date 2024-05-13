const db = require("../models/db.js");
const BookContributor = db.bookContributor;
const { Op  } = require('sequelize'); //necessary for model validations using sequelize
// find all contributors
exports.findAllContributors = async (req, res) => {
    try {
        const contributors = await BookContributor.findAll({
            include: [{
                model: db.person,
                attributes: ['personName']
            }],
        }); 
        if (contributors.length === 0) {
            return res.status(200).json({
                success: true,
                msg: 'No contributors found.',
                data: []
            });
        }
        console.log(contributors)
        // Wait for the promise to resolve
        res.status(200).json({
            success: true,
            data: contributors
        });
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }

}
// find contributors of a book edition
exports.findContributors = async (req, res) => {
    try {
        let contributor = await BookContributor.findAll({where: {editionISBN: {[Op.eq]: req.params.bookEditionId}},
            include: [{
                model: db.bookEdition,
                attributes: ['title']
            }, {
                model: db.person,
                attributes: ['personName', 'roles']
            }]})
        if (contributor === null){
            return res.status(404).json({
                success: false,
                msg: `No contributor found with id ${req.params.personId}`
            })
        }
        return res.json({
            success: true, 
            data:contributor,
        })
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}