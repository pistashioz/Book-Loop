const db = require("../models/db.js");
const Work = db.work;
const Person = db.person
const BookEdition = db.bookEdition;
const LiteraryReview = db.literaryReview;
const LiteraryComments = db.commentReview
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
      console.log('here')
      const foundEditions = await BookEdition.findAll({
        where: { workId: { [Op.eq]: workId } } 
    })
    console.log('nop')
      if (foundEditions.length === 0) {
        return res.status(404).json({ success: false, message: "No book editions found for this work" });
      }
      return res.status(200).json({ success: true, editions: foundEditions });
    } catch(err) {
      return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving book editions" });
    }
  }
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

        const newBookEdition = await BookEdition.create({ ISBN, workId: workIdInt, publisherId, title, synopsis, editionType, publicationDate: publicationDateObj, language, pageNumber, coverImage });

        res.status(201).json({
            success: true,
            message: 'New book edition created successfully',
            book: newBookEdition
        });
        console.log('NEW BOOK EDITION',newBookEdition)
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

exports.getReviews = async (req, res) => {
    try {
        let reviews = await LiteraryReview.findAll({
            where: { // Add both conditions
                workId: { [Op.eq]: req.params.workId }
            },
            raw: true 
        })
        reviews.forEach(review => {
            review.links = [
                { "rel": "self", "href": `/works/${review.workId}/reviews/${review.literaryReviewId}`, "method": "GET" },
                { "rel": "delete", "href": `/works/${review.workId}/reviews/${review.literaryReviewId}`, "method": "DELETE" },
                { "rel": "modify", "href": `/works/${review.workId}/reviews/${review.literaryReviewId}`, "method": "PUT" },
            ]
        })
        res.status(200).json({
            success: true,
            data: reviews,
            links: [{ "rel": "add-literary-review", "href": `/works/${req.params.workId}/reviews/`, "method": "POST" }] 
        });
    }
    catch (err) {
        res.status(500).json({
            success: false, msg: err.message || "Some error occurred while retrieving the reviews."
        })
    }
}
exports.addReview = async (req, res) => {
    try{
        let work = await Work.findByPk(req.params.workId)
        console.log('work:', work)
        if (work === null){
            return res.status(404).json({success:false,msg:`No work found with id ${req.params.workId}`})
        }
        let review = req.body
        console.log('review:' , review)
        const newReview = await LiteraryReview.create({
            workId: req.params.workId,
            userId: req.body.userId,
            LiteraryReview: req.body.LiteraryReview,
            literaryRating: req.body.literaryRating
        });

        return res.status(201).json({
            success: true,
            msg: `Review created successfully`,
            data: newReview 
        });
    }
    catch (err) {
        res.status(500).json({
            success: false, msg: `Error adding review ${req.body}.`
        });
    }
}
exports.updateReview = async(req, res) => {
    try{
        let affectedRows = await LiteraryReview.update(req.body, {where: {literaryReviewId: req.params.literaryReviewId}})
        if (affectedRows[0] === 0){
            return res.status(200).json({
                success: true,
                msg: `No updates were made on review with ID ${req.params.literaryReviewId}.`
            })
        }
        return res.json({
            success: true,
            msg: `Review with ID ${req.params.literaryReviewId} was updated successfully.`
        })
    }
    catch(err){
        if (err instanceof ValidationError)
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        else
            res.status(500).json({
                success: false, msg: err.message || "Some error occurred while updating the review."
            });
    }
}

exports.getReview = async(req, res) => {
    try{
        const review = await LiteraryReview.findOne({ 
            where: {  
                literaryReviewId: req.params.literaryReviewId  
            } ,
            raw: true 
        });
        if (!review){
            return res.status(404).json({ success: false, message: "Review not found" });
        }
        res.status(200).json({
            success: true,
            data: review,
            links: [{ "rel": "add-review", "href": `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}`, "method": "POST" }] 
        });
    }
    catch(err){
        return res.status(500).json({ success: false, message: err.message || "Some error occurred while retrieving the review" });
    }
  }
