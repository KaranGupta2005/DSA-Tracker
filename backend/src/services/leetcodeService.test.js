const { verifyUsername } = require('./leetcodeService');

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

describe('leetcodeService - verifyUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return username and ranking when user exists', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        data: {
          matchedUser: {
            username: 'leetcoder123',
            profile: {
              realName: 'John Doe',
              ranking: 5000,
            },
          },
        },
      }),
    });

    const result = await verifyUsername('leetcoder123');

    expect(result).toEqual({
      username: 'leetcoder123',
      ranking: 5000,
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://leetcode.com/graphql',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: expect.any(Object),
      })
    );
  });

  it('should return null ranking when profile ranking is missing', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        data: {
          matchedUser: {
            username: 'newuser',
            profile: {},
          },
        },
      }),
    });

    const result = await verifyUsername('newuser');

    expect(result.username).toBe('newuser');
    expect(result.ranking).toBeNull();
  });

  it('should throw HANDLE_NOT_FOUND when matchedUser is null', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        data: { matchedUser: null },
      }),
    });

    await expect(verifyUsername('nonexistent')).rejects.toMatchObject({
      code: 'HANDLE_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw HANDLE_NOT_FOUND when data is missing', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ errors: [{ message: 'not found' }] }),
    });

    await expect(verifyUsername('baduser')).rejects.toMatchObject({
      code: 'HANDLE_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw EXTERNAL_SERVICE_UNAVAILABLE on network error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(verifyUsername('someuser')).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });

  it('should throw EXTERNAL_SERVICE_UNAVAILABLE on abort/timeout', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    fetch.mockRejectedValue(abortError);

    await expect(verifyUsername('someuser')).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      statusCode: 503,
      message: expect.stringContaining('timed out'),
    });
  });
});
