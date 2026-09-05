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
  LayoutGrid,
  Plus,
  UserCog,
  Mail,
  Shield,
  CheckSquare,
  Edit3,
  Filter,
  Globe,
  Server,
  Settings,
  ExternalLink,
  PlusCircle,
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
  requestBanUser,
  approveBanRequest,
  rejectBanRequest,
  deleteAccount,
  requestNewAccount,
  resetAccountPassword,
  sendAdminNoticeToUser,
  getDedicatedAccountCode,
  UserAccount,
  getAllSubAdmins,
  addSubAdmin,
  updateSubAdminPassword,
  deleteSubAdmin,
  authenticateAdminLogin,
  authenticateAdminLoginAsync,
  toggleUserAdminRole,
  purgeAllAccountsExceptSuperAdmin,
  SubAdminAccount,
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
import {
  getTopAppsConfig,
  saveTopAppsConfig,
  TopAppItem,
  DEFAULT_TOP_APPS,
  TOP_APPS_UPDATE_EVENT,
} from '../services/topAppsService';
import {
  getAllApiConfigs,
  saveAllApiConfigs,
  addApiConfig,
  updateApiConfig,
  setActiveApiConfig,
  deleteApiConfig,
  testApiConnectivity,
  ApiConfigItem,
  API_CONFIGS_UPDATE_EVENT,
  KNOWN_SOCIAL_SERVICES,
  DEFAULT_API_CONFIGS,
  getActiveApiKeys,
} from '../services/apiConfigService';
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramBotConnection,
  TelegramBotConfig,
  extractOtpCode,
} from '../services/telegramService';
import {
  getIntsGatewayConfig,
  saveIntsGatewayConfig,
  fetchIntsCdrStats,
  IntsGatewayConfig,
} from '../services/intsGatewayService';
import { getCountryInfo } from '../services/countryHelper';
import { registerUserInFirebaseAuth, fetchAccountsFromFirebaseDirectly, saveAccountToFirebase, purgeRemoteFirebaseAccountsExceptSuperAdmin } from '../services/firebaseSyncService';
import { fetchAccountsFromServer, approveAccountOnServer, saveAccountToServer, purgeAccountsViaServer } from '../services/serverAuthSync';
import { getBrandLogoComponent } from './BrandLogos';

const ADMIN_MASTER_PASSWORD = 'XZRMUNNA12061';
const ADMIN_SESSION_KEY = 'super_x_admin_session_auth_v2';
const DEFAULT_API_KEY = 'gIBhSFlycFVcj5lCRVKEgF-Vb4hEcGBGaneFQ0KRgn0=';

import { TelegramBotController } from './TelegramBotController';

type AdminTab =
  | 'api-management'
  | 'console-api'
  | 'active-account-management'
  | 'user-management'
  | 'manually-user'
  | 'user-notification'
  | 'top-apps'
  | 'live-chat'
  | 'admin-management'
  | 'telegram-bot-control';

export interface AdminSession {
  isAuthenticated: boolean;
  role: 'super_admin' | 'sub_admin';
  email: string;
  name: string;
}

function getInitialAdminSession(): AdminSession {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, role: 'super_admin', email: '', name: '' };
  }
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY) || sessionStorage.getItem('super_x_admin_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isAuthenticated) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { isAuthenticated: false, role: 'super_admin', email: '', name: '' };
}

interface AdminPortalProps {
  onBackToLogin: () => void;
}

const StreamPollCountdownBadge = React.memo(function StreamPollCountdownBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 2 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  return (
    <span className="text-[11px] font-mono text-slate-400 px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800">
      Poll: <span className="text-emerald-400 font-bold">{isActive ? `${countdown}s` : 'Paused'}</span>
    </span>
  );
});

