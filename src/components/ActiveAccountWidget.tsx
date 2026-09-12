import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Send,
  Bot,
  User,
  CheckCircle2,
  Sparkles,
  Lock,
  Mail,
  ShieldCheck,
  Clock,
  ArrowRight,
  Zap,
  Check,
  Copy,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Megaphone,
  Cpu,
  Radio,
  Globe,
  Eye,
  EyeOff,
  Briefcase,
  PartyPopper,
} from 'lucide-react';
import { requestNewAccount, getAllAccounts, UserAccount } from '../services/userAuthService';
import { fetchAccountsFromServer } from '../services/serverAuthSync';
import {
  sendAccountActivationRequestToAdminTelegram,
} from '../services/telegramService';
import { GLOBAL_COUNTRIES_LIST } from '../services/countryHelper';

export type WidgetState = 'form' | 'submitting' | 'submitted_pending' | 'approved';

const STORAGE_KEY = 'super_x_active_account_widget_v5';
const DEVICE_LOCK_KEY = 'super_x_device_registered_account_v1';

// Play pleasant celebration audio fanfare on approval
function playCelebrationFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.5);
    });
  } catch {}
}

// Trigger fireworks confetti celebration
function triggerCelebrationConfetti() {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#F59E0B', '#06B6D4', '#EC4899', '#8B5CF6'],
    });
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10B981', '#34D399', '#FBBF24', '#38BDF8'],
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10B981', '#34D399', '#FBBF24', '#38BDF8'],
      });
    }, 250);
  } catch {}
}

