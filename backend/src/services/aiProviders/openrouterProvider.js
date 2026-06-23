const fetch = require('node-fetch');

/**
 * Calls OpenRouter API with a 10-second timeout.
 * @param {string} prompt - The prompt to send to OpenRouter
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<string>} The generated text response
 */
async function callOpenRouter(prompt, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (!text) {
      throw new Error('OpenRouter returned empty response');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callOpenRouter };
