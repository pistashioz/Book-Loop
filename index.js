require('dotenv').config(); // read environment variables from .env file
const express = require('express');
const cors = require('cors'); // middleware to enable CORS (Cross-Origin Resource Sharing)
const app = express();
const { notFoundHandler }  = require('./middlewares/errorHandlers')


const port = process.env.PORT; // use environment variables
const host = process.env.HOST;
app.use(cors()); //enable ALL CORS requests (client requests from other domain)
app.use(express.json()); //enable parsing JSON body data
// root route -- /api/
app.get('/', function (req, res) {
    res.status(200).json({ message: 'home -- BOOK LOOP' });
});
// Resource routes
app.use('/works', require('./routes/works.routes.js'))
app.use('/book-in-series', require('./routes/bookInSeries.routes.js'))
app.use('/book-editions', require('./routes/bookEdition.routes.js'))
app.use('/publishers', require('./routes/publisher.routes.js'))
app.use('/authors', require('./routes/bookAuthor.routes.js'))
app.use('/persons', require('./routes/person.routes.js'))
app.use('/translators', require('./routes/bookTranslator.routes.js'))
app.use('/genres', require('./routes/genre.routes.js'))
// handle invalid routes
app.use(notFoundHandler)
app.listen(port, host, () => console.log(`App listening at http://${host}:${port}/`));