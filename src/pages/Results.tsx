import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FactorBars } from '../components/FactorBars';
import { MatchRing } from '../components/MatchRing';
import { RadarChart } from '../components/RadarChart';
import { SkillTable } from '../components/SkillTable';
import { useProfile } from '../context/ProfileContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { copyText } from '../lib/download';
import { careerById, categories, taxonomy } from '../model/catalog';
import { buildShareUrl, levelLabel, streamLabel } from '../model/profile';
import type { MatchResult, SkillRow } from '../model/types';

function comparisonRows(match: MatchResult): SkillRow[] {
  return [...match.matchedSkills, ...match.skillGaps.filter((gap) => gap.userLevel === 0)].sort(
    (a, b) => b.importance - a.importance || a.name.localeCompare(b.name),
  );
}

export function ResultsPage() {
  useDocumentTitle('Your matches · Career Roadmap');
  const navigate = useNavigate();
  const { ready, profile, matches, shareError, editFromSaved, clearAll, toggleCompare, compareIds } = useProfile();
  const [minimum, setMinimum] = useState(0);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'fit' | 'name' | 'gap'>('fit');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const firstFocus = useRef(true);

  const shown = useMemo(() => {
    const list = (matches ?? []).filter((match) => {
      if (match.percent < minimum) return false;
      if (category && match.category !== category) return false;
      return true;
    });
    const copy = [...list];
    if (sort === 'name') copy.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'gap') {
      copy.sort((a, b) => {
        const gapA = a.skillGaps[0] ? a.skillGaps[0].gap * a.skillGaps[0].importance : -1;
        const gapB = b.skillGaps[0] ? b.skillGaps[0].gap * b.skillGaps[0].importance : -1;
        return gapB - gapA || b.score - a.score;
      });
    }
    return copy;
  }, [matches, minimum, category, sort]);

  useEffect(() => {
    if (!focusedId || !shown.some((match) => match.careerId === focusedId)) {
      setFocusedId(shown[0]?.careerId ?? null);
    }
  }, [shown, focusedId]);

  useEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return;
    }
    if (window.matchMedia('(max-width: 900px)').matches) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      detailRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }, [focusedId]);

  if (!ready) {
    return (
      <div className="wrap page-block">
        <p role="status">Loading your saved answers…</p>
      </div>
    );
  }

  if (!profile || !matches) {
    return (
      <div className="wrap page-block">
        {shareError ? (
          <div className="alert alert-warn" role="alert">
            That shared link could not be read. Start an assessment, or open a link that is still complete.
          </div>
        ) : null}
        <div className="empty">
          <h1>No saved assessment yet</h1>
          <p>Matches appear after you finish the four steps. Nothing is stored on a server.</p>
          <Link className="button button-primary" to="/assess">
            Start the assessment
          </Link>
          <Link className="button button-secondary" to="/careers">
            Browse without a score
          </Link>
        </div>
      </div>
    );
  }

  const focused = shown.find((match) => match.careerId === focusedId) ?? null;
  const focusedCareer = focused ? careerById(focused.careerId) : undefined;
  const top = matches[0];

  const share = async () => {
    const url = new URL(buildShareUrl(profile));
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    const ok = await copyText(url.toString());
    setNotice(
      ok
        ? 'Link copied. It contains your answers.'
        : 'The address bar now has the share link. Copy it from there.',
    );
  };

  const onCompare = (id: string) => {
    const result = toggleCompare(id);
    if (result === 'full') setNotice('You can compare up to 3 careers. Remove one to add another.');
    else if (result === 'added') setNotice('Added to compare.');
    else setNotice('Removed from compare.');
  };

  const radarAxes =
    focusedCareer && profile
      ? [...focusedCareer.skills]
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 8)
          .map((skill) => ({
            label: taxonomy.skills.find((item) => item.id === skill.id)?.short ?? skill.id,
            user: profile.skills[skill.id] ?? 0,
            required: skill.importance,
          }))
      : [];

  return (
    <div className="wrap page-block">
      <p className="kicker">Your matches</p>
      <div className="results-intro">
        <div>
          <h1>{top.title} leads at {top.percent}% fit.</h1>
          <p className="lead">
            {matches.length} paths ranked. A percentage is model fit, not the chance of being hired.
            {profile.focusText ? ` Study note, not used in the score: ${profile.focusText}.` : ''}
          </p>
          <p className="fine">
            {levelLabel(profile.educationLevel)} · {streamLabel(profile.stream)}
          </p>
        </div>
        <MatchRing percent={top.percent} label={`Top match ${top.title}`} />
      </div>

      {shareError ? (
        <div className="alert alert-warn" role="status">
          A shared link in the address could not be read. These are the answers already saved in this browser.
        </div>
      ) : null}
      {top.percent < 45 ? (
        <div className="alert" role="status">
          Nothing is a strong fit yet, and that is useful. The list is still ordered. Gaps show what would move a path
          up. You can also broaden interests or rate adjacent skills.
        </div>
      ) : null}

      <div className="results-actions no-print">
        <button type="button" className="button button-primary" onClick={share}>
          Copy share link
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            editFromSaved();
            navigate('/assess');
          }}
        >
          Edit answers
        </button>
        <Link className="button button-secondary" to="/compare">
          Compare{compareIds.length ? ` (${compareIds.length})` : ''}
        </Link>
        {confirmClear ? (
          <span className="confirm-clear">
            Clear saved answers on this browser?
            <button type="button" className="button button-quiet" onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
            <button type="button" className="button button-secondary" onClick={() => clearAll()}>
              Clear
            </button>
          </span>
        ) : (
          <button type="button" className="button button-quiet" onClick={() => setConfirmClear(true)}>
            Start over
          </button>
        )}
      </div>
      <p className="fine" aria-live="polite">
        {notice}
      </p>

      <div className="filter-row">
        <div className="field">
          <label htmlFor="min-fit">Minimum fit</label>
          <select id="min-fit" value={minimum} onChange={(event) => setMinimum(Number(event.target.value))}>
            <option value={0}>Any</option>
            <option value={40}>40% and up</option>
            <option value={55}>55% and up</option>
            <option value={70}>70% and up</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="result-category">Category</label>
          <select id="result-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories().map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="result-sort">Sort</label>
          <select id="result-sort" value={sort} onChange={(event) => setSort(event.target.value as 'fit' | 'name' | 'gap')}>
            <option value="fit">Highest fit</option>
            <option value="name">Name (A–Z)</option>
            <option value="gap">Largest skill gap</option>
          </select>
        </div>
      </div>
      <p className="fine" role="status">
        Showing {shown.length} of {matches.length}
      </p>

      {shown.length === 0 ? (
        <div className="empty">
          <h2>Nothing clears that bar</h2>
          <p>Lower the minimum fit or clear the category. The underlying ranking is unchanged.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setMinimum(0);
              setCategory('');
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="results-layout">
          <div className="results-list" data-testid="result-list">
            {shown.map((match, index) => (
              <article key={match.careerId} className={match.careerId === focusedId ? 'result-card is-active' : 'result-card'}>
                <div className="result-card-top">
                  <p className="fine">{sort === 'fit' ? `#${index + 1} · ${match.category}` : match.category}</p>
                  <strong className="result-percent" data-testid="match-percent">
                    {match.percent}%
                  </strong>
                </div>
                <h2>{match.title}</h2>
                <p>{match.headline}</p>
                {match.skillGaps.length > 0 ? (
                  <ul className="chips">
                    {match.skillGaps.slice(0, 3).map((gap) => (
                      <li key={gap.id} className="chip">
                        Gap: {gap.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="fine">Listed skills are already at the depth this path asks for.</p>
                )}
                <div className="card-actions">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    aria-pressed={match.careerId === focusedId}
                    onClick={() => setFocusedId(match.careerId)}
                  >
                    Explain this match
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    aria-pressed={compareIds.includes(match.careerId)}
                    onClick={() => onCompare(match.careerId)}
                  >
                    {compareIds.includes(match.careerId) ? 'In compare' : 'Add to compare'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {focused && focusedCareer ? (
            <aside id="match-detail" className="detail-panel" ref={detailRef} aria-labelledby="detail-title">
              <p className="kicker">{focused.category}</p>
              <h2 id="detail-title">Why {focused.title} fits</h2>
              <FactorBars factors={focused.factors} />
              <RadarChart axes={radarAxes} title={`Skill fit for ${focused.title}`} />
              <SkillTable rows={comparisonRows(focused)} />
              <div className="card-actions">
                <Link className="button button-primary" to={`/careers/${focused.careerId}`} data-testid="open-roadmap">
                  View roadmap
                </Link>
                <button type="button" className="button button-secondary" onClick={() => onCompare(focused.careerId)}>
                  {compareIds.includes(focused.careerId) ? 'In compare' : 'Add to compare'}
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
