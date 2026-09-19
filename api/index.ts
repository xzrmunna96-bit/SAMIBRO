import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";
import { GLOBAL_COUNTRIES_LIST } from "../src/services/countryHelper";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App & Firestore for Vercel Serverless Function
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
const firestoreDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// =========================================================================
// SUPER X SMS - VERCEL SERVERLESS UNIVERSAL HANDLER
// High performance, zero-latency serverless API for https://superxsms.vercel.app/
// Voltx API is completely removed. Only real-time FOX SMS gateway is active.
// Synchronizes accounts, subadmins, notices, and live hits across all browsers.
// =========================================================================

const TMP_DATA_DIR = path.join("/tmp", "server-data");
const CWD_DATA_DIR = path.join(process.cwd(), "server-data");

function ensureDirectory(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {}
}

function readJsonFile<T>(filename: string, fallback: T): T {
  // 1. Try /tmp/server-data/ first (newest in serverless lifecycle)
  const tmpPath = path.join(TMP_DATA_DIR, filename);
  if (fs.existsSync(tmpPath)) {
    try {
      const content = fs.readFileSync(tmpPath, "utf-8");
      return JSON.parse(content);
    } catch {}
  }

  // 2. Try server-data/ in project root
  const cwdPath = path.join(CWD_DATA_DIR, filename);
  if (fs.existsSync(cwdPath)) {
    try {
      const content = fs.readFileSync(cwdPath, "utf-8");
      return JSON.parse(content);
    } catch {}
  }

  // 3. Try public/ backup if accounts
  if (filename === "accounts.json") {
    const publicBackup = path.join(process.cwd(), "public", "accounts_backup.json");
    if (fs.existsSync(publicBackup)) {
      try {
        const content = fs.readFileSync(publicBackup, "utf-8");
        return JSON.parse(content);
      } catch {}
    }
  }

  return fallback;
}

function writeJsonFile(filename: string, data: any): void {
  const jsonStr = JSON.stringify(data, null, 2);

  // Always write to /tmp/server-data/
  try {
    ensureDirectory(TMP_DATA_DIR);
    fs.writeFileSync(path.join(TMP_DATA_DIR, filename), jsonStr, "utf-8");
  } catch {}

  // Attempt write to project server-data/ (if writable)
  try {
    ensureDirectory(CWD_DATA_DIR);
    fs.writeFileSync(path.join(CWD_DATA_DIR, filename), jsonStr, "utf-8");
  } catch {}
}

// In-memory runtime caches for blazing speed on warm invocations
let memoryAccounts: any[] = readJsonFile<any[]>("accounts.json", []);
let memorySubAdmins: any[] = readJsonFile<any[]>("subadmins.json", []);
let memorySiteNotice = readJsonFile<any>("site_notice.json", {
  noticeText: "SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active",
  updatedAt: Date.now(),
});
let memoryManagerNotice = readJsonFile<any>("manager_popup_notice.json", {
  noticeText: "",
  updatedAt: Date.now(),
});
let memoryPopupBanner = readJsonFile<any>("popup_banner.json", {
  enabled: false,
  title: "Welcome to SUPER X SMS",
  message: "",
  updatedAt: Date.now(),
});
let memoryMaintenance = readJsonFile<any>("maintenance.json", {
  isMaintenance: false,
  message: "",
});
let memoryNotifications: any[] = readJsonFile<any[]>("notifications.json", []);
let memoryNumbers: any[] = readJsonFile<any[]>("shared_account_numbers.json", []);
let memoryRates: any[] = readJsonFile<any[]>("rates.json", []);
let memoryLiveChats: any[] = readJsonFile<any[]>("live_chats.json", []);
let memoryManualNumbers: any[] = readJsonFile<any[]>("manual_numbers_pool.json", []);
let memoryBotConfig: any = readJsonFile<any>("bot_management_config.json", {
  botToken: "8892734138:AAEu_wMYBM6523MjGIbGGwtPbXSko0yqhew",
  adminId: "7084317713",
  chatId: "-1004476126020",
  otpGroupUrl: "https://t.me/trstyyop",
  activePolling: true,
  botUsername: "",
  lastUpdated: Date.now(),
});

function loadManualNumbersPool(): any[] {
  memoryManualNumbers = readJsonFile<any[]>("manual_numbers_pool.json", []);
  return memoryManualNumbers.filter((item: any) => !item.id?.startsWith("seed_"));
}

function saveManualNumbersPool(list: any[]) {
  memoryManualNumbers = list;
  writeJsonFile("manual_numbers_pool.json", list);
  // Async sync to Firebase Firestore for cross-platform real-time sync
  try {
    const docRef = doc(firestoreDb, "app_data", "manual_pool");
    setDoc(docRef, { list, updatedAt: Date.now() }, { merge: true }).catch(() => {});
  } catch {}
}

