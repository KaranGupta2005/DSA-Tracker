const fetch = require('node-fetch');
const { createAppError } = require('../middleware/errorHandler');

/**
 * Verifies that a Codeforces handle exists by calling the user.info API endpoint.
 * @param {string} handle - The Codeforces handle to verify
 * @returns {Promise<{handle: string, rating: number|null, rank: string, avatar: string}>}
 */
const verifyHandle = async (handle) => {
  let response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    response = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createAppError(
        'EXTERNAL_SERVICE_UNAVAILABLE',
        'Codeforces API request timed out. Please try again later.'
      );
    }
    throw createAppError(
      'EXTERNAL_SERVICE_UNAVAILABLE',
      'Unable to reach Codeforces API. Please try again later.'
    );
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    throw createAppError(
      'HANDLE_NOT_FOUND',
      `Codeforces handle "${handle}" was not found.`
    );
  }

  const user = data.result[0];

  return {
    handle: user.handle,
    rating: user.rating || null,
    rank: user.rank || 'Unrated',
    avatar: user.avatar || '',
  };
};

module.exports = { verifyHandle };
