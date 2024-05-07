const db = require("../models/db.js");
const Work = db.work;
const Person = db.person
const BookEdition = db.bookEdition;
const LiteraryReview = db.literaryReview;
const { ValidationError, ForeignKeyConstraintError, Op  } = require('sequelize'); //necessary for model validations using sequelize
exports.findAll = async (req, res) => {
    try {
        const works = await Work.findAll(); // Wait for the promise to resolve
        return res.status(200).send(works);
    }
    catch (error) {
        return res.status(400).send({
            message: error.message || "Some error occured"
        })
    }
}
exports.create = async (req, res) => {
    try {
        const { originalTitle, firstPublishedDate, averageLiteraryRating, seriesId, seriesOrder } = req.body;

        const newWork = await Work.create({
            originalTitle,
            firstPublishedDate,
            averageLiteraryRating,
            seriesId,
            seriesOrder
        });

        res.status(201).json({
            success: true,
            message: 'New work created successfully',
            work: newWork
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create new work'
        });
    }
}
exports.findWork = async(req, res) => {
    try{
        const workId = req.params.workId
        const found = await Work.findOne({where:{workId}})
        if(!found)
            throw new Error('No work with that ID')
        return res.status(200).json(found)
    } catch(err) {
        return  res.status(400).json({message: err.message || "Some error ocurred"})
    }
}

exports.updateWorkById = async (req, res) => {
    try {
        const workId = req.params.workId
        const updatedData = req.body
        const found = await Work.findOne({where:{workId}}) //let tutorial = findByPk(req.params.id)
        if(!found){
            res.status(404).json({
                success: false,
                message: "Work not found."
            });
        }
        /*
        
        */ 
        await Work.update(updatedData, {where: {workId}})
        res.status(200).json({message: "Work data updated successfully", work: updatedData})
        
    }
    catch(err) {
        return res.status(400).json({message: err.message || 'Invalid or incomplete data provided.'});
    }
}

exports.removeWorkById = async (req, res) => {
    try {
        const workId = req.params.workId
        const found = await Work.findOne({where:{workId}})
        if(!found){
            res.status(404).json({
                success: false,
                message: "Work not found."
            });
        }
        await Work.destroy({where: {workId}})
        res.status(204).json({message: "Work delete successfully"})
        
    }
    catch(err) {
        return res.status(400).json({message: err.message || 'Invalid or incomplete data provided.'});
    }
}

exports.getEditions = async (req, res) => {
    try {
      const { workId } = req.params;
      console.log(workId)
      if (!workId) {
        return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
      }
      const foundEditions = await BookEdition.findAll({
        where: { workId: { [Op.eq]: workId } } 
      });
      if (foundEditions.length === 0) {
        return res.status(404).json({ success: false, message: "No book editions found for this work" });
      }
      return res.status(200).json({ success: true, editions: foundEditions });
    } catch(err) {
      return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving book editions" });
    }
  }
