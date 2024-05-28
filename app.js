// Import required libraries and middleware
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

require('dotenv').config(); // Load environment variables from .env file at the start

// Initialize the express application
const app = express();

// Configure host and port from environment variables or use defaults
const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 3360;

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));


// Middleware to parse JSON body data in incoming requests
app.use(express.json());

// Middleware to parse cookie data in incoming requests
 app.use(cookieParser());

 // Prevent TRACE method to protect against XST attacks
app.use((req, res, next) => {
  if (req.method === "TRACE") {
      res.status(405).send("TRACE method is disabled.");
  } else {
      next();
  }
});

// Import and initialize the cron jobs
require('./cronJobs/tokenCleanup'); 
require('./cronJobs/suspensionCleanup'); 

// Define a basic route to check the server status
app.get('/', (req, res) => {
  res.status(200).send('Welcome to Book Loop API!');
});

// Import and use resource routes
const userRoutes = require('./routes/users.routes'); 
app.use('/users', userRoutes); 

const wishlistRoutes = require('./routes/wishlist.routes');
app.use('/wishlist', wishlistRoutes);

const adminRoutes = require('./routes/admin.routes');
app.use('/admin', adminRoutes);

const listingRoutes = require('./routes/listings.routes');
 app.use('/listings', listingRoutes);

const worksRoutes = require('./routes/works.routes');
app.use('/works', worksRoutes);

const bookInSeriesRoutes = require('./routes/bookInSeries.routes');
app.use('/book-in-series', bookInSeriesRoutes);

/* const bookEditionRoutes = require('./routes/bookEdition.routes');
app.use('/book', bookEditionRoutes); */

const publisherRoutes = require('./routes/publisher.routes');
app.use('/publishers', publisherRoutes);

/* const bookAuthorRoutes = require('./routes/bookAuthor.routes');
app.use('/authors', bookAuthorRoutes); */

const personRoutes = require('./routes/person.routes');
app.use('/persons', personRoutes);

/* const bookContributorRoutes = require('./routes/bookContributor.routes');
app.use('/contributors', bookContributorRoutes);
 */
const genreRoutes = require('./routes/genre.routes');
app.use('/genres', genreRoutes);

/* const bookGenreRoutes = require('./routes/bookGenre.routes');
app.use('/book-genres', bookGenreRoutes); */

// Catch-all for any unhandled routes, sending a 404 response
app.all('*', (req, res) => {
  res.status(404).send('Resource not found. Please check the URL.');
});

// Start the server on the configured host and port
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});