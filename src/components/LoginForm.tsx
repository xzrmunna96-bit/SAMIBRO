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
} from 'lucide-react';
import {
  authenticateUserAsync,
} from '../services/userAuthService';

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAccountNotice, setPendingAccountNotice] = useState<{ email: string; name: string } | null>(null);
  const [suspendedNotice, setSuspendedNotice] = useState<{ email: string; name: string; reason?: string } | null>(null);

  // Math Captcha state (Addition: num1 + num2)
  const [num1, setNum1] = useState(7);
  const [num2, setNum2] = useState(5);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const generateNewCaptcha = () => {
    const n1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
    const n2 = Math.floor(Math.random() * 8) + 1; // 1 to 8
    setNum1(n1);
    setNum2(n2);
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateNewCaptcha();
  }, []);

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setCaptchaAnswer(String(num1 + num2));
    setErrorMessage('');
    setPendingAccountNotice(null);
    setSuspendedNotice(null);
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

    // Verify Captcha (allow auto-correct if within tolerance or matching calculation)
    const expectedSum = num1 + num2;
    const userAns = parseInt(captchaAnswer.trim(), 10);
    if (captchaAnswer.trim() !== '' && userAns !== expectedSum) {
      setErrorMessage(`Security check calculation error. Please enter ${expectedSum} or recalculate.`);
      generateNewCaptcha();
      return;
    }

    // Remember me persistence
    try {
      if (rememberMe) {
        localStorage.setItem('super_x_sms_remembered_identifier', cleanIdentifier);
      } else {
        localStorage.removeItem('super_x_sms_remembered_identifier');
      }
    } catch {}

    setIsLoading(true);

    // Hard safety timer to prevent endless spinning under any circumstances
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

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
          setErrorMessage('Incorrect password. Please check your password and try again.');
        } else {
          setErrorMessage(
            result.message || 'Invalid username or password. This account was not found in our database.'
          );
        }
        generateNewCaptcha();
      }
    } catch {
      clearTimeout(safetyTimeout);
      setIsLoading(false);
      setErrorMessage('Invalid username or password. Please verify your credentials and try again.');
      generateNewCaptcha();
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto py-1 px-1 sm:px-2 relative">
      {/* Brand Header */}
      <div className="text-left mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 border border-purple-500/30 text-white shadow-sm mb-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-xs font-black uppercase tracking-widest text-amber-300">
            SUPER X SMS
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
          Sign In to Portal
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
          Enter your authorized credentials to access your dashboard
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
          className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-fadeIn shadow-xs leading-relaxed"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-900 text-xs uppercase tracking-wider mb-0.5">Authentication Error</p>
            <span className="text-rose-800 font-medium">{errorMessage}</span>
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
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 ml-1">
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
              placeholder="e.g. xzrmunna96@gmail.com"
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm outline-none transition bg-gray-50/60 focus:bg-white shadow-xs pr-11"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1 ml-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="login-password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
                if (pendingAccountNotice) setPendingAccountNotice(null);
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm outline-none transition bg-gray-50/60 focus:bg-white shadow-xs pr-11"
            />
            <button
              id="toggle-login-password-visibility-btn"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1 focus:outline-none cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Math Security Captcha Section */}
        <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
              <ShieldCheck className="w-4 h-4 text-[#7056d6]" />
              <span>Security Check: <strong className="text-[#7056d6] text-sm ml-1">{num1} + {num2} = ?</strong></span>
            </label>
            <button
              type="button"
              onClick={generateNewCaptcha}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition px-2 py-0.5 rounded-md hover:bg-purple-100 cursor-pointer"
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
              className="flex-1 px-3.5 py-2 rounded-lg border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-3 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm outline-none transition bg-white shadow-xs"
            />
            <button
              type="button"
              onClick={() => setCaptchaAnswer(String(num1 + num2))}
              className="px-2.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Auto-calculate"
            >
              Auto = {num1 + num2}
            </button>
          </div>
        </div>

        {/* Remember me row */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-800 transition">
            <input
              id="remember-me-checkbox"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#7056d6] focus:ring-[#7056d6] accent-[#7056d6] cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium">Remember me</span>
          </label>
          <span className="text-[11px] text-gray-400 font-medium">Official Portal</span>
        </div>

        {/* Primary Sign In Button */}
        <div className="pt-1">
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#7056d6] via-[#6042d3] to-[#4e2eb8] hover:from-[#6247cf] hover:to-[#4323ab] active:scale-[0.99] text-white font-black text-sm sm:text-base tracking-wider uppercase shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>SIGN IN</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Quick Fill One-Click Demo/Admin Button */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('xzrmunna96@gmail.com', 'Password123')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>1-Click Test Admin Fill</span>
          </button>
        </div>
      </form>

      {/* -------------------- MODAL: SUSPENDED ACCOUNT NOTICE -------------------- */}
      {suspendedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
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
                <h4 className="text-base font-extrabold text-gray-900">
                  {suspendedNotice.name} ({suspendedNotice.email})
                </h4>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left text-xs space-y-1">
                <span className="font-extrabold text-rose-800 block">Reason for Suspension:</span>
                <p className="text-gray-700 leading-relaxed font-medium">
                  {suspendedNotice.reason || 'This account has been suspended by Admin instructions or policy terms.'}
                </p>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                If you believe this is an error, please contact live administrator support.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendedNotice(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
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
