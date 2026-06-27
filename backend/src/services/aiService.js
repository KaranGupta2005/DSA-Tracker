const config = require('../config');
const { callGemini } = require('./aiProviders/geminiProvider');
const { callGroq } = require('./aiProviders/groqProvider');
const { callOpenRouter } = require('./aiProviders/openrouterProvider');
const { createAppError } = require('../middleware/errorHandler');

/**
 * Returns the ordered provider chain with availability status.
 * A provider is considered available if its API key is configured.
 * @returns {Array<{name: string, available: boolean}>}
 */
function getProviderChain() {
  return [
    { name: 'gemini', available: !!config.geminiApiKey },
    { name: 'groq', available: !!config.groqApiKey },
    { name: 'openrouter', available: !!config.openrouterApiKey },
  ];
}

/**
 * Calls AI with multi-provider fallback chain: Gemini → Groq → OpenRouter.
 * Each provider has a 10-second timeout. If all fail, returns a generic
 * unavailability error without exposing provider names.
 *
 * @param {string} prompt - The prompt to send to the AI provider
 * @returns {Promise<string>} The AI-generated text response
 * @throws {Error} AI_SERVICE_UNAVAILABLE if all providers fail
 */
async function callAI(prompt) {
  const providers = [
    { key: config.groqApiKey, fn: callGroq },
    { key: config.geminiApiKey, fn: callGemini },
    { key: config.openrouterApiKey, fn: callOpenRouter },
  ];

  for (const provider of providers) {
    if (!provider.key) {
      continue;
    }

    try {
      const result = await provider.fn(prompt, provider.key);
      return result;
    } catch (err) {
      // Provider failed, log and try next one in the chain
      console.error(`[AI] Provider failed:`, err.message);
      continue;
    }
  }

  throw createAppError(
    'AI_SERVICE_UNAVAILABLE',
    'AI service is temporarily unavailable. Please try again later.'
  );
}

/**
 * Builds the prompt for AI performance report generation from member data.
 * @param {object} memberData - Object containing topic stats, difficulty distribution, recent submissions
 * @param {object} memberData.stats - {easy, medium, hard}
 * @param {object} memberData.tags - {tagName: count, ...}
 * @param {Array} memberData.recentSubmissions - Last 50 accepted submissions
 * @returns {string} The formatted prompt string
 */
function buildReportPrompt(memberData) {
  const { stats, tags, recentSubmissions } = memberData;

  const statsStr = `Easy: ${stats.easy || 0}, Medium: ${stats.medium || 0}, Hard: ${stats.hard || 0}`;

  const tagsStr = Object.entries(tags || {})
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `${tag}: ${count}`)
    .join(', ');

  const submissionsStr = (recentSubmissions || [])
    .slice(0, 50)
    .map((s) => `${s.title} (${s.difficulty || 'unknown'})`)
    .join(', ');

  return `Analyze this competitive programmer's performance and provide a structured report in JSON format:

Stats: {${statsStr}}
Tags: {${tagsStr}}
Recent submissions: [${submissionsStr}]

Respond ONLY with JSON in this exact format:
{
  "assessment": "overall assessment text",
  "strengths": ["tag1", "tag2"],
  "weaknesses": ["tag1", "tag2"],
  "recommendations": "improvement recommendations",
  "problems": [{"title": "...", "difficulty": "...", "tags": ["..."]}],
  "roadmap": [{"phase": "Phase 1", "description": "..."}]
}

Rules:
- assessment: a detailed overall assessment (non-empty string)
- strengths: 1 to 5 tags the user is strong in
- weaknesses: 1 to 5 tags the user is weak in
- recommendations: specific practice recommendations referencing weak tags
- problems: 3 to 5 recommended problems with title, difficulty, and tags fields
- roadmap: 2 to 4 phased improvement plan entries with phase and description fields`;
}