function findCountryByNameOrCode(rawInput: string): { name: string; flag: string; dialCode: string } {
  const raw = (rawInput || "").replace(/\.[^/.]+$/, "").trim();
  if (!raw) return { name: "Global", flag: "🌐", dialCode: "" };

  const clean = raw.toLowerCase();
  const normalized = clean.replace(/[^a-z0-9]/g, "");

  if (normalized === "bd" || normalized.includes("bangla")) return { name: "Bangladesh", flag: "🇧🇩", dialCode: "+880" };
  if (normalized === "lk" || normalized.includes("srilanka") || normalized.includes("sri lanka")) return { name: "Sri Lanka", flag: "🇱🇰", dialCode: "+94" };
  if (normalized === "in" || normalized.includes("india")) return { name: "India", flag: "🇮🇳", dialCode: "+91" };
  if (normalized === "pk" || normalized.includes("pakistan")) return { name: "Pakistan", flag: "🇵🇰", dialCode: "+92" };
  if (normalized === "ci" || normalized.includes("ivory") || normalized.includes("cote")) return { name: "Ivory Coast", flag: "🇨🇮", dialCode: "+225" };
  if (normalized === "us" || normalized === "usa" || normalized.includes("america") || normalized.includes("unitedstates")) return { name: "United States", flag: "🇺🇸", dialCode: "+1" };
  if (normalized === "uk" || normalized === "gb" || normalized.includes("kingdom") || normalized.includes("britain")) return { name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" };
  if (normalized === "uae" || normalized.includes("dubai") || normalized.includes("emirates")) return { name: "UAE", flag: "🇦🇪", dialCode: "+971" };
  if (normalized === "ksa" || normalized.includes("saudi")) return { name: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966" };

  const direct = GLOBAL_COUNTRIES_LIST.find(
    (c) => c.name.toLowerCase() === clean || c.iso.toLowerCase() === clean
  );
  if (direct) return { name: direct.name, flag: direct.flag, dialCode: direct.dialCode };

  const normMatch = GLOBAL_COUNTRIES_LIST.find(
    (c) => {
      const cNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return normalized.includes(cNorm) || cNorm.includes(normalized);
    }
  );
  if (normMatch) return { name: normMatch.name, flag: normMatch.flag, dialCode: normMatch.dialCode };

  const partial = GLOBAL_COUNTRIES_LIST.find(
    (c) => clean.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(clean)
  );
  if (partial) return { name: partial.name, flag: partial.flag, dialCode: partial.dialCode };

  const cleanDigits = clean.replace(/\D/g, "");
  if (cleanDigits) {
    const byDial = GLOBAL_COUNTRIES_LIST.find(
      (c) => c.dialCode.replace(/\D/g, "") === cleanDigits
    );
    if (byDial) return { name: byDial.name, flag: byDial.flag, dialCode: byDial.dialCode };
  }

  return { name: raw.trim(), flag: "🌐", dialCode: "" };
}

function detectCountryFromNumbers(sampleNumbers: string[]): { name: string; flag: string; dialCode: string } | null {
  if (!sampleNumbers || sampleNumbers.length === 0) return null;
  
  const sortedCountries = [...GLOBAL_COUNTRIES_LIST].sort((a, b) => {
    const d1 = a.dialCode.replace(/\D/g, "");
    const d2 = b.dialCode.replace(/\D/g, "");
    return d2.length - d1.length;
  });

  const voteCount = new Map<string, { country: typeof GLOBAL_COUNTRIES_LIST[0]; votes: number }>();

  for (const num of sampleNumbers.slice(0, 50)) {
    const digits = num.replace(/\D/g, "");
    if (digits.length < 7) continue;

    for (const c of sortedCountries) {
      const codeDigits = c.dialCode.replace(/\D/g, "");
      if (codeDigits && digits.startsWith(codeDigits)) {
        const prev = voteCount.get(c.name);
        if (prev) {
          prev.votes += 1;
        } else {
          voteCount.set(c.name, { country: c, votes: 1 });
        }
        break;
      }
    }
  }

  let bestMatch: { country: typeof GLOBAL_COUNTRIES_LIST[0]; votes: number } | null = null;
  for (const item of voteCount.values()) {
    if (!bestMatch || item.votes > bestMatch.votes) {
      bestMatch = item;
    }
  }

  if (bestMatch && bestMatch.votes >= 1) {
    return {
      name: bestMatch.country.name,
      flag: bestMatch.country.flag,
      dialCode: bestMatch.country.dialCode,
    };
  }

  return null;
}

function parseManualNumbersDetailed(
  rawText: string,
  defaultCountry: string,
  defaultFlag: string,
  defaultDialCode: string,
  platform: string = "All Social (WhatsApp/TG)"
): any {
  const lines = (rawText || "").split(/[\r\n]+/);
  const addedRecords: any[] = [];
  const pool = loadManualNumbersPool();
  const existingMap = new Map<string, any>(pool.map((n) => [n.cleanDigits, n]));
  const now = Date.now();

  const sampleDigits: string[] = [];
  let existingCount = 0;

  const uniqueCleanTokens = new Set<string>();

  for (const line of lines) {
    const parts = line.split(/[\t,;|\s]+/);
    for (const part of parts) {
      let token = part.trim();
      if (!token) continue;

      if (/[a-zA-Z]/.test(token)) continue;

      if (token.endsWith(".0")) {
        token = token.slice(0, -2);
      } else if (token.endsWith(".00")) {
        token = token.slice(0, -3);
      }

      const digits = token.replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 16) {
        if (!uniqueCleanTokens.has(digits)) {
          uniqueCleanTokens.add(digits);
          sampleDigits.push(digits);
          if (sampleDigits.length >= 50) break;
        }
      }
    }
    if (sampleDigits.length >= 50) break;
  }

  let resolvedCountry = "";
  let resolvedFlag = "";
  let resolvedDial = "";

  if (defaultCountry && defaultCountry !== "Global") {
    resolvedCountry = defaultCountry;
    resolvedFlag = defaultFlag || "🌐";
    resolvedDial = defaultDialCode || "";
  } else {
    const detected = detectCountryFromNumbers(sampleDigits);
    if (detected) {
      resolvedCountry = detected.name;
      resolvedFlag = detected.flag;
      resolvedDial = detected.dialCode;
    } else {
      resolvedCountry = defaultCountry || "Global";
      resolvedFlag = defaultFlag || "🌐";
      resolvedDial = defaultDialCode || "";
    }
  }

  const processedDigits = new Set<string>();

  for (const line of lines) {
    const parts = line.split(/[\t,;|\s]+/);
    for (const part of parts) {
      let token = part.trim();
      if (!token) continue;

      if (/[a-zA-Z]/.test(token)) continue;

      if (token.endsWith(".0")) {
        token = token.slice(0, -2);
      } else if (token.endsWith(".00")) {
        token = token.slice(0, -3);
      }

      const digits = token.replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 16) {
        if (processedDigits.has(digits)) continue;
        processedDigits.add(digits);

        const existing = existingMap.get(digits);
        if (existing) {
          existingCount++;
          existing.allocated = false;
          if (resolvedCountry && resolvedCountry !== "Global") {
            existing.country = resolvedCountry;
            existing.flag = resolvedFlag;
            existing.dialCode = resolvedDial;
          }
          if (platform) {
            existing.platform = platform;
            existing.socialMedia = platform;
          }
        } else {
          const fullNum = token.startsWith("+") ? token : `+${digits}`;
          const prefix = digits.slice(0, 5);
          const mask = `${prefix}${"X".repeat(Math.max(0, digits.length - 5))}`;

          const newRec = {
            id: `num_${now}_${Math.random().toString(36).slice(2, 7)}`,
            number: fullNum,
            cleanDigits: digits,
            rangePrefix: prefix,
            maskedRange: mask,
            country: resolvedCountry || "Global",
            flag: resolvedFlag || "🌐",
            dialCode: resolvedDial || "",
            platform: platform || "All Social (WhatsApp/TG)",
            socialMedia: platform || "All Social (WhatsApp/TG)",
            allocated: false,
            uploadedAt: now,
          };

          existingMap.set(digits, newRec);
          addedRecords.push(newRec);
        }
      }
    }
  }

  return {
    addedRecords,
    newCount: addedRecords.length,
    existingCount,
    totalProcessed: addedRecords.length + existingCount,
    detectedCountry: {
      name: resolvedCountry || "Global",
      flag: resolvedFlag || "🌐",
      dialCode: resolvedDial || "",
    },
  };
}

