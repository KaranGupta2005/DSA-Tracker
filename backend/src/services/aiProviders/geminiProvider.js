const fetch = require('node-fetch');

/**
 * Calls Google Gemini API with a 10-second timeout.
 * @param {string} prompt - The prompt to send to Gemini
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} The generated text response
 */
async function callGemini(prompt, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callGemini };
