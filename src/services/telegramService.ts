// Real-time Telegram Bot Notification & Auto-Forwarding Service
// Sourced from upstream official SMS CDR alert script

import { getCountryInfo } from './countryHelper';

export interface TelegramBotConfig {
  botToken: string;
  chatId: string;
  channelUrl: string;
  autoForwardEnabled: boolean;
  lastTestedAt?: number;
  lastTestStatus?: string;
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramBotConfig = {
  botToken: '8631714331:AAEd33AVl9oqI-HdGW7jtxE37y4N4nH4ox4',
  chatId: '-1004476126020',
  channelUrl: 'https://t.me/+ZTN2ldN9repmNWNl',
  autoForwardEnabled: true,
};

const TELEGRAM_CONFIG_STORAGE_KEY = 'super_x_telegram_bot_config_v1';
const SENT_HASHES_STORAGE_KEY = 'super_x_telegram_sent_hashes_v1';

// In-memory cache for fast deduplication
const sentHashes = new Set<string>();
const sentTimestamps = new Map<string, number>();
let lastGlobalSendTime = 0;

// Initialize previous hashes from local storage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(SENT_HASHES_STORAGE_KEY);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.slice(-500).forEach((h) => sentHashes.add(h));
      }
    }
  } catch {
    // ignore
  }
}

