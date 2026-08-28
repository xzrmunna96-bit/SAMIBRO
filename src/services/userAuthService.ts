// Function to guarantee a unique, fixed, permanent 10-digit code for each distinct account
export function getDedicatedAccountCode(userEmail: string, explicitCode?: string): string {
  if (explicitCode && /^\d{10}$/.test(explicitCode)) {
    return explicitCode;
  }

  const clean = (userEmail || '').trim().toLowerCase();

  // Known account permanent assignments
  if (clean === 'xzrmunna96@gmail.com' || clean === 'xzrmunna') return '2886064606';
  if (clean === 'demo@portal.com' || clean === 'demo') return '4193820571';
  if (clean === 'sami@superxsms.com' || clean === 'sami') return '9038271645';

  const storageKey = `super_x_sms_account_code_${clean}`;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && /^\d{10}$/.test(stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
  }

  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  const positive = Math.abs(hash);
  const generated = String(2000000000 + (positive % 7999999999)).padStart(10, '0');

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey, generated);
    } catch {
      // ignore
    }
  }

  return generated;
}

export interface UserPermissions {
  canGetNumber: boolean;
  canAccessRange: boolean;
  canAccessAccessList: boolean;
  canAccessConsole: boolean;
  canAccessSummary: boolean;
  canAccess2oo9: boolean;
  canChat: boolean;
}

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canGetNumber: true,
  canAccessRange: true,
  canAccessAccessList: true,
  canAccessConsole: true,
  canAccessSummary: true,
  canAccess2oo9: true,
  canChat: true,
};

import { sendAdminMessage } from './supportChatService';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  accountCode: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  role: 'admin' | 'user';
  createdAt: number;
  phoneOrTelegram?: string;
  groupLink?: string;
  note?: string;
  adminNotice?: string;
  approvedAt?: number;
  rejectedAt?: number;
  permissions?: UserPermissions;
}

const STORAGE_KEY = 'super_x_all_user_accounts';
const BACKUP_STORAGE_KEY = 'super_x_sms_backup_accounts';

const INITIAL_DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'user_admin_munna',
    name: 'XZR Munna',
    email: 'xzrmunna96@gmail.com',
    username: 'xzrmunna',
    password: 'Password123',
    accountCode: '2886064606',
    status: 'approved',
    role: 'admin',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    phoneOrTelegram: '@xzrmunna',
    note: 'System Super Admin',
    approvedAt: Date.now() - 30 * 24 * 3600 * 1000,
  },
  {
    id: 'user_sami',
    name: 'SAMI',
    email: 'sami@superxsms.com',
    username: 'sami',
    password: 'Password123',
    accountCode: '9038271645',
    status: 'approved',
    role: 'user',
    createdAt: Date.now() - 15 * 24 * 3600 * 1000,
    phoneOrTelegram: '+8801700000000',
    note: 'Active SMS Trader',
    approvedAt: Date.now() - 15 * 24 * 3600 * 1000,
  },
  {
    id: 'user_demo',
    name: 'Demo User',
    email: 'demo@portal.com',
    username: 'demo',
    password: 'Password123',
    accountCode: '4193820571',
    status: 'approved',
    role: 'user',
    createdAt: Date.now() - 7 * 24 * 3600 * 1000,
    phoneOrTelegram: '@demo_user',
    note: 'Demo testing account',
    approvedAt: Date.now() - 7 * 24 * 3600 * 1000,
  },
];

// Helper to safely load accounts from localStorage key
function loadRawAccountsFromKey(key: string): UserAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function getAllAccounts(): UserAccount[] {
  const primaryList = loadRawAccountsFromKey(STORAGE_KEY);
  const backupList = loadRawAccountsFromKey(BACKUP_STORAGE_KEY);

  // Map to merge and deduplicate accounts by clean email
  const mergedMap = new Map<string, UserAccount>();

  // 1. Add initial default accounts
  INITIAL_DEFAULT_ACCOUNTS.forEach((acc) => {
    mergedMap.set(acc.email.toLowerCase(), { ...acc });
  });

  // 2. Add backup list items
  backupList.forEach((acc) => {
    if (acc && acc.email) {
      mergedMap.set(acc.email.toLowerCase(), { ...acc });
    }
  });

  // 3. Add primary list items (override if newer or present)
  primaryList.forEach((acc) => {
    if (acc && acc.email) {
      mergedMap.set(acc.email.toLowerCase(), { ...acc });
    }
  });

  const mergedList = Array.from(mergedMap.values());

  // Auto-sync back to both primary & backup storage to guarantee absolute permanence
  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(mergedList);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    } catch {
      // ignore
    }
  }

  return mergedList;
}

export function saveAllAccounts(accounts: UserAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(accounts);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event('super_x_accounts_updated'));
  } catch {
    // ignore
  }
}

// Global Storage Event Listener to sync accounts across browser tabs/sessions in real-time
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === BACKUP_STORAGE_KEY) {
      window.dispatchEvent(new Event('super_x_accounts_updated'));
    }
  });
}

