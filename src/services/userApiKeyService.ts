// Unified User API Key & Unlock Management Service for SUPER X SMS
// Works seamlessly on Vercel, Chrome, Via Browser, Android, iOS, and local environments
import { getAllAccounts, saveAllAccounts, UserAccount } from './userAuthService';

export interface UserApiKeyRecord {
  apiKey: string;
  email: string;
  accountCode?: string;
  name?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  managerContact?: string;
}

const STORAGE_KEY = 'super_x_user_api_keys';
const BACKUP_STORAGE_KEY = 'super_x_user_api_keys_backup';

export function generateSuperXApiKey(seed?: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 36; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `superxsms_${token}`;
}

export function getAllUserApiKeys(): Record<string, UserApiKeyRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}
  return {};
}

export function saveAllUserApiKeys(keys: Record<string, UserApiKeyRecord>) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(keys);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event('super_x_user_api_keys_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

export function getUserApiKeyData(accountCodeOrEmail: string): UserApiKeyRecord | null {
  if (!accountCodeOrEmail) return null;
  const clean = accountCodeOrEmail.trim().toLowerCase();
  const allKeys = getAllUserApiKeys();

  // 1. Direct key match or email / accountCode lookup
  for (const record of Object.values(allKeys)) {
    if (
      record.apiKey === clean ||
      (record.email && record.email.toLowerCase() === clean) ||
      (record.accountCode && record.accountCode.toLowerCase() === clean)
    ) {
      return record;
    }
  }

  // 2. Check if account in userAuthService has apiKey or apiUnlocked
  const accounts = getAllAccounts();
  const user = accounts.find(
    (a) =>
      (a.email && a.email.toLowerCase() === clean) ||
      (a.accountCode && a.accountCode.toLowerCase() === clean) ||
      (a.id && a.id.toLowerCase() === clean)
  );

  if (user && (user.apiUnlocked || user.apiKey)) {
    const generatedKey = user.apiKey || generateSuperXApiKey(user.email);
    const rec: UserApiKeyRecord = {
      apiKey: generatedKey,
      email: user.email,
      accountCode: user.accountCode,
      name: user.name,
      active: !!user.apiUnlocked,
      createdAt: user.createdAt || Date.now(),
      updatedAt: Date.now(),
      managerContact: '@super_x_support',
    };
    allKeys[generatedKey] = rec;
    saveAllUserApiKeys(allKeys);
    return rec;
  }

  return null;
}

export function isUserApiUnlocked(accountCodeOrEmail: string): boolean {
  if (!accountCodeOrEmail) return false;
  const clean = accountCodeOrEmail.trim().toLowerCase();

  // Check accounts list first
  const accounts = getAllAccounts();
  const user = accounts.find(
    (a) =>
      (a.email && a.email.toLowerCase() === clean) ||
      (a.accountCode && a.accountCode.toLowerCase() === clean) ||
      (a.id && a.id.toLowerCase() === clean)
  );
  if (user && user.apiUnlocked) {
    return true;
  }

  // Check keys store
  const rec = getUserApiKeyData(clean);
  return !!(rec && rec.active);
}

// Unlock or Lock user API key with multi-layer persistence (localStorage, UserAccount, Server)
export async function unlockUserApiKey(
  accountCodeOrEmail: string,
  activeStatus: boolean = true
): Promise<{ success: boolean; message: string; apiKey?: string; user?: UserAccount }> {
  if (!accountCodeOrEmail || !accountCodeOrEmail.trim()) {
    return { success: false, message: 'Account ID or Email is required.' };
  }

  const clean = accountCodeOrEmail.trim().toLowerCase();
  const accounts = getAllAccounts();

  // 1. Locate user account
  const targetUser = accounts.find(
    (a) =>
      (a.email && a.email.toLowerCase() === clean) ||
      (a.accountCode && a.accountCode.toLowerCase() === clean) ||
      (a.id && a.id.toLowerCase() === clean)
  );

  const allKeys = getAllUserApiKeys();
  let existingKeyRec = getUserApiKeyData(clean);
  let resolvedKey = existingKeyRec?.apiKey || targetUser?.apiKey;

  if (!resolvedKey) {
    resolvedKey = generateSuperXApiKey(targetUser?.email || clean);
  }

  const targetEmail = targetUser?.email || (clean.includes('@') ? clean : `${clean}@user.portal`);
  const targetAccountCode = targetUser?.accountCode || clean;
  const targetName = targetUser?.name || targetEmail.split('@')[0];

  const updatedRec: UserApiKeyRecord = {
    apiKey: resolvedKey,
    email: targetEmail,
    accountCode: targetAccountCode,
    name: targetName,
    active: activeStatus,
    createdAt: existingKeyRec?.createdAt || Date.now(),
    updatedAt: Date.now(),
    managerContact: '@super_x_support',
  };

  allKeys[resolvedKey] = updatedRec;
  saveAllUserApiKeys(allKeys);

  // 2. Update user account object
  if (targetUser) {
    targetUser.apiUnlocked = activeStatus;
    targetUser.apiKey = resolvedKey;
    targetUser.updatedAt = Date.now();
    saveAllAccounts(accounts);
  }

  // 3. Dispatch global events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('super_x_accounts_updated'));
    window.dispatchEvent(new Event('super_x_user_api_keys_updated'));
    window.dispatchEvent(new Event('storage'));
  }

  // 4. Multi-backend synchronization (Express Server & Firestore)
  let serverMessage = '';
  try {
    const res = await fetch('/api/admin/user-api-keys/unlock-by-account-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'XZRMUNNA12061',
        'x-admin-key': 'XZRMUNNA12061',
        'x-admin-email': 'xzrmunna96@gmail.com',
      },
      body: JSON.stringify({
        accountCode: targetAccountCode,
        email: targetEmail,
        apiKey: resolvedKey,
        active: activeStatus,
        adminKey: 'XZRMUNNA12061',
      }),
    });

    if (res.ok) {
      const serverData = await res.json().catch(() => null);
      if (serverData) {
        if (serverData.message) serverMessage = serverData.message;
        if (serverData.keyRecord) {
          allKeys[serverData.keyRecord.apiKey] = {
            ...updatedRec,
            ...serverData.keyRecord,
            active: activeStatus,
          };
          saveAllUserApiKeys(allKeys);
        }
      }
    }
  } catch {
    // If offline or on Vercel static, local persistence is already established
  }

  return {
    success: true,
    message: serverMessage || `API Key for ${targetEmail} is now ${activeStatus ? 'UNLOCKED (ACTIVE)' : 'LOCKED'}`,
    apiKey: resolvedKey,
    user: targetUser,
  };

  // Also sync user account to server /api/accounts
  if (targetUser) {
    try {
      fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: targetUser }),
      }).catch(() => null);
    } catch {}
  }

  const statusLabel = activeStatus ? 'UNLOCKED (আনলক করা হয়েছে)' : 'LOCKED (লক করা হয়েছে)';
  return {
    success: true,
    message: `Account ${targetAccountCode} API is now ${statusLabel}!`,
    apiKey: resolvedKey,
    user: targetUser,
  };
}
