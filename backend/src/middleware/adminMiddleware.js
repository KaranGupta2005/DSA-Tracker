/**
 * Admin authorization middleware.
 * Must be used AFTER authMiddleware (requires req.user to be set).
 * Checks that the authenticated user has the 'admin' role.
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Admin privileges are required for this action.',
        details: {},
      },
    });
  }

  next();
};

module.exports = adminMiddleware;
