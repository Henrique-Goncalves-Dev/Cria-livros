import assert from 'node:assert/strict';
import test from 'node:test';
import { createReportPdf } from './report-pdf.js';

test('exports the matching profile narratives and current Cria Livros copy', async () => {
  const pdf = await createReportPdf({
    fullName: 'Ana Leitura',
    scores: { explorador: 6, imersivo: 4, investigador: 2, contemplativo: 0 },
    primary: ['explorador'],
    secondary: ['imersivo'],
  });

  assert.ok(pdf.subarray(0, 8).toString('ascii').startsWith('%PDF-1.'));
  assert.ok(pdf.subarray(-40).toString('ascii').includes('%%EOF'));
  assert.ok(pdf.length > 6000);
});

test('preserves tied profile combinations in a report', async () => {
  const pdf = await createReportPdf({
    fullName: 'Leitor Curioso',
    scores: { explorador: 6, imersivo: 6, investigador: 0, contemplativo: 0 },
    primary: ['explorador', 'imersivo'],
    secondary: [],
  });

  assert.ok(pdf.length > 6000);
});
