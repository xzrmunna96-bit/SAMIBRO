import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Copy, Check, Send, ExternalLink, RefreshCw, Lock, Eye, EyeOff, Code, Plus, Trash2, UserCheck } from 'lucide-react';
import { getDedicatedAccountCode } from '../services/userAuthService';
import { getUserApiKeyData, isUserApiUnlocked } from '../services/userApiKeyService';

interface UserApiSessionCardProps {
  userEmail: string;
  userName?: string;
  accountCode?: string;
  apiUnlocked?: boolean;
  apiKey?: string;
}

export function UserApiSessionCard({ userEmail, userName, accountCode, apiUnlocked, apiKey }: UserApiSessionCardProps) {
  const [apiKeyData, setApiKeyData] = useState<any>(() => {
    const local = getUserApiKeyData(userEmail) || (accountCode ? getUserApiKeyData(accountCode) : null);
    const unlocked = isUserApiUnlocked(userEmail) || (accountCode ? isUserApiUnlocked(accountCode) : false) || !!apiUnlocked;
    if (local) {
      return { ...local, active: unlocked || local.active };
    }
    if (unlocked || apiKey) {
      return {
        apiKey: apiKey || 'superxsms_' + (accountCode || 'portal_key'),
        email: userEmail,
        accountCode: accountCode,
        active: true,
        managerContact: '@super_x_support',
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedAccountCode, setCopiedAccountCode] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState('');

  const resolvedAccountCode = accountCode || getDedicatedAccountCode(userEmail);
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://superxsms.com';

  const loadUserKey = async (silent = false) => {
    if (!silent) setLoading(true);

    // 1. Immediate local check from accounts and userApiKeyService
    const localKey = getUserApiKeyData(userEmail) || (resolvedAccountCode ? getUserApiKeyData(resolvedAccountCode) : null);
    const unlockedLocal = isUserApiUnlocked(userEmail) || (resolvedAccountCode ? isUserApiUnlocked(resolvedAccountCode) : false) || !!apiUnlocked;
    
    if (localKey) {
      setApiKeyData({
        ...localKey,
        active: unlockedLocal || localKey.active,
      });
    } else if (unlockedLocal || apiKey) {
      setApiKeyData((prev: any) => ({
        ...(prev || {}),
        apiKey: apiKey || prev?.apiKey || ('superxsms_' + (resolvedAccountCode || 'portal_key')),
        email: userEmail,
        accountCode: resolvedAccountCode,
        active: true,
        managerContact: '@super_x_support',
      }));
    }

    // 2. Fetch fresh status from server backend
    try {
      const res = await fetch(`/api/user-api/key?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data && data.apiKey) {
        setApiKeyData(data.apiKey);
      } else if (!localKey && !unlockedLocal && !apiUnlocked) {
        setApiKeyData(null);
      }
    } catch {
      // Keep established local/sync state if fetch fails
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      loadUserKey();
      const interval = setInterval(() => {
        if (document.hidden) return;
        loadUserKey(true);
      }, 3000);

      const onUpdate = () => loadUserKey(true);
      window.addEventListener('super_x_accounts_updated', onUpdate);
      window.addEventListener('super_x_user_api_keys_updated', onUpdate);
      window.addEventListener('storage', onUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('super_x_accounts_updated', onUpdate);
        window.removeEventListener('super_x_user_api_keys_updated', onUpdate);
        window.removeEventListener('storage', onUpdate);
      };
    }
  }, [userEmail, resolvedAccountCode, apiUnlocked, apiKey]);

  const isActive = !!(apiKeyData && apiKeyData.active);

  const handleRegenerateClick = async () => {
    setRequesting(true);
    setRequestSuccessMsg('');
    try {
      const res = await fetch('/api/user-api/regenerate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (data && data.apiKey) {
        setApiKeyData(data.apiKey);
        setShowKey(true);
        setRequestSuccessMsg('নতুন এপিআই কি সফলভাবে জেনারেট হয়েছে!');
      } else {
        setRequestSuccessMsg('Failed to generate API key.');
      }
    } catch {
      setRequestSuccessMsg('Error regenerating key.');
    } finally {
      setRequesting(false);
    }
  };

  const copyText = (text: string, type: 'key' | 'account') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedAccountCode(true);
      setTimeout(() => setCopiedAccountCode(false), 2000);
    }
  };

  const rawKey = apiKeyData?.apiKey || '';
  const fullKey = rawKey
    ? (rawKey.startsWith('superxsms_')
        ? rawKey
        : `superxsms_${rawKey.replace(/^(SUPER_X_SMS_API_|SUPER_X_SMS_|sx_api_)/i, '')}`)
    : '';

  // When hidden: show ONLY dots
  // When shown: show the complete API key starting with superxsms_
  const displayKey = showKey && isActive ? fullKey : '••••••••••••••••••••••••••••••••••••••••';

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 sm:p-6 text-white space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Key className="w-5 h-5 text-teal-400" />
            <h3 className="text-xl font-bold text-white tracking-tight">API Key</h3>
            {isActive ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                ACTIVE
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                LOCKED BY MANAGER
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            {isActive ? (
              <p>Key generation is enabled for your account. Copy your API key to access automated routes.</p>
            ) : (
              <div className="space-y-1">
                <p className="text-amber-300/90 font-medium">
                  API is currently not available. Please contact the manager for API access.
                </p>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-slate-400">Your Account ID:</span>
                  <span className="font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                    {resolvedAccountCode}
                  </span>
                  <button
                    onClick={() => copyText(resolvedAccountCode, 'account')}
                    className="text-indigo-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedAccountCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => loadUserKey(false)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs border border-slate-700 cursor-pointer shrink-0"
          title="Refresh Status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Main Container */}
      <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition bg-slate-950/40 space-y-4">
        {!apiKeyData || !isActive ? (
          <button
            onClick={() => setSupportModalOpen(true)}
            className="w-full py-3 px-4 bg-slate-900 border border-amber-500/30 rounded-xl text-amber-300 hover:text-amber-200 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>API Key Locked — Click to view Account ID & Contact Manager</span>
          </button>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 font-mono text-xs sm:text-sm text-emerald-300 overflow-hidden break-all">
                <Key className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="tracking-widest select-all">{displayKey}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{showKey ? 'Hide' : 'Show'}</span>
                </button>

                <button
                  onClick={() => copyText(fullKey, 'key')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons: New Key Only */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleRegenerateClick}
                disabled={requesting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${requesting ? 'animate-spin' : ''}`} />
                <span>New Key</span>
              </button>

              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Real-Time Verified • Active
              </span>
            </div>
          </>
        )}
      </div>

      {requestSuccessMsg && (
        <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30 text-center">
          {requestSuccessMsg}
        </p>
      )}

      {/* Support / Unlock Key Modal */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white">API Key Locked</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                To enable API access on your account, please send your <strong className="text-indigo-300">Account ID</strong> to the manager. Once approved and unlocked, it will be activated immediately.
              </p>
            </div>

            {/* Account ID Display Box */}
            <div className="p-3 bg-slate-950 border border-indigo-500/30 rounded-2xl text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-slate-400 font-sans text-[11px]">
                <span>YOUR ACCOUNT ID:</span>
                <span className="text-indigo-400 font-bold">10-DIGIT CODE</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <span className="font-bold text-sm text-indigo-300 tracking-wider">{resolvedAccountCode}</span>
                <button
                  onClick={() => copyText(resolvedAccountCode, 'account')}
                  className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-sans font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedAccountCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAccountCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1 font-mono text-emerald-300">
              <span className="text-slate-400 font-sans block text-[11px]">Telegram Manager:</span>
              <span className="font-bold text-sm">@super_x_support</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://t.me/super_x_support"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSupportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>CONTACT MANAGER</span>
              </a>

              <button
                onClick={() => setSupportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



