export type EducationLevel =
  | 'high_school'
  | 'diploma'
  | 'bachelors'
  | 'masters'
  | 'doctoral';

export type PreferenceKey = 'sector' | 'setting' | 'focus' | 'structure' | 'pace';

export type LearningType = 'Self-study' | 'Course' | 'Certification' | 'Degree' | 'Project';

export interface InterestDef {
  id: string;
  label: string;
  description: string;
}

export interface SkillDef {
  id: string;
  name: string;
  short: string;
  group: string;
}

export interface StreamDef {
  id: string;
  label: string;
}

export interface LevelDef {
  id: EducationLevel;
  label: string;
  detail: string;
}

export interface PreferenceOption {
  id: string;
  label: string;
}

export interface PreferenceQuestion {
  id: PreferenceKey;
  prompt: string;
  help: string;
  options: PreferenceOption[];
}

export interface Taxonomy {
  interests: InterestDef[];
  groups: string[];
  skills: SkillDef[];
  streams: StreamDef[];
  levels: LevelDef[];
  preferences: PreferenceQuestion[];
}

export interface LearningItem {
  type: LearningType;
  title: string;
  detail: string;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  timeframe: string;
  summary: string;
  milestones: string[];
  skills: string[];
  learning: LearningItem[];
}

export interface CareerSkill {
  id: string;
  importance: number;
}

export interface CareerReference {
  label: string;
  url: string;
}

export interface WorkStyle {
  sector: string[];
  setting: string[];
  focus: string[];
  structure: string;
  pace: string;
}

export interface Career {
  id: string;
  title: string;
  category: string;
  tagline: string;
  summary: string;
  interests: string[];
  skills: CareerSkill[];
  education: {
    minLevel: EducationLevel;
    preferredStreams: string[];
  };
  workStyle: WorkStyle;
  roadmap: RoadmapPhase[];
  related: string[];
  note?: string;
  references?: CareerReference[];
}

export interface ModelConfig {
  version: number;
  weights: {
    skills: number;
    interests: number;
    education: number;
    preferences: number;
  };
  education: {
    levelWeight: number;
    streamWeight: number;
    oneStepBelow: number;
    furtherBelow: number;
    streamMismatch: number;
  };
  preference: {
    neutral: number;
    mismatch: number;
  };
  skillScale: number;
}

export interface UserPreferences {
  sector: string;
  setting: string;
  focus: string;
  structure: string;
  pace: string;
}

export interface UserProfile {
  interests: string[];
  skills: Record<string, number>;
  educationLevel: EducationLevel;
  stream: string;
  preferences: UserPreferences;
  focusText: string;
}

export interface DraftProfile {
  interests: string[];
  skills: Record<string, number>;
  educationLevel: EducationLevel | '';
  stream: string;
  preferences: UserPreferences;
  focusText: string;
}

export interface FactorScore {
  key: 'skills' | 'interests' | 'education' | 'preferences';
  label: string;
  score: number;
  weight: number;
  note: string;
}

export interface SkillRow {
  id: string;
  name: string;
  userLevel: number;
  importance: number;
  gap: number;
}

export interface MatchResult {
  careerId: string;
  title: string;
  category: string;
  score: number;
  percent: number;
  factors: FactorScore[];
  matchedSkills: SkillRow[];
  skillGaps: SkillRow[];
  headline: string;
  narrative: string[];
}

export interface ScoringLabels {
  skillNames: Record<string, string>;
  interestLabels: Record<string, string>;
  streamLabels: Record<string, string>;
  levelLabels: Record<string, string>;
}

export type LearningStatus = 'foundation' | 'build' | 'start';
