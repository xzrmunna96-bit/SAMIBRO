import React, { useState, useEffect } from 'react';
import { OfficeIllustration } from './components/OfficeIllustration';
import { LoginForm, UserData } from './components/LoginForm';
import { LoggedInDashboard } from './components/LoggedInDashboard';
import { CheckCircle2 } from 'lucide-react';

const STORAGE_KEY_USER = 'super_x_user';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    // Default persistent user session so page reloads keep you on your active view
    return {
      name: 'XZR Munna',
      email: 'xzrmunna96@gmail.com',
      accountCode: '2886064606'
    };
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    } catch {
      // ignore
    }
    showToast('Signed in successfully to SUPER X SMS!');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem('super_x_current_view');
    } catch {
      // ignore
    }
  };

  // When logged in, render the complete full-screen SMS/OTP Dashboard matching the portal layout
  if (currentUser) {
    return <LoggedInDashboard user={currentUser} onLogout={handleLogout} />;
  }

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
