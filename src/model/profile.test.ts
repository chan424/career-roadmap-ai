import { describe, expect, it } from 'vitest';
import { sampleProfile } from './catalog';
import {
  coerceDraft,
  decodeProfile,
  emptyDraft,
  encodeProfile,
  firstErrorStep,
  profileToDraft,
  validateDraft,
  validateStep,
} from './profile';

describe('profile validation', () => {
  it('accepts the shared sample and round-trips it through a share token', () => {
    const encoded = encodeProfile(sampleProfile);
    expect(encoded.length).toBeLessThan(2000);
    const decoded = decodeProfile(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.profile).toEqual(sampleProfile);
  });

  it('rejects an empty draft with step-specific messages', () => {
    const draft = emptyDraft();
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.interests).toBeTruthy();
    expect(result.errors.skills).toBeTruthy();
    expect(validateStep(draft, 0)).toEqual({ interests: result.errors.interests });
    expect(validateStep(draft, 1)).toEqual({ skills: result.errors.skills });
    expect(firstErrorStep(result.errors)).toBe(0);
  });

  it('rejects too many interests before coercion and an unreadable share link', () => {
    const draft = profileToDraft(sampleProfile);
    draft.interests = [
      'data',
      'technology',
      'environment',
      'design',
      'healthcare',
      'business',
      'finance',
      'teaching',
      'making',
    ];
    expect(validateDraft(draft).ok).toBe(false);
    expect(coerceDraft(draft).interests).toHaveLength(8);
    expect(decodeProfile('not-a-token').ok).toBe(false);
    expect(decodeProfile('')).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('clamps odd ratings and drops unknown skills while keeping a valid profile', () => {
    const messy = {
      ...sampleProfile,
      skills: { python: 9.2, not_a_skill: 5, statistics: 0 },
      focusText: '  B.Tech   third year  ',
      extra: true,
    };
    const coerced = coerceDraft(messy);
    expect(coerced.skills.python).toBe(5);
    expect(coerced.skills.not_a_skill).toBeUndefined();
    expect(coerced.focusText).toBe('B.Tech third year');
    const decoded = decodeProfile(encodeProfile({ ...sampleProfile, focusText: 'Café — year 3' }));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.profile.focusText).toBe('Café — year 3');
  });
});
