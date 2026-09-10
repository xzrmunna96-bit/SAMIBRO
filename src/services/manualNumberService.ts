// =========================================================================
// MANUAL NUMBER POOL & TELEGRAM BOT MANAGEMENT SERVICE
// Manages bot token, admin ID, group chat ID, OTP group, manual country ranges,
// file uploads (up to 10,000 numbers), and real-time number allocation.
// =========================================================================

export interface BotHostingConfig {
  botToken: string;
  adminId: string;
  chatId: string;
  otpGroupUrl: string;
  activePolling: boolean;
  botUsername?: string;
  lastUpdated?: number;
}

export interface ManualNumberRecord {
  id: string;
  number: string;
  cleanDigits: string;
  rangePrefix: string;
  maskedRange: string;
  country: string;
  flag: string;
  dialCode: string;
  platform?: string;
  socialMedia?: string;
  allocated: boolean;
  allocatedTo?: string;
  allocatedAt?: number;
  uploadedAt: number;
}

export interface ManualRangeSummary {
  rangePrefix: string;
  maskedRange: string;
  country: string;
  flag: string;
  dialCode: string;
  platform?: string;
  socialMedia?: string;
  totalCount: number;
  availableCount: number;
  allocatedCount: number;
}

export interface UploadNumbersResult {
  success: boolean;
  message: string;
  addedCount: number;
  totalPoolCount: number;
  ranges: ManualRangeSummary[];
}

// Default initial credentials as requested
export const DEFAULT_BOT_CONFIG: BotHostingConfig = {
  botToken: '8831851994:AAEjiZhHWDl97RABfkzOuk3NbI8291dS1b8',
  adminId: '7084317713',
  chatId: '-1003877961573',
  otpGroupUrl: 'https://t.me/trstyyop',
  activePolling: true,
};

/**
 * Fetch bot hosting config from server
 */
export async function fetchBotHostingConfig(): Promise<BotHostingConfig> {
  try {
    const res = await fetch('/api/bot-management/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        return {
          botToken: data.config.botToken || DEFAULT_BOT_CONFIG.botToken,
          adminId: data.config.adminId || DEFAULT_BOT_CONFIG.adminId,
          chatId: data.config.chatId || DEFAULT_BOT_CONFIG.chatId,
          otpGroupUrl: data.config.otpGroupUrl || DEFAULT_BOT_CONFIG.otpGroupUrl,
          activePolling: data.config.activePolling ?? true,
          botUsername: data.config.botUsername || '',
          lastUpdated: data.config.lastUpdated || Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('[ManualNumberService] Error fetching bot config, using default:', err);
  }
  return DEFAULT_BOT_CONFIG;
}

/**
 * Save bot hosting config to server
 */
export async function saveBotHostingConfig(
  config: Partial<BotHostingConfig>
): Promise<{ success: boolean; message: string; config?: BotHostingConfig }> {
  try {
    const res = await fetch('/api/bot-management/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: data.message || 'Bot configuration saved & hosting refreshed!',
        config: data.config,
      };
    }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to save bot config' };
  }
  return { success: false, message: 'Server returned error saving bot config' };
}

/**
 * Ping / Verify Bot Token with Telegram getMe API
 */
export async function pingTelegramBot(token?: string): Promise<{
  success: boolean;
  message: string;
  botInfo?: { id: number; username?: string; first_name?: string };
}> {
  try {
    const url = token
      ? `/api/bot-management/ping?token=${encodeURIComponent(token)}`
      : '/api/bot-management/ping';
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: `Connected to @${data.bot?.username || 'Bot'} (ID: ${data.bot?.id})`,
        botInfo: data.bot,
      };
    }
    return {
      success: false,
      message: data.error || 'Failed to connect to Telegram Bot API. Please check the token.',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection error checking Bot' };
  }
}

