const fetch = require('node-fetch');
const { createAppError } = require('../middleware/errorHandler');

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

/**
 * Verifies that a LeetCode username exists by calling the LeetCode GraphQL API.
 * @param {string} username - The LeetCode username to verify
 * @returns {Promise<{username: string, ranking: number|null}>}
 */
const verifyUsername = async (username) => {
  let response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query {
          matchedUser(username: "${username}") {
            username
            profile {
              realName
              ranking
            }
          }
        }`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createAppError(
        'EXTERNAL_SERVICE_UNAVAILABLE',
        'LeetCode API request timed out. Please try again later.'
      );
    }
    throw createAppError(
      'EXTERNAL_SERVICE_UNAVAILABLE',
      'Unable to reach LeetCode API. Please try again later.'
    );
  }

  const data = await response.json();

  if (!data.data || !data.data.matchedUser) {
    throw createAppError(
      'HANDLE_NOT_FOUND',
      'LeetCode username not found.'
    );
  }

  const user = data.data.matchedUser;

  return {
    username: user.username,
    ranking: user.profile?.ranking || null,
  };
};

module.exports = { verifyUsername };
