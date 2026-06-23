const { verifyHandle } = require('./codeforcesService');

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

describe('codeforcesService - verifyHandle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user data when handle exists', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        status: 'OK',
        result: [{
          handle: 'tourist',
          rating: 3979,
          rank: 'legendary grandmaster',
          avatar: 'https://userpic.codeforces.org/tourist.jpg',
        }],
      }),
    });

    const result = await verifyHandle('tourist');

    expect(result).toEqual({
      handle: 'tourist',
      rating: 3979,
      rank: 'legendary grandmaster',
      avatar: 'https://userpic.codeforces.org/tourist.jpg',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://codeforces.com/api/user.info?handles=tourist',
      expect.objectContaining({ signal: expect.any(Object) })
    );
  });

  it('should return null rating and "Unrated" rank for unrated users', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        status: 'OK',
        result: [{
          handle: 'newuser123',
          avatar: 'https://userpic.codeforces.org/newuser.jpg',
        }],
      }),
    });

    const result = await verifyHandle('newuser123');

    expect(result.rating).toBeNull();
    expect(result.rank).toBe('Unrated');
  });

  it('should throw HANDLE_NOT_FOUND when CF returns FAILED status', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        status: 'FAILED',
        comment: 'handles: User with handle nonexistent not found',
      }),
    });

    await expect(verifyHandle('nonexistent')).rejects.toMatchObject({
      code: 'HANDLE_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw EXTERNAL_SERVICE_UNAVAILABLE when fetch fails (network error)', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(verifyHandle('somehandle')).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });

  it('should throw EXTERNAL_SERVICE_UNAVAILABLE on abort/timeout', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    fetch.mockRejectedValue(abortError);

    await expect(verifyHandle('somehandle')).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      statusCode: 503,
      message: expect.stringContaining('timed out'),
    });
  });
});
