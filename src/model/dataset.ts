import type { Career, MatchResult, ModelConfig, Taxonomy, UserProfile } from './types';

const LEARNING_TYPES = new Set(['Self-study', 'Course', 'Certification', 'Degree', 'Project']);
const LEVELS = new Set(['high_school', 'diploma', 'bachelors', 'masters', 'doctoral']);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BANNED = /salary|₹|\blpa\b|\blakhs?\b|\bctc\b|\$\s?\d/i;

export function validateDataset(careerList: Career[], taxonomy: Taxonomy, config: ModelConfig): string | null {
  const weightSum =
    config.weights.skills + config.weights.interests + config.weights.education + config.weights.preferences;
  if (Math.abs(weightSum - 1) > 1e-9) return 'Model weights must sum to 1.';
  if (config.skillScale !== 5) return 'Skill scale must stay 5 so ratings match the assessment.';

  const interestIds = new Set(taxonomy.interests.map((item) => item.id));
  const skillIds = new Set(taxonomy.skills.map((item) => item.id));
  const streamIds = new Set(taxonomy.streams.map((item) => item.id));
  const groups = new Set(taxonomy.groups);
  const preferenceValues = new Map<string, Set<string>>();
  for (const question of taxonomy.preferences) {
    preferenceValues.set(question.id, new Set(question.options.map((option) => option.id)));
  }

  if (taxonomy.interests.length < 8) return 'Taxonomy needs a broad interest list.';
  if (new Set(taxonomy.skills.map((skill) => skill.id)).size !== taxonomy.skills.length) {
    return 'Duplicate skill ids in the taxonomy.';
  }
  for (const skill of taxonomy.skills) {
    if (!groups.has(skill.group)) return `Skill ${skill.id} uses an unknown group.`;
    if (!skill.name || !skill.short) return `Skill ${skill.id} needs a name and a short label.`;
  }

  if (careerList.length < 20) return 'Catalog should stay broad enough to browse.';
  const careerIds = new Set<string>();
  const usedSkills = new Set<string>();
  const usedInterests = new Set<string>();

  for (const career of careerList) {
    if (!ID_PATTERN.test(career.id)) return `Career id ${career.id} should be kebab-case.`;
    if (careerIds.has(career.id)) return `Duplicate career id ${career.id}.`;
    careerIds.add(career.id);
    if (!career.title || !career.category || !career.tagline || !career.summary) {
      return `Career ${career.id} is missing title copy.`;
    }
    if (career.tagline.length > 120) return `Tagline for ${career.id} is too long.`;
    if (career.summary.length > 520) return `Summary for ${career.id} is too long.`;
    if (BANNED.test(JSON.stringify(career))) return `Career ${career.id} appears to invent a pay figure.`;

    if (career.interests.length < 2) return `${career.id} needs at least two interest tags.`;
    for (const interest of career.interests) {
      if (!interestIds.has(interest)) return `${career.id} has unknown interest ${interest}.`;
      usedInterests.add(interest);
    }

    const seenSkills = new Set<string>();
    if (career.skills.length < 4) return `${career.id} needs at least four skills.`;
    for (const skill of career.skills) {
      if (!skillIds.has(skill.id)) return `${career.id} has unknown skill ${skill.id}.`;
      if (seenSkills.has(skill.id)) return `${career.id} repeats skill ${skill.id}.`;
      seenSkills.add(skill.id);
      usedSkills.add(skill.id);
      if (!Number.isInteger(skill.importance) || skill.importance < 1 || skill.importance > 5) {
        return `${career.id} skill ${skill.id} needs importance 1–5.`;
      }
    }

    if (!LEVELS.has(career.education.minLevel)) return `${career.id} has an unknown education level.`;
    if (career.education.preferredStreams.length === 0) return `${career.id} needs a stream list.`;
    for (const stream of career.education.preferredStreams) {
      if (!streamIds.has(stream)) return `${career.id} has unknown stream ${stream}.`;
    }

    for (const key of ['sector', 'setting', 'focus'] as const) {
      const values = career.workStyle[key];
      if (!Array.isArray(values) || values.length === 0) return `${career.id} is missing work style ${key}.`;
      const allowed = preferenceValues.get(key);
      for (const value of values) {
        if (!allowed?.has(value) && value !== 'mixed') return `${career.id} has unknown ${key} value ${value}.`;
      }
    }
    for (const key of ['structure', 'pace'] as const) {
      const value = career.workStyle[key];
      const allowed = preferenceValues.get(key);
      if (value !== 'mixed' && !allowed?.has(value)) return `${career.id} has unknown ${key} value ${value}.`;
    }

    if (career.roadmap.length < 3) return `${career.id} needs at least three roadmap phases.`;
    const phaseIds = new Set<string>();
    for (const phase of career.roadmap) {
      if (phaseIds.has(phase.id)) return `${career.id} repeats phase ${phase.id}.`;
      phaseIds.add(phase.id);
      if (!phase.title || !phase.timeframe || !phase.summary) return `${career.id} has an empty phase.`;
      if (phase.milestones.length < 2) return `${career.id} phase ${phase.id} needs two milestones.`;
      if (phase.skills.length < 1) return `${career.id} phase ${phase.id} needs skills.`;
      for (const skillId of phase.skills) {
        if (!skillIds.has(skillId)) return `${career.id} phase ${phase.id} has unknown skill ${skillId}.`;
      }
      if (phase.learning.length < 2) return `${career.id} phase ${phase.id} needs learning items.`;
      for (const item of phase.learning) {
        if (!LEARNING_TYPES.has(item.type)) return `${career.id} has an unknown learning type ${item.type}.`;
        if (!item.title || !item.detail) return `${career.id} has an empty learning item.`;
      }
    }

    if (career.related.length < 2) return `${career.id} should suggest related careers.`;
    if (career.note !== undefined && career.note.trim().length < 20) return `${career.id} note is too thin to be useful.`;
    for (const reference of career.references ?? []) {
      if (!reference.label || !reference.url.startsWith('https://')) {
        return `${career.id} has a reference that is not a labelled https link.`;
      }
    }
  }

  for (const career of careerList) {
    for (const related of career.related) {
      if (related === career.id || !careerIds.has(related)) return `${career.id} related id ${related} is invalid.`;
    }
  }
  for (const skillId of skillIds) {
    if (!usedSkills.has(skillId)) return `Skill ${skillId} is never required by a career.`;
  }
  for (const interestId of interestIds) {
    if (!usedInterests.has(interestId)) return `Interest ${interestId} is never used.`;
  }
  return null;
}

export const EXPORT_DISCLAIMER =
  'This is an exploratory learning plan from a transparent scoring model. It is not an admission offer, an exam authority, or an employer recommendation. Official notifications override anything here.';

export function buildExport(career: Career, profile: UserProfile | null, match: MatchResult | null, generatedAt: string) {
  return {
    generatedBy: 'Career Roadmap',
    generatedAt,
    disclaimer: EXPORT_DISCLAIMER,
    profile,
    match,
    careerId: career.id,
    title: career.title,
    category: career.category,
    roadmap: career.roadmap,
  };
}
