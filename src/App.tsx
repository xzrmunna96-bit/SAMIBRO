import React, { useState, useEffect } from 'react';
import { OfficeIllustration } from './components/OfficeIllustration';
import { LoginForm, UserData } from './components/LoginForm';
import { LoggedInDashboard } from './components/LoggedInDashboard';
import { AdminPortal } from './components/AdminPortal';
import { CheckCircle2 } from 'lucide-react';
import { initializeFirebaseSync } from './services/firebaseSyncService';
import { initServerRealtimeSync } from './services/serverAuthSync';

const STORAGE_KEY_USER = 'super_x_user';

function checkIsAdminRoute(): boolean {
  try {
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const cleanPath = path.replace(/\/+$/, '');
    return (
      cleanPath === '/admin' ||
      cleanPath.endsWith('/admin') ||
      path.includes('/admin') ||
      hash === '#admin' ||
      hash === '#/admin' ||
      hash.includes('admin')
    );
  } catch {
    return false;
  }
}

export function triggerAdminRoute(): void {
  try {
    window.location.hash = '#admin';
  } catch {
    try {
      if (!window.location.pathname.toLowerCase().includes('/admin')) {
        window.history.pushState({}, '', '/admin');
      }
    } catch {}
  }
  window.dispatchEvent(new Event('popstate'));
  window.dispatchEvent(new Event('hashchange'));
  window.dispatchEvent(new Event('navigate_admin'));
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem('super_x_current_view');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <span className="text-xl font-bold">!</span>
            </div>
            <h2 className="text-lg font-bold text-white">SUPER X SMS Portal</h2>
            <p className="text-xs text-slate-400">
              An unexpected application state occurred. Click below to refresh the workspace.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition shadow-lg"
            >
              🔄 Reload Application
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
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminRoute());
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize Server-Side & Firebase Real-Time Synchronization on App boot (non-blocking)
  useEffect(() => {
    const timer = setTimeout(() => {
      initServerRealtimeSync();
      initializeFirebaseSync();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Check for SPA 404 redirect fallback state from static hosts (Vercel, Netlify, S3, etc.)
  useEffect(() => {
    try {
      const redirectedPath = sessionStorage.getItem('spa_redirect_path');
      if (redirectedPath) {
        sessionStorage.removeItem('spa_redirect_path');
        window.history.replaceState({}, '', redirectedPath);
        setIsAdminRoute(checkIsAdminRoute());
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('navigate_admin', handleLocationChange);

    // Periodic safety check in case location changed without popstate
    const interval = setInterval(() => {
      const isRoute = checkIsAdminRoute();
      setIsAdminRoute((prev) => (prev !== isRoute ? isRoute : prev));
    }, 1000);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('navigate_admin', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } catch {
        // ignore
      }
    }
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleLoginSuccess = (user: UserData) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem('super_x_sms_logged_in_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    showToast('Signed in successfully to SUPER X SMS!');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem('super_x_sms_logged_in_user');
      localStorage.removeItem('super_x_current_view');
    } catch {
      // ignore
    }
  };

  const handleBackToLoginFromAdmin = () => {
    try {
      window.location.hash = '';
      if (window.location.pathname.toLowerCase().includes('/admin')) {
        window.history.pushState({}, '', '/');
      }
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('popstate'));
    window.dispatchEvent(new Event('hashchange'));
    setIsAdminRoute(false);
  };

  // 1. If on /admin route -> render Admin Portal
  if (isAdminRoute) {
    return <AdminPortal onBackToLogin={handleBackToLoginFromAdmin} />;
  }

  // 2. When logged in -> render the complete full-screen SMS/OTP Dashboard matching the portal layout
  if (currentUser) {
    return <LoggedInDashboard user={currentUser} onLogout={handleLogout} />;
  }

  // 3. Otherwise -> Regular Login Viewport
  return (
    <main
      id="main-login-viewport"
      className="min-h-screen w-full relative flex items-center justify-center p-3 sm:p-5 md:p-8 font-sans overflow-x-hidden selection:bg-purple-200 selection:text-purple-900"
      style={{
        background: 'linear-gradient(135deg, #f0259b 0%, #c026d3 35%, #9333ea 70%, #7e22ce 100%)',
      }}
    >
      {/* Ambient background lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/30 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Toast notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs sm:text-sm font-medium border border-white/20 animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Login Card - slightly wider white surface with elegant spacing */}
      <section
        id="login-main-card"
        className="w-full max-w-[440px] md:max-w-[820px] bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] overflow-hidden transition-all duration-300 border border-white/40 my-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 items-center">
          {/* Left / Top Column: Office Vector Artwork (Compact & Aesthetic) */}
          <div
            id="illustration-pane"
            className="md:col-span-5 bg-gradient-to-b from-purple-50/50 via-white to-purple-50/20 px-4 pt-5 pb-3 md:p-6 flex flex-col justify-center items-center relative overflow-hidden border-b md:border-b-0 md:border-r border-gray-100"
          >
            <OfficeIllustration />
          </div>

          {/* Right / Bottom Column: Pure Login Form */}
          <div
            id="form-pane"
            className="md:col-span-7 bg-white px-6 pt-4 pb-6 sm:px-8 sm:py-8 md:p-10 flex flex-col justify-center items-center relative"
          >
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      </section>
    </main>
  );
}
