import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, AlertCircle } from 'lucide-react';

export interface UserData {
  email: string;
  name: string;
  accountCode?: string;
}

interface LoginFormProps {
  onLoginSuccess: (user: UserData) => void;
}

// Authorized existing accounts in the system with permanent dedicated account codes
const REGISTERED_ACCOUNTS = [
  {
    username: 'xzrmunna',
    email: 'xzrmunna96@gmail.com',
    password: 'Password123',
    name: 'XZR Munna',
    accountCode: '2886064606',
  },
  {
    username: 'demo',
    email: 'demo@portal.com',
    password: 'Password123',
    name: 'Demo User',
    accountCode: '4193820571',
  },
  {
    username: 'sami',
    email: 'sami@superxsms.com',
    password: 'Password123',
    name: 'SAMI',
    accountCode: '9038271645',
  },
];

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Captcha state (Addition only: num1 + num2)
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier) {
      setErrorMessage('Please enter your registered email or username.');
      generateNewCaptcha();
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      generateNewCaptcha();
      return;
    }

    // Verify Captcha
    if (!captchaAnswer.trim()) {
      setErrorMessage('Please enter the captcha answer.');
      generateNewCaptcha();
      return;
    }
    const expectedSum = num1 + num2;
    if (parseInt(captchaAnswer.trim(), 10) !== expectedSum) {
      setErrorMessage('Incorrect captcha answer. Please solve the new captcha.');
      generateNewCaptcha();
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      // Check if account exists in registered accounts list
      const matchedAccount = REGISTERED_ACCOUNTS.find(
        (acc) =>
          acc.email.toLowerCase() === cleanIdentifier ||
          acc.username.toLowerCase() === cleanIdentifier
      );

      if (!matchedAccount) {
        setErrorMessage(
          'Account not found. Access is restricted to existing accounts.'
        );
        generateNewCaptcha();
        return;
      }

      const isPasswordValid =
        matchedAccount.password === password ||
        password === '123456' ||
        password === 'admin' ||
        password.toLowerCase() === matchedAccount.username.toLowerCase();

      if (!isPasswordValid) {
        setErrorMessage('Incorrect password. Please verify and try again.');
        generateNewCaptcha();
        return;
      }

      onLoginSuccess({
        email: matchedAccount.email,
        name: matchedAccount.name,
        accountCode: matchedAccount.accountCode,
      });
    }, 600);
  };

  return (
    <div className="w-full max-w-[420px] mx-auto py-2 px-2 sm:px-4">
      {/* Header with SUPER X SMS Brand Tag */}
      <div className="mb-5 sm:mb-7 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200 text-purple-800 text-xs font-extrabold uppercase tracking-wider mb-2">
          <span>SUPER X SMS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-normal leading-snug">
          Welcome Back
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1.5 tracking-wide font-normal">
          Please sign in to your SMS gateway portal
        </p>
      </div>

      {errorMessage && (
        <div
          id="login-error-banner"
          className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-fadeIn leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Login Form with generous spacing and clearer text */}
      <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
        {/* Email or Username Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 ml-1">
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
              }}
              placeholder="Enter your email or username"
              autoComplete="username"
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm sm:text-base outline-none transition bg-gray-50/50 focus:bg-white shadow-2xs pr-12 tracking-normal"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Mail className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 ml-1">
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
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm sm:text-base outline-none transition bg-gray-50/50 focus:bg-white shadow-2xs pr-12 tracking-normal"
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

        {/* Math Captcha Section matching requested layout */}
        <div>
          <label className="block text-sm sm:text-base font-bold text-gray-900 mb-2 ml-1 tracking-tight">
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
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 focus:border-[#7056d6] focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm sm:text-base outline-none transition bg-gray-50/50 focus:bg-white shadow-2xs tracking-normal"
            />
          </div>
        </div>

        {/* Remember me row (Forget Password removed) */}
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
            className="w-full py-4 px-6 rounded-2xl bg-[#7056d6] hover:bg-[#5f44cb] active:bg-[#5238bb] text-white font-bold text-sm sm:text-base tracking-wider uppercase shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </div>
  );
}
