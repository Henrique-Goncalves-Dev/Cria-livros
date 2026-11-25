import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const contentUrl = new URL('../../web/public/data/reader-profiles.json', import.meta.url);

test('contains complete report narratives for the four Cria Livros reader profiles', async () => {
  const content = JSON.parse(await fs.readFile(contentUrl, 'utf8'));
  assert.equal(content.profiles.length, 4);
  for (const profile of content.profiles) {
    for (const field of ['description', 'relationship', 'strengths', 'curationCare', 'experience', 'genres', 'message']) {
      assert.ok(profile[field].length > 80, `${profile.key} should include ${field}`);
    }
  }
  assert.match(content.methodology, /não constitui teste psicológico/);
  assert.ok(!JSON.stringify(content).includes('Nômade'));
});
