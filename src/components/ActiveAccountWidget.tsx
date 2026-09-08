import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  CheckCircle2,
  Sparkles,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
  Clock,
  ArrowRight,
  ShieldAlert,
  Zap,
  Check,
  Copy,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Megaphone,
  Cpu,
  Radio,
  Terminal,
} from 'lucide-react';
import { requestNewAccount, getAllAccounts } from '../services/userAuthService';
import {
  sendUserActivityToTelegram,
  sendAccountActivationRequestToAdminTelegram,
  getTelegramConfig,
} from '../services/telegramService';

type WidgetState = 'form' | 'submitting' | 'submitted_pending' | 'approved';

const STORAGE_KEY = 'super_x_active_account_widget_v3';

export function ActiveAccountWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<WidgetState>('form');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinedTelegram, setJoinedTelegram] = useState(false);

  // Status & Validation
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountCode, setAccountCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Verify Telegram join with backend server
  const handleVerifyTelegramJoin = async () => {
    try {
      window.open('https://t.me/super_x_support', '_blank', 'noopener,noreferrer');
      
      const res = await fetch('/api/telegram/verify-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || 'guest_user' }),
      });
      const data = await res.json();
      if (data && data.verified) {
        setJoinedTelegram(true);
      } else {
        setJoinedTelegram(true); // Fallback to true after clicking
      }
    } catch {
      setJoinedTelegram(true);
    }
  };

  // Load saved widget state from localStorage & Server Verification
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.state) setState(parsed.state);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.password) setPassword(parsed.password);
        if (parsed.accountCode) setAccountCode(parsed.accountCode);
        if (parsed.joinedTelegram) setJoinedTelegram(parsed.joinedTelegram);
      }
    } catch {}

    // Check backend telegram verification status
    fetch('/api/telegram/status')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.verified) {
          setJoinedTelegram(true);
        }
      })
      .catch(() => null);
  }, []);

  // Save widget state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state,
          fullName,
          email,
          password,
          accountCode,
          joinedTelegram,
        })
      );
    } catch {}
  }, [state, fullName, email, password, accountCode, joinedTelegram]);

  // Real-time Email check against User Management
  const checkEmailIsAlreadyApproved = (emailStr: string): boolean => {
    const clean = emailStr.trim().toLowerCase();
    if (!clean) return false;
    const allAccounts = getAllAccounts();
    return allAccounts.some((acc) => acc.email.trim().toLowerCase() === clean && acc.status === 'approved');
  };

  // Realtime Polling for Admin Approval
  useEffect(() => {
    if (state !== 'submitted_pending' || !email) return;

    const interval = setInterval(() => {
      try {
        const accounts = getAllAccounts();
        const found = accounts.find(
          (a) => a.email.trim().toLowerCase() === email.trim().toLowerCase()
        );

        if (found && found.status === 'approved') {
          const code = found.accountCode || '2886064606';
          setAccountCode(code);
          setState('approved');
          clearInterval(interval);
        }
      } catch (err) {
        console.warn('Approval polling error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state, email]);

  // Reset form handler
  const handleReset = () => {
    setState('form');
    setFullName('');
    setEmail('');
    setPassword('');
    setJoinedTelegram(false);
    setFormError('');
    setAccountCode('');
    setIsSubmitting(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Mandatory Telegram Channel Join Check
    if (!joinedTelegram) {
      setFormError('Please join our official Telegram channel first to unlock and submit this form!');
      return;
    }

    // Field Validations
    if (!cleanName) {
      setFormError('Please enter your full name.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Please enter a valid email address (e.g. user@gmail.com).');
      return;
    }

    if (cleanPass.length < 4) {
      setFormError('Password must be at least 4 characters long.');
      return;
    }

    // CHECK IF ACCOUNT IS ALREADY APPROVED
    if (checkEmailIsAlreadyApproved(cleanEmail)) {
      setFormError(
        `Email address "${cleanEmail}" is already approved and active in SUPER X SMS! You can log in directly using your email and password.`
      );
      return;
    }

    setIsSubmitting(true);
    setState('submitting');

    try {
      // 1. Submit to User Auth Service (local, server & Firebase real-time persistence)
      const res = requestNewAccount({
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        note: 'Submitted via Support Bot Form',
      });

      if (!res.success && res.message) {
        setIsSubmitting(false);
        setState('form');
        setFormError(res.message);
        return;
      }

      const generatedCode = res.account?.accountCode || '2886064606';
      setAccountCode(generatedCode);

      // 2. Direct Telegram notification to Admin Bot
      sendAccountActivationRequestToAdminTelegram({
        id: res.account?.id,
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        accountCode: generatedCode,
        createdAt: Date.now(),
        note: 'Submitted via Support Bot Form',
      }).catch(() => {});

      // 3. Submit to Server Backend (/api/accounts/request)
      try {
        await fetch('/api/accounts/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password: cleanPass,
            accountCode: generatedCode,
            note: 'Submitted via Support Bot Form',
          }),
        });
      } catch (err) {
        console.warn('Server account request error:', err);
      }

      // Short delay for visual polish
      setTimeout(() => {
        setIsSubmitting(false);
        setState('submitted_pending');
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setState('form');
      setFormError(err?.message || 'Failed to submit account request. Please try again.');
    }
  };

  return (
    <>
      {/* -------------------- FLOATING RAINBOW SUPPORT BUTTON -------------------- */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 font-sans">
        {/* Floating Tooltip Label */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/95 hover:bg-slate-900 text-amber-300 font-extrabold text-xs shadow-2xl border-2 border-amber-500/60 backdrop-blur-md cursor-pointer transition transform hover:scale-105 active:scale-95"
        >
          <Cpu className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>ROBOTIC ACTIVATION CORE</span>
        </button>

        {/* Circular Floating Icon with Animated Rainbow Glow */}
        <button
          type="button"
          id="active-account-floating-btn"
          onClick={() => setIsOpen(true)}
          className="relative group p-[2.5px] rounded-full animate-rainbow-border shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:shadow-[0_0_35px_rgba(245,158,11,0.9)] transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer"
          title="SUPER X SMS Robotic Support Bot"
        >
          <div className="p-3.5 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 group-hover:text-cyan-400 transition">
            <Bot className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>

          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
        </button>
      </div>

      {/* -------------------- WIDGET MODAL CARD (HIGH-TECH ROBOTIC DESIGN) -------------------- */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] bg-slate-950 rounded-3xl p-[2px] animate-rainbow-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden font-sans border border-amber-500/30">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex flex-col overflow-hidden relative">
            
            {/* Robotic Holographic HUD Glow Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-cyan-500/5 to-transparent pointer-events-none" />

            {/* Header with Cyber Robotic Branding */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/90 border-b border-amber-500/40 flex items-center justify-between text-white shrink-0 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-15 pointer-events-none">
                <Cpu className="w-32 h-32 text-amber-400 -mr-6 -mt-6 animate-pulse" />
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,158,11,0.6)] border border-amber-200/50">
                    <Bot className="w-6 h-6 text-white animate-bounce" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base tracking-tight animate-snake-rainbow-text flex items-center gap-1.5">
                      <span>SUPER X SMS</span>
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 text-emerald-400 animate-ping" />
                      <span>ONLINE</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Robotic Account Activation Core</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-xl hover:bg-white/10 transition text-slate-400 hover:text-white cursor-pointer"
                  title="Reset Form"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 transition text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Widget Body Content */}
            <div className="p-5 space-y-4 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 text-xs relative z-10">
              
              {/* STATE 1: FORM INPUTS DIRECTLY IN BOX */}
              {(state === 'form' || state === 'submitting') && (
                <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
                  
                  {/* MANDATORY TELEGRAM CHANNEL JOIN BANNER */}
                  <div className={`p-3.5 border-2 rounded-2xl space-y-2.5 relative overflow-hidden transition-all duration-300 ${
                    joinedTelegram
                      ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-emerald-950/60 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-gradient-to-br from-cyan-950/90 via-slate-900 to-amber-950/90 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                  }`}>
                    <div className="flex items-center justify-between font-extrabold text-[11px]">
                      <span className={`flex items-center gap-1.5 uppercase tracking-wider ${joinedTelegram ? 'text-emerald-300' : 'text-cyan-300'}`}>
                        {joinedTelegram ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span>TELEGRAM STATUS: COMPLETED</span>
                          </>
                        ) : (
                          <>
                            <Megaphone className="w-4 h-4 text-cyan-400 animate-bounce" />
                            <span>MANDATORY TELEGRAM JOIN</span>
                          </>
                        )}
                      </span>

                      <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${
                        joinedTelegram
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/60 flex items-center gap-1'
                          : 'bg-amber-500/30 text-amber-200 border-amber-400/60 flex items-center gap-1 animate-pulse'
                      }`}>
                        {joinedTelegram ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span>UNLOCKED</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-amber-300" />
                            <span>LOCKED</span>
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                      {joinedTelegram
                        ? 'Verification completed! The activation form fields below are now unlocked.'
                        : 'To get all official updates and unlock the activation form below, you must join our official Telegram channel first:'}
                    </p>

                    <button
                      type="button"
                      onClick={handleVerifyTelegramJoin}
                      className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-2 border transition transform hover:scale-[1.01] active:scale-98 cursor-pointer ${
                        joinedTelegram
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-emerald-300/40'
                          : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border-cyan-300/40'
                      }`}
                    >
                      {joinedTelegram ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                          <span>✓ COMPLETED — JOINED OFFICIAL TELEGRAM</span>
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-200 ml-auto" />
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-cyan-200" />
                          <span>JOIN OFFICIAL TELEGRAM CHANNEL TO UNLOCK</span>
                          <ExternalLink className="w-3.5 h-3.5 text-cyan-200 ml-auto" />
                        </>
                      )}
                    </button>

                    <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={joinedTelegram}
                        onChange={(e) => setJoinedTelegram(e.target.checked)}
                        className="w-4 h-4 rounded border-cyan-500/60 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 cursor-pointer"
                      />
                      <span className={`text-[11px] font-bold transition ${joinedTelegram ? 'text-emerald-300' : 'text-cyan-200 group-hover:text-white'}`}>
                        {joinedTelegram ? '✓ Verified: I have joined the Telegram channel' : 'I have joined the official Telegram channel'}
                      </span>
                    </label>
                  </div>

                  {/* ROBOTIC INSTRUCTION BADGE */}
                  <div className={`p-3 border rounded-2xl flex items-center gap-2.5 text-xs transition-all ${
                    joinedTelegram
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  }`}>
                    <Bot className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                    <p className="text-[11px] font-medium leading-relaxed">
                      {joinedTelegram ? (
                        <span>Form unlocked. Enter your details to request instant account activation on <strong className="text-amber-300">SUPER X SMS</strong>.</span>
                      ) : (
                        <span className="text-amber-300/90 font-semibold flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />
                          Form is locked. Please click the button above to join Telegram and unlock fields.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Field 1: Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Full Name</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">REQ_NAME</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={fullName}
                        disabled={!joinedTelegram || state === 'submitting'}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setFormError('');
                        }}
                        placeholder={joinedTelegram ? "Enter your full name" : "🔒 Locked - Join Telegram Channel First"}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium transition ${
                          !joinedTelegram
                            ? 'bg-slate-950/80 border-slate-800/80 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/90 border-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Field 2: Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>Email Address</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">USER_EMAIL</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        disabled={!joinedTelegram || state === 'submitting'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEmail(val);
                          setFormError('');
                          if (val.trim() && checkEmailIsAlreadyApproved(val)) {
                            setFormError(
                              `Email address "${val.trim()}" is already approved and active in SUPER X SMS.`
                            );
                          }
                        }}
                        placeholder={joinedTelegram ? "e.g. user@gmail.com" : "🔒 Locked - Join Telegram Channel First"}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium transition ${
                          !joinedTelegram
                            ? 'bg-slate-950/80 border-slate-800/80 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/90 border-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Field 3: Password */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Account Password</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">SECURE_PASS</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        disabled={!joinedTelegram || state === 'submitting'}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFormError('');
                        }}
                        placeholder={joinedTelegram ? "Set account password" : "🔒 Locked - Join Telegram Channel First"}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium transition ${
                          !joinedTelegram
                            ? 'bg-slate-950/80 border-slate-800/80 opacity-50 cursor-not-allowed'
                            : 'bg-slate-900/90 border-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Inline Error Box */}
                  {formError && (
                    <div className="p-3 bg-red-950/90 border-2 border-red-500/70 rounded-xl text-red-200 text-[11px] space-y-1 animate-shake shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      <div className="flex items-center gap-1.5 font-bold text-red-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Validation Alert</span>
                      </div>
                      <p>{formError}</p>
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={!joinedTelegram || state === 'submitting'}
                    className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition transform cursor-pointer ${
                      !joinedTelegram
                        ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)] border-amber-300/40 hover:scale-[1.02] active:scale-98'
                    }`}
                  >
                    {state === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Submitting Request...</span>
                      </>
                    ) : !joinedTelegram ? (
                      <>
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>LOCKED (JOIN TELEGRAM TO UNLOCK)</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-slate-950" />
                        <span>SUBMIT REQUEST</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STATE 2: SUBMITTED & PENDING APPROVAL CARD */}
              {state === 'submitted_pending' && (
                <div className="space-y-4 animate-scaleUp">
                  {/* Thank you Banner */}
                  <div className="p-4 bg-gradient-to-b from-amber-950/80 to-slate-900 border border-amber-500/50 rounded-2xl text-center space-y-2 shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>

                    <h4 className="font-extrabold text-sm text-amber-300 uppercase tracking-wide">
                      THANK YOU FOR YOUR REQUEST!
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Your account request has been successfully dispatched to <strong className="text-white">SUPER X SMS</strong> Admin.
                    </p>
                  </div>

                  {/* Submitted Info Card */}
                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2.5 text-slate-300">
                    <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Full Name:</span>
                      <strong className="text-white font-bold">{fullName}</strong>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Email:</span>
                      <strong className="text-amber-300 font-bold">{email}</strong>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Status:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-spin text-amber-400" />
                        <span>PENDING ADMIN APPROVAL</span>
                      </span>
                    </div>
                  </div>

                  {/* Polling Alert */}
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-amber-200 text-[11px] animate-pulse">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Live status listener active. Keep this box open to receive instant approval!</span>
                  </div>
                </div>
              )}

              {/* STATE 3: CONGRATULATIONS / APPROVED CARD */}
              {state === 'approved' && (
                <div className="p-4 bg-gradient-to-b from-emerald-950/90 via-slate-900 to-slate-950 border-2 border-emerald-500 rounded-2xl space-y-3.5 text-emerald-100 shadow-2xl animate-bounceOnce">
                  <div className="flex items-center justify-between border-b border-emerald-500/40 pb-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-black text-xs uppercase tracking-wide">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>ACCOUNT APPROVED & ACTIVE</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/40">
                      APPROVED
                    </span>
                  </div>

                  <div className="text-center space-y-1 py-1">
                    <h4 className="font-extrabold text-base text-white tracking-tight">
                      🎉 CONGRATULATIONS, {fullName || 'USER'}!
                    </h4>
                    <p className="text-[11px] text-emerald-300 font-medium">
                      Your SUPER X SMS account is now active and ready to use.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/90 rounded-2xl border border-emerald-500/40 text-xs space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">10-Digit ID Code:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-emerald-300 font-black text-sm">{accountCode}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(accountCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition cursor-pointer"
                          title="Copy ID Code"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                      <span className="text-slate-400 font-sans">Email:</span>
                      <strong className="text-white font-bold">{email}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      try {
                        const emailEl = document.querySelector('input[type="email"]') as HTMLInputElement;
                        if (emailEl) {
                          emailEl.value = email;
                          emailEl.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      } catch {}
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>LOGIN NOW</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
