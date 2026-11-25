/** @typedef {'explorador' | 'imersivo' | 'investigador' | 'contemplativo'} ReaderProfileKey */

export const PROFILE_KEYS = Object.freeze([
  'explorador',
  'imersivo',
  'investigador',
  'contemplativo',
]);

const ANSWER_PROFILE = Object.freeze({
  A: 'explorador',
  B: 'imersivo',
  C: 'investigador',
  D: 'contemplativo',
});

/**
 * Scores the 12 profile questions. Ties remain combinations instead of being
 * collapsed into an arbitrary single result.
 * @param {Record<string, unknown>} answers
 */
export function scoreReaderProfile(answers) {
  const scores = Object.fromEntries(PROFILE_KEYS.map((key) => [key, 0]));

  for (let question = 1; question <= 12; question += 1) {
    const answer = answers[`q${question}`];
    const profile = ANSWER_PROFILE[answer];
    if (!profile) {
      throw new Error(`A pergunta ${question} precisa de uma resposta entre A e D.`);
    }
    scores[profile] += 1;
  }

  const ranked = [...PROFILE_KEYS].sort((a, b) => scores[b] - scores[a]);
  const highest = scores[ranked[0]];
  const primary = ranked.filter((key) => scores[key] === highest);
  const nextScore = ranked.find((key) => scores[key] < highest);
  const secondary = primary.length === 1 && nextScore
    ? ranked.filter((key) => scores[key] === scores[nextScore])
    : [];

  return { scores, primary, secondary };
}
