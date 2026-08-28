import React, { useState, useEffect, useRef } from 'react';
import {
  Key,
  Users,
  UserPlus,
  Bell,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Sparkles,
  Search,
  Check,
  Copy,
  Send,
  Trash2,
  UserCheck,
  UserX,
  Play,
  Pause,
  Terminal,
  Activity,
  KeyRound,
  ShieldAlert,
  Smartphone,
  CheckCheck,
  X,
} from 'lucide-react';
import {
  getAllNotifications,
  addNotification,
  deleteNotification,
  NotificationItem,
  NOTIFICATION_UPDATE_EVENT,
} from '../services/notificationService';
import {
  getAllAccounts,
  approveAccount,
  rejectAccount,
  suspendAccount,
  deleteAccount,
  requestNewAccount,
  resetAccountPassword,
  sendAdminNoticeToUser,
  getDedicatedAccountCode,
  UserAccount,
} from '../services/userAuthService';
import {
  getAllSupportMessages,
  getChatMessagesForUser,
  sendAdminMessage,
  markChatAsReadByAdmin,
  getAdminUnreadChatCount,
  getAllChatConversations,
  ChatMessage,
  CHAT_UPDATE_EVENT,
} from '../services/supportChatService';
import {
  getMauthApiKey,
  setMauthApiKey,
  setVoltxEndpointKey,
  fetchLiveConsoleDetailed,
  syncSystemApiKeyFromServer,
  broadcastSystemApiKeyToServer,
  LiveConsoleHit,
  DEFAULT_VOLTX_ENDPOINT_KEY,
} from '../services/voltxApi';

const ADMIN_MASTER_PASSWORD = 'MUNNA12061';
const ADMIN_SESSION_KEY = 'super_x_admin_session_auth';
const DEFAULT_API_KEY = 'M7ANNWJY6B2';

type AdminTab =
  | 'console-api'
  | 'active-account-management'
  | 'user-management'
  | 'manually-user'
  | 'user-notification'
  | 'live-chat';

interface AdminPortalProps {
  onBackToLogin: () => void;
}

