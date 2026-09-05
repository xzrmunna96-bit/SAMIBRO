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
} from 'lucide-react';
import { requestNewAccount, getAllAccounts } from '../services/userAuthService';
import { sendUserActivityToTelegram, getTelegramConfig } from '../services/telegramService';

type WidgetState = 'form' | 'submitting' | 'submitted_pending' | 'approved';

const STORAGE_KEY = 'super_x_active_account_widget_v3';

export function ActiveAccountWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<WidgetState>('form');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status & Validation
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountCode, setAccountCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Load saved widget state from localStorage
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
      }
    } catch {}
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
        })
      );
    } catch {}
  }, [state, fullName, email, password, accountCode]);

  // Real-time Email check against User Management
  const checkEmailInSystem = (emailStr: string): boolean => {
    const clean = emailStr.trim().toLowerCase();
    if (!clean) return false;
    const allAccounts = getAllAccounts();
    return allAccounts.some((acc) => acc.email.trim().toLowerCase() === clean);
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

    // STRICT UNIQUE EMAIL CHECK AGAINST USER MANAGEMENT
    if (checkEmailInSystem(cleanEmail)) {
      setFormError(
        `Email address "${cleanEmail}" is already registered or pending in SUPER X SMS user management. Duplicate email submissions are blocked.`
      );
      return;
    }

    setIsSubmitting(true);
    setState('submitting');

    try {
      // 1. Submit to User Auth Service
      const res = requestNewAccount({
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        note: 'Submitted via Support Bot Form',
      });

      const generatedCode = res.account?.accountCode || '2886064606';
      setAccountCode(generatedCode);

      // 2. Dispatch to Telegram Service
      const telegramConfig = getTelegramConfig();
      const timeStr = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const telegramMsg =
        `<b>🚨 SUPER X SMS — NEW ACCOUNT ACTIVATION REQUEST</b>\n\n` +
        `👤 <b>Name:</b> ${cleanName}\n` +
        `✉️ <b>Email:</b> <code>${cleanEmail}</code>\n` +
        `🔑 <b>Password:</b> <code>${cleanPass}</code>\n` +
        `🆔 <b>ID Code:</b> <code>${generatedCode}</code>\n` +
        `⏰ <b>Requested At:</b> ${timeStr}\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `⚠️ <b>STATUS: PENDING ADMIN APPROVAL</b>\n` +
        `<i>Admin: Approve from Admin Portal -> Account Requests tab.</i>`;

      try {
        await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: telegramConfig.botToken,
            chatId: telegramConfig.chatId,
            text: telegramMsg,
          }),
        });
      } catch (err) {
        console.warn('Telegram notification error:', err);
      }

      sendUserActivityToTelegram({
        action: 'Widget Account Request',
        userEmail: cleanEmail,
        userCode: generatedCode,
        details: `Name: ${cleanName} | Password: ${cleanPass}`,
      }).catch(() => {});

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
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>ACCOUNT ACTIVATION</span>
        </button>

        {/* Circular Floating Icon with Animated Rainbow Glow */}
        <button
          type="button"
          id="active-account-floating-btn"
          onClick={() => setIsOpen(true)}
          className="relative group p-[2.5px] rounded-full animate-rainbow-border shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:shadow-[0_0_35px_rgba(245,158,11,0.9)] transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer"
          title="SUPER X SMS Support Bot"
        >
          <div className="p-3.5 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 group-hover:text-white transition">
            <MessageSquare className="w-6 h-6 fill-amber-400/20" />
          </div>

          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
        </button>
      </div>

      {/* -------------------- WIDGET MODAL CARD (RAINBOW ANIMATED BORDER) -------------------- */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[410px] bg-slate-950 rounded-3xl p-[2px] animate-rainbow-border shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden font-sans">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex flex-col overflow-hidden">
            
            {/* Header with SUPER X SMS Branding */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/80 border-b border-amber-500/30 flex items-center justify-between text-white shrink-0 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                <Zap className="w-32 h-32 text-amber-400 -mr-6 -mt-6" />
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg border border-amber-200/50">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base tracking-tight animate-snake-rainbow-text">
                      SUPER X SMS
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Account Activation Support</span>
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
            <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 text-xs">
              
              {/* STATE 1: FORM INPUTS DIRECTLY IN BOX */}
              {(state === 'form' || state === 'submitting') && (
                <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-amber-200">
                    <Bot className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-[11px] font-medium leading-relaxed">
                      Fill out your details below to request instant account activation on <strong className="text-amber-300">SUPER X SMS</strong>.
                    </p>
                  </div>

                  {/* Field 1: Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>Full Name</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={fullName}
                        disabled={state === 'submitting'}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setFormError('');
                        }}
                        placeholder="Enter your full name"
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Field 2: Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>Email Address</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        disabled={state === 'submitting'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEmail(val);
                          setFormError('');
                          if (val.trim() && checkEmailInSystem(val)) {
                            setFormError(
                              `Email address "${val.trim()}" already exists in SUPER X SMS user management.`
                            );
                          }
                        }}
                        placeholder="e.g. user@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Field 3: Password */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Account Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        disabled={state === 'submitting'}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFormError('');
                        }}
                        placeholder="Set account password"
                        className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Inline Error Box */}
                  {formError && (
                    <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-[11px] space-y-1 animate-shake">
                      <div className="flex items-center gap-1.5 font-bold text-red-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Validation Error</span>
                      </div>
                      <p>{formError}</p>
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={state === 'submitting'}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition transform hover:scale-[1.02] active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {state === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
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
