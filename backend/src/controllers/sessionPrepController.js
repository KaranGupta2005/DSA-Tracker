const sessionPrepService = require('../services/sessionPrepService');
const { createAppError } = require('../middleware/errorHandler');

/**
 * GET /api/session-prep/curriculum
 * Returns the structured curriculum with categories and modules.
 */
const getCurriculum = async (req, res, next) => {
  try {
    const curriculum = sessionPrepService.getCurriculum();
    res.status(200).json(curriculum);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/session-prep/progress
 * Returns the authenticated member's session progress.
 */
const getProgress = async (req, res, next) => {
  try {
    const memberId = req.user.memberId;
    const progress = await sessionPrepService.getProgress(memberId);
    res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/session-prep/complete
 * Marks a module as complete for the authenticated member.
 * Body: { moduleId: string }
 */
const completeModule = async (req, res, next) => {
  try {
    const { moduleId } = req.body;

    if (!moduleId || typeof moduleId !== 'string' || moduleId.trim().length === 0) {
      throw createAppError(
        'VALIDATION_ERROR',
        'Module ID is required and must be a non-empty string.',
        { fields: ['moduleId'] }
      );
    }

    const memberId = req.user.memberId;
    const progress = await sessionPrepService.completeModule(memberId, moduleId.trim());
    res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/session-prep/timeline
 * Returns milestones from the current month through September 2026.
 */
const getTimeline = async (req, res, next) => {
  try {
    const timeline = sessionPrepService.getTimeline(new Date());
    res.status(200).json(timeline);
  } catch (err) {
    next(err);
  }
};

module.exports = { getCurriculum, getProgress, completeModule, getTimeline };
