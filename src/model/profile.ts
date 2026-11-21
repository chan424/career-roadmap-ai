import { labels, model, taxonomy } from './catalog';
import type { FieldErrors } from './profile-types';
import { clamp } from './scoring';
import type { DraftProfile, EducationLevel, PreferenceKey, UserProfile } from './types';

export type { FieldErrors } from './profile-types';

export const MIN_INTERESTS = 2;
export const MAX_INTERESTS = 8;
export const FOCUS_MAX = 80;

export const RATING_LABELS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Familiar' },
  { value: 3, label: 'Comfortable' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Expert' },
] as const;

const LEVELS = new Set(taxonomy.levels.map((level) => level.id));
const STREAMS = new Set(taxonomy.streams.map((stream) => stream.id));
const INTERESTS = new Set(taxonomy.interests.map((interest) => interest.id));
const SKILLS = new Set(taxonomy.skills.map((skill) => skill.id));

const PREFERENCE_OPTIONS: Record<keyof UserProfile['preferences'], Set<string>> = {
  sector: new Set(),
  setting: new Set(),
  focus: new Set(),
  structure: new Set(),
  pace: new Set(),
};

for (const question of taxonomy.preferences) {
  PREFERENCE_OPTIONS[question.id] = new Set(question.options.map((option) => option.id));
}

export function emptyDraft(): DraftProfile {
  return {
    interests: [],
    skills: {},
    educationLevel: '',
    stream: '',
    preferences: { sector: '', setting: '', focus: '', structure: '', pace: '' },
    focusText: '',
  };
}

export function profileToDraft(profile: UserProfile): DraftProfile {
  return {
    interests: [...profile.interests],
    skills: { ...profile.skills },
    educationLevel: profile.educationLevel,
    stream: profile.stream,
    preferences: { ...profile.preferences },
    focusText: profile.focusText,
  };
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

export function coerceDraft(input: unknown): DraftProfile {
  const draft = emptyDraft();
  if (!input || typeof input !== 'object') return draft;
  const raw = input as Record<string, unknown>;

  if (Array.isArray(raw.interests)) {
    const unique: string[] = [];
    for (const interest of raw.interests) {
      if (typeof interest === 'string' && INTERESTS.has(interest) && !unique.includes(interest)) {
        unique.push(interest);
      }
    }
    draft.interests = unique.slice(0, MAX_INTERESTS);
  }

  if (raw.skills && typeof raw.skills === 'object') {
    for (const [id, value] of Object.entries(raw.skills as Record<string, unknown>)) {
      if (!SKILLS.has(id) || typeof value !== 'number' || Number.isNaN(value)) continue;
      draft.skills[id] = clamp(Math.round(value), 0, model.skillScale);
    }
  }

  if (typeof raw.educationLevel === 'string' && LEVELS.has(raw.educationLevel as EducationLevel)) {
    draft.educationLevel = raw.educationLevel as EducationLevel;
  }
  if (typeof raw.stream === 'string' && STREAMS.has(raw.stream)) draft.stream = raw.stream;

  if (raw.preferences && typeof raw.preferences === 'object') {
    const prefs = raw.preferences as Record<string, unknown>;
    (Object.keys(draft.preferences) as (keyof UserProfile['preferences'])[]).forEach((key) => {
      const value = prefs[key];
      if (typeof value === 'string' && PREFERENCE_OPTIONS[key].has(value)) draft.preferences[key] = value;
    });
  }

  draft.focusText = cleanText(raw.focusText).slice(0, FOCUS_MAX);
  return draft;
}

export function validateDraft(draft: DraftProfile): { ok: true; profile: UserProfile } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const interests = draft.interests.filter((id) => INTERESTS.has(id));
  if (interests.length < MIN_INTERESTS || interests.length > MAX_INTERESTS) {
    errors.interests = `Select ${MIN_INTERESTS} to ${MAX_INTERESTS} interests. A shorter list keeps the match sharper.`;
  }

  const skills: Record<string, number> = {};
  let rated = 0;
  for (const [id, value] of Object.entries(draft.skills)) {
    if (!SKILLS.has(id) || typeof value !== 'number') continue;
    const level = clamp(Math.round(value), 0, model.skillScale);
    skills[id] = level;
    if (level > 0) rated += 1;
  }
  if (rated < 1) {
    errors.skills = 'Rate at least one skill above None. Unrated skills count as no experience.';
  }

  if (!draft.educationLevel || !LEVELS.has(draft.educationLevel)) {
    errors.education = 'Choose the highest level you have finished or are in now.';
  }
  if (!draft.stream || !STREAMS.has(draft.stream)) {
    errors.stream = 'Choose a stream, or “Still exploring or mixed”.';
  }

  const missingPreference = (Object.keys(draft.preferences) as (keyof UserProfile['preferences'])[]).filter(
    (key) => !PREFERENCE_OPTIONS[key].has(draft.preferences[key]),
  );
  if (missingPreference.length > 0) {
    errors.preferences = 'Answer each work-style question. Choose “No preference” if you want that one left open.';
  }

  const focusText = cleanText(draft.focusText);
  if (focusText.length > FOCUS_MAX) {
    errors.focusText = `Keep the study note to ${FOCUS_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0 || !draft.educationLevel) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    profile: {
      interests,
      skills,
      educationLevel: draft.educationLevel,
      stream: draft.stream,
      preferences: { ...draft.preferences },
      focusText,
    },
  };
}

export function validateStep(draft: DraftProfile, step: number): FieldErrors {
  const full = validateDraft(draft);
  if (full.ok) return {};
  const errors = full.errors;
  if (step === 0) return errors.interests ? { interests: errors.interests } : {};
  if (step === 1) return errors.skills ? { skills: errors.skills } : {};
  if (step === 2) {
    const next: FieldErrors = {};
    if (errors.education) next.education = errors.education;
    if (errors.stream) next.stream = errors.stream;
    if (errors.focusText) next.focusText = errors.focusText;
    return next;
  }
  return errors;
}

export function firstErrorStep(errors: FieldErrors): number {
  if (errors.interests) return 0;
  if (errors.skills) return 1;
  if (errors.education || errors.stream || errors.focusText) return 2;
  return 3;
}

export function encodeProfile(profile: UserProfile): string {
  const bytes = new TextEncoder().encode(JSON.stringify(profile));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeProfile(token: string): { ok: true; profile: UserProfile } | { ok: false; reason: string } {
  if (!token || token.length > 8000) return { ok: false, reason: 'unreadable' };
  try {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4));
    const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const draft = coerceDraft(data);
    const validated = validateDraft(draft);
    if (!validated.ok) return { ok: false, reason: 'incomplete' };
    return { ok: true, profile: validated.profile };
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
}

export function buildShareUrl(profile: UserProfile): string {
  const path = `${import.meta.env.BASE_URL}results`.replace(/\/{2,}/g, '/');
  const url = new URL(path, window.location.origin);
  url.searchParams.set('p', encodeProfile(profile));
  return url.toString();
}

export function levelLabel(id: string): string {
  return labels.levelLabels[id] ?? id;
}

export function streamLabel(id: string): string {
  return labels.streamLabels[id] ?? id;
}

export function interestLabel(id: string): string {
  return labels.interestLabels[id] ?? id;
}

export function skillName(id: string): string {
  return labels.skillNames[id] ?? id;
}

export function optionLabel(questionId: PreferenceKey, value: string): string {
  if (value === 'mixed') return 'Mixed';
  const question = taxonomy.preferences.find((item) => item.id === questionId);
  return question?.options.find((option) => option.id === value)?.label ?? value;
}
