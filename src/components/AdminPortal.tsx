import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  UserPlus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Sparkles,
  Phone,
  Mail,
  Key,
  KeyRound,
  Calendar,
  X,
  Share2,
  MessageSquare,
  Pencil,
  Send,
  Check,
  Copy,
  MessageCircle,
  Shield,
  Sliders,
  Ban,
  Bell,
  Megaphone,
} from 'lucide-react';
import {
  getAllNotifications,
  addNotification,
  deleteNotification,
  NotificationItem,
} from '../services/notificationService';
import {
  getAllAccounts,
  approveAccount,
  rejectAccount,
  suspendAccount,
  updateUserPermissions,
  deleteAccount,
  requestNewAccount,
  resetAccountPassword,
  UserAccount,
  UserPermissions,
  DEFAULT_USER_PERMISSIONS,
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
import { getMauthApiKey, setMauthApiKey, getVoltxEndpointKey, setVoltxEndpointKey } from '../services/voltxApi';

const ADMIN_MASTER_PASSWORD = 'MUNNA12061';
const ADMIN_SESSION_KEY = 'super_x_admin_session_auth';

interface AdminPortalProps {
  onBackToLogin: () => void;
}

export function AdminPortal({ onBackToLogin }: AdminPortalProps) {
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

  // Admin Data State
  const [accountsList, setAccountsList] = useState<UserAccount[]>(() => getAllAccounts());
  const [filterTab, setFilterTab] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Account Creation Form
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserNote, setNewUserNote] = useState('');
  const [addUserError, setAddUserError] = useState('');

  // Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState<UserAccount | null>(null);
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetError, setResetError] = useState('');

  // Fine-Grained Permissions Modal State
  const [permissionsUser, setPermissionsUser] = useState<UserAccount | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions>(DEFAULT_USER_PERMISSIONS);
  const [tempStatus, setTempStatus] = useState<'approved' | 'pending' | 'rejected' | 'suspended'>('approved');

  const handleOpenPermissionsModal = (user: UserAccount) => {
    setPermissionsUser(user);
    setTempPermissions(user.permissions ? { ...user.permissions } : { ...DEFAULT_USER_PERMISSIONS });
    setTempStatus(user.status);
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionsUser) return;

    updateUserPermissions(permissionsUser.id, tempPermissions);

    if (tempStatus !== permissionsUser.status) {
      if (tempStatus === 'suspended') {
        suspendAccount(permissionsUser.id);
      } else if (tempStatus === 'approved') {
        approveAccount(permissionsUser.id);
      } else if (tempStatus === 'rejected') {
        rejectAccount(permissionsUser.id);
      }
    }

    reloadAccounts();
    setPermissionsUser(null);
    showToast(`Updated permissions & status for ${permissionsUser.email}`);
  };

  const handleSuspend = (id: string, email: string) => {
    const res = suspendAccount(id);
    if (res.success) {
      reloadAccounts();
      showToast(`Account for ${email} has been SUSPENDED!`);
    }
  };

  // Live Support Chat State
  const [isChatCenterOpen, setIsChatCenterOpen] = useState(false);
  const [activeChatUserEmail, setActiveChatUserEmail] = useState<string>('');
  const [adminChatInput, setAdminChatInput] = useState('');
  const [adminUnreadCount, setAdminUnreadCount] = useState<number>(() => getAdminUnreadChatCount());
  const [chatRefreshKey, setChatRefreshKey] = useState(0);

  // VoltxSMS API Key State
  const [adminApiKey, setAdminApiKey] = useState<string>(() => getMauthApiKey());
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

  // Notification Management State
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>(() => getAllNotifications());
  const [newNotifTitle, setNewNotifTitle] = useState('');
  const [newNotifMessage, setNewNotifMessage] = useState('');
  const [newNotifType, setNewNotifType] = useState<NotificationItem['type']>('update');

  const handlePublishNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifTitle.trim() || !newNotifMessage.trim()) return;
    addNotification(newNotifTitle, newNotifMessage, newNotifType);
    setNotificationsList(getAllNotifications());
    setNewNotifTitle('');
    setNewNotifMessage('');
    showToast('📢 Notification broadcasted to all users successfully!');
  };

  const handleDeleteNotif = (id: string) => {
    deleteNotification(id);
    setNotificationsList(getAllNotifications());
    showToast('Notification deleted.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const reloadAccounts = () => {
    setAccountsList(getAllAccounts());
  };

  useEffect(() => {
    const handleAccountsUpdated = () => {
      reloadAccounts();
    };
    const handleChatUpdated = () => {
      setAdminUnreadCount(getAdminUnreadChatCount());
      setChatRefreshKey((k) => k + 1);
    };

    window.addEventListener('super_x_accounts_updated', handleAccountsUpdated);
    window.addEventListener(CHAT_UPDATE_EVENT, handleChatUpdated);

    return () => {
      window.removeEventListener('super_x_accounts_updated', handleAccountsUpdated);
      window.removeEventListener(CHAT_UPDATE_EVENT, handleChatUpdated);
    };
  }, []);

  const handleOpenUserChat = (userEmail: string) => {
    setActiveChatUserEmail(userEmail);
    markChatAsReadByAdmin(userEmail);
    setAdminUnreadCount(getAdminUnreadChatCount());
    setIsChatCenterOpen(true);
  };

  const handleSendAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUserEmail || !adminChatInput.trim()) return;

    sendAdminMessage(activeChatUserEmail, adminChatInput.trim());
    setAdminChatInput('');
    setChatRefreshKey((k) => k + 1);
  };

  const handleQuickSendPasswordInChat = (targetUser: UserAccount) => {
    const randomPass = 'pass' + Math.floor(1000 + Math.random() * 9000);
    resetAccountPassword(targetUser.id, randomPass);
    reloadAccounts();
    sendAdminMessage(
      targetUser.email,
      `Hello ${targetUser.name}, your account password has been reset by Admin to: ${randomPass}. You can now sign in directly!`
    );
    setChatRefreshKey((k) => k + 1);
    showToast(`New password generated (${randomPass}) and sent to ${targetUser.email}`);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanInput = enteredPassword.trim();
    if (!cleanInput) {
      setAuthError('Please enter the Admin Password.');
      return;
    }

    if (cleanInput === ADMIN_MASTER_PASSWORD || cleanInput.toUpperCase() === ADMIN_MASTER_PASSWORD.toUpperCase()) {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch {
        // ignore
      }
      setEnteredPassword('');
      showToast('Admin access granted! Welcome to Master Control.');
    } else {
      setAuthError('Incorrect admin password. Please check your credentials.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const handleApprove = (id: string, email: string) => {
    const res = approveAccount(id);
    if (res.success) {
      reloadAccounts();
      showToast(`User ${email} approved and activated!`);
    } else {
      showToast(res.message);
    }
  };

  const handleReject = (id: string, email: string) => {
    rejectAccount(id, 'Rejected by Admin');
    reloadAccounts();
    showToast(`User ${email} status set to Rejected/Suspended.`);
  };

  const handleDelete = (id: string, email: string) => {
    if (window.confirm(`Are you sure you want to permanently delete account for ${email}?`)) {
      deleteAccount(id);
      reloadAccounts();
      showToast(`Account for ${email} permanently deleted.`);
    }
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');

    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      setAddUserError('Valid email address is required.');
      return;
    }
    if (!newUserPassword.trim() || newUserPassword.length < 4) {
      setAddUserError('Password must be at least 4 characters.');
      return;
    }

    const res = requestNewAccount({
      name: newUserName.trim() || 'New User',
      email: newUserEmail.trim(),
      password: newUserPassword.trim(),
      phoneOrTelegram: newUserPhone.trim(),
      note: newUserNote.trim() || 'Created directly by Admin',
    });

    if (res.success && res.account) {
      // Immediately approve
      approveAccount(res.account.id);
      reloadAccounts();
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhone('');
      setNewUserNote('');
      setIsAddUserModalOpen(false);
      showToast(`User ${res.account.email} created and approved with code: ${res.account.accountCode}`);
    } else {
      setAddUserError(res.message || 'Failed to create user account.');
    }
  };

  const handleOpenResetModal = (user: UserAccount) => {
    setResetModalUser(user);
    setResetNewPass(user.password || '');
    setResetError('');
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetError('');

    const cleanPass = resetNewPass.trim();
    if (!cleanPass || cleanPass.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }

    const res = resetAccountPassword(resetModalUser.id, cleanPass);
    if (res.success) {
      sendAdminMessage(
        resetModalUser.email,
        `🛡️ Password Update: Admin has set your password to: ${cleanPass}. You can now sign in immediately.`
      );
      reloadAccounts();
      showToast(`Password for ${resetModalUser.email} reset to: ${cleanPass}`);
      setResetModalUser(null);
      setResetNewPass('');
    } else {
      setResetError(res.message);
    }
  };

  const pendingCount = accountsList.filter((a) => a.status === 'pending').length;
  const approvedCount = accountsList.filter((a) => a.status === 'approved').length;
  const rejectedCount = accountsList.filter((a) => a.status === 'rejected').length;

  const filteredAccounts = accountsList.filter((acc) => {
    if (filterTab !== 'ALL' && acc.status !== filterTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.accountCode && acc.accountCode.includes(q)) ||
      (acc.phoneOrTelegram && acc.phoneOrTelegram.toLowerCase().includes(q)) ||
      (acc.note && acc.note.toLowerCase().includes(q))
    );
  });

  // -------------------------------------------------------------
  // VIEW 1: ADMIN PASSWORD LOCK SCREEN
  // -------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 75%, #3730a3 100%)',
        }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/20 relative animate-fadeIn">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-inner border border-purple-200">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>SUPER X SMS ADMIN</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Admin Portal Access</h1>
            <p className="text-xs text-gray-500 mt-1">
              Protected administrative area. Enter master password to manage account approvals.
            </p>
          </div>

          {/* Auth Error Banner */}
          {authError && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 ml-1">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter admin password"
                  autoFocus
                  className="w-full px-4 py-3.5 pl-11 pr-11 rounded-2xl border border-gray-300 focus:border-purple-600 focus:ring-4 focus:ring-purple-100 text-gray-900 placeholder-gray-400 text-sm outline-none transition bg-gray-50/50 focus:bg-white shadow-2xs font-mono"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-extrabold text-sm tracking-wider uppercase shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          {/* Back to regular login */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-purple-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to SMS Gateway Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: AUTHENTICATED FULL ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-y-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-semibold border border-white/20 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/30 border border-purple-500/40 rounded-xl text-purple-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight">SUPER X SMS</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Admin Master
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                User Account Requests &amp; SMS Gateway Approvals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBackToLogin}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Go to SMS Portal</span>
            </button>

            <button
              type="button"
              onClick={handleAdminLogout}
              className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-red-500/30"
              title="Lock Admin Session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Lock Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* API Authentication Header (mauthapi) Key Management Box */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <span>API Authentication Header</span>
                  <code className="font-mono text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    mauthapi
                  </code>
                </h2>
                <p className="text-xs text-gray-500">
                  Global VoltxSMS / 2oo9 API Key used to authenticate Live Console and SMS Gateway requests
                </p>
              </div>
            </div>
            {isApiKeySaved && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1 animate-fadeIn">
                <Check className="w-3.5 h-3.5" /> API Key Saved Successfully!
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={adminApiKey}
                onChange={(e) => {
                  setAdminApiKey(e.target.value);
                  setIsApiKeySaved(false);
                }}
                placeholder="Enter your VoltxSMS mauthapi key (e.g., tg_live_8x4f9k2m...)"
                className="w-full px-4 py-2.5 font-mono text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (adminApiKey.trim()) {
                  setMauthApiKey(adminApiKey.trim());
                  setVoltxEndpointKey(adminApiKey.trim());
                  setIsApiKeySaved(true);
                  showToast(`VoltxSMS Real-Time API Key activated: ${adminApiKey.trim()}`);
                  setTimeout(() => setIsApiKeySaved(false), 3000);
                }
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <KeyRound className="w-4 h-4" />
              <span>Update &amp; Activate API Key</span>
            </button>
          </div>
        </div>

        {/* User Notifications & Announcements Broadcast Box */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Broadcast User Notifications &amp; Updates</span>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Live Header Bell
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Publish site-wide announcements, maintenance notices, and feature updates. The header bell icon will glow for users.
              </p>
            </div>
          </div>

          <form onSubmit={handlePublishNotification} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-bold text-gray-700">Notification Title</label>
              <input
                type="text"
                value={newNotifTitle}
                onChange={(e) => setNewNotifTitle(e.target.value)}
                placeholder="e.g. 📢 New Carrier Server Added"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-bold text-gray-700">Message / Update Content</label>
              <input
                type="text"
                value={newNotifMessage}
                onChange={(e) => setNewNotifMessage(e.target.value)}
                placeholder="Write update details for users..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
            <div className="md:col-span-1.5 space-y-1">
              <label className="text-xs font-bold text-gray-700">Category</label>
              <select
                value={newNotifType}
                onChange={(e) => setNewNotifType(e.target.value as NotificationItem['type'])}
                className="w-full px-2 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white font-semibold"
              >
                <option value="update">Update</option>
                <option value="info">Info</option>
                <option value="alert">Alert</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="md:col-span-1.5">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish</span>
              </button>
            </div>
          </form>

          {/* Active Broadcasts List */}
          {notificationsList.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Active Published Notifications ({notificationsList.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {notificationsList.map((notif) => (
                  <div key={notif.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{notif.title}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                          notif.type === 'urgent' ? 'bg-red-100 text-red-700' :
                          notif.type === 'alert' ? 'bg-amber-100 text-amber-800' :
                          notif.type === 'update' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {notif.type}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(notif.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{notif.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotif(notif.id)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition cursor-pointer shrink-0"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Accounts */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Accounts</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{accountsList.length}</div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 p-4 sm:p-5 rounded-2xl border border-amber-300/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Requests</span>
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-900">{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="text-xs font-extrabold text-amber-700 animate-pulse">Needs Review</span>
              )}
            </div>
          </div>

          {/* Approved Users */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved Users</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-800">{approvedCount}</div>
          </div>

          {/* Rejected / Suspended */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Suspended</span>
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-800">{rejectedCount}</div>
          </div>
        </div>

        {/* Action Bar: Controls, Add User Button & Search */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'pending', 'approved', 'rejected'] as const).map((tab) => {
              const isActive = filterTab === tab;
              const count =
                tab === 'ALL'
                  ? accountsList.length
                  : tab === 'pending'
                  ? pendingCount
                  : tab === 'approved'
                  ? approvedCount
                  : rejectedCount;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab === 'ALL' ? 'ALL ACCOUNTS' : tab.toUpperCase()}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, code..."
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white text-xs text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={reloadAccounts}
              title="Refresh List"
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Live Chat Support Button */}
            <button
              type="button"
              onClick={() => {
                const convs = getAllChatConversations();
                if (convs.length > 0) {
                  handleOpenUserChat(convs[0].userEmail);
                } else {
                  setIsChatCenterOpen(true);
                }
              }}
              className="relative px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              title="Open Live Support Chat Console"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Live Support</span>
              {adminUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-extrabold text-[10px] animate-bounce">
                  {adminUnreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Pending Requests Highlight Card (if any pending) */}
        {pendingCount > 0 && filterTab !== 'approved' && filterTab !== 'rejected' && (
          <div className="bg-amber-50/80 rounded-2xl border-2 border-amber-300 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-sm sm:text-base font-extrabold text-amber-950">
                  Pending Account Requests ({pendingCount})
                </h2>
              </div>
              <span className="text-xs text-amber-800 font-medium hidden sm:inline">
                Users waiting for sign in approval
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accountsList
                .filter((a) => a.status === 'pending')
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-gray-900 text-sm">{req.name}</div>
                          <div className="text-xs text-purple-700 font-mono font-bold flex items-center gap-1 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-purple-500" />
                            <span>{req.email}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] uppercase tracking-wider border border-amber-300">
                          Pending
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-gray-100 text-xs space-y-1.5 font-mono text-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-sans">Password:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                              {req.password || '—'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenResetModal(req)}
                              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md transition cursor-pointer"
                              title="Edit / Reset Password"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-sans">Allocated Code:</span>
                          <span className="font-bold text-amber-700">{req.accountCode}</span>
                        </div>
                        {req.phoneOrTelegram && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 font-sans">Contact:</span>
                            <span className="text-gray-800">{req.phoneOrTelegram}</span>
                          </div>
                        )}
                        {req.groupLink && (
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-gray-400 font-sans shrink-0">Group Link:</span>
                            <a
                              href={req.groupLink.startsWith('http') ? req.groupLink : `https://${req.groupLink}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-[200px]"
                            >
                              {req.groupLink}
                            </a>
                          </div>
                        )}
                        {req.note && (
                          <div className="text-[11px] text-gray-700 mt-1 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60 font-sans">
                            <div className="text-[10px] font-bold text-amber-900 mb-0.5">Admin Message:</div>
                            <div className="whitespace-pre-wrap">{req.note}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleApprove(req.id, req.email)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Approve User</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUserChat(req.email)}
                        className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 border border-indigo-200"
                        title="Chat with user"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(req.id, req.email)}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Master Accounts Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
              Registered Accounts ({filteredAccounts.length})
            </h3>
            <span className="text-xs text-gray-500 font-normal">
              Managing credentials, permanent 10-digit codes &amp; status
            </span>
          </div>

          {/* Responsive View: Desktop Table (hidden on small screens) + Mobile Cards (visible on small screens) */}
          {/* 1. Desktop & Tablet Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">User Details</th>
                  <th className="px-4 py-3">Dedicated Code</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">Contact &amp; Note</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs font-medium">
                      No accounts found matching filter or search query.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Name & Email */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900 text-sm">{acc.name}</div>
                        <div className="text-xs text-purple-700 font-mono font-medium">{acc.email}</div>
                        {acc.role === 'admin' && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-black uppercase tracking-wider">
                            MASTER ADMIN
                          </span>
                        )}
                      </td>

                      {/* Account Code */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs">
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>{acc.accountCode}</span>
                        </div>
                      </td>

                      {/* Password with prominent Pencil Edit button */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-900 font-bold text-xs bg-gray-100/90 px-2 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                            {acc.password || '—'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(acc)}
                            className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer shadow-2xs"
                            title="✏️ পেন্সিল: পাসওয়ার্ড পরিবর্তন করুন / Change Password"
                          >
                            <Pencil className="w-3.5 h-3.5 text-purple-700" />
                          </button>
                        </div>
                      </td>

                      {/* Contact, Group Link & Note */}
                      <td className="px-4 py-3.5 text-xs text-gray-600 max-w-xs">
                        {acc.phoneOrTelegram && (
                          <div className="flex items-center gap-1 text-gray-800 font-medium mb-0.5">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{acc.phoneOrTelegram}</span>
                          </div>
                        )}
                        {acc.groupLink && (
                          <div className="flex items-center gap-1 text-blue-600 mb-0.5 truncate">
                            <Share2 className="w-3 h-3 shrink-0" />
                            <a
                              href={acc.groupLink.startsWith('http') ? acc.groupLink : `https://${acc.groupLink}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline truncate"
                              title={acc.groupLink}
                            >
                              {acc.groupLink}
                            </a>
                          </div>
                        )}
                        {acc.note && (
                          <div className="text-[11px] text-gray-500 truncate" title={acc.note}>
                            💬 {acc.note}
                          </div>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{new Date(acc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            acc.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 animate-pulse border border-amber-300'
                              : acc.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : acc.status === 'suspended'
                              ? 'bg-rose-100 text-rose-900 font-bold border border-rose-300 shadow-2xs'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {acc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Fine-Grained Permissions & Status Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPermissionsModal(acc)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold text-[11px] shadow-2xs"
                            title="🛡️ এক এক করে পারমিশন ও স্ট্যাটাস পরিবর্তন করুন (Fine-grained Permissions)"
                          >
                            <Sliders className="w-3.5 h-3.5 text-blue-600" />
                            <span>Perms</span>
                          </button>

                          {/* 2. Prominent Pencil / Edit Password Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(acc)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg transition cursor-pointer flex items-center gap-1.5 font-bold text-xs shadow-2xs group"
                            title="✏️ পেন্সিল: পাসওয়ার্ড পরিবর্তন বা নতুন তৈরি করুন (Reset/Change Password)"
                          >
                            <Pencil className="w-3.5 h-3.5 text-purple-200 group-hover:rotate-12 transition-transform" />
                            <span className="text-[11px]">Pass</span>
                          </button>

                          {/* 3. Live Chat Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenUserChat(acc.email)}
                            className="p-1.5 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition cursor-pointer flex items-center gap-1 font-bold text-xs"
                            title="💬 Live Chat with this user"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                          </button>

                          {/* 4. Approve / Reject / Suspend */}
                          {acc.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(acc.id, acc.email)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(acc.id, acc.email)}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-lg transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {acc.status === 'approved' && acc.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleSuspend(acc.id, acc.email)}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-lg transition cursor-pointer border border-rose-200"
                              title="Suspend this user"
                            >
                              Suspend
                            </button>
                          )}

                          {acc.status === 'suspended' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(acc.id, acc.email)}
                              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-lg transition cursor-pointer border border-emerald-200"
                              title="Un-suspend & Activate User"
                            >
                              Activate
                            </button>
                          )}

                          {acc.status === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(acc.id, acc.email)}
                              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-lg transition cursor-pointer"
                            >
                              Re-Approve
                            </button>
                          )}

                          {/* 4. Delete Account */}
                          {acc.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(acc.id, acc.email)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition cursor-pointer rounded-lg hover:bg-red-50"
                              title="Delete user permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 2. Mobile Cards View (Optimized for Mobile Phone Screens) */}
          <div className="block md:hidden divide-y divide-gray-100">
            {filteredAccounts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs font-medium">
                No accounts found matching filter or search query.
              </div>
            ) : (
              filteredAccounts.map((acc) => (
                <div key={acc.id} className="p-4 space-y-3 bg-white hover:bg-gray-50/60 transition">
                  {/* Header: Name, Email & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        {acc.role === 'admin' && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9px] font-black uppercase tracking-wider">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-purple-700 font-mono font-medium">{acc.email}</div>
                    </div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        acc.status === 'pending'
                          ? 'bg-amber-100 text-amber-900 animate-pulse border border-amber-300'
                          : acc.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      {acc.status}
                    </span>
                  </div>

                  {/* Account Code & Password Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-col justify-center">
                      <span className="text-[10px] text-amber-800 font-medium">Dedicated Code:</span>
                      <span className="font-mono font-bold text-amber-950 text-xs">{acc.accountCode}</span>
                    </div>

                    <div className="p-2 bg-purple-50/80 rounded-xl border border-purple-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-purple-700 font-medium block">Password:</span>
                        <span className="font-mono font-bold text-gray-900 text-xs truncate max-w-[80px]">
                          {acc.password || '—'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenResetModal(acc)}
                        className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer shadow-2xs"
                        title="✏️ পেন্সিল: পাসওয়ার্ড তৈরি/পরিবর্তন করুন"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact / Note if present */}
                  {(acc.phoneOrTelegram || acc.note || acc.groupLink) && (
                    <div className="text-[11px] text-gray-600 space-y-1 bg-gray-50 p-2 rounded-xl border border-gray-200/70">
                      {acc.phoneOrTelegram && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-medium text-gray-800">{acc.phoneOrTelegram}</span>
                        </div>
                      )}
                      {acc.note && (
                        <div className="text-gray-600 truncate">
                          💬 {acc.note}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prominent Action Toolbar with Pencil Password Button on Mobile */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    {/* Pencil Button for changing password */}
                    <button
                      type="button"
                      onClick={() => handleOpenResetModal(acc)}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-purple-200" />
                      <span>Edit Password</span>
                    </button>

                    {/* Chat Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenUserChat(acc.email)}
                      className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Live Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>

                    {/* Status Toggle (Approve / Suspend) */}
                    {acc.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(acc.id, acc.email)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {acc.status === 'approved' && acc.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleReject(acc.id, acc.email)}
                        className="py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Suspend
                      </button>
                    )}

                    {/* Delete */}
                    {acc.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id, acc.email)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* -------------------- MODAL: ADMIN RESET USER PASSWORD -------------------- */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-purple-100 overflow-hidden flex flex-col animate-scaleUp">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-white/20">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Reset User Password</h3>
                  <p className="text-[11px] text-purple-200 truncate max-w-[200px]">
                    {resetModalUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4 text-xs">
              {resetError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-1">
                <div className="text-[11px] text-gray-500 font-sans">Target User:</div>
                <div className="font-bold text-gray-900 text-sm">{resetModalUser.name}</div>
                <div className="text-purple-700 font-mono font-medium">{resetModalUser.email}</div>
                <div className="text-[11px] text-amber-800 font-mono font-bold mt-1">
                  Code: {resetModalUser.accountCode}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>New Password <span className="text-red-500">*</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = 'pass' + Math.floor(1000 + Math.random() * 9000);
                      setResetNewPass(randomPass);
                    }}
                    className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    Generate Random
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-xs sm:text-sm text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500 font-mono pl-9"
                  />
                  <Lock className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Once reset, the user can immediately log in with this new password.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: FINE-GRAINED USER PERMISSIONS & STATUS -------------------- */}
      {permissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-scaleUp max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-300" />
                <h3 className="font-extrabold text-base">User Permissions &amp; Access Control</h3>
              </div>
              <button
                type="button"
                onClick={() => setPermissionsUser(null)}
                className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900 text-sm">{permissionsUser.name}</div>
                  <div className="text-blue-700 font-mono font-medium text-xs">{permissionsUser.email}</div>
                  <div className="text-[11px] text-amber-800 font-mono font-bold mt-0.5">
                    Account Code: {permissionsUser.accountCode}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-medium block">Current Status</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      permissionsUser.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : permissionsUser.status === 'suspended'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {permissionsUser.status}
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">Account Status Control</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempStatus('approved')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      tempStatus === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempStatus('suspended')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      tempStatus === 'suspended'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspended</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempStatus('pending')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      tempStatus === 'pending'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempStatus('rejected')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      tempStatus === 'rejected'
                        ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Rejected</span>
                  </button>
                </div>
              </div>

              {/* Toggle Switches for individual feature permissions */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="block font-bold text-gray-800 text-xs mb-1">
                  Feature Permissions (এক এক করে পারমিশন কন্ট্রোল)
                </label>

                {[
                  { key: 'canGetNumber', label: 'Allocate Carrier Numbers (Get Number)', desc: 'Allow user to allocate mobile numbers' },
                  { key: 'canAccessRange', label: 'Number Range Search', desc: 'Allow searching specific number ranges' },
                  { key: 'canAccessAccessList', label: 'Access List Tab', desc: 'Allow viewing carrier access list' },
                  { key: 'canAccessConsole', label: 'Voltx Console', desc: 'Allow raw Voltx API console access' },
                  { key: 'canAccessSummary', label: 'Summary Statistics', desc: 'Allow viewing summary stats dashboard' },
                  { key: 'canAccess2oo9', label: '2oo9 Terminal', desc: 'Allow terminal command interface' },
                  { key: 'canChat', label: 'Live Support Chat', desc: 'Allow sending live chat messages to admin' },
                ].map((item) => {
                  const isChecked = tempPermissions[item.key as keyof UserPermissions] ?? true;
                  return (
                    <div
                      key={item.key}
                      onClick={() =>
                        setTempPermissions((prev) => ({
                          ...prev,
                          [item.key]: !isChecked,
                        }))
                      }
                      className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-200 flex items-center justify-between cursor-pointer transition select-none"
                    >
                      <div>
                        <div className="font-bold text-gray-900 text-xs">{item.label}</div>
                        <div className="text-[10px] text-gray-500">{item.desc}</div>
                      </div>
                      <div
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          isChecked ? 'bg-emerald-600' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            isChecked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPermissionsUser(null)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Save Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: DIRECT USER CREATION FORM -------------------- */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-scaleUp">
            <div className="p-4 sm:p-5 bg-purple-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Add New Approved User</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-3.5 text-xs">
              {addUserError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addUserError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Password *</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Set account password"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Phone / Telegram Contact</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+8801... or @telegram"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Admin Note (Optional)</label>
                <input
                  type="text"
                  value={newUserNote}
                  onChange={(e) => setNewUserNote(e.target.value)}
                  placeholder="VIP client, tested on demo, etc."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                >
                  Create &amp; Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: LIVE SUPPORT & ADMIN CHAT CONSOLE -------------------- */}
      {isChatCenterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] max-h-[720px] shadow-2xl border border-indigo-100 overflow-hidden flex flex-col animate-scaleUp">
            {/* Chat Modal Top Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-violet-950 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20">
                  <MessageSquare className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg">Live Support &amp; User Chat Center</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase">
                      Admin Online
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200">
                    Real-time support, password recovery assistance &amp; approvals
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatCenterOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body: Split View (Conversations List + Chat Box) */}
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-gray-50">
              {/* Left Side: Conversations / User Selector */}
              <div className="w-full sm:w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
                <div className="p-3 border-b border-gray-200 bg-gray-50/70">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center justify-between">
                    <span>User Conversations</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px]">
                      {getAllChatConversations().length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {getAllChatConversations().length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      <MessageCircle className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                      <p>No chat messages yet.</p>
                      <p className="text-[10px] mt-1 text-gray-400">
                        When users send a message from the login modal, it will appear here.
                      </p>
                    </div>
                  ) : (
                    getAllChatConversations().map((conv) => {
                      const isSelected = activeChatUserEmail.toLowerCase() === conv.userEmail.toLowerCase();
                      const userAcc = accountsList.find((a) => a.email.toLowerCase() === conv.userEmail.toLowerCase());
                      return (
                        <button
                          key={conv.userEmail}
                          type="button"
                          onClick={() => {
                            setActiveChatUserEmail(conv.userEmail);
                            markChatAsReadByAdmin(conv.userEmail);
                            setAdminUnreadCount(getAdminUnreadChatCount());
                          }}
                          className={`w-full text-left p-3 transition cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-indigo-50/90 border-l-4 border-indigo-600'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {conv.userName || conv.userEmail}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="text-[11px] text-purple-700 font-mono truncate">
                            {conv.userEmail}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span className="truncate max-w-[150px]">
                              {conv.lastMessage.sender === 'admin' ? 'You: ' : ''}
                              {conv.lastMessage.text}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-extrabold text-[9px] shrink-0">
                                {conv.unreadCount} new
                              </span>
                            )}
                          </div>

                          {userAcc && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                  userAcc.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {userAcc.status}
                              </span>
                              <span className="text-gray-400 font-mono font-medium">
                                Pass: {userAcc.password || '—'}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Side: Active Chat Thread */}
              <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                {activeChatUserEmail ? (
                  <>
                    {/* User Info & Quick Action Bar */}
                    {(() => {
                      const targetUser = accountsList.find(
                        (a) => a.email.toLowerCase() === activeChatUserEmail.toLowerCase()
                      );
                      return (
                        <div className="p-3 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {targetUser ? targetUser.name.charAt(0).toUpperCase() : activeChatUserEmail.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-xs text-gray-900 flex items-center gap-1.5">
                                <span>{targetUser ? targetUser.name : activeChatUserEmail}</span>
                                {targetUser && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                      targetUser.status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {targetUser.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2">
                                <span>{activeChatUserEmail}</span>
                                {targetUser && (
                                  <span className="text-purple-700 font-bold">
                                    Current Pass: {targetUser.password || '—'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Admin Actions */}
                          <div className="flex items-center gap-1.5">
                            {targetUser && targetUser.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleApprove(targetUser.id, targetUser.email)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {targetUser && (
                              <button
                                type="button"
                                onClick={() => handleQuickSendPasswordInChat(targetUser)}
                                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                                title="Generate a new password and send directly to this user via chat"
                              >
                                <Pencil className="w-3.5 h-3.5 text-purple-700" />
                                <span>Reset &amp; Send Pass</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Messages Scroll Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                      {getChatMessagesForUser(activeChatUserEmail).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                          <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                          <p className="text-xs font-semibold text-gray-600">No chat messages with this user yet.</p>
                          <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                            Type a message below to send direct assistance, password reset info, or portal instructions.
                          </p>
                        </div>
                      ) : (
                        getChatMessagesForUser(activeChatUserEmail).map((msg) => {
                          const isAdmin = msg.sender === 'admin';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400">
                                <span className="font-bold text-gray-700">
                                  {isAdmin ? '🛡️ Super Admin' : `👤 ${msg.senderName || 'User'}`}
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
                                className={`px-3.5 py-2.5 rounded-2xl max-w-sm sm:max-w-md text-xs leading-relaxed break-words shadow-2xs ${
                                  isAdmin
                                    ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-white rounded-tr-xs'
                                    : 'bg-white text-gray-900 border border-gray-200 rounded-tl-xs'
                                }`}
                              >
                                {msg.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Chat Input Bar */}
                    <form
                      onSubmit={handleSendAdminReply}
                      className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={adminChatInput}
                        onChange={(e) => setAdminChatInput(e.target.value)}
                        placeholder={`Type reply to ${activeChatUserEmail}...`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-300 text-xs text-gray-900 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="submit"
                        disabled={!adminChatInput.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
                    <MessageSquare className="w-12 h-12 text-indigo-200 mb-2" />
                    <p className="text-sm font-bold text-gray-700">Select a user conversation from the left</p>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                      You can reply to user inquiries in real-time, issue new passwords, and confirm account approvals.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