/**
 * Validates the structure of a parsed AI performance report.
 * @param {object} report - The parsed report object
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateReport(report) {
  const errors = [];

  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['Report must be a non-null object'] };
  }

  // assessment: non-empty string
  if (typeof report.assessment !== 'string' || report.assessment.trim().length === 0) {
    errors.push('assessment must be a non-empty string');
  }

  // strengths: array of 1-5 strings
  if (!Array.isArray(report.strengths)) {
    errors.push('strengths must be an array');
  } else if (report.strengths.length < 1 || report.strengths.length > 5) {
    errors.push('strengths must have 1 to 5 items');
  } else if (!report.strengths.every((s) => typeof s === 'string' && s.trim().length > 0)) {
    errors.push('all strengths must be non-empty strings');
  }

  // weaknesses: array of 1-5 strings
  if (!Array.isArray(report.weaknesses)) {
    errors.push('weaknesses must be an array');
  } else if (report.weaknesses.length < 1 || report.weaknesses.length > 5) {
    errors.push('weaknesses must have 1 to 5 items');
  } else if (!report.weaknesses.every((s) => typeof s === 'string' && s.trim().length > 0)) {
    errors.push('all weaknesses must be non-empty strings');
  }

  // recommendations: non-empty string
  if (typeof report.recommendations !== 'string' || report.recommendations.trim().length === 0) {
    errors.push('recommendations must be a non-empty string');
  }

  // problems: array of 3-5 objects with title field
  if (!Array.isArray(report.problems)) {
    errors.push('problems must be an array');
  } else if (report.problems.length < 3 || report.problems.length > 5) {
    errors.push('problems must have 3 to 5 items');
  } else if (!report.problems.every((p) => p && typeof p === 'object' && typeof p.title === 'string' && p.title.trim().length > 0)) {
    errors.push('all problems must be objects with a non-empty title field');
  }

  // roadmap: array of 2-4 objects with phase and description fields
  if (!Array.isArray(report.roadmap)) {
    errors.push('roadmap must be an array');
  } else if (report.roadmap.length < 2 || report.roadmap.length > 4) {
    errors.push('roadmap must have 2 to 4 items');
  } else if (!report.roadmap.every((r) =>
    r && typeof r === 'object' &&
    typeof r.phase === 'string' && r.phase.trim().length > 0 &&
    typeof r.description === 'string' && r.description.trim().length > 0
  )) {
    errors.push('all roadmap items must have non-empty phase and description fields');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generates a performance report for a member using AI.
 * Collects member's topic stats, difficulty distribution, and recent submissions,
 * builds a prompt, calls AI, and parses/validates the structured response.
 *
 * @param {object} member - The member document from MongoDB
 * @returns {Promise<object>} The validated report object
 * @throws {Error} INSUFFICIENT_DATA if member has < 10 solved problems with tags
 * @throws {Error} AI_SERVICE_UNAVAILABLE if all AI providers fail
 * @throws {Error} VALIDATION_ERROR if AI response cannot be parsed or is invalid
 */
async function generateReport(member) {
  // Check if member has sufficient data (at least 10 solved problems with tags)
  const tags = member.leetcodeStats?.tags || {};
  // Convert Map or object to plain entries
  const tagEntries = tags instanceof Map ? Object.fromEntries(tags) : tags;
  const totalTaggedProblems = Object.values(tagEntries).reduce((sum, count) => sum + count, 0);

  if (totalTaggedProblems < 10) {
    throw createAppError(
      'INSUFFICIENT_DATA',
      'Insufficient data for meaningful analysis. You need at least 10 solved problems with associated tags.',
      { minimum: 10, current: totalTaggedProblems }
    );
  }

  // Build member data for prompt
  const memberData = {
    stats: {
      easy: member.leetcodeStats?.easy || 0,
      medium: member.leetcodeStats?.medium || 0,
      hard: member.leetcodeStats?.hard || 0,
    },
    tags: tagEntries,
    recentSubmissions: member.recentSubmissions || [],
  };

  // Build the prompt
  const prompt = buildReportPrompt(memberData);

  // Call AI
  const rawResponse = await callAI(prompt);

  // Parse the JSON response
  let report;
  try {
    // Try to extract JSON from the response (handle cases where AI adds extra text)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    report = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Failed to parse AI response into structured report.',
      { rawResponse: rawResponse.substring(0, 200) }
    );
  }

  // Validate the parsed report structure
  const validation = validateReport(report);
  if (!validation.valid) {
    throw createAppError(
      'VALIDATION_ERROR',
      'AI response does not meet required structure.',
      { validationErrors: validation.errors }
    );
  }

  return report;
}

module.exports = { callAI, getProviderChain, generateReport, validateReport, buildReportPrompt };
