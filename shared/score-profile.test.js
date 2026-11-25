import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreReaderProfile } from './score-profile.js';

const answersFrom = (letters) =>
  Object.fromEntries([...letters].map((answer, index) => [`q${index + 1}`, answer]));

test('scores all 12 answers into the four reader profiles', () => {
  const result = scoreReaderProfile(answersFrom('AAAAAABBBBCC'));
  assert.deepEqual(result.scores, {
    explorador: 6,
    imersivo: 4,
    investigador: 2,
    contemplativo: 0,
  });
  assert.deepEqual(result.primary, ['explorador']);
  assert.deepEqual(result.secondary, ['imersivo']);
});

test('keeps a tie for the predominant profile instead of forcing one', () => {
  const result = scoreReaderProfile(answersFrom('AAAAAABBBBBB'));
  assert.deepEqual(result.primary, ['explorador', 'imersivo']);
  assert.deepEqual(result.secondary, []);
});

test('returns tied secondary profiles when the top profile is unique', () => {
  const result = scoreReaderProfile(answersFrom('AAAAABBBCCCD'));
  assert.deepEqual(result.primary, ['explorador']);
  assert.deepEqual(result.secondary, ['imersivo', 'investigador']);
});

test('rejects missing or invalid answers', () => {
  assert.throws(() => scoreReaderProfile(answersFrom('AAAAAAAAAAA')), /pergunta 12/);
  assert.throws(() => scoreReaderProfile(answersFrom('AAAAAAAAAAAZ')), /pergunta 12/);
});
