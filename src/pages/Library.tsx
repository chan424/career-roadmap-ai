import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { careers, categories } from '../model/catalog';
import { levelLabel, skillName } from '../model/profile';

export function LibraryPage() {
  useDocumentTitle('Career catalog · Career Roadmap');
  const [params, setParams] = useSearchParams();
  const { compareIds, toggleCompare } = useProfile();
  const [notice, setNotice] = useState('');
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';

  const update = (key: 'q' | 'category', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return careers.filter((career) => {
      if (category && career.category !== category) return false;
      if (!needle) return true;
      const skillText = career.skills.map((skill) => skillName(skill.id)).join(' ');
      return `${career.title} ${career.tagline} ${career.summary} ${career.category} ${skillText}`
        .toLowerCase()
        .includes(needle);
    });
  }, [query, category]);

  const knownCategory = !category || categories().includes(category);

  return (
    <div className="wrap page-block">
      <p className="kicker">Catalog</p>
      <h1>Browse careers before you score them.</h1>
      <p className="lead">
        {careers.length} curated paths. Filters look at the title, summary, and skills. The catalog does not include
        every job, and it does not estimate pay.
      </p>
      <div className="filter-row">
        <div className="field grow">
          <label htmlFor="catalog-search">Search</label>
          <input
            id="catalog-search"
            type="search"
            value={query}
            placeholder="Try UPSC, design, Python, health"
            onChange={(event) => update('q', event.target.value)}
          />
        </div>
      </div>
      <div className="chip-row" role="group" aria-label="Category">
        <button
          type="button"
          className={!category ? 'chip-button is-on' : 'chip-button'}
          aria-pressed={!category}
          onClick={() => update('category', '')}
        >
          All
        </button>
        {categories().map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? 'chip-button is-on' : 'chip-button'}
            aria-pressed={category === item}
            onClick={() => update('category', item)}
          >
            {item}
          </button>
        ))}
      </div>
      <p role="status" className="fine">
        {knownCategory
          ? `${filtered.length} ${filtered.length === 1 ? 'career' : 'careers'}`
          : `No category named “${category}”.`}
        {notice ? ` ${notice}` : ''}
      </p>

      {!knownCategory || filtered.length === 0 ? (
        <div className="empty">
          <h2>No careers in this view</h2>
          <p>Try a shorter search, or clear the category. Law, architecture, and hands-on clinical specialities are not separate entries yet.</p>
          <button type="button" className="button button-secondary" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="library-grid">
          {filtered.map((career) => {
            const topSkills = [...career.skills].sort((a, b) => b.importance - a.importance).slice(0, 3);
            const inCompare = compareIds.includes(career.id);
            return (
              <li key={career.id}>
                <article className="library-card">
                  <p className="kicker">{career.category}</p>
                  <h2>
                    <Link to={`/careers/${career.id}`}>{career.title}</Link>
                  </h2>
                  <p>{career.tagline}</p>
                  <p className="fine">Usual entry: {levelLabel(career.education.minLevel)}</p>
                  <ul className="chips">
                    {topSkills.map((skill) => (
                      <li key={skill.id} className="chip">
                        {skillName(skill.id)}
                      </li>
                    ))}
                  </ul>
                  <div className="card-actions">
                    <Link className="button button-secondary button-small" to={`/careers/${career.id}`}>
                      View path
                    </Link>
                    <button
                      type="button"
                      className="button button-quiet button-small"
                      aria-pressed={inCompare}
                      onClick={() => {
                        const result = toggleCompare(career.id);
                        setNotice(
                          result === 'full'
                            ? 'You can compare up to 3 careers. Remove one to add another.'
                            : result === 'added'
                              ? `${career.title} added to compare.`
                              : `${career.title} removed from compare.`,
                        );
                      }}
                    >
                      {inCompare ? 'In compare' : 'Compare'}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
