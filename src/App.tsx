import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ProfileProvider } from './context/ProfileContext';
import { AssessPage } from './pages/Assess';
import { CareerPage } from './pages/CareerDetail';
import { ComparePage } from './pages/Compare';
import { LandingPage } from './pages/Landing';
import { LibraryPage } from './pages/Library';
import { MethodologyPage } from './pages/Methodology';
import { NotFoundPage } from './pages/NotFound';
import { ResultsPage } from './pages/Results';

function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (!base || base === '/') return undefined;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <ProfileProvider>
        <Layout>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/assess" element={<AssessPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/careers" element={<LibraryPage />} />
              <Route path="/careers/:id" element={<CareerPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/how-it-works" element={<MethodologyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
        </Layout>
      </ProfileProvider>
    </BrowserRouter>
  );
}
