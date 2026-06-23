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

// CORS configuration - allow all origins
app.use(cors({
  origin: true,
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
  res.json({ message: 'IEEE DTU DSA Tracker API is running', uptime: process.uptime() });
});

// Self-ping to keep Render free tier alive (pings every 14 minutes)
const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_PING_URL;
if (SELF_PING_URL) {
  const fetch = require('node-fetch');
  setInterval(async () => {
    try {
      await fetch(SELF_PING_URL);
      console.log(`[Keep-alive] Pinged ${SELF_PING_URL}`);
    } catch (err) {
      console.log('[Keep-alive] Ping failed:', err.message);
    }
  }, 14 * 60 * 1000); // every 14 minutes
}

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

const { seedHeadAdmin } = require('./utils/seedAdmin');

// Connect to Database and start server
connectDB().then(async () => {
  // Seed Head Admin on startup if not exists
  await seedHeadAdmin();

  // Drop unique index on DailyProblem.date if it exists (we now allow multiple per day)
  try {
    const mongoose = require('mongoose');
    const collection = mongoose.connection.collection('dailyproblems');
    const indexes = await collection.indexes();
    const dateIndex = indexes.find(idx => idx.key && idx.key.date && idx.unique);
    if (dateIndex) {
      await collection.dropIndex(dateIndex.name);
      console.log('Dropped unique index on DailyProblem.date — multiple problems per day enabled.');
    }
  } catch (err) {
    // Index might not exist — that's fine
  }

  if (require.main === module) {
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);

      // Start contest notification scheduler — checks every 30 minutes
      const { notifyUpcomingContests } = require('./services/pushNotificationService');
      const { getUpcomingContests } = require('./services/contestService');

      const checkAndNotify = async () => {
        try {
          // First refresh the contest cache
          await getUpcomingContests();
          // Then check for upcoming contests and notify
          const result = await notifyUpcomingContests();
          if (result.notified > 0) {
            console.log(`[Contest Notifier] Sent ${result.notified} notifications for ${result.contests} contest(s)`);
          }
        } catch (err) {
          console.error('[Contest Notifier] Error:', err.message);
        }
      };

      // Run every 30 minutes
      setInterval(checkAndNotify, 30 * 60 * 1000);
      // Also run once on startup after a short delay
      setTimeout(checkAndNotify, 10000);
    });
  }
});

module.exports = app;
