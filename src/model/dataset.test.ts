import { describe, expect, it } from 'vitest';
import { careers, model, sampleProfile, taxonomy } from './catalog';
import { buildExport, validateDataset } from './dataset';
import { scoreCareer } from './scoring';
import { labels } from './catalog';

describe('catalog integrity', () => {
  it('accepts the shipped dataset', () => {
    expect(validateDataset(careers, taxonomy, model)).toBeNull();
  });

  it('exports a roadmap payload without dropping the disclaimer', () => {
    const career = careers[0];
    const match = scoreCareer(sampleProfile, career, model, labels);
    const payload = buildExport(career, sampleProfile, match, '2026-01-01T00:00:00.000Z');
    expect(payload.disclaimer).toMatch(/not an admission offer/i);
    expect(payload.careerId).toBe(career.id);
    expect(payload.roadmap.length).toBeGreaterThanOrEqual(3);
    expect(payload.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
