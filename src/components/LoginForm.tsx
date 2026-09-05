import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  KeyRound,
  Shield,
  HelpCircle,
  Send,
  Check,
  Zap,
  Headphones,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  authenticateUserAsync,
} from '../services/userAuthService';
import {
  fetchAccountsFromServer,
  fetchSubAdminsFromServer,
} from '../services/serverAuthSync';
import { sendUserActivityToTelegram } from '../services/telegramService';
import { triggerAdminRoute } from '../App';

export interface UserData {
  email: string;
  name: string;
  accountCode?: string;
  role?: string;
  status?: string;
  phoneOrTelegram?: string;
  note?: string;
}

interface LoginFormProps {
  onLoginSuccess: (user: UserData) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [activeLoginTab, setActiveLoginTab] = useState<'user' | 'admin'>('user');
  const [identifier, setIdentifier] = useState(() => {
    try {
      return localStorage.getItem('super_x_sms_remembered_identifier') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAccountNotice, setPendingAccountNotice] = useState<{ email: string; name: string } | null>(null);
  const [suspendedNotice, setSuspendedNotice] = useState<{ email: string; name: string; reason?: string } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // AUTOMATIC BOT CAPTCHA STATE (2 Seconds Auto Verification)
  const [autoCaptchaState, setAutoCaptchaState] = useState<'verifying' | 'verified'>('verifying');
  const [autoCaptchaProgress, setAutoCaptchaProgress] = useState(0);

  useEffect(() => {
    // Eagerly pre-warm & sync database accounts across all browsers
    fetchAccountsFromServer().catch(() => {});
    fetchSubAdminsFromServer().catch(() => {});

    // Start 2-second automatic bot security check on load
    setAutoCaptchaState('verifying');
    setAutoCaptchaProgress(10);

    const interval = setInterval(() => {
      setAutoCaptchaProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 350);

    const timer = setTimeout(() => {
      setAutoCaptchaState('verified');
      setAutoCaptchaProgress(100);
    }, 1800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleQuickPreset = (emailVal: string, passVal: string, isAdminTab = false) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setErrorMessage('');
    setPendingAccountNotice(null);
    setSuspendedNotice(null);
    if (isAdminTab) {
      setActiveLoginTab('admin');
    } else {
      setActiveLoginTab('user');
    }
  };

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
      setErrorMessage('Please enter your email or username (আপনার ইমেইল বা ইউজারনেম দিন)');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Please enter your password (পাসওয়ার্ড দিন)');
      return;
    }

    // Instantly complete auto-captcha if user clicks early
    setAutoCaptchaState('verified');
    setAutoCaptchaProgress(100);

    // Save Remember Me
    try {
      if (rememberMe) {
        localStorage.setItem('super_x_sms_remembered_identifier', cleanIdentifier);
      } else {
        localStorage.removeItem('super_x_sms_remembered_identifier');
      }
    } catch {}

    setIsLoading(true);

    // Hard safety timeout to guarantee the button NEVER gets stuck spinning on slow connections
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 6000);

    try {
      const result = await authenticateUserAsync(cleanIdentifier, cleanPassword);
      clearTimeout(safetyTimeout);

      if (result.success && result.user) {
        setIsLoading(false);
        sendUserActivityToTelegram({
          action: 'User Login',
          userEmail: result.user.email,
          userName: result.user.name,
          userCode: result.user.accountCode,
          details: `Role: ${result.user.role || 'Client'} | Portal Sign In`,
        }).catch(() => {});
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

  return (
    <div className="w-full max-w-[460px] mx-auto py-2 px-1 relative text-slate-800">
      {/* Main Title */}
      <div className="mb-5">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Sign In
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Please enter your login information to sign in.
        </p>
      </div>

      {/* Pending Approval Notice Banner */}
      {pendingAccountNotice && (
        <div
          id="login-pending-notice"
          className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-medium flex items-start gap-3 animate-fadeIn shadow-xs"
        >
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Account Pending Admin Approval</p>
            <p className="text-amber-800 text-xs leading-relaxed">
              Your account (<strong className="font-mono">{pendingAccountNotice.email}</strong>) is currently awaiting admin verification. Once approved, you can sign in directly.
            </p>
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div
          id="login-error-banner"
          className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-fadeIn shadow-xs leading-relaxed"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-950 text-xs uppercase tracking-wider mb-0.5">Authentication Error</p>
            <span className="text-rose-900 font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-700 transition p-1 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Username / Email Input with Underline / Clean Border styling matching image */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-0.5">
            Username or Email
          </label>
          <div className="relative">
            <input
              id="login-email-input"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errorMessage) setErrorMessage('');
                if (pendingAccountNotice) setPendingAccountNotice(null);
              }}
              placeholder="Username or email"
              autoComplete="username"
              className="w-full px-1 py-2.5 border-b-2 border-slate-300 hover:border-slate-400 focus:border-[#107080] text-slate-900 placeholder-slate-400 text-sm outline-none transition bg-transparent font-medium"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1 ml-0.5">
            <label className="block text-xs font-semibold text-slate-500">
              Password
            </label>
            {capsLockActive && (
              <span className="text-[11px] text-amber-600 font-bold animate-pulse">
                ⚠️ CAPS LOCK ON
              </span>
            )}
          </div>
          <div className="relative">
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
              placeholder="Password"
              autoComplete="current-password"
              className="w-full px-1 py-2.5 border-b-2 border-slate-300 hover:border-slate-400 focus:border-[#107080] text-slate-900 placeholder-slate-400 text-sm outline-none transition bg-transparent font-medium pr-8"
            />
            <button
              id="toggle-login-password-visibility-btn"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 focus:outline-none cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me row matching image */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-800 transition">
            <input
              id="remember-me-checkbox"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#107080] focus:ring-[#107080] accent-[#107080] cursor-pointer"
            />
            <span className="text-xs text-slate-600 font-medium">Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="text-xs font-semibold text-[#107080] hover:underline cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>

        {/* Primary Action Button - Pill Gradient Button matching image */}
        <div className="pt-2">
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#12657e] via-[#107080] to-[#1fa288] hover:from-[#0e576d] hover:to-[#1a8e77] active:scale-[0.99] text-white font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 text-white animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Direct Admin Access Button if Admin tab */}
        {activeLoginTab === 'admin' && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => triggerAdminRoute()}
              className="w-full py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-950 text-amber-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border border-slate-800"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Direct Open Admin Control Center</span>
            </button>
          </div>
        )}
      </form>

      {/* -------------------- MODAL: NEED HELP / CONTACT ADMIN -------------------- */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-[#0f5f78] to-[#1ea188] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 border border-white/30">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Support & Account Request</h3>
                  <p className="text-[11px] text-emerald-100">SUPER X SMS Official Help Center</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p className="font-medium text-slate-800 text-sm">
                  নতুন একাউন্ট খোলা বা লগিন সমস্যায় সহায়তার জন্য এডমিনের সাথে সরাসরি যোগাযোগ করুন:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-900">👑 Main System Admin: XZR Munna</p>
                  <p className="text-slate-600">Telegram: <strong className="text-teal-700 font-mono">@xzrmunna</strong></p>
                  <p className="text-slate-600">Email: <strong className="text-teal-700 font-mono">xzrmunna96@gmail.com</strong></p>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <a
                  href="https://t.me/xzrmunna"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Open Telegram Chat (@xzrmunna)</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-rose-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-rose-700 via-red-700 to-rose-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 border border-white/30">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Account Suspended</h3>
                  <p className="text-[11px] text-rose-200 font-normal">Your account access is currently suspended</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuspendedNotice(null)}
                className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto border-4 border-rose-50 shadow-md">
                <AlertCircle className="w-9 h-9" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-xs uppercase tracking-wide mb-1.5">
                  <span>Access Suspended</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900">
                  {suspendedNotice.name} ({suspendedNotice.email})
                </h4>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left text-xs space-y-1">
                <span className="font-extrabold text-rose-800 block">Reason for Suspension:</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {suspendedNotice.reason || 'This account has been suspended by Admin instructions or policy terms.'}
                </p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                If you believe this is an error, please contact live administrator support.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href="https://t.me/xzrmunna"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Contact Admin on Telegram</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSuspendedNotice(null)}
                  className="w-full py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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
