import { describe, expect, it } from 'vitest';
import { scoreReaderProfile } from './score-reader-profile';

const answersFrom = (letters: string) =>
  Object.fromEntries([...letters].map((answer, index) => [`q${index + 1}`, answer]));

describe('scoreReaderProfile', () => {
  it('scores the 12 answers and identifies primary and secondary profiles', () => {
    const result = scoreReaderProfile(answersFrom('AAAAAABBBBCC'));
    expect(result.scores).toEqual({
      explorador: 6,
      imersivo: 4,
      investigador: 2,
      contemplativo: 0,
    });
    expect(result.primary).toEqual(['explorador']);
    expect(result.secondary).toEqual(['imersivo']);
  });

  it('preserves a top-score tie as a combined result', () => {
    const result = scoreReaderProfile(answersFrom('AAAAAABBBBBB'));
    expect(result.primary).toEqual(['explorador', 'imersivo']);
    expect(result.secondary).toEqual([]);
  });

  it('returns every tied secondary profile', () => {
    const result = scoreReaderProfile(answersFrom('AAAAABBBCCCD'));
    expect(result.primary).toEqual(['explorador']);
    expect(result.secondary).toEqual(['imersivo', 'investigador']);
  });

  it('rejects incomplete and invalid scored answers', () => {
    expect(() => scoreReaderProfile(answersFrom('AAAAAAAAAAA'))).toThrow(/pergunta 12/);
    expect(() => scoreReaderProfile(answersFrom('AAAAAAAAAAAZ'))).toThrow(/pergunta 12/);
  });
});
