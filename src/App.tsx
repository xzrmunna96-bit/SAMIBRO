import React, { useState, useEffect } from 'react';
import { LoginBrandShowcase } from './components/LoginBrandShowcase';
import { LoginForm, UserData } from './components/LoginForm';
import { LoggedInDashboard } from './components/LoggedInDashboard';
import { AdminPortal } from './components/AdminPortal';
import { CheckCircle2 } from 'lucide-react';
import { getAllAccounts } from './services/userAuthService';
import { fetchAccountsFromServer, fetchSubAdminsFromServer } from './services/serverAuthSync';

export function triggerAdminRoute() {
  try {
    window.location.hash = '#/admin';
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('popstate'));
  window.dispatchEvent(new Event('hashchange'));
}

export function App() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    try {
      const savedUser = localStorage.getItem('super_x_sms_logged_in_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      return path.includes('/admin') || hash.includes('/admin') || hash.includes('#admin');
    } catch {
      return false;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Eagerly pre-warm & sync database accounts on launch
    fetchAccountsFromServer().catch(() => {});
    fetchSubAdminsFromServer().catch(() => {});
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const onAdmin = path.includes('/admin') || hash.includes('/admin') || hash.includes('#admin');
        setIsAdminRoute(onAdmin);
      } catch {
        // ignore
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Synchronize currentUser with live real-time account updates (role changes, approvals, name updates)
  useEffect(() => {
    const handleAccountsUpdated = () => {
      if (!currentUser || !currentUser.email) return;
      try {
        const cleanEmail = currentUser.email.toLowerCase().trim();
        const accounts = getAllAccounts();
        const match = accounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
        if (match) {
          setCurrentUser((prev) => {
            if (!prev) return null;
            if (prev.role !== match.role || prev.status !== match.status || prev.name !== match.name) {
              const updated = { ...prev, role: match.role, status: match.status, name: match.name };
              try {
                localStorage.setItem('super_x_sms_logged_in_user', JSON.stringify(updated));
              } catch {}
              return updated;
            }
            return prev;
          });
        }
      } catch {}
    };

    window.addEventListener('super_x_accounts_updated', handleAccountsUpdated);
    window.addEventListener('storage', handleAccountsUpdated);
    return () => {
      window.removeEventListener('super_x_accounts_updated', handleAccountsUpdated);
      window.removeEventListener('storage', handleAccountsUpdated);
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: UserData) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('super_x_sms_logged_in_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    setToastMessage(`Welcome back, ${user.name || user.email}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('super_x_sms_logged_in_user');
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

  // 3. Otherwise -> Regular Modern Login Viewport Matching Reference Image
  return (
    <main
      id="main-login-viewport"
      className="min-h-screen w-full relative flex items-center justify-center p-3 sm:p-6 md:p-10 font-sans overflow-x-hidden selection:bg-teal-600 selection:text-white bg-gradient-to-br from-[#f3f8d2] via-[#e6f3aa] to-[#d4eb89]"
    >
      {/* Floating Organic Fluid circles matching image background */}
      <div className="fixed top-0 left-0 w-80 h-80 bg-[#bef264]/40 rounded-full blur-3xl pointer-events-none -translate-x-1/3 -translate-y-1/3" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-[#86efac]/35 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />
      <div className="fixed top-1/2 right-10 w-64 h-64 bg-[#6ee7b7]/20 rounded-full blur-2xl pointer-events-none" />

      {/* Floating Toast notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-emerald-500/40 animate-fadeIn"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Login Card */}
      <section
        id="login-main-card"
        className="w-full max-w-[440px] md:max-w-[850px] bg-white rounded-[32px] shadow-[0_25px_60px_-15px_rgba(16,112,128,0.25)] overflow-hidden transition-all duration-300 border border-white/80 my-auto relative z-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
          {/* Left Column: Teal & Green Organic Gradient Showcase */}
          <div
            id="brand-showcase-pane"
            className="md:col-span-5 flex flex-col justify-center"
          >
            <LoginBrandShowcase />
          </div>

          {/* Right Column: Clean White Sign In Form */}
          <div
            id="form-pane"
            className="md:col-span-7 bg-white px-6 py-6 sm:px-8 sm:py-8 flex flex-col justify-center items-center relative"
          >
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
