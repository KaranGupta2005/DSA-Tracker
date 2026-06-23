const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Authentication middleware that verifies JWT tokens.
 * Attaches decoded user info (memberId, role, status) to req.user.
 * Denies access to pending members on protected routes.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required. Please provide a valid token.',
        details: {},
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    req.user = {
      memberId: decoded.memberId,
      role: decoded.role,
      status: decoded.status,
    };

    // Deny access to pending members
    if (decoded.status === 'pending') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Your account is pending approval. Access to this resource is restricted until an admin approves your registration.',
          details: { status: 'pending' },
        },
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Invalid or expired token. Please log in again.',
        details: {},
      },
    });
  }
};

module.exports = authMiddleware;
