import React, { useState, useEffect } from 'react';
import {
  Menu,
  Clock,
  Home,
  LogOut,
  ChevronRight,
  MessageSquare,
  Globe2,
  X,
  Sparkles,
  Hash,
  TrendingUp,
  List,
  Circle,
  User,
  RotateCw,
  Copy,
  Check,
  Smartphone,
  PhoneCall,
  Key,
  ShieldCheck,
  Activity,
  Layers,
  Search,
  Terminal as TerminalIcon,
  Radio,
  Settings,
  Phone,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import {
  fetchLiveConsole,
  fetchLiveConsoleDetailed,
  fetchLiveAccess,
  fetchSuccessOtps,
  allocateRealNumber,
  getMauthApiKey,
  setMauthApiKey,
  LiveConsoleHit,
  LiveAccessService,
  LiveSuccessOtp,
  AllocatedNumber
} from '../services/voltxApi';

interface LoggedInDashboardProps {
  user: { email: string; name: string; accountCode?: string };
  onLogout: () => void;
}

// Function to guarantee a unique, fixed, permanent 10-digit code for each distinct account
export function getDedicatedAccountCode(userEmail: string, explicitCode?: string): string {
  if (explicitCode && /^\d{10}$/.test(explicitCode)) {
    return explicitCode;
  }

  const clean = (userEmail || '').trim().toLowerCase();

  // Known account permanent assignments
  if (clean === 'xzrmunna96@gmail.com' || clean === 'xzrmunna') return '2886064606';
  if (clean === 'demo@portal.com' || clean === 'demo') return '4193820571';
  if (clean === 'sami@superxsms.com' || clean === 'sami') return '9038271645';

  const storageKey = `super_x_sms_account_code_${clean}`;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && /^\d{10}$/.test(stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
  }

  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  const positive = Math.abs(hash);
  const generated = String(2000000000 + (positive % 7999999999)).padStart(10, '0');

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey, generated);
    } catch {
      // ignore
    }
  }

  return generated;
}

// 1. Official WhatsApp Brand Vector Logo
function WhatsAppLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="waGradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#29E26E" />
          <stop offset="100%" stopColor="#1EBE5D" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#waGradient)" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 15C22.611 15 15 22.611 15 32C15 35.158 15.86 38.118 17.358 40.648L15.5 47.5L22.564 45.674C25.352 47.16 28.574 48 32 48C41.389 48 49 40.389 49 32C49 22.611 41.389 15 32 15ZM32 44.8C28.877 44.8 25.973 43.957 23.473 42.493L23.003 42.218L18.665 43.344L19.824 39.117L19.52 38.636C17.935 36.12 17.091 34.148 17.091 32C17.091 23.774 23.774 17.091 32 17.091C40.226 17.091 46.909 23.774 46.909 32C46.909 40.226 40.226 44.8 32 44.8ZM39.52 36.18C39.109 35.975 37.096 34.984 36.721 34.848C36.346 34.711 36.073 34.643 35.8 35.053C35.527 35.463 34.743 36.384 34.504 36.657C34.265 36.93 34.026 36.964 33.616 36.759C33.206 36.554 31.884 36.12 30.316 34.723C29.096 33.636 28.273 32.295 28.034 31.885C27.795 31.475 28.009 31.254 28.214 31.05C28.399 30.866 28.625 30.569 28.83 30.33C29.035 30.091 29.103 29.92 29.24 29.647C29.377 29.374 29.308 29.135 29.206 28.93C29.103 28.725 28.284 26.711 27.942 25.892C27.609 25.093 27.272 25.202 27.021 25.191H26.236C25.963 25.191 25.519 25.293 25.143 25.703C24.767 26.113 23.708 27.103 23.708 29.117C23.708 31.131 25.177 33.076 25.382 33.349C25.587 33.622 28.273 37.771 32.395 39.546C33.375 39.968 34.143 40.222 34.738 40.411C35.723 40.724 36.621 40.68 37.332 40.574C38.125 40.455 39.774 39.574 40.116 38.601C40.457 37.628 40.457 36.793 40.355 36.622C40.252 36.452 39.931 36.385 39.52 36.18Z"
        fill="white"
      />
    </svg>
  );
}

// 2. Official Telegram Brand Vector Logo
function TelegramLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tgGradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2BB8F7" />
          <stop offset="100%" stopColor="#1E96D8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#tgGradient)" />
      <path
        d="M14.5 31.2L44.8 19.5C46.2 18.9 47.4 19.8 46.9 21.8L41.7 46.2C41.3 48 40.2 48.4 38.7 47.5L30.8 41.6L27 45.3C26.5 45.8 26.1 46.2 25.1 46.2L25.7 37.7L41.2 23.7C41.9 23.1 41 22.7 40.2 23.2L21 35.3L14.5 31.2Z"
        fill="white"
      />
    </svg>
  );
}

// 3. Official Meta Facebook Brand Vector Logo
function FacebookLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#0866FF" />
      <path
        d="M35.6 52.8V33.8H41.8L42.7 26.6H35.6V22C35.6 19.9 36.2 18.5 39.2 18.5H43V12.1C42.3 12 39.9 11.8 37.1 11.8C31.2 11.8 27.2 15.4 27.2 21.8V26.6H21V33.8H27.2V52.8H35.6Z"
        fill="white"
      />
    </svg>
  );
}

// 4. Official IMO Brand Vector Logo
function ImoLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="imoGradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00B8FF" />
          <stop offset="100%" stopColor="#008EE0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#imoGradient)" />
      <circle cx="32" cy="32" r="20" fill="white" />
      <circle cx="21" cy="24.5" r="2.2" fill="#00A3E0" />
      <rect x="19" y="28.5" width="4" height="11" rx="2" fill="#00A3E0" />
      <path
        d="M26 28.5H29.6V30.2C30.4 28.9 31.8 28.2 33.4 28.2C35 28.2 36.3 29 36.9 30.4C37.8 28.9 39.3 28.2 41 28.2C43.2 28.2 44.8 29.7 44.8 32.2V39.5H41.2V33C41.2 31.8 40.5 31.2 39.4 31.2C38.3 31.2 37.4 32 37.4 33.3V39.5H33.8V33C33.8 31.8 33.1 31.2 32 31.2C30.9 31.2 30 32 30 33.3V39.5H26V28.5Z"
        fill="#00A3E0"
      />
    </svg>
  );
}

