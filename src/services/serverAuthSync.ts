// Server-Side Real-Time Authentication & Account Synchronization
// Guarantees cross-browser account persistence (Chrome, Firefox, Safari, Edge, Android, iOS, etc.)
import {
  UserAccount,
  SubAdminAccount,
  getAllAccounts,
  saveAllAccounts,
  getAllSubAdmins,
  saveAllSubAdmins,
  getDeletedAccountEmails,
  syncSubAdminToUserAccount,
} from './userAuthService';

let isSyncingFromServer = false;
let isInitialized = false;

// 1. Fetch all accounts from server database
export async function fetchAccountsFromServer(): Promise<UserAccount[]> {
  try {
    const res = await fetch('/api/accounts', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) return getAllAccounts();

    const data = await res.json();
    if (data && data.success && Array.isArray(data.accounts)) {
      const serverList: UserAccount[] = data.accounts;
      const deletedSet = getDeletedAccountEmails();
      const localList = getAllAccounts();
      const mergedMap = new Map<string, UserAccount>();

      // Keep valid local accounts
      localList.forEach((acc) => {
        const clean = (acc.email || '').toLowerCase().trim();
        if (clean && !deletedSet.has(clean) && !deletedSet.has((acc.id || '').toLowerCase())) {
          mergedMap.set(clean, acc);
        }
      });

      // Merge server accounts
      serverList.forEach((remote) => {
        if (remote && remote.email) {
          const clean = remote.email.toLowerCase().trim();
          const remoteId = (remote.id || '').toLowerCase().trim();
          if (clean && !deletedSet.has(clean) && !deletedSet.has(remoteId)) {
            const local = mergedMap.get(clean);
            if (!local) {
              mergedMap.set(clean, remote);
            } else {
              // If remote is approved or newer, take remote
              if (remote.status === 'approved' && local.status !== 'approved') {
                mergedMap.set(clean, { ...local, ...remote, status: 'approved' });
              } else if (local.status === 'approved' && remote.status !== 'approved') {
                mergedMap.set(clean, { ...remote, ...local, status: 'approved' });
              } else {
                const localTime = local.updatedAt || local.approvedAt || local.createdAt || 0;
                const remoteTime = remote.updatedAt || remote.approvedAt || remote.createdAt || 0;
                if (remoteTime >= localTime) {
                  mergedMap.set(clean, { ...local, ...remote });
                } else {
                  mergedMap.set(clean, { ...remote, ...local });
                }
              }
            }
          }
        }
      });

      const merged = Array.from(mergedMap.values());
      try {
        localStorage.setItem('super_x_all_user_accounts', JSON.stringify(merged));
        localStorage.setItem('super_x_sms_backup_accounts', JSON.stringify(merged));
        window.dispatchEvent(new Event('super_x_accounts_updated'));
      } catch {}
      return merged;
    }
  } catch (err) {
    // offline / quiet fallback
  }
  return getAllAccounts();
}

// 2. Fetch all sub-admins from server
export async function fetchSubAdminsFromServer(): Promise<SubAdminAccount[]> {
  try {
    const res = await fetch('/api/subadmins', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) return getAllSubAdmins();

    const data = await res.json();
    if (data && data.success && Array.isArray(data.subAdmins)) {
      const serverSubs: SubAdminAccount[] = data.subAdmins;
      const localSubs = getAllSubAdmins();
      const subMap = new Map<string, SubAdminAccount>();

      localSubs.forEach((s) => subMap.set(s.id || s.email.toLowerCase(), s));
      serverSubs.forEach((s) => {
        if (s && s.email) {
          subMap.set(s.id || s.email.toLowerCase(), s);
          syncSubAdminToUserAccount(s);
        }
      });

      const merged = Array.from(subMap.values());
      try {
        localStorage.setItem('super_x_sub_admin_accounts', JSON.stringify(merged));
        localStorage.setItem('super_x_all_sub_admins', JSON.stringify(merged));
        localStorage.setItem('super_x_all_sub_admins_backup', JSON.stringify(merged));
        window.dispatchEvent(new Event('super_x_sub_admins_updated'));
      } catch {}
      return merged;
    }
  } catch {}
  return getAllSubAdmins();
}

