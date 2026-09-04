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
} from 'lucide-react';
import {
  authenticateUserAsync,
} from '../services/userAuthService';
import { triggerAdminRoute } from '../App';

export interface UserData {
  email: string;
  name: string;
  accountCode?: string;
  role?: string;
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

  // Security Math Captcha (n1 + n2)
  const [num1, setNum1] = useState(6);
  const [num2, setNum2] = useState(4);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const generateNewCaptcha = () => {
    const n1 = Math.floor(Math.random() * 7) + 3; // 3 to 9
    const n2 = Math.floor(Math.random() * 6) + 1; // 1 to 6
    setNum1(n1);
    setNum2(n2);
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateNewCaptcha();
  }, []);

  const handleQuickPreset = (emailVal: string, passVal: string, isAdminTab = false) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setCaptchaAnswer(String(num1 + num2));
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

    // Verify Captcha (allow soft auto-fill if empty or matches)
    const expectedSum = num1 + num2;
    const userAns = parseInt(captchaAnswer.trim(), 10);
    if (captchaAnswer.trim() !== '' && userAns !== expectedSum) {
      setErrorMessage(`Security math check incorrect. (${num1} + ${num2} = ${expectedSum})`);
      generateNewCaptcha();
      return;
    }

    // Save Remember Me
    try {
      if (rememberMe) {
        localStorage.setItem('super_x_sms_remembered_identifier', cleanIdentifier);
      } else {
        localStorage.removeItem('super_x_sms_remembered_identifier');
      }
    } catch {}

    setIsLoading(true);

    // Hard safety timeout to guarantee the button NEVER gets stuck spinning
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    try {
      const result = await authenticateUserAsync(cleanIdentifier, cleanPassword);
      clearTimeout(safetyTimeout);

      if (result.success && result.user) {
        setIsLoading(false);
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
          setErrorMessage('Incorrect password. Please verify your password and try again. (পাসওয়ার্ডটি সঠিক নয়)');
        } else {
          setErrorMessage(
            result.message || 'Invalid username or password. This account was not found in our database. (ভুল ইউজারনেম বা পাসওয়ার্ড)'
          );
        }
        generateNewCaptcha();
      }
    } catch {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
      setErrorMessage('Login failed. Please check your credentials and try again. (লগিন ব্যর্থ হয়েছে)');
      generateNewCaptcha();
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto py-2 px-1 relative text-slate-800">
      {/* Top Selector / Mode Navigation */}
      <div className="flex items-center justify-between gap-2 p-1 bg-slate-100/90 rounded-2xl mb-5 border border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            setActiveLoginTab('user');
            setErrorMessage('');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeLoginTab === 'user'
              ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <span>Client Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLoginTab('admin');
            setErrorMessage('');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeLoginTab === 'admin'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-300" />
          <span>Admin Portal</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="mb-5">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          {activeLoginTab === 'admin' ? 'Admin Access Gateway' : 'Sign In to Portal'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          {activeLoginTab === 'admin'
            ? 'Authorized administrators and staff credentials only'
            : 'Access your dedicated live SMS console & OTP dashboard'}
        </p>
      </div>

      {/* Quick 1-Click Preset Badges for zero friction */}
      <div className="mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
          <span className="flex items-center gap-1 text-indigo-700">
            <Zap className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />
            Quick 1-Click Test Fill:
          </span>
          <span className="text-[10px] text-slate-400">Instant Test</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickPreset('xzrmunna96@gmail.com', 'Password123', true)}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-indigo-200"
          >
            <span>👑 Super Admin (Munna)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('xzrmunna', 'Password123', false)}
            className="px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-purple-200"
          >
            <span>👤 Username Login</span>
          </button>
        </div>
      </div>

      {/* Pending Account Notice Banner */}
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

      {/* Main Login Form */}
      <form onSubmit={handleLogin} className="space-y-3.5">
        {/* Email or Username Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1">
            Email or Username
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
              placeholder="e.g. xzrmunna96@gmail.com or username"
              autoComplete="username"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition bg-slate-50/50 focus:bg-white shadow-xs pr-11 font-medium"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1 ml-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
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
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition bg-slate-50/50 focus:bg-white shadow-xs pr-11 font-medium"
            />
            <button
              id="toggle-login-password-visibility-btn"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 focus:outline-none cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Security Math Captcha */}
        <div className="bg-indigo-50/60 border border-indigo-100/90 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Security Check: <strong className="text-indigo-700 text-sm ml-1 font-mono">{num1} + {num2} = ?</strong></span>
            </label>
            <button
              type="button"
              onClick={generateNewCaptcha}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 transition px-2 py-0.5 rounded-md hover:bg-indigo-100 cursor-pointer"
              title="Get new math question"
            >
              <RotateCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="captcha-answer-input"
              type="number"
              value={captchaAnswer}
              onChange={(e) => {
                setCaptchaAnswer(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder={`Enter sum (${num1 + num2})`}
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 text-slate-900 placeholder-slate-400 text-sm outline-none transition bg-white shadow-xs font-mono"
            />
            <button
              type="button"
              onClick={() => setCaptchaAnswer(String(num1 + num2))}
              className="px-3 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
              title="1-Click Auto Calculate"
            >
              <Check className="w-3.5 h-3.5 text-indigo-700" />
              <span>Auto = {num1 + num2}</span>
            </button>
          </div>
        </div>

        {/* Remember me & Help row */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-800 transition">
            <input
              id="remember-me-checkbox"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium">Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Need Account / Help?</span>
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="pt-1.5">
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 hover:from-indigo-800 hover:to-purple-800 active:scale-[0.99] text-white font-black text-sm sm:text-base tracking-wider uppercase shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              <>
                <span>SIGN IN TO PORTAL</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Direct Admin Portal Button if admin tab selected */}
        {activeLoginTab === 'admin' && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => triggerAdminRoute()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700"
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
            <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                  <Headphones className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Support & Account Request</h3>
                  <p className="text-[11px] text-indigo-200">Official SUPER X SMS Help Center</p>
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
                  <p className="text-slate-600">Telegram: <strong className="text-indigo-600 font-mono">@xzrmunna</strong></p>
                  <p className="text-slate-600">Email: <strong className="text-indigo-600 font-mono">xzrmunna96@gmail.com</strong></p>
                </div>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <a
                  href="https://t.me/xzrmunna"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Open Telegram Chat (@xzrmunna)</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Contact Admin on Telegram</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSuspendedNotice(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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
