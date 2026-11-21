import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FactorBars } from '../components/FactorBars';
import { MatchRing } from '../components/MatchRing';
import { RadarChart } from '../components/RadarChart';
import { SkillTable } from '../components/SkillTable';
import { Timeline } from '../components/Timeline';
import { useProfile } from '../context/ProfileContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { downloadJson } from '../lib/download';
import { careerById, labels, model, taxonomy } from '../model/catalog';
import { buildExport } from '../model/dataset';
import { levelLabel, skillName } from '../model/profile';
import { scoreCareer } from '../model/scoring';
import type { SkillRow } from '../model/types';

export function CareerPage() {
  const { id = '' } = useParams();
  const career = careerById(id);
  const { profile, toggleCompare, compareIds } = useProfile();
  const [downloaded, setDownloaded] = useState('');
  const match = career && profile ? scoreCareer(profile, career, model, labels) : null;

  useDocumentTitle(career ? `${career.title} · Career Roadmap` : 'Career not found · Career Roadmap');

  if (!career) {
    return (
      <div className="wrap page-block">
        <div className="empty">
          <h1>That career is not in the catalog</h1>
          <p>The id in the address does not match a path we publish.</p>
          <Link className="button button-primary" to="/careers">
            Back to the catalog
          </Link>
        </div>
      </div>
    );
  }

  const rows: SkillRow[] = career.skills
    .map((skill) => {
      const userLevel = profile?.skills[skill.id] ?? 0;
      return {
        id: skill.id,
        name: skillName(skill.id),
        userLevel,
        importance: skill.importance,
        gap: Math.max(0, skill.importance - userLevel),
      };
    })
    .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name));

  const axes = [...career.skills]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8)
    .map((skill) => ({
      label: taxonomy.skills.find((item) => item.id === skill.id)?.short ?? skill.id,
      user: profile?.skills[skill.id] ?? 0,
      required: skill.importance,
    }));

  const download = () => {
    const payload = buildExport(career, profile, match, new Date().toISOString());
    downloadJson(`career-roadmap-${career.id}.json`, payload);
    setDownloaded(`Downloaded career-roadmap-${career.id}.json`);
  };

  return (
    <article className="wrap page-block career-page">
      <p className="print-only">
        Printed from Career Roadmap. Model fit is not a job offer or an official counselling result.
      </p>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/careers">Catalog</Link>
        <span aria-hidden="true">/</span>
        <span>{career.title}</span>
      </nav>
      <header className="career-hero">
        <div>
          <p className="kicker">{career.category}</p>
          <h1>{career.title}</h1>
          <p className="lead">{career.summary}</p>
          <p className="fine">Usual entry level in this model: {levelLabel(career.education.minLevel)}.</p>
        </div>
        {match ? <MatchRing percent={match.percent} label={career.title} /> : null}
      </header>

      {career.note ? (
        <aside className="alert alert-warn">
          <p>{career.note}</p>
        </aside>
      ) : null}

      <div className="card-actions no-print">
        <button type="button" className="button button-primary" data-testid="download-json" onClick={download}>
          Download JSON
        </button>
        <button type="button" className="button button-secondary" data-testid="print-roadmap" onClick={() => window.print()}>
          Print or save PDF
        </button>
        <button
          type="button"
          className="button button-quiet"
          aria-pressed={compareIds.includes(career.id)}
          onClick={() => toggleCompare(career.id)}
        >
          {compareIds.includes(career.id) ? 'In compare' : 'Add to compare'}
        </button>
        {profile ? (
          <Link className="button button-quiet" to="/results">
            Back to matches
          </Link>
        ) : (
          <Link className="button button-quiet" to="/assess">
            Assess to personalise gaps
          </Link>
        )}
      </div>
      <p className="fine no-print" aria-live="polite">
        {downloaded || 'Print opens the browser dialog, where you can choose Save as PDF.'}
      </p>

      {profile && match ? (
        <section className="split">
          <div>
            <h2>Why this fits your profile</h2>
            {match.narrative.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <FactorBars factors={match.factors} />
          </div>
          <RadarChart axes={axes} title={`Skill fit for ${career.title}`} />
        </section>
      ) : (
        <div className="alert">
          <p>
            Take the assessment to see a personal fit score and which phase skills you already have a foundation in.
            Without it, the roadmap below is the same sequence for everyone.
          </p>
        </div>
      )}

      <section>
        <h2>Skill depth</h2>
        {profile ? (
          <SkillTable rows={rows} />
        ) : (
          <ul className="chips">
            {rows.map((row) => (
              <li key={row.id} className="chip">
                {row.name} · depth {row.importance}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Learning sequence</h2>
        <p>
          Phases are an order to learn in, not a promise of how long a transition takes. Job requirements vary by
          employer. Where an exam or a licence is involved, the official notice wins.
        </p>
        <Timeline career={career} profile={profile} />
      </section>

      {career.references && career.references.length > 0 ? (
        <section>
          <h2>Check the official source</h2>
          <ul>
            {career.references.map((reference) => (
              <li key={reference.url}>
                <a href={reference.url} target="_blank" rel="noopener noreferrer">
                  {reference.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2>Related paths</h2>
        <ul className="related-list">
          {career.related.map((relatedId) => {
            const related = careerById(relatedId);
            if (!related) return null;
            return (
              <li key={relatedId}>
                <Link to={`/careers/${related.id}`}>
                  <span className="kicker">{related.category}</span>
                  <strong>{related.title}</strong>
                  <span>{related.tagline}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}