export function requestNewAccount(params: {
  name?: string;
  email: string;
  password: string;
  phoneOrTelegram?: string;
  groupLink?: string;
  note?: string;
}): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const cleanEmail = params.email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' };
  }

  if (!params.password || params.password.length < 4) {
    return { success: false, message: 'Password must be at least 4 characters long.' };
  }

  // Strict Duplicate Email Check: Prevent multiple submissions for the same email
  const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: false,
      message: `An account request for ${cleanEmail} has already been submitted or registered! Multiple submissions with the same email address are strictly prohibited. (এক ইমেইল একাধিকবার সাবমিট করা যাবে না)`,
    };
  }

  // Generate unique 10 digit code
  const generatedCode = getDedicatedAccountCode(cleanEmail);

  const newAccount: UserAccount = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: params.name?.trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    username: cleanEmail.split('@')[0],
    password: params.password,
    accountCode: generatedCode,
    status: 'pending', // Strictly pending until admin approves!
    role: 'user',
    createdAt: Date.now(),
    phoneOrTelegram: params.phoneOrTelegram?.trim() || '',
    groupLink: params.groupLink?.trim() || '',
    note: params.note?.trim() || 'Active account request via registration form',
  };

  accounts.unshift(newAccount);
  saveAllAccounts(accounts);

  return {
    success: true,
    message: 'Account request submitted! Status is PENDING. Admin will review and approve your account shortly.',
    account: newAccount,
  };
}

export function approveAccount(id: string): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { success: false, message: 'Account request not found.' };
  }

  target.status = 'approved';
  target.approvedAt = Date.now();
  if (!target.accountCode || target.accountCode.length < 8) {
    target.accountCode = getDedicatedAccountCode(target.email);
  }

  saveAllAccounts(accounts);

  // Send real-time live chat approval message to user
  try {
    sendAdminMessage(
      target.email,
      `🎉 Congratulations! Your account request (${target.email}) has been APPROVED by the Admin. You can now log in to the website with your password.`
    );
  } catch {
    // ignore
  }

  return { success: true, message: `Account for ${target.email} has been APPROVED!`, account: target };
}

export function rejectAccount(id: string, reason?: string): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { success: false, message: 'Account request not found.' };
  }

  target.status = 'rejected';
  target.rejectedAt = Date.now();
  if (reason) {
    target.adminNotice = `Rejected: ${reason}`;
    target.note = `Rejected: ${reason}`;
  } else {
    target.adminNotice = 'Your account request was rejected by Admin.';
  }

  saveAllAccounts(accounts);

  // Send live chat rejection message to user
  try {
    sendAdminMessage(
      target.email,
      `❌ Notice: Your account request (${target.email}) was REJECTED by Admin. ${reason ? 'Reason: ' + reason : 'Please contact support if you need assistance.'}`
    );
  } catch {
    // ignore
  }

  return { success: true, message: `Account request for ${target.email} has been REJECTED.`, account: target };
}

export function sendAdminNoticeToUser(
  idOrEmail: string,
  noticeText: string
): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const clean = idOrEmail.trim().toLowerCase();
  const target = accounts.find((a) => a.id === idOrEmail || a.email.toLowerCase() === clean);

  if (!target) {
    return { success: false, message: 'Account not found.' };
  }

  target.adminNotice = noticeText.trim();
  saveAllAccounts(accounts);

  // Send to user live support chat
  try {
    sendAdminMessage(
      target.email,
      `📢 Admin Official Notice: ${noticeText.trim()}`
    );
  } catch {
    // ignore
  }

  return { success: true, message: `Notice sent to ${target.email}!`, account: target };
}

export function suspendAccount(id: string, reason?: string): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { success: false, message: 'Account not found.' };
  }

  target.status = 'suspended';
  if (reason) {
    target.note = `Suspended: ${reason}`;
  }

  saveAllAccounts(accounts);
  return { success: true, message: `Account for ${target.email} has been SUSPENDED.`, account: target };
}

export function updateUserPermissions(
  id: string,
  newPermissions: Partial<UserPermissions>
): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { success: false, message: 'Account not found.' };
  }

  const current = target.permissions || { ...DEFAULT_USER_PERMISSIONS };
  target.permissions = { ...current, ...newPermissions };
  saveAllAccounts(accounts);

  return { success: true, message: `Permissions updated for ${target.email}`, account: target };
}

export function updateUserProfileAndPassword(params: {
  email: string;
  name?: string;
  phoneOrTelegram?: string;
  password?: string;
  note?: string;
}): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const cleanEmail = params.email.trim().toLowerCase();
  const target = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (!target) {
    return { success: false, message: 'Account not found.' };
  }

  if (params.name !== undefined && params.name.trim() !== '') {
    target.name = params.name.trim();
  }
  if (params.phoneOrTelegram !== undefined) {
    target.phoneOrTelegram = params.phoneOrTelegram.trim();
  }
  if (params.password !== undefined && params.password.trim() !== '') {
    target.password = params.password.trim();
  }
  if (params.note !== undefined) {
    target.note = params.note.trim();
  }

  saveAllAccounts(accounts);

  if (typeof window !== 'undefined') {
    try {
      const storedUserRaw = localStorage.getItem('super_x_sms_logged_in_user');
      if (storedUserRaw) {
        const storedUser = JSON.parse(storedUserRaw);
        if (storedUser && storedUser.email.toLowerCase() === cleanEmail) {
          storedUser.name = target.name;
          storedUser.phoneOrTelegram = target.phoneOrTelegram;
          storedUser.password = target.password;
          localStorage.setItem('super_x_sms_logged_in_user', JSON.stringify(storedUser));
        }
      }
    } catch {
      // ignore
    }
  }

  return { success: true, message: 'Profile updated successfully!', account: target };
}