// 3. Save single account to server database
export async function saveAccountToServer(account: UserAccount): Promise<void> {
  try {
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account }),
    });
  } catch {}
}

// 4. Batch save accounts to server
export async function saveAllAccountsToServer(accounts: UserAccount[]): Promise<void> {
  try {
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts }),
    });
  } catch {}
}

// 4b. Explicit Instant Approve on Server
export async function approveAccountOnServer(
  idOrEmail: string,
  approvedByEmail?: string,
  approvedByName?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/accounts/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: idOrEmail,
        email: idOrEmail,
        approvedByEmail,
        approvedByName,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 5. Delete account from server
export async function deleteAccountFromServer(emailOrId: string): Promise<void> {
  try {
    await fetch('/api/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrId, id: emailOrId }),
    });
  } catch {}
}

// 6. Save Sub-Admin to server
export async function saveSubAdminToServer(subAdmin: SubAdminAccount): Promise<void> {
  try {
    await fetch('/api/subadmins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subAdmin }),
    });
  } catch {}
}

// 7. Delete Sub-Admin from server
export async function deleteSubAdminFromServer(idOrEmail: string): Promise<void> {
  try {
    await fetch('/api/subadmins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idOrEmail, email: idOrEmail }),
    });
  } catch {}
}

// 8. Authenticate directly with the server across any browser
export async function authenticateUserViaServer(
  identifier: string,
  pass: string
): Promise<{
  success: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'suspended' | 'not_found' | 'invalid_password' | 'error';
  user?: UserAccount;
  message: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('/api/accounts/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: pass }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (data.success && data.user) {
          // Sync server account into local storage immediately so it exists offline too
          const current = getAllAccounts();
          const cleanEmail = data.user.email.toLowerCase().trim();
          const idx = current.findIndex((a) => a.email.toLowerCase().trim() === cleanEmail);
          if (idx >= 0) {
            current[idx] = { ...current[idx], ...data.user };
          } else {
            current.unshift(data.user);
          }
          try {
            localStorage.setItem('super_x_all_user_accounts', JSON.stringify(current));
            localStorage.setItem('super_x_sms_backup_accounts', JSON.stringify(current));
            window.dispatchEvent(new Event('super_x_accounts_updated'));
          } catch {}
        }
        return data;
      }
    }
  } catch (e: any) {
    console.warn('[Server Auth] Direct login request note:', e?.message);
  }

  return {
    success: false,
    status: 'error',
    message: 'Could not reach server authentication service.',
  };
}

// 8b. Purge All User Accounts Except Super Admin on Server
export async function purgeAccountsViaServer(): Promise<UserAccount[]> {
  try {
    const res = await fetch('/api/accounts/purge-all-except-super-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'xzrmunna96@gmail.com' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.accounts)) {
        return data.accounts;
      }
    }
  } catch (err: any) {
    console.warn('[Server Auth] Purge request error:', err?.message);
  }
  return getAllAccounts();
}

// 9. Master Real-Time Synchronizer for all browsers
export function initServerRealtimeSync() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Immediate eager initial fetch
  fetchAccountsFromServer();
  fetchSubAdminsFromServer();

  // Polling every 3 seconds for instant updates when Admin approves accounts
  setInterval(() => {
    fetchAccountsFromServer();
    fetchSubAdminsFromServer();
  }, 3000);

  // Sync immediately when user switches tabs or browser windows
  window.addEventListener('focus', () => {
    fetchAccountsFromServer();
    fetchSubAdminsFromServer();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchAccountsFromServer();
      fetchSubAdminsFromServer();
    }
  });

  window.addEventListener('online', () => {
    fetchAccountsFromServer();
    fetchSubAdminsFromServer();
  });
}
