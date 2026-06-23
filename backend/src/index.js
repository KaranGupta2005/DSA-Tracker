const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./db/db');
const config = require('./config');

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendOrigin,
  credentials: true,
}));
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'IEEE DTU DSA Tracker API is running' });
});

// Connect to Database and start server
connectDB().then(() => {
  if (require.main === module) {
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  }
});

module.exports = app;
