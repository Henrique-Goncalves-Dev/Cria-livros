import { describe, expect, it } from 'vitest';
import { FREE_TEXT_QUESTIONS, GENRES, PROFILE_QUESTIONS, SUPPLEMENTARY_QUESTIONS } from './questions';

describe('reader questionnaire', () => {
  it('contains 12 scored questions with four options each', () => {
    expect(PROFILE_QUESTIONS).toHaveLength(12);
    expect(PROFILE_QUESTIONS.every((question) => question.options.length === 4)).toBe(true);
  });

  it('contains 9 supplementary questions that do not affect profile scores', () => {
    expect(GENRES).toHaveLength(14);
    expect(SUPPLEMENTARY_QUESTIONS).toHaveLength(4);
    expect(FREE_TEXT_QUESTIONS).toHaveLength(4);
    expect(1 + SUPPLEMENTARY_QUESTIONS.length + FREE_TEXT_QUESTIONS.length).toBe(9);
  });
});
