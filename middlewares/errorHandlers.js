exports.notFoundHandler = (req, res) => {
    res.status(404).json({ message: 'The requested resource could not be found.' });
};