export function AdminPortal({ onBackToLogin }: AdminPortalProps) {
  // Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('console-api');

  // Active Account Management Tab State
  const [activeAccSearch, setActiveAccSearch] = useState('');
  const [activeAccFilter, setActiveAccFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('pending');
  const [noticeModalUser, setNoticeModalUser] = useState<UserAccount | null>(null);
  const [noticeModalText, setNoticeModalText] = useState('');
  const [rejectModalUser, setRejectModalUser] = useState<UserAccount | null>(null);
  const [rejectModalReason, setRejectModalReason] = useState('');

  // =========================================================================
  // SECTION 1: CONSOLE API KEY & REAL-TIME INCOMING SMS
  // =========================================================================
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => {
    const saved = getMauthApiKey();
    return saved && saved.trim() ? saved.trim() : DEFAULT_API_KEY;
  });
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    hitsCount: number;
    code: number;
    latencyMs?: number;
  } | null>(null);

  // Real-time console stream state
  const [liveStreamHits, setLiveStreamHits] = useState<LiveConsoleHit[]>([]);
  const [isStreamFetching, setIsStreamFetching] = useState(false);
  const [isAutoStreamActive, setIsAutoStreamActive] = useState(true);
  const [streamCountdown, setStreamCountdown] = useState(2);
  const [streamFilter, setStreamFilter] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // =========================================================================
  // SECTION 2: USER MANAGEMENT
  // =========================================================================
  const [accountsList, setAccountsList] = useState<UserAccount[]>(() => getAllAccounts());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'ALL' | 'approved' | 'suspended' | 'pending'>('ALL');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<UserAccount | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetModalError, setResetModalError] = useState('');

  // Quick Answer / Message Modal
  const [quickAnswerUser, setQuickAnswerUser] = useState<UserAccount | null>(null);
  const [quickAnswerText, setQuickAnswerText] = useState('');

  // =========================================================================
  // SECTION 3: MANUALLY USER MANAGEMENT
  // =========================================================================
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualError, setManualError] = useState('');
  const [recentlyCreatedUser, setRecentlyCreatedUser] = useState<{
    email: string;
    password: string;
    accountCode: string;
    name: string;
  } | null>(null);

  // =========================================================================
  // SECTION 4: USER NOTIFICATION & TOP MARQUEE NOTICE
  // =========================================================================
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>(() => getAllNotifications());
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<NotificationItem['type']>('update');

  // Top Marquee Notice Banner State
  const [adminNoticeInput, setAdminNoticeInput] = useState(() => {
    try {
      return (
        localStorage.getItem("super_x_site_marquee_notice") ||
        "SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active"
      );
    } catch {
      return "SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active";
    }
  });
  const [isNoticeSaved, setIsNoticeSaved] = useState(false);

  const handleSaveMarqueeNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = adminNoticeInput.trim();
    if (!clean) return;
    try {
      localStorage.setItem("super_x_site_marquee_notice", clean);
      window.dispatchEvent(new Event("super_x_marquee_notice_updated"));
      setIsNoticeSaved(true);
      showToast("Top Notice Banner text updated & published to all user panels!");
      setTimeout(() => setIsNoticeSaved(false), 3000);
    } catch {
      showToast("Failed to save notice banner.");
    }
  };

  // =========================================================================
  // SECTION 5: LIVE CHAT
  // =========================================================================
  const [activeChatUserEmail, setActiveChatUserEmail] = useState<string>('');
  const [adminChatInput, setAdminChatInput] = useState('');
  const [adminUnreadCount, setAdminUnreadCount] = useState<number>(() => getAdminUnreadChatCount());
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      showToast(`${label}: ${text}`);
      setTimeout(() => setCopiedText(null), 2500);
    } catch {
      showToast(`Copied: ${text}`);
    }
  };

  // Helper to extract OTP code
  const extractOtp = (msg: string): string | null => {
    if (!msg) return null;
    const gCode = msg.match(/G-\d{6}/i);
    if (gCode) return gCode[0];
    const hyphenCode = msg.match(/\b\d{3}-\d{3}\b/);
    if (hyphenCode) return hyphenCode[0];
    const digitCode = msg.match(/\b\d{4,8}\b/);
    if (digitCode) return digitCode[0];
    return null;
  };

  // -------------------------------------------------------------------------
  // Real-time Incoming SMS Fetcher
  // -------------------------------------------------------------------------
  const fetchIncomingSmsHits = async (keyOverride?: string) => {
    const key = (keyOverride !== undefined ? keyOverride : apiKeyInput) || DEFAULT_API_KEY;
    if (!key || !key.trim()) return;
    setIsStreamFetching(true);
    try {
      const res = await fetchLiveConsoleDetailed(key.trim());
      if (res.hits && Array.isArray(res.hits)) {
        setLiveStreamHits(res.hits);
      }
    } catch {
      // ignore
    } finally {
      setIsStreamFetching(false);
    }
  };

  // 2s Auto Polling Interval for Live Incoming Messages
  useEffect(() => {
    if (!isAdminAuthenticated || !isAutoStreamActive) return;
    const timer = setInterval(() => {
      setStreamCountdown((prev) => {
        if (prev <= 1) {
          fetchIncomingSmsHits();
          return 2;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isAdminAuthenticated, isAutoStreamActive, apiKeyInput]);

  // Initial Fetch & Chat Conversation Selection on Mount / Auth
  useEffect(() => {
    syncSystemApiKeyFromServer().then((remoteKey) => {
      if (remoteKey && remoteKey.trim()) {
        setApiKeyInput(remoteKey.trim());
      }
    });

    if (!isAdminAuthenticated) return;
    fetchIncomingSmsHits();
    const convs = getAllChatConversations();
    if (convs.length > 0 && !activeChatUserEmail) {
      setActiveChatUserEmail(convs[0].userEmail);
    }
  }, [isAdminAuthenticated]);

  // Event Listeners for Accounts, Notifications, and Chat Updates
  useEffect(() => {
    const handleAccountsUpdated = () => {
      setAccountsList(getAllAccounts());
    };
    const handleChatUpdated = () => {
      setAdminUnreadCount(getAdminUnreadChatCount());
      setChatRefreshKey((k) => k + 1);
    };
    const handleNotifUpdated = () => {
      setNotificationsList(getAllNotifications());
    };

    window.addEventListener('super_x_accounts_updated', handleAccountsUpdated);
    window.addEventListener(CHAT_UPDATE_EVENT, handleChatUpdated);
    window.addEventListener(NOTIFICATION_UPDATE_EVENT, handleNotifUpdated);
    window.addEventListener('storage', handleAccountsUpdated);

    return () => {
      window.removeEventListener('super_x_accounts_updated', handleAccountsUpdated);
      window.removeEventListener(CHAT_UPDATE_EVENT, handleChatUpdated);
      window.removeEventListener(NOTIFICATION_UPDATE_EVENT, handleNotifUpdated);
      window.removeEventListener('storage', handleAccountsUpdated);
    };
  }, []);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'live-chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatUserEmail, chatRefreshKey, activeTab]);

  // -------------------------------------------------------------------------
  // Auth Handlers
  // -------------------------------------------------------------------------
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const clean = enteredPassword.trim();
    if (!clean) {
      setAuthError('Please enter the Admin Master Password.');
      return;
    }
    if (clean === ADMIN_MASTER_PASSWORD || clean.toUpperCase() === ADMIN_MASTER_PASSWORD.toUpperCase()) {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch {}
      setEnteredPassword('');
      showToast('Admin access granted! Welcome.');
    } else {
      setAuthError('Incorrect master password. Please verify credentials.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
  };

  // -------------------------------------------------------------------------
  // SECTION 1: Console API Key Handlers
  // -------------------------------------------------------------------------
  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      showToast('Please enter a valid API Key');
      return;
    }

    setMauthApiKey(trimmed);
    setVoltxEndpointKey(trimmed);

    try {
      await broadcastSystemApiKeyToServer(trimmed);
      localStorage.setItem('super_x_api_activated', 'true');
      localStorage.setItem('super_x_last_sync_time', Date.now().toString());
    } catch {}

    window.dispatchEvent(new Event('voltx_key_updated'));
    window.dispatchEvent(new Event('super_x_api_key_updated'));
    window.dispatchEvent(new Event('storage'));

    setIsApiKeySaved(true);
    showToast(`API Key [${trimmed}] saved & activated across all user panels!`);
    await fetchIncomingSmsHits(trimmed);
    setTimeout(() => setIsApiKeySaved(false), 4000);
  };

  const handleTestConnection = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      showToast('Please enter an API Key to test');
      return;
    }
    setIsTestingApi(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const res = await fetchLiveConsoleDetailed(key);
      const latency = Date.now() - start;
      const isSuccess = res.code === 200 || (res.hits && res.hits.length > 0);

      setTestResult({
        success: isSuccess,
        code: res.code,
        latencyMs: latency,
        hitsCount: res.hits ? res.hits.length : 0,
        message: isSuccess
          ? `Connected successfully! Latency: ${latency}ms, Incoming Messages: ${res.hits ? res.hits.length : 0}`
          : `API returned code ${res.code}. Verify key permissions.`,
      });

      if (res.hits && res.hits.length > 0) {
        setLiveStreamHits(res.hits);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        code: 500,
        latencyMs: Date.now() - start,
        hitsCount: 0,
        message: err?.message || 'Connection failed. Check network or key.',
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleResetToDefaultApiKey = async () => {
    setApiKeyInput(DEFAULT_API_KEY);
    setMauthApiKey(DEFAULT_API_KEY);
    setVoltxEndpointKey(DEFAULT_API_KEY);
    try {
      await broadcastSystemApiKeyToServer(DEFAULT_API_KEY);
    } catch {}
    setIsApiKeySaved(true);
    showToast(`Reset to default API key: ${DEFAULT_API_KEY}`);
    await fetchIncomingSmsHits(DEFAULT_API_KEY);
    setTimeout(() => setIsApiKeySaved(false), 4000);
  };

  // -------------------------------------------------------------------------
  // ACTIVE ACCOUNT MANAGEMENT HANDLERS
  // -------------------------------------------------------------------------
  const handleApproveActiveAccount = (user: UserAccount) => {
    approveAccount(user.id);
    setAccountsList(getAllAccounts());
    showToast(`Account for ${user.email} has been APPROVED & ACTIVATED!`);
  };

  const handleOpenNoticeModal = (user: UserAccount) => {
    setNoticeModalUser(user);
    setNoticeModalText(user.adminNotice || '');
  };

  const handleSendNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeModalUser || !noticeModalText.trim()) return;
    const res = sendAdminNoticeToUser(noticeModalUser.id, noticeModalText.trim());
    if (res.success) {
      showToast(`Notice sent to ${noticeModalUser.email}!`);
      setAccountsList(getAllAccounts());
      setNoticeModalUser(null);
      setNoticeModalText('');
    }
  };

  const handleOpenRejectModal = (user: UserAccount) => {
    setRejectModalUser(user);
    setRejectModalReason('');
  };

  const handleConfirmRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalUser) return;
    rejectAccount(rejectModalUser.id, rejectModalReason.trim());
    setAccountsList(getAllAccounts());
    showToast(`Account request for ${rejectModalUser.email} has been REJECTED.`);
    setRejectModalUser(null);
    setRejectModalReason('');
  };

  // -------------------------------------------------------------------------
  // SECTION 2: User Management Handlers
  // -------------------------------------------------------------------------
  const handleToggleSuspend = (user: UserAccount) => {
    if (user.status === 'approved') {
      suspendAccount(user.id, 'Suspended by Admin');
      setAccountsList(getAllAccounts());
      showToast(`User ${user.email} has been SUSPENDED.`);
    } else {
      approveAccount(user.id);
      setAccountsList(getAllAccounts());
      showToast(`User ${user.email} has been UNSUSPENDED & APPROVED!`);
    }
  };

  const handleOpenResetModal = (user: UserAccount) => {
    setResetModalUser(user);
    setResetPasswordInput(user.password || '');
    setResetModalError('');
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordInput(pass);
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetModalError('');

    const clean = resetPasswordInput.trim();
    if (!clean || clean.length < 4) {
      setResetModalError('Password must be at least 4 characters long.');
      return;
    }

    const res = resetAccountPassword(resetModalUser.id, clean);
    if (res.success) {
      // Send real-time notice to user in Live Chat
      sendAdminMessage(
        resetModalUser.email,
        `🔑 Password Reset Notice: Admin has updated your account password to: ${clean}. You can now sign in.`
      );
      setAccountsList(getAllAccounts());
      showToast(`Password updated for ${resetModalUser.email} to: ${clean}`);
      setResetModalUser(null);
      setResetPasswordInput('');
    } else {
      setResetModalError(res.message);
    }
  };

  const handleOpenQuickAnswer = (user: UserAccount) => {
    setQuickAnswerUser(user);
    setQuickAnswerText('');
  };

  const handleSendQuickAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAnswerUser || !quickAnswerText.trim()) return;

    sendAdminMessage(quickAnswerUser.email, quickAnswerText.trim());
    showToast(`Reply sent to ${quickAnswerUser.email}!`);
    setQuickAnswerUser(null);
    setQuickAnswerText('');
    setChatRefreshKey((k) => k + 1);
  };

  const handleDeleteUserAccount = (user: UserAccount) => {
    if (window.confirm(`Permanently delete account for ${user.email}? This action cannot be undone.`)) {
      deleteAccount(user.id);
      setAccountsList(getAllAccounts());
      showToast(`Account for ${user.email} removed.`);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // -------------------------------------------------------------------------
  // SECTION 3: Manually User Management Handlers
  // -------------------------------------------------------------------------
  const handleGenerateManualPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pass = 'Pass';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManualPassword(pass);
  };

  const handleCreateManualUser = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    setRecentlyCreatedUser(null);

    const cleanEmail = manualEmail.trim().toLowerCase();
    const cleanPassword = manualPassword.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setManualError('Please provide a valid email address.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setManualError('Password must be at least 4 characters long.');
      return;
    }

    const res = requestNewAccount({
      name: manualName.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      password: cleanPassword,
      phoneOrTelegram: manualPhone.trim(),
      note: manualNote.trim() || 'Created manually by Admin',
    });

    if (res.success && res.account) {
      // Directly approve so user can sign in immediately
      approveAccount(res.account.id);
      setAccountsList(getAllAccounts());

      setRecentlyCreatedUser({
        email: cleanEmail,
        password: cleanPassword,
        accountCode: res.account.accountCode,
        name: res.account.name,
      });

      // Clear input fields
      setManualName('');
      setManualEmail('');
      setManualPassword('');
      setManualPhone('');
      setManualNote('');

      showToast(`User account created & approved for: ${cleanEmail}`);
    } else {
      setManualError(res.message || 'Failed to create user account.');
    }
  };

  // -------------------------------------------------------------------------
  // SECTION 4: User Notification Handlers
  // -------------------------------------------------------------------------
  const handleBroadcastNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('Please enter both title and message.');
      return;
    }

    addNotification(notifTitle.trim(), notifMessage.trim(), notifType);
    setNotificationsList(getAllNotifications());
    setNotifTitle('');
    setNotifMessage('');
    showToast('Notification broadcasted to all users successfully!');
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
    setNotificationsList(getAllNotifications());
    showToast('Notification removed.');
  };

  // -------------------------------------------------------------------------
  // SECTION 5: Live Chat Handlers
  // -------------------------------------------------------------------------
  const handleSelectChatUser = (email: string) => {
    setActiveChatUserEmail(email);
    markChatAsReadByAdmin(email);
    setAdminUnreadCount(getAdminUnreadChatCount());
  };

  const handleSendChatReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUserEmail || !adminChatInput.trim()) return;

    sendAdminMessage(activeChatUserEmail, adminChatInput.trim());
    setAdminChatInput('');
    setChatRefreshKey((k) => k + 1);
  };

  const handleSendTemplateReply = (template: string) => {
    if (!activeChatUserEmail) return;
    sendAdminMessage(activeChatUserEmail, template);
    setChatRefreshKey((k) => k + 1);
    showToast('Template response sent!');
  };

  // Filtered Lists
  const filteredHits = liveStreamHits.filter((hit) => {
    if (!streamFilter.trim()) return true;
    const q = streamFilter.toLowerCase();
    return (
      hit.sid.toLowerCase().includes(q) ||
      hit.range.toLowerCase().includes(q) ||
      hit.message.toLowerCase().includes(q) ||
      (hit.operator && hit.operator.toLowerCase().includes(q)) ||
      (hit.country && hit.country.toLowerCase().includes(q))
    );
  });

  const filteredActiveAccountRequests = accountsList.filter((acc) => {
    if (activeAccFilter !== 'ALL') {
      if (acc.status !== activeAccFilter) return false;
    }
    if (!activeAccSearch.trim()) return true;
    const q = activeAccSearch.toLowerCase();
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.phoneOrTelegram && acc.phoneOrTelegram.toLowerCase().includes(q)) ||
      (acc.note && acc.note.toLowerCase().includes(q)) ||
      (acc.groupLink && acc.groupLink.toLowerCase().includes(q)) ||
      (acc.adminNotice && acc.adminNotice.toLowerCase().includes(q))
    );
  });

  const filteredAccounts = accountsList.filter((acc) => {
    if (userFilterStatus !== 'ALL') {
      if (acc.status !== userFilterStatus) return false;
    }
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.accountCode && acc.accountCode.includes(q)) ||
      (acc.phoneOrTelegram && acc.phoneOrTelegram.toLowerCase().includes(q))
    );
  });

  const chatConversations = getAllChatConversations().filter((conv) => {
    if (!chatSearchQuery.trim()) return true;
    const q = chatSearchQuery.toLowerCase();
    return (
      conv.userName.toLowerCase().includes(q) ||
      conv.userEmail.toLowerCase().includes(q) ||
      (conv.lastMessage && conv.lastMessage.text.toLowerCase().includes(q))
    );
  });

  const currentChatMessages = activeChatUserEmail
    ? getChatMessagesForUser(activeChatUserEmail)
    : [];

  const activeChatUserObj = accountsList.find(
    (a) => a.email.toLowerCase() === activeChatUserEmail.toLowerCase()
  );

  // -------------------------------------------------------------------------
  // VIEW: LOCK SCREEN
  // -------------------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100 font-sans">
        <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-800 relative">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/20 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>SUPER X SMS ADMIN</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Portal Access</h1>
            <p className="text-xs text-slate-400 mt-1">
              Protected administration console. Restricted access only.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Admin Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Enter master password..."
                  className="w-full pl-4 pr-11 py-3 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-400 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to SMS Gateway Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // VIEW: AUTHENTICATED ADMIN PORTAL
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-bold border border-indigo-500/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">SUPER X SMS</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Admin Panel
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Stream Active</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToLogin}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Go to SMS Portal</span>
            </button>

            <button
              type="button"
              onClick={handleAdminLogout}
              className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-red-500/30"
              title="Lock Admin Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>

        {/* 5 Distinct Navigation Tabs (Only What the User Requested) */}
        <div className="bg-slate-900/95 border-t border-slate-800/80 overflow-x-auto py-2 px-4 scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-2 whitespace-nowrap text-xs">
            {/* 1. Console API Key */}
            <button
              type="button"
              onClick={() => setActiveTab('console-api')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'console-api'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Console API Key</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/60 font-mono text-emerald-300 border border-emerald-500/30">
                Live
              </span>
            </button>

            {/* 2. Active Account Management (একটিভ একাউন্ট ম্যানেজমেন্ট) */}
            <button
              type="button"
              id="admin-tab-active-accounts"
              onClick={() => setActiveTab('active-account-management')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'active-account-management'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Active Account Management</span>
              {accountsList.filter((a) => a.status === 'pending').length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black animate-pulse">
                  {accountsList.filter((a) => a.status === 'pending').length} Pending
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/60 font-mono text-amber-300 border border-amber-500/30">
                  {accountsList.length}
                </span>
              )}
            </button>

            {/* 2. User Management */}
            <button
              type="button"
              onClick={() => setActiveTab('user-management')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'user-management'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/60 font-mono text-indigo-300 border border-indigo-500/30">
                {accountsList.length}
              </span>
            </button>

            {/* 3. Manually User Management */}
            <button
              type="button"
              onClick={() => setActiveTab('manually-user')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'manually-user'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Manually User Management</span>
            </button>

            {/* 4. User Notification */}
            <button
              type="button"
              onClick={() => setActiveTab('user-notification')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'user-notification'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>User Notification</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/60 font-mono text-amber-300 border border-amber-500/30">
                {notificationsList.length}
              </span>
            </button>

            {/* 5. Live Chat */}
            <button
              type="button"
              onClick={() => setActiveTab('live-chat')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'live-chat'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Live Chat</span>
              {adminUnreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                  {adminUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ================================================================= */}
        {/* TAB 1: CONSOLE API KEY & REAL-TIME INCOMING SMS CONSOLE           */}
        {/* ================================================================= */}
        {activeTab === 'console-api' && (
          <div className="space-y-6">
            {/* API Key Configuration Card */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">Console API Key Configuration</h2>
                    <p className="text-xs text-slate-400">
                      Default Key: <span className="font-mono text-emerald-400 font-bold">M7ANNWJY6B2</span> — Saves key and activates incoming stream.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefaultApiKey}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Default (M7ANNWJY6B2)</span>
                  </button>
                </div>
              </div>

              {/* Feedback messages */}
              {isApiKeySaved && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>API Key saved! Real-time stream is active and synced across all user panels.</span>
                  </div>
                  <span className="text-[11px] font-mono bg-emerald-900/90 text-emerald-300 px-2 py-0.5 rounded">
                    {apiKeyInput.trim()}
                  </span>
                </div>
              )}

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 font-mono text-slate-300 border border-slate-700">
                    HTTP {testResult.code} | {testResult.latencyMs}ms
                  </span>
                </div>
              )}

              {/* API Key Input & Action Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  API Key (<code className="text-emerald-400 font-mono">mauthapi</code>)
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setIsApiKeySaved(false);
                      setTestResult(null);
                    }}
                    placeholder="Enter API Key (e.g. M7ANNWJY6B2)..."
                    className="w-full flex-1 px-4 py-2.5 font-mono text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-inner"
                  />

                  {/* Test Connection Button */}
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingApi}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                    <span>{isTestingApi ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Save API Key</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Real-time Incoming SMS Console Stream */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-white">Live Real-Time Incoming SMS Console</h2>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Streaming incoming messages in real-time on key: <span className="font-mono text-emerald-400">{apiKeyInput.trim()}</span>
                    </p>
                  </div>
                </div>

                {/* Stream Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800">
                    Poll: <span className="text-emerald-400 font-bold">{streamCountdown}s</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsAutoStreamActive(!isAutoStreamActive)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                      isAutoStreamActive
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isAutoStreamActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isAutoStreamActive ? 'Pause' : 'Resume'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchIncomingSmsHits()}
                    disabled={isStreamFetching}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isStreamFetching ? 'animate-spin text-indigo-400' : ''}`} />
                    <span>Refresh Now</span>
                  </button>
                </div>
              </div>

              {/* Filter Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  placeholder="Filter incoming messages by service, number, carrier, OTP, or message text..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Real-time SMS Feed Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Number / Range</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4">Full Message</th>
                        <th className="py-3 px-4 text-right">OTP / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredHits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-sans text-xs">
                            {isStreamFetching
                              ? 'Fetching live carrier packets...'
                              : 'Waiting for incoming carrier SMS packets on this API key... (Socket connected)'}
                          </td>
                        </tr>
                      ) : (
                        filteredHits.map((hit, index) => {
                          const otp = extractOtp(hit.message);
                          const hitTime = hit.time ? new Date(hit.time).toLocaleTimeString() : 'Just now';

                          return (
                            <tr key={index} className="hover:bg-slate-900/70 transition">
                              {/* Time */}
                              <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                                {hitTime}
                              </td>

                              {/* Service */}
                              <td className="py-3 px-4 font-sans font-bold text-indigo-300 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/30">
                                  {hit.sid || 'General'}
                                </span>
                              </td>

                              {/* Number / Range */}
                              <td className="py-3 px-4 text-white font-bold whitespace-nowrap">
                                {hit.range}
                              </td>

                              {/* Operator & Country */}
                              <td className="py-3 px-4 text-slate-300 font-sans whitespace-nowrap">
                                <span>{hit.country || ''} </span>
                                <span className="text-slate-400 font-mono text-[11px]">{hit.operator || 'Carrier'}</span>
                              </td>

                              {/* Message Body */}
                              <td className="py-3 px-4 font-sans text-slate-300 max-w-xs md:max-w-md break-words">
                                {hit.message}
                              </td>

                              {/* OTP / Action */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {otp ? (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(otp, 'OTP Copied')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                                    title="Click to copy OTP"
                                  >
                                    <KeyRound className="w-3 h-3 text-emerald-400" />
                                    <span>{otp}</span>
                                    {copiedText === otp ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-emerald-400" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-sans">No OTP</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: ACTIVE ACCOUNT MANAGEMENT (একটিভ একাউন্ট ম্যানেজমেন্ট)       */}
        {/* ================================================================= */}
        {activeTab === 'active-account-management' && (
          <div className="space-y-6">
            {/* Header Banner & Stat Cards */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                      <span>Active Account Management</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                        একটিভ একাউন্ট ম্যানেজমেন্ট
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Check user submissions, review full contact details, approve/reject portal logins, or send direct notices.
                    </p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['ALL', 'pending', 'approved', 'rejected'] as const).map((st) => {
                    const count = accountsList.filter((a) => st === 'ALL' || a.status === st).length;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setActiveAccFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          activeAccFilter === st
                            ? st === 'pending'
                              ? 'bg-amber-600 text-white shadow-md'
                              : st === 'approved'
                              ? 'bg-emerald-600 text-white shadow-md'
                              : st === 'rejected'
                              ? 'bg-rose-600 text-white shadow-md'
                              : 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>
                          {st === 'ALL'
                            ? 'All Requests'
                            : st === 'pending'
                            ? 'Pending'
                            : st === 'approved'
                            ? 'Approved'
                            : 'Rejected'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/80 font-mono">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stat Counter Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Submitted</div>
                    <div className="text-xl font-black text-white font-mono mt-0.5">{accountsList.length}</div>
                  </div>
                  <Users className="w-5 h-5 text-slate-500" />
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">Pending Review</div>
                    <div className="text-xl font-black text-amber-300 font-mono mt-0.5">
                      {accountsList.filter((a) => a.status === 'pending').length}
                    </div>
                  </div>
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Approved Active</div>
                    <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">
                      {accountsList.filter((a) => a.status === 'approved').length}
                    </div>
                  </div>
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider">Rejected Requests</div>
                    <div className="text-xl font-black text-rose-300 font-mono mt-0.5">
                      {accountsList.filter((a) => a.status === 'rejected').length}
                    </div>
                  </div>
                  <UserX className="w-5 h-5 text-rose-400" />
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={activeAccSearch}
                  onChange={(e) => setActiveAccSearch(e.target.value)}
                  placeholder="Search submissions by Full Name, Email, Phone Number, Admin Message, or Telegram link..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </section>

            {/* List of Active Account Submissions */}
            <section className="space-y-4">
              {filteredActiveAccountRequests.length === 0 ? (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 space-y-2">
                  <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No submitted account requests found</p>
                  <p className="text-xs text-slate-500">
                    {activeAccSearch ? 'Try clearing your search query' : 'When users submit "Create Active Account", their details will appear here.'}
                  </p>
                </div>
              ) : (
                filteredActiveAccountRequests.map((acc) => {
                  const isPassRevealed = !!revealedPasswords[acc.id];
                  const displayPass = acc.password || 'Password123';

                  return (
                    <div
                      key={acc.id}
                      className={`bg-slate-900 border rounded-2xl p-5 transition shadow-sm space-y-4 ${
                        acc.status === 'pending'
                          ? 'border-amber-500/40 bg-slate-900/90 ring-1 ring-amber-500/20'
                          : acc.status === 'approved'
                          ? 'border-emerald-500/30'
                          : acc.status === 'rejected'
                          ? 'border-rose-500/30 opacity-80'
                          : 'border-slate-800'
                      }`}
                    >
                      {/* Card Top Row: Identity, Status Badge & Timestamp */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border ${
                            acc.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : acc.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {acc.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-white text-sm sm:text-base">{acc.name}</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono border border-indigo-500/30">
                                ID: {acc.accountCode || getDedicatedAccountCode(acc.email)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{acc.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Status Badge */}
                          {acc.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              <span>PENDING APPROVAL</span>
                            </span>
                          )}

                          {acc.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>APPROVED &amp; ACTIVE</span>
                            </span>
                          )}

                          {acc.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/40">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>REJECTED</span>
                            </span>
                          )}

                          <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                            Submitted: {new Date(acc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        {/* Contact Phone / WhatsApp */}
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone / WhatsApp</span>
                          <div className="flex items-center justify-between gap-1 text-slate-200 font-bold font-mono">
                            <span>{acc.phoneOrTelegram || 'Not provided'}</span>
                            {acc.phoneOrTelegram && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(acc.phoneOrTelegram!, 'Phone')}
                                className="text-slate-400 hover:text-indigo-400 p-1 transition cursor-pointer"
                                title="Copy Contact Phone"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Submitted Password */}
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Password</span>
                          <div className="flex items-center justify-between gap-1 text-slate-200 font-bold font-mono">
                            <span>{isPassRevealed ? displayPass : '••••••••••••'}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(acc.id)}
                                className="text-slate-400 hover:text-indigo-400 p-1 transition cursor-pointer"
                                title={isPassRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isPassRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(displayPass, 'Password')}
                                className="text-slate-400 hover:text-indigo-400 p-1 transition cursor-pointer"
                                title="Copy Password"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Telegram / Group Link */}
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telegram / Group Link</span>
                          <div className="truncate text-indigo-400 font-medium">
                            {acc.groupLink ? (
                              <a
                                href={acc.groupLink.startsWith('http') ? acc.groupLink : `https://${acc.groupLink}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline flex items-center gap-1 truncate"
                              >
                                <span>{acc.groupLink}</span>
                              </a>
                            ) : (
                              <span className="text-slate-500 italic">None provided</span>
                            )}
                          </div>
                        </div>

                        {/* User Message / Monthly Requirement */}
                        <div className="md:col-span-2 lg:col-span-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            User Note / Admin Message / Monthly Requirement:
                          </span>
                          <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                            {acc.note || 'No specific admin note provided.'}
                          </p>
                        </div>

                        {/* Sent Admin Notice Banner */}
                        {acc.adminNotice && (
                          <div className="md:col-span-2 lg:col-span-3 p-3 bg-indigo-950/60 rounded-xl border border-indigo-500/40 text-indigo-200 text-xs space-y-1">
                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                              <Bell className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Official Admin Notice Sent to User:</span>
                            </span>
                            <p className="text-white font-medium">{acc.adminNotice}</p>
                          </div>
                        )}
                      </div>

                      {/* Card Action Controls Footer */}
                      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Approve Button */}
                          {acc.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleApproveActiveAccount(acc)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>Approve Account (এপ্রুভ করুন)</span>
                            </button>
                          )}

                          {/* Reject Button */}
                          {acc.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(acc)}
                              className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                            >
                              <UserX className="w-4 h-4" />
                              <span>Reject Request (রিজেক্ট)</span>
                            </button>
                          )}

                          {/* Send Notice Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenNoticeModal(acc)}
                            className="px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Bell className="w-4 h-4 text-purple-400" />
                            <span>Send Notice (নোটিশ পাঠান)</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(acc)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-slate-700"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Reset Password</span>
                          </button>

                          {/* Delete Request */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUserAccount(acc)}
                            className="p-2 rounded-xl bg-slate-950 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-slate-800 transition cursor-pointer"
                            title="Delete submission record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: USER MANAGEMENT                                            */}
        {/* ================================================================= */}
        {activeTab === 'user-management' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">User Management</h2>
                  <p className="text-xs text-slate-400">
                    View user Email, Account ID &amp; Password. Suspend/Unsuspend, Answer questions &amp; Reset passwords.
                  </p>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ALL', 'approved', 'suspended', 'pending'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setUserFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      userFilterStatus === st
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by User Email, Name, or 10-digit Account ID..."
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* User List Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Account ID</th>
                      <th className="py-3 px-4">Password</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          No users found matching your search or filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((user) => {
                        const isPasswordRevealed = !!revealedPasswords[user.id];
                        const displayPass = user.password || 'Password123';

                        return (
                          <tr key={user.id} className="hover:bg-slate-900/60 transition">
                            {/* User Details */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-xs sm:text-sm">{user.name}</div>
                              <div className="text-slate-400 text-xs font-mono">{user.email}</div>
                              {user.phoneOrTelegram && (
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Contact: {user.phoneOrTelegram}
                                </div>
                              )}
                            </td>

                            {/* Account ID (10 digits) */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-xs">
                                <span>{user.accountCode || getDedicatedAccountCode(user.email)}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(user.accountCode || getDedicatedAccountCode(user.email), 'Account ID')}
                                  className="text-indigo-400 hover:text-white p-0.5 cursor-pointer"
                                  title="Copy Account ID"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Password (Visible directly / Toggle) */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs">
                                <span>{isPasswordRevealed ? displayPass : '••••••••'}</span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(user.id)}
                                  className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
                                  title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                                >
                                  {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-indigo-400" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(displayPass, 'Password')}
                                  className="text-slate-400 hover:text-white transition cursor-pointer"
                                  title="Copy Password"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {user.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Approved</span>
                                </span>
                              ) : user.status === 'suspended' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-500/30">
                                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                                  <span>Suspended</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            {/* Actions: Suspend/Unsuspend, Answer, Reset Password */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {/* 1. Suspend / Unsuspend */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspend(user)}
                                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 border ${
                                    user.status === 'approved'
                                      ? 'bg-rose-950/80 text-rose-300 hover:bg-rose-900 border-rose-500/30'
                                      : 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border-emerald-500/30'
                                  }`}
                                  title={user.status === 'approved' ? 'Suspend User' : 'Unsuspend User'}
                                >
                                  {user.status === 'approved' ? (
                                    <>
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Suspend</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Unsuspend</span>
                                    </>
                                  )}
                                </button>

                                {/* 2. Answer / Send Message */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickAnswer(user)}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                                  title="Send answer or message to user"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Answer</span>
                                </button>

                                {/* 3. Reset / Create New Password */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenResetModal(user)}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                                  title="Create or reset new password"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                  <span>New Password</span>
                                </button>

                                {/* Delete User */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserAccount(user)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-800 transition cursor-pointer"
                                  title="Delete User Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

            {/* Modal: Reset / Create New Password */}
            {resetModalUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-black text-white text-base">Create New Password</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-xs text-slate-400">
                    Updating password for: <span className="text-white font-bold">{resetModalUser.email}</span>
                  </div>

                  {resetModalError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold">
                      {resetModalError}
                    </div>
                  )}

                  <form onSubmit={handleSaveResetPassword} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">New Password</label>
                        <button
                          type="button"
                          onClick={handleGenerateRandomPassword}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold"
                        >
                          + Generate Random
                        </button>
                      </div>
                      <input
                        type="text"
                        value={resetPasswordInput}
                        onChange={(e) => setResetPasswordInput(e.target.value)}
                        placeholder="Enter new password..."
                        className="w-full px-4 py-2.5 text-xs sm:text-sm font-mono bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setResetModalUser(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                      >
                        Save &amp; Notify User
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Quick Answer / Message */}
            {quickAnswerUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-black text-white text-base">Answer / Send Message</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickAnswerUser(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-xs text-slate-400">
                    Recipient: <span className="text-white font-bold">{quickAnswerUser.email}</span> ({quickAnswerUser.name})
                  </div>

                  <form onSubmit={handleSendQuickAnswer} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Your Message / Answer</label>
                      <textarea
                        rows={4}
                        value={quickAnswerText}
                        onChange={(e) => setQuickAnswerText(e.target.value)}
                        placeholder="Type answer or update message to user... Will be delivered in real-time to their Live Chat."
                        className="w-full p-3 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const target = quickAnswerUser.email;
                          setQuickAnswerUser(null);
                          setActiveChatUserEmail(target);
                          setActiveTab('live-chat');
                        }}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        Open Full Live Chat →
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickAnswerUser(null)}
                          className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Answer</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================================================================= */}
        {/* TAB 3: MANUALLY USER MANAGEMENT                                   */}
        {/* ================================================================= */}
        {activeTab === 'manually-user' && (
          <div className="space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">Manually User Management</h2>
                    <p className="text-xs text-slate-400">
                      Create and activate user accounts with Email &amp; Password. Automatically generates dedicated 10-digit Account ID.
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Banner if user created */}
              {recentlyCreatedUser && (
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-200 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Account Successfully Created &amp; Approved!</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `Account ID: ${recentlyCreatedUser.accountCode} | Email: ${recentlyCreatedUser.email} | Password: ${recentlyCreatedUser.password}`,
                          'All Credentials'
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Credentials</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-emerald-500/30">
                      <span className="text-slate-400 block text-[10px]">Email:</span>
                      <span className="text-white font-bold">{recentlyCreatedUser.email}</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-emerald-500/30">
                      <span className="text-slate-400 block text-[10px]">Password:</span>
                      <span className="text-emerald-300 font-bold">{recentlyCreatedUser.password}</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-emerald-500/30">
                      <span className="text-slate-400 block text-[10px]">Account ID (10 digits):</span>
                      <span className="text-indigo-300 font-bold">{recentlyCreatedUser.accountCode}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {manualError && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              {/* Manual User Creation Form */}
              <form onSubmit={handleCreateManualUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      User Full Name
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="e.g. Rahim Ahmed"
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="e.g. user@gmail.com"
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    />
                  </div>

                  {/* Password with Generator */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Password <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateManualPassword}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        + Generate Password
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="e.g. Pass8291"
                      className="w-full px-4 py-2.5 font-mono text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    />
                  </div>

                  {/* Phone / Telegram */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Phone or Telegram (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="e.g. +8801700000000 or @username"
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Admin Note / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="e.g. Manual VIP user account"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create &amp; Approve User Account</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: USER NOTIFICATION & SITE NOTICE                            */}
        {/* ================================================================= */}
        {activeTab === 'user-notification' && (
          <div className="space-y-6">
            {/* Top Dashboard Marquee Notice Banner Editor */}
            <section className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      Top Dashboard Marquee Notice Banner (ইউজার ড্যাশবোর্ড নোটিশ হেডার)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Edit and publish the moving top marquee announcement banner shown on every user's main dashboard.
                    </p>
                  </div>
                </div>

                {isNoticeSaved && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 animate-pulse">
                    ✓ Published &amp; Live!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveMarqueeNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Notice Banner Text (নোটিশ বার লেখা)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={adminNoticeInput}
                    onChange={(e) => {
                      setAdminNoticeInput(e.target.value);
                      setIsNoticeSaved(false);
                    }}
                    placeholder="e.g. Welcome to SUPER X SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes Active..."
                    className="w-full p-3.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    💡 Tip: Change this notice text anytime. It instantly updates across all user dashboards in real-time.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminNoticeInput("SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active");
                      setIsNoticeSaved(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold border border-slate-700 cursor-pointer"
                  >
                    Default Premium Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminNoticeInput("⚡ Special Offer: All WhatsApp & Telegram Carrier Routes Active 🚀 Contact Admin for Custom Bulk Rates");
                      setIsNoticeSaved(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-slate-700 cursor-pointer"
                  >
                    Special Rates Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminNoticeInput("🛠️ Server Maintenance Update: All carrier API connections are operating smoothly at 100% speed.");
                      setIsNoticeSaved(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold border border-slate-700 cursor-pointer"
                  >
                    Server Status Notice
                  </button>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Save &amp; Publish Notice Banner (নোটিশ সেভ ও পাবলিশ করুন)</span>
                  </button>
                </div>
              </form>
            </section>

            {/* Create Notification Card */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">User Notification Broadcast</h2>
                    <p className="text-xs text-slate-400">
                      Send announcements, system notices, or urgent alerts directly to every user's dashboard notification bell.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleBroadcastNotification} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Notification Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g. সিস্টেম আপডেট - নতুন রেঞ্জ যোগ করা হয়েছে"
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>

                  {/* Priority / Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Notice Type
                    </label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value as any)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    >
                      <option value="update">Update / Announcement</option>
                      <option value="urgent">Urgent / Alert</option>
                      <option value="info">General Info</option>
                    </select>
                  </div>
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Notification Message <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Write detailed notification message that all users will read in their notification drawer..."
                    className="w-full p-4 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>Send Notification to All Users</span>
                </button>
              </form>
            </section>

            {/* List of Sent Notifications */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Active Broadcasted Notifications ({notificationsList.length})
                </h3>
              </div>

              {notificationsList.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No notifications sent yet. Broadcast one using the form above.
                </div>
              ) : (
                <div className="space-y-3">
                  {notificationsList.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              n.type === 'urgent'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                : n.type === 'info'
                                ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {n.type}
                          </span>
                          <span className="font-bold text-white text-sm">{n.title}</span>
                          <span className="text-[11px] text-slate-500">
                            • {new Date(n.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{n.message}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(n.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: LIVE CHAT (REAL-TIME USER MESSAGES & ADMIN REPLY)          */}
        {/* ================================================================= */}
        {activeTab === 'live-chat' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Live Support Chat</h2>
                  <p className="text-xs text-slate-400">
                    Receive all user SMS / support queries in real-time and send instant replies.
                  </p>
                </div>
              </div>

              {adminUnreadCount > 0 && (
                <div className="px-3 py-1 rounded-full bg-rose-950 border border-rose-500/40 text-rose-300 text-xs font-bold">
                  {adminUnreadCount} Unread User Messages
                </div>
              )}
            </div>

            {/* Split Screen Chat Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[550px] max-h-[700px]">
              {/* Left Column: User Conversations List */}
              <div className="md:col-span-4 border-r border-slate-800 bg-slate-950 flex flex-col">
                <div className="p-3 border-b border-slate-800">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                  {chatConversations.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No user conversations yet.
                    </div>
                  ) : (
                    chatConversations.map((conv) => {
                      const isSelected =
                        conv.userEmail.toLowerCase() === activeChatUserEmail.toLowerCase();

                      return (
                        <button
                          key={conv.userEmail}
                          type="button"
                          onClick={() => handleSelectChatUser(conv.userEmail)}
                          className={`w-full text-left p-3.5 transition flex items-start justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-purple-950/60 border-l-4 border-purple-500'
                              : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs truncate">
                                {conv.userName}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {conv.lastMessage?.timestamp
                                  ? new Date(conv.lastMessage.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{conv.userEmail}</div>
                            <div className="text-xs text-slate-300 truncate mt-1">
                              {conv.lastMessage ? conv.lastMessage.text : 'No messages'}
                            </div>
                          </div>

                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                              {conv.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Active Conversation & Reply Input */}
              <div className="md:col-span-8 flex flex-col bg-slate-900">
                {activeChatUserEmail ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-xs">
                          {activeChatUserObj?.name?.charAt(0) || activeChatUserEmail.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {activeChatUserObj?.name || activeChatUserEmail.split('@')[0]}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 font-mono text-indigo-300 border border-indigo-500/30">
                              ID: {activeChatUserObj?.accountCode || getDedicatedAccountCode(activeChatUserEmail)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{activeChatUserEmail}</div>
                        </div>
                      </div>

                      {activeChatUserObj && (
                        <button
                          type="button"
                          onClick={() => handleOpenResetModal(activeChatUserObj)}
                          className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Key className="w-3 h-3" />
                          <span>Reset Password</span>
                        </button>
                      )}
                    </div>

                    {/* Messages Thread */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
                      {currentChatMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                          No messages yet in this conversation.
                        </div>
                      ) : (
                        currentChatMessages.map((msg) => {
                          const isAdmin = msg.sender === 'admin';

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-md rounded-2xl px-4 py-2.5 text-xs ${
                                  isAdmin
                                    ? 'bg-purple-600 text-white rounded-br-xs'
                                    : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700'
                                }`}
                              >
                                <div className="text-[10px] font-bold opacity-75 mb-0.5">
                                  {isAdmin ? 'Admin' : msg.senderName}
                                </div>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                              </div>
                              <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Quick Response Templates */}
                    <div className="px-4 py-1.5 bg-slate-900 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">Quick:</span>
                      {[
                        'Your account has been approved and activated.',
                        'We have reset your password. Please sign in.',
                        'Please check your real-time SMS console.',
                        'Thank you for contacting Super X SMS support.',
                      ].map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendTemplateReply(tmpl)}
                          className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-purple-200 text-[10px] whitespace-nowrap transition cursor-pointer border border-slate-700"
                        >
                          {tmpl}
                        </button>
                      ))}
                    </div>

                    {/* Admin Reply Input Box */}
                    <form onSubmit={handleSendChatReply} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
                      <input
                        type="text"
                        value={adminChatInput}
                        onChange={(e) => setAdminChatInput(e.target.value)}
                        placeholder="Type reply to user (delivers in real-time)..."
                        className="flex-1 px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={!adminChatInput.trim()}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-xs">
                    Select a conversation from the left to read user SMS &amp; send replies.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      {/* Notice Modal */}
      {noticeModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm sm:text-base">
                <Bell className="w-5 h-5" />
                <span>Send Notice to User</span>
              </div>
              <button
                type="button"
                onClick={() => setNoticeModalUser(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              User: <span className="font-bold text-white font-mono">{noticeModalUser.email}</span> ({noticeModalUser.name})
            </p>

            <form onSubmit={handleSendNoticeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Admin Notice Message (ইউজারকে পাঠানোর নোটিশ)
                </label>
                <textarea
                  rows={4}
                  required
                  value={noticeModalText}
                  onChange={(e) => setNoticeModalText(e.target.value)}
                  placeholder="e.g. আপনার দেওয়া ফোন নম্বরটি ভুল ছিল। অনুগ্রহ করে সঠিক নম্বর প্রদান করুন।"
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoticeModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm sm:text-base">
                <UserX className="w-5 h-5" />
                <span>Reject Account Request</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalUser(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Rejecting submission for: <span className="font-bold text-white font-mono">{rejectModalUser.email}</span>
            </p>

            <form onSubmit={handleConfirmRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Reason for Rejection (optional notice)
                </label>
                <textarea
                  rows={3}
                  value={rejectModalReason}
                  onChange={(e) => setRejectModalReason(e.target.value)}
                  placeholder="e.g. Duplicate account attempt or incomplete details submitted."
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
