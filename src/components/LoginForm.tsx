import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  Clock,
  X,
  KeyRound,
  Send,
  Headphones,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { authenticateUserAsync } from '../services/userAuthService';
import { fetchAccountsFromServer, fetchSubAdminsFromServer } from '../services/serverAuthSync';
import { recordUserLoginEvent } from '../services/onlineTrackingService';
import { triggerAdminRoute } from '../App';
import { SkypeLogo, MicrosoftTeamsLogo } from './BrandLogos';
import {
  TEAMS_DIRECT_CHAT_URL,
  SKYPE_DIRECT_CHAT_URL,
  handleOpenSkypeOrTeams,
} from '../utils/contactLinks';

export interface UserData {
  email: string;
  name: string;
  accountCode?: string;
  role?: string;
  status?: string;
  phoneOrTelegram?: string;
  note?: string;
  avatarUrl?: string;
  apiUnlocked?: boolean;
  apiKey?: string;
}

interface LoginFormProps {
  onLoginSuccess: (user: UserData) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [view, setView] = useState<'login' | 'create_account'>('login');
  const [direction, setDirection] = useState<number>(1);
  const [activeLoginTab, setActiveLoginTab] = useState<'user' | 'admin'>('user');

  const [identifier, setIdentifier] = useState(() => {
    try {
      const remembered = localStorage.getItem('super_x_sms_remembered_identifier');
      if (remembered) return remembered;
      const deviceAcc = localStorage.getItem('super_x_device_registered_account_v1');
      if (deviceAcc) {
        const parsed = JSON.parse(deviceAcc);
        if (parsed.email && parsed.state === 'approved') return parsed.email;
      }
      return '';
    } catch {
      return '';
    }
  });