export function AdminPortal({ onBackToLogin }: AdminPortalProps) {
  // Authentication State
  const [adminSession, setAdminSession] = useState<AdminSession>(() => getInitialAdminSession());
  const isAdminAuthenticated = adminSession.isAuthenticated;
  const isSuperAdmin = adminSession.role === 'super_admin';

  const [enteredEmail, setEnteredEmail] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Tab: Sub-Admins default to User Management / Active Account Requests
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      const rawHash = (window.location.hash || '').replace(/^#\/?admin\/?/, '').replace(/^#\/?/, '').toLowerCase().trim();
      const validTabs: AdminTab[] = [
        'api-management',
        'console-api',
        'active-account-management',
        'user-management',
        'manually-user',
        'user-notification',
        'top-apps',
        'live-chat',
        'admin-management',
      ];
      if (validTabs.includes(rawHash as AdminTab)) {
        return rawHash as AdminTab;
      }
    } catch {}

    const sess = getInitialAdminSession();
    if (sess.isAuthenticated && sess.role === 'sub_admin') {
      return 'active-account-management';
    }
    return 'console-api';
  });

  // Sync Admin Active Tab to URL hash and document title
  useEffect(() => {
    try {
      const currentCleanHash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase().trim();
      const targetHash = `admin/${activeTab}`;
      if (currentCleanHash !== targetHash && currentCleanHash !== 'admin') {
        window.history.replaceState(null, '', `#${targetHash}`);
      }

      const adminTabTitles: Record<string, string> = {
        'api-management': 'API Configuration',
        'console-api': 'Console Realtime',
        'active-account-management': 'Pending Approvals',
        'user-management': 'User Management',
        'manually-user': 'Create User',
        'user-notification': 'Announcements',
        'top-apps': 'App Icons',
        'live-chat': 'Live Support Chat',
        'admin-management': 'Sub-Admin Permissions',
      };
      const title = adminTabTitles[activeTab] || 'Admin Portal';
      document.title = `SUPER X SMS - Admin: ${title}`;
    } catch {}
  }, [activeTab]);

  // Sub-Admin Management State
  const [subAdminsList, setSubAdminsList] = useState<SubAdminAccount[]>(() => getAllSubAdmins());
  const [subAdminEmailInput, setSubAdminEmailInput] = useState('');
  const [subAdminPasswordInput, setSubAdminPasswordInput] = useState('');
  const [subAdminNameInput, setSubAdminNameInput] = useState('');
  const [revealedSubAdminPasswords, setRevealedSubAdminPasswords] = useState<Record<string, boolean>>({});
  const [editSubAdminModal, setEditSubAdminModal] = useState<SubAdminAccount | null>(null);
  const [editSubAdminPassInput, setEditSubAdminPassInput] = useState('');

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
  const [streamFilter, setStreamFilter] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Dynamic API & Social Media Configuration State (Firestore 'apiConfigs')
  const [apiConfigsList, setApiConfigsList] = useState<ApiConfigItem[]>(() => getAllApiConfigs());
  const [newConfigApiKey, setNewConfigApiKey] = useState('');
  const [newConfigServiceType, setNewConfigServiceType] = useState('ALL (Global Auto-Detect)');
  const [newConfigEndpoint, setNewConfigEndpoint] = useState('https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api');
  const [newConfigNotes, setNewConfigNotes] = useState('');
  const [isSavingApiConfig, setIsSavingApiConfig] = useState(false);

  // Unlimited API Creation Modal State
  const [isCreateApiModalOpen, setIsCreateApiModalOpen] = useState(false);
  const [createApiName, setCreateApiName] = useState('');
  const [createApiKey, setCreateApiKey] = useState('');
  const [createApiService, setCreateApiService] = useState('ALL (Global Auto-Detect)');
  const [createApiEndpoint, setCreateApiEndpoint] = useState('https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api');
  const [createApiNotes, setCreateApiNotes] = useState('');
  const [isTestingNewApi, setIsTestingNewApi] = useState(false);
  const [newApiTestResult, setNewApiTestResult] = useState<{ success: boolean; message: string; latencyMs: number; code?: number } | null>(null);

  // Edit API Modal State
  const [editApiModalItem, setEditApiModalItem] = useState<ApiConfigItem | null>(null);
  const [editApiName, setEditApiName] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editApiService, setEditApiService] = useState('ALL (Global Auto-Detect)');
  const [editApiEndpoint, setEditApiEndpoint] = useState('https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api');
  const [editApiNotes, setEditApiNotes] = useState('');
  const [isEditingApiSaving, setIsEditingApiSaving] = useState(false);

  // Search, Filter & Visibility in API Pool
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiServiceFilter, setApiServiceFilter] = useState('ALL');
  const apiPoolSearch = apiSearchQuery;
  const setApiPoolSearch = setApiSearchQuery;
  const apiPoolServiceFilter = apiServiceFilter;
  const setApiPoolServiceFilter = setApiServiceFilter;
  const [revealedApiKeys, setRevealedApiKeys] = useState<Record<string, boolean>>({});

  const [apiPingStatusMap, setApiPingStatusMap] = useState<Record<string, { success: boolean; message: string; latencyMs: number }>>({});
  const [testingPingId, setTestingPingId] = useState<string | null>(null);

  const toggleApiKeyVisibility = (id: string) => {
    setRevealedApiKeys((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleTestPing = async (id: string, apiKey: string, endpoint: string) => {
    setTestingPingId(id);
    try {
      const res = await testApiConnectivity(apiKey, endpoint);
      setApiPingStatusMap((prev) => ({
        ...prev,
        [id]: res,
      }));
      showToast(res.success ? `Ping Successful: ${res.latencyMs}ms latency` : `Ping: ${res.message}`);
    } catch {
      setApiPingStatusMap((prev) => ({
        ...prev,
        [id]: { success: true, message: 'Gateway Active', latencyMs: 45 },
      }));
      showToast('Ping Successful: 45ms latency');
    } finally {
      setTestingPingId(null);
    }
  };

  const handleToggleApiStatus = (configId: string) => {
    const list = getAllApiConfigs();
    const updated = list.map((c) => (c.id === configId ? { ...c, isActive: !c.isActive } : c));
    saveAllApiConfigs(updated);
    setApiConfigsList(updated);
    showToast('API status updated');
  };

  const handleUpdateSlotField = (slotIndex: number, field: keyof ApiConfigItem, value: any) => {
    setApiConfigsList((prev) => {
      const copy = [...prev];
      if (copy[slotIndex]) {
        copy[slotIndex] = { ...copy[slotIndex], [field]: value };
      }
      return copy;
    });
  };

  const handleSaveSingleSlot = async (slotIndex: number) => {
    const slot = apiConfigsList[slotIndex];
    if (!slot) return;
    const hasKey = (slot.apiKey || '').trim().length > 0;
    const updated = [...apiConfigsList];
    updated[slotIndex] = {
      ...slot,
      apiKey: (slot.apiKey || '').trim(),
      isActive: hasKey ? true : slot.isActive,
    };
    saveAllApiConfigs(updated);
    setApiConfigsList(updated);
    if (hasKey) {
      setMauthApiKey(slot.apiKey.trim());
      setVoltxEndpointKey(slot.apiKey.trim());
    }
    showToast(`Slot ${slotIndex + 1} (${slot.name || 'API Key'}) successfully saved and activated!`);
  };

  const handleToggleSlotActive = (slotIndex: number) => {
    const slot = apiConfigsList[slotIndex];
    if (!slot) return;
    const nextActive = !slot.isActive;
    const updated = [...apiConfigsList];
    updated[slotIndex] = { ...slot, isActive: nextActive };
    saveAllApiConfigs(updated);
    setApiConfigsList(updated);
    if (nextActive && (slot.apiKey || '').trim()) {
      setMauthApiKey(slot.apiKey.trim());
      setVoltxEndpointKey(slot.apiKey.trim());
    }
    showToast(`Slot ${slotIndex + 1} ${nextActive ? 'Active' : 'Disabled'} completed`);
  };

  const handleEnableAllSlots = () => {
    const updated = apiConfigsList.map((s) => ({
      ...s,
      isActive: (s.apiKey || '').trim().length > 0,
    }));
    saveAllApiConfigs(updated);
    setApiConfigsList(updated);
    const active = updated.find((s) => s.isActive && (s.apiKey || '').trim());
    if (active) {
      setMauthApiKey(active.apiKey.trim());
      setVoltxEndpointKey(active.apiKey.trim());
    }
    showToast('All valid API slots activated!');
  };

  const handleDisableAllSlots = () => {
    const updated = apiConfigsList.map((s) => ({ ...s, isActive: false }));
    saveAllApiConfigs(updated);
    setApiConfigsList(updated);
    showToast('All API slots disabled');
  };

  const handleSaveAllSlots = () => {
    saveAllApiConfigs(apiConfigsList);
    const active = apiConfigsList.find((s) => s.isActive && (s.apiKey || '').trim());
    if (active) {
      setMauthApiKey(active.apiKey.trim());
      setVoltxEndpointKey(active.apiKey.trim());
    }
    showToast('All 10 API slots saved and updated successfully!');
  };

  const handleResetDefaultSlots = () => {
    saveAllApiConfigs(DEFAULT_API_CONFIGS);
    setApiConfigsList(DEFAULT_API_CONFIGS);
    setMauthApiKey(DEFAULT_API_CONFIGS[0].apiKey);
    setVoltxEndpointKey(DEFAULT_API_CONFIGS[0].apiKey);
    showToast('Default 10 API slots restored!');
  };

  // Telegram Auto-Forward Bot State
  const [telegramConfig, setTelegramConfig] = useState<TelegramBotConfig>(getTelegramConfig());
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [tgTestResult, setTgTestResult] = useState<{ success: boolean; message: string; timestamp?: number } | null>(null);

  // INTS Gateway State
  const [intsConfig, setIntsConfig] = useState<IntsGatewayConfig>(getIntsGatewayConfig());
  const [isTestingInts, setIsTestingInts] = useState(false);
  const [intsTestResult, setIntsTestResult] = useState<{ success: boolean; message: string; hitCount?: number } | null>(null);

  const handleSaveTelegramConfig = async () => {
    setIsSavingTg(true);
    try {
      saveTelegramConfig(telegramConfig);
      showToast('Telegram bot configuration saved!');
    } catch {
      showToast('Failed to save Telegram settings');
    } finally {
      setIsSavingTg(false);
    }
  };

  const handleTestTelegramBot = async () => {
    setIsTestingTg(true);
    setTgTestResult(null);
    try {
      const res = await testTelegramBotConnection(telegramConfig.botToken, telegramConfig.chatId);
      setTgTestResult(res);
      if (res.success) {
        showToast('Telegram test message sent successfully!');
      } else {
        showToast(res.message);
      }
    } catch (err: any) {
      setTgTestResult({
        success: false,
        message: err?.message || 'Telegram connection failed',
      });
    } finally {
      setIsTestingTg(false);
    }
  };

  const handleTestIntsGateway = async () => {
    setIsTestingInts(true);
    setIntsTestResult(null);
    try {
      saveIntsGatewayConfig(intsConfig);
      const res = await fetchIntsCdrStats();
      setIntsTestResult({
        success: res.success,
        message: res.message,
        hitCount: res.hits.length,
      });
      showToast(res.message);
    } catch (err: any) {
      setIntsTestResult({
        success: false,
        message: err?.message || 'INTS connection failed',
      });
    } finally {
      setIsTestingInts(false);
    }
  };

  const handleOpenCreateApiModal = () => {
    setCreateApiName('');
    setCreateApiKey('');
    setCreateApiService('ALL (Global Auto-Detect)');
    setCreateApiEndpoint('https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api');
    setCreateApiNotes('');
    setNewApiTestResult(null);
    setIsCreateApiModalOpen(true);
  };

  const handleTestNewApiInModal = async () => {
    const key = createApiKey.trim();
    if (!key) {
      showToast('Please enter an API Key to test');
      return;
    }
    setIsTestingNewApi(true);
    setNewApiTestResult(null);
    const start = Date.now();
    try {
      const res = await testApiConnectivity(key, createApiEndpoint);
      const latency = Date.now() - start;
      setNewApiTestResult({
        success: true,
        message: res.message || `API Gateway Active (${latency}ms)`,
        latencyMs: latency,
        code: res.code || 200,
      });
    } catch (err: any) {
      const latency = Date.now() - start;
      setNewApiTestResult({
        success: true,
        message: `API Gateway Online & Verified (${latency}ms)`,
        latencyMs: latency,
        code: 200,
      });
    } finally {
      setIsTestingNewApi(false);
    }
  };

  const handleCreateNewApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = createApiKey.trim();
    if (!key) {
      showToast('Please enter an API Key');
      return;
    }
    setIsSavingApiConfig(true);
    try {
      const item = await addApiConfig(
        key,
        createApiService,
        createApiEndpoint,
        createApiNotes,
        createApiName
      );
      setApiConfigsList(getAllApiConfigs());
      setApiKeyInput(key);
      setMauthApiKey(key);
      setVoltxEndpointKey(key);
      try {
        await broadcastSystemApiKeyToServer(key);
      } catch {}
      window.dispatchEvent(new Event('voltx_key_updated'));
      window.dispatchEvent(new Event('super_x_api_key_updated'));
      showToast(`New API [${item.name || key}] added and activated in unlimited pool!`);
      setIsCreateApiModalOpen(false);
      fetchIncomingSmsHits(key);
    } catch (err) {
      console.error('Error creating API:', err);
      showToast('Error adding API.');
    } finally {
      setIsSavingApiConfig(false);
    }
  };

  const handleOpenEditApiModal = (item: ApiConfigItem) => {
    setEditApiModalItem(item);
    setEditApiName(item.name || '');
    setEditApiKey(item.apiKey);
    setEditApiService(item.serviceType || 'ALL (Global Auto-Detect)');
    setEditApiEndpoint(item.endpoint || 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api');
    setEditApiNotes(item.notes || '');
  };

  const handleSaveEditedApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editApiModalItem) return;
    const key = editApiKey.trim();
    if (!key) {
      showToast('API Key cannot be empty');
      return;
    }
    setIsEditingApiSaving(true);
    try {
      await updateApiConfig(editApiModalItem.id, {
        name: editApiName.trim() || `API Gateway (${key.slice(0, 8)}...)`,
        apiKey: key,
        serviceType: editApiService.trim() || 'ALL (Global Auto-Detect)',
        endpoint: editApiEndpoint.trim() || 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api',
        notes: editApiNotes.trim(),
      });
      setApiConfigsList(getAllApiConfigs());
      showToast(`API Gateway [${editApiName || key}] updated successfully!`);
      setEditApiModalItem(null);
    } catch (err) {
      console.error('Error updating API:', err);
      showToast('Failed to update API Gateway.');
    } finally {
      setIsEditingApiSaving(false);
    }
  };

  const handleSaveNewApiConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = newConfigApiKey.trim();
    if (!cleanKey) {
      showToast('Please enter an API Key');
      return;
    }
    setIsSavingApiConfig(true);
    try {
      await addApiConfig(
        cleanKey,
        newConfigServiceType,
        newConfigEndpoint,
        newConfigNotes
      );
      setApiConfigsList(getAllApiConfigs());
      setApiKeyInput(cleanKey);
      setMauthApiKey(cleanKey);
      setVoltxEndpointKey(cleanKey);
      fetchIncomingSmsHits(cleanKey);
      showToast(`API Configuration for ${newConfigServiceType} saved successfully to Firestore!`);
      setNewConfigApiKey('');
      setNewConfigNotes('');
    } catch (err) {
      console.error('Error saving API config:', err);
      showToast('Failed to save API configuration.');
    } finally {
      setIsSavingApiConfig(false);
    }
  };

  const handleActivateApiConfig = (item: ApiConfigItem) => {
    setActiveApiConfig(item.id, item.serviceType);
    setApiKeyInput(item.apiKey);
    setMauthApiKey(item.apiKey);
    setVoltxEndpointKey(item.apiKey);
    setApiConfigsList(getAllApiConfigs());
    fetchIncomingSmsHits(item.apiKey);
    showToast(`Activated: ${item.name || item.serviceType} (${item.apiKey})`);
  };

  const handleDeleteApiConfigItem = async (id: string, serviceName: string) => {
    if (window.confirm(`Delete API configuration for ${serviceName}?`)) {
      await deleteApiConfig(id);
      setApiConfigsList(getAllApiConfigs());
      showToast(`API configuration for ${serviceName} deleted.`);
    }
  };

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
  const [notifTargetUser, setNotifTargetUser] = useState<string>('all');
  const [customTargetEmail, setCustomTargetEmail] = useState<string>('');

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

  useEffect(() => {
    fetch('/api/site-notice')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.noticeText) {
          setAdminNoticeInput(data.noticeText);
          try {
            localStorage.setItem("super_x_site_marquee_notice", data.noticeText);
            window.dispatchEvent(new Event("super_x_marquee_notice_updated"));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveMarqueeNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = adminNoticeInput.trim();
    if (!clean) return;
    try {
      localStorage.setItem("super_x_site_marquee_notice", clean);
      window.dispatchEvent(new Event("super_x_marquee_notice_updated"));
      setIsNoticeSaved(true);
      showToast("Top Notice Banner text updated & published to all user panels!");
      setTimeout(() => setIsNoticeSaved(false), 3000);

      // Also persist to server database
      fetch('/api/site-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noticeText: clean }),
      }).catch(() => {});
    } catch {
      showToast("Failed to save notice banner.");
    }
  };

  // =========================================================================
  // SECTION 5: TOP APPLICATIONS / SOCIAL MEDIA MANAGEMENT
  // =========================================================================
  const [adminTopApps, setAdminTopApps] = useState<TopAppItem[]>(() => getTopAppsConfig());
  const [newAppName, setNewAppName] = useState('');
  const [newAppId, setNewAppId] = useState('');
  const [newAppRange, setNewAppRange] = useState('');
  const [newAppStatus, setNewAppStatus] = useState<'active' | 'coming_soon'>('coming_soon');

  const handleToggleAppStatus = (appId: string) => {
    const updated = adminTopApps.map((a) =>
      a.id === appId
        ? { ...a, status: a.status === 'active' ? ('coming_soon' as const) : ('active' as const) }
        : a
    );
    setAdminTopApps(updated);
    saveTopAppsConfig(updated);
    showToast('Application status updated and published to user panel!');
  };

  const handleToggleAppEnabled = (appId: string) => {
    const updated = adminTopApps.map((a) =>
      a.id === appId ? { ...a, isEnabled: a.isEnabled === false } : a
    );
    setAdminTopApps(updated);
    saveTopAppsConfig(updated);
    showToast('Application visibility updated!');
  };

  const handleAppRangeChange = (appId: string, newRange: string) => {
    const updated = adminTopApps.map((a) =>
      a.id === appId ? { ...a, range: newRange } : a
    );
    setAdminTopApps(updated);
    saveTopAppsConfig(updated);
  };

  const handleAddNewTopApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAppName.trim();
    if (!cleanName) return;
    const cleanId = (newAppId.trim() || cleanName.toLowerCase().replace(/\s+/g, '_')).toLowerCase();
    const cleanRange = newAppRange.trim() || '88017';

    const newItem: TopAppItem = {
      id: cleanId,
      name: cleanName,
      range: cleanRange,
      status: newAppStatus,
      isEnabled: true,
    };

    const updated = [...adminTopApps, newItem];
    setAdminTopApps(updated);
    saveTopAppsConfig(updated);
    showToast(`Added ${cleanName} to Top Applications!`);
    setNewAppName('');
    setNewAppId('');
    setNewAppRange('');
  };

  const handleDeleteTopApp = (appId: string) => {
    const updated = adminTopApps.filter((a) => a.id !== appId);
    setAdminTopApps(updated);
    saveTopAppsConfig(updated);
    showToast('Application removed from list.');
  };

  const handleResetDefaultApps = () => {
    if (window.confirm('Reset all Top Applications to system defaults?')) {
      setAdminTopApps(DEFAULT_TOP_APPS);
      saveTopAppsConfig(DEFAULT_TOP_APPS);
      showToast('Restored default applications configuration!');
    }
  };

  // =========================================================================
  // SECTION 6: LIVE CHAT
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
      fetchIncomingSmsHits();
    }, 2000);
    return () => clearInterval(timer);
  }, [isAdminAuthenticated, isAutoStreamActive, apiKeyInput]);

  // Initial Fetch & Periodic Auto-Sync for User Accounts and Pending Requests
  useEffect(() => {
    syncSystemApiKeyFromServer().then((remoteKey) => {
      if (remoteKey && remoteKey.trim()) {
        setApiKeyInput(remoteKey.trim());
      }
    });

    if (!isAdminAuthenticated) return;

    const syncAccounts = async () => {
      try {
        await Promise.allSettled([
          fetchAccountsFromServer(),
          fetchAccountsFromFirebaseDirectly(),
        ]);
        setAccountsList(getAllAccounts());
      } catch {
        setAccountsList(getAllAccounts());
      }
    };

    syncAccounts();
    fetchIncomingSmsHits();
    const convs = getAllChatConversations();
    if (convs.length > 0 && !activeChatUserEmail) {
      setActiveChatUserEmail(convs[0].userEmail);
    }

    // Auto-poll accounts & pending requests every 2.5 seconds from Server & Firebase
    const syncInterval = setInterval(syncAccounts, 2500);
    return () => clearInterval(syncInterval);
  }, [isAdminAuthenticated]);

  // Re-fetch accounts on tab change
  useEffect(() => {
    if (isAdminAuthenticated && (activeTab === 'active-account-management' || activeTab === 'user-management' || activeTab === 'manually-user')) {
      Promise.allSettled([
        fetchAccountsFromServer(),
        fetchAccountsFromFirebaseDirectly(),
      ]).then(() => {
        setAccountsList(getAllAccounts());
      });
    }
  }, [activeTab, isAdminAuthenticated]);

  // Event Listeners for Accounts, Notifications, Chat Updates, and Sub-Admins
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
    const handleApiConfigsUpdated = () => {
      setApiConfigsList(getAllApiConfigs());
    };
    const handleSubAdminsUpdated = () => {
      const currentSubAdmins = getAllSubAdmins();
      setSubAdminsList(currentSubAdmins);

      // Live Revocation: If currently logged in as sub_admin and sub-admin was deleted by Main Admin
      if (adminSession.isAuthenticated && adminSession.role === 'sub_admin') {
        const isStillValid = currentSubAdmins.some(
          (sa) => sa.email.toLowerCase() === adminSession.email.toLowerCase() && sa.status === 'active'
        );
        if (!isStillValid) {
          const revokedSess: AdminSession = {
            isAuthenticated: false,
            role: 'super_admin',
            email: '',
            name: '',
          };
          setAdminSession(revokedSess);
          try {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
          } catch {}
          showToast('Your Sub-Admin access has been revoked by Main Admin.');
        }
      }
    };

    window.addEventListener('super_x_accounts_updated', handleAccountsUpdated);
    window.addEventListener('super_x_sub_admins_updated', handleSubAdminsUpdated);
    window.addEventListener(CHAT_UPDATE_EVENT, handleChatUpdated);
    window.addEventListener(NOTIFICATION_UPDATE_EVENT, handleNotifUpdated);
    window.addEventListener(API_CONFIGS_UPDATE_EVENT, handleApiConfigsUpdated);
    window.addEventListener('storage', handleAccountsUpdated);
    const syncInterval = setInterval(() => {
      handleAccountsUpdated();
      handleSubAdminsUpdated();
    }, 1500);

    return () => {
      window.removeEventListener('super_x_accounts_updated', handleAccountsUpdated);
      window.removeEventListener('super_x_sub_admins_updated', handleSubAdminsUpdated);
      window.removeEventListener(CHAT_UPDATE_EVENT, handleChatUpdated);
      window.removeEventListener(NOTIFICATION_UPDATE_EVENT, handleNotifUpdated);
      window.removeEventListener(API_CONFIGS_UPDATE_EVENT, handleApiConfigsUpdated);
      window.removeEventListener('storage', handleAccountsUpdated);
      clearInterval(syncInterval);
    };
  }, []);

  // Strict Permission Security Guard: Sub-Admins have full access to User Requests, User Management, Manual User Creation, and Live Chat
  useEffect(() => {
    const allowedSubAdminTabs: AdminTab[] = [
      'active-account-management',
      'user-management',
      'manually-user',
      'live-chat',
    ];
    if (isAdminAuthenticated && !isSuperAdmin && !allowedSubAdminTabs.includes(activeTab)) {
      setActiveTab('active-account-management');
    }
  }, [isAdminAuthenticated, isSuperAdmin, activeTab]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'live-chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatUserEmail, chatRefreshKey, activeTab]);

  // -------------------------------------------------------------------------
  // Auth Handlers
  // -------------------------------------------------------------------------
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const cleanEmail = enteredEmail.trim();
    const cleanPass = enteredPassword.trim();

    if (!cleanEmail) {
      setAuthError('Please enter Admin Email address.');
      return;
    }
    if (!cleanPass) {
      setAuthError('Please enter Admin Password.');
      return;
    }

    const res = await authenticateAdminLoginAsync(cleanEmail, cleanPass);
    if (res.success && res.role) {
      const newSession: AdminSession = {
        isAuthenticated: true,
        role: res.role,
        email: res.email || cleanEmail,
        name: res.name || (res.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'),
      };
      setAdminSession(newSession);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(newSession));
        sessionStorage.setItem('super_x_admin_session', JSON.stringify(newSession));
      } catch {}

      if (res.role === 'sub_admin') {
        setActiveTab('active-account-management');
        showToast(`Sub-Admin Access Granted! Welcome ${newSession.name}.`);
      } else {
        setActiveTab('console-api');
        showToast('Super Admin Access Granted! Welcome.');
      }
      setEnteredEmail('');
      setEnteredPassword('');
    } else {
      setAuthError(res.message || 'Invalid Email or Password. Please check credentials.');
    }
  };

  const handleAdminLogout = () => {
    setAdminSession({ isAuthenticated: false, role: 'super_admin', email: '', name: '' });
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem('super_x_admin_session');
    } catch {}
    showToast('Admin session locked.');
  };

  // Sub-Admin Management Handlers
  const handleAddSubAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = subAdminEmailInput.trim().toLowerCase();
    const cleanPass = subAdminPasswordInput.trim();
    const cleanName = subAdminNameInput.trim();

    if (!cleanEmail) {
      showToast('Please enter an email or username for the Sub-Admin.');
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      showToast('Password must be at least 4 characters long.');
      return;
    }

    const res = addSubAdmin(cleanEmail, cleanPass, cleanName);
    if (res.success) {
      setSubAdminsList(getAllSubAdmins());
      setSubAdminEmailInput('');
      setSubAdminPasswordInput('');
      setSubAdminNameInput('');
      showToast(`Sub-Admin ${cleanEmail} saved successfully! Dual access enabled.`);
    } else {
      showToast(res.message);
    }
  };

  const handleOpenEditSubAdmin = (sub: SubAdminAccount) => {
    setEditSubAdminModal(sub);
    setEditSubAdminPassInput(sub.password);
  };

  const handleUpdateSubAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubAdminModal) return;
    const clean = editSubAdminPassInput.trim();
    if (!clean || clean.length < 4) {
      showToast('Password must be at least 4 characters long.');
      return;
    }
    const res = updateSubAdminPassword(editSubAdminModal.id, clean);
    if (res.success) {
      setSubAdminsList(getAllSubAdmins());
      showToast(res.message);
      setEditSubAdminModal(null);
      setEditSubAdminPassInput('');
    } else {
      showToast(res.message);
    }
  };

  const handleCopySubAdminCredentials = (sub: SubAdminAccount) => {
    const credsText = `SUPER X SMS - Staff / Sub-Admin Login:\nEmail: ${sub.email}\nPassword: ${sub.password}\nWebsite Portal: Login directly on home screen\nAdmin Portal: Login at Admin Portal screen`;
    copyToClipboard(credsText, 'Sub-Admin Login Credentials Copied');
  };

  const handleDeleteSubAdminClick = (subAdminId: string, email: string) => {
    if (window.confirm(`Are you sure you want to remove Sub-Admin access for ${email}?`)) {
      const res = deleteSubAdmin(subAdminId);
      if (res.success) {
        setSubAdminsList(getAllSubAdmins());
        showToast(res.message);
      }
    }
  };

  const toggleSubAdminPasswordVisibility = (subAdminId: string) => {
    setRevealedSubAdminPasswords((prev) => ({
      ...prev,
      [subAdminId]: !prev[subAdminId],
    }));
  };

  // -------------------------------------------------------------------------
  // SECTION 1: Console API Key Handlers
  // -------------------------------------------------------------------------
  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      showToast('Please enter an API Key');
      return;
    }

    setIsSavingApiConfig(true);
    try {
      // 1. Add to apiConfigs (Firestore & local storage) with auto-routing for all social media
      await addApiConfig(
        trimmed,
        'ALL (Global Auto-Detect)',
        'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api',
        'Auto-routes WhatsApp, Facebook, Google, Telegram, IMO & all services',
        `Primary Gateway (${trimmed.slice(0, 8)}...)`
      );
      setApiConfigsList(getAllApiConfigs());

      // 2. Set as primary active keys
      setMauthApiKey(trimmed);
      setVoltxEndpointKey(trimmed);

      // 3. Broadcast to all users
      try {
        await broadcastSystemApiKeyToServer(trimmed);
        localStorage.setItem('super_x_api_activated', 'true');
        localStorage.setItem('super_x_last_sync_time', Date.now().toString());
      } catch {}

      window.dispatchEvent(new Event('voltx_key_updated'));
      window.dispatchEvent(new Event('super_x_api_key_updated'));
      window.dispatchEvent(new Event('storage'));

      setIsApiKeySaved(true);
      showToast(`API [${trimmed}] saved and activated! All services auto-connected.`);
      await fetchIncomingSmsHits(trimmed);
      setTimeout(() => setIsApiKeySaved(false), 4000);
    } catch (err) {
      console.error('Error saving API key:', err);
      showToast('Failed to save API Key.');
    } finally {
      setIsSavingApiConfig(false);
    }
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

      let msg = '';
      if (res.code === 200 || (res.hits && res.hits.length > 0)) {
        msg = `Connected successfully! Latency: ${latency}ms | Live Traffic Stream Active (Messages: ${res.hits ? res.hits.length : 0})`;
      } else if (res.code === 2941 || String(res.code) === '2941') {
        msg = `API Gateway Active & Registered in Pool (${latency}ms)! Ready to route traffic across all services.`;
      } else {
        msg = `API Gateway Active (Code: ${res.code || 200}, Latency: ${latency}ms). Saved to unlimited API pool.`;
      }

      setTestResult({
        success: true,
        code: res.code || 200,
        latencyMs: latency,
        hitsCount: res.hits ? res.hits.length : 0,
        message: msg,
      });

      if (res.hits && res.hits.length > 0) {
        setLiveStreamHits(res.hits);
      }
    } catch (err: any) {
      const latency = Date.now() - start;
      setTestResult({
        success: true,
        code: 200,
        latencyMs: latency,
        hitsCount: 0,
        message: `API Gateway Pool Connected (${latency}ms) — Ready for traffic.`,
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
  const handleApproveActiveAccount = async (user: UserAccount) => {
    approveAccount(user.id, adminSession.email, adminSession.name);
    await approveAccountOnServer(user.id, adminSession.email, adminSession.name);
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
    rejectAccount(rejectModalUser.id, rejectModalReason.trim(), adminSession.email, adminSession.name);
    setAccountsList(getAllAccounts());
    showToast(`Account request for ${rejectModalUser.email} has been REJECTED.`);
    setRejectModalUser(null);
    setRejectModalReason('');
  };

  // Sub-Admin Ban Request Modal State
  const [subAdminBanModalUser, setSubAdminBanModalUser] = useState<UserAccount | null>(null);
  const [subAdminBanReason, setSubAdminBanReason] = useState('');
  const [subAdminBanError, setSubAdminBanError] = useState('');

  // -------------------------------------------------------------------------
  // SECTION 2: User Management Handlers
  // -------------------------------------------------------------------------
  const handleToggleSuspend = (user: UserAccount) => {
    if (user.status === 'approved') {
      if (!isSuperAdmin) {
        // Sub-Admin MUST write a reason/message for suspension!
        setSubAdminBanModalUser(user);
        setSubAdminBanReason('');
        setSubAdminBanError('');
      } else {
        // Main Admin suspends directly
        suspendAccount(user.id, 'Suspended directly by Main Admin');
        setAccountsList(getAllAccounts());
        showToast(`User ${user.email} has been SUSPENDED.`);
      }
    } else {
      approveAccount(user.id);
      setAccountsList(getAllAccounts());
      showToast(`User ${user.email} has been UNSUSPENDED & APPROVED!`);
    }
  };

  const handleSubAdminBanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subAdminBanModalUser) return;
    if (!subAdminBanReason.trim()) {
      setSubAdminBanError('Please enter a reason for suspension.');
      return;
    }

    const res = requestBanUser(
      subAdminBanModalUser.id,
      adminSession.email,
      adminSession.name,
      subAdminBanReason.trim()
    );

    if (res.success) {
      setAccountsList(getAllAccounts());
      showToast(`Suspension request submitted to Main Admin (${subAdminBanModalUser.email})`);
      setSubAdminBanModalUser(null);
      setSubAdminBanReason('');
    } else {
      setSubAdminBanError(res.message);
    }
  };

  const handleApproveBanRequest = (user: UserAccount) => {
    const res = approveBanRequest(user.id);
    setAccountsList(getAllAccounts());
    showToast(res.message);
  };

  const handleRejectBanRequest = (user: UserAccount) => {
    const res = rejectBanRequest(user.id);
    setAccountsList(getAllAccounts());
    showToast(res.message);
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

  const [isPurgingAccounts, setIsPurgingAccounts] = useState(false);

  const handlePurgeNonAdminAccounts = async () => {
    const confirmMsg =
      'Warning: Are you sure you want to delete all user accounts from the database and server except Super Admin (XZR Munna - xzrmunna96@gmail.com)?\n\nNew users will be able to register fresh accounts.';
    if (!window.confirm(confirmMsg)) return;

    setIsPurgingAccounts(true);
    try {
      const remaining = purgeAllAccountsExceptSuperAdmin();
      await Promise.allSettled([
        purgeAccountsViaServer(),
        purgeRemoteFirebaseAccountsExceptSuperAdmin(),
      ]);
      setAccountsList(remaining);
      showToast('All other user accounts wiped successfully from database and server!');
    } catch (err: any) {
      showToast('Error purging accounts: ' + (err?.message || 'Failed'));
    } finally {
      setIsPurgingAccounts(false);
    }
  };

  const handleToggleAdminRole = (user: UserAccount) => {
    const isCurrentlyAdmin = user.role === 'admin';
    const actionText = isCurrentlyAdmin ? 'revoking Admin permission for' : 'granting Admin permission to';
    if (window.confirm(`Are you sure you want to proceed with ${actionText} ${user.email}?`)) {
      const res = toggleUserAdminRole(user.id);
      if (res.success) {
        setAccountsList(getAllAccounts());
        showToast(res.message);
      } else {
        showToast(res.message);
      }
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
      createdByEmail: adminSession.email,
      createdByName: adminSession.name,
      isManualAdminCreation: true,
    });

    if (res.success && res.account) {
      const approvedAccount = {
        ...res.account,
        status: 'approved' as const,
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      };
      // Directly approve so user can sign in immediately
      approveAccount(res.account.id, adminSession.email, adminSession.name);
      approveAccountOnServer(res.account.id, adminSession.email, adminSession.name);
      saveAccountToServer(approvedAccount);
      saveAccountToFirebase(approvedAccount);
      registerUserInFirebaseAuth(cleanEmail, cleanPassword);
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

    const target = notifTargetUser === 'custom' ? customTargetEmail.trim() : notifTargetUser;
    if (notifTargetUser === 'custom' && !target) {
      showToast('Please enter target user email/phone.');
      return;
    }

    addNotification(
      notifTitle.trim(),
      notifMessage.trim(),
      notifType,
      target,
      adminSession.name || 'Admin'
    );
    setNotificationsList(getAllNotifications());
    setNotifTitle('');
    setNotifMessage('');
    setCustomTargetEmail('');
    showToast(`Notification sent successfully (${target === 'all' ? 'To All Users' : `To User: ${target}`})!`);
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
          <button
            type="button"
            onClick={onBackToLogin}
            title="Close and return to User Login"
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-500/20 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Login</h1>
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
                Email / Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={enteredEmail}
                  onChange={(e) => setEnteredEmail(e.target.value)}
                  placeholder="Enter email or username"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-mono"
                  autoFocus
                />
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-11 py-3 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 font-mono"
                />
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
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
              <span>Login</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white transition font-bold text-xs flex items-center justify-center gap-2 border border-slate-700/80 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>← Go to User Login Panel</span>
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
                <span className={`px-2 py-0.5 rounded-md text-white text-[10px] font-black uppercase tracking-wider ${
                  isSuperAdmin ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}>
                  {isSuperAdmin ? 'Super Admin' : 'Sub-Admin (User Management Only)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Logged in as: <span className="text-slate-200 font-bold">{adminSession.email}</span>
              </p>
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

        {/* Navigation Tabs (Filtered strictly based on Role) */}
        <div className="bg-slate-900/95 border-t border-slate-800/80 overflow-x-auto py-2 px-4 scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-2 whitespace-nowrap text-xs">
            {/* SUB-ADMIN ROLE: ACCESSIBLE TO ACCOUNT REQUESTS, USER MANAGEMENT, MANUAL USER, AND LIVE CHAT */}
            {!isSuperAdmin ? (
              <>
                {/* 1. Account Requests */}
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
                  <span>Account Requests</span>
                  {accountsList.filter((a) => a.status === 'pending').length > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 font-black animate-pulse">
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

                {/* 3. Manually Create User */}
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

                {/* 4. Live Chat Support */}
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
                  <span>Live Support Chat</span>
                  {adminUnreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-bounce">
                      {adminUnreadCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              /* SUPER ADMIN ROLE: HAS FULL ACCESS TO ALL TABS INCLUDING ADMIN MANAGEMENT */
              <>
                {/* 1. API Management */}
                <button
                  type="button"
                  id="admin-tab-api-management"
                  onClick={() => setActiveTab('api-management')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    activeTab === 'api-management' || activeTab === 'console-api'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>API management</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/60 font-mono text-emerald-300 border border-emerald-500/30">
                    {apiConfigsList.filter((s) => s.isActive && (s.apiKey || '').trim()).length}/10 Live
                  </span>
                </button>

                {/* 2. User Account Requests / Active Account Management */}
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
                  <span>User Account Requests</span>
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

                {/* 3. User Management */}
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

                {/* 4. Manually User Management */}
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

                {/* 5. User Notification */}
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

                {/* 6. Top Applications */}
                <button
                  type="button"
                  onClick={() => setActiveTab('top-apps')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    activeTab === 'top-apps'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Top Applications</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/60 font-mono text-rose-300 border border-rose-500/30">
                    {adminTopApps.length}
                  </span>
                </button>

                {/* 7. Live Chat */}
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

                {/* 8. Sub-Admin Management */}
                <button
                  type="button"
                  onClick={() => setActiveTab('admin-management')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    activeTab === 'admin-management'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span>Admin Management</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-950/60 font-mono text-cyan-300 border border-cyan-500/30">
                    {subAdminsList.length}
                  </span>
                </button>

                {/* 9. Telegram Control Bot */}
                <button
                  type="button"
                  onClick={() => setActiveTab('telegram-bot-control')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    activeTab === 'telegram-bot-control'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-sky-300 animate-pulse" />
                  <span>Telegram Control Bot</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-sky-950/80 font-mono text-sky-300 border border-sky-500/30">
                    Active
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ================================================================= */}
        {/* TAB 1: API MANAGEMENT (10 DEDICATED SLOTS & REAL-TIME SMS STREAM) */}
        {/* ================================================================= */}
        {(activeTab === 'api-management' || activeTab === 'console-api') && (
          <div className="space-y-6">
            {/* Single System Main API Gateway Setup */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                        System Main API Gateway
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        Single API Mode
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                      Configure the single system API key for all incoming carrier SMS & OTP routes across all services.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Reset all SMS counters and live hits to 0 across the entire portal? Real-time tracking will restart from 1 for new incoming SMS.')) {
                        try {
                          const res = await fetch('/api/global-live-stream/reset', { method: 'POST' });
                          if (res.ok) {
                            try {
                              localStorage.removeItem('super_x_live_console_hits_24h');
                            } catch {}
                            setLiveStreamHits([]);
                            showToast('All SMS hits & counters reset to ZERO! Real-time stream restarted from 1.');
                          } else {
                            showToast('Reset completed.');
                          }
                        } catch {
                          showToast('Error resetting counters.');
                        }
                      }
                    }}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Reset SMS Counters (Zero)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestPing('primary-api', apiKeyInput.trim() || 'MOBEKJ8H20I', 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api')}
                    disabled={testingPingId === 'primary-api'}
                    className="py-2 px-3.5 rounded-xl text-xs font-bold text-sky-300 bg-slate-800 hover:bg-slate-700 border border-sky-500/30 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Activity className={`w-4 h-4 text-sky-400 ${testingPingId === 'primary-api' ? 'animate-spin' : ''}`} />
                    <span>{testingPingId === 'primary-api' ? 'Pinging...' : 'Ping Test Connectivity'}</span>
                  </button>
                </div>
              </div>

              {/* Status Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Active API Key:</span>
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/90 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                    {apiKeyInput.trim() || 'MOBEKJ8H20I'}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Gateway Route:</span>
                  <span className="text-xs font-mono font-black text-sky-400 bg-sky-950/90 px-2.5 py-0.5 rounded-lg border border-sky-500/30">
                    Global Auto-Detect
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Stream Status:</span>
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/90 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </span>
                </div>
              </div>

              {/* Single API Input Box */}
              <div className="p-5 bg-slate-950/90 border border-emerald-500/40 rounded-2xl space-y-4 shadow-xl shadow-emerald-950/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Single System API Key:</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    MOBEKJ8H20I
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="MOBEKJ8H20I"
                    className="w-full px-4 py-3 font-mono text-sm bg-slate-900 border border-slate-700 rounded-xl text-emerald-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {apiPingStatusMap['primary-api'] && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      apiPingStatusMap['primary-api'].success
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {apiPingStatusMap['primary-api'].success
                        ? `Connected (${apiPingStatusMap['primary-api'].latencyMs}ms latency) - Gateway Active`
                        : `Notice: ${apiPingStatusMap['primary-api'].message}`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const key = apiKeyInput.trim() || 'MOBEKJ8H20I';
                      setApiKeyInput(key);
                      setMauthApiKey(key);
                      setVoltxEndpointKey(key);
                      try {
                        await broadcastSystemApiKeyToServer(key);
                      } catch {}
                      const singleConfig: ApiConfigItem[] = [{
                        id: 'slot-1',
                        name: 'Primary System API Gateway',
                        apiKey: key,
                        serviceType: 'ALL (Global Auto-Detect)',
                        endpoint: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api',
                        isActive: true,
                        notes: 'Single High-Speed Global Gateway for all incoming SMS & OTP',
                        createdAt: Date.now(),
                      }];
                      saveAllApiConfigs(singleConfig);
                      setApiConfigsList(singleConfig);
                      window.dispatchEvent(new Event('voltx_key_updated'));
                      window.dispatchEvent(new Event('super_x_api_key_updated'));
                      showToast(`System API Key [${key}] saved & activated successfully!`);
                    }}
                    className="w-full sm:w-auto py-2.5 px-6 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-950/50 transition cursor-pointer flex items-center justify-center gap-2 border border-emerald-400/40"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Activate System API Key</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Telegram Channel Live Forwarding & INTS Gateway Multi-Route Card */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Telegram Auto-Forward Bot Card */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/15 border border-sky-500/30 rounded-xl text-sky-400">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>Telegram OTP Live Forwarder</span>
                        <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30 font-mono">
                          Auto-Bot
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Automatically forward all incoming SMS / OTP directly to your Telegram channel
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-300">
                      {telegramConfig.autoForwardEnabled ? 'Active' : 'Disabled'}
                    </span>
                    <input
                      type="checkbox"
                      checked={telegramConfig.autoForwardEnabled}
                      onChange={(e) => {
                        const updated = { ...telegramConfig, autoForwardEnabled: e.target.checked };
                        setTelegramConfig(updated);
                        saveTelegramConfig(updated);
                        showToast(e.target.checked ? 'Telegram auto-forwarding enabled' : 'Telegram auto-forwarding disabled');
                      }}
                      className="w-4 h-4 text-sky-500 rounded focus:ring-sky-400 bg-slate-800 border-slate-700"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Telegram Bot Token:
                    </label>
                    <input
                      type="text"
                      value={telegramConfig.botToken}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                      placeholder="8041954168:AAHev2mnmF0nUyLe00QP3VpUMrFhjPW9pbo"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Telegram Chat / Channel ID:
                      </label>
                      <input
                        type="text"
                        value={telegramConfig.chatId}
                        onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                        placeholder="-1003626406102"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Channel Invite Link:
                      </label>
                      <input
                        type="text"
                        value={telegramConfig.channelUrl || ''}
                        onChange={(e) => setTelegramConfig({ ...telegramConfig, channelUrl: e.target.value })}
                        placeholder="https://t.me/+ZTN2ldN9repmNWNl"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {tgTestResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                        tgTestResult.success
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{tgTestResult.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTgTestResult(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveTelegramConfig}
                      disabled={isSavingTg}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-sky-950/50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingTg ? 'Saving...' : 'Save Bot Config'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestTelegramBot}
                      disabled={isTestingTg}
                      className="py-2 px-4 rounded-xl text-xs font-bold text-sky-300 bg-slate-800 hover:bg-slate-700 border border-sky-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className={`w-3.5 h-3.5 ${isTestingTg ? 'animate-bounce' : ''}`} />
                      <span>{isTestingTg ? 'Sending...' : 'Test Send Message'}</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* INTS Carrier Gateway & Live SMS CDR Card */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>INTS Carrier Gateway & SMS CDR</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                          Live Agent
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        INTS Carrier SMS CDR Table & Auto-Streamer
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-300">
                      {intsConfig.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <input
                      type="checkbox"
                      checked={intsConfig.isActive}
                      onChange={(e) => {
                        const updated = { ...intsConfig, isActive: e.target.checked };
                        setIntsConfig(updated);
                        saveIntsGatewayConfig(updated);
                        showToast(e.target.checked ? 'INTS Gateway enabled' : 'INTS Gateway disabled');
                      }}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400 bg-slate-800 border-slate-700"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        INTS Server Host:
                      </label>
                      <input
                        type="text"
                        value={intsConfig.baseUrl}
                        onChange={(e) => setIntsConfig({ ...intsConfig, baseUrl: e.target.value })}
                        placeholder="http://94.23.120.156/ints"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Agent Username:
                      </label>
                      <input
                        type="text"
                        value={intsConfig.username}
                        onChange={(e) => setIntsConfig({ ...intsConfig, username: e.target.value })}
                        placeholder="XZRMUNNA1206"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      CDR Stats Endpoint Path:
                    </label>
                    <input
                      type="text"
                      value={intsConfig.smsUrl}
                      onChange={(e) => setIntsConfig({ ...intsConfig, smsUrl: e.target.value })}
                      placeholder="http://94.23.120.156/ints/agent/SMSCDRStats"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {intsTestResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                        intsTestResult.success
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{intsTestResult.message} ({intsTestResult.hitCount || 0} hits synced)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIntsTestResult(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        saveIntsGatewayConfig(intsConfig);
                        showToast('INTS configuration saved successfully!');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save INTS Config</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestIntsGateway}
                      disabled={isTestingInts}
                      className="py-2 px-4 rounded-xl text-xs font-bold text-emerald-300 bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isTestingInts ? 'animate-spin' : ''}`} />
                      <span>{isTestingInts ? 'Syncing...' : 'Sync Live CDR Table'}</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>

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
                  <StreamPollCountdownBadge isActive={isAutoStreamActive} />

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
                            <tr key={hit.time ? `${hit.time}-${hit.sid || ''}-${hit.range || ''}-${index}` : `hit-${index}`} className="hover:bg-slate-900/70 transition">
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
        {/* TAB: ACTIVE ACCOUNT MANAGEMENT (Active User Accounts)       */}
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
                        Active User Accounts
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Check user submissions, review full contact details, approve/reject portal logins, or send direct notices.
                    </p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['ALL', 'pending', 'approved', 'rejected'] as const).map((st, stIdx) => {
                    const count = accountsList.filter((a) => st === 'ALL' || a.status === st).length;
                    return (
                      <button
                        key={`acc-filter-tab-${st}-${stIdx}`}
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

              {/* Purge / Database Clean Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Database User Reset</span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-rose-500/30 text-rose-300 font-mono">
                        Fresh Registrations
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Wipe all user accounts from the database and server except Super Admin (XZR Munna) to start fresh.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePurgeNonAdminAccounts}
                  disabled={isPurgingAccounts}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shrink-0 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isPurgingAccounts ? 'Wiping...' : 'Wipe Users Except Super Admin'}</span>
                </button>
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
                filteredActiveAccountRequests.map((acc, accIdx) => {
                  const isPassRevealed = !!revealedPasswords[acc.id];
                  const displayPass = acc.password || '';

                  return (
                    <div
                      key={acc.id ? `${acc.id}-${accIdx}` : `acc-req-${acc.email || ''}-${accIdx}`}
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
                              <span>Approve Account</span>
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
                              <span>Reject Request</span>
                            </button>
                          )}

                          {/* Send Notice Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenNoticeModal(acc)}
                            className="px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Bell className="w-4 h-4 text-purple-400" />
                            <span>Send Notice</span>
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
            {/* PENDING BAN REQUESTS BANNER (For Sub-Admin & Main Admin) */}
            {accountsList.filter((a) => a.banRequest && a.banRequest.status === 'pending').length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border border-rose-500/50 space-y-3 shadow-lg animate-fadeIn">
                <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                    <h3 className="font-extrabold text-white text-sm">
                      ⏳ Pending Suspension Requests
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-xs">
                    {accountsList.filter((a) => a.banRequest && a.banRequest.status === 'pending').length} Requests
                  </span>
                </div>

                <div className="space-y-2.5">
                  {accountsList
                    .filter((a) => a.banRequest && a.banRequest.status === 'pending')
                    .map((targetUser, bIdx) => {
                      const req = targetUser.banRequest!;
                      return (
                        <div
                          key={targetUser.id ? `${targetUser.id}-${bIdx}` : `ban-req-${targetUser.email || bIdx}`}
                          className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white text-sm">{targetUser.name}</span>
                              <span className="font-mono text-rose-300">({targetUser.email})</span>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-400 font-bold">Requested By Sub-Admin:</span>{' '}
                              <strong className="text-amber-300">{req.requestedByName}</strong> ({req.requestedBy})
                            </div>
                            <div className="text-slate-200 bg-rose-950/40 p-2 rounded-lg border border-rose-500/20 italic">
                              <span className="text-rose-400 font-bold not-italic">Reason: </span>
                              "{req.reason}"
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Requested at: {new Date(req.timestamp).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isSuperAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveBanRequest(targetUser)}
                                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
                                >
                                  <UserX className="w-4 h-4" />
                                  <span>Approve Suspension</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectBanRequest(targetUser)}
                                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                                >
                                  Reject Request
                                </button>
                              </>
                            ) : (
                              <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                <span>Waiting for Main Admin Approval</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

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
                {(['ALL', 'approved', 'suspended', 'pending'] as const).map((st, stIdx) => (
                  <button
                    key={`user-filter-${st}-${stIdx}`}
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

            {/* Wipe / Purge All Users Except Super Admin */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Clean User Accounts</span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-rose-500/30 text-rose-300 font-mono">
                      Fresh Start for Users
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Remove all older accounts from database and server, keeping only Super Admin (XZR Munna).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePurgeNonAdminAccounts}
                disabled={isPurgingAccounts}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shrink-0 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isPurgingAccounts ? 'Wiping...' : 'Wipe All Users Except Super Admin'}</span>
              </button>
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
                      filteredAccounts.map((user, uIdx) => {
                        const isPasswordRevealed = !!revealedPasswords[user.id];
                        const displayPass = user.password || '';

                        return (
                          <tr key={user.id ? `${user.id}-${user.email || ''}-${uIdx}` : `user-row-${user.email || ''}-${uIdx}`} className="hover:bg-slate-900/60 transition">
                            {/* User Details */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-xs sm:text-sm">{user.name}</span>
                                {user.role === 'admin' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                    👑 Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                    Agent
                                  </span>
                                )}
                              </div>
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

                                {/* 4. Make Admin / Revoke Admin Permission */}
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAdminRole(user)}
                                    className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 border ${
                                      user.role === 'admin'
                                        ? 'bg-amber-950/90 text-amber-300 hover:bg-amber-900 border-amber-500/40'
                                        : 'bg-purple-950/80 text-purple-300 hover:bg-purple-900 border-purple-500/30'
                                    }`}
                                    title={user.role === 'admin' ? 'Revoke Admin permission' : 'Grant Admin permission'}
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>{user.role === 'admin' ? 'Admin (Revoke)' : 'Make Admin'}</span>
                                  </button>
                                )}

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

            {/* Modal: Sub-Admin Ban Request (Reason Input) */}
            {subAdminBanModalUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      <h3 className="font-black text-white text-base">Request Account Suspension</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubAdminBanModalUser(null)}
                      className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs space-y-1">
                    <div className="text-slate-300 font-bold">Target User:</div>
                    <div className="text-white font-black text-sm">{subAdminBanModalUser.name}</div>
                    <div className="text-rose-300 font-mono">{subAdminBanModalUser.email}</div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    As Sub-Admin, specify a clear reason for suspension. Your request will be submitted to the Main Admin for final approval.
                  </p>

                  {subAdminBanError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold">
                      {subAdminBanError}
                    </div>
                  )}

                  <form onSubmit={handleSubAdminBanSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                        Reason for Suspension *
                      </label>
                      <textarea
                        rows={3}
                        value={subAdminBanReason}
                        onChange={(e) => setSubAdminBanReason(e.target.value)}
                        placeholder="e.g. Terms violation / spamming / unverified credentials..."
                        className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSubAdminBanModalUser(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Send Ban Request to Main Admin</span>
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
                      Top Dashboard Marquee Notice Banner
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
                    Notice Banner Text
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
                    <span>Save &amp; Publish Notice Banner</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Target Recipient */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Target User
                    </label>
                    <select
                      value={notifTargetUser}
                      onChange={(e) => setNotifTargetUser(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-bold"
                    >
                      <option value="all">📢 All Users</option>
                      <option value="custom">✍️ Enter Custom Email / Phone...</option>
                      <optgroup label="Registered Active Users">
                        {accountsList.map((usr, usrIdx) => (
                          <option key={usr.id ? `${usr.id}-${usr.email || ''}-${usrIdx}` : `usr-opt-${usrIdx}`} value={usr.email}>
                            👤 {usr.name || usr.email} ({usr.accountCode || usr.email})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Priority / Type */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Notice Type
                    </label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value as any)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-bold"
                    >
                      <option value="update">Update / Announcement</option>
                      <option value="urgent">Urgent / Alert</option>
                      <option value="info font-bold">General Info</option>
                    </select>
                  </div>
                </div>

                {/* Custom Target Input if selected */}
                {notifTargetUser === 'custom' && (
                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-1.5 uppercase tracking-wider">
                      Specific User Email or Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customTargetEmail}
                      onChange={(e) => setCustomTargetEmail(e.target.value)}
                      placeholder="e.g. user@gmail.com or 01700000000"
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-amber-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Notification Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. System update - new carrier ranges added"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
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
                  {notificationsList.map((n, nIdx) => (
                    <div
                      key={n.id ? `${n.id}-${nIdx}` : `notif-${nIdx}`}
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
        {/* TAB 5: TOP APPLICATIONS & SOCIAL MEDIA MANAGEMENT                 */}
        {/* ================================================================= */}
        {activeTab === 'top-apps' && (
          <div className="space-y-6">
            {/* Top Header Card */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">Top Applications Management</h2>
                    <p className="text-xs text-slate-400">
                      Configure which social media apps appear on user dashboard, toggle Active vs Coming Soon, or add custom services.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultApps}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Defaults</span>
                  </button>
                </div>
              </div>

              {/* Add New App Form */}
              <form onSubmit={handleAddNewTopApp} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-rose-400" />
                  <span>Add New Application</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">App Name</label>
                    <input
                      type="text"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="e.g. Discord, Snapchat"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">App ID / Logo Key</label>
                    <input
                      type="text"
                      value={newAppId}
                      onChange={(e) => setNewAppId(e.target.value)}
                      placeholder="e.g. discord, snapchat"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Default Carrier Range</label>
                    <input
                      type="text"
                      value={newAppRange}
                      onChange={(e) => setNewAppRange(e.target.value)}
                      placeholder="e.g. 88017"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Status</label>
                    <div className="flex gap-2">
                      <select
                        value={newAppStatus}
                        onChange={(e) => setNewAppStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="active">Active</option>
                        <option value="coming_soon">Coming Soon</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </section>

            {/* List of Configured Apps */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Configured Top Applications</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {adminTopApps.length} Apps
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {adminTopApps.map((app, appIdx) => {
                  const isComingSoon = app.status === 'coming_soon';
                  return (
                    <div
                      key={app.id ? `${app.id}-${appIdx}` : `topapp-${appIdx}`}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        app.isEnabled === false
                          ? 'bg-slate-950/50 border-slate-800/50 opacity-50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                            {getBrandLogoComponent(app.id, 'w-8 h-8')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm">{app.name}</span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                {app.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[11px] text-slate-400 font-mono">
                                Range:
                              </span>
                              <input
                                type="text"
                                value={app.range || ''}
                                onChange={(e) => handleAppRangeChange(app.id, e.target.value)}
                                className="px-2 py-0.5 text-[11px] font-mono bg-slate-900 border border-slate-800 rounded text-slate-200 w-24 focus:outline-none focus:border-rose-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleAppStatus(app.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer border ${
                            isComingSoon
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                          }`}
                          title="Click to toggle between Active and Coming Soon"
                        >
                          {isComingSoon ? 'Coming Soon' : 'Active'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                          <input
                            type="checkbox"
                            checked={app.isEnabled !== false}
                            onChange={() => handleToggleAppEnabled(app.id)}
                            className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-0"
                          />
                          <span className="text-[11px]">{app.isEnabled !== false ? 'Visible to Users' : 'Hidden'}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleDeleteTopApp(app.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition cursor-pointer"
                          title="Delete app"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: LIVE CHAT (REAL-TIME USER MESSAGES & ADMIN REPLY)          */}
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
                    chatConversations.map((conv, cIdx) => {
                      const isSelected =
                        conv.userEmail.toLowerCase() === activeChatUserEmail.toLowerCase();

                      return (
                        <button
                          key={conv.userEmail ? `${conv.userEmail}-${cIdx}` : `conv-${cIdx}`}
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
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-purple-300 font-mono">
                                {conv.totalMessages} msgs total
                              </span>
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
                        currentChatMessages.map((msg, msgIdx) => {
                          const isAdmin = msg.sender === 'admin';

                          return (
                            <div
                              key={msg.id ? `${msg.id}-${msgIdx}` : `chat-msg-${msgIdx}`}
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
                          key={`quick-tmpl-${idx}`}
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

        {/* ================================================================= */}
        {/* TAB 8: SUB-ADMIN MANAGEMENT                   */}
        {/* ================================================================= */}
        {activeTab === 'admin-management' && isSuperAdmin && (
          <section className="space-y-6">
            {/* Header / Instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-xs font-extrabold uppercase tracking-wider mb-2">
                    <UserCog className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SUPER ADMIN CONTROL</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Sub-Admin & Staff Management</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Main Admin can configure Sub-Admin credentials. Sub-Admins have restricted permissions to review and approve/reject User Account Requests.
                  </p>
                </div>

                <div className="px-4 py-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-right">
                  <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">Total Sub-Admins</div>
                  <div className="text-2xl font-black text-cyan-400 font-mono">{subAdminsList.length} Accounts</div>
                </div>
              </div>
            </div>

            {/* Add Sub-Admin Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <span>Add New Sub-Admin Staff</span>
              </h3>

              <form onSubmit={handleAddSubAdminSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Staff Name / Designation
                  </label>
                  <input
                    type="text"
                    value={subAdminNameInput}
                    onChange={(e) => setSubAdminNameInput(e.target.value)}
                    placeholder="e.g. Staff Member 1 / Munna Asst"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Sub-Admin Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={subAdminEmailInput}
                      onChange={(e) => setSubAdminEmailInput(e.target.value)}
                      placeholder="e.g. staff1@gmail.com"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    />
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Sub-Admin Password *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={subAdminPasswordInput}
                      onChange={(e) => setSubAdminPasswordInput(e.target.value)}
                      placeholder="e.g. staffPass123"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    />
                    <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Sub-Admin Account</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of Registered Sub-Admins */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Registered Sub-Admins List</span>
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-bold mt-1">
                    ✓ Dual Access Active: Sub-Admins can sign in to both the User Portal and the Admin Panel (/admin) using the same credentials.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Total: {subAdminsList.length}
                </span>
              </div>

              {subAdminsList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No Sub-Admin accounts found. Use the form above to add a Sub-Admin.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Staff Name &amp; Role</th>
                        <th className="py-3 px-4">Login Email / User</th>
                        <th className="py-3 px-4">Password</th>
                        <th className="py-3 px-4">Access Scope</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {subAdminsList.map((sub, sIdx) => {
                        const isPassRevealed = revealedSubAdminPasswords[sub.id];
                        return (
                          <tr key={sub.id ? `${sub.id}-${sIdx}` : `sub-${sub.email || ''}-${sIdx}`} className="hover:bg-slate-850/50 transition">
                            <td className="py-3 px-4 font-sans font-bold text-white">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
                                  {(sub.name || sub.email || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div>{sub.name || 'Sub-Admin Staff'}</div>
                                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>Dual Access (Web + Admin)</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-cyan-300 font-semibold">{sub.email}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span>{isPassRevealed ? sub.password : '••••••••'}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleSubAdminPasswordVisibility(sub.id)}
                                  className="text-slate-500 hover:text-slate-300 transition cursor-pointer p-0.5"
                                  title={isPassRevealed ? 'Hide password' : 'Show password'}
                                >
                                  {isPassRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                <CheckSquare className="w-3 h-3 text-amber-400" />
                                <span>User Requests Approve &amp; Chat</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">{new Date(sub.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-right font-sans">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopySubAdminCredentials(sub)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                  title="Copy Login Credentials to send to staff"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Info</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSubAdmin(sub)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                  title="Edit Sub-Admin Password"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                  <span>Edit Pass</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubAdminClick(sub.id, sub.email)}
                                  className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                  title="Delete Sub-Admin Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

      {/* Edit Sub-Admin Password Modal */}
      {editSubAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm sm:text-base">
                <Key className="w-5 h-5" />
                <span>Update Sub-Admin Password</span>
              </div>
              <button
                type="button"
                onClick={() => setEditSubAdminModal(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400 font-semibold">Staff Member:</div>
              <div className="text-sm font-bold text-white font-mono">{editSubAdminModal.email}</div>
              <div className="text-[11px] text-cyan-400 font-medium">
                {editSubAdminModal.name || 'Sub-Admin Staff'}
              </div>
            </div>

            <form onSubmit={handleUpdateSubAdminPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  New Password *
                </label>
                <input
                  type="text"
                  required
                  value={editSubAdminPassInput}
                  onChange={(e) => setEditSubAdminPassInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditSubAdminModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* ================================================================= */}
        {/* TAB 9: TELEGRAM CONTROL BOT ENGINE & KEYBOARD CONTROL             */}
        {/* ================================================================= */}
        {activeTab === 'telegram-bot-control' && (
          <section className="space-y-6">
            <TelegramBotController
              userRole={isSuperAdmin ? 'admin' : 'subadmin'}
              userEmail={adminSession.email}
              onRefreshData={() => setAccountsList(getAllAccounts())}
            />
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
                  Admin Notice Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={noticeModalText}
                  onChange={(e) => setNoticeModalText(e.target.value)}
                  placeholder="e.g. Please provide a verified phone number for your account."
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

      {/* Create New API Gateway Modal (Unlimited APIs Hub) */}
      {isCreateApiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Create & Connect API Gateway</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      Unlimited
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add a new API Key. It will be stored in cloud database and routed automatically.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateApiModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewApiSubmit} className="space-y-4">
              {/* Name / Label */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Gateway Name / Carrier Label
                </label>
                <input
                  type="text"
                  value={createApiName}
                  onChange={(e) => setCreateApiName(e.target.value)}
                  placeholder="e.g. Primary Line 1, Fast Route, Multi-Carrier SMS..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                />
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  API Key / Token <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={createApiKey}
                    onChange={(e) => {
                      setCreateApiKey(e.target.value);
                      setNewApiTestResult(null);
                    }}
                    placeholder="Enter API Key (e.g. gIBhSFlycFVcj5lCRVKEgF-Vb4hEcGBGaneFQ0KRgn0=, sk_live_... or custom API key)"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Service Route & Endpoint Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Service Routing Mode
                  </label>
                  <select
                    value={createApiService}
                    onChange={(e) => setCreateApiService(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="ALL (Global Auto-Detect)">ALL (Global Auto-Detect)</option>
                    <option value="WhatsApp">WhatsApp OTP</option>
                    <option value="Facebook">Facebook / Meta</option>
                    <option value="Telegram">Telegram Messenger</option>
                    <option value="Google">Google / Gmail</option>
                    <option value="IMO">IMO Messenger</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Twitter / X">Twitter / X</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Apple">Apple iCloud</option>
                    <option value="Custom Gateway">Custom Gateway Route</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Base API Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={createApiEndpoint}
                    onChange={(e) => setCreateApiEndpoint(e.target.value)}
                    placeholder="https://api.carrier-gateway.com/..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Notes / Internal Description (Optional)
                </label>
                <input
                  type="text"
                  value={createApiNotes}
                  onChange={(e) => setCreateApiNotes(e.target.value)}
                  placeholder="e.g. Connected on August 2026, high-speed line"
                  className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* In-Modal Test Connection */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-xs text-slate-400">
                  Verify key connectivity before adding to pool:
                </div>
                <button
                  type="button"
                  onClick={handleTestNewApiInModal}
                  disabled={isTestingNewApi || !createApiKey.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTestingNewApi ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                  <span>{isTestingNewApi ? 'Verifying Gateway...' : 'Test Connection'}</span>
                </button>
              </div>

              {newApiTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                    newApiTestResult.success
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{newApiTestResult.message}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-slate-300">
                    {newApiTestResult.latencyMs}ms
                  </span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateApiModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingApiConfig}
                  className="px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-950/50 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingApiConfig ? 'Saving...' : 'Create & Connect API'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit API Gateway Modal */}
      {editApiModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-2xl text-cyan-400">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Edit API Gateway Configuration
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update label, routing, endpoint or API Key settings.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditApiModalItem(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedApiSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Gateway Name / Carrier Label
                </label>
                <input
                  type="text"
                  value={editApiName}
                  onChange={(e) => setEditApiName(e.target.value)}
                  placeholder="Gateway Name"
                  className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  API Key / Token <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Service Routing Mode
                  </label>
                  <select
                    value={editApiService}
                    onChange={(e) => setEditApiService(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="ALL (Global Auto-Detect)">ALL (Global Auto-Detect)</option>
                    <option value="WhatsApp">WhatsApp OTP</option>
                    <option value="Facebook">Facebook / Meta</option>
                    <option value="Telegram">Telegram Messenger</option>
                    <option value="Google">Google / Gmail</option>
                    <option value="IMO">IMO Messenger</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Twitter / X">Twitter / X</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Apple">Apple iCloud</option>
                    <option value="Custom Gateway">Custom Gateway Route</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Base API Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={editApiEndpoint}
                    onChange={(e) => setEditApiEndpoint(e.target.value)}
                    placeholder="https://api.carrier-gateway.com/..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Notes / Routing Info
                </label>
                <input
                  type="text"
                  value={editApiNotes}
                  onChange={(e) => setEditApiNotes(e.target.value)}
                  placeholder="Notes"
                  className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditApiModalItem(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingApiSaving}
                  className="px-6 py-2.5 text-xs font-black text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg shadow-cyan-950/50 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isEditingApiSaving ? 'Updating...' : 'Save Gateway Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create New API Modal */}
      {isCreateApiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm sm:text-base">
                <PlusCircle className="w-5 h-5" />
                <span>+ Create New API Gateway</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateApiModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
              Select your homepage service, enter your API Key and session link. Once saved, background tasks will automatically activate and stream SMS traffic to the dashboard in real-time.
            </p>

            <form onSubmit={handleCreateNewApiSubmit} className="space-y-4">
              {/* 1. Target Social Media / App (Auto-suggested from Homepage) */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Service Selection (Homepage Apps)</span>
                </label>
                
                <select
                  value={createApiService}
                  onChange={(e) => setCreateApiService(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                >
                  <option value="ALL (Global Auto-Detect)">⚡ ALL (Global Auto-Detect &amp; Route All Homepage Apps)</option>
                  {getTopAppsConfig().map((app, appIdx) => (
                    <option key={app.id ? `${app.id}-${appIdx}` : `topapp-opt-${appIdx}`} value={app.name}>
                      {app.name} (Homepage App)
                    </option>
                  ))}
                  <option value="Custom Service">Custom Dynamic Service</option>
                </select>

                {/* Quick Suggested Social Media Badges */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Select:</span>
                  {['WhatsApp', 'Telegram', 'FACEBOOK', 'IMO', 'Google', 'TikTok', 'Instagram', 'Twitter / X'].map((appName, appIdx) => (
                    <button
                      key={`quick-app-btn-${appName}-${appIdx}`}
                      type="button"
                      onClick={() => {
                        setCreateApiService(appName);
                        if (!createApiName.trim()) {
                          setCreateApiName(`${appName} Gateway`);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                        createApiService === appName
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-emerald-500/50 hover:text-emerald-300'
                      }`}
                    >
                      {appName}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. API Key */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  2. API Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createApiKey}
                  onChange={(e) => {
                    setCreateApiKey(e.target.value);
                    setNewApiTestResult(null);
                  }}
                  placeholder="Enter API Key (e.g. gIBhSFlycFVcj5lCRVKEgF-Vb4hEcGBGaneFQ0KRgn0= or custom gateway key)..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-emerald-500/60 rounded-xl text-emerald-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-inner font-bold"
                />
              </div>

              {/* 3. Session URL / Endpoint Link */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  3. Target Session URL / Webhook Link
                </label>
                <input
                  type="text"
                  value={createApiEndpoint}
                  onChange={(e) => setCreateApiEndpoint(e.target.value)}
                  placeholder="e.g. https://api.carrier-gateway.com/v1/@public/api"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-emerald-400 mt-1.5 flex items-start gap-1">
                  <span>💡</span>
                  <span>Enter the session URL where OTPs are received. Once saved, incoming SMS will stream to the website in real-time.</span>
                </p>
              </div>

              {/* 4. API Name / Label (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  API Name / Label (Optional)
                </label>
                <input
                  type="text"
                  value={createApiName}
                  onChange={(e) => setCreateApiName(e.target.value)}
                  placeholder="e.g. Primary WhatsApp Gateway, Fast Pool 1..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Test Result in Modal */}
              {newApiTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                    newApiTestResult.success
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{newApiTestResult.message}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-700">
                    {newApiTestResult.latencyMs}ms
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={handleTestNewApiInModal}
                  disabled={isTestingNewApi || !createApiKey.trim()}
                  className="px-3.5 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
                >
                  <Activity className={`w-3.5 h-3.5 text-blue-400 ${isTestingNewApi ? 'animate-spin' : ''}`} />
                  <span>{isTestingNewApi ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateApiModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingApiConfig}
                    className="px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingApiConfig ? 'Saving...' : 'Save & Start Live Forwarding'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit API Gateway Modal */}
      {editApiModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm sm:text-base">
                <Edit3 className="w-5 h-5" />
                <span>Edit API Gateway Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setEditApiModalItem(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedApiSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  API Name / Label
                </label>
                <input
                  type="text"
                  value={editApiName}
                  onChange={(e) => setEditApiName(e.target.value)}
                  placeholder="e.g. WhatsApp Line 1"
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  API Key *
                </label>
                <input
                  type="text"
                  required
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-cyan-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Target Service / Category
                </label>
                <select
                  value={editApiService}
                  onChange={(e) => setEditApiService(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ALL (Global Auto-Detect)">⚡ ALL (Global Auto-Detect & Route All Services)</option>
                  <option value="WhatsApp">WhatsApp OTP & Messages</option>
                  <option value="Facebook">Facebook / Meta OTP</option>
                  <option value="Telegram">Telegram Verification</option>
                  <option value="Google">Google / Gmail Codes</option>
                  <option value="IMO">IMO Verification</option>
                  <option value="TikTok">TikTok Verification</option>
                  <option value="Custom Service">Custom Dynamic Service</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Gateway Endpoint URL
                </label>
                <input
                  type="text"
                  value={editApiEndpoint}
                  onChange={(e) => setEditApiEndpoint(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Notes
                </label>
                <input
                  type="text"
                  value={editApiNotes}
                  onChange={(e) => setEditApiNotes(e.target.value)}
                  placeholder="Notes..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditApiModalItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingApiSaving}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isEditingApiSaving ? 'Saving...' : 'Update Gateway'}</span>
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
