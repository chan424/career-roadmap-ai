import careersJson from '../data/careers.json';
import modelJson from '../data/model.json';
import sampleJson from '../data/sample-profile.json';
import taxonomyJson from '../data/taxonomy.json';
import type { Career, ModelConfig, ScoringLabels, Taxonomy, UserProfile } from './types';

export const taxonomy = taxonomyJson as Taxonomy;
export const careers = careersJson as Career[];
export const model = modelJson as ModelConfig;
export const sampleProfile = sampleJson as UserProfile;

export const careersById: Record<string, Career> = Object.fromEntries(
  careers.map((career) => [career.id, career]),
);

export const labels: ScoringLabels = {
  skillNames: Object.fromEntries(taxonomy.skills.map((skill) => [skill.id, skill.name])),
  interestLabels: Object.fromEntries(taxonomy.interests.map((interest) => [interest.id, interest.label])),
  streamLabels: Object.fromEntries(taxonomy.streams.map((stream) => [stream.id, stream.label])),
  levelLabels: Object.fromEntries(taxonomy.levels.map((level) => [level.id, level.label])),
};

export function careerById(id: string): Career | undefined {
  return careersById[id];
}

export function categories(): string[] {
  const seen: string[] = [];
  for (const career of careers) {
    if (!seen.includes(career.category)) seen.push(career.category);
  }
  return seen;
}