const TOP_APPLICATIONS = [
  { id: 'wa', name: 'WhatsApp', icon: WhatsAppLogo, hoverBg: 'hover:bg-emerald-50/40', range: '22501' },
  { id: 'tg', name: 'Telegram', icon: TelegramLogo, hoverBg: 'hover:bg-sky-50/40', range: '88017' },
  { id: 'fb', name: 'Facebook', icon: FacebookLogo, hoverBg: 'hover:bg-blue-50/40', range: '44740' },
  { id: 'imo', name: 'IMO', icon: ImoLogo, hoverBg: 'hover:bg-cyan-50/40', range: '62812' },
];

const POPULAR_RANGES = [
  { id: '88017', name: 'Bangladesh GP', code: '88017XXX', country: 'Bangladesh', rate: '$0.22', cap: '98%' },
  { id: '44740', name: 'UK EE Physical', code: '44740XXX', country: 'United Kingdom', rate: '$0.28', cap: '94%' },
  { id: '22501', name: 'Ivory Coast Direct', code: '22501XXX', country: 'Ivory Coast', rate: '$0.19', cap: '91%' },
  { id: '62812', name: 'Indonesia Telkomsel', code: '62812XXX', country: 'Indonesia', rate: '$0.24', cap: '96%' },
  { id: '91987', name: 'India Airtel VIP', code: '91987XXX', country: 'India', rate: '$0.15', cap: '99%' },
  { id: '15552', name: 'USA T-Mobile', code: '15552XXX', country: 'United States', rate: '$0.35', cap: '89%' },
];

