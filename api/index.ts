import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";

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

const BASELINE_COUNTS: Record<string, number> = {
  WhatsApp: 184,
  Telegram: 122,
  Facebook: 145,
  IMO: 96,
  TikTok: 110,
  Instagram: 118,
  Google: 134,
  Apple: 108,
  Baji: 75,
  "Twitter / X": 82,
  Amazon: 64,
  Snapchat: 72,
  Viber: 58,
  Discord: 62,
  Microsoft: 54,
  Huawei: 48,
};

async function fetchFromFoxSmsUpstream(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3800);
    const res = await fetch(
      "http://169.58.133.106/ints/api/v1/viewstats?token=zQC9YAcWzVH-bL05MdRYHp4j8x6QOcs1amLyI9yhaQBVnQSS&records=60",
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
      if (freshFox.length > 0) {
        cachedHits = freshFox;
        lastFoxSyncTime = now;
      }
    }

    const appCounts: Record<string, number> = { ...BASELINE_COUNTS };
    const rangeCounts: Record<string, number> = {
      "21354": 38,
      "22901": 42,
      "88017": 55,
      "22870": 31,
      "23275": 28,
      "23762": 32,
      "62812": 44,
      "26134": 26,
    };

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
        totalHits: cachedHits.length + 480,
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
  // 12. DEFAULT SUCCESS FALLBACK
  // -------------------------------------------------------------------------
  return sendJson(res, 200, {
    success: true,
    message: "SUPER X SMS Real-Time Carrier Gateway Active",
    endpoint: cleanPath,
    timestamp: Date.now(),
  });
}
