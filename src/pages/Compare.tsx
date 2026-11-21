import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FactorBars } from '../components/FactorBars';
import { MatchRing } from '../components/MatchRing';
import { useProfile } from '../context/ProfileContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { copyText } from '../lib/download';
import { careerById, careersById, labels, model } from '../model/catalog';
import { levelLabel, optionLabel, skillName } from '../model/profile';
import { scoreCareer } from '../model/scoring';

export function ComparePage() {
  useDocumentTitle('Compare careers · Career Roadmap');
  const [params] = useSearchParams();
  const { ready, profile, compareIds, replaceCompare, toggleCompare } = useProfile();
  const applied = useRef(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!ready || applied.current) return;
    const raw = params.get('ids');
    if (!raw) return;
    applied.current = true;
    const ids = raw
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id in careersById);
    replaceCompare(ids);
  }, [params, ready, replaceCompare]);

  const selected = compareIds.map((id) => careerById(id)).filter((career) => career !== undefined);

  const share = async () => {
    const url = new URL(`${import.meta.env.BASE_URL}compare`.replace(/\/{2,}/g, '/'), window.location.origin);
    if (compareIds.length) url.searchParams.set('ids', compareIds.join(','));
    const ok = await copyText(url.toString());
    setNotice(ok ? 'Comparison link copied.' : 'Could not copy the link.');
  };

  const skillIds = [...new Set(selected.flatMap((career) => career.skills.map((skill) => skill.id)))].sort((a, b) =>
    skillName(a).localeCompare(skillName(b)),
  );

  return (
    <div className="wrap page-block">
      <p className="kicker">Compare</p>
      <h1>Put up to three paths side by side.</h1>
      <p className="lead">
        Education, skills, and work style stay visible even without an assessment. Match percentages appear after you
        save answers.
      </p>
      <div className="card-actions">
        <Link className="button button-secondary" to="/careers">
          Add from the catalog
        </Link>
        {compareIds.length > 0 ? (
          <button type="button" className="button button-quiet" onClick={share}>
            Copy comparison link
          </button>
        ) : null}
      </div>
      <p className="fine" aria-live="polite">
        {notice}
      </p>

      {!ready ? <p role="status">Loading saved comparisons…</p> : null}

      {ready && selected.length === 0 ? (
        <div className="empty">
          <h2>Nothing selected yet</h2>
          <p>Choose Compare on a career card. You can keep three at a time.</p>
          <Link className="button button-primary" to="/careers">
            Browse the catalog
          </Link>
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className={`compare-grid cols-${selected.length}`}>
          {selected.map((career) => {
            const match = profile ? scoreCareer(profile, career, model, labels) : null;
            return (
              <article key={career.id} className="compare-card">
                <p className="kicker">{career.category}</p>
                <h2>
                  <Link to={`/careers/${career.id}`}>{career.title}</Link>
                </h2>
                {match ? <MatchRing percent={match.percent} label={career.title} size="sm" /> : <p className="fine">No personal score yet.</p>}
                <p>{career.tagline}</p>
                <dl className="meta-list">
                  <div>
                    <dt>Usual entry</dt>
                    <dd>{levelLabel(career.education.minLevel)}</dd>
                  </div>
                  <div>
                    <dt>Sector</dt>
                    <dd>{career.workStyle.sector.map((value) => optionLabel('sector', value)).join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Setting</dt>
                    <dd>{career.workStyle.setting.map((value) => optionLabel('setting', value)).join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Focus</dt>
                    <dd>{career.workStyle.focus.map((value) => optionLabel('focus', value)).join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Structure</dt>
                    <dd>{optionLabel('structure', career.workStyle.structure)}</dd>
                  </div>
                  <div>
                    <dt>Pace</dt>
                    <dd>{optionLabel('pace', career.workStyle.pace)}</dd>
                  </div>
                </dl>
                {match ? <FactorBars factors={match.factors} compact /> : null}
                <button type="button" className="button button-quiet button-small" onClick={() => toggleCompare(career.id)}>
                  Remove
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {selected.length > 1 ? (
        <section>
          <h2>Skills these paths list</h2>
          <div className="table-scroll">
            <table className="data-table">
              <caption>Importance from 1 to 5. A dash means the path does not list that skill.</caption>
              <thead>
                <tr>
                  <th scope="col">Skill</th>
                  {profile ? <th scope="col">You</th> : null}
                  {selected.map((career) => (
                    <th key={career.id} scope="col">
                      {career.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skillIds.map((skillId) => (
                  <tr key={skillId}>
                    <th scope="row">{skillName(skillId)}</th>
                    {profile ? <td>{profile.skills[skillId] ?? 0}</td> : null}
                    {selected.map((career) => {
                      const found = career.skills.find((skill) => skill.id === skillId);
                      return <td key={career.id}>{found ? found.importance : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
