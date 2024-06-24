const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadProfilePicture = (req, res, next) => {
  if (req.query.type === 'profile' && req.method === 'PATCH') {
    upload.single('profilePicture')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: 'Error uploading file', error: err.message });
      }
      next();
    });
  } else {
    next();
  }
};

module.exports = uploadProfilePicture;