exports.deleteReview = async(req, res)=>{
    try {
        let result = await db.literaryReview.destroy({where: {literaryReviewId: req.params.literaryReviewId }})
        if (result === 1){
            return res.status(200).json({
                success: true, 
                msg: `Review with id ${req.params.literaryReviewId} was successfully deleted!`
            });
        }
        return res.status(404).json({
            success: false, msg: `Cannot find any review with ID ${req.params.literaryReviewId}`
        })
    }
    catch (err) {
        res.status(500).json({
            success: false, msg: `Error deleting tutorial with ID ${req.params.idT}.`
        });
    };  
}
exports.getReviewsComments = async(req, res)=>{
    try {
        let comments = await LiteraryComments.findAll({
            where: {
                literaryReviewId: {[Op.eq]: req.params.literaryReviewId}
            },
            raw: true 
        })
        comments.forEach(comment => {
            comment.links = [
                { "rel": "self", "href": `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments/${comment.commentId}`, "method": "GET" },
                { "rel": "delete", "href": `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments/${comment.commentId}`, "method": "DELETE" },
                { "rel": "modify", "href": `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments/${comment.commentId}`, "method": "PUT" },
            ]
        })
        res.status(200).json({
            success: true,
            data: comments,
            links: [{ "rel": "add-comment-review", "href": `/works/${req.params.workId}/reviews/${req.params.literaryReviewId}/comments`, "method": "POST" }] 
        });
    }
    catch (err) {
        res.status(500).json({
            success: false, msg: err.message || "Some error occurred while retrieving the comments."
        })
    }
}

exports.addCommentToReview = async (req, res) => {
    try{
        let work = await Work.findByPk(req.params.workId)
        let review = await LiteraryReview.findByPk(req.params.literaryReviewId)
        console.log('work:',work)
        console.log('review: ',review)
        if (work === null || review === null){
            return res.status(404).json({success:false,msg:`No work found with id ${req.params.workId}`})
        }
        let comment = req.body
        console.log('comment:' , comment)
        console.log(Work)
        const newComment = await LiteraryComments.create({
            workId: req.params.workId,
            literaryReviewId: req.params.literaryReviewId,
            userId: req.body.userId,
            comment: req.body.comment,
        });
        console.log(newComment)
        return res.status(201).json({
            success: true,
            msg: `Comment created successfully`,
            data: newComment 
        });
    }
    catch (err) {
        res.status(500).json({
            success: false, msg: `Error adding comment ${req.body}.`
        });
    }
}
exports.editCommentOfReview = async(req, res) => {
    try{
        let affectedRows = await LiteraryComments.update(req.body, {where: {commentId: req.params.commentId}})
        if (affectedRows[0] === 0){
            return res.status(200).json({
                success: true,
                msg: `No updates were made on tutorial with ID ${req.params.commentId}.`
            })
        }
        return res.json({
            success: true,
            msg: `Comment with ID ${req.params.commentId} was updated successfully.`
        })
    }
    catch(err){
        if (err instanceof ValidationError)
            res.status(400).json({ success: false, msg: err.errors.map(e => e.message) });
        else
            res.status(500).json({
                success: false, msg: err.message || "Some error occurred while updating the comment."
            });
    }
}

exports.removeCommentFromReview = async(req, res) => {
    try {
        let result = await LiteraryComments.destroy({where: {commentId: req.params.commentId}})
        if (result === 1){
            return res.status(200).json({
                success: true, 
                msg: `Comment with ID ${req.params.commentId} was successfully deleted!`
            });
        }
        return res.status(404).json({
            success: false, msg: `Cannot find any comment with ID ${req.params.commentId}`
        })
    }
    catch (err) {
        res.status(500).json({
            success: false, msg: `Error deleting comment with ID ${req.params.commentId}.`
        });
    };
}