export function getTelegramConfig(): TelegramBotConfig {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(TELEGRAM_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Automatically migrate old default chatId or token to requested bot token & target group ID -1004476126020
        if (!parsed.chatId || parsed.chatId === '-1003626406102') {
          parsed.chatId = '-1004476126020';
        }
        if (!parsed.botToken || parsed.botToken.startsWith('8041954168')) {
          parsed.botToken = '8631714331:AAEd33AVl9oqI-HdGW7jtxE37y4N4nH4ox4';
        }
        return {
          ...DEFAULT_TELEGRAM_CONFIG,
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_TELEGRAM_CONFIG;
}

export function saveTelegramConfig(config: Partial<TelegramBotConfig>): TelegramBotConfig {
  const current = getTelegramConfig();
  const updated: TelegramBotConfig = {
    ...current,
    ...config,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(TELEGRAM_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('telegram_config_updated', { detail: updated }));
  }
  // Sync with server if available
  fetch('/api/telegram/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  }).catch(() => {});
  return updated;
}

/**
 * Enhanced OTP regex extraction matching Python script exactly
 */
export function extractOtpCode(message: string): string {
  if (!message) return '';
  const text = String(message).trim();

  const otpPatterns = [
    /code[:\s]+(\d{3,8})/i,
    /otp[:\s]+(\d{3,8})/i,
    /verification[:\s]+(\d{3,8})/i,
    /is[:\s]+(\d{3,8})/i,
    /pin[:\s]+(\d{3,8})/i,
    /your\s+(\d{3,8})/i,
    /code\s*[:-]?\s*(\d{3,8})/i,
    /(\d{3,8})\s*is\s+your/i,
    /\b(\d{4,8})\b/,
    /(\d{3,8})/,
  ];

  for (const pattern of otpPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 3) {
      return match[1];
    }
  }

  // Fallback digits scan
  const digits = text.match(/\d+/g);
  if (digits && digits.length > 0) {
    for (const d of digits) {
      if (d.length >= 3 && d.length <= 8) {
        return d;
      }
    }
    return digits[0];
  }

  return text.length <= 8 ? text : '';
}

/**
 * Format timestamp in the script's exact format: 'YYYY/MM/DD – HH:mm:ss'
 */
export function formatScriptTimestamp(dateInput?: Date | number | string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());

  return `${year}/${month}/${day} – ${hours}:${mins}:${secs}`;
}

/**
 * Mask phone number with middle digits hidden, e.g. +2613****807693
 */
export function maskPhoneNumber(rawNumber: string): string {
  if (!rawNumber) return '—';
  const clean = rawNumber.trim();
  const hasPlus = clean.startsWith('+');
  const digits = clean.replace(/\D/g, '');

  if (digits.length <= 6) return clean;

  const first = digits.slice(0, 4);
  const last = digits.slice(-6);
  return `${hasPlus ? '+' : ''}${first}****${last}`;
}

/**
 * Calculate range string from phone number, e.g. 261346807XXX
 */
export function calculateRange(rawNumber: string): string {
  if (!rawNumber) return '—';
  const digits = rawNumber.replace(/\D/g, '');
  if (digits.length <= 3) return `${digits}XXX`;
  if (digits.length <= 8) return `${digits.slice(0, digits.length - 3)}XXX`;
  return `${digits.slice(0, 9)}XXX`;
}

/**
 * Real-time service detection from message content and service name
 */
export function detectRealTimeService(serviceInput: string, smsText: string): string {
  const msg = (smsText || '').toLowerCase();
  const srv = (serviceInput || '').toLowerCase();

  if (msg.includes('whatsapp') || msg.includes('wa.me') || msg.includes('wa code') || srv.includes('whatsapp') || srv === 'wa') return 'WhatsApp';
  if (msg.includes('facebook') || msg.includes('fb-') || msg.includes('meta') || srv.includes('facebook') || srv === 'fb') return 'Facebook';
  if (msg.includes('telegram') || msg.includes('t.me') || msg.includes('tg code') || srv.includes('telegram') || srv === 'tg') return 'Telegram';
  if (msg.includes('instagram') || msg.includes('ig code') || msg.includes('ig-') || srv.includes('instagram') || srv === 'insta') return 'Instagram';
  if (msg.includes('tiktok') || srv.includes('tiktok')) return 'TikTok';
  if (msg.includes('google') || msg.includes('g-') || srv.includes('google')) return 'Google';
  if (msg.includes('imo') || srv.includes('imo')) return 'IMO';
  if (msg.includes('baji') || srv.includes('baji')) return 'Baji';
  if (msg.includes('twitter') || msg.includes('x.com') || srv.includes('twitter')) return 'Twitter / X';
  if (msg.includes('amazon') || srv.includes('amazon')) return 'Amazon';
  if (msg.includes('apple') || srv.includes('apple')) return 'Apple';
  if (msg.includes('snapchat') || srv.includes('snapchat')) return 'Snapchat';

  if (serviceInput && serviceInput.trim() !== 'N/A' && serviceInput.trim() !== 'SMS' && serviceInput.trim() !== 'SMS Service') {
    return serviceInput.trim();
  }
  return 'SMS';
}

/**
 * Generate official alert message body matching the user's Telegram template
 */
export function buildOfficialTelegramMessage(data: {
  number: string;
  service: string;
  message: string;
  time?: number | string;
  otp?: string;
  countryName?: string;
}): string {
  const rawNum = data.number || 'Unknown';
  const smsText = (data.message || '').trim();
  const service = detectRealTimeService(data.service, smsText);
  const otpCode = data.otp || extractOtpCode(smsText) || '—';

  const resolvedCountry = getCountryInfo(rawNum);
  let countryDisplayName = data.countryName || `${resolvedCountry.flag} ${resolvedCountry.name}`;
  if (!countryDisplayName.includes(resolvedCountry.flag)) {
    countryDisplayName = `${resolvedCountry.flag} ${countryDisplayName}`;
  }

  const rangeStr = calculateRange(rawNum);
  const maskedNumber = maskPhoneNumber(rawNum);

  return `✅ <b>OTP RECEIVE SUCCESSFUL</b> ✅

<blockquote>📶 <b>RANGE:</b> <code>${rangeStr}</code></blockquote>

<blockquote>🌍 <b>COUNTRY:</b> ${countryDisplayName}</blockquote>

<blockquote>📱 <b>SERVICE:</b> ${service}</blockquote>

<blockquote>📞 <b>NUMBER:</b> <code>${maskedNumber}</code></blockquote>

<blockquote>🔑 <b>OTP:</b> <code>${otpCode}</code></blockquote>

<blockquote>📩 <b>FULL SMS:</b>
${smsText}</blockquote>`;
}

/**
 * Dispatches an SMS packet to Telegram Bot with deduplication and error handling
 */
export async function sendOtpToTelegram(data: {
  number: string;
  service: string;
  message: string;
  time?: number | string;
  countryName?: string;
}): Promise<{ success: boolean; message: string; error?: any }> {
  const config = getTelegramConfig();
  if (!config.autoForwardEnabled) {
    return { success: false, message: 'Telegram auto-forwarding is currently disabled.' };
  }

  const cleanNum = (data.number || '').trim();
  const cleanMsg = (data.message || '').trim();
  const cleanSrv = (data.service || '').trim();

  if (!cleanMsg && !cleanNum) {
    return { success: false, message: 'Empty message or phone number.' };
  }

  // Generate unique signature hash
  const hashKey = `${cleanNum}|${cleanSrv}|${cleanMsg}`;
  const now = Date.now();

  // Deduplication check: check if already sent
  if (sentHashes.has(hashKey)) {
    return { success: true, message: 'Message already forwarded previously (deduplicated).' };
  }

  // Rate limit protection: avoid sending bursts within 1 second
  if (now - lastGlobalSendTime < 800) {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  const formattedText = buildOfficialTelegramMessage({
    number: cleanNum,
    service: cleanSrv,
    message: cleanMsg,
    time: data.time,
    countryName: data.countryName,
  });

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '‼️ PANEL',
          url: 'https://superxsms.vercel.app/',
        },
        {
          text: '📢 CHANNEL',
          url: 'https://t.me/super_x_sms_s',
        },
      ],
    ],
  };

  try {
    // 1. First try server-side proxy route to bypass browser CORS and handle rate limits safely
    const proxyRes = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken,
        chatId: config.chatId,
        text: formattedText,
        replyMarkup: inlineKeyboard,
      }),
    });

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.ok || json.success) {
        markSent(hashKey, now);
        return { success: true, message: 'Message successfully pushed to Telegram channel!' };
      }
    }
  } catch {
    // fallback to direct Telegram API fetch
  }

  // 2. Direct fetch to Telegram Bot API fallback
  try {
    const directUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const directRes = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: formattedText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: JSON.stringify(inlineKeyboard),
      }),
    });

    const directJson = await directRes.json();
    if (directJson.ok) {
      markSent(hashKey, now);
      return { success: true, message: 'Message sent directly to Telegram!' };
    } else {
      return {
        success: false,
        message: directJson.description || 'Telegram API returned an error',
        error: directJson,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Telegram API',
      error: err,
    };
  }
}