  const [password, setPassword] = useState(() => {
    try {
      const rememberedPass = localStorage.getItem('super_x_sms_remembered_password');
      if (rememberedPass) return rememberedPass;
      const deviceAcc = localStorage.getItem('super_x_device_registered_account_v1');
      if (deviceAcc) {
        const parsed = JSON.parse(deviceAcc);
        if (parsed.password && (parsed.state === 'approved' || parsed.password)) return parsed.password;
      }
      return '';
    } catch {
      return '';
    }
  });

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAccountNotice, setPendingAccountNotice] = useState<{ email: string; name: string } | null>(null);
  const [suspendedNotice, setSuspendedNotice] = useState<{ email: string; name: string; reason?: string } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    // Eagerly pre-warm & sync database accounts across all browsers
    fetchAccountsFromServer().catch(() => {});
    fetchSubAdminsFromServer().catch(() => {});

    const handleFillCredentials = (e: any) => {
      if (e?.detail) {
        if (e.detail.identifier !== undefined) setIdentifier(e.detail.identifier);
        if (e.detail.password !== undefined) setPassword(e.detail.password);
        setErrorMessage('');
        setPendingAccountNotice(null);
        setSuspendedNotice(null);
      }
    };
    window.addEventListener('super_x_fill_login_credentials', handleFillCredentials);
    return () => window.removeEventListener('super_x_fill_login_credentials', handleFillCredentials);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPendingAccountNotice(null);
    setSuspendedNotice(null);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      setErrorMessage('Please enter your email or username');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Please enter your password');
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem('super_x_sms_remembered_identifier', cleanIdentifier);
        localStorage.setItem('super_x_sms_remembered_password', cleanPassword);
      } else {
        localStorage.removeItem('super_x_sms_remembered_identifier');
        localStorage.removeItem('super_x_sms_remembered_password');
      }
    } catch {}

    setIsLoading(true);

    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 6000);

    try {
      const result = await authenticateUserAsync(cleanIdentifier, cleanPassword);
      clearTimeout(safetyTimeout);

      if (result.success && result.user) {
        setIsLoading(false);
        recordUserLoginEvent(result.user).catch(() => {});

        onLoginSuccess({
          email: result.user.email,
          name: result.user.name,
          accountCode: result.user.accountCode,
          role: result.user.role,
          phoneOrTelegram: result.user.phoneOrTelegram,
          note: result.user.note,
        });
      } else {
        setIsLoading(false);
        if (result.status === 'pending' && result.user) {
          setPendingAccountNotice({
            email: result.user.email,
            name: result.user.name,
          });
        } else if (result.status === 'suspended' && result.user) {
          setSuspendedNotice({
            email: result.user.email,
            name: result.user.name,
            reason: result.user.banReason || 'Administrative suspension',
          });
        } else if (result.status === 'invalid_password') {
          setErrorMessage('Incorrect password. Please verify your password and try again.');
        } else {
          setErrorMessage(
            result.message || 'Invalid username or password. This account was not found in our database.'
          );
        }
      }
    } catch {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
      setErrorMessage('Login failed. Please check your credentials and try again.');
    }
  };

  const cardVariants = {
    enter: {
      opacity: 0,
      scale: 0.99,
    },
    center: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.08,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.99,
      transition: {
        duration: 0.04,
        ease: 'easeIn' as const,
      },
    },
  };

  return (
    <div className="w-full max-w-[440px] mx-auto relative select-none">
      <AnimatePresence mode="popLayout">
        {view === 'login' ? (
          <motion.div
            key="login-view"
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full bg-[#0d1322]/90 backdrop-blur-2xl border border-slate-700/60 rounded-[28px] p-6 sm:p-8 shadow-2xl shadow-black/80 relative text-white"
          >
            {/* Header branding */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                Sign in to continue
              </p>
            </div>

            {/* Pending Notice Banner */}
            {pendingAccountNotice && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300">Account Pending Admin Approval</p>
                  <p className="text-amber-200/90 text-xs leading-relaxed">
                    Your account (<strong className="font-mono text-white">{pendingAccountNotice.email}</strong>) is currently awaiting admin verification.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-rose-200 font-medium leading-relaxed">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage('')}
                  className="text-rose-400 hover:text-rose-200 transition p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Main Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 ml-0.5">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email-input"
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage('');
                      if (pendingAccountNotice) setPendingAccountNotice(null);
                    }}
                    placeholder="name@domain.com"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#070b16] border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5 ml-0.5">
                  <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                      if (pendingAccountNotice) setPendingAccountNotice(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#070b16] border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-sm outline-none transition font-medium tracking-wide"
                  />
                  <button
                    id="toggle-login-password-visibility-btn"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {capsLockActive && (
                  <p className="text-[11px] text-amber-400 font-bold mt-1 ml-0.5 animate-pulse">
                    ⚠️ CAPS LOCK IS ON
                  </p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-200 transition">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-[#070b16] text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-medium">Remember me</span>
                </label>
              </div>

              {/* Sign in Button */}
              <div className="pt-2">
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#5856d6] via-[#6366f1] to-[#8b5cf6] hover:from-[#4f4dbf] hover:to-[#7c4ee6] active:scale-[0.98] text-white font-extrabold text-sm tracking-wide shadow-lg shadow-indigo-600/30 transition-all duration-150 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>➔ Sign in ➔</span>
                  )}
                </button>
              </div>

              {/* Direct Admin Trigger if requested */}
              {activeLoginTab === 'admin' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => triggerAdminRoute()}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-950 text-amber-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border border-slate-800"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Direct Open Admin Control Center</span>
                  </button>
                </div>
              )}
            </form>

            {/* Bottom Create Account Link */}
            <div className="text-center mt-6 pt-2 border-t border-slate-800/80">
              <p className="text-xs text-slate-400 font-medium">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setDirection(1);
                    setView('create_account');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-bold transition hover:underline cursor-pointer"
                >
                  Create an Account
                </button>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="create-account-view"
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full bg-[#0d1322]/90 backdrop-blur-2xl border border-slate-700/60 rounded-[28px] p-6 sm:p-8 shadow-2xl shadow-black/80 relative text-white"
          >
            {/* Header inside Card */}
            <div className="text-center mb-6">
              {/* App Icon badge */}
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-sky-500/20 p-2 mx-auto mb-3 border border-white/80">
                <svg className="w-9 h-9" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="12" fill="#0EA5E9" fillOpacity="0.1" />
                  <path
                    d="M12 24C12 17.3726 17.3726 12 24 12C30.6274 12 36 17.3726 36 24C36 30.6274 30.6274 36 24 36C21.4678 36 19.1128 35.2155 17.1724 33.8767L12 35L13.4116 30.3475C12.5186 28.4891 12 26.3474 12 24Z"
                    fill="url(#bubbleGrad2)"
                    stroke="#0284C7"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path d="M18 21H30M18 26H26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M7 17H13M6 22H11M8 27H13" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="bubbleGrad2" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#38BDF8" />
                      <stop offset="1" stopColor="#0284C7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Create an Account
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                Contact our team to get your account created
              </p>
            </div>

            {/* ENGLISH Section */}
            <div className="space-y-1.5 text-left mb-4">
              <div className="text-[11px] font-extrabold text-emerald-400 tracking-wider uppercase">
                ENGLISH
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                To get started, please contact us on <strong className="text-white font-semibold">Telegram</strong> or{' '}
                <strong className="text-white font-semibold">Skype</strong> with your company name and the service you require. Our team will set up your account and send you your login credentials.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800/80 my-4" />

            {/* ARABIC Section */}
            <div className="space-y-1.5 text-right mb-5" dir="rtl">
              <div className="text-[11px] font-extrabold text-emerald-400 tracking-wider uppercase text-right">
                ARABIC
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal text-right font-sans">
                يتم إنشاء الحسابات على هذه اللوحة بواسطة فريقنا. للبدء، يرجى التواصل معنا عبر التيليجرام أو سكايب مع اسم شركتك والخدمة التي تحتاجها. سيقوم فريقنا بإعداد حسابك وإرسال بيانات الدخول إليك.
              </p>
            </div>

            {/* Two Action Buttons (Telegram & Skype) */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href="https://t.me/xzrmunna"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </a>

              <button
                type="button"
                onClick={handleOpenSkypeOrTeams}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#00aff0] hover:bg-[#009cd8] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer"
              >
                <SkypeLogo className="w-4 h-4 text-white" />
                <span>Skype</span>
              </button>
            </div>

            {/* Subtext */}
            <p className="text-[11px] text-slate-400 text-center mt-3.5 font-medium">
              Direct support active 24/7. Click either channel to initiate direct setup.
            </p>

            {/* Back to Login Button */}
            <div className="mt-6 pt-3 border-t border-slate-800/80 text-center">
              <button
                type="button"
                onClick={() => {
                  setDirection(-1);
                  setView('login');
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer hover:underline py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL: NEED HELP / CONTACT ADMIN -------------------- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0e1424] rounded-3xl w-full max-w-md shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col text-white">
            <div className="p-4 bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                  <Headphones className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Support & Password Reset</h3>
                  <p className="text-[11px] text-slate-400">Official Help Center</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p className="font-medium text-slate-200 text-sm">
                  পাসওয়ার্ড রিসেট বা সহায়তার জন্য সরাসরি আমাদের সাপোর্ট টিমে যোগাযোগ করুন:
                </p>
                <div className="p-3.5 bg-[#070b16] border border-slate-800 rounded-xl space-y-2">
                  <p className="font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Manager Support 24/7</span>
                  </p>
                  <p className="text-slate-300 font-medium flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Telegram: <strong className="text-sky-300 font-mono">@xzrmunna</strong></span>
                  </p>
                  <p className="text-slate-300 font-medium flex items-center gap-2">
                    <SkypeLogo className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Skype / Email: <strong className="text-cyan-300 font-mono">charlesjames997@outlook.com</strong></span>
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <a
                  href="https://t.me/xzrmunna"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-sky-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Open Telegram Chat</span>
                </a>

                <button
                  type="button"
                  onClick={handleOpenSkypeOrTeams}
                  className="w-full py-2.5 px-4 rounded-full bg-[#00aff0] hover:bg-[#009cd8] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  <SkypeLogo className="w-4 h-4 text-white" />
                  <span>Open Skype / Teams Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-2 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: SUSPENDED ACCOUNT NOTICE -------------------- */}
      {suspendedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0e1424] rounded-3xl w-full max-w-md shadow-2xl border border-rose-500/40 overflow-hidden flex flex-col text-white">
            <div className="p-4 bg-gradient-to-r from-rose-950 to-rose-900 text-white flex items-center justify-between border-b border-rose-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Account Suspended</h3>
                  <p className="text-[11px] text-rose-300 font-normal">Access restricted</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuspendedNotice(null)}
                className="p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-center">
              <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500/30 shadow-lg">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white">
                  {suspendedNotice.name} ({suspendedNotice.email})
                </h4>
              </div>

              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-left text-xs space-y-1 text-rose-200">
                <span className="font-extrabold text-rose-300 block">Reason for Suspension:</span>
                <p className="leading-relaxed font-medium">
                  {suspendedNotice.reason || 'This account has been suspended by Admin instructions or policy terms.'}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="https://t.me/xzrmunna"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Contact Manager on Telegram</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSuspendedNotice(null)}
                  className="w-full py-2 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
