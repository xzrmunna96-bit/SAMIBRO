// Online Presence, IP Tracking, and Login Analytics Service for SUPER X SMS
import { UserAccount, getAllAccounts, saveAllAccounts } from './userAuthService';
import { saveAccountToFirebase } from './firebaseSyncService';
import { saveAccountToServer } from './serverAuthSync';
import { sendUserActivityToTelegram } from './telegramService';

let cachedClientIp: string | null = null;
let isFetchingIp = false;

/**
 * Fetch current client public IP address with multiple fast fallbacks
 */
export async function getClientIp(): Promise<string> {
  if (cachedClientIp) return cachedClientIp;
  if (isFetchingIp) {
    await new Promise((r) => setTimeout(r, 300));
    if (cachedClientIp) return cachedClientIp;
  }

  isFetchingIp = true;

  try {
    // 1. Internal Server endpoint
    const res = await Promise.race([
      fetch('/api/my-ip'),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1200)),
    ]);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
        cachedClientIp = data.ip;
        isFetchingIp = false;
        return data.ip;
      }
    }
  } catch {}

  try {
    // 2. Fast public IP endpoint (ipify)
    const res2 = await Promise.race([
      fetch('https://api.ipify.org?format=json'),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
    ]);
    if (res2.ok) {
      const data = await res2.json();
      if (data?.ip) {
        cachedClientIp = data.ip;
        isFetchingIp = false;
        return data.ip;
      }
    }
  } catch {}

  try {
    // 3. Secondary public IP endpoint
    const res3 = await fetch('https://api64.ipify.org?format=json').catch(() => null);
    if (res3 && res3.ok) {
      const data = await res3.json();
      if (data?.ip) {
        cachedClientIp = data.ip;
        isFetchingIp = false;
        return data.ip;
      }
    }
  } catch {}

  isFetchingIp = false;
  // Fallback default
  cachedClientIp = cachedClientIp || '103.145.22.84';
  return cachedClientIp;
}

/**
 * Record a successful user login event with IP tracking, login counter, history, and masked Telegram alert
 */
export async function recordUserLoginEvent(account: UserAccount): Promise<UserAccount> {
  const ip = await getClientIp();
  const now = Date.now();
  const accounts = getAllAccounts();
  const cleanEmail = account.email.toLowerCase().trim();

  let target = accounts.find(
    (a) => a.id === account.id || a.email.toLowerCase().trim() === cleanEmail
  );

  if (!target) {
    target = { ...account };
    accounts.unshift(target);
  }

  const currentCount = target.loginCount || 0;
  const newCount = currentCount + 1;

  target.loginCount = newCount;
  target.lastLoginAt = now;
  target.lastSeenAt = now;
  target.isOnline = true;
  target.lastLoginIp = ip;
  target.updatedAt = now;

  const currentHistory = Array.isArray(target.loginHistory) ? target.loginHistory : [];
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser';
  
  target.loginHistory = [
    {
      timestamp: now,
      ip: ip,
      userAgent: userAgent.substring(0, 120),
    },
    ...currentHistory.slice(0, 24),
  ];

  // Save to all persistence layers
  saveAllAccounts(accounts);
  saveAccountToFirebase(target);
  saveAccountToServer(target);

  // Send masked Telegram activity notification
  sendUserActivityToTelegram({
    action: 'User Login',
    userName: target.name || target.email.split('@')[0],
    userEmail: target.email,
    userCode: target.accountCode,
    loginCount: newCount,
    ip: ip,
    details: `Login #${newCount} Successful | Active Portal Session`,
  }).catch(() => {});

  return target;
}

/**
 * Send periodic online heartbeat to keep user status live
 */
export function sendUserOnlineHeartbeat(emailOrId: string) {
  if (!emailOrId) return;
  const accounts = getAllAccounts();
  const clean = emailOrId.toLowerCase().trim();

  const target = accounts.find(
    (a) => a.id === emailOrId || a.email.toLowerCase().trim() === clean
  );

  if (!target) return;

  target.lastSeenAt = Date.now();
  target.isOnline = true;

  try {
    saveAllAccounts(accounts);
    saveAccountToFirebase(target, true);
  } catch {}
}

/**
 * Mark user as offline on logout or window close
 */
export function markUserOffline(emailOrId: string) {
  if (!emailOrId) return;
  const accounts = getAllAccounts();
  const clean = emailOrId.toLowerCase().trim();

  const target = accounts.find(
    (a) => a.id === emailOrId || a.email.toLowerCase().trim() === clean
  );

  if (!target) return;

  target.isOnline = false;
  target.lastSeenAt = Date.now();

  try {
    saveAllAccounts(accounts);
    saveAccountToFirebase(target, true);
  } catch {}
}

/**
 * Check if a user is currently online (heartbeat within 90 seconds)
 */
export function isAccountOnline(account: UserAccount): boolean {
  if (!account) return false;
  if (!account.lastSeenAt) return false;
  const diff = Date.now() - account.lastSeenAt;
  return account.isOnline !== false && diff < 90000;
}

/**
 * Detect IP duplication across all accounts
 */
export function getDuplicateIpMap(accounts: UserAccount[]): Map<string, UserAccount[]> {
  const map = new Map<string, UserAccount[]>();

  accounts.forEach((acc) => {
    const ip = acc.lastLoginIp?.trim();
    if (ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost') {
      if (!map.has(ip)) {
        map.set(ip, []);
      }
      map.get(ip)!.push(acc);
    }
  });

  // Filter to only IPs with 2 or more accounts
  const duplicates = new Map<string, UserAccount[]>();
  map.forEach((userList, ip) => {
    if (userList.length > 1) {
      duplicates.set(ip, userList);
    }
  });

  return duplicates;
}
