import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  MessageSquarePlus,
  Send,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  X,
  MessageCircle,
  MessageSquare,
  ArrowRight,
  Share2,
  User,
  Check,
  ChevronDown,
  Copy,
  ShieldCheck,
  RotateCcw,
  Key,
} from 'lucide-react';
import {
  authenticateUser,
  requestNewAccount,
  getAllAccounts,
  UserAccount,
  ASIAN_COUNTRIES,
} from '../services/userAuthService';
import {
  getChatMessagesForUser,
  sendUserMessage,
  markChatAsReadByUser,
  CHAT_UPDATE_EVENT,
  ChatMessage,
} from '../services/supportChatService';

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

  // Request Active Account (SMS Box) Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqSelectedCountry, setReqSelectedCountry] = useState(ASIAN_COUNTRIES[0]); // Bangladesh default
  const [reqPhoneNum, setReqPhoneNum] = useState('');
  const [reqGroupLink, setReqGroupLink] = useState('');
  const [reqAdminMessage, setReqAdminMessage] = useState('');
  const [reqShowPass, setReqShowPass] = useState(false);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  
  // Track previously requested email from localStorage
  const [savedReqEmail, setSavedReqEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('superx_requested_email') || '';
    } catch {
      return '';
    }
  });
  const [showSubmittedPass, setShowSubmittedPass] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);

  // User Support Chat State
  const [userChatInput, setUserChatInput] = useState('');
  const [modalTab, setModalTab] = useState<'status' | 'chat'>('status');
  const [chatUpdateCount, setChatUpdateCount] = useState(0);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleAccountUpdate = () => {
      setAccountsRefreshKey((k) => k + 1);
    };
    const handleChatUpdate = () => {
      setChatUpdateCount((c) => c + 1);
    };

    window.addEventListener('super_x_accounts_updated', handleAccountUpdate);
    window.addEventListener(CHAT_UPDATE_EVENT, handleChatUpdate);

    return () => {
      window.removeEventListener('super_x_accounts_updated', handleAccountUpdate);
      window.removeEventListener(CHAT_UPDATE_EVENT, handleChatUpdate);
    };
  }, []);

  useEffect(() => {
    if (savedReqEmail && isRequestModalOpen) {
      markChatAsReadByUser(savedReqEmail);
    }
  }, [savedReqEmail, isRequestModalOpen, chatUpdateCount]);

  useEffect(() => {
    if (modalTab === 'chat' && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [modalTab, chatUpdateCount]);

  // Check current status of the saved request from master accounts list
  const requestedAccount: UserAccount | null = React.useMemo(() => {
    if (!savedReqEmail) return null;
    const all = getAllAccounts();
    return all.find((a) => a.email.toLowerCase() === savedReqEmail.toLowerCase()) || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedReqEmail, isRequestModalOpen, accountsRefreshKey]);

  const copyToClipboard = (text: string, field: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendUserChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedReqEmail || !userChatInput.trim()) return;
    const userName = requestedAccount ? requestedAccount.name : savedReqEmail.split('@')[0];
    sendUserMessage(savedReqEmail, userName, userChatInput.trim());
    setUserChatInput('');
    setChatUpdateCount((c) => c + 1);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPendingAccountNotice(null);

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

      const authResult = authenticateUser(cleanIdentifier, password);

      if (!authResult.success) {
        if (authResult.status === 'pending') {
          setPendingAccountNotice({
            email: authResult.user?.email || cleanIdentifier,
            name: authResult.user?.name || 'User',
          });
          setErrorMessage('');
        } else {
          setErrorMessage(authResult.message);
        }
        generateNewCaptcha();
        return;
      }

      if (authResult.user) {
        onLoginSuccess({
          email: authResult.user.email,
          name: authResult.user.name,
          accountCode: authResult.user.accountCode,
          role: authResult.user.role,
        });
      }
    }, 500);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');

    if (!reqName.trim()) {
      setReqError('Please enter your full name.');
      return;
    }

    const cleanEmail = reqEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setReqError('Please enter a valid email address.');
      return;
    }

    if (!reqPassword || reqPassword.length < 4) {
      setReqError('Please enter a valid password (at least 4 characters).');
      return;
    }

    const cleanPhone = reqPhoneNum.trim();
    if (!cleanPhone) {
      setReqError('Please enter your contact phone / WhatsApp number.');
      return;
    }

    const fullPhoneNumber = `${reqSelectedCountry.flag} ${reqSelectedCountry.dialCode} ${cleanPhone}`;

    setReqLoading(true);

    setTimeout(() => {
      setReqLoading(false);
      const res = requestNewAccount({
        name: reqName.trim(),
        email: cleanEmail,
        password: reqPassword,
        phoneOrTelegram: fullPhoneNumber,
        groupLink: reqGroupLink.trim(),
        note: reqAdminMessage.trim(),
      });

      if (!res.success) {
        setReqError(res.message);
        return;
      }

      try {
        localStorage.setItem('superx_requested_email', cleanEmail);
      } catch {
        // ignore
      }
      setSavedReqEmail(cleanEmail);
      setAccountsRefreshKey((k) => k + 1);
    }, 600);
  };

  const handleClearSavedRequest = () => {
    try {
      localStorage.removeItem('superx_requested_email');
    } catch {
      // ignore
    }
    setSavedReqEmail('');
    setReqError('');
    setReqName('');
    setReqEmail('');
    setReqPassword('');
    setReqPhoneNum('');
    setReqGroupLink('');
    setReqAdminMessage('');
    setAccountsRefreshKey((k) => k + 1);
  };

  const handleAutoLogin = (acc: UserAccount) => {
    setIdentifier(acc.email);
    setPassword(acc.password || '');
    setIsRequestModalOpen(false);
  };

  return (
    <div className="w-full max-w-[440px] mx-auto py-2 px-2 sm:px-3 relative">
      {/* Header Container: Title + Brand Tag + Create Active Account Button */}
      <div className="mb-4 sm:mb-5">
        <div className="flex items-start justify-between gap-2">
          {/* Left Side: Brand Tag & Title */}
          <div className="text-left flex-1">
            {/* Larger Brand Name with Animated Rainbow Border & Rainbow Text Flow */}
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

          {/* Right Side: SMS / Create Active Account / Chat Button */}
          <div className="flex flex-col items-end pt-0.5">
            {/* Glowing Rainbow Animated Box Container around SMS Icon Button */}
            <div className="relative p-[2.5px] rounded-2xl animate-rainbow-border animate-rainbow-pulse-box shadow-lg hover:scale-105 active:scale-95 transition-all duration-200">
              <button
                id="open-sms-box-btn"
                type="button"
                onClick={() => {
                  setReqError('');
                  setAccountsRefreshKey((k) => k + 1);
                  setIsRequestModalOpen(true);
                }}
                title={
                  requestedAccount
                    ? requestedAccount.status === 'approved'
                      ? 'Open Live Support Chat & Active Account details'
                      : 'View pending status & chat with Admin'
                    : 'Click to Create Active Account / Send message to Admin'
                }
                className="relative p-2.5 sm:p-3 rounded-[13px] bg-gradient-to-tr from-purple-700 via-indigo-700 to-violet-600 text-white cursor-pointer flex items-center justify-center overflow-hidden group"
              >
                {/* Light Beam Sweep inside Button */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-light-sweep pointer-events-none" />

                {/* Active Pulse Dot */}
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                </span>

                {requestedAccount && requestedAccount.status === 'approved' ? (
                  <MessageSquare className="w-6 h-6 text-white group-hover:rotate-6 transition-transform relative z-0" />
                ) : (
                  <MessageSquarePlus className="w-6 h-6 text-white group-hover:rotate-6 transition-transform relative z-0" />
                )}
              </button>
            </div>

            {/* Label Badge with Animated Rainbow Border Accent */}
            <div className="relative p-[1px] rounded-lg animate-rainbow-border mt-1.5 shadow-2xs">
              <span className="block text-[10px] font-black tracking-tight text-center whitespace-nowrap bg-slate-950 text-amber-300 px-2 py-0.5 rounded-[7px]">
                {requestedAccount
                  ? requestedAccount.status === 'approved'
                    ? '💬 Chat Option / Support'
                    : '⏳ In Review (Live Chat)'
                  : 'create active account'}
              </span>
            </div>
          </div>
        </div>
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
            {errorMessage.includes('SMS/Message box') && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="font-bold text-purple-700 underline hover:text-purple-900 cursor-pointer"
                >
                  👉 Click here to open SMS Box &amp; Request Account
                </button>
              </div>
            )}
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

      {/* -------------------- MODAL: CREATE ACTIVE ACCOUNT (SMS BOX) -------------------- */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-4.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 border border-white/30 shadow-2xs">
                  <MessageSquarePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">
                    {requestedAccount
                      ? requestedAccount.status === 'approved'
                        ? 'Active Account & Live Support'
                        : 'In Review & Live Support'
                      : 'Create Active Account'}
                  </h3>
                  <p className="text-[11px] text-purple-200 font-normal">
                    {requestedAccount
                      ? requestedAccount.status === 'approved'
                        ? 'Your account is active. Chat with admin or sign in directly.'
                        : 'Account under review. Chat with admin for assistance.'
                      : 'Fill out all details to submit an active portal account request'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white/80 hover:text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {requestedAccount ? (
                /* ========================================================================= */
                /* VIEW 1: PERSISTENT ACCOUNT STATUS & REAL-TIME ADMIN LIVE SUPPORT CHAT    */
                /* ========================================================================= */
                <div className="space-y-4">
                  {/* Segmented Tab Navigation: Account vs Live Chat */}
                  <div className="flex items-center p-1 bg-gray-100/90 rounded-2xl text-xs font-bold border border-gray-200/80">
                    <button
                      type="button"
                      onClick={() => setModalTab('status')}
                      className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        modalTab === 'status'
                          ? 'bg-white text-purple-900 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Account Info</span>
                      {requestedAccount.status === 'approved' ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="In Review"></span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTab('chat');
                        if (savedReqEmail) markChatAsReadByUser(savedReqEmail);
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
                        modalTab === 'chat'
                          ? 'bg-white text-purple-900 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      <span>Live Chat</span>
                      {getChatMessagesForUser(savedReqEmail).filter((m) => m.sender === 'admin' && !m.readByUser).length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[9px] animate-bounce">
                          {getChatMessagesForUser(savedReqEmail).filter((m) => m.sender === 'admin' && !m.readByUser).length}
                        </span>
                      )}
                    </button>
                  </div>

                  {modalTab === 'status' ? (
                    /* ---------------- TAB 1: ACCOUNT STATUS & CREDENTIALS ---------------- */
                    <div className="space-y-4 text-center">
                      {requestedAccount.status === 'approved' ? (
                        /* ---------- STATUS: ACTIVATED / APPROVED ---------- */
                        <>
                          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-50 shadow-md">
                            <ShieldCheck className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs tracking-wide uppercase mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Account Activated</span>
                            </div>
                            <h4 className="text-lg font-extrabold text-gray-900">
                              Congratulations! Your Account is Active
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              Admin has approved your registration. Use your verified credentials below to sign in immediately.
                            </p>
                          </div>

                          {/* Full Credentials Review Card */}
                          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-left text-xs space-y-2.5">
                            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                              <span className="text-gray-500 font-medium">Full Name:</span>
                              <span className="font-bold text-gray-900 text-sm">{requestedAccount.name}</span>
                            </div>

                            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                              <span className="text-gray-500 font-medium">Email Account:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-purple-700">{requestedAccount.email}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(requestedAccount.email, 'email')}
                                  className="p-1 text-gray-400 hover:text-purple-700 cursor-pointer rounded"
                                  title="Copy Email"
                                >
                                  {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                              <span className="text-gray-500 font-medium">Password:</span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                  {showSubmittedPass ? requestedAccount.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowSubmittedPass(!showSubmittedPass)}
                                  className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer rounded"
                                  title={showSubmittedPass ? 'Hide Password' : 'Show Password'}
                                >
                                  {showSubmittedPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(requestedAccount.password || '', 'pass')}
                                  className="p-1 text-gray-400 hover:text-purple-700 cursor-pointer rounded"
                                  title="Copy Password"
                                >
                                  {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {requestedAccount.accountCode && (
                              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-1.5">
                                <span className="text-gray-500 font-medium">Account Code:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-extrabold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                                    {requestedAccount.accountCode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(requestedAccount.accountCode || '', 'code')}
                                    className="p-1 text-gray-400 hover:text-purple-700 cursor-pointer rounded"
                                    title="Copy Account Code"
                                  >
                                    {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            )}

                            {requestedAccount.phoneOrTelegram && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 font-medium">Contact Number:</span>
                                <span className="font-bold text-emerald-800">{requestedAccount.phoneOrTelegram}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Live Chat Prompt */}
                          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs flex items-center justify-between gap-2 text-left">
                            <div>
                              <p className="font-bold">Forgot password or need help?</p>
                              <p className="text-[11px] text-purple-700">Chat directly with the admin anytime.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setModalTab('chat');
                                if (savedReqEmail) markChatAsReadByUser(savedReqEmail);
                              }}
                              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-[11px] shrink-0 transition cursor-pointer flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open Chat</span>
                            </button>
                          </div>

                          {/* Primary Sign In Action */}
                          <div className="space-y-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAutoLogin(requestedAccount)}
                              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>SIGN IN WITH THIS ACCOUNT</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={handleClearSavedRequest}
                              className="text-xs text-gray-500 hover:text-purple-700 underline font-medium cursor-pointer inline-flex items-center gap-1 mt-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Submit a different account request</span>
                            </button>
                          </div>
                        </>
                      ) : requestedAccount.status === 'rejected' ? (
                        /* ---------- STATUS: REJECTED ---------- */
                        <>
                          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-50 shadow-md">
                            <AlertCircle className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 font-extrabold text-xs tracking-wide uppercase mb-1">
                              <span>Request Rejected</span>
                            </div>
                            <h4 className="text-lg font-extrabold text-gray-900">
                              Application Not Approved
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              Your account request for <strong className="text-red-700">{requestedAccount.email}</strong> could not be approved at this time.
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleClearSavedRequest}
                              className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Submit New Application</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        /* ---------- STATUS: PENDING / IN REVIEW ---------- */
                        <>
                          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto border-4 border-amber-50 shadow-md">
                            <Clock className="w-8 h-8 animate-pulse" />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs tracking-wide uppercase mb-1">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>In Review / Pending Approval</span>
                            </div>
                            <h4 className="text-lg font-extrabold text-gray-900">
                              Account Request Is In Review
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              Your account details have been received and are pending Admin verification. Once approved, the status will automatically turn to <strong>Active</strong>.
                            </p>
                          </div>

                          {/* Submitted Details Review Card */}
                          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-left text-xs space-y-2.5 font-sans">
                            <div className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5 flex items-center justify-between">
                              <span>Submitted Details</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                ⏳ IN REVIEW
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                              <span className="text-gray-500">Full Name:</span>
                              <span className="font-bold text-gray-900">{requestedAccount.name}</span>
                            </div>

                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                              <span className="text-gray-500">Email Account:</span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-purple-700">{requestedAccount.email}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(requestedAccount.email, 'email')}
                                  className="p-1 text-gray-400 hover:text-purple-700 cursor-pointer rounded"
                                  title="Copy Email"
                                >
                                  {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                              <span className="text-gray-500">Password:</span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {showSubmittedPass ? requestedAccount.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowSubmittedPass(!showSubmittedPass)}
                                  className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer rounded"
                                  title={showSubmittedPass ? 'Hide Password' : 'Show Password'}
                                >
                                  {showSubmittedPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(requestedAccount.password || '', 'pass')}
                                  className="p-1 text-gray-400 hover:text-purple-700 cursor-pointer rounded"
                                  title="Copy Password"
                                >
                                  {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {requestedAccount.phoneOrTelegram && (
                              <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                <span className="text-gray-500">Contact Number:</span>
                                <span className="font-bold text-emerald-700">{requestedAccount.phoneOrTelegram}</span>
                              </div>
                            )}

                            {requestedAccount.groupLink && (
                              <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                                <span className="text-gray-500">Group Link:</span>
                                <span className="font-medium text-blue-600 truncate max-w-[200px]">{requestedAccount.groupLink}</span>
                              </div>
                            )}

                            {requestedAccount.note && (
                              <div className="pt-0.5">
                                <span className="text-gray-500 block mb-0.5">Admin Message:</span>
                                <p className="text-gray-800 bg-white p-2 rounded-xl border border-gray-200/70 text-[11px] italic">
                                  {requestedAccount.note}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Quick Live Chat Prompt */}
                          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs flex items-center justify-between gap-2 text-left">
                            <div>
                              <p className="font-bold">Need fast approval or have a question?</p>
                              <p className="text-[11px] text-purple-700">Chat directly with the admin right now.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setModalTab('chat');
                                if (savedReqEmail) markChatAsReadByUser(savedReqEmail);
                              }}
                              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-[11px] shrink-0 transition cursor-pointer flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Live Chat</span>
                            </button>
                          </div>

                          <div className="space-y-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIdentifier(requestedAccount.email);
                                setPassword(requestedAccount.password || '');
                                setIsRequestModalOpen(false);
                              }}
                              className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                            >
                              <span>Return to Sign In</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={handleClearSavedRequest}
                              className="text-xs text-gray-500 hover:text-purple-700 underline font-medium cursor-pointer inline-flex items-center gap-1 mt-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Submit a different account request</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    /* ---------------- TAB 2: LIVE SUPPORT CHAT WITH ADMIN ---------------- */
                    <div className="flex flex-col h-[480px] bg-slate-50 rounded-2xl border border-purple-200/80 overflow-hidden text-xs">
                      {/* Chat Header inside Modal */}
                      <div className="p-3 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-white/20">
                            <MessageCircle className="w-4 h-4 text-purple-200" />
                          </div>
                          <div>
                            <div className="font-extrabold flex items-center gap-1.5">
                              <span>Admin Live Support Desk</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            </div>
                            <p className="text-[10px] text-purple-200">
                              Connected • Ask for password reset, approval, or help
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Template Chips for User */}
                      <div className="p-2 bg-white border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setUserChatInput('I forgot my password. Please create a new password for me.')}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1"
                        >
                          <Key className="w-3 h-3 text-purple-600" />
                          <span>Forgot Password</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserChatInput('Hello Admin, please check and approve my account.')}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>Request Approval</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserChatInput('Hello Admin, I need some help with my SMS portal access.')}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold whitespace-nowrap transition cursor-pointer"
                        >
                          <span>General Support</span>
                        </button>
                      </div>

                      {/* Chat Messages List */}
                      <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
                        {getChatMessagesForUser(savedReqEmail).length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400">
                            <MessageSquare className="w-8 h-8 text-purple-300 mb-1" />
                            <p className="text-xs font-bold text-gray-700">No messages yet.</p>
                            <p className="text-[11px] text-gray-500 max-w-xs mt-1 leading-relaxed">
                              Send a message below. The admin will reply in real time and can reset your password or activate your account directly!
                            </p>
                          </div>
                        ) : (
                          getChatMessagesForUser(savedReqEmail).map((msg) => {
                            const isAdmin = msg.sender === 'admin';
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                              >
                                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400">
                                  <span className="font-bold text-gray-700">
                                    {isAdmin ? '🛡️ Super Admin' : '👤 You'}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <div
                                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed break-words shadow-2xs ${
                                    isAdmin
                                      ? 'bg-white text-gray-900 border border-purple-200 rounded-tl-xs'
                                      : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-tr-xs'
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatMessagesEndRef} />
                      </div>

                      {/* Chat Input Bar */}
                      <form
                        onSubmit={handleSendUserChatMessage}
                        className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-1.5 shrink-0"
                      >
                        <input
                          type="text"
                          value={userChatInput}
                          onChange={(e) => setUserChatInput(e.target.value)}
                          placeholder="Type your message to Admin..."
                          className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="submit"
                          disabled={!userChatInput.trim()}
                          className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs">Send</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                /* ========================================================================= */
                /* VIEW 2: CLEAN LINEAR SUBMISSION FORM (NO SUB-BADGES)                      */
                /* ========================================================================= */
                <form onSubmit={handleRequestSubmit} className="space-y-3.5">
                  {reqError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{reqError}</span>
                    </div>
                  )}

                  {/* 1. Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={reqName}
                        onChange={(e) => setReqName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pl-9 bg-gray-50/50 focus:bg-white"
                      />
                      <User className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 2. Email Account */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email account <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={reqEmail}
                        onChange={(e) => setReqEmail(e.target.value)}
                        placeholder="Enter your email address"
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pl-9 bg-gray-50/50 focus:bg-white"
                      />
                      <Mail className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 3. Password (Clean single input without any sub-badges or extra notes) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={reqShowPass ? 'text' : 'password'}
                        value={reqPassword}
                        onChange={(e) => setReqPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pl-9 pr-9 bg-gray-50/50 focus:bg-white font-mono"
                      />
                      <Lock className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setReqShowPass(!reqShowPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                      >
                        {reqShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 4. Contact Number with Asian Country Selector (Flag + Dial Code) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Contact number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-1.5">
                      {/* Asian Country Code Dropdown */}
                      <div className="relative shrink-0 w-32">
                        <select
                          value={reqSelectedCountry.code}
                          onChange={(e) => {
                            const found = ASIAN_COUNTRIES.find((c) => c.code === e.target.value);
                            if (found) setReqSelectedCountry(found);
                          }}
                          className="w-full px-2 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-gray-50 appearance-none pr-6 cursor-pointer"
                        >
                          {ASIAN_COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.flag} {country.dialCode} ({country.name})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Phone Input */}
                      <div className="relative flex-1">
                        <input
                          type="tel"
                          value={reqPhoneNum}
                          onChange={(e) => setReqPhoneNum(e.target.value)}
                          placeholder="Phone / WhatsApp number"
                          required
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none pl-8.5 bg-gray-50/50 focus:bg-white font-medium"
                        />
                        <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* 5. Telegram / WhatsApp Group Link */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Telegram / WhatsApp group link <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={reqGroupLink}
                        onChange={(e) => setReqGroupLink(e.target.value)}
                        placeholder="Enter group link (if any)"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none pl-9 bg-gray-50/50 focus:bg-white"
                      />
                      <Share2 className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 6. Admin Message */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Admin message <span className="text-gray-400 font-normal">(Optional)</span></span>
                      <span className="text-[10px] text-gray-400 font-normal">Monthly requirement / Note</span>
                    </label>
                    <textarea
                      rows={3}
                      value={reqAdminMessage}
                      onChange={(e) => setReqAdminMessage(e.target.value)}
                      placeholder="Write a message, monthly description, required services or note for the admin..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-gray-900 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none bg-gray-50/50 focus:bg-white"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={reqLoading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.99]"
                    >
                      {reqLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>SENDING TO ADMIN...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>CREATE ACTIVE ACCOUNT</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
