import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  Clock,
  Sparkles,
  X,
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingAccountNotice, setPendingAccountNotice] = useState<{ email: string; name: string } | null>(null);
  const [suspendedNotice, setSuspendedNotice] = useState<{ email: string; name: string; reason?: string } | null>(null);

  // Captcha state (Addition: num1 + num2)
  const [num1, setNum1] = useState(9);
  const [num2, setNum2] = useState(4);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const generateNewCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 2; // 2 to 10
    const n2 = Math.floor(Math.random() * 9) + 1; // 1 to 9
    setNum1(n1);
    setNum2(n2);
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateNewCaptcha();
  }, []);

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

    // Verify Captcha
    const expectedSum = num1 + num2;
    if (parseInt(captchaAnswer.trim(), 10) !== expectedSum) {
      setErrorMessage('Math answer is incorrect. Please calculate again.');
      generateNewCaptcha();
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateUserAsync(cleanIdentifier, cleanPassword);

      if (result.success && result.user) {
        onLoginSuccess({
          email: result.user.email,
          name: result.user.name,
          accountCode: result.user.accountCode,
          role: result.user.role,
          phoneOrTelegram: result.user.phoneOrTelegram,
          note: result.user.note,
        });
      } else {
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
        } else {
          setErrorMessage(result.message || 'Account not found. Only accounts created by the Admin can log in.');
        }
        generateNewCaptcha();
      }
    } catch {
      setErrorMessage('Unable to connect to authentication server. Please try again.');
      generateNewCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto py-2 px-2 sm:px-3 relative">
      {/* Header Container: Brand Tag & Title */}
      <div className="text-left mb-6 sm:mb-7">
        {/* Brand Name with Animated Rainbow Border & Rainbow Text Flow */}
        <div className="relative inline-block p-[2px] rounded-2xl animate-rainbow-border animate-rainbow-pulse-box mb-2.5 shadow-md overflow-hidden group">
          {/* Shimmer Light Beam Sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-light-sweep pointer-events-none" />
          <div className="relative px-3.5 py-1.5 sm:px-4 sm:py-2 bg-slate-950 rounded-[14px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-base sm:text-lg font-black uppercase tracking-wider animate-snake-rainbow-text">
              SUPER X SMS
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-normal leading-snug">
          Welcome Back
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 tracking-wide font-normal">
          Please sign in to your SMS gateway portal
        </p>
      </div>

      {/* Pending Approval Notice Banner */}
      {pendingAccountNotice && (
        <div
          id="login-pending-notice"
          className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-medium flex items-start gap-3 animate-fadeIn shadow-2xs"
        >
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">Account Pending Admin Approval</p>
            <p className="text-amber-800 text-xs leading-relaxed">
              Your account (<strong className="font-mono">{pendingAccountNotice.email}</strong>) is currently in <strong className="text-amber-900">PENDING</strong> status. Once approved by the administrator, you can sign in directly with your password.
            </p>
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div
          id="login-error-banner"
          className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-fadeIn leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleLogin} className="space-y-4 sm:space-y-4.5">
        {/* Email or Username Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">
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
              placeholder="Enter your email or username"
              autoComplete="username"
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm outline-none transition bg-gray-50/50 focus:bg-white shadow-2xs pr-12 tracking-normal"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Mail className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">
            Password
          </label>
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
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm outline-none transition bg-gray-50/50 focus:bg-white shadow-2xs pr-12 tracking-normal"
            />
            <button
              id="toggle-login-password-visibility-btn"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1 focus:outline-none cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Math Captcha Section */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 ml-1 tracking-tight">
            What is {num1} + {num2} = ? :
          </label>
          <div className="relative">
            <input
              id="captcha-answer-input"
              type="number"
              value={captchaAnswer}
              onChange={(e) => {
                setCaptchaAnswer(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Answer"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm outline-none transition bg-gray-50/50 focus:bg-white shadow-2xs tracking-normal"
            />
          </div>
        </div>

        {/* Remember me row */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-800 transition">
            <input
              id="remember-me-checkbox"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#7056d6] focus:ring-[#7056d6] accent-[#7056d6] cursor-pointer"
            />
            <span className="text-xs sm:text-sm font-medium tracking-wide">Remember me</span>
          </label>
        </div>

        {/* Primary Sign In Button */}
        <div className="pt-2">
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#7056d6] hover:bg-[#5f44cb] active:bg-[#5238bb] text-white font-bold text-sm sm:text-base tracking-wider uppercase shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>SIGN IN</span>
            )}
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
                  <p className="text-[11px] text-rose-200 font-normal">অ্যাকাউন্টটি স্থগিত / ব্যান করা হয়েছে</p>
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
                <span className="font-extrabold text-rose-800 block">কেন অ্যাকাউন্ট স্থগিত করা হয়েছে (Reason):</span>
                <p className="text-gray-700 leading-relaxed font-medium">
                  {suspendedNotice.reason || 'শর্তাবলী লংঘন বা এডমিন নির্দেশের কারণে এই অ্যাকাউন্টটি স্থগিত রাখা হয়েছে।'}
                </p>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                আপনার অ্যাকাউন্টে সমস্যা হলে সরাসরি এডমিনের সাথে যোগাযোগ করুন।
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendedNotice(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Close (বন্ধ করুন)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
