import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

const LINKS = [
  { to: '/careers', label: 'Catalog' },
  { to: '/compare', label: 'Compare' },
  { to: '/how-it-works', label: 'How it works' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { profile, compareIds } = useProfile();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap header-bar">
          <Link className="brand" to="/" aria-label="Career Roadmap home">
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" />
              <path d="M7 23c4.5-7 6.2-7 9-7s4.2 0 9-8" />
              <circle cx="7" cy="23" r="2.1" />
              <circle cx="16" cy="16" r="2.1" />
              <circle cx="25" cy="8" r="2.1" />
            </svg>
            <span>Career Roadmap</span>
          </Link>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
          <nav id="site-nav" className={open ? 'site-nav is-open' : 'site-nav'} aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.label}
                {link.to === '/compare' && compareIds.length > 0 ? (
                  <span className="nav-count">{compareIds.length}</span>
                ) : null}
              </NavLink>
            ))}
            {profile ? <NavLink to="/results">Your matches</NavLink> : null}
            <NavLink className="nav-cta" to="/assess">
              {profile ? 'Edit answers' : 'Start'}
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div>
            <p className="footer-brand">Career Roadmap</p>
            <p>Exploratory guidance. Not an admission offer, an exam authority, or an employer.</p>
          </div>
          <ul>
            <li>
              <Link to="/how-it-works">How the score works</Link>
            </li>
            <li>
              <Link to="/careers">Career catalog</Link>
            </li>
            <li>
              <a href="https://github.com/chan424/career-roadmap-ai">Source on GitHub</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
