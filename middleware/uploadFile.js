const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware para upload da imagem de perfil
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

// Middleware para upload das fotos da listagem
const uploadListingPhotos = (req, res, next) => {
  if (req.method === 'POST') {
    upload.array('photos', 8)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: 'Error uploading files', error: err.message });
      }
      next();
    });
  } else {
    next();
  }
};

module.exports = { uploadProfilePicture, uploadListingPhotos };
