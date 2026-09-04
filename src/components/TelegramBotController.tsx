import React, { useState, useEffect } from 'react';
import {
  Send,
  Bot,
  Shield,
  KeyRound,
  Users,
  MessageSquare,
  Sparkles,
  Phone,
  Search,
  Gift,
  Wallet,
  Globe,
  Radio,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  RotateCw,
  Zap,
  Mic,
  Paperclip,
  LayoutGrid,
  Settings,
  UserCheck,
  UserPlus,
  SendHorizontal,
} from 'lucide-react';

interface TelegramBotControllerProps {
  userRole?: string;
  userEmail?: string;
  onRefreshData?: () => void;
}

export const TelegramBotController: React.FC<TelegramBotControllerProps> = ({
  userRole = 'admin',
  userEmail = 'xzrmunna96@gmail.com',
  onRefreshData,
}) => {
  // Config state
  const [botToken, setBotToken] = useState('8631714331:AAEd33AVl9oqI-HdGW7jtxE37y4N4nH4ox4');
  const [adminId, setAdminId] = useState('7084317713');
  const [userId, setUserId] = useState('8631714331');

  // Interactive Bot Chat State
  const [activeResponse, setActiveResponse] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sub-Admin Delegation State
  const [subAdminEmail, setSubAdminEmail] = useState('');
  const [subAdminPassword, setSubAdminPassword] = useState('');
  const [subAdminStatus, setSubAdminStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Direct User Messaging / Broadcast State
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 2FA State
  const [twoFaCode, setTwoFaCode] = useState<string | null>(null);
  const [twoFaExpiresIn, setTwoFaExpiresIn] = useState<number>(0);

  // Tabs for Admin Settings vs Bot Emulator
  const [activeTab, setActiveTab] = useState<'BOT_KEYBOARD' | 'ADMIN_SETTINGS' | 'BROADCAST'>('BOT_KEYBOARD');

  // Load config on mount
  useEffect(() => {
    fetch('/api/telegram/control-config')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.config) {
          if (json.config.botToken) setBotToken(json.config.botToken);
          if (json.config.adminId) setAdminId(json.config.adminId);
          if (json.config.userId) setUserId(json.config.userId);
        }
      })
      .catch(() => {});
  }, []);

  // 2FA Timer countdown
  useEffect(() => {
    if (!twoFaExpiresIn) return;
    const interval = setInterval(() => {
      setTwoFaExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTwoFaCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [twoFaExpiresIn]);

  // Execute Command to Telegram Control Engine
  const handleExecuteCommand = async (commandText: string) => {
    setIsLoading(true);
    setLastCommand(commandText);
    try {
      const res = await fetch('/api/telegram/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commandText,
          senderId: adminId,
          senderName: userEmail || 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success && data.responseText) {
        setActiveResponse(data.responseText);
      } else {
        setActiveResponse('<b>⚠️ Connection Warning:</b> Could not process command directly.');
      }
    } catch (err: any) {
      setActiveResponse(`<b>❌ Error:</b> ${err?.message || 'Server error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate 2FA Code
  const handleGenerate2FA = async () => {
    try {
      const res = await fetch('/api/telegram/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: userRole }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setTwoFaCode(data.code);
        setTwoFaExpiresIn(300); // 5 minutes
        handleExecuteCommand('🔑 2FA Code');
      }
    } catch {}
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/telegram/control-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, adminId, userId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Telegram Control Bot config saved successfully!');
      }
    } catch {
      alert('Failed to save config');
    }
  };

  // Sub-Admin Delegation
  const handleGrantSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAdminEmail) return;
    setSubAdminStatus(null);

    try {
      const res = await fetch('/api/admin/subadmins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: subAdminEmail.trim(),
          password: subAdminPassword.trim() || '123456',
          permissions: {
            canAccessGetNumber: true,
            canAccessConsole: true,
            canAccessSummary: true,
            canAccess2oo9: true,
            canChat: true,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubAdminStatus({
          type: 'success',
          msg: `Sub-Admin privilege granted to ${subAdminEmail}! Password set and synced real-time with website & Telegram.`,
        });
        setSubAdminEmail('');
        setSubAdminPassword('');
        if (onRefreshData) onRefreshData();
      } else {
        setSubAdminStatus({ type: 'error', msg: data.message || 'Failed to grant Sub-Admin' });
      }
    } catch (err: any) {
      setSubAdminStatus({ type: 'error', msg: err?.message || 'Server connection error' });
    }
  };

  // Dispatch Broadcast Message
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastStatus(null);

    try {
      const res = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserEmail: broadcastTarget,
          message: broadcastMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastStatus({
          type: 'success',
          msg: `Broadcast message sent to Telegram bot channel & active user sessions!`,
        });
        setBroadcastMessage('');
      } else {
        setBroadcastStatus({ type: 'error', msg: data.error || 'Failed to broadcast' });
      }
    } catch (err: any) {
      setBroadcastStatus({ type: 'error', msg: err?.message || 'Server error' });
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 bg-slate-950 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl text-slate-100 font-sans">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 border-b border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-2xl shadow-lg shadow-sky-500/10">
            <Bot className="w-6 h-6 text-sky-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-white">
                SUPER X Telegram Control Bot
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                Bot Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time Database Synchronization via Telegram Bot API
            </p>
          </div>
        </div>

        {/* Header Tabs */}
        <div className="flex items-center bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('BOT_KEYBOARD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'BOT_KEYBOARD'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Bot Keyboard
          </button>
          <button
            onClick={() => setActiveTab('ADMIN_SETTINGS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ADMIN_SETTINGS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Admin Config
          </button>
          <button
            onClick={() => setActiveTab('BROADCAST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'BROADCAST'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            User Message
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 bg-slate-950">
        {/* TAB 1: TELEGRAM BOT KEYBOARD LAYOUT MATCHING SCREENSHOT EXACTLY */}
        {activeTab === 'BOT_KEYBOARD' && (
          <div className="flex flex-col gap-5">
            {/* Mock Telegram Header Input Bar matching screenshot */}
            <div className="bg-slate-900 border border-slate-800 rounded-full p-2 px-4 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3 flex-1">
                <button className="p-2 rounded-full bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors">
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 flex-1 text-slate-400 text-sm">
                  <span className="text-slate-500 font-medium">Message</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="p-1.5 hover:text-sky-400 transition-colors">
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:text-sky-400 transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-2 bg-sky-500 text-white rounded-full shadow-md shadow-sky-500/30 hover:scale-105 transition-transform">
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Custom Telegram Reply Keyboard Buttons Container matching screenshot */}
            <div className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col gap-3">
              {/* Row 1: Get Number (Blue) | Search Number (Green) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleExecuteCommand('📞 Get Number')}
                  className="group relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-sky-500/25 border border-sky-300/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <Phone className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                  <span>Get Number</span>
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => handleExecuteCommand('🔎 Search Number')}
                  className="group relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/25 border border-emerald-300/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <Search className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                  <span>Search Number</span>
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Row 2: Refer (Green) | Wallet (Blue) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleExecuteCommand('💸 Refer')}
                  className="group relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/25 border border-emerald-300/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <Gift className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                  <span>Refer</span>
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => handleExecuteCommand('💳 Wallet')}
                  className="group relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-sky-500/25 border border-sky-300/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <Wallet className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                  <span>Wallet</span>
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Row 3: Add Checker (Blue) | Live Traffic (Green) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleExecuteCommand('💬 Add Checker')}
                  className="group relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-sky-500/25 border border-sky-300/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <MessageSquare className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                  <span>Add Checker</span>
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => handleExecuteCommand('🟢 Live Traffic')}
                  className="group relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/25 border border-emerald-300/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                >
                  <Radio className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                  <span>Live Traffic</span>
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Row 4: 🔑 2FA Code (Full Width Sky Blue) */}
              <div>
                <button
                  onClick={handleGenerate2FA}
                  className="group relative w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600 text-white font-black text-base sm:text-lg shadow-xl shadow-sky-500/30 border border-sky-300/40 hover:scale-[1.01] active:scale-95 transition-all duration-200"
                >
                  <KeyRound className="w-6 h-6 text-yellow-300 group-hover:rotate-45 transition-transform" />
                  <span>2FA Code</span>
                  {twoFaExpiresIn > 0 && (
                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-black/30 text-sky-200 border border-white/20">
                      {twoFaExpiresIn}s left
                    </span>
                  )}
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>

            {/* Interactive Bot Response Console */}
            <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-4 min-h-[160px] relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live Telegram Bot Output Stream
                  </span>
                </div>
                {lastCommand && (
                  <span className="text-xs font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                    Executed: {lastCommand}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                  <RotateCw className="w-6 h-6 animate-spin text-sky-400" />
                  <p className="text-xs">Communicating with Telegram Bot Engine...</p>
                </div>
              ) : activeResponse ? (
                <div
                  className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2 font-sans selection:bg-sky-500 selection:text-white"
                  dangerouslySetInnerHTML={{ __html: activeResponse }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-2">
                  <Bot className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-center">
                    Click any button above to test real-time bot command responses.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ADMIN BOT & DELEGATION SETTINGS */}
        {activeTab === 'ADMIN_SETTINGS' && (
          <div className="flex flex-col gap-6">
            {/* Sub-Admin Delegation Section */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4 border-b border-indigo-500/20 pb-3">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">
                  2FA & Sub-Admin Delegation Control
                </h3>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Enter an existing or new user email and password below. Granting Sub-Admin role will allow them to access the website and execute administrative controls via Telegram!
              </p>

              {subAdminStatus && (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 border ${
                    subAdminStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {subAdminStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{subAdminStatus.msg}</span>
                </div>
              )}

              <form onSubmit={handleGrantSubAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    User Email Address
                  </label>
                  <input
                    type="email"
                    value={subAdminEmail}
                    onChange={(e) => setSubAdminEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Sub-Admin Password
                  </label>
                  <input
                    type="text"
                    value={subAdminPassword}
                    onChange={(e) => setSubAdminPassword(e.target.value)}
                    placeholder="Set password (e.g., 123456)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Grant Sub-Admin Role & Sync Real-Time
                  </button>
                </div>
              </form>
            </div>

            {/* Config Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Settings className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Telegram Control Bot Token & IDs</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Control Bot Token</label>
                  <input
                    type="text"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Admin Telegram ID</label>
                    <input
                      type="text"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">User Telegram ID</label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full py-2.5 rounded-xl bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20 hover:bg-sky-400 transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT USER MESSAGING & BROADCAST */}
        {activeTab === 'BROADCAST' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <SendHorizontal className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-base text-white">Direct Message & Broadcast Gateway</h3>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Send a direct message or announcement from the Telegram Bot to all connected users or specific account addresses.
            </p>

            {broadcastStatus && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 border ${
                  broadcastStatus.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {broadcastStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{broadcastStatus.msg}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Recipient Scope
                </label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">📢 All Registered Users & Telegram Channel</option>
                  <option value="subadmin">👑 Sub-Admins Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Broadcast Message Text
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  placeholder="Type announcement or message..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-600/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Dispatch Message via Telegram Bot
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
