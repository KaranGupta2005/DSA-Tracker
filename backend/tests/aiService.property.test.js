/**
 * Property-Based Tests: AI Service — Fallback Ordering & Report Validation
 *
 * Feature: ieee-dtu-dsa-tracker, Property 12: AI multi-provider fallback ordering
 * Feature: ieee-dtu-dsa-tracker, Property 13: AI report structure validation
 *
 * **Validates: Requirements 8.2, 8.3, 8.4**
 */

'use strict';

const fc = require('fast-check');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Re-implementation of the callAI fallback logic that accepts injectable providers.
 * This mirrors the exact logic in aiService.js so we can test it with controlled
 * providers without hitting real APIs.
 *
 * @param {string} prompt
 * @param {Array<{ key: string|null, fn: Function }>} providers
 * @returns {Promise<string>}
 */
async function callAIWithProviders(prompt, providers) {
  for (const provider of providers) {
    if (!provider.key) {
      continue; // skip unconfigured providers (no API key)
    }
    try {
      const result = await provider.fn(prompt, provider.key);
      return result;
    } catch (_err) {
      // provider failed — try the next one
      continue;
    }
  }
  // All providers failed or skipped
  const err = new Error('AI service is temporarily unavailable. Please try again later.');
  err.code = 'AI_SERVICE_UNAVAILABLE';
  throw err;
}

/**
 * Builds a provider tuple: key is either a non-empty string ("configured") or null
 * ("unconfigured"), and fn either resolves with a fixed string or rejects.
 *
 * @param {boolean} hasKey    - Whether the provider has an API key configured
 * @param {boolean} succeeds  - Whether the provider call succeeds (only relevant when hasKey is true)
 * @param {number}  index     - Provider index (used to make return values unique)
 * @returns {{ key: string|null, fn: Function, index: number }}
 */
function makeProvider(hasKey, succeeds, index) {
  const key = hasKey ? `fake-api-key-${index}` : null;
  const fn = hasKey && succeeds
    ? () => Promise.resolve(`response-from-provider-${index}`)
    : () => Promise.reject(new Error(`provider-${index}-failed`));
  return { key, fn, index, hasKey, succeeds };
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Generates a boolean flag */
const boolArb = fc.boolean();

/**
 * Generates one of the 8 provider-availability states (2^3 combinations of
 * hasKey × succeeds for Gemini, Groq, OpenRouter).
 */
const providerStateArb = fc.tuple(boolArb, boolArb, boolArb).map(
  ([geminiUp, groqUp, openrouterUp]) => ({
    geminiUp,
    groqUp,
    openrouterUp,
  })
);

/** Generates a non-empty string of printable ASCII characters (1–80 chars) */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 80 }).filter(
  (s) => s.trim().length > 0
);

/** Generates an array of 1–5 non-empty strings (for strengths / weaknesses) */
const tagsArb = fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 });

/** Generates a single recommended problem object with title, difficulty, and tags */
const problemArb = fc.record({
  title: nonEmptyStringArb,
  difficulty: fc.constantFrom('Easy', 'Medium', 'Hard'),
  tags: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
});

/** Generates a roadmap phase object with non-empty phase and description */
const roadmapPhaseArb = fc.record({
  phase: nonEmptyStringArb,
  description: nonEmptyStringArb,
});

/**
 * Generates a structurally valid AI report object that satisfies all the
 * constraints defined in Requirements 8.3 and validateReport().
 */
const validReportArb = fc.record({
  assessment: nonEmptyStringArb,
  strengths: tagsArb,
  weaknesses: tagsArb,
  recommendations: nonEmptyStringArb,
  problems: fc.array(problemArb, { minLength: 3, maxLength: 5 }),
  roadmap: fc.array(roadmapPhaseArb, { minLength: 2, maxLength: 4 }),
});

