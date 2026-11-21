import { useEffect, useMemo, useState } from 'react';
import { taxonomy } from '../model/catalog';
import { RATING_LABELS, skillName } from '../model/profile';
import { suggestedSkillIds } from '../model/suggest';

interface SkillPickerProps {
  ratings: Record<string, number>;
  interests: string[];
  onRate: (id: string, level: number) => void;
  forceOpen?: boolean;
}

export function SkillPicker({ ratings, interests, onRate, forceOpen = false }: SkillPickerProps) {
  const [query, setQuery] = useState('');
  const suggested = useMemo(() => suggestedSkillIds(interests), [interests]);
  const suggestedSet = useMemo(() => new Set(suggested), [suggested]);
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    taxonomy.groups.filter((group) =>
      taxonomy.skills.some((skill) => skill.group === group && (ratings[skill.id] ?? 0) > 0),
    ),
  );

  useEffect(() => {
    if (forceOpen) setOpenGroups([...taxonomy.groups]);
  }, [forceOpen]);

  const needle = query.trim().toLowerCase();
  const visible = taxonomy.skills.filter((skill) => {
    if (!needle) return true;
    return skill.name.toLowerCase().includes(needle) || skill.short.toLowerCase().includes(needle);
  });
  const ratedCount = Object.values(ratings).filter((level) => level > 0).length;

  const renderSkill = (id: string) => {
    const current = ratings[id] ?? 0;
    const selected = RATING_LABELS.find((item) => item.value === current);
    return (
      <fieldset key={id} className="skill-row">
        <legend>
          <span>{skillName(id)}</span>
          <span className="skill-current">{selected?.label ?? 'None'}</span>
        </legend>
        <div className="seg-set" role="radiogroup" aria-label={`${skillName(id)} level`}>
          {RATING_LABELS.map((item) => (
            <label key={item.value} className="seg">
              <input
                type="radio"
                name={`skill-${id}`}
                value={item.value}
                checked={current === item.value}
                aria-label={`${skillName(id)}: ${item.label}`}
                onChange={() => onRate(id, item.value)}
              />
              <span aria-hidden="true">{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  };

  return (
    <div className="skill-picker">
      <div className="skill-toolbar">
        <div className="field grow">
          <label htmlFor="skill-search">Search skills</label>
          <input
            id="skill-search"
            type="search"
            value={query}
            placeholder="Try Python, writing, accounting"
            onChange={(event) => setQuery(event.target.value)}
            data-testid="skill-search"
          />
        </div>
        <p className="rated-count" aria-live="polite">
          {ratedCount} rated above None
        </p>
        {needle ? null : (
          <button
            type="button"
            className="button button-quiet"
            onClick={() => setOpenGroups(openGroups.length === taxonomy.groups.length ? [] : [...taxonomy.groups])}
          >
            {openGroups.length === taxonomy.groups.length ? 'Collapse groups' : 'Expand all groups'}
          </button>
        )}
      </div>

      {needle ? (
        visible.length === 0 ? (
          <p className="empty-inline" role="status">
            No skills match “{query.trim()}”.
          </p>
        ) : (
          <div className="skill-group">{visible.map((skill) => renderSkill(skill.id))}</div>
        )
      ) : (
        <>
          <section className="suggest-block" aria-labelledby="suggested-skills">
            <h3 id="suggested-skills">Suggested from your interests</h3>
            <p>These show up often on paths that share your interests. Rating others is welcome.</p>
            {suggested.map((id) => renderSkill(id))}
          </section>
          {taxonomy.groups.map((group) => {
            const skills = taxonomy.skills.filter((skill) => skill.group === group && !suggestedSet.has(skill.id));
            if (skills.length === 0) return null;
            const open = openGroups.includes(group);
            const panelId = `skill-group-${group.replace(/\s+/g, '-')}`;
            return (
              <section key={group} className="skill-group">
                <button
                  type="button"
                  className="group-toggle"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenGroups((current) =>
                      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
                    )
                  }
                >
                  <span>{group}</span>
                  <span className="group-meta">{open ? 'Hide' : `${skills.length} skills`}</span>
                </button>
                {open ? <div id={panelId}>{skills.map((skill) => renderSkill(skill.id))}</div> : null}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