function markSent(hashKey: string, time: number) {
  sentHashes.add(hashKey);
  sentTimestamps.set(hashKey, time);
  lastGlobalSendTime = time;

  if (typeof window !== 'undefined') {
    try {
      const list = Array.from(sentHashes).slice(-300);
      localStorage.setItem(SENT_HASHES_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}

/**
 * Send a verification test message to Telegram
 */
export async function testTelegramBotConnection(
  customToken?: string,
  customChatId?: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const config = getTelegramConfig();
  const token = (customToken || config.botToken || '').trim();
  const chatId = (customChatId || config.chatId || '').trim();

  if (!token || !chatId) {
    return { success: false, message: 'Please provide both Bot Token and Chat ID.' };
  }

  const startTime = Date.now();
  const testMessage = `🤖 <b>SUPER X SMS Telegram Bot Test</b>
  
✅ <b>Status:</b> Gateway Connected & Verified
⏰ <b>Time:</b> ${formatScriptTimestamp()}
💬 <b>Channel ID:</b> <code>${chatId}</code>
⚡ <b>Auto-Forwarding:</b> Active

<i>When new OTPs or SMS arrive in the Social Media dashboard, they will be instantly posted here with full formatting!</i>`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '‼️ PANEL',
          url: 'https://superxsms.vercel.app/',
        },
        {
          text: '📢 CHANNEL',
          url: 'https://t.me/super_x_sms_s',
        },
      ],
    ],
  };

  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: token,
        chatId: chatId,
        text: testMessage,
        replyMarkup: inlineKeyboard,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      const json = await res.json();
      if (json.ok || json.success) {
        saveTelegramConfig({ lastTestedAt: Date.now(), lastTestStatus: 'success' });
        return { success: true, message: 'Test message sent successfully to Telegram!', latencyMs };
      }
    }

    // Direct fallback
    const directUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const directRes = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: JSON.stringify(inlineKeyboard),
      }),
    });

    const directJson = await directRes.json();
    if (directJson.ok) {
      saveTelegramConfig({ lastTestedAt: Date.now(), lastTestStatus: 'success' });
      return { success: true, message: 'Test message delivered via Telegram Bot API!', latencyMs };
    }

    saveTelegramConfig({ lastTestedAt: Date.now(), lastTestStatus: 'failed' });
    return {
      success: false,
      message: directJson.description || 'Telegram rejected the message. Please check Bot Token and Chat ID.',
      latencyMs,
    };
  } catch (err: any) {
    saveTelegramConfig({ lastTestedAt: Date.now(), lastTestStatus: 'failed' });
    return { success: false, message: err?.message || 'Connection error while contacting Telegram.' };
  }
}

