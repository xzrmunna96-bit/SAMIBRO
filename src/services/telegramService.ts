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
  botToken: '8041954168:AAHev2mnmF0nUyLe00QP3VpUMrFhjPW9pbo',
  chatId: '-1003626406102',
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
 * Generate official alert message body exactly formatted as in the Python script
 */
export function buildOfficialTelegramMessage(data: {
  number: string;
  service: string;
  message: string;
  time?: number | string;
  otp?: string;
}): string {
  const number = data.number || 'Unknown';
  const service = (data.service || 'SMS').toUpperCase();
  const smsText = data.message || '';
  const otpCode = data.otp || extractOtpCode(smsText) || '—';
  const country = getCountryInfo(number);
  const timeStr = formatScriptTimestamp(data.time);

  return `💫 𝑶𝑭𝑭𝑰𝑪𝑰𝑨𝑳 𝑨𝑳𝑬𝑹𝑻 𝐎𝐓𝐏💫

⏰ 𝐓𝐢𝐦𝐞: ${timeStr}  
📞 𝐍𝐮𝐦𝐛𝐞𝐫: <code>${number}</code>  
🌍 𝐂𝐨𝐮𝐧𝐭𝐫𝐲: ${country.flag} ${country.name}  
👑 𝗦𝗲𝗿𝘃𝗶𝗰𝗲: ${service}
🔐 𝐘𝐎𝐔𝐑 𝐂𝐎𝐃𝐄:『 <code>${otpCode}</code> 』  

📝 𝐌𝐄𝐒𝐒𝐀𝐆𝐄:  
📲 # ${smsText}  
━━━━━━━━━━━━━━

🔐 𝗦𝗘𝗖𝗨𝗥𝗜𝗧𝗬 𝗡𝗢𝗧𝗜𝗖𝗘  
এই কোডটি শুধুমাত্র আপনার ব্যক্তিগত ব্যবহারের জন্য`;
}

/**
 * Dispatches an SMS packet to Telegram Bot with deduplication and error handling
 */
export async function sendOtpToTelegram(data: {
  number: string;
  service: string;
  message: string;
  time?: number | string;
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
  });

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '📱 Number Channel',
          url: config.channelUrl || 'https://t.me/+ZTN2ldN9repmNWNl',
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
          text: '🚀 Open SUPER X SMS Panel',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://superxsms.com',
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