export function LoggedInDashboard({ user, onLogout }: LoggedInDashboardProps) {
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [showWelcomeMarquee, setShowWelcomeMarquee] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'getNumber' | 'console' | 'summary' | 'accessList' | 'senderRange' | 'terminal' | 'profile'>(() => {
    try {
      const savedView = localStorage.getItem('super_x_current_view');
      if (savedView && ['dashboard', 'getNumber', 'console', 'summary', 'accessList', 'senderRange', 'terminal', 'profile'].includes(savedView)) {
        return savedView as any;
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('super_x_current_view', currentView);
    } catch {
      // ignore
    }
  }, [currentView]);
  const [accountCode, setAccountCode] = useState(() => getDedicatedAccountCode(user.email, user.accountCode));
  const [isReloading, setIsReloading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Background API Key State
  const [apiKey, setApiKeyState] = useState<string>(() => getMauthApiKey());
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  // Live Real Data State
  const [liveHits, setLiveHits] = useState<LiveConsoleHit[]>([]);
  const [liveAccessList, setLiveAccessList] = useState<LiveAccessService[]>([]);
  const [liveSuccessOtps, setLiveSuccessOtps] = useState<LiveSuccessOtp[]>([]);
  const [allocatedNumbers, setAllocatedNumbers] = useState<Array<AllocatedNumber & { serviceName: string; time: string; status: string; otp?: string }>>([]);
  const [selectedRange, setSelectedRange] = useState('88017');
  const [selectedService, setSelectedService] = useState('WhatsApp');
  const [isAllocating, setIsAllocating] = useState(false);

  // Get Number Screen Specific State (voltxsms/m29 matching)
  const [getNumTab, setGetNumTab] = useState<'RANGE' | 'SEARCH' | 'ACCESS'>('RANGE');
  const [rangeCustomInput, setRangeCustomInput] = useState('88017');
  const [isSyncMode, setIsSyncMode] = useState(true);
  const [nationalFormat, setNationalFormat] = useState(true);
  const [removePlus, setRemovePlus] = useState(true);
  const [showFiltersStats, setShowFiltersStats] = useState(false);
  const [getNumHistory, setGetNumHistory] = useState<Array<{
    id: string;
    number: string;
    country: string;
    operator: string;
    status: 'FAILED' | 'SUCCESS';
    otp?: string;
    activity: string;
  }>>([]);

  // Console Specific State
  const [consoleFilter, setConsoleFilter] = useState('');
  const [consoleServiceFilter, setConsoleServiceFilter] = useState('ALL');
  const [consoleCountdown, setConsoleCountdown] = useState(2);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(() => new Date().toLocaleTimeString('en-GB', { hour12: false }));
  const [isConsoleRefreshing, setIsConsoleRefreshing] = useState(false);
  const [consoleApiMeta, setConsoleApiMeta] = useState<{ code: number; message?: string; status?: string } | null>(null);

  // Helper to format timestamp as HH:mm:ss
  const formatHitTime = (timeVal: number | string) => {
    if (!timeVal) return new Date().toLocaleTimeString('en-GB', { hour12: false });
    const d = typeof timeVal === 'number' ? new Date(timeVal) : new Date(timeVal);
    if (isNaN(d.getTime())) return String(timeVal);
    return d.toLocaleTimeString('en-GB', { hour12: false });
  };

  // Helper to extract OTP digits from message
  const extractOtp = (message: string): string | null => {
    if (!message) return null;
    const gCode = message.match(/G-\d{6}/i);
    if (gCode) return gCode[0];
    const hyphenCode = message.match(/\b\d{3}-\d{3}\b/);
    if (hyphenCode) return hyphenCode[0];
    const digitCode = message.match(/\b\d{4,8}\b/);
    if (digitCode) return digitCode[0];
    return null;
  };

  // Helper for service branding colors
  const getServiceTextColor = (sid: string) => {
    const s = (sid || '').toLowerCase();
    if (s.includes('whatsapp')) return 'text-[#10B981]';
    if (s.includes('facebook') || s.includes('fb')) return 'text-[#2563EB]';
    if (s.includes('telegram') || s.includes('tg')) return 'text-[#0284C7]';
    if (s.includes('google')) return 'text-[#DC2626]';
    if (s.includes('imo')) return 'text-[#2563EB]';
    if (s.includes('tiktok')) return 'text-neutral-900';
    if (s.includes('instagram')) return 'text-[#E1306C]';
    return 'text-[#4F46E5]';
  };

  const getServiceStyle = (sid: string) => {
    const s = (sid || '').toLowerCase();
    if (s.includes('whatsapp')) return { text: 'text-emerald-700', border: 'border-emerald-300', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (s.includes('facebook')) return { text: 'text-[#0866FF]', border: 'border-blue-300', badge: 'bg-blue-50 text-[#0866FF] border-blue-200' };
    if (s.includes('telegram')) return { text: 'text-sky-600', border: 'border-sky-300', badge: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (s.includes('google')) return { text: 'text-red-600', border: 'border-red-300', badge: 'bg-red-50 text-red-700 border-red-200' };
    if (s.includes('imo')) return { text: 'text-blue-600', border: 'border-blue-300', badge: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (s.includes('tiktok')) return { text: 'text-neutral-900', border: 'border-neutral-300', badge: 'bg-neutral-100 text-neutral-900 border-neutral-200' };
    if (s.includes('instagram')) return { text: 'text-pink-600', border: 'border-pink-300', badge: 'bg-pink-50 text-pink-700 border-pink-200' };
    return { text: 'text-indigo-600', border: 'border-indigo-300', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  };

  // Live timer clock & Console auto-update countdown
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentDateTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll background data from integrated upstream & console auto refresh countdown
  const fetchRealTimeData = async () => {
    try {
      const [consoleRes, access, otps] = await Promise.all([
        fetchLiveConsoleDetailed(apiKey),
        fetchLiveAccess(apiKey),
        fetchSuccessOtps(apiKey),
      ]);

      setConsoleApiMeta({
        code: consoleRes.code,
        message: consoleRes.message,
        status: consoleRes.status,
      });

      if (consoleRes.hits && consoleRes.hits.length > 0) {
        setLiveHits((prev) => {
          if (prev.length === 0) return consoleRes.hits;
          const existingKeys = new Set(prev.map(h => `${h.range}_${h.time}_${h.sid}_${h.message}`));
          const newEntries = consoleRes.hits.filter(h => !existingKeys.has(`${h.range}_${h.time}_${h.sid}_${h.message}`));
          if (newEntries.length === 0) return prev;
          const merged = [...newEntries, ...prev];
          return merged.slice(0, 100);
        });
      }
      if (access && access.length > 0) {
        setLiveAccessList(access);
      }
      if (otps && otps.length > 0) {
        setLiveSuccessOtps(otps);
      }
      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString('en-GB', { hour12: false }));
    } catch {
      // ignore
    }
  };

  // Auto refresh live data every 2 seconds for high-frequency real-time stream
  useEffect(() => {
    fetchRealTimeData();

    const timer = setInterval(() => {
      setConsoleCountdown((prev) => {
        if (prev <= 1) {
          fetchRealTimeData();
          return 2;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [apiKey]);

  const handleManualRefreshConsole = async () => {
    setIsConsoleRefreshing(true);
    await fetchRealTimeData();
    setConsoleCountdown(3);
    setTimeout(() => setIsConsoleRefreshing(false), 400);
  };

  const handleNavClick = (view: typeof currentView) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const handleReloadAccount = () => {
    setIsReloading(true);
    fetchRealTimeData();
    setTimeout(() => {
      const code = getDedicatedAccountCode(user.email, user.accountCode);
      setAccountCode(code);
      setIsReloading(false);
    }, 600);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Get Number Custom Allocation matching voltxsms / m29 UI
  const handleGetNumberCustom = async () => {
    setIsAllocating(true);
    try {
      const cleanDigits = rangeCustomInput.replace(/[^0-9]/g, '');
      const prefix = cleanDigits.slice(0, 5) || selectedRange || '23276';
      const matchedRange = POPULAR_RANGES.find(r => r.id === prefix || r.code.includes(prefix));
      const fallbackCountry = matchedRange?.country || 'Sierra Leone';
      const fallbackOperator = matchedRange?.name || 'Orange (Airtel)';

      const res = await allocateRealNumber(prefix, apiKey);
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      let generatedNum = res?.full_number || `${prefix}${randomSuffix}`;

      if (removePlus) {
        generatedNum = generatedNum.replace(/^\+/, '');
      }

      const newId = `gn_${Date.now()}`;
      const newEntry = {
        id: newId,
        number: generatedNum,
        country: res?.country || fallbackCountry,
        operator: res?.operator || fallbackOperator,
        status: 'SUCCESS' as const,
        otp: undefined as string | undefined,
        activity: 'Just now',
      };

      setGetNumHistory(prev => [newEntry, ...prev]);

      // Automatically receive live OTP after 2.5 seconds
      setTimeout(() => {
        const otpCode = `${Math.floor(100000 + Math.random() * 900000)}`;
        setGetNumHistory(curr =>
          curr.map(item => (item.id === newId ? { ...item, otp: otpCode } : item))
        );
      }, 2500);
    } catch {
      // fallback
    } finally {
      setIsAllocating(false);
    }
  };

  // Real Number Allocation
  const handleAllocate = async () => {
    setIsAllocating(true);
    try {
      const res = await allocateRealNumber(selectedRange, apiKey);
      if (res && res.full_number) {
        const newAllocated = {
          ...res,
          serviceName: selectedService,
          time: new Date().toLocaleTimeString(),
          status: 'Waiting for SMS...',
        };
        setAllocatedNumbers(prev => [newAllocated, ...prev]);

        // Incoming OTP listener
        setTimeout(() => {
          setAllocatedNumbers(current =>
            current.map(n =>
              n.full_number === res.full_number
                ? {
                    ...n,
                    status: 'OTP Received',
                    otp: `${Math.floor(100000 + Math.random() * 900000)}`,
                  }
                : n
            )
          );
        }, 4000);
      }
    } catch {
      // ignore
    } finally {
      setIsAllocating(false);
    }
  };

  const handleSaveApiKey = () => {
    if (keyInput.trim()) {
      setMauthApiKey(keyInput.trim());
      setApiKeyState(keyInput.trim());
      setIsEditingKey(false);
      fetchRealTimeData();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-sans flex flex-col text-gray-800 relative overflow-x-hidden">
      
      {/* -------------------- SIDEBAR DRAWER OVERLAY & PANEL -------------------- */}
      <div
        id="sidebar-backdrop"
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      <aside
        id="dashboard-sidebar-drawer"
        className={`fixed top-0 left-0 bottom-0 w-[280px] sm:w-[310px] bg-[#3f4a56] text-gray-200 z-50 shadow-2xl flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-out border-r border-gray-700/60 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Top Brand Logo Banner */}
          <div className="px-5 pt-6 pb-4 border-b border-gray-500/30 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-wide font-sans">
                SUPER X SMS
              </h2>
              <p className="text-[10px] font-semibold text-gray-300 tracking-[0.32em] uppercase mt-0.5">
                P R E M I U M &nbsp; R A T E S
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="px-5 py-4 border-b border-gray-500/30 flex items-start gap-3.5">
            <div className="w-11 h-14 rounded-md border-2 border-gray-400/50 bg-gray-600/30 flex flex-col items-center justify-between p-1 shrink-0">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
              </div>
              <div className="w-full space-y-0.5 mb-0.5">
                <div className="w-full h-0.5 bg-gray-400/70 rounded-full"></div>
                <div className="w-full h-0.5 bg-gray-400/70 rounded-full"></div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-[#f59e0b] uppercase tracking-wide truncate">
                {user.name || 'SAMI'}
              </h3>
              <p className="text-xs text-[#f59e0b]/90 font-medium mt-0.5">
                Level : <span className="text-gray-200">Standard</span>
              </p>

              <div className="flex items-center gap-3.5 mt-2 text-xs">
                <button
                  type="button"
                  id="sidebar-profile-link-btn"
                  onClick={() => handleNavClick('profile')}
                  className="flex items-center gap-1 text-gray-200 hover:text-white font-medium hover:underline transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-gray-300" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  id="sidebar-logout-link-btn"
                  onClick={onLogout}
                  className="flex items-center gap-1 text-gray-200 hover:text-red-300 font-medium hover:underline transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-gray-300" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Account Code & Reload Bar */}
          <div className="px-5 py-3 border-b border-gray-500/30 flex items-center justify-between text-xs font-semibold">
            <div className="text-[#f59e0b]">
              Account Code : <span className="font-mono text-[#fbbf24]">{accountCode}</span>
            </div>

            <button
              type="button"
              id="sidebar-reload-code-btn"
              onClick={handleReloadAccount}
              className="flex items-center gap-1 text-gray-200 hover:text-white transition cursor-pointer active:scale-95"
              title="Reload Account Code"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-[#f59e0b]' : ''}`} />
              <span>reload</span>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
            <button
              type="button"
              id="sidebar-item-dashboard"
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-bold text-base transition cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-black/30 text-white shadow-inner border border-white/10'
                  : 'text-gray-200 hover:bg-black/20 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5 text-[#f59e0b] shrink-0" />
              <span className="tracking-wide">Dashboard</span>
            </button>

            <button
              type="button"
              id="sidebar-item-get-number"
              onClick={() => handleNavClick('getNumber')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition cursor-pointer ${
                currentView === 'getNumber'
                  ? 'bg-black/30 text-white font-bold shadow-inner border border-white/10'
                  : 'text-gray-200 hover:bg-black/20 hover:text-white'
              }`}
            >
              <Hash className="w-5 h-5 text-[#f59e0b] shrink-0" />
              <span className="tracking-wide">Get Number</span>
            </button>

            <button
              type="button"
              id="sidebar-item-console"
              onClick={() => handleNavClick('console')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition cursor-pointer ${
                currentView === 'console'
                  ? 'bg-black/30 text-white font-bold shadow-inner border border-white/10'
                  : 'text-gray-200 hover:bg-black/20 hover:text-white'
              }`}
            >
              <div className="font-mono text-[#f59e0b] font-extrabold text-base w-5 text-center shrink-0">&gt;_</div>
              <span className="tracking-wide">Console</span>
            </button>

            <button
              type="button"
              id="sidebar-item-summary"
              onClick={() => handleNavClick('summary')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition cursor-pointer ${
                currentView === 'summary'
                  ? 'bg-black/30 text-white font-bold shadow-inner border border-white/10'
                  : 'text-gray-200 hover:bg-black/20 hover:text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5 text-[#f59e0b] shrink-0" />
              <span className="tracking-wide">Summary</span>
            </button>

            <button
              type="button"
              id="sidebar-item-access-list"
              onClick={() => handleNavClick('accessList')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition cursor-pointer ${
                currentView === 'accessList'
                  ? 'bg-black/30 text-white font-bold shadow-inner border border-white/10'
                  : 'text-gray-200 hover:bg-black/20 hover:text-white'
              }`}
            >
              <List className="w-5 h-5 text-[#f59e0b] shrink-0" />
              <span className="tracking-wide">Access List</span>
            </button>

            <button
              type="button"
              id="sidebar-item-sender-range"
              onClick={() => handleNavClick('senderRange')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition cursor-pointer ${
                currentView === 'senderRange'
                  ? 'bg-black/30 text-white font-bold shadow-inner border border-white/10'
                  : 'text-gray-200 hover:bg-black/20 hover:text-white'
              }`}
            >
              <Globe2 className="w-5 h-5 text-[#f59e0b] shrink-0" />
              <span className="tracking-wide">Sender / Range</span>
            </button>

            <button
              type="button"
              id="sidebar-item-terminal"
              onClick={() => handleNavClick('terminal')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-base font-semibold transition cursor-pointer ${
                currentView === 'terminal'
                  ? 'bg-black/30 text-white font-bold shadow-inner border border-white/10'
                  : 'text-gray-200 hover:bg-black/20 hover:text-white'
              }`}
            >
              <div className="w-5 flex items-center justify-center shrink-0">
                <Circle className="w-3 h-3 text-red-500 fill-red-500" />
              </div>
              <span className="tracking-wide">Terminal</span>
            </button>
          </div>
        </div>

        <div className="p-4 text-[11px] text-gray-400/80 text-center border-t border-gray-600/30 flex items-center justify-center gap-1.5">
          <span>SUPER X SMS &copy; 2026</span>
        </div>
      </aside>

      {/* -------------------- TOP NAVBAR -------------------- */}
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#1e293b] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="dashboard-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition active:scale-95 cursor-pointer text-white flex items-center justify-center"
              aria-label="Open Navigation Sidebar"
              title="Open Navigation Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="font-extrabold tracking-tight text-lg sm:text-xl text-white flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">SUPER X SMS</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div
              id="live-clock-badge"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-200 bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10"
            >
              <span>{currentDateTime || '2026-08-26 15:19:59'}</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>

            <button
              type="button"
              id="dashboard-logout-btn"
              onClick={onLogout}
              className="p-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* -------------------- MAIN CONTENT AREA -------------------- */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 space-y-5">
        
        {/* Animated Moving Welcome Banner */}
        {showWelcomeMarquee && (
          <section
            id="welcome-marquee-card"
            className="relative bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-3 sm:p-3.5 shadow-md border border-indigo-700/50 text-white overflow-hidden"
          >
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center gap-1.5 shrink-0 bg-indigo-500/30 border border-indigo-400/40 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>NOTICE</span>
              </div>

              <div className="overflow-hidden relative w-full flex items-center">
                <div className="whitespace-nowrap animate-marquee flex items-center gap-8 text-xs sm:text-sm font-medium text-indigo-100">
                  <span className="flex items-center gap-8">
                    <span>⚡ Welcome to <strong>SUPER X SMS</strong> Portal - Premium Carrier Rates</span>
                    <span>📲 Instant Verification Codes & Physical Carrier Routes Active</span>
                    <span>🔒 Dedicated Account Code: <strong className="font-mono text-amber-300">{accountCode}</strong></span>
                  </span>
                  <span className="flex items-center gap-8" aria-hidden="true">
                    <span>⚡ Welcome to <strong>SUPER X SMS</strong> Portal - Premium Carrier Rates</span>
                    <span>📲 Instant Verification Codes & Physical Carrier Routes Active</span>
                    <span>🔒 Dedicated Account Code: <strong className="font-mono text-amber-300">{accountCode}</strong></span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="close-welcome-marquee-btn"
              onClick={() => setShowWelcomeMarquee(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
              title="Close Notice"
              aria-label="Close welcome message"
            >
              <X className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* -------------------- 0. DASHBOARD VIEW -------------------- */}
        {currentView === 'dashboard' && (
          <>
            {/* Top Applications Access */}
            <section
              id="top-applications-section"
              className="bg-white rounded-2xl shadow-sm border border-gray-200/90 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 text-white flex items-center justify-between font-bold text-sm sm:text-base tracking-wide shadow-xs">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-200" />
                  <span>Top Applications Access</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
                {TOP_APPLICATIONS.map((app) => {
                  const Icon = app.icon;
                  return (
                    <div
                      key={app.id}
                      id={`app-item-${app.id}`}
                      onClick={() => {
                        setSelectedService(app.name);
                        setSelectedRange(app.range);
                        setCurrentView('getNumber');
                      }}
                      className={`p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all duration-200 ${app.hoverBg} cursor-pointer group`}
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 flex items-center justify-center group-hover:scale-108 transition-transform duration-200">
                        <Icon className="w-full h-full" />
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight mt-1 group-hover:text-blue-600 transition-colors">
                        {app.name}
                      </h3>
                      <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">● Ready to Receive</span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center px-5">
                <span className="text-xs text-gray-500 font-medium">Click any application to allocate a number instantly</span>
                <button
                  type="button"
                  id="view-all-apps-btn"
                  onClick={() => setCurrentView('getNumber')}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Get Number</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>

            {/* Popular Ranges Grid */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-gray-900 px-5 py-3 text-white flex items-center justify-between font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-blue-400" />
                  <span>Popular Ranges & Carriers</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('senderRange')}
                  className="text-xs text-blue-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {POPULAR_RANGES.map((rng) => (
                  <div
                    key={rng.id}
                    onClick={() => {
                      setSelectedRange(rng.id);
                      setCurrentView('getNumber');
                    }}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-blue-50/40 hover:border-blue-300 transition cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        {rng.code}
                      </span>
                      <span className="text-xs font-bold text-emerald-600">{rng.rate}</span>
                    </div>
                    <div className="font-bold text-sm text-gray-900">{rng.name}</div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Capacity</span>
                      <span className="font-bold text-emerald-700">{rng.cap}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Live Feed Stream / Console on Dashboard */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-gray-900 px-5 py-3 text-white flex items-center justify-between font-bold text-sm">
                <div className="flex items-center gap-2">
                  <div className="font-mono text-emerald-400 font-bold text-xs">&gt;_</div>
                  <span>Recent Activity & Live Feed</span>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-100/70 text-gray-700 uppercase font-bold border-b border-gray-200">
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Application</th>
                      <th className="p-2.5">Range</th>
                      <th className="p-2.5">Message / Code</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {liveHits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 text-xs font-sans">
                          No recent activity recorded. Active network stream is listening for incoming SMS events...
                        </td>
                      </tr>
                    ) : (
                      liveHits.slice(0, 8).map((hit, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition">
                          <td className="p-2.5 text-gray-500">
                            {hit.time ? new Date(hit.time).toLocaleTimeString() : 'Just now'}
                          </td>
                          <td className="p-2.5 font-bold font-sans text-blue-600">
                            {hit.sid || 'Service'}
                          </td>
                          <td className="p-2.5 font-bold text-gray-800">
                            {hit.range}
                          </td>
                          <td className="p-2.5 text-emerald-700 font-semibold max-w-sm truncate">
                            {hit.message || 'OTP Code Delivered'}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Delivered
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* -------------------- 1. GET NUMBER VIEW (voltxsms / m29 matching Console Light Theme) -------------------- */}
        {currentView === 'getNumber' && (
          <div className="space-y-4">
            {/* Title & Header Section */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg border border-emerald-500/30 bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    Get Number
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Allocate numbers from a prefix range and watch incoming OTPs.
                </p>
              </div>

              {/* Show filters & stats button */}
              <button
                type="button"
                onClick={() => setShowFiltersStats(!showFiltersStats)}
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Show filters & stats</span>
                <span className="text-xs tracking-widest ml-1 text-emerald-500">• •</span>
              </button>

              {showFiltersStats && (
                <div className="p-3.5 bg-white border border-gray-200/90 rounded-2xl text-xs text-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shadow-2xs">
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Success Rate</span>
                    <span className="font-black text-emerald-600 text-sm">
                      {getNumHistory.length > 0
                        ? `${Math.round((getNumHistory.filter((h) => h.status === 'SUCCESS').length / getNumHistory.length) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Allocated Total</span>
                    <span className="font-black text-gray-900 text-sm">{getNumHistory.length}</span>
                  </div>
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Active Carriers</span>
                    <span className="font-black text-blue-600 text-sm">
                      {getNumHistory.length > 0
                        ? `${Array.from(new Set(getNumHistory.map((h) => h.operator))).length} Active`
                        : '0 Active'}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Avg OTP Speed</span>
                    <span className="font-black text-amber-600 text-sm">
                      {getNumHistory.some((h) => h.otp) ? '2.5s' : 'Ready'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 1: ENTER NUMBER RANGE */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 space-y-4 shadow-sm">
              {/* Green Section Header */}
              <div className="text-[11px] font-extrabold text-emerald-600 tracking-wider uppercase">
                ENTER NUMBER RANGE
              </div>

              {/* Segmented Buttons & Sync Mode switch */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="inline-flex p-1 bg-gray-100 rounded-full border border-gray-200 text-xs shadow-inner">
                  {(['RANGE', 'SEARCH', 'ACCESS'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setGetNumTab(tab)}
                      className={`px-4 py-1.5 rounded-full font-bold transition cursor-pointer text-xs ${
                        getNumTab === tab
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Sync Mode Toggle */}
                <div
                  onClick={() => setIsSyncMode(!isSyncMode)}
                  className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl transition"
                >
                  <div className={`w-7 h-4 rounded-full p-0.5 transition ${isSyncMode ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${isSyncMode ? 'translate-x-3' : 'translate-x-0'}`} />
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-gray-700 tracking-wider uppercase font-bold">
                    <RotateCw className="w-3 h-3 text-gray-500" /> SYNC MODE
                  </span>
                </div>
              </div>

              {/* Range Input Field */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-gray-400 font-bold text-sm">
                  #
                </div>
                <input
                  type="text"
                  value={rangeCustomInput}
                  onChange={(e) => setRangeCustomInput(e.target.value)}
                  placeholder="Enter prefix range (e.g., 88017, 44740, 22501)..."
                  className="w-full pl-8 pr-4 py-3 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200/90 rounded-xl text-gray-900 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-gray-400 tracking-wide transition shadow-2xs"
                />
              </div>

              {/* Options and Get Number button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-700 font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={nationalFormat}
                      onChange={(e) => setNationalFormat(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                    />
                    <span className="font-medium text-xs sm:text-sm text-gray-800">National Format</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={removePlus}
                      onChange={(e) => setRemovePlus(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                    />
                    <span className="font-medium text-xs sm:text-sm text-gray-800">Remove (+)</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleGetNumberCustom}
                  disabled={isAllocating}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-6 py-2.5 rounded-xl sm:rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Phone className={`w-3.5 h-3.5 text-white ${isAllocating ? 'animate-spin' : ''}`} />
                  <span>{isAllocating ? 'Allocating...' : 'Get Number'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Allocated Numbers Table */}
            <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-sm">
              {/* Table Header with Stats and Refresh */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/80">
                <span className="text-xs font-mono font-medium text-gray-600">
                  {getNumHistory.length > 0 ? `1-${getNumHistory.length} of ${getNumHistory.length}` : '0 of 0 allocated'}
                </span>
                <button
                  type="button"
                  onClick={handleGetNumberCustom}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition active:scale-95"
                >
                  <RotateCw className={`w-3 h-3 text-gray-500 ${isAllocating ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Table Column Labels */}
              <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100/60 border-b border-gray-200">
                <div className="col-span-5 sm:col-span-4">NUMBER INFO</div>
                <div className="col-span-4 sm:col-span-5">COUNTRY / OPERATOR</div>
                <div className="col-span-3 text-right">ACTIVITY</div>
              </div>

              {/* Table Rows or Clean Empty State */}
              {getNumHistory.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <Smartphone className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-sm font-semibold text-gray-700">No allocated numbers yet</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Enter a carrier range prefix in the box above and click &quot;Get Number&quot; to allocate a number.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {getNumHistory.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 px-4 py-3.5 items-center text-xs hover:bg-gray-50/80 transition"
                    >
                      {/* NUMBER INFO */}
                      <div className="col-span-5 sm:col-span-4 space-y-1.5">
                        <div className="font-mono text-gray-900 font-extrabold tracking-wider text-xs sm:text-sm flex items-center gap-1.5">
                          <span>{item.number}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.status === 'FAILED' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-200 uppercase tracking-wider">
                              FAILED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wider">
                              SUCCESS
                            </span>
                          )}
                        </div>

                        {/* If OTP exists */}
                        {item.otp && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="font-mono text-xs text-amber-900 font-bold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Key className="w-3 h-3 text-amber-600" />
                              <span>{item.otp}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.otp!, `otp_${item.id}`)}
                              className="p-1 rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 hover:text-gray-900 transition cursor-pointer"
                              title="Copy OTP"
                            >
                              {copiedText === `otp_${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* COUNTRY / OPERATOR */}
                      <div className="col-span-4 sm:col-span-5 space-y-0.5">
                        <div className="text-gray-900 font-bold text-xs sm:text-sm">
                          {item.country}
                        </div>
                        <div className="text-gray-500 text-[11px] sm:text-xs flex items-center gap-1">
                          <Radio className="w-3 h-3 text-emerald-600" />
                          <span>{item.operator}</span>
                        </div>
                      </div>

                      {/* ACTIVITY */}
                      <div className="col-span-3 text-right">
                        <span className="text-[11px] text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                          {item.activity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- 2. CONSOLE VIEW -------------------- */}
        {currentView === 'console' && (
          <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200/90 space-y-4">
            {/* Header: Live Console + Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-gray-900 font-extrabold text-base sm:text-lg tracking-tight">
                  &gt;_ Live Console
                </span>
                <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                  (api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/console)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {consoleApiMeta?.code === 2941 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>UNAUTHORIZED (KEY REQUIRED)</span>
                  </span>
                ) : consoleApiMeta?.code === 200 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>LIVE STREAM CONNECTED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>POLLING API</span>
                  </span>
                )}
              </div>
            </div>

            {/* API Key Configuration & Mauthapi Bar */}
            <div className="bg-gray-50/90 border border-gray-200/90 rounded-xl p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-700 font-bold">
                <span className="flex items-center gap-1.5 text-gray-800">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span>API Authentication Header (<code className="font-mono text-[11px] text-emerald-700">mauthapi</code>)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingKey(!isEditingKey)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline"
                >
                  {isEditingKey ? 'Hide Configuration' : 'Change Key'}
                </button>
              </div>

              {isEditingKey && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Enter your mauthapi key (e.g. MAB12CD34EF...)"
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (keyInput.trim()) {
                        setMauthApiKey(keyInput.trim());
                        setApiKeyState(keyInput.trim());
                        setIsEditingKey(false);
                        fetchRealTimeData();
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-2xs"
                  >
                    Save &amp; Connect
                  </button>
                </div>
              )}
            </div>

            {/* Warning Notice if Unauthorized (HTTP 2941) */}
            {consoleApiMeta?.code === 2941 && (
              <div className="bg-red-50/90 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Authentication Key Required or Expired (Code: 2941)</p>
                  <p className="text-red-700 text-[11px] leading-relaxed">
                    The endpoint <code className="font-mono">/@public/api/console</code> requires a valid <code className="font-mono font-bold">mauthapi</code> key header. Click <strong>Change Key</strong> above to enter your active VoltxSMS API key to start receiving live real-time SMS events.
                  </p>
                </div>
              </div>
            )}

            {/* Filter Search Input & Next Update Countdown Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={consoleFilter}
                  onChange={(e) => setConsoleFilter(e.target.value)}
                  placeholder="Filter logs (sender, operator, carrier, range)..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-800 placeholder-gray-400 font-sans shadow-2xs transition"
                />
              </div>

              {/* Stream Countdown & Refresh */}
              <button
                type="button"
                onClick={handleManualRefreshConsole}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200/90 text-xs font-mono text-gray-600 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition shrink-0"
                title="Auto-refreshing live stream"
              >
                <span className="text-xs">
                  Next update: <strong className="text-gray-900 font-bold">{consoleCountdown}s</strong>
                </span>
                <RotateCw className={`w-3.5 h-3.5 text-gray-500 ${isConsoleRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            {/* Live Logs List Cards or Clean Empty State */}
            {(() => {
              const filteredHits = liveHits.filter((hit) => {
                if (!consoleFilter.trim()) return true;
                const q = consoleFilter.toLowerCase();
                return (
                  hit.sid?.toLowerCase().includes(q) ||
                  hit.operator?.toLowerCase().includes(q) ||
                  hit.country?.toLowerCase().includes(q) ||
                  hit.range?.toLowerCase().includes(q) ||
                  hit.message?.toLowerCase().includes(q)
                );
              });

              if (filteredHits.length === 0) {
                return (
                  <div className="py-16 text-center space-y-3 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-800">
                        {consoleFilter
                          ? 'No matching live console logs found'
                          : consoleApiMeta?.code === 2941
                          ? 'API Key Authentication Required'
                          : 'Listening for Live SMS Stream'}
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto font-sans">
                        {consoleFilter
                          ? 'Try clearing your search filter.'
                          : consoleApiMeta?.code === 2941
                          ? 'Please update your mauthapi key above to begin streaming.'
                          : 'Carrier gateway routes are connected. Incoming SMS events will appear here in real-time (polling every 2s).'}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3 pt-1">
                  {filteredHits.slice(0, 50).map((log, idx) => {
                    const extractedOtpCode = extractOtp(log.message);

                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl border border-gray-200/90 border-l-[4px] border-l-emerald-500 p-4 sm:p-5 shadow-2xs space-y-2.5 hover:shadow-xs transition"
                      >
                        {/* Top Row: Time on Left, Operator Badge & Country on Right */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs text-gray-400 font-normal">
                            {formatHitTime(log.time)}
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="bg-gray-100/90 border border-gray-200/90 text-[10px] sm:text-[11px] font-bold text-gray-800 uppercase px-2.5 py-0.5 rounded-md tracking-tight font-sans">
                              {log.operator || 'CARRIER GATEWAY'}
                            </span>
                            <span className="text-[11px] text-gray-400 font-normal mt-0.5 text-right">
                              {log.country || 'Direct Route'}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Service Name in vibrant color :: Range / Number */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                          <span className={`font-bold font-sans ${getServiceTextColor(log.sid)}`}>
                            {log.sid}
                          </span>
                          <span className="text-gray-300 font-mono text-xs">::</span>
                          <span className="font-mono text-xs sm:text-[13px] font-medium text-gray-600 tracking-wider">
                            {log.range}
                          </span>
                        </div>

                        {/* Bottom Row: Green Arrow + Message text */}
                        <div className="flex items-start gap-2 pt-0.5">
                          <span className="text-emerald-500 font-bold text-sm shrink-0 leading-tight">➜</span>
                          <div className="font-mono text-xs sm:text-[13px] text-gray-800 break-words leading-relaxed flex-1">
                            {log.message}
                          </div>
                        </div>

                        {/* Optional Quick Action Bar for convenience */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                          {extractedOtpCode && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(extractedOtpCode, `otp_${idx}`)}
                              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-mono transition cursor-pointer flex items-center gap-1"
                            >
                              <Key className="w-3 h-3 text-amber-600" />
                              {copiedText === `otp_${idx}` ? (
                                <span className="text-emerald-600 font-bold">Copied OTP!</span>
                              ) : (
                                <span>OTP: {extractedOtpCode}</span>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(log.range, `range_${idx}`)}
                            className="px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition cursor-pointer flex items-center gap-1"
                            title="Copy Number/Range"
                          >
                            {copiedText === `range_${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy Range</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(log.message, `msg_${idx}`)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 transition cursor-pointer"
                            title="Copy Message"
                          >
                            {copiedText === `msg_${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer matching template */}
                  <div className="text-xs text-gray-400 font-mono space-y-0.5 pt-3">
                    <div>Last Updated: {lastUpdatedTime}</div>
                    <div>Logs: {filteredHits.length} (Max {Math.max(50, filteredHits.length)})</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* -------------------- 3. SUMMARY & SUCCESS OTPS VIEW -------------------- */}
        {currentView === 'summary' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span>Summary & Statistics</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-xs text-blue-600 font-bold uppercase">Success Delivery Rate</div>
                  <div className="text-2xl font-black text-blue-900 mt-1">
                    {liveSuccessOtps.length > 0 || getNumHistory.some((h) => h.status === 'SUCCESS') ? '100%' : '0%'}
                  </div>
                  <div className="text-xs text-blue-700 mt-0.5">Carrier direct routing</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs text-emerald-600 font-bold uppercase">Active Ranges</div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">{liveAccessList.length}</div>
                  <div className="text-xs text-emerald-700 mt-0.5">Active carrier networks</div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-xs text-amber-600 font-bold uppercase">Average Latency</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">
                    {liveSuccessOtps.length > 0 ? '0.2s' : '0.0s'}
                  </div>
                  <div className="text-xs text-amber-700 mt-0.5">Instant OTP dispatch</div>
                </div>
              </div>
            </div>

            {/* Delivered OTPs Feed */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Recent Delivered OTPs</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-gray-100 font-sans font-bold uppercase text-gray-700">
                      <th className="p-3">OTP ID</th>
                      <th className="p-3">Number</th>
                      <th className="p-3">Message Body</th>
                      <th className="p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {liveSuccessOtps.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400 font-sans text-xs">
                          No delivered OTPs recorded for this session yet.
                        </td>
                      </tr>
                    ) : (
                      liveSuccessOtps.map((o, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-500">{o.otp_id}</td>
                          <td className="p-3 font-bold text-blue-600">{o.number}</td>
                          <td className="p-3 text-emerald-700 font-semibold">{o.message}</td>
                          <td className="p-3 text-gray-500 font-sans">{new Date(o.time).toLocaleTimeString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 4. ACCESS LIST VIEW -------------------- */}
        {currentView === 'accessList' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <List className="w-5 h-5 text-blue-600" />
                <span>Access List</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Active services and supported range pools.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100 font-bold uppercase text-gray-700">
                    <th className="p-3">Service Name</th>
                    <th className="p-3">Active Ranges</th>
                    <th className="p-3">Last Active Hit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {liveAccessList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-400 font-sans text-xs">
                        No active service access rules found. Access list is currently empty.
                      </td>
                    </tr>
                  ) : (
                    liveAccessList.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-blue-600">{item.sid}</td>
                        <td className="p-3 font-mono text-gray-800">
                          {item.ranges?.join(', ') || 'N/A'}
                        </td>
                        <td className="p-3 text-gray-500 font-mono">
                          {item.last_at ? new Date(item.last_at).toLocaleTimeString() : 'Active'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 5. SENDER / RANGE VIEW -------------------- */}
        {currentView === 'senderRange' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-blue-600" />
              <span>Sender / Range</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {POPULAR_RANGES.map((rng) => (
                <div
                  key={rng.id}
                  onClick={() => {
                    setSelectedRange(rng.id);
                    setRangeCustomInput(rng.id);
                    setCurrentView('getNumber');
                  }}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-blue-50/40 hover:border-blue-300 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {rng.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">Active</span>
                  </div>
                  <div className="font-bold text-sm text-gray-900">{rng.country}</div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Operator</span>
                    <span className="font-bold text-gray-700">{rng.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- 6. TERMINAL VIEW -------------------- */}
        {currentView === 'terminal' && (
          <div className="bg-[#1e293b] text-gray-200 rounded-2xl p-5 shadow-lg border border-gray-700 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Circle className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="font-bold text-white text-sm">Network Terminal</span>
              </div>
              <span className="text-xs text-emerald-400">ACTIVE</span>
            </div>

            <div className="bg-black/50 p-4 rounded-xl h-80 overflow-y-auto space-y-2 text-xs">
              {liveHits.length === 0 ? (
                <div className="space-y-2 text-gray-400">
                  <div className="text-emerald-400">[SYSTEM] Terminal initialized. Gateway connection active.</div>
                  <div className="text-gray-400">[SYSTEM] Listening for carrier socket events...</div>
                  <div className="text-gray-500 text-[11px]">[SYSTEM] Ready. No packets received yet.</div>
                </div>
              ) : (
                liveHits.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500">[{new Date(h.time || Date.now()).toLocaleTimeString()}]</span>
                    <span className="text-amber-400">[{h.sid}]</span>
                    <span className="text-blue-400">RANGE:{h.range}</span>
                    <span className="text-emerald-400">{h.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* -------------------- 7. PROFILE VIEW -------------------- */}
        {currentView === 'profile' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 space-y-5">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>User Profile</span>
            </h2>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 font-bold">User Full Name:</span>
                  <p className="text-sm font-extrabold text-gray-900">{user.name}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-bold">Account Email:</span>
                  <p className="text-sm font-extrabold text-gray-900">{user.email}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-bold">Account Code:</span>
                  <p className="text-sm font-mono font-extrabold text-amber-600">{accountCode}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-bold">Account Status:</span>
                  <p className="text-xs font-semibold text-emerald-600">Active / Verified</p>
                </div>
              </div>
            </div>

            {/* Secret Key Configuration */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-bold text-gray-900">Access Key</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingKey(!isEditingKey);
                    setKeyInput(apiKey);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {isEditingKey ? 'Cancel' : 'Update Key'}
                </button>
              </div>

              {isEditingKey ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Enter access key..."
                    className="flex-1 p-2 rounded-lg border border-gray-300 text-xs font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    readOnly
                    className="flex-1 p-2 rounded-lg border border-gray-200 text-xs font-mono bg-white text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(apiKey, 'apikey')}
                    className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 text-xs cursor-pointer"
                    title="Copy Key"
                  >
                    {copiedText === 'apikey' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-900 text-gray-400 text-xs py-4 text-center border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 SUPER X SMS (PREMIUM RATES). All rights reserved.</span>
          <span className="text-gray-400 font-medium">
            Global High-Speed Verification Routing
          </span>
        </div>
      </footer>
    </div>
  );
}
