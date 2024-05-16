const db = require('../models');
const { BookInSeries, Work } = db;
const { ValidationError, Op } = require('sequelize');


/**
 * Create a new book series.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and data
 */
exports.createSeries = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { seriesName, seriesDescription, works } = req.body;

        // Validate seriesName
        if (!seriesName) {
            return res.status(400).json({ success: false, message: "Series name cannot be empty!" });
        }

        // Check if series already exists
        const existingSeries = await BookInSeries.findOne({ where: { seriesName } });
        if (existingSeries) {
            return res.status(400).json({
                success: false,
                message: "Series already exists.",
                links: [{ rel: 'self', href: `/series/${existingSeries.seriesId}`, method: 'GET' }]
            });
        }

        // Create new series
        const newSeries = await BookInSeries.create({ seriesName, seriesDescription }, { transaction: t });

        // Handle associations with works if provided
        let invalidWorkEntries = [];
        if (works) {
            for (const work of works) {
                const { workId, seriesOrder } = work;
                if (!workId || !seriesOrder) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: "Both workId and seriesOrder are required." });
                    continue; // Skip invalid entries
                }
                const workInstance = await Work.findByPk(workId);
                if (!workInstance) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: `Work with ID ${workId} not found.` });
                    continue; // Skip invalid entries
                }
                if (workInstance.seriesId) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: `Work with ID ${workId} is already associated with a series.` });
                    continue; // Skip invalid entries
                }
                await workInstance.update({ seriesId: newSeries.seriesId, seriesOrder }, { transaction: t });
            }
        }

        await t.commit();

        const response = {
            success: true,
            message: 'New series created successfully.',
            series: newSeries,
            links: [{ rel: 'self', href: `/series/${newSeries.seriesId}`, method: 'GET' }]
        };

        if (invalidWorkEntries.length > 0) {
            response.invalidWorkEntries = invalidWorkEntries;
        }

        res.status(201).json(response);
    } catch (err) {
        await t.rollback();
        console.error("Error creating series:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: err.message || "Some error occurred while creating the series." });
        }
    }
};



/**
 * Update a book series by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.updateSeries = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { seriesId } = req.params;
        const { seriesName, seriesDescription, works } = req.body;

        // Check if the series exists
        const series = await BookInSeries.findByPk(seriesId);
        if (!series) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }

        // Update series name if provided and differs from current name
        let seriesNameUpdated = false;
        if (seriesName && seriesName !== series.seriesName) {
            const existingSeries = await BookInSeries.findOne({ where: { seriesName } });
            if (existingSeries && existingSeries.seriesId !== seriesId) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Series name already exists.",
                    links: [{ rel: 'self', href: `/series/${existingSeries.seriesId}`, method: 'GET' }]
                });
            }
            series.seriesName = seriesName;
            seriesNameUpdated = true;
        }

        // Update series description if provided
        if (seriesDescription !== undefined) {
            series.seriesDescription = seriesDescription;
        }

        // Update associations with works if provided and differ from current associations
        let worksUpdated = false;
        let invalidWorkEntries = [];
        if (works) {
            // Update works associations
            await Work.update({ seriesId: null, seriesOrder: null }, { where: { seriesId }, transaction: t }); // Remove old associations
            for (const work of works) {
                const { workId, seriesOrder } = work;
                console.log(`the seriesOrder is ${seriesOrder} and the workId is ${workId}`);
                if (!workId || !seriesOrder) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: "Both workId and seriesOrder are required." });
                    continue; // Skip invalid entries
                }
                const workInstance = await Work.findByPk(workId);
                console.log(`the workinstance is ${workInstance} and the workId is ${workId} and the seriesOrder`);
                if (!workInstance) {
                    invalidWorkEntries.push({ workId, seriesOrder, message: `Work with ID ${workId} not found.` });
                    continue; // Skip invalid entries
                }
                // Ensure `seriesOrder` is set correctly
                console.log(`2nd check: the seriesOrder is ${seriesOrder} and the workId is ${workId}`);
                await workInstance.update({ seriesId, seriesOrder }, { transaction: t });
            }
            worksUpdated = true;
        }

        // Save the series if name was updated
        if (seriesNameUpdated || seriesDescription !== undefined) {
            await series.save({ transaction: t });
        }

        // Commit the transaction
        await t.commit();

        // Re-fetch the updated series including its associations
        const updatedSeries = await BookInSeries.findByPk(seriesId, {
            include: [{ model: Work, raw: true }]
        });

        // Determine the response message
        let message = 'Series updated successfully.';
        if (!seriesNameUpdated && seriesDescription === undefined && !worksUpdated) {
            message = 'No changes made to the series.';
        }

        // Add the HATEOAS links for the associated works
        updatedSeries.Works.forEach(work => {
            work.dataValues.links = [{ rel: "self", href: `/works/${work.workId}`, method: "GET" }];
        });

        const response = {
            success: true,
            message,
            series: updatedSeries,
            links: [{ rel: 'self', href: `/series/${seriesId}`, method: 'GET' }]
        };

        if (invalidWorkEntries.length > 0) {
            response.invalidWorkEntries = invalidWorkEntries;
        }

        res.status(200).json(response);
    } catch (err) {
        await t.rollback();
        console.error("Error updating series:", err);
        if (err instanceof ValidationError) {
            res.status(400).json({ success: false, message: err.errors.map(e => e.message) });
        } else {
            res.status(500).json({ success: false, message: err.message || "Some error occurred while updating the series." });
        }
    }
};


/**
 * Delete a book series by ID.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} JSON response with success status and message
 */
exports.deleteSeries = async (req, res) => {
    try {
        const { seriesId } = req.params;

        // Check if the series exists
        const series = await BookInSeries.findByPk(seriesId);
        if (!series) {
            return res.status(404).json({ success: false, message: 'Series not found.' });
        }

        // Check if the series has any associated works
        const associatedWorksCount = await Work.count({ where: { seriesId } });
        if (associatedWorksCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete series with associated works.',
                links: [{ rel: 'self', href: `/series/${seriesId}/works`, method: 'GET' }]
            });
        }

        // Delete the series
        await series.destroy();
        res.status(204).json({ success: true, message: 'Series deleted successfully.' });
    } catch (error) {
        console.error("Error deleting series:", error);
        res.status(500).json({ success: false, message: error.message || "Some error occurred while deleting the series." });
    }
};

