const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./db/db');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const codeforcesRoutes = require('./routes/codeforcesRoutes');
const leetcodeRoutes = require('./routes/leetcodeRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const contestRoutes = require('./routes/contestRoutes');
const dailyRoutes = require('./routes/dailyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const sessionPrepRoutes = require('./routes/sessionPrepRoutes');

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/codeforces', codeforcesRoutes);
app.use('/api/leetcode', leetcodeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/session-prep', sessionPrepRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Connect to Database and start server
connectDB().then(() => {
  if (require.main === module) {
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  }
});

module.exports = app;
