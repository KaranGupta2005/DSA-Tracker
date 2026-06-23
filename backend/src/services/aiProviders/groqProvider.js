const fetch = require('node-fetch');

/**
 * Calls Groq API with a 10-second timeout.
 * @param {string} prompt - The prompt to send to Groq
 * @param {string} apiKey - Groq API key
 * @returns {Promise<string>} The generated text response
 */
async function callGroq(prompt, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    if (!text) {
      throw new Error('Groq returned empty response');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callGroq };
