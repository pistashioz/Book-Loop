require('dotenv').config(); // read environment variables from .env file
const express = require('express');
const cors = require('cors'); // middleware to enable CORS (Cross-Origin Resource Sharing)
const app = express();
const { notFoundHandler }  = require('./middlewares/errorHandlers')
// Define CORS options
const corsOptions = {
    origin: ['http://localhost:3000'], // Allow requests from this origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow these HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
  };

const port = process.env.PORT; // use environment variables
const host = process.env.HOST;
app.use(cors(corsOptions)); //enable ALL CORS requests (client requests from other domain)
app.use(cors())
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
app.use('/contributors', require('./routes/bookContributor.routes.js'))
app.use('/genres', require('./routes/genre.routes.js'))
app.use('/book-genres', require('./routes/bookGenre.routes.js'))
// handle invalid routes
app.use(notFoundHandler)
app.listen(port, host, () => console.log(`App listening at http://${host}:${port}/`));