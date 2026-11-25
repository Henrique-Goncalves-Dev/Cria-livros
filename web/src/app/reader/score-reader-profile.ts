export const PROFILE_KEYS = [
  'explorador',
  'imersivo',
  'investigador',
  'contemplativo',
] as const;

export type ReaderProfileKey = (typeof PROFILE_KEYS)[number];

const ANSWER_PROFILE: Record<string, ReaderProfileKey> = {
  A: 'explorador',
  B: 'imersivo',
  C: 'investigador',
  D: 'contemplativo',
};

export function scoreReaderProfile(answers: Record<string, unknown>): {
  scores: Record<ReaderProfileKey, number>;
  primary: ReaderProfileKey[];
  secondary: ReaderProfileKey[];
} {
  const scores = Object.fromEntries(PROFILE_KEYS.map((key) => [key, 0])) as Record<ReaderProfileKey, number>;
  for (let question = 1; question <= 12; question += 1) {
    const profile = ANSWER_PROFILE[String(answers[`q${question}`] ?? '')];
    if (!profile) throw new Error(`A pergunta ${question} precisa de uma resposta entre A e D.`);
    scores[profile] += 1;
  }
  const ranked = [...PROFILE_KEYS].sort((a, b) => scores[b] - scores[a]);
  const highest = scores[ranked[0]];
  const primary = ranked.filter((key) => scores[key] === highest);
  const nextScore = ranked.find((key) => scores[key] < highest);
  return {
    scores,
    primary,
    secondary: primary.length === 1 && nextScore
      ? ranked.filter((key) => scores[key] === scores[nextScore])
      : [],
  };
}