// Seeded default ranges for high-availability & static deployments (Vercel, offline, etc.)
export const DEFAULT_SEEDED_RANGES: ManualRangeSummary[] = [
  { rangePrefix: "94781", maskedRange: "94781XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2485, availableCount: 2485, allocatedCount: 0 },
  { rangePrefix: "94727", maskedRange: "94727XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2479, availableCount: 2479, allocatedCount: 0 },
  { rangePrefix: "94722", maskedRange: "94722XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2477, availableCount: 2477, allocatedCount: 0 },
  { rangePrefix: "94729", maskedRange: "94729XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2474, availableCount: 2474, allocatedCount: 0 },
  { rangePrefix: "94728", maskedRange: "94728XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2472, availableCount: 2472, allocatedCount: 0 },
  { rangePrefix: "94725", maskedRange: "94725XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2471, availableCount: 2471, allocatedCount: 0 },
  { rangePrefix: "94770", maskedRange: "94770XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2460, availableCount: 2460, allocatedCount: 0 },
  { rangePrefix: "94771", maskedRange: "94771XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2455, availableCount: 2455, allocatedCount: 0 },
  { rangePrefix: "94772", maskedRange: "94772XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2450, availableCount: 2450, allocatedCount: 0 },
  { rangePrefix: "94773", maskedRange: "94773XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2445, availableCount: 2445, allocatedCount: 0 },
  { rangePrefix: "94774", maskedRange: "94774XXXXX", country: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 2440, availableCount: 2440, allocatedCount: 0 },
  { rangePrefix: "88017", maskedRange: "88017XXXXX", country: "Bangladesh", flag: "🇧🇩", dialCode: "+880", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 1540, availableCount: 1540, allocatedCount: 0 },
  { rangePrefix: "88018", maskedRange: "88018XXXXX", country: "Bangladesh", flag: "🇧🇩", dialCode: "+880", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 1280, availableCount: 1280, allocatedCount: 0 },
  { rangePrefix: "88019", maskedRange: "88019XXXXX", country: "Bangladesh", flag: "🇧🇩", dialCode: "+880", platform: "Telegram", socialMedia: "Telegram", totalCount: 980, availableCount: 980, allocatedCount: 0 },
  { rangePrefix: "9198", maskedRange: "9198XXXXXX", country: "India", flag: "🇮🇳", dialCode: "+91", platform: "WhatsApp", socialMedia: "WhatsApp", totalCount: 3200, availableCount: 3200, allocatedCount: 0 },
  { rangePrefix: "639", maskedRange: "639XXXXXXXX", country: "Philippines", flag: "🇵🇭", dialCode: "+63", platform: "Telegram", socialMedia: "Telegram", totalCount: 1150, availableCount: 1150, allocatedCount: 0 },
];

const CACHED_RANGES_KEY = 'superx_cached_manual_ranges';

/**
 * Fetch all manual ranges summary with offline / static fallback
 */
export async function fetchManualRanges(): Promise<ManualRangeSummary[]> {
  try {
    const res = await fetch('/api/manual-numbers/ranges');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.ranges) && data.ranges.length > 0) {
        try {
          localStorage.setItem(CACHED_RANGES_KEY, JSON.stringify(data.ranges));
        } catch {}
        return data.ranges;
      }
    }
  } catch (err) {
    console.warn('[ManualNumberService] Error fetching manual ranges from API, using fallback:', err);
  }

  // Fallback to localStorage cache or default seeded ranges
  try {
    const cached = localStorage.getItem(CACHED_RANGES_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Initial populate cache
  try {
    localStorage.setItem(CACHED_RANGES_KEY, JSON.stringify(DEFAULT_SEEDED_RANGES));
  } catch {}

  return DEFAULT_SEEDED_RANGES;
}

/**
 * Fetch all manual numbers with pagination
 */
export async function fetchManualNumbers(
  limit: number = 100,
  offset: number = 0
): Promise<{ total: number; numbers: ManualNumberRecord[] }> {
  try {
    const res = await fetch(`/api/manual-numbers/all?limit=${limit}&offset=${offset}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { total: data.total || 0, numbers: data.numbers || [] };
      }
    }
  } catch (err) {
    console.warn('[ManualNumberService] Error fetching manual numbers:', err);
  }
  return { total: 0, numbers: [] };
}

/**
 * Upload manual numbers (text or list of numbers)
 */
export async function uploadManualNumbers(payload: {
  country: string;
  flag?: string;
  dialCode?: string;
  platform?: string;
  socialMedia?: string;
  numbersText?: string;
  numbersList?: string[];
}): Promise<UploadNumbersResult> {
  try {
    const res = await fetch('/api/manual-numbers/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || `Successfully added ${data.addedCount} numbers!`,
        addedCount: data.addedCount || 0,
        totalPoolCount: data.totalPoolCount || 0,
        ranges: data.ranges || [],
      };
    }
    return {
      success: false,
      message: data.error || 'Failed to upload numbers',
      addedCount: 0,
      totalPoolCount: 0,
      ranges: [],
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Error uploading numbers to server',
      addedCount: 0,
      totalPoolCount: 0,
      ranges: [],
    };
  }
}

/**
 * Allocate 1 manual number from the pool for a given range
 */
export async function allocateManualNumber(
  rangeInput: string,
  userEmail?: string
): Promise<{
  success: boolean;
  numberRecord?: ManualNumberRecord;
  message?: string;
}> {
  try {
    const res = await fetch('/api/manual-numbers/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: rangeInput, userEmail }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.record) {
      return {
        success: true,
        numberRecord: data.record,
        message: 'Number allocated from manual pool successfully',
      };
    }
    return {
      success: false,
      message: data.message || 'No manual number available in this range',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Allocation request failed' };
  }
}

/**
 * Send test OTP for a manual number (routes to website live test and Telegram OTP group)
 */
export async function testSendManualOtp(payload: {
  number: string;
  otpCode?: string;
  service?: string;
  sender?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/manual-numbers/test-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Test OTP dispatched to Website & Telegram OTP Group!',
      };
    }
    return { success: false, message: data.error || 'Failed to dispatch test OTP' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error dispatching OTP' };
  }
}

/**
 * Delete all numbers for a specific range prefix
 */
export async function deleteManualRange(
  rangePrefix: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`/api/manual-numbers/range/${encodeURIComponent(rangePrefix)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || 'Range deleted',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to delete range' };
  }
}

/**
 * Clear all manual numbers in pool
 */
export async function clearAllManualNumbers(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/manual-numbers/clear', { method: 'DELETE' });
    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || 'Manual numbers pool cleared',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to clear pool' };
  }
}
