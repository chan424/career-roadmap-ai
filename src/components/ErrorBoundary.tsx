import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="wrap page-block">
        <div className="empty" role="alert">
          <h1>Something went wrong on this page</h1>
          <p>The assessment data is still in this browser. Reloading usually clears a one-off glitch.</p>
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <Link className="button button-secondary" to="/">
            Back home
          </Link>
        </div>
      </div>
    );
  }
}
