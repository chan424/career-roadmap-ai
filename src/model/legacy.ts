/** The original four profiles from recommend.py, kept so the starter demo still scores the same way. */
export const LEGACY_CAREERS: { title: string; skills: string[] }[] = [
  { title: 'Data Scientist', skills: ['Python', 'Machine Learning', 'Statistics', 'SQL'] },
  { title: 'Environmental Analyst', skills: ['AQI Analysis', 'GIS', 'Python', 'Research'] },
  { title: 'Software Engineer', skills: ['Programming', 'Web Development', 'Algorithms', 'Databases'] },
  { title: 'IoT Engineer', skills: ['Embedded Systems', 'Sensors', 'Python', 'Networking'] },
];

export const LEGACY_DEMO_SKILLS = ['Python', 'Machine Learning', 'AQI Analysis'];

/**
 * Original overlap: share of the career's required skills that appear in the user's list.
 * Order of careers is preserved when scores tie, matching Python's stable sort of the original dict.
 */
export function legacyRecommend(userSkills: readonly string[]): { title: string; score: number }[] {
  const have = new Set(userSkills);
  return LEGACY_CAREERS.map((career) => {
    const required = career.skills;
    const matched = required.filter((skill) => have.has(skill)).length;
    const score = required.length === 0 ? 0 : matched / required.length;
    return { title: career.title, score };
  }).sort((a, b) => b.score - a.score);
}
