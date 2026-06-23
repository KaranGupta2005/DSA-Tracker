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
    { key: config.geminiApiKey, fn: callGemini },
    { key: config.groqApiKey, fn: callGroq },
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
      // Provider failed, try next one in the chain
      continue;
    }
  }

  throw createAppError(
    'AI_SERVICE_UNAVAILABLE',
    'AI service is temporarily unavailable. Please try again later.'
  );
}

module.exports = { callAI, getProviderChain };
