import { Link, useNavigate } from 'react-router-dom';
import { FactorBars } from '../components/FactorBars';
import { MatchRing } from '../components/MatchRing';
import { useProfile } from '../context/ProfileContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { careerById, careers, categories, labels, model, sampleProfile } from '../model/catalog';
import { scoreAll } from '../model/scoring';

const STEPS = [
  {
    title: 'Tell us what pulls you',
    text: 'Interests, a self-rating of skills, your education, and the way you like to work.',
  },
  {
    title: 'Read a score you can audit',
    text: 'Each match is a weighted sum of skills, interests, education, and work style. Nothing is hidden in a model you cannot inspect.',
  },
  {
    title: 'Leave with a sequence',
    text: 'Skill gaps, a phase-by-phase learning plan, and a file you can save, share, or print.',
  },
];

export function LandingPage() {
  useDocumentTitle('Career Roadmap');
  const navigate = useNavigate();
  const { loadSample } = useProfile();
  const sampleMatch = scoreAll(sampleProfile, careers, model, labels)[0];
  const sampleCareer = careerById(sampleMatch.careerId);
  const cats = categories();

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker kicker-light">Career guidance with the workings visible</p>
            <h1>Find a path that fits how you work, then see what to learn next.</h1>
            <p className="hero-lead">
              A short assessment ranks a curated catalog — software, data, design, health, core engineering,
              finance, and Indian public exams — using a score you can read. It runs in your browser.
            </p>
            <div className="hero-actions">
              <Link className="button button-amber" to="/assess" data-testid="start-assessment">
                Start the assessment
              </Link>
              <Link className="button button-on-dark" to="/careers">
                Browse the catalog
              </Link>
            </div>
            <p className="hero-note">About ten minutes. No account. Answers stay on this device unless you copy a share link.</p>
          </div>
          {sampleCareer ? (
            <article className="sample-card">
              <p className="kicker">Sample, not your result</p>
              <div className="sample-head">
                <div>
                  <p className="sample-category">{sampleCareer.category}</p>
                  <h2>{sampleCareer.title}</h2>
                </div>
                <MatchRing percent={sampleMatch.percent} label={`${sampleCareer.title} sample`} size="sm" />
              </div>
              <p>{sampleMatch.headline}</p>
              <FactorBars factors={sampleMatch.factors} compact />
              <button
                type="button"
                className="button button-primary"
                data-testid="try-sample"
                onClick={() => {
                  loadSample();
                  navigate('/results');
                }}
              >
                Open this sample
              </button>
              <p className="fine">
                The original demo, extended: Python, machine learning, and air-quality analysis, with a bachelor’s in
                engineering.
              </p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="trust-strip" aria-label="What this site will not do">
        <div className="wrap trust-row">
          <p>Runs locally</p>
          <p>No invented salaries</p>
          <p>Scores you can recompute</p>
          <p>Official exam links, not rumours</p>
        </div>
      </section>

      <section className="wrap page-block">
        <p className="kicker">The visit</p>
        <h2>Three steps, then a plan you can take with you.</h2>
        <ol className="step-grid">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="step-num">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap page-block">
        <div className="section-head">
          <div>
            <p className="kicker">Catalog</p>
            <h2>Twenty-eight paths, grouped so you can wander.</h2>
          </div>
          <Link className="button button-secondary" to="/careers">
            Search all careers
          </Link>
        </div>
        <ul className="category-grid">
          {cats.map((category) => {
            const count = careers.filter((career) => career.category === category).length;
            return (
              <li key={category}>
                <Link to={`/careers?category=${encodeURIComponent(category)}`}>
                  <span className="category-count">{count}</span>
                  <span>{category}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="band">
        <div className="wrap band-grid">
          <div>
            <p className="kicker kicker-light">A limit worth reading</p>
            <h2>A high score is a fit to this model, not a job offer.</h2>
            <p>
              Self-ratings are subjective. The catalog is a sample, not the labour market. Pay, vacancies, and hiring
              chances are omitted on purpose — we do not have a cited source wired in, and we will not invent one.
            </p>
            <Link className="button button-on-dark" to="/how-it-works#limitations">
              Read the limitations
            </Link>
          </div>
          <div className="band-aside">
            <p>It started as a few dozen lines of Python: overlap your skills with a career’s list, divide by how many skills that career asked for.</p>
            <p>The site still honours that idea, then adds how deep the skill is, what you enjoy, your education, and how you like to work.</p>
          </div>
        </div>
      </section>
    </>
  );
}