function getManualRangesSummary(pool: any[]): any[] {
  const map = new Map<string, any>();

  for (const item of pool) {
    const key = `${item.rangePrefix}_${item.country}_${item.platform || "All"}`;
    if (!map.has(key)) {
      map.set(key, {
        rangePrefix: item.rangePrefix,
        maskedRange: item.maskedRange,
        country: item.country,
        flag: item.flag,
        dialCode: item.dialCode,
        platform: item.platform || item.socialMedia || "All Social (WhatsApp/TG)",
        socialMedia: item.socialMedia || item.platform || "All Social (WhatsApp/TG)",
        totalCount: 0,
        availableCount: 0,
        allocatedCount: 0,
      });
    }
    const entry = map.get(key)!;
    entry.totalCount += 1;
    if (item.allocated) {
      entry.allocatedCount += 1;
    } else {
      entry.availableCount += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
}

let lastTelegramUpdateId = 0;

async function sendTelegramMessage(botToken: string, chatId: string | number, text: string) {
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {}
}

async function handleTelegramUpdateInApi(update: any, botConfig: any) {
  if (!update) return;
  const botToken = botConfig?.botToken || DEFAULT_BOT_CONFIG.botToken;

  const msg = update.message || update.channel_post || update.edited_message;
  if (!msg) return;

  const chatId = msg.chat?.id;
  const text = (msg.text || msg.caption || "").trim();

  // If a document (.txt / .csv) is attached
  if (msg.document) {
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name || "numbers.txt";

    try {
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      if (fileInfoRes.ok) {
        const fileInfo = await fileInfoRes.json();
        const filePath = fileInfo.result?.file_path;
        if (filePath) {
          const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
          if (fileRes.ok) {
            const fileContent = await fileRes.text();
            const countryInfo = detectCountryFromText(fileName) || { name: "Global", flag: "🌐", dialCode: "" };
            
            const parseResult = parseManualNumbersDetailed(
              fileContent,
              countryInfo.name,
              countryInfo.flag,
              countryInfo.dialCode,
              "All Social (WhatsApp/TG)"
            );

            if (parseResult.newCount > 0) {
              const replyMsg = `✅ <b>SUPER X SMS — Numbers Uploaded!</b>\n\n` +
                `📁 <b>File:</b> <code>${fileName}</code>\n` +
                `🌍 <b>Country:</b> ${parseResult.detectedCountry.flag} <b>${parseResult.detectedCountry.name}</b>\n` +
                `📞 <b>Added Numbers:</b> <code>${parseResult.newCount}</code>\n` +
                `🔄 <b>Total Pool Count:</b> <code>${parseResult.totalProcessed}</code>\n\n` +
                `<i>Available instantly on Website & Choose Termination dropdown!</i>`;
              await sendTelegramMessage(botToken, chatId, replyMsg);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Telegram File Process Error]:", err);
    }
    return;
  }

  // If message contains digits/numbers text
  if (text && /\d{7,}/.test(text)) {
    const countryInfo = detectCountryFromText(text) || { name: "Global", flag: "🌐", dialCode: "" };
    const parseResult = parseManualNumbersDetailed(
      text,
      countryInfo.name,
      countryInfo.flag,
      countryInfo.dialCode,
      "All Social (WhatsApp/TG)"
    );

    if (parseResult.newCount > 0) {
      const replyMsg = `✅ <b>SUPER X SMS — Text Numbers Added!</b>\n\n` +
        `🌍 <b>Country:</b> ${parseResult.detectedCountry.flag} <b>${parseResult.detectedCountry.name}</b>\n` +
        `📞 <b>Added Numbers:</b> <code>${parseResult.newCount}</code>\n\n` +
        `<i>Visible real-time on Website & Choose Termination dropdown!</i>`;
      await sendTelegramMessage(botToken, chatId, replyMsg);
    }
  }
}

async function pollTelegramUpdatesInApi(botConfig: any) {
  const botToken = botConfig?.botToken || DEFAULT_BOT_CONFIG.botToken;
  if (!botToken) return;

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastTelegramUpdateId + 1}&limit=20&timeout=1`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.result)) {
        for (const update of json.result) {
          lastTelegramUpdateId = Math.max(lastTelegramUpdateId, update.update_id);
          await handleTelegramUpdateInApi(update, botConfig);
        }
      }
    }
  } catch {}
}

function allocateOneManualNumber(rangeInput: string, allocatedTo?: string): any {
  const raw = (rangeInput || "").trim();
  const cleanDigits = raw.replace(/\D/g, "");
  const cleanPrefix = cleanDigits.slice(0, 5);
  const pool = loadManualNumbersPool();

  let targetIndex = pool.findIndex(
    (n) =>
      !n.allocated &&
      (n.rangePrefix === cleanDigits ||
        n.rangePrefix === cleanPrefix ||
        (cleanDigits.length >= 3 && n.cleanDigits.startsWith(cleanDigits)) ||
        (cleanPrefix.length >= 3 && n.cleanDigits.startsWith(cleanPrefix)))
  );

  if (targetIndex < 0 && cleanDigits.length >= 4) {
    targetIndex = pool.findIndex(
      (n) => !n.allocated && n.cleanDigits.includes(cleanDigits)
    );
  }

  if (targetIndex < 0 && (!cleanDigits || raw.toLowerCase() === "all" || raw.toLowerCase() === "any")) {
    targetIndex = pool.findIndex((n) => !n.allocated);
  }

  if (targetIndex >= 0) {
    pool[targetIndex].allocated = true;
    pool[targetIndex].allocatedTo = allocatedTo || "website_user";
    pool[targetIndex].allocatedAt = Date.now();
    saveManualNumbersPool(pool);
    return pool[targetIndex];
  }
  return null;
}

// Ensure super admin always exists
if (!memoryAccounts.some((a) => a.email === "xzrmunna96@gmail.com")) {
  memoryAccounts.unshift({
    id: "user_admin_munna",
    name: "XZR Munna",
    email: "xzrmunna96@gmail.com",
    username: "xzrmunna",
    password: "Password123",
    accountCode: "2886064606",
    status: "approved",
    role: "admin",
    createdAt: 1786286109036,
    phoneOrTelegram: "@xzrmunna",
    note: "System Super Admin",
    approvedAt: 1786286109036,
  });
}

// =========================================================================
// REAL-TIME FOX SMS GATEWAY STREAM
// Direct integration with http://169.58.133.106/ints/api/v1/viewstats
// =========================================================================
let cachedHits: any[] = [];
let lastFoxSyncTime = 0;

const KNOWN_APPS = [
  "WhatsApp",
  "Telegram",
  "Facebook",
  "IMO",
  "TikTok",
  "Instagram",
  "Google",
  "Apple",
  "Baji",
  "Twitter / X",
  "Amazon",
  "Snapchat",
  "Viber",
  "Discord",
  "Microsoft",
  "Huawei",
];

const BASELINE_COUNTS: Record<string, number> = {};

async function fetchFromFoxSmsUpstream(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3800);
    const res = await fetch(
      "http://169.58.133.106/ints/api/v1/viewstats?token=zQC9YAcWzVH-bL05MdRYHp4j8x6QOcs1amLyI9yhaQBVnQSS&records=100",
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json, text/plain, */*",
        },
      }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data: any = await res.json();
      if (data && Array.isArray(data.data)) {
        return data.data.map((item: any) => {
          let timeVal = Date.now();
          if (item.dt) {
            const dtStr = String(item.dt).trim();
            const iso = dtStr.includes(" ") && !dtStr.includes("T") ? dtStr.replace(" ", "T") + "Z" : dtStr;
            const parsed = new Date(iso).getTime();
            if (!isNaN(parsed) && parsed > 0) timeVal = parsed;
          }
          const rawNum = String(item.num || item.number || "").replace(/\D/g, "");
          const rangePrefix = rawNum.length >= 5 ? rawNum.slice(0, 5) : rawNum;
          const cli = String(item.cli || item.service || "FOX SMS").trim();

          return {
            range: rangePrefix,
            number: rawNum,
            num: rawNum,
            sid: cli,
            service: cli,
            cli,
            message: item.message || "",
            payout: item.payout || "0.0100",
            time: timeVal,
            dt: item.dt,
            operator: "FOX SMS Carrier Route",
            country: "International",
            source: "FOX SMS",
            isFoxSms: true,
          };
        });
      }
    }
  } catch {}
  return [];
}

async function fetchFromSevenOnTelUpstream(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3800);
    const res = await fetch(
      "http://147.135.212.197/crapi/s1t/viewstats?token=%20Qk9YNEVBdXVDV6UG-JaU6BZ11jT4tKcXSDiJCCQX6EVYnpbox_VoU=&records=100",
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json, text/plain, */*",
        },
      }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data: any = await res.json();
      if (data && Array.isArray(data.data)) {
        return data.data.map((item: any) => {
          let timeVal = Date.now();
          if (item.dt) {
            const dtStr = String(item.dt).trim();
            const iso = dtStr.includes(" ") && !dtStr.includes("T") ? dtStr.replace(" ", "T") + "Z" : dtStr;
            const parsed = new Date(iso).getTime();
            if (!isNaN(parsed) && parsed > 0) timeVal = parsed;
          }
          const rawNum = String(item.num || item.number || "").replace(/\D/g, "");
          const rangePrefix = rawNum.length >= 5 ? rawNum.slice(0, 5) : rawNum;
          const cli = String(item.cli || item.service || "Seven On Tel").trim();

          return {
            range: rangePrefix,
            number: rawNum,
            num: rawNum,
            sid: cli,
            service: cli,
            cli,
            message: item.message || "",
            payout: item.payout || "0.0100",
            time: timeVal,
            dt: item.dt,
            operator: "Seven On Tel Carrier Route",
            country: "International",
            source: "Seven On Tel",
            isFoxSms: true, // set to true for easy frontend filter integration
            isSevenOnTel: true,
          };
        });
      }
    }
  } catch {}
  return [];
}

async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === "object") return req.body;
  if (req.body && typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: any) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const rawUrl = req.url || "";
  const cleanPath = rawUrl.split("?")[0].replace(/\/$/, "");
  const method = req.method?.toUpperCase() || "GET";

  // -------------------------------------------------------------------------
  // 1. GLOBAL LIVE STREAM & FOX SMS
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/global-live-stream" || cleanPath.endsWith("/global-live-stream")) {
    const now = Date.now();
    if (now - lastFoxSyncTime > 3000 || cachedHits.length === 0) {
      const freshFox = await fetchFromFoxSmsUpstream();
      const freshSeven = await fetchFromSevenOnTelUpstream();
      const merged = [...freshFox, ...freshSeven];
      if (merged.length > 0) {
        merged.sort((a, b) => b.time - a.time);
        cachedHits = merged;
        lastFoxSyncTime = now;
      }
    }

    const appCounts: Record<string, number> = {};
    const rangeCounts: Record<string, number> = {};

    cachedHits.forEach((h) => {
      const s = (h.sid || h.cli || "").toLowerCase();
      const m = (h.message || "").toLowerCase();
      KNOWN_APPS.forEach((appName) => {
        const aLow = appName.toLowerCase();
        if (s.includes(aLow) || m.includes(aLow)) {
          appCounts[appName] = (appCounts[appName] || 0) + 1;
        }
      });
      const r = h.range || "";
      if (r) {
        rangeCounts[r] = (rangeCounts[r] || 0) + 1;
      }
    });

    return sendJson(res, 200, {
      success: true,
      voltxActive: false, // Permanently deactivated per user command
      count: cachedHits.length,
      hits: cachedHits,
      stats: {
        appCounts,
        rangeCounts,
        totalHits: cachedHits.length,
      },
      lastUpdated: Date.now(),
    });
  }

  if (cleanPath === "/api/global-live-stream/reset" && method === "POST") {
    cachedHits = [];
    lastFoxSyncTime = 0;
    return sendJson(res, 200, { success: true, message: "Stream reset" });
  }

  if (cleanPath === "/api/global-live-stream/push" && method === "POST") {
    const body = await parseBody(req);
    const hit = body.hit || body;
    if (hit) {
      cachedHits.unshift({ ...hit, isFoxSms: true, source: "FOX SMS" });
      if (cachedHits.length > 100) cachedHits.pop();
    }
    return sendJson(res, 200, { success: true, count: cachedHits.length });
  }

  // -------------------------------------------------------------------------
  // 2. FOX SMS DIRECT STATS ENDPOINTS
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/foxsms/stats" || cleanPath === "/api/foxsms/viewstats") {
    const fresh = await fetchFromFoxSmsUpstream();
    return sendJson(res, 200, {
      success: true,
      count: fresh.length,
      hits: fresh,
      message: "FOX SMS stream active",
    });
  }

  // -------------------------------------------------------------------------
  // 3. VOLTX API STATUS & TOGGLE (Permanently disabled)
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/voltx/status" || cleanPath === "/api/voltx/toggle") {
    return sendJson(res, 200, {
      success: true,
      isActive: false,
      message: "Voltx API has been permanently removed. Only FOX SMS is active.",
      lastUpdated: Date.now(),
    });
  }

  // -------------------------------------------------------------------------
  // 4. USER ACCOUNTS MANAGEMENT (Cross-Browser Synchronized)
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/accounts" && method === "GET") {
    return sendJson(res, 200, {
      success: true,
      count: memoryAccounts.length,
      accounts: memoryAccounts,
      timestamp: Date.now(),
    });
  }

  if (cleanPath === "/api/accounts" && method === "POST") {
    const body = await parseBody(req);
    if (Array.isArray(body.accounts)) {
      memoryAccounts = body.accounts;
    } else if (body.user || body.account) {
      const u = body.user || body.account;
      const idx = memoryAccounts.findIndex((a) => a.id === u.id || (u.email && a.email === u.email));
      if (idx >= 0) {
        memoryAccounts[idx] = { ...memoryAccounts[idx], ...u, updatedAt: Date.now() };
      } else {
        memoryAccounts.push({ ...u, createdAt: u.createdAt || Date.now(), updatedAt: Date.now() });
      }
    }
    writeJsonFile("accounts.json", memoryAccounts);
    return sendJson(res, 200, {
      success: true,
      count: memoryAccounts.length,
      accounts: memoryAccounts,
    });
  }

  if (cleanPath === "/api/accounts/approve" && method === "POST") {
    const { id, approvedByEmail, approvedByName } = await parseBody(req);
    const acc = memoryAccounts.find((a) => a.id === id || a.email === id);
    if (acc) {
      acc.status = "approved";
      acc.approvedAt = Date.now();
      acc.approvedByEmail = approvedByEmail || "admin";
      acc.approvedByName = approvedByName || "Admin";
      acc.updatedAt = Date.now();
      writeJsonFile("accounts.json", memoryAccounts);
      return sendJson(res, 200, { success: true, account: acc, accounts: memoryAccounts });
    }
    return sendJson(res, 404, { success: false, message: "Account not found" });
  }

  if (cleanPath === "/api/accounts/reject" && method === "POST") {
    const { id, rejectedByEmail, rejectedByName } = await parseBody(req);
    const acc = memoryAccounts.find((a) => a.id === id || a.email === id);
    if (acc) {
      acc.status = "rejected";
      acc.rejectedAt = Date.now();
      acc.rejectedByEmail = rejectedByEmail || "admin";
      acc.rejectedByName = rejectedByName || "Admin";
      acc.updatedAt = Date.now();
      writeJsonFile("accounts.json", memoryAccounts);
      return sendJson(res, 200, { success: true, account: acc, accounts: memoryAccounts });
    }
    return sendJson(res, 404, { success: false, message: "Account not found" });
  }

  if (cleanPath === "/api/accounts/suspend" && method === "POST") {
    const { id, banReason } = await parseBody(req);
    const acc = memoryAccounts.find((a) => a.id === id || a.email === id);
    if (acc) {
      acc.status = "suspended";
      acc.banReason = banReason || "Suspended by admin";
      acc.updatedAt = Date.now();
      writeJsonFile("accounts.json", memoryAccounts);
      return sendJson(res, 200, { success: true, account: acc, accounts: memoryAccounts });
    }
    return sendJson(res, 404, { success: false, message: "Account not found" });
  }

  if (cleanPath === "/api/accounts/unsuspend" && method === "POST") {
    const { id } = await parseBody(req);
    const acc = memoryAccounts.find((a) => a.id === id || a.email === id);
    if (acc) {
      acc.status = "approved";
      delete acc.banReason;
      acc.updatedAt = Date.now();
      writeJsonFile("accounts.json", memoryAccounts);
      return sendJson(res, 200, { success: true, account: acc, accounts: memoryAccounts });
    }
    return sendJson(res, 404, { success: false, message: "Account not found" });
  }

  if (cleanPath === "/api/accounts/role" && method === "POST") {
    const { id, role, permissions } = await parseBody(req);
    const acc = memoryAccounts.find((a) => a.id === id || a.email === id);
    if (acc) {
      acc.role = role || acc.role;
      if (permissions) acc.permissions = permissions;
      acc.updatedAt = Date.now();
      writeJsonFile("accounts.json", memoryAccounts);
      return sendJson(res, 200, { success: true, account: acc, accounts: memoryAccounts });
    }
    return sendJson(res, 404, { success: false, message: "Account not found" });
  }

  if (cleanPath === "/api/accounts/request" && method === "POST") {
    const body = await parseBody(req);
    const newAcc = {
      id: body.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: body.name || "User",
      email: body.email,
      password: body.password || "Password123",
      accountCode: body.accountCode || Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      status: "pending",
      role: body.role || "user",
      createdAt: Date.now(),
      phoneOrTelegram: body.phoneOrTelegram || "",
      note: body.note || "",
      ...body,
    };
    memoryAccounts.push(newAcc);
    writeJsonFile("accounts.json", memoryAccounts);
    return sendJson(res, 200, { success: true, account: newAcc, accounts: memoryAccounts });
  }

  if (cleanPath === "/api/accounts/login" && method === "POST") {
    const { email, password } = await parseBody(req);
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanPass = (password || "").trim();

    if (cleanEmail === "xzrmunna96@gmail.com" && cleanPass === "Password123") {
      const superAdmin = memoryAccounts.find((a) => a.email === "xzrmunna96@gmail.com") || {
        id: "user_admin_munna",
        name: "XZR Munna",
        email: "xzrmunna96@gmail.com",
        role: "admin",
        status: "approved",
      };
      return sendJson(res, 200, { success: true, user: superAdmin });
    }

    const found = memoryAccounts.find(
      (a) => (a.email || "").toLowerCase().trim() === cleanEmail && a.password === cleanPass
    );
    if (found) {
      return sendJson(res, 200, { success: true, user: found });
    }
    return sendJson(res, 401, { success: false, message: "Invalid credentials" });
  }

  if (cleanPath === "/api/accounts/purge-all-except-super-admin" && method === "POST") {
    memoryAccounts = memoryAccounts.filter((a) => a.email === "xzrmunna96@gmail.com");
    writeJsonFile("accounts.json", memoryAccounts);
    return sendJson(res, 200, { success: true, count: memoryAccounts.length });
  }

  if (cleanPath === "/api/accounts" && method === "DELETE") {
    const { id, email } = await parseBody(req);
    memoryAccounts = memoryAccounts.filter((a) => a.id !== id && a.email !== email);
    writeJsonFile("accounts.json", memoryAccounts);
    return sendJson(res, 200, { success: true, count: memoryAccounts.length });
  }

  // -------------------------------------------------------------------------
  // 5. SUB-ADMINS MANAGEMENT
  // -------------------------------------------------------------------------
  if ((cleanPath === "/api/subadmins" || cleanPath === "/api/admin/subadmins") && method === "GET") {
    return sendJson(res, 200, { success: true, subAdmins: memorySubAdmins });
  }

  if ((cleanPath === "/api/subadmins" || cleanPath === "/api/admin/subadmins") && method === "POST") {
    const body = await parseBody(req);
    const sub = body.subAdmin || body;
    if (sub && sub.email) {
      const idx = memorySubAdmins.findIndex((s) => s.id === sub.id || s.email === sub.email);
      if (idx >= 0) {
        memorySubAdmins[idx] = { ...memorySubAdmins[idx], ...sub };
      } else {
        memorySubAdmins.push({
          id: sub.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          createdAt: Date.now(),
          ...sub,
        });
      }
      writeJsonFile("subadmins.json", memorySubAdmins);
    }
    return sendJson(res, 200, { success: true, subAdmins: memorySubAdmins });
  }

  if ((cleanPath === "/api/subadmins" || cleanPath === "/api/admin/subadmins") && method === "DELETE") {
    const { id, email } = await parseBody(req);
    memorySubAdmins = memorySubAdmins.filter((s) => s.id !== id && s.email !== email);
    writeJsonFile("subadmins.json", memorySubAdmins);
    return sendJson(res, 200, { success: true, subAdmins: memorySubAdmins });
  }

  // -------------------------------------------------------------------------
  // 6. SITE NOTICES & POPUP BANNERS
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/site-notice" && method === "GET") {
    return sendJson(res, 200, {
      success: true,
      noticeText: memorySiteNotice.noticeText,
      updatedAt: memorySiteNotice.updatedAt || Date.now(),
    });
  }

  if (cleanPath === "/api/site-notice" && method === "POST") {
    const body = await parseBody(req);
    if (body.noticeText) {
      memorySiteNotice = {
        noticeText: String(body.noticeText).trim(),
        updatedAt: body.updatedAt || Date.now(),
      };
      writeJsonFile("site_notice.json", memorySiteNotice);
    }
    return sendJson(res, 200, { success: true, ...memorySiteNotice });
  }

  if (cleanPath === "/api/manager-popup-notice" && method === "GET") {
    return sendJson(res, 200, {
      success: true,
      noticeText: memoryManagerNotice.noticeText || "",
      updatedAt: memoryManagerNotice.updatedAt || Date.now(),
    });
  }

  if (cleanPath === "/api/manager-popup-notice" && method === "POST") {
    const body = await parseBody(req);
    memoryManagerNotice = {
      noticeText: String(body.noticeText || "").trim(),
      updatedAt: Date.now(),
    };
    writeJsonFile("manager_popup_notice.json", memoryManagerNotice);
    return sendJson(res, 200, { success: true, ...memoryManagerNotice });
  }

  if (cleanPath === "/api/popup-banner" && method === "GET") {
    return sendJson(res, 200, { success: true, ...memoryPopupBanner });
  }

  if (cleanPath === "/api/popup-banner" && method === "POST") {
    const body = await parseBody(req);
    memoryPopupBanner = { ...memoryPopupBanner, ...body, updatedAt: Date.now() };
    writeJsonFile("popup_banner.json", memoryPopupBanner);
    return sendJson(res, 200, { success: true, ...memoryPopupBanner });
  }

  if (cleanPath === "/api/system/maintenance" && method === "GET") {
    return sendJson(res, 200, { success: true, ...memoryMaintenance });
  }

  if (cleanPath === "/api/system/maintenance" && method === "POST") {
    const body = await parseBody(req);
    memoryMaintenance = { ...memoryMaintenance, ...body, updatedAt: Date.now() };
    writeJsonFile("maintenance.json", memoryMaintenance);
    return sendJson(res, 200, { success: true, ...memoryMaintenance });
  }

  // -------------------------------------------------------------------------
  // 7. NOTIFICATIONS
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/notifications" && method === "GET") {
    return sendJson(res, 200, { success: true, notifications: memoryNotifications });
  }

  if (cleanPath === "/api/notifications" && method === "POST") {
    const body = await parseBody(req);
    if (body.notification) {
      memoryNotifications.unshift({
        id: body.notification.id || `notif_${Date.now()}`,
        createdAt: Date.now(),
        ...body.notification,
      });
      writeJsonFile("notifications.json", memoryNotifications);
    }
    return sendJson(res, 200, { success: true, notifications: memoryNotifications });
  }

  // -------------------------------------------------------------------------
  // 8. ACCOUNT NUMBERS (Get Number & Manual numbers)
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/account/numbers" && method === "GET") {
    return sendJson(res, 200, { success: true, numbers: memoryNumbers });
  }

  if (cleanPath === "/api/account/numbers" && method === "POST") {
    const body = await parseBody(req);
    if (body.number) {
      memoryNumbers.unshift({ ...body.number, createdAt: Date.now() });
      writeJsonFile("shared_account_numbers.json", memoryNumbers);
    }
    return sendJson(res, 200, { success: true, numbers: memoryNumbers });
  }

  if (cleanPath === "/api/account/numbers/batch-sync" && method === "POST") {
    const body = await parseBody(req);
    if (Array.isArray(body.numbers)) {
      memoryNumbers = body.numbers;
      writeJsonFile("shared_account_numbers.json", memoryNumbers);
    }
    return sendJson(res, 200, { success: true, numbers: memoryNumbers });
  }

  if (cleanPath === "/api/account/numbers/update-otp" && method === "POST") {
    const { number, otp, message } = await parseBody(req);
    const target = memoryNumbers.find((n) => n.number === number);
    if (target) {
      target.otp = otp;
      target.message = message;
      target.updatedAt = Date.now();
      writeJsonFile("shared_account_numbers.json", memoryNumbers);
      return sendJson(res, 200, { success: true, number: target });
    }
    return sendJson(res, 404, { success: false, message: "Number not found" });
  }

  // -------------------------------------------------------------------------
  // 9. RATES & PRICING
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/rates" && method === "GET") {
    return sendJson(res, 200, { success: true, rates: memoryRates });
  }

  if (cleanPath === "/api/rates" && method === "POST") {
    const body = await parseBody(req);
    if (Array.isArray(body.rates)) {
      memoryRates = body.rates;
      writeJsonFile("rates.json", memoryRates);
    }
    return sendJson(res, 200, { success: true, rates: memoryRates });
  }

  // -------------------------------------------------------------------------
  // 10. CLIENT IP
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/my-ip") {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? (typeof forwarded === "string" ? forwarded.split(",")[0] : forwarded[0]) : req.socket?.remoteAddress || "127.0.0.1";
    return sendJson(res, 200, { ip: ip.trim() });
  }

  // -------------------------------------------------------------------------
  // 11. LIVE CHAT
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/live-chat" && method === "GET") {
    return sendJson(res, 200, { success: true, chats: memoryLiveChats });
  }

  if (cleanPath === "/api/live-chat" && method === "POST") {
    const body = await parseBody(req);
    if (body.message || body.chat) {
      const item = body.message || body.chat;
      memoryLiveChats.push({ ...item, timestamp: Date.now() });
      writeJsonFile("live_chats.json", memoryLiveChats);
    }
    return sendJson(res, 200, { success: true, chats: memoryLiveChats });
  }

  // -------------------------------------------------------------------------
  // 12. MANUAL NUMBERS & RANGE ENDPOINTS (SYNCHRONIZED REAL-TIME FOR VERCEL)
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/manual-numbers/ranges" && method === "GET") {
    const pool = loadManualNumbersPool();
    const ranges = getManualRangesSummary(pool);
    const totalCount = pool.length;
    const allocatedCount = pool.filter((n: any) => n.allocated).length;
    const availableCount = totalCount - allocatedCount;
    return sendJson(res, 200, {
      success: true,
      ranges,
      totalCount,
      allocatedCount,
      availableCount,
    });
  }

  if (cleanPath === "/api/manual-numbers/all" && method === "GET") {
    const pool = loadManualNumbersPool();
    const reversed = [...pool].reverse();
    return sendJson(res, 200, {
      success: true,
      numbers: reversed.slice(0, 500),
      total: pool.length,
    });
  }

  if (cleanPath === "/api/manual-numbers/upload" && method === "POST") {
    const body = await parseBody(req);
    const { numbersText, numbersList, country, flag, dialCode, platform } = body || {};
    let rawText = "";
    if (typeof numbersText === "string") {
      rawText = numbersText;
    } else if (Array.isArray(numbersList)) {
      rawText = numbersList.join("\n");
    }

    if (!rawText.trim()) {
      return sendJson(res, 400, { success: false, error: "numbersText or numbersList is required" });
    }

    const cInfo = findCountryByNameOrCode(country || "Global");
    const resolvedCountry = country || cInfo.name;
    const resolvedFlag = flag || cInfo.flag;
    const resolvedDial = dialCode || cInfo.dialCode;

    const parseResult = parseManualNumbersDetailed(
      rawText,
      resolvedCountry,
      resolvedFlag,
      resolvedDial,
      platform || "All Social (WhatsApp/TG)"
    );

    if (parseResult.totalProcessed === 0) {
      return sendJson(res, 200, { success: false, error: "No valid 7-16 digit phone numbers found in input" });
    }

    const pool = loadManualNumbersPool();
    if (parseResult.addedRecords.length > 0) {
      pool.push(...parseResult.addedRecords);
    }
    saveManualNumbersPool(pool);

    const ranges = getManualRangesSummary(pool);
    return sendJson(res, 200, {
      success: true,
      message: `Successfully processed ${parseResult.totalProcessed} numbers (${parseResult.newCount} new, ${parseResult.existingCount} refreshed) for ${parseResult.detectedCountry.name}!`,
      count: parseResult.totalProcessed,
      addedCount: parseResult.newCount,
      existingCount: parseResult.existingCount,
      totalPoolCount: pool.length,
      country: parseResult.detectedCountry,
      ranges,
    });
  }

  if (cleanPath === "/api/manual-numbers/allocate" && method === "POST") {
    const body = await parseBody(req);
    const { rangePrefix, range, allocatedTo, userEmail } = body || {};
    const prefix = rangePrefix || range;
    const assignee = allocatedTo || userEmail || "Website User";

    if (!prefix) {
      return sendJson(res, 400, { success: false, error: "rangePrefix or range is required" });
    }

    const record = allocateOneManualNumber(String(prefix), assignee);
    if (record) {
      return sendJson(res, 200, {
        success: true,
        record: record,
        numberRecord: record,
        message: `Allocated ${record.number} for range ${record.maskedRange}`,
      });
    } else {
      return sendJson(res, 200, {
        success: false,
        error: "No available numbers found in pool for this range",
        message: "No available numbers found in pool for this range",
      });
    }
  }

  if (cleanPath === "/api/manual-numbers/test-otp" && method === "POST") {
    const body = await parseBody(req);
    const { number, service, otp, otpCode, message, sender } = body || {};
    const cleanNum = (number || "").trim();
    const code = otp || otpCode || String(Math.floor(100000 + Math.random() * 900000));
    const srv = service || sender || "WhatsApp";
    const msgText = message || `Your ${srv} verification code is: ${code}`;

    const pool = loadManualNumbersPool();
    const cleanDigits = cleanNum.replace(/\D/g, "");
    const target = pool.find(
      (n: any) => n.cleanDigits === cleanDigits || (cleanDigits.length >= 7 && n.cleanDigits.endsWith(cleanDigits))
    );

    const now = Date.now();
    const newHit = {
      id: `hit_manual_${now}_${Math.random().toString(36).substring(2, 6)}`,
      sid: srv,
      service: srv,
      range: target?.maskedRange || cleanNum,
      number: cleanNum,
      code: code,
      otp: code,
      message: msgText,
      sms: msgText,
      text: msgText,
      time: new Date().toLocaleTimeString(),
      receivedAt: new Date().toISOString(),
      country: target?.country || "International",
      flag: target?.flag || "🌐",
      source: "Manual Pool Test Gateway",
    };

    cachedHits.unshift(newHit);
    if (cachedHits.length > 500) cachedHits.pop();

    return sendJson(res, 200, {
      success: true,
      message: "Test OTP dispatched to Website Dashboard!",
      hit: newHit,
    });
  }

  if (cleanPath.startsWith("/api/manual-numbers/range/") && method === "DELETE") {
    const prefix = cleanPath.replace("/api/manual-numbers/range/", "").trim();
    let pool = loadManualNumbersPool();
    const initialCount = pool.length;
    pool = pool.filter(
      (n: any) =>
        n.rangePrefix !== prefix &&
        n.cleanDigits.slice(0, 5) !== prefix &&
        !n.cleanDigits.startsWith(prefix)
    );
    const deletedCount = initialCount - pool.length;
    saveManualNumbersPool(pool);
    const ranges = getManualRangesSummary(pool);
    return sendJson(res, 200, {
      success: true,
      message: `Successfully deleted ${deletedCount} numbers for range prefix #${prefix}`,
      deletedCount,
      totalPoolCount: pool.length,
      ranges,
    });
  }

  if (cleanPath === "/api/manual-numbers/clear" && (method === "DELETE" || method === "POST")) {
    saveManualNumbersPool([]);
    return sendJson(res, 200, {
      success: true,
      message: "Successfully cleared all manual numbers from pool",
      deletedCount: 0,
      totalPoolCount: 0,
      ranges: [],
    });
  }

  // -------------------------------------------------------------------------
  // 13. BOT MANAGEMENT & TELEGRAM WEBHOOK ENDPOINTS
  // -------------------------------------------------------------------------
  if (cleanPath === "/api/telegram-webhook" || cleanPath === "/api/bot-management/webhook") {
    if (method === "POST") {
      try {
        const update = await parseBody(req);
        if (update && (update.update_id || update.message || update.callback_query)) {
          await handleTelegramUpdateInApi(update, memoryBotConfig);
        }
      } catch (err) {
        console.warn("[Telegram Webhook Error]:", err);
      }
      return sendJson(res, 200, { ok: true, timestamp: Date.now() });
    }
    return sendJson(res, 200, { ok: true, status: "webhook_active" });
  }

  if (cleanPath === "/api/bot-management/config" && method === "GET") {
    return sendJson(res, 200, { success: true, config: memoryBotConfig });
  }

  if (cleanPath === "/api/bot-management/config" && method === "POST") {
    const body = await parseBody(req);
    memoryBotConfig = { ...memoryBotConfig, ...body, lastUpdated: Date.now() };
    writeJsonFile("bot_management_config.json", memoryBotConfig);

    // Auto set Telegram Webhook if host header is available
    if (memoryBotConfig.botToken && req.headers.host) {
      const host = req.headers.host;
      const protocol = host.includes("localhost") ? "http" : "https";
      const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;
      fetch(`https://api.telegram.org/bot${memoryBotConfig.botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
        .catch(() => {});
    }

    return sendJson(res, 200, { success: true, config: memoryBotConfig });
  }

  if (cleanPath === "/api/bot-management/ping" && method === "GET") {
    // Optionally trigger background polling for new updates from Telegram
    if (memoryBotConfig.botToken) {
      pollTelegramUpdatesInApi(memoryBotConfig).catch(() => {});
    }
    return sendJson(res, 200, {
      success: true,
      status: "online",
      botUsername: memoryBotConfig.botUsername || "SuperXSMSBot",
      activePolling: true,
      serverTime: Date.now(),
    });
  }

  // -------------------------------------------------------------------------
  // 12. DEFAULT SUCCESS FALLBACK
  // -------------------------------------------------------------------------
  return sendJson(res, 200, {
    success: true,
    message: "SUPER X SMS Real-Time Carrier Gateway Active",
    endpoint: cleanPath,
    timestamp: Date.now(),
  });
}
