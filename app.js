// Import required libraries and middleware
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config(); // Load environment variables from .env file at the start

// Initialize the express application
const app = express();

// Configure host and port from environment variables or use defaults
const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

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


// Define a basic route to check the server status
app.get('/', (req, res) => {
  res.status(200).send('Welcome to Book Loop API!');
});

// Import and use user routes from the users.routes.js file
const userRoutes = require('./routes/users.routes'); // Ensure path accuracy
app.use('/users', userRoutes); // Mount the user routes at '/users' endpoint

// Catch-all for any unhandled routes, sending a 404 response
app.all('*', (req, res) => {
  res.status(404).send('Resource not found. Please check the URL.');
});

// Start the server on the configured host and port
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