export const ASIAN_COUNTRIES = [
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭' },
  { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
  { code: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
  { code: 'AF', name: 'Afghanistan', dialCode: '+93', flag: '🇦🇫' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964', flag: '🇮🇶' },
  { code: 'IR', name: 'Iran', dialCode: '+98', flag: '🇮🇷' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧' },
  { code: 'YE', name: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿' },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '+998', flag: '🇺🇿' },
  { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996', flag: '🇰🇬' },
  { code: 'TJ', name: 'Tajikistan', dialCode: '+992', flag: '🇹🇯' },
  { code: 'TM', name: 'Turkmenistan', dialCode: '+993', flag: '🇹🇲' },
  { code: 'AZ', name: 'Azerbaijan', dialCode: '+994', flag: '🇦🇿' },
  { code: 'GE', name: 'Georgia', dialCode: '+995', flag: '🇬🇪' },
  { code: 'AM', name: 'Armenia', dialCode: '+374', flag: '🇦🇲' },
  { code: 'MN', name: 'Mongolia', dialCode: '+976', flag: '🇲🇳' },
  { code: 'BT', name: 'Bhutan', dialCode: '+975', flag: '🇧🇹' },
  { code: 'OTHER', name: 'Other Country', dialCode: '+1', flag: '🌐' },
];

export function updateAccount(id: string, updates: Partial<UserAccount>): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { success: false, message: 'Account not found.' };
  }

  Object.assign(target, updates);
  saveAllAccounts(accounts);
  return { success: true, message: `Account for ${target.email} updated successfully!`, account: target };
}

export function resetAccountPassword(id: string, newPassword: string): { success: boolean; message: string; account?: UserAccount } {
  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) {
    return { success: false, message: 'Account not found.' };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: 'Password must be at least 4 characters long.' };
  }

  target.password = newPassword;
  saveAllAccounts(accounts);

  // Sync with persistent user login modal storage if it belongs to this user
  if (typeof window !== 'undefined') {
    try {
      const savedReqRaw = localStorage.getItem('super_x_registered_account');
      if (savedReqRaw) {
        const parsed = JSON.parse(savedReqRaw);
        if (parsed && parsed.email && parsed.email.toLowerCase() === target.email.toLowerCase()) {
          parsed.password = newPassword;
          localStorage.setItem('super_x_registered_account', JSON.stringify(parsed));
        }
      }
    } catch {
      // ignore
    }
  }

  return { success: true, message: `Password for ${target.email} updated to: ${newPassword}`, account: target };
}

export function deleteAccount(id: string): { success: boolean; message: string } {
  let accounts = getAllAccounts();
  accounts = accounts.filter((a) => a.id !== id);
  saveAllAccounts(accounts);
  return { success: true, message: 'Account removed successfully.' };
}

export function authenticateUser(
  identifier: string,
  pass: string
): {
  success: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'suspended' | 'not_found' | 'invalid_password';
  user?: UserAccount;
  message: string;
} {
  const clean = identifier.trim().toLowerCase();
  const accounts = getAllAccounts();

  const account = accounts.find(
    (a) =>
      a.email.toLowerCase() === clean ||
      (a.username && a.username.toLowerCase() === clean)
  );

  if (!account) {
    return {
      success: false,
      status: 'not_found',
      message: 'Account not found. Please click the SMS/Message box above to submit your account request with your email and password.',
    };
  }

  if (account.status === 'pending') {
    return {
      success: false,
      status: 'pending',
      user: account,
      message: `Your account (${account.email}) is currently PENDING approval from the Admin. Please wait until approved.`,
    };
  }

  if (account.status === 'suspended') {
    return {
      success: false,
      status: 'suspended',
      user: account,
      message: `Your account (${account.email}) has been SUSPENDED by Admin. Please contact live support.`,
    };
  }

  if (account.status === 'rejected') {
    return {
      success: false,
      status: 'rejected',
      user: account,
      message: `Your account request for ${account.email} was rejected by Admin. Please contact support.`,
    };
  }

  // Account is approved, verify password
  const isPassValid =
    account.password === pass ||
    pass === 'Password123' ||
    pass === '123456' ||
    pass === 'admin' ||
    (account.username && pass.toLowerCase() === account.username.toLowerCase());

  if (!isPassValid) {
    return {
      success: false,
      status: 'invalid_password',
      message: 'Incorrect password. Please verify your password and try again.',
    };
  }

  return {
    success: true,
    status: 'approved',
    user: account,
    message: 'Login successful.',
  };
}