/**
 * Send user activity / work notifications to Telegram chat group
 */
export async function sendUserActivityToTelegram(activity: {
  action: string;
  userEmail?: string;
  userName?: string;
  userCode?: string;
  details?: string;
  service?: string;
  number?: string;
  country?: string;
  time?: number | string;
}): Promise<{ success: boolean; message: string }> {
  const config = getTelegramConfig();
  if (!config.autoForwardEnabled) {
    return { success: false, message: 'Telegram auto-forwarding is currently disabled.' };
  }

  const timeStr = formatScriptTimestamp(activity.time);
  const actionLower = activity.action.toLowerCase();
  const actionEmoji =
    actionLower.includes('login') ? '🔑' :
    actionLower.includes('allocat') || actionLower.includes('number') || actionLower.includes('get') ? '📱' :
    actionLower.includes('register') || actionLower.includes('account') || actionLower.includes('signup') ? '👤' :
    actionLower.includes('cancel') || actionLower.includes('release') ? '❌' :
    actionLower.includes('otp') || actionLower.includes('sms') ? '🔐' : '⚡';

  let msgText = `<b>${actionEmoji} SUPER X SMS — USER ACTIVITY REPORT</b>\n\n`;
  msgText += `⏰ <b>Time:</b> ${timeStr}\n`;
  msgText += `📌 <b>Action:</b> ${activity.action.toUpperCase()}\n`;
  if (activity.userName || activity.userEmail) {
    msgText += `👤 <b>User:</b> ${activity.userName || 'User'} (<code>${activity.userEmail || 'N/A'}</code>)\n`;
  }
  if (activity.userCode) {
    msgText += `🆔 <b>Account Code:</b> <code>${activity.userCode}</code>\n`;
  }
  if (activity.service) {
    msgText += `👑 <b>Service:</b> ${activity.service.toUpperCase()}\n`;
  }
  if (activity.number) {
    const country = getCountryInfo(activity.number);
    msgText += `📞 <b>Number:</b> <code>${activity.number}</code> (${country.flag} ${country.name})\n`;
  }
  if (activity.details) {
    msgText += `📝 <b>Details:</b> ${activity.details}\n`;
  }
  msgText += `\n━━━━━━━━━━━━━━\n⚡ <i>SUPER X SMS Live Tracking Gateway</i>`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '‼️ PANEL',
          url: 'https://superxsms.vercel.app/',
        },
        {
          text: '📢 CHANNEL',
          url: 'https://t.me/super_x_sms_s',
        },
      ],
    ],
  };

  try {
    const proxyRes = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken,
        chatId: config.chatId,
        text: msgText,
        replyMarkup: inlineKeyboard,
      }),
    });

    if (proxyRes.ok) {
      return { success: true, message: 'User activity logged to Telegram.' };
    }
  } catch {}

  // Direct fetch fallback
  try {
    const directUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: msgText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: JSON.stringify(inlineKeyboard),
      }),
    });
    return { success: true, message: 'User activity sent directly to Telegram.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to send activity to Telegram.' };
  }
}

