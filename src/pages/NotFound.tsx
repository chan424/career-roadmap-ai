import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found · Career Roadmap');
  return (
    <div className="wrap page-block">
      <div className="empty">
        <p className="kicker">404</p>
        <h1>That page is not in the catalog</h1>
        <p>The link may be old, or the address was typed with a piece missing.</p>
        <Link className="button button-primary" to="/">
          Go to the start
        </Link>
        <Link className="button button-secondary" to="/careers">
          Browse careers
        </Link>
      </div>
    </div>
  );
}
