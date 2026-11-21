import type {
  Career,
  FactorScore,
  MatchResult,
  ModelConfig,
  ScoringLabels,
  SkillRow,
  UserProfile,
} from './types';

export const LEVEL_RANK = {
  high_school: 1,
  diploma: 2,
  bachelors: 3,
  masters: 4,
  doctoral: 5,
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Nearest integer, with halves rounded away from zero. Matches the Python CLI. */
export function roundPercent(score: number): number {
  return Math.floor(score * 100 + 0.5);
}

export function skillScore(
  ratings: Record<string, number>,
  requirements: readonly { id: string; importance: number }[],
  scale: number,
): number {
  let total = 0;
  let earned = 0;
  for (const requirement of requirements) {
    if (requirement.importance <= 0) continue;
    const user = clamp(ratings[requirement.id] ?? 0, 0, scale);
    total += requirement.importance;
    earned += Math.min(user, requirement.importance);
  }
  return total === 0 ? 0 : earned / total;
}

export function interestScore(userInterests: readonly string[], careerInterests: readonly string[]): number {
  if (careerInterests.length === 0) return 0;
  const selected = new Set(userInterests);
  let shared = 0;
  for (const interest of careerInterests) {
    if (selected.has(interest)) shared += 1;
  }
  return shared / careerInterests.length;
}

export function educationScore(
  level: UserProfile['educationLevel'],
  stream: string,
  education: Career['education'],
  config: ModelConfig,
): number {
  const userRank = LEVEL_RANK[level];
  const minRank = LEVEL_RANK[education.minLevel];
  let levelScore = config.education.furtherBelow;
  if (userRank >= minRank) levelScore = 1;
  else if (userRank === minRank - 1) levelScore = config.education.oneStepBelow;

  const streams = education.preferredStreams;
  const streamScore =
    streams.includes('any') || streams.includes(stream) ? 1 : config.education.streamMismatch;
  return config.education.levelWeight * levelScore + config.education.streamWeight * streamScore;
}

export function dimensionScore(userChoice: string, accepted: readonly string[], config: ModelConfig): number {
  if (userChoice === 'any') return config.preference.neutral;
  if (accepted.includes('any') || accepted.includes('mixed') || accepted.includes(userChoice)) return 1;
  return config.preference.mismatch;
}

export function preferenceScore(profile: UserProfile, career: Career, config: ModelConfig): number {
  const style = career.workStyle;
  const choice = profile.preferences;
  const parts = [
    dimensionScore(choice.sector, style.sector, config),
    dimensionScore(choice.setting, style.setting, config),
    dimensionScore(choice.focus, style.focus, config),
    dimensionScore(choice.structure, [style.structure], config),
    dimensionScore(choice.pace, [style.pace], config),
  ];
  return parts.reduce((sum, part) => sum + part, 0) / parts.length;
}

function skillRows(profile: UserProfile, career: Career, labels: ScoringLabels, scale: number): SkillRow[] {
  return career.skills.map((requirement) => {
    const userLevel = clamp(profile.skills[requirement.id] ?? 0, 0, scale);
    return {
      id: requirement.id,
      name: labels.skillNames[requirement.id] ?? requirement.id,
      userLevel,
      importance: requirement.importance,
      gap: Math.max(0, requirement.importance - userLevel),
    };
  });
}

function preferenceNote(profile: UserProfile, career: Career, config: ModelConfig): string {
  const style = career.workStyle;
  const choice = profile.preferences;
  const dimensions: { user: string; accepted: string[] }[] = [
    { user: choice.sector, accepted: style.sector },
    { user: choice.setting, accepted: style.setting },
    { user: choice.focus, accepted: style.focus },
    { user: choice.structure, accepted: [style.structure] },
    { user: choice.pace, accepted: [style.pace] },
  ];
  let aligned = 0;
  let neutral = 0;
  let differs = 0;
  for (const dimension of dimensions) {
    if (dimension.user === 'any') neutral += 1;
    else if (dimensionScore(dimension.user, dimension.accepted, config) === 1) aligned += 1;
    else differs += 1;
  }
  if (neutral === 5) return 'You left every work-style question open, so this part stays neutral.';
  const bits = [`${aligned} of 5 work-style choices align`];
  if (neutral) bits.push(`${neutral} ${neutral === 1 ? 'was' : 'were'} left open`);
  if (differs) bits.push(`${differs} ${differs === 1 ? 'differs' : 'differ'}`);
  if (bits.length === 1) return `${bits[0]}.`;
  if (bits.length === 2) return `${bits[0]}, and ${bits[1]}.`;
  return `${bits[0]}, ${bits[1]}, and ${bits[2]}.`;
}

function educationNote(profile: UserProfile, career: Career, labels: ScoringLabels): string {
  const levelLabel = labels.levelLabels[profile.educationLevel] ?? profile.educationLevel;
  const minLabel = labels.levelLabels[career.education.minLevel] ?? career.education.minLevel;
  const userRank = LEVEL_RANK[profile.educationLevel];
  const minRank = LEVEL_RANK[career.education.minLevel];
  let levelText = `Your ${levelLabel} is further below the usual entry level (${minLabel}), so education contributes less.`;
  if (userRank > minRank) {
    levelText = `Your ${levelLabel} is above the usual entry level (${minLabel}).`;
  } else if (userRank === minRank) {
    levelText = `Your ${levelLabel} meets the usual entry level for this path.`;
  } else if (userRank === minRank - 1) {
    levelText = `Your ${levelLabel} is one step below the usual entry level (${minLabel}), so education contributes partially.`;
  }

  if (career.education.preferredStreams.includes('any')) {
    return `${levelText} Academic stream is not used to raise or lower this path, because the usual entry is open to more than one background.`;
  }
  const streamLabel = labels.streamLabels[profile.stream] ?? profile.stream;
  if (career.education.preferredStreams.includes(profile.stream)) {
    return `${levelText} Your stream, ${streamLabel}, is one of the common backgrounds.`;
  }
  return `${levelText} Your stream, ${streamLabel}, is outside the common backgrounds listed here, so the stream part is partial.`;
}

function interestNote(profile: UserProfile, career: Career, labels: ScoringLabels): string {
  const selected = new Set(profile.interests);
  const shared = career.interests.filter((id) => selected.has(id));
  if (shared.length === 0) return 'None of your selected interests are tagged on this path.';
  const names = shared.map((id) => labels.interestLabels[id] ?? id);
  return `Shared interests: ${names.join(', ')} (${shared.length} of ${career.interests.length}).`;
}

export function scoreCareer(
  profile: UserProfile,
  career: Career,
  config: ModelConfig,
  labels: ScoringLabels,
): MatchResult {
  const skills = skillScore(profile.skills, career.skills, config.skillScale);
  const interests = interestScore(profile.interests, career.interests);
  const education = educationScore(profile.educationLevel, profile.stream, career.education, config);
  const preferences = preferenceScore(profile, career, config);
  const weights = config.weights;
  const score =
    weights.skills * skills +
    weights.interests * interests +
    weights.education * education +
    weights.preferences * preferences;
  const percent = roundPercent(score);

  const rows = skillRows(profile, career, labels, config.skillScale);
  const matchedSkills = rows
    .filter((row) => row.userLevel > 0)
    .sort((a, b) => b.userLevel - a.userLevel || a.name.localeCompare(b.name));
  const skillGaps = rows
    .filter((row) => row.userLevel < row.importance)
    .sort((a, b) => b.gap * b.importance - a.gap * a.importance || b.importance - a.importance || a.name.localeCompare(b.name));

  const factors: FactorScore[] = [
    {
      key: 'skills',
      label: 'Skills',
      score: skills,
      weight: weights.skills,
      note: `Skill depth covered: ${roundPercent(skills)}% of what this path lists.`,
    },
    {
      key: 'interests',
      label: 'Interests',
      score: interests,
      weight: weights.interests,
      note: interestNote(profile, career, labels),
    },
    {
      key: 'education',
      label: 'Education',
      score: education,
      weight: weights.education,
      note: educationNote(profile, career, labels),
    },
    {
      key: 'preferences',
      label: 'Work style',
      score: preferences,
      weight: weights.preferences,
      note: preferenceNote(profile, career, config),
    },
  ];

  const strongest = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  const headline = skillGaps[0]
    ? `${strongest.note} Largest gap: ${skillGaps[0].name}.`
    : `${strongest.note} Your ratings meet every listed skill.`;

  const narrative = [
    `${percent}% is how closely this profile fits the model for ${career.title}. It is not a hiring probability.`,
    ...factors.map((factor) => factor.note),
  ];
  if (skillGaps.length > 0) {
    const top = skillGaps
      .slice(0, 3)
      .map((gap) => `${gap.name} (you ${gap.userLevel} / expected ${gap.importance})`);
    narrative.push(`Skill gaps to close first: ${top.join('; ')}.`);
  } else {
    narrative.push('Your ratings already meet the listed depth for every skill on this path.');
  }

  return {
    careerId: career.id,
    title: career.title,
    category: career.category,
    score,
    percent,
    factors,
    matchedSkills,
    skillGaps,
    headline,
    narrative,
  };
}

export function scoreAll(
  profile: UserProfile,
  careerList: readonly Career[],
  config: ModelConfig,
  scoringLabels: ScoringLabels,
): MatchResult[] {
  return careerList
    .map((career) => scoreCareer(profile, career, config, scoringLabels))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function skillLearningStatus(userLevel: number, importance: number): 'foundation' | 'build' | 'start' {
  if (userLevel <= 0) return 'start';
  if (userLevel >= importance) return 'foundation';
  return 'build';
}

export const STATUS_LABEL = {
  foundation: 'Foundation in place',
  build: 'Build further',
  start: 'Start here',
} as const;