export function ActiveAccountWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<WidgetState>('form');

  // 5 Mandatory Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('Bangladesh (🇧🇩)');
  const [dialCode, setDialCode] = useState('+880');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agentEmail, setAgentEmail] = useState('');

  // UI Helper States
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountCode, setAccountCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [approvedAt, setApprovedAt] = useState<number | null>(null);

  const hasCelebratedRef = useRef(false);

  // Helper to check if given email is approved
  const findApprovedAccount = (emailToCheck: string): UserAccount | null => {
    const clean = (emailToCheck || '').trim().toLowerCase();
    if (!clean) return null;
    const all = getAllAccounts();
    const match = all.find(
      (a) =>
        a.email &&
        a.email.trim().toLowerCase() === clean &&
        a.status === 'approved'
    );
    return match || null;
  };

  // Helper to apply approved state
  const handleAccountBecameApproved = (acc: UserAccount, autoOpenModal = true) => {
    const code = acc.accountCode || '2886064606';
    setAccountCode(code);
    setState('approved');
    setApprovedAt(acc.approvedAt || Date.now());
    if (acc.name) setFullName(acc.name);
    if (acc.password) setPassword(acc.password);
    if (acc.country) setCountry(acc.country);
    if (acc.phoneOrTelegram) setPhoneNumber(acc.phoneOrTelegram);
    if (acc.agentEmail || acc.agentMail) setAgentEmail(acc.agentEmail || acc.agentMail || '');

    // Save permanently to device lock
    try {
      const lockData = {
        state: 'approved',
        fullName: acc.name || fullName,
        email: acc.email || email,
        password: acc.password || password,
        country: acc.country || country,
        phoneNumber: acc.phoneOrTelegram || phoneNumber,
        phoneOrTelegram: acc.phoneOrTelegram || phoneNumber,
        agentEmail: acc.agentEmail || acc.agentMail || agentEmail,
        accountCode: code,
        submittedAt: submittedAt || acc.createdAt || Date.now(),
        approvedAt: acc.approvedAt || Date.now(),
      };
      localStorage.setItem(DEVICE_LOCK_KEY, JSON.stringify(lockData));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lockData));
    } catch {}

    // Trigger celebration fanfare and confetti if not celebrated yet in this session
    if (!hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      triggerCelebrationConfetti();
      playCelebrationFanfare();
      if (autoOpenModal) {
        setIsOpen(true);
      }
    }
  };

  // 1. Initial Load: Load device lock & check approval immediately
  useEffect(() => {
    let savedEmail = '';

    try {
      const lockRaw = localStorage.getItem(DEVICE_LOCK_KEY) || localStorage.getItem(STORAGE_KEY);
      if (lockRaw) {
        const parsed = JSON.parse(lockRaw);
        if (parsed.state) {
          setState(parsed.state);
        }
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) {
          savedEmail = parsed.email;
          setEmail(parsed.email);
        }
        if (parsed.password) setPassword(parsed.password);
        if (parsed.country) {
          setCountry(parsed.country);
          const found = GLOBAL_COUNTRIES_LIST.find(c => `${c.name} (${c.flag})` === parsed.country || c.name === parsed.country);
          if (found) setDialCode(found.dialCode);
        }
        if (parsed.phoneNumber || parsed.phoneOrTelegram) {
          setPhoneNumber(parsed.phoneNumber || parsed.phoneOrTelegram);
        }
        if (parsed.agentEmail || parsed.agentMail) setAgentEmail(parsed.agentEmail || parsed.agentMail);
        if (parsed.accountCode) setAccountCode(parsed.accountCode);
        if (parsed.submittedAt) setSubmittedAt(parsed.submittedAt);
        if (parsed.approvedAt) setApprovedAt(parsed.approvedAt);
      }
    } catch {}

    // Eagerly check server accounts for instant approval verification
    fetchAccountsFromServer()
      .then((accounts) => {
        if (savedEmail) {
          const match = accounts.find(
            (a) => a.email && a.email.trim().toLowerCase() === savedEmail.trim().toLowerCase()
          );
          if (match && match.status === 'approved') {
            handleAccountBecameApproved(match, false);
          }
        }
      })
      .catch(() => null);
  }, []);

  // 2. Continuous Real-time Approval Detection (Server polling, window events, SSE)
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!email || state === 'approved') return;
    const cleanEmail = email.trim().toLowerCase();
    let lastFetchTime = 0;

    const checkApprovalStatus = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      try {
        // 1. Check local accounts synchronously first
        const localMatch = findApprovedAccount(cleanEmail);
        if (localMatch) {
          if ((state as string) !== 'approved') {
            handleAccountBecameApproved(localMatch, true);
          }
          return;
        }

        // 2. Rate-limit server calls (max once every 3s)
        const now = Date.now();
        if (now - lastFetchTime > 3000) {
          lastFetchTime = now;
          const serverAccounts = await fetchAccountsFromServer();
          const serverMatch = serverAccounts.find(
            (a) => a.email && a.email.trim().toLowerCase() === cleanEmail && a.status === 'approved'
          );
          if (serverMatch && (state as string) !== 'approved') {
            handleAccountBecameApproved(serverMatch, true);
          }
        }
      } catch {} finally {
        isCheckingRef.current = false;
      }
    };

    // Polling interval for approval detection when pending (fast 2.5s for instant reaction)
    const interval = setInterval(checkApprovalStatus, state === 'submitted_pending' ? 2500 : 10000);

    // Instant check on window focus & online
    const onFocus = () => checkApprovalStatus();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);

    // Cross-tab storage change listener
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'super_x_all_user_accounts' ||
        e.key === 'super_x_sms_backup_accounts' ||
        e.key === DEVICE_LOCK_KEY
      ) {
        checkApprovalStatus();
      }
    };
    window.addEventListener('storage', onStorage);

    // Custom window events
    const onAccountUpdate = (e: any) => {
      const updatedAcc = e?.detail?.account;
      if (
        updatedAcc &&
        updatedAcc.email?.toLowerCase().trim() === cleanEmail &&
        updatedAcc.status === 'approved'
      ) {
        handleAccountBecameApproved(updatedAcc, true);
      } else {
        checkApprovalStatus();
      }
    };
    window.addEventListener('super_x_account_update', onAccountUpdate);
    window.addEventListener('super_x_account_approved', onAccountUpdate);
    window.addEventListener('super_x_accounts_updated', checkApprovalStatus);

    // Direct EventSource connection for sub-second approval notifications
    let sse: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      try {
        sse = new EventSource('/api/accounts/events');
        sse.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data?.type === 'accounts_updated') {
              if (
                data.account &&
                data.account.email?.toLowerCase().trim() === cleanEmail &&
                data.account.status === 'approved'
              ) {
                handleAccountBecameApproved(data.account, true);
              } else {
                checkApprovalStatus();
              }
            }
          } catch {}
        };
      } catch {}
    }

    return () => {
      clearInterval(interval);
      if (sse) {
        try {
          sse.close();
        } catch {}
      }
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('super_x_account_update', onAccountUpdate);
      window.removeEventListener('super_x_account_approved', onAccountUpdate);
      window.removeEventListener('super_x_accounts_updated', checkApprovalStatus);
    };
  }, [email, state]);

  // Form Validation: All 5 fields (Name, Email, Pass, Country & Phone, Agent Mail) are strictly required
  const isEmailValid = (em: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim());
  const isPhoneValid = (ph: string) => ph.trim().replace(/\D/g, '').length >= 6;
  const isAgentMailValid = (em: string) => isEmailValid(em) && em.trim().length >= 6;

  const isFormComplete =
    fullName.trim().length >= 2 &&
    isEmailValid(email) &&
    password.trim().length >= 4 &&
    country.trim().length > 0 &&
    isPhoneValid(phoneNumber) &&
    isAgentMailValid(agentEmail);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanCountry = country.trim();
    const cleanPhone = phoneNumber.trim();
    const fullPhoneNumber = cleanPhone.startsWith('+') ? cleanPhone : `${dialCode} ${cleanPhone}`.trim();
    const cleanAgent = agentEmail.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      setFormError('দয়া করে আপনার পূর্ণ নাম লিখুন (Enter your full name).');
      return;
    }

    if (!cleanEmail || !isEmailValid(cleanEmail)) {
      setFormError('সঠিক ইমেইল অ্যাড্রেস প্রদান করুন (Valid email address required).');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setFormError('পাসওয়ার্ড ন্যূনতম ৪ অক্ষরের হতে হবে (Password must be at least 4 characters).');
      return;
    }

    if (!cleanCountry) {
      setFormError('আপনার দেশ সিলেক্ট করুন (Please select your country).');
      return;
    }

    if (!cleanPhone || !isPhoneValid(cleanPhone)) {
      setFormError('সঠিক মোবাইল নাম্বার প্রদান করুন (Please enter a valid phone number).');
      return;
    }

    if (!cleanAgent || !isAgentMailValid(cleanAgent)) {
      setFormError('সঠিক এজেন্ট মেইল প্রদান করুন! আমাদের অফিসিয়াল টেলিগ্রাম গ্রুপে পিন করা অনুমোদিত এজেন্ট মেইলটি সংগ্রহ করে এখানে দিন। (Valid Agent Mail required from official Telegram pinned message).');
      return;
    }

    setIsSubmitting(true);
    setState('submitting');
    const nowTime = Date.now();
    setSubmittedAt(nowTime);

    try {
      // 1. Submit to User Auth Service (local, server & Firebase real-time persistence)
      const res = requestNewAccount({
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        country: cleanCountry,
        phoneOrTelegram: fullPhoneNumber,
        agentEmail: cleanAgent,
        agentMail: cleanAgent,
        note: `Submitted via Support Bot Form | Country: ${cleanCountry} | Phone: ${fullPhoneNumber} | Agent: ${cleanAgent}`,
      });

      if (!res.success && res.message) {
        setIsSubmitting(false);
        setState('form');
        setFormError(res.message);
        return;
      }

      const generatedCode = res.account?.accountCode || '2886064606';
      setAccountCode(generatedCode);

      // 2. Direct Telegram notification to Admin Bot with Approve/Reject inline button
      sendAccountActivationRequestToAdminTelegram({
        id: res.account?.id,
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        country: cleanCountry,
        phoneOrTelegram: fullPhoneNumber,
        agentEmail: cleanAgent,
        agentMail: cleanAgent,
        accountCode: generatedCode,
        createdAt: nowTime,
        note: `Submitted via Support Bot Form | Phone: ${fullPhoneNumber} | Agent: ${cleanAgent}`,
      }).catch(() => {});

      // 3. Submit to Server Backend (/api/accounts/request) in background
      fetch('/api/accounts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: cleanPass,
          country: cleanCountry,
          phoneOrTelegram: fullPhoneNumber,
          agentEmail: cleanAgent,
          agentMail: cleanAgent,
          accountCode: generatedCode,
          note: `Submitted via Support Bot Form | Phone: ${fullPhoneNumber} | Agent: ${cleanAgent}`,
        }),
      }).catch((err) => {
        console.warn('Server account request error:', err);
      });

      // Lock device to this submission permanently
      try {
        const lockData = {
          state: 'submitted_pending',
          fullName: cleanName,
          email: cleanEmail,
          password: cleanPass,
          country: cleanCountry,
          phoneNumber: cleanPhone,
          phoneOrTelegram: fullPhoneNumber,
          agentEmail: cleanAgent,
          accountCode: generatedCode,
          submittedAt: nowTime,
        };
        localStorage.setItem(DEVICE_LOCK_KEY, JSON.stringify(lockData));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lockData));
      } catch {}

      setIsSubmitting(false);
      setState('submitted_pending');
    } catch (err: any) {
      setIsSubmitting(false);
      setState('form');
      setFormError(err?.message || 'Failed to submit account request. Please try again.');
    }
  };

  // Login click handler (One-click instant fill)
  const handleLoginClick = () => {
    setIsOpen(false);
    try {
      if (email) localStorage.setItem('super_x_sms_remembered_identifier', email);
      if (password) localStorage.setItem('super_x_sms_remembered_password', password);

      window.dispatchEvent(
        new CustomEvent('super_x_fill_login_credentials', {
          detail: {
            identifier: email,
            password: password,
          },
        })
      );

      const emailInput = (document.getElementById('login-email-input') ||
        document.querySelector('input[type="text"], input[type="email"], input[name="email"]')) as HTMLInputElement;
      const passInput = (document.getElementById('login-password-input') ||
        document.querySelector('input[type="password"]')) as HTMLInputElement;

      if (emailInput && email) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(emailInput, email);
        else emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (passInput && password) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(passInput, password);
        else passInput.value = password;
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
        passInput.focus();
      }
    } catch {}
  };

  return (
    <>
      {/* -------------------- FLOATING SUPPORT / ACTIVATION BUTTON -------------------- */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 font-sans">
        {/* Floating Tooltip Label */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-xs shadow-2xl backdrop-blur-md cursor-pointer transition transform hover:scale-105 active:scale-95 border-2 ${
            state === 'approved'
              ? 'bg-emerald-950/95 hover:bg-emerald-900 text-emerald-300 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
              : state === 'submitted_pending'
              ? 'bg-amber-950/95 hover:bg-amber-900 text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
              : 'bg-slate-950/95 hover:bg-slate-900 text-amber-300 border-amber-500/60'
          }`}
        >
          {state === 'approved' ? (
            <>
              <PartyPopper className="w-4 h-4 text-emerald-400 animate-bounce" />
              <span>🎉 ACCOUNT APPROVED (LOGIN NOW)</span>
            </>
          ) : state === 'submitted_pending' ? (
            <>
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>ACTIVATION PENDING (CHECKING LIVE)</span>
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>ROBOTIC ACTIVATION CORE</span>
            </>
          )}
        </button>

        {/* Circular Floating Icon with Animated Glow */}
        <button
          type="button"
          id="active-account-floating-btn"
          onClick={() => setIsOpen(true)}
          className={`relative group p-[2.5px] rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer ${
            state === 'approved'
              ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.8)]'
              : state === 'submitted_pending'
              ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.8)]'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
          }`}
          title="Account Activation & Support"
        >
          {/* Pulsing Aura */}
          <span className="absolute -inset-1 rounded-full bg-inherit opacity-75 blur-sm animate-pulse group-hover:opacity-100 transition" />

          {/* Inner Content */}
          <div className="relative w-13 h-13 rounded-full bg-slate-950 flex items-center justify-center text-white border border-slate-800">
            {state === 'approved' ? (
              <Sparkles className="w-7 h-7 text-emerald-400 animate-spin" />
            ) : state === 'submitted_pending' ? (
              <Clock className="w-7 h-7 text-amber-400 animate-spin" />
            ) : (
              <Bot className="w-7 h-7 text-amber-400 group-hover:scale-110 transition" />
            )}

            {/* Live Indicator Pill */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                state === 'approved' ? 'bg-emerald-400' : state === 'submitted_pending' ? 'bg-amber-400' : 'bg-green-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-4 w-4 border-2 border-slate-950 ${
                state === 'approved' ? 'bg-emerald-500' : state === 'submitted_pending' ? 'bg-amber-500' : 'bg-green-500'
              }`} />
            </span>
          </div>
        </button>
      </div>

      {/* -------------------- MODAL POPUP DIALOG -------------------- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-sans">
          <div className="relative w-full max-w-lg bg-slate-950 border-2 border-amber-500/50 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Top Glowing Header */}
            <div className="relative p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  {state === 'approved' ? (
                    <Sparkles className="w-6 h-6 text-emerald-400 animate-spin" />
                  ) : state === 'submitted_pending' ? (
                    <Clock className="w-6 h-6 text-amber-400 animate-spin" />
                  ) : (
                    <Bot className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white tracking-wide uppercase">
                      SUPER X SMS
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/80 font-mono flex items-center gap-1">
                    <span>&gt;_</span>
                    <span>Robotic Account Activation Core</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Container with Smooth Scroll */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              
              {/* 1 Submission Per Device Policy Notice */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Device Policy:</span>
                </span>
                <span className="font-bold text-amber-300 font-mono">1 Account per Browser</span>
              </div>

              {/* STATE 1: REGISTRATION & ACTIVATION FORM */}
              {(state === 'form' || state === 'submitting') && (
                <form onSubmit={handleSubmit} className="space-y-3.5">

                  {/* OFFICIAL TELEGRAM JOIN & COLLECT AGENT MAIL CARD */}
                  <div className="p-3.5 border-2 border-cyan-500/70 rounded-2xl bg-gradient-to-br from-cyan-950/90 via-slate-900 to-indigo-950/90 space-y-2.5 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    <div className="flex items-center justify-between font-extrabold text-[11px]">
                      <span className="flex items-center gap-1.5 text-cyan-300 uppercase tracking-wider">
                        <Megaphone className="w-4 h-4 text-cyan-400 animate-bounce" />
                        <span>MANDATORY AGENT VERIFICATION</span>
                      </span>

                      <span className="px-2 py-0.5 rounded border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Send className="w-3 h-3 text-cyan-300" />
                        <span>TELEGRAM</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                      ফর্ম সাবমিট করতে <strong>এজেন্ট মেইল (Agent Mail)</strong> দেওয়া বাধ্যতামূলক। নিচের বাটনে ক্লিক করে অফিসিয়াল টেলিগ্রামে জয়েন করে অনুমোদিত এজেন্টের মেইল সংগ্রহ করুন:
                    </p>

                    <a
                      href="https://t.me/super_x_support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-2 border border-cyan-300/40 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] transition transform hover:scale-[1.01] active:scale-98 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-cyan-200" />
                      <span>👉 COLLECT AGENT MAIL FROM OFFICIAL TELEGRAM</span>
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-200 ml-auto" />
                    </a>
                  </div>

                  {/* Field 1: Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Full Name (পূর্ণ নাম)</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">REQ_NAME</span>
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
                        className="w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium bg-slate-900/90 border-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  {/* Field 2: Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>Email Address (ইমেইল অ্যাড্রেস)</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">USER_EMAIL</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        disabled={state === 'submitting'}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setFormError('');
                        }}
                        placeholder="e.g. user@gmail.com"
                        className="w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium bg-slate-900/90 border-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  {/* Field 3: Password */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Account Password (পাসওয়ার্ড)</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">SECURE_PASS</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        disabled={state === 'submitting'}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setFormError('');
                        }}
                        placeholder="Set account password (min 4 chars)"
                        className="w-full pl-3.5 pr-10 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium bg-slate-900/90 border-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Field 4: Country & Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-amber-400" />
                        <span>Country &amp; Phone Number (দেশ ও নাম্বার)</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">REQ_PHONE</span>
                    </label>

                    <div className="space-y-2">
                      <div className="relative">
                        <select
                          value={country}
                          disabled={state === 'submitting'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCountry(val);
                            const found = GLOBAL_COUNTRIES_LIST.find(c => `${c.name} (${c.flag})` === val || c.name === val);
                            if (found) {
                              setDialCode(found.dialCode);
                            } else if (val.includes('Bangladesh')) {
                              setDialCode('+880');
                            } else if (val.includes('India')) {
                              setDialCode('+91');
                            } else if (val.includes('Pakistan')) {
                              setDialCode('+92');
                            } else if (val.includes('Saudi Arabia')) {
                              setDialCode('+966');
                            } else if (val.includes('UAE')) {
                              setDialCode('+971');
                            }
                            setFormError('');
                          }}
                          className="w-full px-3.5 py-2.5 border rounded-xl text-white bg-slate-900/90 border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-xs font-medium transition cursor-pointer"
                        >
                          <option value="Bangladesh (🇧🇩)">🇧🇩 Bangladesh (+880)</option>
                          <option value="India (🇮🇳)">🇮🇳 India (+91)</option>
                          <option value="Pakistan (🇵🇰)">🇵🇰 Pakistan (+92)</option>
                          <option value="Saudi Arabia (🇸🇦)">🇸🇦 Saudi Arabia (+966)</option>
                          <option value="United Arab Emirates (🇦🇪)">🇦🇪 UAE (+971)</option>
                          <option value="Qatar (🇶🇦)">🇶🇦 Qatar (+974)</option>
                          <option value="Kuwait (🇰🇼)">🇰🇼 Kuwait (+965)</option>
                          <option value="Oman (🇴🇲)">🇴🇲 Oman (+968)</option>
                          <option value="Malaysia (🇲🇾)">🇲🇾 Malaysia (+60)</option>
                          <option value="Singapore (🇸🇬)">🇸🇬 Singapore (+65)</option>
                          <option value="United States (🇺🇸)">🇺🇸 United States (+1)</option>
                          <option value="United Kingdom (🇬🇧)">🇬🇧 United Kingdom (+44)</option>
                          <option value="Canada (🇨🇦)">🇨🇦 Canada (+1)</option>
                          <option value="Australia (🇦🇺)">🇦🇺 Australia (+61)</option>
                          {GLOBAL_COUNTRIES_LIST.filter(c => !['BD', 'IN', 'PK', 'SA', 'AE', 'QA', 'KW', 'OM', 'MY', 'SG', 'US', 'GB', 'CA', 'AU'].includes(c.iso)).map((c) => (
                            <option key={c.iso} value={`${c.name} (${c.flag})`}>
                              {c.flag} {c.name} ({c.dialCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-xs font-mono font-bold text-amber-400 pointer-events-none select-none">
                          {dialCode}
                        </div>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          disabled={state === 'submitting'}
                          onChange={(e) => {
                            setPhoneNumber(e.target.value);
                            setFormError('');
                          }}
                          placeholder="Phone number / ফোন নাম্বার দিন"
                          className="w-full pl-16 pr-3.5 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium bg-slate-900/90 border-slate-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Field 5: Agent Mail (MANDATORY) */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/40">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                        <span>Agent Mail (এজেন্ট মেইল — বাধ্যতামূলক)</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                        MUST_REQUIRED
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={agentEmail}
                        disabled={state === 'submitting'}
                        onChange={(e) => {
                          setAgentEmail(e.target.value);
                          setFormError('');
                        }}
                        placeholder="Enter official Agent Email (অফিসিয়াল এজেন্ট মেইল লিখুন)"
                        className="w-full px-3.5 py-2.5 border rounded-xl text-white placeholder-slate-500 focus:outline-none text-xs font-medium bg-slate-900/90 border-amber-500/50 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition"
                      />
                    </div>
                    <p className="text-[10px] text-amber-300/90 font-medium leading-relaxed">
                      📌 ভ্যালিড এজেন্ট মেইল পেতে উপরের অফিসিয়াল টেলিগ্রাম গ্রুপে জয়েন করুন এবং পিন মেসেজ (Pinned Message) থেকে এজেন্ট মেইল সংগ্রহ করে এখানে দিন। এজেন্ট মেইল ছাড়া সাবমিট অপশন ওপেন হবে না।
                    </p>
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
                    disabled={!isFormComplete || state === 'submitting'}
                    className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition transform ${
                      !isFormComplete
                        ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)] border-amber-300/40 hover:scale-[1.02] active:scale-98 cursor-pointer'
                    }`}
                  >
                    {state === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Submitting Request...</span>
                      </>
                    ) : !isFormComplete ? (
                      <>
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>COMPLETE ALL FIELDS (AGENT MAIL REQUIRED)</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-slate-950" />
                        <span>SUBMIT ACTIVATION REQUEST (রিকোয়েস্ট পাঠান)</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STATE 2: SUBMITTED & PENDING APPROVAL CARD */}
              {state === 'submitted_pending' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Thank you Banner */}
                  <div className="p-4 bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border border-amber-500/60 rounded-2xl text-center space-y-2 shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
                      <Clock className="w-7 h-7 animate-spin" />
                    </div>

                    <h4 className="font-extrabold text-sm text-amber-300 uppercase tracking-wide">
                      REQUEST SUBMITTED & PENDING!
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      আপনার অ্যাকাউন্ট অ্যাক্টিভেশন রিকোয়েস্ট অ্যাডমিন/বটের নিকট পাঠানো হয়েছে। অ্যাডমিন অ্যাপ্রুভ করা মাত্রই এখানে সরাসরি <strong className="text-emerald-400">কংগ্রাচুলেশনস</strong> জানিয়ে একটিভ হয়ে যাবে।
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

                    <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Country:</span>
                      <strong className="text-white font-bold">{country}</strong>
                    </div>

                    {phoneNumber && (
                      <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-800">
                        <span className="text-slate-400">Phone:</span>
                        <strong className="text-cyan-300 font-mono font-bold">{phoneNumber.startsWith('+') ? phoneNumber : `${dialCode} ${phoneNumber}`}</strong>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Agent Mail:</span>
                      <strong className="text-cyan-300 font-mono font-bold">{agentEmail}</strong>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Live Status:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px] flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-ping text-amber-400" />
                        <span>WAITING FOR ADMIN APPROVAL</span>
                      </span>
                    </div>
                  </div>

                  {/* Realtime Detection Radar */}
                  <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center gap-2.5 text-amber-200 text-[11px] animate-pulse">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="leading-snug">
                      লাইভ স্ট্যাটাস মনিটর রানিং রয়েছে। টেলিগ্রাম বট বা অ্যাডমিন থেকে অ্যাপ্রুভ করলেই স্বয়ংক্রিয়ভাবে একটিভ হবে।
                    </span>
                  </div>

                  {/* Device Lock Notice */}
                  <p className="text-[10px] text-slate-500 text-center font-mono">
                    Device Lock Active: 1 Submission per Browser
                  </p>
                </div>
              )}

              {/* STATE 3: CELEBRATION / CONGRATULATIONS CARD */}
              {state === 'approved' && (
                <div className="p-4 bg-gradient-to-b from-emerald-950/90 via-slate-900 to-slate-950 border-2 border-emerald-400 rounded-3xl space-y-4 text-emerald-100 shadow-[0_0_35px_rgba(16,185,129,0.4)] animate-fadeIn">
                  
                  {/* Top Glowing Header */}
                  <div className="flex items-center justify-between border-b border-emerald-500/40 pb-2.5">
                    <div className="flex items-center gap-2 text-emerald-300 font-black text-xs uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>ACCOUNT APPROVED & ACTIVE</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-black border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                      ✓ ACTIVE
                    </span>
                  </div>

                  {/* Big Congratulation Badge */}
                  <div className="text-center space-y-2 py-1">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 p-0.5 mx-auto shadow-[0_0_25px_rgba(16,185,129,0.7)] animate-bounce">
                      <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                      </div>
                    </div>

                    <h4 className="font-black text-lg text-white tracking-tight flex items-center justify-center gap-1.5">
                      <span>🎉 CONGRATULATIONS!</span>
                    </h4>
                    <p className="text-xs text-emerald-300 font-bold">
                      অভিনন্দন {fullName || 'ব্যবহারকারী'}! আপনার SUPER X SMS অ্যাকাউন্টটি অ্যাপ্রুভড ও সফলভাবে একটিভ করা হয়েছে।
                    </p>
                  </div>

                  {/* Account Credentials Card */}
                  <div className="p-3.5 bg-slate-950/95 rounded-2xl border border-emerald-500/50 text-xs space-y-2.5 font-mono shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans text-[11px]">10-Digit ID Code:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-amber-300 font-black text-sm tracking-wider">{accountCode}</strong>
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

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 font-sans text-[11px]">Login Email:</span>
                      <strong className="text-white font-bold">{email}</strong>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 font-sans text-[11px]">User Password:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-amber-300 font-mono font-bold">{password || '••••••••'}</strong>
                        {password && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(password);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                            title="Copy Password"
                          >
                            {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 font-sans text-[11px]">Country:</span>
                      <strong className="text-emerald-300 font-bold font-sans">{country}</strong>
                    </div>

                    {phoneNumber && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400 font-sans text-[11px]">Phone:</span>
                        <strong className="text-cyan-300 font-mono font-bold">{phoneNumber.startsWith('+') ? phoneNumber : `${dialCode} ${phoneNumber}`}</strong>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 font-sans text-[11px]">Agent Mail:</span>
                      <strong className="text-cyan-300 font-mono">{agentEmail}</strong>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 font-sans text-[11px]">Status:</span>
                      <span className="text-emerald-400 font-bold font-sans">✓ Verified & Activated</span>
                    </div>
                  </div>

                  {/* Direct Login Button */}
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.7)] transition transform hover:scale-[1.02] active:scale-98 cursor-pointer"
                  >
                    <span>LOGIN NOW (লগইন করুন)</span>
                    <ArrowRight className="w-4 h-4" />
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
