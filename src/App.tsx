import React, { useState, useEffect } from 'react';
import { LoginBrandShowcase } from './components/LoginBrandShowcase';
import { LoginForm, UserData } from './components/LoginForm';
import { LoggedInDashboard } from './components/LoggedInDashboard';
import { AdminPortal } from './components/AdminPortal';
import { ActiveAccountWidget } from './components/ActiveAccountWidget';
import { OfflineDetectorModal } from './components/OfflineDetectorModal';
import { CheckCircle2 } from 'lucide-react';
import { getAllAccounts, getAllSubAdmins } from './services/userAuthService';
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

import { MaintenanceOverlay } from './components/MaintenanceOverlay';
import { ManagerSupportPopupModal } from './components/ManagerSupportPopupModal';

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
        const subAdmins = getAllSubAdmins();
        const isSubAdmin = subAdmins.some((sa) => {
          const saEmail = sa.email.toLowerCase().trim();
          const saUser = saEmail.split('@')[0];
          return (
            sa.status === 'active' &&
            (saEmail === cleanEmail || saUser === cleanEmail || (sa.id && sa.id.toLowerCase() === cleanEmail))
          );
        });
        const isSuper =
          cleanEmail === 'xzrmunna33@gmail.com' ||
          cleanEmail === 'xzrmunna96@gmail.com' ||
          cleanEmail === 'xzrmunna';

        if (isSubAdmin || isSuper) {
          setCurrentUser((prev) => {
            if (!prev) return null;
            if (prev.role !== 'admin' || prev.status !== 'approved') {
              const updated = { ...prev, role: 'admin', status: 'approved' };
              try {
                localStorage.setItem('super_x_sms_logged_in_user', JSON.stringify(updated));
              } catch {}
              return updated;
            }
            return prev;
          });
          return;
        }

        const accounts = getAllAccounts();
        const match = accounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
        if (match) {
          setCurrentUser((prev) => {
            if (!prev) return null;
            const hasChanged =
              prev.role !== match.role ||
              prev.status !== match.status ||
              prev.name !== match.name ||
              prev.avatarUrl !== match.avatarUrl ||
              prev.phoneOrTelegram !== match.phoneOrTelegram ||
              prev.note !== match.note ||
              prev.apiUnlocked !== match.apiUnlocked ||
              prev.apiKey !== match.apiKey;

            if (hasChanged) {
              const updated = {
                ...prev,
                role: match.role,
                status: match.status,
                name: match.name,
                avatarUrl: match.avatarUrl,
                phoneOrTelegram: match.phoneOrTelegram,
                note: match.note,
                apiUnlocked: match.apiUnlocked,
                apiKey: match.apiKey,
              };
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
    window.addEventListener('super_x_sub_admins_updated', handleAccountsUpdated);
    window.addEventListener('storage', handleAccountsUpdated);
    return () => {
      window.removeEventListener('super_x_accounts_updated', handleAccountsUpdated);
      window.removeEventListener('super_x_sub_admins_updated', handleAccountsUpdated);
      window.removeEventListener('storage', handleAccountsUpdated);
    };
  }, [currentUser?.email]);

  // Automatically sync logged-in URL to default 'agent' when entering dashboard without overwriting sub-views
  useEffect(() => {
    if (currentUser && !isAdminRoute) {
      try {
        const hash = window.location.hash;
        if (!hash || hash === '#' || hash === '#/') {
          window.location.hash = '#/agent';
        }
      } catch {}
    }
  }, [currentUser, isAdminRoute]);

  const handleLoginSuccess = (user: UserData) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('super_x_sms_logged_in_user', JSON.stringify(user));
      sessionStorage.removeItem(`super_x_login_notice_shown_${user.email || 'user'}`);
    } catch {
      // ignore
    }
    setToastMessage(`Welcome back, ${user.name || user.email}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogout = () => {
    if (currentUser?.email) {
      try {
        sessionStorage.removeItem(`super_x_login_notice_shown_${currentUser.email}`);
      } catch {}
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('super_x_sms_logged_in_user');
      window.location.hash = '';
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
    return (
      <>
        <OfflineDetectorModal />
        <AdminPortal onBackToLogin={handleBackToLoginFromAdmin} />
      </>
    );
  }

  // 2. When logged in -> render the complete full-screen SMS/OTP Dashboard matching the portal layout
  if (currentUser) {
    return (
      <>
        <OfflineDetectorModal />
        <MaintenanceOverlay />
        <ManagerSupportPopupModal />
        <LoggedInDashboard user={currentUser} onLogout={handleLogout} />
      </>
    );
  }

  // 3. Otherwise -> Modern Dark Space Login Viewport Matching Screenshots
  return (
    <main
      id="main-login-viewport"
      className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 font-sans overflow-x-hidden selection:bg-indigo-600 selection:text-white bg-[#060913] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111a38] via-[#080d1e] to-[#04060f]"
    >
      <OfflineDetectorModal />
      <MaintenanceOverlay />
      <ManagerSupportPopupModal />

      {/* Subtle Dot Grid Background Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none" />

      {/* Glowing Ambient Glow Orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-indigo-600/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[420px] h-[420px] bg-sky-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-[320px] h-[320px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Toast notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-indigo-500/40 animate-fadeIn"
        >
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Center Branding & Card Wrapper */}
      <div className="w-full max-w-[440px] flex flex-col items-center relative z-10 my-auto py-6">
        {/* Top App Logo & Branding */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-sky-500/20 p-2.5 mx-auto border border-white/90 transition-transform duration-300 hover:scale-105">
            <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="#0EA5E9" fillOpacity="0.1" />
              <path
                d="M12 24C12 17.3726 17.3726 12 24 12C30.6274 12 36 17.3726 36 24C36 30.6274 30.6274 36 24 36C21.4678 36 19.1128 35.2155 17.1724 33.8767L12 35L13.4116 30.3475C12.5186 28.4891 12 26.3474 12 24Z"
                fill="url(#headerBubbleGrad)"
                stroke="#0284C7"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M18 21H30M18 26H26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M7 17H13M6 22H11M8 27H13" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="headerBubbleGrad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38BDF8" />
                  <stop offset="1" stopColor="#0284C7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-3.5">
            SUPER X <span className="text-[#38bdf8] font-black">SMS</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.2em] text-slate-400 uppercase mt-1">
            ENTERPRISE VERIFICATION NETWORK
          </p>
        </div>

        {/* 3D Animated Card (Login / Create Account with Page Flip) */}
        <section id="login-main-card" className="w-full">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </section>
      </div>

      {/* Floating Active Account Support Widget at bottom right */}
      <ActiveAccountWidget />
    </main>
  );
}

export default App;
