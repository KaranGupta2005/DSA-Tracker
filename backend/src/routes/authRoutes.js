const express = require('express');
const router = express.Router();
const { register } = require('../controllers/authController');

// POST /api/auth/register - Register a new member
router.post('/register', register);

module.exports = router;
