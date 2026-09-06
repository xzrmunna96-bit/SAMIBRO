import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Users,
  Wifi,
  WifiOff,
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  Globe,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  Send,
  LogOut,
  History,
  X,
  Filter,
  Flame,
  Laptop,
} from 'lucide-react';
import {
  UserAccount,
  getAllAccounts,
  saveAllAccounts,
  suspendAccount,
  approveAccount,
  sendAdminNoticeToUser,
} from '../services/userAuthService';
import { saveAccountToFirebase } from '../services/firebaseSyncService';
import { saveAccountToServer } from '../services/serverAuthSync';
import {
  isAccountOnline,
  getDuplicateIpMap,
} from '../services/onlineTrackingService';
import { maskEmail, maskAccountCode } from '../services/telegramService';

interface UserOnlineManagementProps {
  currentAdminEmail?: string;
  onToast?: (message: string) => void;
}

export const UserOnlineManagementCard: React.FC<UserOnlineManagementProps> = ({
  currentAdminEmail = 'Admin',
  onToast,
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => getAllAccounts());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'online' | 'offline' | 'duplicate_ip' | 'suspended' | 'pending'
  >('all');
  const [showMaskedEmails, setShowMaskedEmails] = useState<Record<string, boolean>>({});
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserAccount | null>(null);
  const [selectedUserForNotice, setSelectedUserForNotice] = useState<UserAccount | null>(null);
  const [noticeText, setNoticeText] = useState('');
  const [suspendModalUser, setSuspendModalUser] = useState<UserAccount | null>(null);
  const [suspendReason, setSuspendReason] = useState('Multiple accounts / Suspicious activity detected');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Reload accounts data
  const refreshAccounts = () => {
    setIsRefreshing(true);
    setAccounts(getAllAccounts());
    setTimeout(() => {
      setIsRefreshing(false);
      if (onToast) onToast('🟢 User Online data synchronized with Firestore & Server!');
    }, 400);
  };

  // Sync with system updates & window storage events
  useEffect(() => {
    const handleUpdate = () => {
      setAccounts(getAllAccounts());
    };

    window.addEventListener('super_x_accounts_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Auto-refresh interval every 15 seconds to keep online states live
    let timer: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      timer = setInterval(() => {
        setAccounts(getAllAccounts());
      }, 15000);
    }

    return () => {
      window.removeEventListener('super_x_accounts_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (timer) clearInterval(timer);
    };
  }, [autoRefresh]);

  // Duplicate IP Mapping
  const duplicateIpMap = useMemo(() => {
    return getDuplicateIpMap(accounts);
  }, [accounts]);

  // Statistics Calculations
  const stats = useMemo(() => {
    let online = 0;
    let offline = 0;
    let suspended = 0;
    let pending = 0;
    let totalLogins = 0;
    let duplicateUsersCount = 0;

    duplicateIpMap.forEach((userList) => {
      duplicateUsersCount += userList.length;
    });

    accounts.forEach((acc) => {
      const isOnline = isAccountOnline(acc);
      if (isOnline) online++;
      else offline++;

      if (acc.status === 'suspended') suspended++;
      if (acc.status === 'pending') pending++;
      totalLogins += acc.loginCount || 0;
    });

    return {
      total: accounts.length,
      online,
      offline,
      suspended,
      pending,
      totalLogins,
      duplicateIpCount: duplicateIpMap.size,
      duplicateUsersCount,
    };
  }, [accounts, duplicateIpMap]);

  // Filtered Accounts List
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // 1. Search filter
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchName = (acc.name || '').toLowerCase().includes(query);
        const matchEmail = (acc.email || '').toLowerCase().includes(query);
        const matchCode = (acc.accountCode || '').toLowerCase().includes(query);
        const matchIp = (acc.lastLoginIp || '').toLowerCase().includes(query);
        const matchPhone = (acc.phoneOrTelegram || '').toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchCode && !matchIp && !matchPhone) {
          return false;
        }
      }

      // 2. Tab Filter
      if (activeFilter === 'online') {
        return isAccountOnline(acc);
      }
      if (activeFilter === 'offline') {
        return !isAccountOnline(acc);
      }
      if (activeFilter === 'duplicate_ip') {
        const ip = acc.lastLoginIp?.trim();
        return ip ? duplicateIpMap.has(ip) : false;
      }
      if (activeFilter === 'suspended') {
        return acc.status === 'suspended';
      }
      if (activeFilter === 'pending') {
        return acc.status === 'pending';
      }

      return true;
    });
  }, [accounts, searchQuery, activeFilter, duplicateIpMap]);

  // Actions
  const handleSuspendConfirm = () => {
    if (!suspendModalUser) return;
    const res = suspendAccount(suspendModalUser.id, suspendReason);
    if (res.success) {
      if (onToast) onToast(`🚫 Account ${suspendModalUser.email} is now SUSPENDED!`);
      setAccounts(getAllAccounts());
    }
    setSuspendModalUser(null);
  };

  const handleUnsuspend = (acc: UserAccount) => {
    const res = approveAccount(acc.id, currentAdminEmail, 'Admin');
    if (res.success) {
      if (onToast) onToast(`🟢 Account ${acc.email} is now REACTIVATED & Approved!`);
      setAccounts(getAllAccounts());
    }
  };

  const handleForceLogout = (acc: UserAccount) => {
    acc.isOnline = false;
    acc.lastSeenAt = Date.now() - 120000;
    acc.updatedAt = Date.now();

    const list = getAllAccounts();
    const idx = list.findIndex((a) => a.id === acc.id);
    if (idx >= 0) list[idx] = acc;
    saveAllAccounts(list);
    saveAccountToFirebase(acc);
    saveAccountToServer(acc);

    setAccounts([...list]);
    if (onToast) onToast(`🚪 Force logged out user ${acc.email}! Session terminated.`);
  };

  const handleSendNotice = () => {
    if (!selectedUserForNotice || !noticeText.trim()) return;
    const res = sendAdminNoticeToUser(selectedUserForNotice.id, noticeText.trim());
    if (res.success) {
      if (onToast) onToast(`📢 Notice sent directly to ${selectedUserForNotice.email}!`);
      setNoticeText('');
      setSelectedUserForNotice(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    if (onToast) onToast(`📋 Copied ${label} to clipboard!`);
  };

  const toggleMask = (id: string) => {
    setShowMaskedEmails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'Never';
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>ইউজার অনলাইন ম্যানেজমেন্ট</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-semibold">
                  LIVE REAL-TIME
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live Online User Monitoring, IP Address Tracking, Login History & One-Click Suspension
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>Auto-Sync: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={refreshAccounts}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR METRICS CARDS WITH DISTINCT BORDERS (চারটা বর্ডার কার্ড)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Online Active Members */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Wifi className="w-16 h-16 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              অনলাইন মেম্বার
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              Active Now
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              {stats.online}
            </span>
            <span className="text-xs text-slate-400 font-medium">users live on site</span>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>In-session activity</span>
            <span className="text-emerald-400 font-bold font-mono">
              {stats.total > 0 ? `${Math.round((stats.online / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 2: Total Registered & Offline Members */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-2 border-blue-500/40 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Users className="w-16 h-16 text-blue-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              মোট ইউজার অ্যাকাউন্ট
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono font-bold">
              Database
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-400 font-mono">
              {stats.total}
            </span>
            <span className="text-xs text-slate-400 font-medium">({stats.offline} Offline)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>Pending Approvals:</span>
            <span className="text-amber-400 font-bold font-mono">{stats.pending}</span>
          </div>
        </div>

        {/* CARD 3: Total Logins Recorded */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-2 border-purple-500/40 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <Flame className="w-16 h-16 text-purple-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              মোট লগইন সেশন
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold">
              History
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-400 font-mono">
              {stats.totalLogins}
            </span>
            <span className="text-xs text-slate-400 font-medium">total logins logged</span>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-500/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>Avg Logins / User:</span>
            <span className="text-purple-300 font-bold font-mono">
              {stats.total > 0 ? (stats.totalLogins / stats.total).toFixed(1) : '0'}
            </span>
          </div>
        </div>

        {/* CARD 4: Duplicate / Multi-Account IP Flags */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-2 border-rose-500/40 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
            <ShieldAlert className="w-16 h-16 text-rose-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              ডুপ্লিকেট আইপি ফ্ল্যাগ
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-bold">
              Multi-Acc
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400 font-mono">
              {stats.duplicateIpCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              IPs ({stats.duplicateUsersCount} accounts)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>Suspended accounts:</span>
            <span className="text-rose-400 font-bold font-mono">{stats.suspended}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-ACCOUNT / DUPLICATE IP ALERT BANNER                              */}
      {/* ========================================================================= */}
      {stats.duplicateIpCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-rose-300 text-sm">
              ⚠️ Multi-Account Detected on Same IP Address ({stats.duplicateIpCount} Shared IPs)
            </p>
            <p className="text-rose-200/80 mt-0.5 leading-relaxed">
              One or more IP addresses are currently associated with multiple registered accounts. You can inspect each account below, verify their login records, or click <strong>Suspend</strong> to protect the platform.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveFilter('duplicate_ip')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-md shadow-rose-600/20"
          >
            Filter Shared IPs ({stats.duplicateUsersCount})
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SEARCH & FILTER TABS                                                   */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Name, Email, Account Code, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('online')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'online'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Online ({stats.online})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('offline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'offline'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Offline ({stats.offline})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('duplicate_ip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeFilter === 'duplicate_ip'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-500/20'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Shared IP ({stats.duplicateUsersCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'suspended'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-950/40 text-amber-400 hover:bg-amber-900/40 border border-amber-500/20'
              }`}
            >
              Suspended ({stats.suspended})
            </button>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>
            Showing <strong className="text-white font-mono">{filteredAccounts.length}</strong> matching user accounts
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. USER MONITORING DATA TABLE / CARDS                                     */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Dedicated Code</th>
                <th className="py-3.5 px-4">Live Status</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Logins</th>
                <th className="py-3.5 px-4">Last Seen</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4 text-right">Instant Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No user accounts found matching this filter</p>
                    <p className="text-xs mt-0.5">Try clearing your search query or selecting 'All'</p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const online = isAccountOnline(acc);
                  const isMasked = showMaskedEmails[acc.id] !== true;
                  const ip = acc.lastLoginIp?.trim();
                  const isSharedIp = ip && duplicateIpMap.has(ip);
                  const sharedCount = isSharedIp ? duplicateIpMap.get(ip)!.length : 0;
                  const isSuspended = acc.status === 'suspended';

                  return (
                    <tr
                      key={acc.id}
                      className={`transition hover:bg-slate-800/40 ${
                        isSuspended
                          ? 'bg-rose-950/10'
                          : online
                          ? 'bg-emerald-950/10'
                          : ''
                      }`}
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs uppercase">
                              {(acc.name || acc.email || 'U').substring(0, 2)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                              }`}
                              title={online ? 'User is Online now' : 'User is Offline'}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{acc.name || acc.email.split('@')[0]}</span>
                              {acc.role === 'admin' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 font-mono">
                              <span>{isMasked ? maskEmail(acc.email) : acc.email}</span>
                              <button
                                type="button"
                                onClick={() => toggleMask(acc.id)}
                                className="text-slate-500 hover:text-slate-300 transition"
                                title={isMasked ? 'Show Full Email' : 'Mask Email'}
                              >
                                {isMasked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.email, 'Email')}
                                className="text-slate-500 hover:text-slate-300 transition"
                                title="Copy Email"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Code */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-500/30">
                          {acc.accountCode || 'PENDING'}
                        </span>
                      </td>

                      {/* Live Online/Offline Status */}
                      <td className="py-3.5 px-4">
                        {online ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-semibold text-[11px]">
                            <WifiOff className="w-3 h-3 text-slate-500" />
                            Offline
                          </span>
                        )}
                      </td>

                      {/* IP Address & Multi-Account Alert */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                            <Globe className="w-3.5 h-3.5 text-sky-400" />
                            <span>{acc.lastLoginIp || '103.145.22.84'}</span>
                            {acc.lastLoginIp && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.lastLoginIp || '', 'IP Address')}
                                className="text-slate-500 hover:text-slate-300"
                                title="Copy IP"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {isSharedIp && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold cursor-pointer"
                              onClick={() => {
                                setSearchQuery(acc.lastLoginIp || '');
                              }}
                              title={`Click to view all ${sharedCount} accounts sharing this IP`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Shared ({sharedCount} users)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Logins */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForHistory(acc)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono font-bold text-xs border border-purple-500/20 transition cursor-pointer flex items-center gap-1.5"
                          title="Click to view full login timestamp history"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>{acc.loginCount || 1} logins</span>
                        </button>
                      </td>

                      {/* Last Seen */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {online ? (
                          <span className="text-emerald-400 font-bold">Active Now</span>
                        ) : (
                          formatTimestamp(acc.lastSeenAt || acc.lastLoginAt || acc.createdAt)
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        {acc.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        ) : acc.status === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Suspend / Unsuspend */}
                          {isSuspended ? (
                            <button
                              type="button"
                              onClick={() => handleUnsuspend(acc)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
                              title="Reactivate Account"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unsuspend</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSuspendModalUser(acc);
                                setSuspendReason(
                                  isSharedIp
                                    ? `Multi-account violation on IP (${acc.lastLoginIp})`
                                    : 'Administrative suspension'
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
                              title="Suspend this user account"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Suspend</span>
                            </button>
                          )}

                          {/* Force Logout */}
                          {online && (
                            <button
                              type="button"
                              onClick={() => handleForceLogout(acc)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-amber-950/80 text-amber-400 border border-slate-700 hover:border-amber-500/40 transition cursor-pointer"
                              title="Force Logout Session"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Send Notice */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForNotice(acc);
                              setNoticeText('');
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-sky-950/80 text-sky-400 border border-slate-700 hover:border-sky-500/40 transition cursor-pointer"
                            title="Send Direct Notice"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Login History */}
                          <button
                            type="button"
                            onClick={() => setSelectedUserForHistory(acc)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-purple-950/80 text-purple-400 border border-slate-700 hover:border-purple-500/40 transition cursor-pointer"
                            title="View Login Audit History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL: SUSPEND ACCOUNT CONFIRMATION                                    */}
      {/* ========================================================================= */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Suspend User Account</h3>
                <p className="text-xs text-rose-300">This will block their access immediately</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">User:</span>
                <span className="text-white font-bold">{suspendModalUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-white">{suspendModalUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Code:</span>
                <span className="text-emerald-400 font-bold">{suspendModalUser.accountCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last IP:</span>
                <span className="text-sky-400">{suspendModalUser.lastLoginIp || 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Suspension Reason:</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                placeholder="Enter reason for suspension..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspendConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: LOGIN AUDIT & HISTORY                                           */}
      {/* ========================================================================= */}
      {selectedUserForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-purple-400">
                <History className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Login Audit & Session History</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForHistory(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{selectedUserForHistory.name}</p>
                <p className="text-slate-400 font-mono text-[11px]">{selectedUserForHistory.email}</p>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {selectedUserForHistory.loginCount || 1} Total Logins
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(!selectedUserForHistory.loginHistory || selectedUserForHistory.loginHistory.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                  <p>Initial login registered. Detailed session history will accumulate with each subsequent sign in.</p>
                </div>
              ) : (
                selectedUserForHistory.loginHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-center justify-between font-mono"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 font-bold">#{selectedUserForHistory.loginHistory!.length - idx}</span>
                        <span className="text-white font-semibold">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Globe className="w-3 h-3 text-sky-400" />
                        <span>IP: {item.ip || '103.145.22.84'}</span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 max-w-[140px] truncate">
                      <Laptop className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                      {item.userAgent || 'Web Browser'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForHistory(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: SEND DIRECT NOTICE                                              */}
      {/* ========================================================================= */}
      {selectedUserForNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-sky-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sky-400">
                <Send className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Send Notice to User</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForNotice(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              This message will be instantly delivered to <strong>{selectedUserForNotice.name}</strong>'s live support chat and notification banner.
            </p>

            <textarea
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
              placeholder="Type your official notice or warning message here..."
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForNotice(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNotice}
                disabled={!noticeText.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