//ESTA A DAR ERRO!!!!!!! PERGUNTAR À PROF, NO POST NÃO COLOCAR O WORK ID
  exports.addEdition = async (req, res) => {
    try {
        const { workId } = req.params; 
        console.log('WORKID: ', workId)
        if (!workId) {
            return res.status(400).json({ success: false, message: "workId is required in the query parameters" });
        }
        const foundWork = await Work.findOne({ where: { workId: {[Op.eq]: workId }} });
        if (!foundWork) {
            return res.status(404).json({ success: false, message: "Book not found" });
        }
        const workIdInt = parseInt(workId, 10);

        if (isNaN(workIdInt)) {
            return res.status(400).json({ success: false, message: "workId must be a valid integer" });
        }

        const { ISBN, publisherId, title, synopsis, editionType, publicationDate, language, pageNumber, coverImage } = req.body;
        const publicationDateObj = new Date(publicationDate);
        console.log(typeof(ISBN),typeof(publisherId), typeof(title), typeof(synopsis), typeof(editionType), typeof(publicationDateObj), typeof(language), typeof(pageNumber), typeof(coverImage))
        
        const newBookEdition = await BookEdition.create({ ISBN, workId: workIdInt, publisherId, title, synopsis, editionType, publicationDate: publicationDateObj, language, pageNumber, coverImage });

        res.status(201).json({
            success: true,
            message: 'New book edition created successfully',
            book: newBookEdition
        });
        console.log('NEW BOOK EDITION',newBookEdition)
         /*
      
        req.body.workId = foundWork.workId; 
        console.log('Full Request Body:', req.body);
       
        const newBookEdition = await BookEdition.create({bookEditionId, workId, publisherId, title, synopsis, editionType, publicationDate, language, pageNumber, coverImage});
        console.log('NEW BOOK EDITION:', newBookEdition)

    
        const existingEdition = await BookEdition.findOne({where: {ISBN: req.body.bookEditionId}})
        if (existingEdition){
            return res.status(400).json({success: false, message: "This edition already exists in this work"})
        }
        else if (err instanceof ForeignKeyConstraintError) {
            res.status(400).json({ success: false, message: "Invalid Publisher ID provided" }); 
        } 
        res.status(201).json({success: true, msg: 'New Book Edition created', URL: `/book-editions/${newBookEdition.ISBN}`});
        */
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
  }

  exports.getBookEdition = async(req, res) => {
    try{
        console.log('PARAMS',req.params)
        console.log(req.params.bookEditionId)
        const bookEdition = await BookEdition.findOne({ 
            where: { 
                workId: { [Op.eq]: req.params.workId }, 
                ISBN: req.params.bookEditionId  
            } 
        });
        if (!bookEdition){
            return res.status(404).json({ success: false, message: "Book not found" });
        }
        return res.status(200).json(bookEdition)
    }
    catch(err){
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
  }

  exports.updateBookEdition = async(req, res) =>{
    try {
        const {workId, bookEditionId }= req.params
        const updatedData = req.body
        console.log(updatedData)
        /*Executing (default): SELECT `ISBN`, `workId`, `publisherId`, `title`, `synopsis`, `editionType`, `publicationDate`, `language`, `pageNumber`, `coverImage` FROM `bookEdition` AS `bookEdition` WHERE `bookEdition`.`workId` = '2' AND `bookEdition`.`ISBN` = '978-0316489634';
Executing (default): UPDATE `bookEdition` SET `ISBN`=?,`workId`=?,`publisherId`=?,`title`=?,`synopsis`=?,`editionType`=?,`publicationDate`=?,`language`=?,`pageNumber`=?,`coverImage`=? WHERE `workId` = '2' AND `ISBN` = ? MAS OS DADOS ESTÃO A SER ATUALIZADOS NA MESMA*/ 
        const found = await BookEdition.findOne({where:{workId: { [Op.eq]: workId }, ISBN: bookEditionId  }})
        if(!found){
            res.status(404).json({
                success: false,
                message: "Book Edition not found."
            });
        }
        await BookEdition.update(updatedData, {where: {workId: { [Op.eq]: workId }, ISBN: bookEditionId  }})
        res.status(200).json({message: "Book data updated successfully", book: updatedData})
        
    }
    catch (err){
        if (err.name === 'ValidationError'){
            return res.status(400).json({success:false, message: 'Invalid or incomplete data provided'});
        }
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
  }

  exports.removeBookEdition = async(req, res) => {
    try {
        const {workId, bookEditionId }= req.params
        const dataToDelete = req.body
        console.log(dataToDelete)
        const found = await BookEdition.findOne({where:{workId: { [Op.eq]: workId }, ISBN: bookEditionId  }})
        if(!found){
            res.status(404).json({
                success: false,
                message: "Book Edition not found."
            });
        }
        await BookEdition.destroy({where: {workId: { [Op.eq]: workId }, ISBN: bookEditionId  }})
        res.status(204).json({message: "Book Edition deleted successfully", book: dataToDelete})
        
    }
    catch (err){
        if (err.name === 'ValidationError'){
            return res.status(400).json({success:false, message: 'Invalid or incomplete data provided'});
        }
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the book edition" });
    }
  }

