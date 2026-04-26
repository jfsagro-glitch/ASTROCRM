import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ClientPortal from './components/ClientPortal';
import CRM from './components/CRM';
import AuthPage from './components/AuthPage';
import PwaInstallBanner from './components/PwaInstallBanner';
import OfflineBanner from './components/OfflineBanner';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

/**
 * ClientPortalWrapper reads URL params and pre-fills birth data if available.
 * URL format: /?date=YYYY-MM-DD&time=HH:MM&lat=XX&lon=XX&utc=X&name=Name
 */
function ClientPortalWrapper() {
  const location = useLocation();
  return <ClientPortal initialParams={new URLSearchParams(location.search)} />;
}

/** Show AuthPage when Firebase is configured but user is not logged in. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  if (!configured) return <>{children}</>;
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
    </div>
  );
  // User logged in but email not yet verified — AuthPage handles that screen.
  if (!user || !user.emailVerified) return <AuthPage />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div className="relative z-10">
      <Routes location={location}>
        <Route path="/" element={<ClientPortalWrapper />} />
        <Route path="/crm" element={<CRM />} />
      </Routes>
    </div>
  );
}

type RuntimeBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

class RuntimeErrorBoundary extends React.Component<{ children: React.ReactNode }, RuntimeBoundaryState> {
  state: RuntimeBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): RuntimeBoundaryState {
    return { hasError: true, errorMessage: error?.message ?? 'Unknown runtime error' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[runtime-guard] uncaught render error', {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-amber-50 flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-amber-300/30 bg-slate-900/80 p-5">
            <h2 className="text-lg font-semibold text-amber-200">Runtime guard: UI crash captured</h2>
            <p className="mt-2 text-sm text-amber-50/80">
              Поймана непредвиденная ошибка рендера. Скопируйте сообщение из консоли и перезагрузите страницу.
            </p>
            <pre className="mt-3 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-amber-100/90">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
      <Router>
        <div className="midnight-app min-h-screen">
          <div className="stars-layer stars-layer-a" aria-hidden="true" />
          <div className="stars-layer stars-layer-b" aria-hidden="true" />
          <div className="aurora-layer" aria-hidden="true" />
          <AuthGate>
            <RuntimeErrorBoundary>
              <AnimatedRoutes />
            </RuntimeErrorBoundary>
          </AuthGate>
          <PwaInstallBanner />
          <OfflineBanner />
        </div>
      </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
