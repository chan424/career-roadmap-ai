import { describe, expect, it } from 'vitest';
import { careers, labels, model, sampleProfile } from './catalog';
import { LEGACY_DEMO_SKILLS, legacyRecommend } from './legacy';
import {
  dimensionScore,
  educationScore,
  interestScore,
  preferenceScore,
  roundPercent,
  scoreAll,
  scoreCareer,
  skillLearningStatus,
  skillScore,
} from './scoring';
import type { Career, UserProfile } from './types';

const labelsFor = {
  ...labels,
  skillNames: { a: 'Alpha', b: 'Beta', c: 'Gamma', ...labels.skillNames },
};

function miniCareer(overrides: Partial<Career> = {}): Career {
  return {
    id: 'mini',
    title: 'Mini Path',
    category: 'Test',
    tagline: 'A fixture.',
    summary: 'Used only in unit tests.',
    interests: ['data', 'technology', 'research'],
    skills: [
      { id: 'a', importance: 5 },
      { id: 'b', importance: 5 },
      { id: 'c', importance: 4 },
    ],
    education: { minLevel: 'bachelors', preferredStreams: ['engineering', 'pcm'] },
    workStyle: {
      sector: ['private'],
      setting: ['hybrid'],
      focus: ['data'],
      structure: 'flexible',
      pace: 'steady',
    },
    roadmap: [],
    related: [],
    ...overrides,
  };
}

const baseProfile: UserProfile = {
  interests: ['data', 'technology'],
  skills: { a: 5, b: 2, c: 0 },
  educationLevel: 'bachelors',
  stream: 'engineering',
  preferences: {
    sector: 'private',
    setting: 'hybrid',
    focus: 'data',
    structure: 'flexible',
    pace: 'steady',
  },
  focusText: '',
};

describe('legacy overlap', () => {
  it('reproduces the original starter demo', () => {
    const ranked = legacyRecommend(LEGACY_DEMO_SKILLS);
    expect(ranked.map((item) => item.title)).toEqual([
      'Data Scientist',
      'Environmental Analyst',
      'IoT Engineer',
      'Software Engineer',
    ]);
    expect(ranked.map((item) => item.score)).toEqual([0.5, 0.5, 0.25, 0]);
  });
});

describe('weighted scoring', () => {
  it('keeps the published weights and partial-credit constants', () => {
    const sum = model.weights.skills + model.weights.interests + model.weights.education + model.weights.preferences;
    expect(sum).toBeCloseTo(1, 8);
    expect(model.education.oneStepBelow).toBe(0.55);
    expect(model.preference.neutral).toBe(0.8);
    expect(model.preference.mismatch).toBe(0.2);
  });

  it('computes the worked example by hand', () => {
    expect(skillScore(baseProfile.skills, miniCareer().skills, 5)).toBeCloseTo(7 / 14, 8);
    expect(interestScore(baseProfile.interests, ['data', 'technology', 'research'])).toBeCloseTo(2 / 3, 8);
    expect(educationScore('bachelors', 'engineering', miniCareer().education, model)).toBeCloseTo(1, 8);
    expect(preferenceScore(baseProfile, miniCareer(), model)).toBeCloseTo(1, 8);

    const result = scoreCareer(baseProfile, miniCareer(), model, labelsFor);
    const expected = 0.45 * (7 / 14) + 0.25 * (2 / 3) + 0.15 * 1 + 0.15 * 1;
    expect(result.score).toBeCloseTo(expected, 8);
    expect(result.percent).toBe(roundPercent(expected));
    expect(result.percent).toBe(69);
    expect(result.factors.map((factor) => factor.weight * factor.score).reduce((a, b) => a + b, 0)).toBeCloseTo(
      result.score,
      8,
    );
  });

  it('does not give extra credit past the listed importance', () => {
    expect(skillScore({ a: 5, b: 5, c: 5 }, miniCareer().skills, 5)).toBe(1);
    expect(skillScore({}, miniCareer().skills, 5)).toBe(0);
  });

  it('scores education as full, one step below, or further below', () => {
    const education = miniCareer().education;
    expect(educationScore('masters', 'engineering', education, model)).toBeCloseTo(1, 8);
    expect(educationScore('diploma', 'engineering', education, model)).toBeCloseTo(0.6 * 0.55 + 0.4, 8);
    expect(educationScore('high_school', 'commerce', education, model)).toBeCloseTo(0.6 * 0.25 + 0.4 * 0.35, 8);
    expect(educationScore('bachelors', 'commerce', { ...education, preferredStreams: ['any'] }, model)).toBe(1);
  });

  it('treats an open preference as neutral and a clash as a miss', () => {
    expect(dimensionScore('any', ['private'], model)).toBe(0.8);
    expect(dimensionScore('public', ['private'], model)).toBe(0.2);
    expect(dimensionScore('flexible', ['mixed'], model)).toBe(1);
    const open = {
      ...baseProfile,
      preferences: { sector: 'any', setting: 'any', focus: 'any', structure: 'any', pace: 'any' },
    };
    expect(preferenceScore(open, miniCareer(), model)).toBeCloseTo(0.8, 8);
  });

  it('orders skill gaps by how much they weigh and omits skills already met', () => {
    const result = scoreCareer(baseProfile, miniCareer(), model, labelsFor);
    expect(result.skillGaps.map((gap) => gap.id)).toEqual(['c', 'b']);
    expect(result.matchedSkills.map((skill) => skill.id)).toEqual(['a', 'b']);
    expect(result.headline).toContain('Gamma');
    expect(result.narrative[0]).toContain('not a hiring probability');
  });

  it('ranks a perfect profile at the top of its own career', () => {
    const career = careers.find((item) => item.id === 'graphic-designer');
    expect(career).toBeTruthy();
    if (!career) return;
    const perfect: UserProfile = {
      interests: [...career.interests],
      skills: Object.fromEntries(career.skills.map((skill) => [skill.id, 5])),
      educationLevel: career.education.minLevel,
      stream: career.education.preferredStreams.includes('any') ? 'pcm' : career.education.preferredStreams[0],
      preferences: {
        sector: career.workStyle.sector[0],
        setting: career.workStyle.setting[0],
        focus: career.workStyle.focus[0],
        structure: career.workStyle.structure === 'mixed' ? 'flexible' : career.workStyle.structure,
        pace: career.workStyle.pace === 'mixed' ? 'steady' : career.workStyle.pace,
      },
      focusText: '',
    };
    const ranked = scoreAll(perfect, careers, model, labels);
    expect(ranked[0].careerId).toBe('graphic-designer');
    expect(ranked[0].percent).toBe(100);
  });

  it('puts the sample profile closer to data work than to an unrelated design path', () => {
    const ranked = scoreAll(sampleProfile, careers, model, labels);
    const byId = Object.fromEntries(ranked.map((item) => [item.careerId, item]));
    expect(byId['data-scientist'].percent).toBeGreaterThan(byId['software-engineer'].percent);
    expect(byId['data-scientist'].percent).toBeGreaterThan(byId['graphic-designer'].percent);
    expect(byId['environmental-analyst'].percent).toBeGreaterThan(byId['physician'].percent);
    expect(ranked).toHaveLength(careers.length);
    expect(ranked.every((item, index) => index === 0 || item.score <= ranked[index - 1].score)).toBe(true);
  });
});

describe('learning status', () => {
  it('labels foundation, build, and start', () => {
    expect(skillLearningStatus(0, 4)).toBe('start');
    expect(skillLearningStatus(2, 5)).toBe('build');
    expect(skillLearningStatus(5, 3)).toBe('foundation');
  });
});
