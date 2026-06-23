const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./db/db');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const { generalRateLimit } = require('./middleware/rateLimitMiddleware');
const authRoutes = require('./routes/authRoutes');
const codeforcesRoutes = require('./routes/codeforcesRoutes');
const leetcodeRoutes = require('./routes/leetcodeRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const contestRoutes = require('./routes/contestRoutes');
const dailyRoutes = require('./routes/dailyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const sessionPrepRoutes = require('./routes/sessionPrepRoutes');

const app = express();

// CORS configuration - allow frontend origin
app.use(cors({
  origin: config.frontendOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json());

// Global rate limiting (100 requests per 15 min per IP)
// AI endpoints have their own stricter rate limit (10 requests per 15 min) applied at route level
app.use('/api', generalRateLimit);

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

// Global error handler (must be last middleware)
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
