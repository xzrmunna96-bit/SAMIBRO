import React, { useState, useEffect } from 'react';
import {
  Bot,
  Shield,
  Key,
  MessageSquare,
  Sparkles,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Zap,
  Globe,
  Radio,
  Send,
  ExternalLink,
  Copy,
  Phone,
  Hash,
  Server,
  Activity,
  Layers,
} from 'lucide-react';
import {
  fetchBotHostingConfig,
  saveBotHostingConfig,
  pingTelegramBot,
  fetchManualRanges,
  fetchManualNumbers,
  uploadManualNumbers,
  testSendManualOtp,
  deleteManualRange,
  clearAllManualNumbers,
  BotHostingConfig,
  ManualRangeSummary,
  ManualNumberRecord,
  DEFAULT_BOT_CONFIG,
} from '../services/manualNumberService';
import { GLOBAL_COUNTRIES_LIST } from '../services/countryHelper';
import { CountryFlag } from './CountryFlags';

interface BotManagementViewProps {
  onToast: (msg: string) => void;
}

export const BotManagementView: React.FC<BotManagementViewProps> = ({ onToast }) => {
  // 1. Bot Connection States
  const [botConfig, setBotConfig] = useState<BotHostingConfig>(DEFAULT_BOT_CONFIG);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [botPingStatus, setBotPingStatus] = useState<{
    ok: boolean;
    username?: string;
    msg?: string;
  } | null>(null);

  // 2. Manual Upload States
  const [selectedCountryName, setSelectedCountryName] = useState('Bangladesh');
  const [selectedCountryFlag, setSelectedCountryFlag] = useState('🇧🇩');
  const [selectedDialCode, setSelectedDialCode] = useState('+880');
  const [numbersInputText, setNumbersInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 3. Pool & Ranges State
  const [manualRanges, setManualRanges] = useState<ManualRangeSummary[]>([]);
  const [manualNumbers, setManualNumbers] = useState<ManualNumberRecord[]>([]);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [isLoadingPool, setIsLoadingPool] = useState(false);

  // 4. Test OTP Dispatcher State
  const [testNumber, setTestNumber] = useState('');
  const [testOtpCode, setTestOtpCode] = useState('852941');
  const [testService, setTestService] = useState('WhatsApp');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Load initial data
  useEffect(() => {
    loadConfig();
    loadPoolData();
  }, []);

  const loadConfig = async () => {
    const cfg = await fetchBotHostingConfig();
    setBotConfig(cfg);
  };

  const loadPoolData = async () => {
    setIsLoadingPool(true);
    try {
      const ranges = await fetchManualRanges();
      setManualRanges(ranges);
      const { total, numbers } = await fetchManualNumbers(50, 0);
      setTotalNumbers(total);
      setManualNumbers(numbers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPool(false);
    }
  };

  // Country Change handler
  const handleCountryChange = (countryName: string) => {
    setSelectedCountryName(countryName);
    const matched = GLOBAL_COUNTRIES_LIST.find(
      (c) => c.name.toLowerCase() === countryName.toLowerCase()
    );
    if (matched) {
      setSelectedCountryFlag(matched.flag);
      setSelectedDialCode(matched.dialCode);
    }
  };

  // Ping Bot handler
  const handlePingBot = async () => {
    setIsPinging(true);
    try {
      const res = await pingTelegramBot(botConfig.botToken);
      if (res.success) {
        setBotPingStatus({
          ok: true,
          username: res.botInfo?.username,
          msg: res.message,
        });
        onToast(`Bot Online: @${res.botInfo?.username || 'Bot'}`);
      } else {
        setBotPingStatus({
          ok: false,
          msg: res.message,
        });
        onToast(`Connection Failed: ${res.message}`);
      }
    } finally {
      setIsPinging(false);
    }
  };

  // Save Bot Config handler
  const handleSaveBotConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await saveBotHostingConfig(botConfig);
      if (res.success) {
        onToast(res.message);
        handlePingBot();
      } else {
        onToast(res.message);
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle File Input (.txt file upload)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      setNumbersInputText(text);
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      onToast(`Loaded ${lines.length.toLocaleString()} numbers from ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Submit Manual Numbers to Pool
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numbersInputText.trim()) {
      onToast('অনুগ্রহ করে নাম্বারের তালিকা বা ফাইল প্রদান করুন!');
      return;
    }

    setIsUploading(true);
    try {
      const res = await uploadManualNumbers({
        country: selectedCountryName,
        flag: selectedCountryFlag,
        dialCode: selectedDialCode,
        numbersText: numbersInputText,
      });

      if (res.success) {
        onToast(`🎉 ${res.addedCount.toLocaleString()} টি নাম্বার সফলভাবে যুক্ত হয়েছে!`);
        setNumbersInputText('');
        setFileName(null);
        await loadPoolData();
      } else {
        onToast(res.message || 'নাম্বার আপলোড করতে সমস্যা হয়েছে।');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Test OTP
  const handleSendTestOtp = async () => {
    if (!testNumber) {
      onToast('Please enter a phone number to test OTP');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await testSendManualOtp({
        number: testNumber,
        otpCode: testOtpCode || String(Math.floor(100000 + Math.random() * 900000)),
        service: testService,
      });
      if (res.success) {
        onToast('✅ Live OTP Dispatched to Website & Telegram Group!');
      } else {
        onToast(res.message);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Delete specific range
  const handleDeleteRange = async (prefix: string) => {
    if (!window.confirm(`Are you sure you want to delete range ${prefix} and its numbers?`)) {
      return;
    }
    const res = await deleteManualRange(prefix);
    onToast(res.message);
    loadPoolData();
  };

  // Clear all numbers
  const handleClearPool = async () => {
    if (!window.confirm('⚠️ WARNING: Delete ALL manual numbers from database? This cannot be undone.')) {
      return;
    }
    const res = await clearAllManualNumbers();
    onToast(res.message);
    loadPoolData();
  };

  // Copy text helper
  const copyToClipboard = (txt: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      onToast(`${label} copied to clipboard!`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl text-indigo-400 shrink-0">
              <Bot className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Bot Management (বট ম্যানেজমেন্ট)
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Auto-Hosted Realtime Bot
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Configure your Telegram Control Bot credentials, host automatically on server,
                upload manual country numbers (up to 10,000 files), and route live OTPs to
                website and Telegram group.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handlePingBot}
              disabled={isPinging}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'Checking Bot...' : 'Ping / Verify Bot'}</span>
            </button>
            <a
              href={botConfig.otpGroupUrl || 'https://t.me/trstyyop'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>OTP Group</span>
            </a>
          </div>
        </div>

        {/* Live Status indicator */}
        {botPingStatus && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 ${
              botPingStatus.ok
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {botPingStatus.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{botPingStatus.msg}</span>
            </div>
            {botPingStatus.username && (
              <a
                href={`https://t.me/${botPingStatus.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-sky-300 hover:text-white"
              >
                @{botPingStatus.username}
              </a>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: BOT CONNECTION & CREDENTIALS BOXES ("খাপখাপ" CARDS)            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Box A: Bot Credentials & Server Hosting (Cols 7) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-sm sm:text-base">
              <Key className="w-4 h-4" />
              <span>Telegram Bot Connection Credentials (বট কনফিগারেশন)</span>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              Admin Protected
            </span>
          </div>

          <form onSubmit={handleSaveBotConfig} className="space-y-4">
            {/* 1. Bot Token Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bot Token (বট টোকেন)</span>
                </label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(botConfig.botToken, 'Bot Token')}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <input
                type="text"
                value={botConfig.botToken}
                onChange={(e) => setBotConfig({ ...botConfig, botToken: e.target.value.trim() })}
                placeholder="8831851994:AAEjiZhHWDl97RABfkzOuk3NbI8291dS1b8"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />
              <p className="text-[11px] text-slate-400">
                এই বট টোকেন দিয়ে স্বয়ংক্রিয়ভাবে নোড সার্ভারে ব্যাকগ্রাউন্ড বট হোস্টিং চলবে।
              </p>
            </div>

            {/* Grid for Admin ID & Chat ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 2. Admin ID Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin ID (অ্যাডমিন আইডি)</span>
                </label>
                <input
                  type="text"
                  value={botConfig.adminId}
                  onChange={(e) => setBotConfig({ ...botConfig, adminId: e.target.value.trim() })}
                  placeholder="7084317713"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 transition shadow-inner"
                />
                <p className="text-[10px] text-slate-400">
                  শুধুমাত্র এই আইডি দিয়ে বটে <b>📁 File</b> মেনু এবং এডমিন এক্সেস পাওয়া যাবে।
                </p>
              </div>

              {/* 3. Telegram Chat ID Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-sky-400" />
                  <span>Chat ID / Group ID (চ্যাট আইডি)</span>
                </label>
                <input
                  type="text"
                  value={botConfig.chatId}
                  onChange={(e) => setBotConfig({ ...botConfig, chatId: e.target.value.trim() })}
                  placeholder="-1003877961573"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500 transition shadow-inner"
                />
                <p className="text-[10px] text-slate-400">
                  গ্রুপে নোটিফিকেশন ও ওটিপি ফরোয়ার্ডের জন্য ব্যবহৃত চ্যাট আইডি।
                </p>
              </div>
            </div>

            {/* 4. OTP Group Link Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>OTP Group Link (ওটিপি গ্রুপ লিংক)</span>
              </label>
              <input
                type="text"
                value={botConfig.otpGroupUrl}
                onChange={(e) => setBotConfig({ ...botConfig, otpGroupUrl: e.target.value.trim() })}
                placeholder="https://t.me/trstyyop"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-500 transition shadow-inner"
              />
            </div>

            {/* Bot Hosting State Switch */}
            <div className="pt-2 flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <span className="text-xs font-extrabold text-white block">
                    Active Server Hosting Engine
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Bot is running directly on Express container runtime.
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={botConfig.activePolling}
                  onChange={(e) =>
                    setBotConfig({ ...botConfig, activePolling: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-1 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingConfig}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSavingConfig ? 'Saving & Restarting...' : 'Save & Host Bot (সেভ ও বট চালু করুন)'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Box B: Telegram Bot Interactive Menu Preview (Cols 5) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-extrabold text-sm sm:text-base">
                <MessageSquare className="w-4 h-4" />
                <span>Bot Menu Live Layout (বটের মেনুবার)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/30 font-mono">
                Real-Time
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              আপনার দেওয়া বট টোকেনের সাথে বটটি সংযুক্ত হওয়া মাত্রই ব্যবহারকারীদের জন্য
              নিচের মতো মেনুবার চালু হবে:
            </p>

            {/* Mock Telegram Bot Interface */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-xs">
                  🤖
                </div>
                <div>
                  <div className="text-white font-bold">SUPER X SMS Bot</div>
                  <div className="text-[10px] text-emerald-400">● bot online</div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300 text-[11px] leading-relaxed">
                ⚡ <b>SUPER X SMS — সিস্টেম কন্ট্রোল বট</b><br />
                স্বাগতম! নিচের অপশনগুলো থেকে আপনার প্রয়োজন সিলেক্ট করুন:
              </div>

              {/* Bot Buttons requested by user */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-bold text-center text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <Phone className="w-3.5 h-3.5" />
                    <span>📱 Get Number</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-600/30 border border-amber-500/50 text-amber-300 font-bold text-center text-xs flex items-center justify-center gap-1.5 shadow-sm">
                    <FileText className="w-3.5 h-3.5" />
                    <span>📁 File (Admin)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-800 text-slate-300 text-center font-bold">
                    📊 Stats
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800 text-slate-300 text-center font-bold">
                    🔑 Admin Menu
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>নিরাপত্তা নিয়মাবলী:</span>
            </div>
            <p>
              ১. সাধারণ ইউজার <b>📁 File</b> এ চাপলে এক্সেস ডিনাইড হবে।<br />
              ২. শুধুমাত্র Admin ID <code>{botConfig.adminId}</code> ফাইল আপলোড করতে পারবে।
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: MANUAL NUMBER & 10,000 FILE UPLOADER                           */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm sm:text-base">
            <Upload className="w-4 h-4" />
            <span>
              Manual Country Numbers & File Uploader (ম্যানুয়াল নাম্বার ও ফাইল আপলোডার)
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Directly syncs with Website & Telegram Bot
          </span>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Country Selector with Flag */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Select Country (দেশ ও জাতীয় পতাকা)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-950 border border-slate-700 rounded-xl shrink-0 flex items-center justify-center">
                  <CountryFlag countryCode={selectedCountryName} size="lg" />
                </span>
                <select
                  value={selectedCountryName}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  {GLOBAL_COUNTRIES_LIST.map((c) => (
                    <option key={c.iso} value={c.name}>
                      {c.flag} {c.name} ({c.dialCode})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                দেশের নাম দিলে স্বয়ংক্রিয়ভাবে পতাকা <b>{selectedCountryFlag}</b> ও কোড{' '}
                <b>{selectedDialCode}</b> সেট হবে।
              </p>
            </div>

            {/* File (.txt) Picker supporting 5k/10k numbers */}
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload .txt File (৫,০০০ বা ১০,০০০ নাম্বারের ফাইল)</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 px-4 py-2.5 bg-slate-950 border border-dashed border-slate-700 hover:border-amber-500 rounded-xl text-xs text-slate-300 cursor-pointer flex items-center justify-between transition group">
                  <span className="truncate">
                    {fileName ? `📄 ${fileName}` : 'Choose .txt file (5,000 / 10,000 numbers)...'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-amber-300 font-bold group-hover:bg-amber-950">
                    Browse
                  </span>
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {fileName && (
                  <button
                    type="button"
                    onClick={() => {
                      setFileName(null);
                      setNumbersInputText('');
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                ফাইল নির্বাচন করলে স্বয়ংক্রিয়ভাবে সব নাম্বার নিচে লোড হয়ে যাবে।
              </p>
            </div>
          </div>

          {/* Numbers Text Input / Paste Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-sky-400" />
                <span>Paste Numbers or View File Content (প্রতি লাইনে একটি নাম্বার)</span>
              </label>
              <span className="text-[11px] text-emerald-400 font-mono">
                {numbersInputText
                  ? `${numbersInputText.split(/\r?\n/).filter((l) => l.trim()).length.toLocaleString()} numbers detected`
                  : '0 numbers'}
              </span>
            </div>
            <textarea
              rows={5}
              value={numbersInputText}
              onChange={(e) => setNumbersInputText(e.target.value)}
              placeholder="8801712345678&#10;8801712345679&#10;8801712345680&#10;8801812345681..."
              className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 transition resize-y leading-relaxed"
            />
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
              <span>
                🔒 <b>রিয়েল-টাইম মাস্কিং:</b> প্রতিটি নাম্বারের প্রথম ৫টি সংখ্যা রেঞ্জ (যেমন:{' '}
                <code className="text-emerald-300">88017XXXXXX</code>) হিসেবে দৃশ্যমান হবে।
              </span>
              <span className="text-slate-400">Sequential real-time delivery</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isUploading || !numbersInputText.trim()}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <Upload className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
              <span>
                {isUploading
                  ? 'Processing & Deploying...'
                  : 'Upload & Deploy to Website & Bot (আপলোড ও যুক্ত করুন)'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: ACTIVE MANUAL RANGES & STATS TABLE                             */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Active Manual Ranges in Database (সক্রিয় রেঞ্জ ও নাম্বার পুল)
              </h3>
              <p className="text-xs text-slate-400">
                Total {totalNumbers.toLocaleString()} numbers stored across{' '}
                {manualRanges.length} ranges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadPoolData}
              disabled={isLoadingPool}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingPool ? 'animate-spin' : ''}`} />
              <span>Refresh Pool</span>
            </button>
            {manualRanges.length > 0 && (
              <button
                type="button"
                onClick={handleClearPool}
                className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/40 text-rose-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Pool</span>
              </button>
            )}
          </div>
        </div>

        {/* Ranges summary badges */}
        {manualRanges.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
            <p className="text-xs text-slate-400">
              কোনো ম্যানুয়াল নাম্বার রেঞ্জ আপলোড করা হয়নি। উপরের ফাইল আপলোডার বা টেলিগ্রাম বট থেকে
              ফাইল পাঠান।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {manualRanges.map((rng) => (
              <div
                key={rng.rangePrefix}
                className="p-4 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl space-y-2.5 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{rng.flag}</span>
                    <div>
                      <span className="font-extrabold text-sm text-white block">
                        {rng.country}
                      </span>
                      <span className="font-mono text-xs text-emerald-400 font-bold">
                        {rng.maskedRange}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRange(rng.rangePrefix)}
                    title="Delete range"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 font-mono">
                  <span className="text-slate-400">Available:</span>
                  <span className="font-bold text-emerald-300">
                    {rng.availableCount.toLocaleString()} / {rng.totalCount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(rng.rangePrefix, 'Range Code')}
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Range ({rng.rangePrefix})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: LIVE OTP TEST DISPATCHER                                       */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm sm:text-base">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Test Live OTP & Telegram Dispatcher (টেস্ট ওটিপি মারুন)</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">
            Routes to Website & Telegram Group
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          কোনো নাম্বারে ওটিপি মারলে তা সাথে সাথে আমাদের ওয়েবসাইটের <b>Live Test SMS</b> ভিউতে যুক্ত হবে
          এবং একই সাথে টেলিগ্রাম ওটিপি গ্রুপে (<code>{botConfig.otpGroupUrl}</code>) পোস্ট হবে।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number</label>
            <input
              type="text"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value.trim())}
              placeholder="e.g. 8801712345678"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Service</label>
            <select
              value={testService}
              onChange={(e) => setTestService(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-rose-500"
            >
              <option value="WhatsApp">WhatsApp</option>
              <option value="Telegram">Telegram</option>
              <option value="Google">Google</option>
              <option value="Facebook">Facebook</option>
              <option value="bKash">bKash</option>
              <option value="IMO">IMO</option>
              <option value="TikTok">TikTok</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">OTP Code</label>
            <input
              type="text"
              value={testOtpCode}
              onChange={(e) => setTestOtpCode(e.target.value.trim())}
              placeholder="6-digit code"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSendTestOtp}
              disabled={isSendingOtp || !testNumber}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
              <span>{isSendingOtp ? 'Sending...' : 'Fire Live OTP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
