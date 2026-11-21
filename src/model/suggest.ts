import { careers } from './catalog';
import { interestScore } from './scoring';

const FALLBACK = [
  'communication',
  'programming',
  'python',
  'writing',
  'statistics',
  'excel_analysis',
  'teaching',
  'research',
];

/** Skills that show up most often on careers sharing the user's interests. */
export function suggestedSkillIds(interests: readonly string[], limit = 8): string[] {
  const counts = new Map<string, number>();
  const ranked = [...careers].sort(
    (a, b) => interestScore(interests, b.interests) - interestScore(interests, a.interests),
  );
  for (const career of ranked.slice(0, 6)) {
    if (interestScore(interests, career.interests) <= 0) continue;
    for (const skill of career.skills) {
      counts.set(skill.id, (counts.get(skill.id) ?? 0) + skill.importance);
    }
  }
  const suggested = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id);
  if (suggested.length > 0) return suggested;
  return FALLBACK.slice(0, limit);
}