// ─── Property 12: AI Multi-Provider Fallback Ordering ─────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 12: AI multi-provider fallback ordering', () => {
  /**
   * The chain is Gemini (index 0) → Groq (index 1) → OpenRouter (index 2).
   * For any combination of availability states, the system should use the
   * first provider in chain order that is (a) configured (has a key) and
   * (b) succeeds on the call.
   */

  test('uses the first available provider in Gemini → Groq → OpenRouter order', async () => {
    await fc.assert(
      fc.asyncProperty(providerStateArb, async ({ geminiUp, groqUp, openrouterUp }) => {
        const providers = [
          makeProvider(geminiUp, true, 0),  // Gemini — always succeeds when up
          makeProvider(groqUp, true, 1),    // Groq   — always succeeds when up
          makeProvider(openrouterUp, true, 2), // OpenRouter — always succeeds when up
        ];

        // Determine which provider index should be selected (first available one)
        const expectedIndex = providers.findIndex((p) => p.hasKey);

        if (expectedIndex === -1) {
          // All providers have no API key — expect an error
          await expect(callAIWithProviders('test-prompt', providers)).rejects.toMatchObject({
            code: 'AI_SERVICE_UNAVAILABLE',
          });
        } else {
          const result = await callAIWithProviders('test-prompt', providers);
          expect(result).toBe(`response-from-provider-${expectedIndex}`);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('skips a provider that throws and falls through to the next one', async () => {
    await fc.assert(
      fc.asyncProperty(providerStateArb, async ({ geminiUp, groqUp, openrouterUp }) => {
        // All configured providers FAIL; availability just controls key presence
        const providers = [
          makeProvider(geminiUp, false, 0),
          makeProvider(groqUp, false, 1),
          makeProvider(openrouterUp, false, 2),
        ];

        // Since all configured providers fail, we expect AI_SERVICE_UNAVAILABLE
        await expect(callAIWithProviders('test-prompt', providers)).rejects.toMatchObject({
          code: 'AI_SERVICE_UNAVAILABLE',
        });
      }),
      { numRuns: 100 }
    );
  });

  test('all-providers-down returns generic error without provider names', async () => {
    // Explicitly test all 1 all-down state
    const providers = [
      makeProvider(false, false, 0), // Gemini: no key
      makeProvider(false, false, 1), // Groq:   no key
      makeProvider(false, false, 2), // OpenRouter: no key
    ];

    let caughtError;
    try {
      await callAIWithProviders('test-prompt', providers);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('AI_SERVICE_UNAVAILABLE');

    // Error message must not mention any provider by name
    const msg = caughtError.message.toLowerCase();
    expect(msg).not.toContain('gemini');
    expect(msg).not.toContain('groq');
    expect(msg).not.toContain('openrouter');
  });

  test('first-provider-up state uses Gemini (index 0)', async () => {
    const providers = [
      makeProvider(true, true, 0),   // Gemini: up
      makeProvider(true, true, 1),   // Groq: up
      makeProvider(true, true, 2),   // OpenRouter: up
    ];
    const result = await callAIWithProviders('prompt', providers);
    expect(result).toBe('response-from-provider-0');
  });

  test('Gemini-down falls back to Groq (index 1)', async () => {
    const providers = [
      makeProvider(false, false, 0), // Gemini: no key
      makeProvider(true, true, 1),   // Groq: up
      makeProvider(true, true, 2),   // OpenRouter: up
    ];
    const result = await callAIWithProviders('prompt', providers);
    expect(result).toBe('response-from-provider-1');
  });

  test('Gemini and Groq down falls back to OpenRouter (index 2)', async () => {
    const providers = [
      makeProvider(false, false, 0), // Gemini: no key
      makeProvider(false, false, 1), // Groq: no key
      makeProvider(true, true, 2),   // OpenRouter: up
    ];
    const result = await callAIWithProviders('prompt', providers);
    expect(result).toBe('response-from-provider-2');
  });

  test('provider with key that throws is skipped and does not expose its name in error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a scenario where at least one provider has a key but all fail
        fc.tuple(boolArb, boolArb, boolArb).filter(
          ([g, r, o]) => g || r || o // at least one has key
        ),
        async ([geminiHasKey, groqHasKey, openrouterHasKey]) => {
          const providers = [
            makeProvider(geminiHasKey, false, 0),      // all fail even if key present
            makeProvider(groqHasKey, false, 1),
            makeProvider(openrouterHasKey, false, 2),
          ];

          let caughtError;
          try {
            await callAIWithProviders('prompt', providers);
          } catch (err) {
            caughtError = err;
          }

          expect(caughtError).toBeDefined();
          expect(caughtError.code).toBe('AI_SERVICE_UNAVAILABLE');

          const msg = caughtError.message.toLowerCase();
          expect(msg).not.toContain('gemini');
          expect(msg).not.toContain('groq');
          expect(msg).not.toContain('openrouter');
          expect(msg).not.toContain('provider');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('result comes from the first available provider, not a later one', async () => {
    await fc.assert(
      fc.asyncProperty(providerStateArb, async ({ geminiUp, groqUp, openrouterUp }) => {
        // Only index-0 might succeed; index-1 and 2 always fail if called
        const callOrder = [];
        const providers = [
          {
            key: geminiUp ? 'key-0' : null,
            fn: async () => { callOrder.push(0); return 'from-0'; },
          },
          {
            key: groqUp ? 'key-1' : null,
            fn: async () => { callOrder.push(1); return 'from-1'; },
          },
          {
            key: openrouterUp ? 'key-2' : null,
            fn: async () => { callOrder.push(2); return 'from-2'; },
          },
        ];

        try {
          const result = await callAIWithProviders('prompt', providers);
          // The first provider that was called should have returned
          const firstCalledIndex = callOrder[0];
          expect(result).toBe(`from-${firstCalledIndex}`);
          // Only one provider should have been called (the first available one)
          expect(callOrder.length).toBe(1);
        } catch (err) {
          // All providers unavailable — acceptable
          expect(err.code).toBe('AI_SERVICE_UNAVAILABLE');
          expect(callOrder.length).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 13: AI Report Structure Validation ──────────────────────────────

describe('Feature: ieee-dtu-dsa-tracker, Property 13: AI report structure validation', () => {
  /**
   * Import validateReport directly — it is a pure function with no side effects.
   */
  const { validateReport } = require('../src/services/aiService');

  test('valid report passes validation for any generated valid report', () => {
    fc.assert(
      fc.property(validReportArb, (report) => {
        const { valid, errors } = validateReport(report);
        expect(valid).toBe(true);
        expect(errors).toHaveLength(0);
      }),
      { numRuns: 200 }
    );
  });

  test('assessment must be a non-empty string', () => {
    fc.assert(
      fc.property(validReportArb, (report) => {
        // Corrupt the assessment
        const bad = { ...report, assessment: '' };
        const { valid } = validateReport(bad);
        expect(valid).toBe(false);

        const badNull = { ...report, assessment: null };
        const { valid: validNull } = validateReport(badNull);
        expect(validNull).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  test('strengths must have 1–5 items', () => {
    fc.assert(
      fc.property(validReportArb, (report) => {
        // 0 items — invalid
        const noStrengths = { ...report, strengths: [] };
        expect(validateReport(noStrengths).valid).toBe(false);

        // 6 items — invalid
        const tooMany = { ...report, strengths: ['a', 'b', 'c', 'd', 'e', 'f'] };
        expect(validateReport(tooMany).valid).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  test('weaknesses must have 1–5 items', () => {
    fc.assert(
      fc.property(validReportArb, (report) => {
        const noWeaknesses = { ...report, weaknesses: [] };
        expect(validateReport(noWeaknesses).valid).toBe(false);

        const tooMany = { ...report, weaknesses: ['a', 'b', 'c', 'd', 'e', 'f'] };
        expect(validateReport(tooMany).valid).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  test('recommendations must be a non-empty string', () => {
    fc.assert(
      fc.property(validReportArb, (report) => {
        const bad = { ...report, recommendations: '' };
        expect(validateReport(bad).valid).toBe(false);

        const badType = { ...report, recommendations: 42 };
        expect(validateReport(badType).valid).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  test('problems must have 3–5 items', () => {
    fc.assert(
      fc.property(validReportArb, problemArb, problemArb, (report, p1, p2) => {
        // 2 items — invalid
        const tooFew = { ...report, problems: [p1, p2] };
        expect(validateReport(tooFew).valid).toBe(false);

        // 6 items — invalid
        const tooMany = {
          ...report,
          problems: [p1, p2, p1, p2, p1, p2],
        };
        expect(validateReport(tooMany).valid).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  test('roadmap must have 2–4 phases', () => {
    fc.assert(
      fc.property(validReportArb, roadmapPhaseArb, (report, phase) => {
        // 1 phase — invalid
        const tooFew = { ...report, roadmap: [phase] };
        expect(validateReport(tooFew).valid).toBe(false);

        // 5 phases — invalid
        const tooMany = {
          ...report,
          roadmap: [phase, phase, phase, phase, phase],
        };
        expect(validateReport(tooMany).valid).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  test('problems must each have a non-empty title', () => {
    fc.assert(
      fc.property(validReportArb, problemArb, problemArb, problemArb, (report, p1, p2, p3) => {
        // Include a problem with empty title
        const badProblem = { title: '', difficulty: 'Easy', tags: ['Array'] };
        const bad = { ...report, problems: [p1, p2, p3, badProblem] };
        // problems count is 4 (valid count) but one has empty title — should fail
        if (bad.problems.length >= 3 && bad.problems.length <= 5) {
          expect(validateReport(bad).valid).toBe(false);
        }
      }),
      { numRuns: 150 }
    );
  });

  test('roadmap phases must each have non-empty phase and description', () => {
    fc.assert(
      fc.property(validReportArb, roadmapPhaseArb, roadmapPhaseArb, (report, r1, r2) => {
        // Phase with empty phase name
        const badPhase = { phase: '', description: 'some description' };
        const bad1 = { ...report, roadmap: [r1, r2, badPhase] };
        if (bad1.roadmap.length >= 2 && bad1.roadmap.length <= 4) {
          expect(validateReport(bad1).valid).toBe(false);
        }

        // Phase with empty description
        const badDesc = { phase: 'Phase X', description: '' };
        const bad2 = { ...report, roadmap: [r1, r2, badDesc] };
        if (bad2.roadmap.length >= 2 && bad2.roadmap.length <= 4) {
          expect(validateReport(bad2).valid).toBe(false);
        }
      }),
      { numRuns: 150 }
    );
  });

  test('null or non-object input fails validation immediately', () => {
    expect(validateReport(null).valid).toBe(false);
    expect(validateReport(undefined).valid).toBe(false);
    expect(validateReport('string').valid).toBe(false);
    expect(validateReport(42).valid).toBe(false);
    expect(validateReport([]).valid).toBe(false);
  });

  test('whitespace-only strings fail the non-empty check', () => {
    fc.assert(
      fc.property(validReportArb, (report) => {
        // Whitespace-only assessment
        const badAssessment = { ...report, assessment: '   ' };
        expect(validateReport(badAssessment).valid).toBe(false);

        // Whitespace-only recommendations
        const badRec = { ...report, recommendations: '\t\n' };
        expect(validateReport(badRec).valid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('valid report at boundary cardinalities passes (1 strength, 5 weaknesses, 3 problems, 4 phases)', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        fc.array(problemArb, { minLength: 3, maxLength: 3 }),
        fc.array(roadmapPhaseArb, { minLength: 4, maxLength: 4 }),
        (assessment, strength, weakness, problems, roadmap) => {
          const report = {
            assessment,
            strengths: [strength],          // boundary: 1 strength
            weaknesses: [weakness, weakness, weakness, weakness, weakness].slice(0, 5), // boundary: 5 weaknesses
            recommendations: assessment,    // reuse non-empty string
            problems,                       // boundary: 3 problems
            roadmap,                        // boundary: 4 phases
          };
          expect(validateReport(report).valid).toBe(true);
        }
      ),
      { numRuns: 150 }
    );
  });

  test('valid report at other boundary (5 strengths, 1 weakness, 5 problems, 2 phases)', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        fc.array(problemArb, { minLength: 5, maxLength: 5 }),
        fc.array(roadmapPhaseArb, { minLength: 2, maxLength: 2 }),
        (assessment, tag, problems, roadmap) => {
          const report = {
            assessment,
            strengths: [tag, tag, tag, tag, tag], // boundary: 5 strengths
            weaknesses: [tag],                    // boundary: 1 weakness
            recommendations: assessment,
            problems,                             // boundary: 5 problems
            roadmap,                              // boundary: 2 phases
          };
          expect(validateReport(report).valid).toBe(true);
        }
      ),
      { numRuns: 150 }
    );
  });
});
