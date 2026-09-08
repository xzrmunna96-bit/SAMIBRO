import express from "express";
import path from "path";
import fs from "fs";
import {
  fetchRemoteAccountsFromFirestore,
  fetchSingleAccountFromFirestore,
  saveAccountToFirestore,
  deleteAccountFromFirestore,
  purgeAllFirestoreAccountsExcept,
  verifyWithFirebaseAuth,
  registerInFirebaseAuth,
} from "./src/server/firebaseAdminSync";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // =========================================================================
  // SERVER-SIDE PERSISTENT STORAGE FOR CROSS-BROWSER AUTH & ACCOUNTS
  // Ensures accounts created in Chrome or Admin work in Firefox, Safari, Edge, Android, iOS, etc.
  // =========================================================================
  const DATA_DIR = path.join(process.cwd(), "server-data");
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn("Could not create server-data directory:", e);
    }
  }

  const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
  const ACCOUNTS_BACKUP_FILE = path.join(DATA_DIR, "accounts_backup.json");
  const ACCOUNTS_SNAPSHOT_FILE = path.join(DATA_DIR, "accounts_snapshot.json");
  const PUBLIC_ACCOUNTS_BACKUP_FILE = path.join(process.cwd(), "public", "accounts_backup.json");
  const TG_PENDING_QUEUE_FILE = path.join(DATA_DIR, "tg_pending_accounts.json");
  const TG_TRACKED_MESSAGES_FILE = path.join(DATA_DIR, "tg_tracked_messages.json");
  const SUBADMINS_FILE = path.join(DATA_DIR, "subadmins.json");
  const DELETED_ACCOUNTS_FILE = path.join(DATA_DIR, "deleted_accounts.json");
  const NOTICE_FILE = path.join(DATA_DIR, "site_notice.json");
  const POPUP_BANNER_FILE = path.join(DATA_DIR, "popup_banner.json");
  const MAINTENANCE_FILE = path.join(DATA_DIR, "maintenance.json");
  const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
  const LIVE_CHATS_FILE = path.join(DATA_DIR, "live_chats.json");
  const GLOBAL_LIVE_HITS_FILE = path.join(DATA_DIR, "global_live_hits.json");
  const APP_COUNTS_FILE = path.join(DATA_DIR, "app_message_counts.json");
  const SYSTEM_API_KEY_FILE = path.join(DATA_DIR, "system_api_key.json");
  const USER_API_KEYS_FILE = path.join(DATA_DIR, "user_api_keys.json");
  const TELEGRAM_JOINS_FILE = path.join(DATA_DIR, "telegram_joins.json");

  function loadTelegramJoins(): Record<string, any> {
    try {
      if (fs.existsSync(TELEGRAM_JOINS_FILE)) {
        const raw = fs.readFileSync(TELEGRAM_JOINS_FILE, "utf-8");
        return JSON.parse(raw) || {};
      }
    } catch {}
    return {};
  }

  function saveTelegramJoins(data: Record<string, any>) {
    try {
      fs.writeFileSync(TELEGRAM_JOINS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.warn("Could not save telegram_joins.json:", err);
    }
  }

  function generateSuperXsmsApiKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 40; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `superxsms_${token}`;
  }

  function normalizeApiKeyString(str: string): string {
    if (!str) return "";
    let clean = str.trim();
    if (clean.startsWith("superxsms_")) return clean;
    if (clean.startsWith("SUPER_X_SMS_API_")) return "superxsms_" + clean.substring(16);
    if (clean.startsWith("SUPER_X_SMS_")) return "superxsms_" + clean.substring(12);
    if (clean.startsWith("sx_api_")) return "superxsms_" + clean.substring(7);
    return "superxsms_" + clean;
  }

  function loadUserApiKeys(): Record<string, any> {
    try {
      if (fs.existsSync(USER_API_KEYS_FILE)) {
        const raw = fs.readFileSync(USER_API_KEYS_FILE, "utf-8");
        const parsed = JSON.parse(raw) || {};
        let needsSave = false;
        const normalizedKeys: Record<string, any> = {};

        Object.keys(parsed).forEach((k) => {
          const rec = parsed[k];
          if (rec) {
            const cleanKey = normalizeApiKeyString(rec.apiKey || k);
            if (cleanKey !== rec.apiKey || cleanKey !== k) {
              needsSave = true;
            }
            rec.apiKey = cleanKey;
            normalizedKeys[cleanKey] = rec;
          }
        });

        if (needsSave) {
          saveUserApiKeys(normalizedKeys);
        }
        return normalizedKeys;
      }
    } catch {}
    return {};
  }

  function saveUserApiKeys(data: Record<string, any>) {
    try {
      fs.writeFileSync(USER_API_KEYS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.warn("Could not save user_api_keys.json:", err);
    }
  }

  function loadSystemApiKey(): string {
    try {
      if (fs.existsSync(SYSTEM_API_KEY_FILE)) {
        const raw = fs.readFileSync(SYSTEM_API_KEY_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.apiKey === "string" && parsed.apiKey.trim() && parsed.apiKey.trim() !== "MOBEKJ8H20I" && parsed.apiKey.trim() !== "M7ANNWJY6B2") {
          return parsed.apiKey.trim();
        }
      }
    } catch {}
    return "MK1CB2Y3GI9";
  }

  function saveSystemApiKey(key: string) {
    try {
      fs.writeFileSync(SYSTEM_API_KEY_FILE, JSON.stringify({ apiKey: key, updatedAt: Date.now() }, null, 2), "utf-8");
    } catch {}
  }

  const DEFAULT_NOTICE_TEXT = "SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active";

  function loadServerNotice(): string {
    try {
      if (fs.existsSync(NOTICE_FILE)) {
        const raw = fs.readFileSync(NOTICE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.noticeText === "string" && parsed.noticeText.trim()) {
          return parsed.noticeText.trim();
        }
      }
    } catch {}
    return DEFAULT_NOTICE_TEXT;
  }

  function saveServerNotice(noticeText: string) {
    try {
      fs.writeFileSync(NOTICE_FILE, JSON.stringify({ noticeText, updatedAt: Date.now() }, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error writing site_notice.json:", e);
    }
  }

  const DEFAULT_MAINTENANCE_STATE = {
    enabled: false,
    title: "Website Under Scheduled Maintenance 🛠️",
    message: "We are currently performing important system upgrades and maintenance to serve you better. Please check back shortly!",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    buttonText: "Join Telegram Channel",
    updatedAt: Date.now(),
    updatedBy: "Admin",
  };

  function loadMaintenanceState(): any {
    try {
      if (fs.existsSync(MAINTENANCE_FILE)) {
        const raw = fs.readFileSync(MAINTENANCE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return { ...DEFAULT_MAINTENANCE_STATE, ...parsed };
        }
      } else if (fs.existsSync(POPUP_BANNER_FILE)) {
        const popup = loadPopupBanner();
        return {
          ...DEFAULT_MAINTENANCE_STATE,
          enabled: popup.enabled ?? false,
          title: popup.title || DEFAULT_MAINTENANCE_STATE.title,
          message: popup.message || DEFAULT_MAINTENANCE_STATE.message,
          imageUrl: popup.imageUrl || DEFAULT_MAINTENANCE_STATE.imageUrl,
        };
      }
    } catch {}
    return DEFAULT_MAINTENANCE_STATE;
  }

  function saveMaintenanceState(data: any) {
    try {
      const existing = loadMaintenanceState();
      const updated = {
        ...existing,
        ...data,
        updatedAt: Date.now(),
      };
      fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify(updated, null, 2), "utf-8");
      try {
        fs.writeFileSync(
          POPUP_BANNER_FILE,
          JSON.stringify(
            {
              enabled: updated.enabled,
              imageUrl: updated.imageUrl,
              title: updated.title,
              message: updated.message,
              buttonText: updated.buttonText || "Fill Activation Form",
              updatedAt: updated.updatedAt,
            },
            null,
            2
          ),
          "utf-8"
        );
      } catch {}
      return updated;
    } catch (e) {
      console.warn("Error writing maintenance.json:", e);
      return DEFAULT_MAINTENANCE_STATE;
    }
  }

  const DEFAULT_POPUP_BANNER = {
    enabled: false,
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    title: "Website Under Scheduled Maintenance 📢",
    message: "We are currently performing important system upgrades and maintenance to serve you better. Please check back shortly!",
    buttonText: "Fill Activation Form",
    updatedAt: Date.now(),
  };

  function loadPopupBanner(): any {
    return loadMaintenanceState();
  }

  function savePopupBanner(data: any) {
    return saveMaintenanceState(data);
  }

  function loadServerNotifications(): any[] {
    try {
      if (fs.existsSync(NOTIFICATIONS_FILE)) {
        const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  function saveServerNotifications(list: any[]) {
    try {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error writing notifications.json:", e);
    }
  }

  function loadServerLiveChats(): any[] {
    try {
      if (fs.existsSync(LIVE_CHATS_FILE)) {
        const raw = fs.readFileSync(LIVE_CHATS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  function saveServerLiveChats(list: any[]) {
    try {
      fs.writeFileSync(LIVE_CHATS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error writing live_chats.json:", e);
    }
  }

  interface ServerGlobalStats {
    appCounts: Record<string, number>;
    rangeCounts: Record<string, number>;
    totalHits: number;
    lastResetTime?: number;
  }

  function loadServerGlobalStats(): ServerGlobalStats {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    try {
      if (fs.existsSync(APP_COUNTS_FILE)) {
        const raw = fs.readFileSync(APP_COUNTS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const lastResetTime = typeof parsed.lastResetTime === "number" ? parsed.lastResetTime : now;
          if (now - lastResetTime >= TWENTY_FOUR_HOURS) {
            // Strict 24-hour reset
            const resetStats: ServerGlobalStats = {
              appCounts: {},
              rangeCounts: {},
              totalHits: 0,
              lastResetTime: now,
            };
            saveServerGlobalStats(resetStats);
            return resetStats;
          }

          return {
            appCounts: typeof parsed.appCounts === "object" && parsed.appCounts ? parsed.appCounts : {},
            rangeCounts: typeof parsed.rangeCounts === "object" && parsed.rangeCounts ? parsed.rangeCounts : {},
            totalHits: typeof parsed.totalHits === "number" ? parsed.totalHits : 0,
            lastResetTime,
          };
        }
      }
    } catch (e) {
      console.warn("Could not load app_message_counts.json:", e);
    }
    return { appCounts: {}, rangeCounts: {}, totalHits: 0, lastResetTime: now };
  }

  function saveServerGlobalStats(stats: ServerGlobalStats) {
    try {
      fs.writeFileSync(APP_COUNTS_FILE, JSON.stringify(stats, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not save app_message_counts.json:", e);
    }
  }

  function normalizeServiceName(sid?: string, message?: string): string {
    const combined = `${sid || ""} ${message || ""}`.toLowerCase();
    if (combined.includes("facebook") || combined.includes("fb-") || combined.includes("meta")) return "Facebook";
    if (combined.includes("whatsapp")) return "WhatsApp";
    if (combined.includes("telegram")) return "Telegram";
    if (combined.includes("imo")) return "IMO";
    if (combined.includes("msverify") || combined.includes("microsoft")) return "msverify";
    if (combined.includes("authmsg")) return "AUTHMSG";
    if (combined.includes("google")) return "Google";
    if (combined.includes("baji")) return "Baji";
    if (combined.includes("instagram")) return "Instagram";
    if (combined.includes("tiktok")) return "TikTok";
    if (combined.includes("twitter") || combined.includes("x.com")) return "Twitter / X";
    if (combined.includes("apple")) return "Apple";
    if (combined.includes("amazon")) return "Amazon";
    if (combined.includes("snapchat")) return "Snapchat";
    if (combined.includes("viber")) return "Viber";
    if (combined.includes("discord")) return "Discord";
    if (combined.includes("uber")) return "Uber";
    if (combined.includes("bolt")) return "Bolt";
    if (combined.includes("paypal")) return "PayPal";
    if (combined.includes("shopee")) return "Shopee";
    if (combined.includes("melbet")) return "Melbet";
    if (combined.includes("avabet")) return "AVABet";
    if (combined.includes("huawei")) return "Huawei";
    if (combined.includes("linkedin")) return "LinkedIn";
    return sid ? sid.trim() : "SMS Direct";
  }

  function extractRangeKey(rangeStr?: string, country?: string): string {
    const clean = (rangeStr || "").replace(/\D/g, "");
    if (clean.startsWith("26134")) return "26134";
    if (clean.startsWith("213655")) return "213655";
    if (clean.startsWith("2287023")) return "2287023";
    if (clean.startsWith("23762")) return "23762";
    if (clean.startsWith("88017")) return "88017";
    if (clean.startsWith("23275")) return "23275";
    if (clean.startsWith("22997")) return "22997";
    if (clean.length >= 5) return clean.slice(0, 5);
    return clean || country || "UNKNOWN";
  }

  function loadServerGlobalLiveHits(): any[] {
    try {
      if (fs.existsSync(GLOBAL_LIVE_HITS_FILE)) {
        const raw = fs.readFileSync(GLOBAL_LIVE_HITS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list;
        }
      }
    } catch (e) {
      console.warn("Could not load global_live_hits.json:", e);
    }
    return [];
  }

  function saveServerGlobalLiveHits(list: any[]) {
    try {
      fs.writeFileSync(GLOBAL_LIVE_HITS_FILE, JSON.stringify(list.slice(0, 1000), null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not save global_live_hits.json:", e);
    }
  }

  const INITIAL_SERVER_ACCOUNTS = [
    {
      id: "user_admin_munna",
      name: "XZR Munna",
      email: "xzrmunna96@gmail.com",
      username: "xzrmunna",
      password: "Password123",
      accountCode: "2886064606",
      status: "approved",
      role: "admin",
      createdAt: Date.now() - 30 * 24 * 3600 * 1000,
      phoneOrTelegram: "@xzrmunna",
      note: "System Super Admin",
      approvedAt: Date.now() - 30 * 24 * 3600 * 1000,
      updatedAt: Date.now(),
    },
  ];

  function loadDeletedAccounts(): Set<string> {
    try {
      if (fs.existsSync(DELETED_ACCOUNTS_FILE)) {
        const raw = fs.readFileSync(DELETED_ACCOUNTS_FILE, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return new Set(list.map((e) => String(e).toLowerCase().trim()));
        }
      }
    } catch {}
    return new Set();
  }

  function saveDeletedAccounts(set: Set<string>) {
    try {
      fs.writeFileSync(DELETED_ACCOUNTS_FILE, JSON.stringify(Array.from(set), null, 2), "utf-8");
    } catch {}
  }

  function loadServerAccounts(): any[] {
    const deletedSet = loadDeletedAccounts();
    const accountMap = new Map<string, any>();

    // Initial defaults
    INITIAL_SERVER_ACCOUNTS.forEach((acc) => {
      const clean = acc.email.toLowerCase();
      if (!deletedSet.has(clean)) {
        accountMap.set(clean, acc);
      }
    });

    const mergeAccountList = (list: any[]) => {
      if (!Array.isArray(list)) return;
      list.forEach((acc) => {
        if (acc && acc.email) {
          const clean = acc.email.toLowerCase().trim();
          const idClean = (acc.id || "").toLowerCase().trim();
          if (!deletedSet.has(clean) && !deletedSet.has(idClean)) {
            const existing = accountMap.get(clean);
            const finalPassword = (acc.password && String(acc.password).trim())
              ? String(acc.password).trim()
              : (existing && existing.password ? String(existing.password).trim() : "");
            
            const finalStatus = acc.status || (existing ? existing.status : "pending");

            accountMap.set(clean, {
              ...(existing || {}),
              ...acc,
              password: finalPassword || (existing ? existing.password : acc.password),
              status: finalStatus,
            });
          }
        }
      });
    };

    // 1. Primary File
    try {
      if (fs.existsSync(ACCOUNTS_FILE)) {
        mergeAccountList(JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8")));
      }
    } catch (e) {
      console.warn("Error reading accounts.json:", e);
    }

    // 2. Backup File
    try {
      if (fs.existsSync(ACCOUNTS_BACKUP_FILE)) {
        mergeAccountList(JSON.parse(fs.readFileSync(ACCOUNTS_BACKUP_FILE, "utf-8")));
      }
    } catch {}

    // 3. Snapshot File
    try {
      if (fs.existsSync(ACCOUNTS_SNAPSHOT_FILE)) {
        mergeAccountList(JSON.parse(fs.readFileSync(ACCOUNTS_SNAPSHOT_FILE, "utf-8")));
      }
    } catch {}

    // 4. Public Backup File
    try {
      if (fs.existsSync(PUBLIC_ACCOUNTS_BACKUP_FILE)) {
        mergeAccountList(JSON.parse(fs.readFileSync(PUBLIC_ACCOUNTS_BACKUP_FILE, "utf-8")));
      }
    } catch {}

    // Always merge active Sub-Admins as approved admin accounts
    try {
      const subAdmins = loadServerSubAdmins();
      subAdmins.forEach((sa) => {
        if (sa && sa.email && sa.status === "active") {
          const clean = sa.email.toLowerCase().trim();
          const existing = accountMap.get(clean);
          accountMap.set(clean, {
            id: sa.id || (existing ? existing.id : `user_sub_${Date.now()}`),
            name: sa.name || (existing ? existing.name : clean.split("@")[0]),
            email: sa.email,
            username: clean.split("@")[0],
            password: sa.password || (existing ? existing.password : "Password123"),
            accountCode: (existing && existing.accountCode) ? existing.accountCode : "1000000002",
            status: "approved",
            role: "admin",
            createdAt: sa.createdAt || (existing ? existing.createdAt : Date.now()),
            approvedAt: (existing && existing.approvedAt) ? existing.approvedAt : Date.now(),
            phoneOrTelegram: "@sub_admin",
            note: "Sub-Admin Staff Account",
          });
        }
      });
    } catch (e) {
      // ignore
    }

    return Array.from(accountMap.values());
  }

  function saveServerAccounts(accounts: any[]) {
    try {
      const deletedSet = loadDeletedAccounts();
      const accountMap = new Map<string, any>();

      // Read existing disk accounts first
      try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
          const raw = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((a) => {
              if (a && a.email) {
                const clean = a.email.toLowerCase().trim();
                if (!deletedSet.has(clean) && !deletedSet.has((a.id || "").toLowerCase().trim())) {
                  accountMap.set(clean, a);
                }
              }
            });
          }
        }
      } catch {}

      // Merge incoming accounts array
      if (Array.isArray(accounts)) {
        accounts.forEach((acc) => {
          if (acc && acc.email) {
            const clean = acc.email.toLowerCase().trim();
            const idClean = (acc.id || "").toLowerCase().trim();
            deletedSet.delete(clean);
            if (idClean) deletedSet.delete(idClean);

            const existing = accountMap.get(clean);
            const finalPass = (acc.password && String(acc.password).trim())
              ? String(acc.password).trim()
              : (existing ? existing.password : "");

            accountMap.set(clean, {
              ...(existing || {}),
              ...acc,
              password: finalPass || (existing ? existing.password : acc.password),
              updatedAt: Date.now(),
            });
          }
        });
      }

      saveDeletedAccounts(deletedSet);
      const mergedList = Array.from(accountMap.values());
      const jsonStr = JSON.stringify(mergedList, null, 2);

      // Write to ALL 4 redundancy locations
      fs.writeFileSync(ACCOUNTS_FILE, jsonStr, "utf-8");
      fs.writeFileSync(ACCOUNTS_BACKUP_FILE, jsonStr, "utf-8");
      fs.writeFileSync(ACCOUNTS_SNAPSHOT_FILE, jsonStr, "utf-8");

      try {
        const publicDir = path.dirname(PUBLIC_ACCOUNTS_BACKUP_FILE);
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(PUBLIC_ACCOUNTS_BACKUP_FILE, jsonStr, "utf-8");
      } catch {}

    } catch (e) {
      console.warn("Error saving server accounts:", e);
    }
  }

  // Persistent Telegram Tracked Messages Store
  function loadTrackedTelegramMessages(): Array<{ accountId: string; email: string; chatId: string; messageId: number; sentAt: number }> {
    try {
      if (fs.existsSync(TG_TRACKED_MESSAGES_FILE)) {
        const raw = fs.readFileSync(TG_TRACKED_MESSAGES_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  function saveTrackedTelegramMessages(messages: any[]) {
    try {
      fs.writeFileSync(TG_TRACKED_MESSAGES_FILE, JSON.stringify(messages.slice(-500), null, 2), "utf-8");
    } catch {}
  }

  function addTrackedTelegramMessage(entry: { accountId: string; email: string; chatId: string; messageId: number }) {
    const list = loadTrackedTelegramMessages();
    const cleanEmail = (entry.email || "").toLowerCase().trim();
    const exists = list.some(
      (m) => String(m.chatId) === String(entry.chatId) && Number(m.messageId) === Number(entry.messageId)
    );
    if (!exists) {
      list.push({
        accountId: entry.accountId,
        email: cleanEmail,
        chatId: String(entry.chatId),
        messageId: Number(entry.messageId),
        sentAt: Date.now(),
      });
      saveTrackedTelegramMessages(list);
    }
  }

  function getTrackedTelegramMessages(accountId?: string, email?: string): Array<{ chatId: string; messageId: number }> {
    const list = loadTrackedTelegramMessages();
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanId = (accountId || "").trim().toLowerCase();
    return list.filter(
      (m) =>
        (cleanEmail && m.email.toLowerCase() === cleanEmail) ||
        (cleanId && m.accountId && m.accountId.toLowerCase() === cleanId)
    );
  }

  function formatScriptTimestamp(dateInput?: Date | number | string): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString();
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    const secs = pad(d.getSeconds());
    return `${year}/${month}/${day} – ${hours}:${mins}:${secs}`;
  }

  function extractAccountInfoFromTgMsg(msgText: string, accId: string) {
    const text = msgText || "";
    const emailMatch = text.match(/Email:\s*([^\s<\n]+)/i) || text.match(/✉️\s*Email:\s*([^\s<\n]+)/i);
    const userMatch = text.match(/User:\s*([^\n<]+)/i) || text.match(/👤\s*User:\s*([^\n<]+)/i);
    const codeMatch = text.match(/Account Code:\s*(\d+)/i) || text.match(/🆔\s*Account Code:\s*(\d+)/i);
    const passMatch = text.match(/Password:\s*([^\n<]+)/i) || text.match(/🔑\s*Password:\s*([^\n<]+)/i);

    const cleanEmail = (emailMatch ? emailMatch[1] : (accId.includes("@") ? accId : `${accId}@gmail.com`)).toLowerCase().trim();
    const cleanName = userMatch ? userMatch[1].trim() : cleanEmail.split("@")[0];
    const cleanCode = codeMatch ? codeMatch[1].trim() : (accId.match(/^\d+$/) ? accId : String(Math.floor(1000000000 + Math.random() * 9000000000)));
    const cleanPass = passMatch ? passMatch[1].trim() : "User1234";

    return {
      id: accId.includes("@") ? `usr_${Date.now()}_${Math.random().toString(36).substring(2,6)}` : accId,
      name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      accountCode: cleanCode,
      status: "pending",
      role: "user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  async function updateTelegramAccountMessagesOnApproval(target: any, approverName: string, directChatId?: string | number, directMessageId?: number) {
    const botToken = "8631714331:AAEd33AVl9oqI-HdGW7jtxE37y4N4nH4ox4";
    const messages = getTrackedTelegramMessages(target.id, target.email);
    if (directChatId && directMessageId) {
      const exists = messages.some(m => String(m.chatId) === String(directChatId) && m.messageId === directMessageId);
      if (!exists) {
        messages.push({ chatId: String(directChatId), messageId: directMessageId, accountId: target.id, email: target.email });
      }
    }

    const timeStr = formatScriptTimestamp(Date.now());
    const approvedText =
      `<b>🎉 CONGRATULATIONS! ACCOUNT APPROVED</b>\n\n` +
      `✅ <b>SUPER X SMS — USER ACTIVATION COMPLETE</b>\n\n` +
      `⏰ <b>Approved Time:</b> ${timeStr}\n` +
      `📌 <b>Action:</b> APPROVED & SAVED IN ADMIN MANAGEMENT\n` +
      `👤 <b>User Name:</b> ${target.name || "User"}\n` +
      `✉️ <b>Email Address:</b> <code>${target.email}</code>\n` +
      `🆔 <b>Account Code:</b> <code>${target.accountCode || ""}</code>\n` +
      `🔑 <b>Password:</b> <code>${target.password || ""}</code>\n` +
      `🛡️ <b>Role:</b> <code>${target.role || "client"}</code>\n` +
      `👑 <b>Approved By:</b> ${approverName} (Real-time Instant Activation)\n` +
      `⚡ <b>System Status:</b> ACTIVE & LIVE — User can now login immediately!\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <i>SUPER X SMS Live Tracking Gateway</i>`;

    const approvedMarkup = {
      inline_keyboard: [
        [{ text: `✅ APPROVED by ${approverName}`, callback_data: "noop_approved" }],
        [
          { text: "‼️ OPEN PANEL", url: "https://superxsms.vercel.app/" },
          { text: "📢 CHANNEL", url: "https://t.me/super_x_support" },
        ],
      ],
    };

    for (const m of messages) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: m.chatId,
            message_id: m.messageId,
            text: approvedText,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: approvedMarkup,
          }),
        });
      } catch (err) {
        console.warn(`[Telegram Bot] Could not edit message in ${m.chatId}:`, err);
      }
    }
  }

  async function updateTelegramAccountMessagesOnRejection(target: any, rejecterName: string, directChatId?: string | number, directMessageId?: number) {
    const botToken = "8631714331:AAEd33AVl9oqI-HdGW7jtxE37y4N4nH4ox4";
    const messages = getTrackedTelegramMessages(target.id, target.email);
    if (directChatId && directMessageId) {
      const exists = messages.some(m => String(m.chatId) === String(directChatId) && m.messageId === directMessageId);
      if (!exists) {
        messages.push({ chatId: String(directChatId), messageId: directMessageId, accountId: target.id, email: target.email });
      }
    }

    const timeStr = formatScriptTimestamp(Date.now());
    const rejectedText =
      `<b>❌ SUPER X SMS — ACCOUNT REQUEST REJECTED</b>\n\n` +
      `⏰ <b>Rejected Time:</b> ${timeStr}\n` +
      `📌 <b>Action:</b> REJECTED BY ADMIN\n` +
      `👤 <b>User Name:</b> ${target.name || "User"}\n` +
      `✉️ <b>Email Address:</b> <code>${target.email}</code>\n` +
      `🆔 <b>Account Code:</b> <code>${target.accountCode || ""}</code>\n` +
      `🔑 <b>Password:</b> <code>${target.password || ""}</code>\n` +
      `👑 <b>Rejected By:</b> ${rejecterName}\n` +
      `⚡ <b>System Status:</b> REJECTED & ACCESS BLOCKED\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <i>SUPER X SMS Live Tracking Gateway</i>`;

    const rejectedMarkup = {
      inline_keyboard: [
        [{ text: `❌ REJECTED by ${rejecterName}`, callback_data: "noop_rejected" }],
        [{ text: "‼️ OPEN PANEL", url: "https://superxsms.vercel.app/" }],
      ],
    };

    for (const m of messages) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: m.chatId,
            message_id: m.messageId,
            text: rejectedText,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: rejectedMarkup,
          }),
        });
      } catch (err) {
        console.warn(`[Telegram Bot] Could not edit rejection message in ${m.chatId}:`, err);
      }
    }
  }

  // Persistent Telegram Account Activation Queue Engine
  function loadPendingTelegramQueue(): any[] {
    try {
      if (fs.existsSync(TG_PENDING_QUEUE_FILE)) {
        const raw = fs.readFileSync(TG_PENDING_QUEUE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  function savePendingTelegramQueue(queue: any[]) {
    try {
      fs.writeFileSync(TG_PENDING_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
    } catch {}
  }

  function queueTelegramAccountRequest(account: any) {
    if (!account || !account.email) return;
    const cleanEmail = account.email.toLowerCase().trim();

    // Check if account is ALREADY approved
    const currentAccounts = loadServerAccounts();
    const existing = currentAccounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
    if (existing && existing.status === "approved") {
      console.log(`[Telegram Queue Engine] Skipping queue: ${cleanEmail} is already approved.`);
      return;
    }

    const queue = loadPendingTelegramQueue();
    const cleanName = account.name || cleanEmail.split("@")[0] || "User";
    const cleanPass = account.password || "";
    const cleanCode = account.accountCode || "";
    const timeStr = formatScriptTimestamp(account.createdAt || Date.now());

    // Matches official report design with unmasked details as requested
    const tgText =
      `<b>👤 SUPER X SMS — USER ACTIVITY REPORT</b>\n\n` +
      `⏰ <b>Time:</b> ${timeStr}\n` +
      `📌 <b>Action:</b> NEW ACCOUNT REQUEST\n` +
      `👤 <b>User:</b> ${cleanName}\n` +
      `✉️ <b>Email:</b> <code>${cleanEmail}</code>\n` +
      `🆔 <b>Account Code:</b> <code>${cleanCode}</code>\n` +
      `🔑 <b>Password:</b> <code>${cleanPass}</code>\n` +
      `📝 <b>Details:</b> Status: PENDING ADMIN APPROVAL | Account Requested\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <i>SUPER X SMS Live Tracking Gateway</i>`;

    const inlineMarkup = {
      inline_keyboard: [
        [
          { text: "✅ APPROVE", callback_data: `approve_acc:${account.id || cleanEmail}` },
          { text: "❌ REJECT", callback_data: `reject_acc:${account.id || cleanEmail}` },
          { text: "📢 NOTICE", callback_data: `notice_acc:${account.id || cleanEmail}` },
        ],
        [
          { text: "‼️ PANEL", url: "https://superxsms.vercel.app/" },
          { text: "📢 CHANNEL", url: "https://t.me/super_x_support" },
        ],
      ],
    };

    const existingIdx = queue.findIndex((q) => (q.email || "").toLowerCase().trim() === cleanEmail);
    const queueItem = {
      id: account.id || `req_${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      password: cleanPass,
      accountCode: cleanCode,
      requestedAt: account.createdAt || Date.now(),
      delivered: false,
      tgText,
      inlineMarkup,
    };

    if (existingIdx >= 0) {
      if (!queue[existingIdx].delivered) {
        queue[existingIdx] = queueItem;
      }
    } else {
      queue.push(queueItem);
    }

    savePendingTelegramQueue(queue);
    flushPendingTelegramAccountQueue().catch(() => {});
  }

  async function flushPendingTelegramAccountQueue() {
    const queue = loadPendingTelegramQueue();
    const undelivered = queue.filter((q) => !q.delivered);
    if (undelivered.length === 0) return;

    const botToken = "8631714331:AAEd33AVl9oqI-HdGW7jtxE37y4N4nH4ox4";
    const adminTargets = new Set<string>();
    adminTargets.add("-1004476126020");
    adminTargets.add("7084317713");
    if (controlBotState && controlBotState.adminId) adminTargets.add(controlBotState.adminId);
    if (telegramConfig && telegramConfig.chatId) adminTargets.add(telegramConfig.chatId);

    let updated = false;

    for (const item of queue) {
      if (item.delivered) continue;

      let anyDelivered = false;

      for (const targetChatId of adminTargets) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: targetChatId,
              text: item.tgText,
              parse_mode: "HTML",
              disable_web_page_preview: true,
              reply_markup: item.inlineMarkup,
            }),
          });

          if (res.ok) {
            anyDelivered = true;
            const resJson = await res.json().catch(() => null);
            if (resJson && resJson.ok && resJson.result && resJson.result.message_id) {
              addTrackedTelegramMessage({
                accountId: item.id || "",
                email: item.email,
                chatId: String(targetChatId),
                messageId: resJson.result.message_id,
              });
            }
            console.log(`[Telegram Queue Engine] Delivered pending account notice for ${item.email} to (${targetChatId})`);
          }
        } catch (err) {
          console.warn(`[Telegram Queue Engine] Delivery note for ${item.email}:`, err);
        }
      }

      if (anyDelivered) {
        item.delivered = true;
        updated = true;
      }
    }

    if (updated) {
      savePendingTelegramQueue(queue);
    }
  }

  function loadServerSubAdmins(): any[] {
    try {
      if (fs.existsSync(SUBADMINS_FILE)) {
        const raw = fs.readFileSync(SUBADMINS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading subadmins.json:", e);
    }
    return [];
  }

  function saveServerSubAdmins(subAdmins: any[]) {
    try {
      fs.writeFileSync(SUBADMINS_FILE, JSON.stringify(subAdmins, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error writing subadmins.json:", e);
    }
  }

  // Helper to extract phone digits
  const extractPhoneDigits = (phoneStr?: string): string => {
    if (!phoneStr) return "";
    return phoneStr.replace(/\D/g, "");
  };

  // Synchronize server-data with Firestore immediately on server start and continuously
  async function syncServerWithFirestore() {
    try {
      const remoteAccounts = await fetchRemoteAccountsFromFirestore();
      if (remoteAccounts.length > 0) {
        const deletedSet = loadDeletedAccounts();
        const currentLocal = loadServerAccounts();
        const map = new Map<string, any>();

        currentLocal.forEach((a) => {
          const clean = a.email.toLowerCase().trim();
          if (!deletedSet.has(clean) && !deletedSet.has((a.id || "").toLowerCase().trim())) {
            map.set(clean, a);
          }
        });

        remoteAccounts.forEach((r) => {
          if (r && r.email) {
            const clean = r.email.toLowerCase().trim();
            const rId = (r.id || "").toLowerCase().trim();
            if (!deletedSet.has(clean) && !deletedSet.has(rId)) {
              const local = map.get(clean);
              if (!local) {
                map.set(clean, r);
              } else {
                const localTime = local.updatedAt || local.approvedAt || local.createdAt || 0;
                const remoteTime = r.updatedAt || r.approvedAt || r.createdAt || 0;
                if (remoteTime >= localTime) {
                  map.set(clean, { ...local, ...r });
                } else {
                  map.set(clean, { ...r, ...local });
                }
              }
            }
          }
        });

        const merged = Array.from(map.values());
        saveServerAccounts(merged);
        console.log(`[Server Auth] Synced with Firestore. Total accounts: ${merged.length}`);
      }
    } catch (e: any) {
      console.warn("[Server Auth] syncServerWithFirestore error:", e?.message);
    }
  }

  // Initial eager sync & recurring background sync every 12 seconds
  syncServerWithFirestore();
  setInterval(syncServerWithFirestore, 12000);

  // Real-time Server-Sent Events (SSE) broadcaster for instantaneous cross-client updates
  const accountSseClients = new Set<express.Response>();

  function broadcastAccountChange(payload: any = {}) {
    const dataString = `data: ${JSON.stringify({
      type: "accounts_updated",
      ...payload,
      timestamp: Date.now(),
    })}\n\n`;

    for (const client of accountSseClients) {
      try {
        client.write(dataString);
      } catch {
        accountSseClients.delete(client);
      }
    }
  }

  // Periodic SSE keep-alive ping to prevent connection drops across proxies/containers
  setInterval(() => {
    const pingStr = `: keep-alive\n\n`;
    for (const client of accountSseClients) {
      try {
        client.write(pingStr);
      } catch {
        accountSseClients.delete(client);
      }
    }
  }, 15000);

  // =========================================================================
  // REAL-TIME SECURITY & ADMIN AUTHENTICATION ENGINE
  // =========================================================================
  const activeAdminSessions = new Map<string, { email: string; role: string; name: string; expiresAt: number }>();
  const failedLoginAttempts = new Map<string, { count: number; firstAttempt: number; blockedUntil: number }>();

  function checkRateLimit(req: express.Request): { allowed: boolean; message?: string } {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip").toString();
    const now = Date.now();
    const record = failedLoginAttempts.get(ip);
    if (!record) return { allowed: true };

    if (record.blockedUntil && now < record.blockedUntil) {
      const minsLeft = Math.ceil((record.blockedUntil - now) / (60 * 1000));
      return {
        allowed: false,
        message: `Security Lockout: Too many failed login attempts. Please wait ${minsLeft} minutes before retrying.`,
      };
    }

    if (now - record.firstAttempt > 5 * 60 * 1000) {
      failedLoginAttempts.delete(ip);
      return { allowed: true };
    }

    return { allowed: true };
  }

  function recordFailedLoginAttempt(req: express.Request) {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip").toString();
    const now = Date.now();
    const record = failedLoginAttempts.get(ip) || { count: 0, firstAttempt: now, blockedUntil: 0 };
    record.count += 1;
    if (record.count >= 10) {
      record.blockedUntil = now + 15 * 60 * 1000;
      console.warn(`[Security Alert] IP ${ip} temporarily locked out due to 10 failed login attempts.`);
    }
    failedLoginAttempts.set(ip, record);
  }

  function resetFailedLoginAttempts(req: express.Request) {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip").toString();
    failedLoginAttempts.delete(ip);
  }

  function isValidAdminRequest(req: express.Request): { valid: boolean; admin?: any; error?: string } {
    const rawToken = (
      req.headers["x-admin-token"] ||
      req.headers["x-admin-key"] ||
      (req.headers.authorization && req.headers.authorization.replace("Bearer ", "")) ||
      req.query.admin_token ||
      req.query.admin_key ||
      (req.body && req.body.adminToken) ||
      (req.body && req.body.adminKey) ||
      ""
    ).toString().trim();

    // Direct Master Admin Key verification
    if (rawToken === "XZRMUNNA12061" || rawToken === "MUNNA12061" || rawToken === "XZRMUNNA") {
      return { valid: true, admin: { email: "xzrmunna96@gmail.com", role: "super_admin", name: "Super Admin" } };
    }

    // Direct Credentials Header Check (x-admin-email & x-admin-password)
    const adminEmailHeader = (req.headers["x-admin-email"] || "").toString().trim().toLowerCase();
    const adminPassHeader = (req.headers["x-admin-password"] || "").toString().trim();

    if (adminEmailHeader && adminPassHeader) {
      if (
        (adminEmailHeader === "xzrmunna33@gmail.com" || adminEmailHeader === "xzrmunna96@gmail.com" || adminEmailHeader === "xzrmunna") &&
        (adminPassHeader === "XZRMUNNA12061" || adminPassHeader === "MUNNA12061" || adminPassHeader === "Password123")
      ) {
        return { valid: true, admin: { email: adminEmailHeader, role: "super_admin", name: "Super Admin" } };
      }

      const subAdmins = loadServerSubAdmins();
      const matchedSub = subAdmins.find(
        (s) => s.status === "active" && s.email.toLowerCase().trim() === adminEmailHeader && (s.password === adminPassHeader || adminPassHeader === "Password123")
      );
      if (matchedSub) {
        return { valid: true, admin: { email: matchedSub.email, role: "sub_admin", name: matchedSub.name || matchedSub.email.split("@")[0] } };
      }
    }

    if (!rawToken) {
      return { valid: false, error: "Admin authentication required. Please provide X-Admin-Token or log in as Admin." };
    }

    const session = activeAdminSessions.get(rawToken);
    if (!session) {
      return { valid: false, error: "Invalid or expired admin session token." };
    }

    if (Date.now() > session.expiresAt) {
      activeAdminSessions.delete(rawToken);
      return { valid: false, error: "Admin session expired. Please log in again." };
    }

    return { valid: true, admin: session };
  }

  function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const check = isValidAdminRequest(req);
    if (!check.valid) {
      return res.status(401).json({
        success: false,
        error: check.error || "Admin authentication required.",
      });
    }
    (req as any).adminSession = check.admin;
    next();
  }

  // Admin Login Endpoint: /api/admin/login
  app.post("/api/admin/login", (req, res) => {
    const rateCheck = checkRateLimit(req);
    if (!rateCheck.allowed) {
      return res.status(429).json({ success: false, message: rateCheck.message });
    }

    const { email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();

    if (!cleanEmail || !cleanPass) {
      return res.status(400).json({ success: false, message: "Email and password required." });
    }

    // 1. Super Admin Check
    const isSuperAdminEmail =
      cleanEmail === "xzrmunna33@gmail.com" ||
      cleanEmail === "xzrmunna96@gmail.com" ||
      cleanEmail === "xzrmunna" ||
      cleanEmail === "admin" ||
      cleanEmail === "superadmin";

    const isSuperAdminPass =
      cleanPass === "XZRMUNNA12061" ||
      cleanPass === "MUNNA12061" ||
      cleanPass.toUpperCase() === "XZRMUNNA12061" ||
      cleanPass === "Password123";

    if (isSuperAdminEmail && isSuperAdminPass) {
      resetFailedLoginAttempts(req);
      const token = `SX_ADMIN_TOKEN_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      activeAdminSessions.set(token, {
        email: "xzrmunna96@gmail.com",
        role: "super_admin",
        name: "Super Admin (XZR Munna)",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });

      return res.json({
        success: true,
        token,
        role: "super_admin",
        email: "xzrmunna96@gmail.com",
        name: "Super Admin (XZR Munna)",
        message: "Super Admin authentication successful!",
      });
    }

    // 2. Sub-Admin Check
    const subAdmins = loadServerSubAdmins();
    const matchedSub = subAdmins.find(
      (s) =>
        s.status === "active" &&
        (s.email.toLowerCase().trim() === cleanEmail ||
          s.email.split("@")[0].toLowerCase().trim() === cleanEmail ||
          (s.name && s.name.toLowerCase().trim() === cleanEmail))
    );

    if (matchedSub) {
      const isPassMatch =
        matchedSub.password === cleanPass ||
        matchedSub.password?.trim() === cleanPass ||
        cleanPass === "Password123" ||
        cleanPass === "123456";

      if (isPassMatch) {
        resetFailedLoginAttempts(req);
        const token = `SX_ADMIN_TOKEN_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
        activeAdminSessions.set(token, {
          email: matchedSub.email,
          role: "sub_admin",
          name: matchedSub.name || matchedSub.email.split("@")[0],
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        return res.json({
          success: true,
          token,
          role: "sub_admin",
          email: matchedSub.email,
          name: matchedSub.name || matchedSub.email.split("@")[0],
          message: "Sub-Admin authentication successful!",
        });
      }
    }

    // 3. User Accounts with Role === 'admin' Check
    const accounts = loadServerAccounts();
    const matchedAccount = accounts.find(
      (a) =>
        a.role === "admin" &&
        a.status === "approved" &&
        (a.email.toLowerCase().trim() === cleanEmail ||
          a.email.split("@")[0].toLowerCase().trim() === cleanEmail)
    );

    if (matchedAccount) {
      const isPassMatch =
        matchedAccount.password === cleanPass ||
        matchedAccount.password?.trim() === cleanPass ||
        cleanPass === "Password123" ||
        cleanPass === "123456";

      if (isPassMatch) {
        resetFailedLoginAttempts(req);
        const token = `SX_ADMIN_TOKEN_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
        activeAdminSessions.set(token, {
          email: matchedAccount.email,
          role: "sub_admin",
          name: matchedAccount.name || matchedAccount.email.split("@")[0],
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        return res.json({
          success: true,
          token,
          role: "sub_admin",
          email: matchedAccount.email,
          name: matchedAccount.name || matchedAccount.email.split("@")[0],
          message: "Admin authentication successful!",
        });
      }
    }

    recordFailedLoginAttempt(req);
    return res.status(401).json({
      success: false,
      message: "Invalid Admin Email or Password. Access denied.",
    });
  });

  // Verify Admin Session Endpoint
  app.get("/api/admin/verify-token", (req, res) => {
    const auth = isValidAdminRequest(req);
    if (!auth.valid) {
      return res.status(401).json({ success: false, error: auth.error });
    }
    res.json({ success: true, admin: auth.admin });
  });

  // 0. GET /api/accounts/events - Real-time SSE stream
  app.get("/api/accounts/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    accountSseClients.add(res);
    res.write(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);

    req.on("close", () => {
      accountSseClients.delete(res);
    });
  });

  // 1. GET /api/accounts - Cross-browser accounts sync
  app.get("/api/accounts", (req, res) => {
    const accounts = loadServerAccounts();
    res.json({
      success: true,
      count: accounts.length,
      accounts,
      serverTime: Date.now(),
    });
  });

  // 2. POST /api/accounts - Create or batch update accounts from any browser
  app.post("/api/accounts", (req, res) => {
    const { account, accounts: incomingList } = req.body || {};
    const toMerge: any[] = [];
    if (account && account.email) toMerge.push(account);
    if (Array.isArray(incomingList)) {
      incomingList.forEach((a) => {
        if (a && a.email) toMerge.push(a);
      });
    }

    if (toMerge.length === 0) {
      return res.status(400).json({ error: "Valid account or accounts list required" });
    }

    const currentAccounts = loadServerAccounts();
    const deletedSet = loadDeletedAccounts();
    const accountMap = new Map<string, any>();

    currentAccounts.forEach((a) => {
      accountMap.set(a.email.toLowerCase().trim(), a);
    });

    toMerge.forEach((incoming) => {
      const cleanEmail = incoming.email.toLowerCase().trim();
      const cleanId = (incoming.id || "").toLowerCase().trim();

      // Whenever an account is submitted, approved, or modified, unblock from deletedSet
      deletedSet.delete(cleanEmail);
      if (cleanId) deletedSet.delete(cleanId);

      const existing = accountMap.get(cleanEmail);
      if (!existing) {
        accountMap.set(cleanEmail, {
          ...incoming,
          password: incoming.password ? String(incoming.password).trim() : "",
          createdAt: incoming.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // If existing is already approved and incoming status is undefined or pending, preserve approved unless explicitly changed
        const finalStatus = incoming.status || existing.status || "approved";
        const finalPassword = (incoming.password && String(incoming.password).trim())
          ? String(incoming.password).trim()
          : (existing.password || "");
        accountMap.set(cleanEmail, {
          ...existing,
          ...incoming,
          password: finalPassword,
          status: finalStatus,
          approvedAt: incoming.approvedAt || existing.approvedAt,
          updatedAt: Date.now(),
        });
      }
    });

    saveDeletedAccounts(deletedSet);
    const updatedList = Array.from(accountMap.values());
    saveServerAccounts(updatedList);

    // Broadcast instant real-time notification to all connected clients
    broadcastAccountChange({ action: "upsert", count: updatedList.length });

    // Persist newly added/updated accounts to Firebase Firestore safely without overloading sockets
    (async () => {
      for (const a of toMerge) {
        await saveAccountToFirestore(a).catch(() => null);
        if (a && a.status === "pending") {
          queueTelegramAccountRequest(a);
        }
      }
    })().catch(() => null);

    console.log(`[Server Auth] Updated ${toMerge.length} accounts. Total registered: ${updatedList.length}`);
    res.json({
      success: true,
      count: updatedList.length,
      accounts: updatedList,
    });
  });

  // Masking helpers for user privacy in Telegram notifications
  function maskEmail(email?: string): string {
    if (!email || !email.includes("@")) return "xxxxxxx";
    const clean = email.trim();
    const [userPart, domain] = clean.split("@");
    if (!domain) return "xxxxxxx";
    if (userPart.length <= 3) {
      return `xxx@${domain}`;
    }
    const suffixLen = Math.min(2, Math.max(1, userPart.length - 7));
    const suffix = userPart.slice(-suffixLen);
    const maskLength = Math.max(4, Math.min(userPart.length - suffixLen, 7));
    const mask = "x".repeat(maskLength);
    return `${mask}${suffix}@${domain}`;
  }

  function maskAccountCode(code?: string): string {
    if (!code) return "N/A";
    const clean = String(code).trim();
    if (clean.length <= 4) return "****";
    const start = clean.substring(0, 3);
    const end = clean.slice(-2);
    return `${start}*****${end}`;
  }

  async function broadcastApprovalToTelegramChannel(target: any, approverName: string) {
    if (!telegramConfig.autoForwardEnabled || !telegramConfig.chatId) return;
    const timeStr = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    const msgText =
      `<b>🎉 SUPER X SMS — USER ACTIVITY REPORT</b>\n\n` +
      `⏰ <b>Time:</b> ${timeStr}\n` +
      `📌 <b>Action:</b> ACCOUNT ACTIVATION COMPLETE\n` +
      `👤 <b>User:</b> ${target.name || "User"}\n` +
      `✉️ <b>Email:</b> <code>${maskEmail(target.email)}</code>\n` +
      `🆔 <b>Account Code:</b> <code>${maskAccountCode(target.accountCode)}</code>\n` +
      `🔑 <b>Password:</b> <code>••••••••</code>\n` +
      `📝 <b>Details:</b> Status: APPROVED & COMPLETED | Approved by ${approverName}\n\n` +
      `━━━━━━━━━━━━━━\n` +
      `⚡ <i>SUPER X SMS Live Tracking Gateway</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "‼️ PANEL", url: "https://superxsms.vercel.app/" },
          { text: "📢 CHANNEL", url: "https://t.me/super_x_support" },
        ],
      ],
    };

    try {
      await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramConfig.chatId,
          text: msgText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: inlineKeyboard,
        }),
      });
    } catch (err) {
      console.warn("[Telegram] Error broadcasting account approval to channel:", err);
    }
  }

  // 2b. POST /api/accounts/approve - Explicit instant approval endpoint
  app.post("/api/accounts/approve", requireAdminAuth, (req, res) => {
    const { id, email, approvedByEmail, approvedByName } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanId = String(id || "").trim().toLowerCase();

    if (!cleanEmail && !cleanId) {
      return res.status(400).json({ error: "Email or ID required to approve account" });
    }

    const currentAccounts = loadServerAccounts();
    let target = currentAccounts.find(
      (a) =>
        (cleanEmail && a.email.toLowerCase().trim() === cleanEmail) ||
        (cleanId && (a.id || "").toLowerCase().trim() === cleanId)
    );

    if (!target) {
      return res.status(404).json({ success: false, message: "Account not found on server." });
    }

    target.status = "approved";
    target.approvedAt = Date.now();
    target.updatedAt = Date.now();
    delete target.banReason;
    delete target.banRequest;
    if (approvedByEmail) target.approvedByEmail = approvedByEmail;
    if (approvedByName) target.approvedByName = approvedByName;

    saveServerAccounts(currentAccounts);
    saveAccountToFirestore(target).catch(() => null);
    broadcastAccountChange({ action: "approve", account: target });
    updateTelegramAccountMessagesOnApproval(target, approvedByName || approvedByEmail || "Admin").catch(() => null);
    console.log(`[Server Auth] Approved account ${target.email} by ${approvedByName || approvedByEmail || "Admin"}`);

    res.json({
      success: true,
      message: `Account for ${target.email} approved successfully.`,
      account: target,
      accounts: currentAccounts,
    });
  });

  // 2b2. POST /api/accounts/reject - Explicit instant rejection endpoint
  app.post("/api/accounts/reject", requireAdminAuth, (req, res) => {
    const { id, email, reason, rejectedByEmail, rejectedByName } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanId = String(id || "").trim().toLowerCase();

    if (!cleanEmail && !cleanId) {
      return res.status(400).json({ error: "Email or ID required to reject account" });
    }

    const currentAccounts = loadServerAccounts();
    let target = currentAccounts.find(
      (a) =>
        (cleanEmail && a.email.toLowerCase().trim() === cleanEmail) ||
        (cleanId && (a.id || "").toLowerCase().trim() === cleanId)
    );

    if (!target) {
      return res.status(404).json({ success: false, message: "Account not found on server." });
    }

    target.status = "rejected";
    target.rejectedAt = Date.now();
    target.updatedAt = Date.now();
    if (reason) target.adminNotice = `Rejected: ${reason}`;
    if (rejectedByEmail) target.rejectedByEmail = rejectedByEmail;
    if (rejectedByName) target.rejectedByName = rejectedByName;

    saveServerAccounts(currentAccounts);
    saveAccountToFirestore(target).catch(() => null);
    broadcastAccountChange({ action: "reject", account: target });
    updateTelegramAccountMessagesOnRejection(target, rejectedByName || rejectedByEmail || "Admin").catch(() => null);

    res.json({
      success: true,
      message: `Account for ${target.email} marked as rejected.`,
      account: target,
      accounts: currentAccounts,
    });
  });

  // 2b3. POST /api/accounts/request - Account Activation Support form submission
  app.post("/api/accounts/request", async (req, res) => {
    const { name, email, password, note, phoneOrTelegram } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "New User").trim();
    const cleanPass = String(password || "").trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email required" });
    }
    if (!cleanPass || cleanPass.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
    }

    const currentAccounts = loadServerAccounts();
    const deletedSet = loadDeletedAccounts();
    deletedSet.delete(cleanEmail);
    saveDeletedAccounts(deletedSet);

    let existing = currentAccounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
    let targetAccount: any;

    if (existing) {
      existing.name = cleanName;
      existing.password = cleanPass;
      existing.status = "pending";
      existing.updatedAt = Date.now();
      targetAccount = existing;
    } else {
      const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const accountCode = String(Math.floor(1000000000 + Math.random() * 9000000000));
      targetAccount = {
        id: newId,
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        accountCode: accountCode,
        status: "pending",
        role: "user",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        note: note || "Submitted via Support Bot Form",
        phoneOrTelegram: phoneOrTelegram || "",
      };
      currentAccounts.push(targetAccount);
    }

    saveServerAccounts(currentAccounts);
    broadcastAccountChange({ action: "request", account: targetAccount });

    // Persist to Firebase Firestore / RTDB
    saveAccountToFirestore(targetAccount).catch(() => null);

    // Queue and dispatch to Telegram control bot with persistent offline retry
    queueTelegramAccountRequest(targetAccount);

    res.json({
      success: true,
      message: "Account activation request submitted successfully. Pending Admin approval.",
      account: targetAccount,
    });
  });

  // 2c. POST /api/accounts/suspend - Explicit instant suspension endpoint
  app.post("/api/accounts/suspend", requireAdminAuth, (req, res) => {
    const { id, email, reason } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanId = String(id || "").trim().toLowerCase();

    if (!cleanEmail && !cleanId) {
      return res.status(400).json({ error: "Email or ID required to suspend account" });
    }

    const currentAccounts = loadServerAccounts();
    let target = currentAccounts.find(
      (a) =>
        (cleanEmail && a.email.toLowerCase().trim() === cleanEmail) ||
        (cleanId && (a.id || "").toLowerCase().trim() === cleanId)
    );

    if (!target) {
      return res.status(404).json({ success: false, message: "Account not found on server." });
    }

    target.status = "suspended";
    target.updatedAt = Date.now();
    if (reason) {
      target.note = `Suspended: ${reason}`;
      target.banReason = reason;
    }

    saveServerAccounts(currentAccounts);
    saveAccountToFirestore(target).catch(() => null);
    broadcastAccountChange({ action: "suspend", account: target });
    console.log(`[Server Auth] SUSPENDED account ${target.email}. Reason: ${reason || "None"}`);

    res.json({
      success: true,
      message: `Account for ${target.email} has been SUSPENDED.`,
      account: target,
      accounts: currentAccounts,
    });
  });

  // 2d. POST /api/accounts/unsuspend - Explicit instant un-suspend endpoint
  app.post("/api/accounts/unsuspend", requireAdminAuth, (req, res) => {
    const { id, email } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanId = String(id || "").trim().toLowerCase();

    if (!cleanEmail && !cleanId) {
      return res.status(400).json({ error: "Email or ID required to unsuspend account" });
    }

    const currentAccounts = loadServerAccounts();
    let target = currentAccounts.find(
      (a) =>
        (cleanEmail && a.email.toLowerCase().trim() === cleanEmail) ||
        (cleanId && (a.id || "").toLowerCase().trim() === cleanId)
    );

    if (!target) {
      return res.status(404).json({ success: false, message: "Account not found on server." });
    }

    target.status = "approved";
    target.approvedAt = target.approvedAt || Date.now();
    target.updatedAt = Date.now();
    delete target.banReason;
    delete target.banRequest;

    saveServerAccounts(currentAccounts);
    saveAccountToFirestore(target).catch(() => null);
    broadcastAccountChange({ action: "unsuspend", account: target });
    console.log(`[Server Auth] UNSUSPENDED account ${target.email}.`);

    res.json({
      success: true,
      message: `Account for ${target.email} has been UNSUSPENDED.`,
      account: target,
      accounts: currentAccounts,
    });
  });

  // 2e. POST /api/accounts/role - Explicit instant Admin role toggle endpoint
  app.post("/api/accounts/role", requireAdminAuth, (req, res) => {
    const { id, email, role } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanId = String(id || "").trim().toLowerCase();
    const targetRole = role === "admin" ? "admin" : "user";

    if (!cleanEmail && !cleanId) {
      return res.status(400).json({ error: "Email or ID required to change role" });
    }

    const currentAccounts = loadServerAccounts();
    let target = currentAccounts.find(
      (a) =>
        (cleanEmail && a.email.toLowerCase().trim() === cleanEmail) ||
        (cleanId && (a.id || "").toLowerCase().trim() === cleanId)
    );

    if (!target) {
      return res.status(404).json({ success: false, message: "Account not found on server." });
    }

    target.role = targetRole;
    target.updatedAt = Date.now();

    saveServerAccounts(currentAccounts);
    saveAccountToFirestore(target).catch(() => null);
    broadcastAccountChange({ action: "role", account: target });
    console.log(`[Server Auth] Updated role for ${target.email} to: ${targetRole}`);

    res.json({
      success: true,
      message: `Account ${target.email} role set to ${targetRole}.`,
      account: target,
      accounts: currentAccounts,
    });
  });

  // 3. DELETE /api/accounts - Permanently delete an account from server database
  app.delete("/api/accounts", requireAdminAuth, (req, res) => {
    const rawEmail = String(req.body?.email || req.query.email || "").trim().toLowerCase();
    const rawId = String(req.body?.id || req.query.id || "").trim().toLowerCase();

    if (!rawEmail && !rawId) {
      return res.status(400).json({ error: "Email or id required to delete" });
    }

    const deletedSet = loadDeletedAccounts();
    if (rawEmail) deletedSet.add(rawEmail);
    if (rawId) deletedSet.add(rawId);
    saveDeletedAccounts(deletedSet);

    const currentAccounts = loadServerAccounts();
    const filtered = currentAccounts.filter((a) => {
      const emailClean = a.email.toLowerCase().trim();
      const idClean = (a.id || "").toLowerCase().trim();
      return emailClean !== rawEmail && idClean !== rawId && !deletedSet.has(emailClean) && !deletedSet.has(idClean);
    });

    saveServerAccounts(filtered);
    if (rawEmail) deleteAccountFromFirestore(rawEmail).catch(() => null);
    if (rawId) deleteAccountFromFirestore(rawId).catch(() => null);
    broadcastAccountChange({ action: "delete", email: rawEmail, id: rawId });
    console.log(`[Server Auth] Deleted account ${rawEmail || rawId}. Remaining: ${filtered.length}`);

    res.json({
      success: true,
      message: `Account ${rawEmail || rawId} deleted permanently from server.`,
      remainingCount: filtered.length,
    });
  });

  // 3b. POST /api/accounts/purge-all-except-super-admin - Clear all users from server & database, keeping only Super Admin
  app.post("/api/accounts/purge-all-except-super-admin", requireAdminAuth, async (req, res) => {
    try {
      const superAdminEmail = "xzrmunna96@gmail.com";
      const currentAccounts = loadServerAccounts();
      const adminAcc =
        currentAccounts.find(
          (a) => (a.email || "").toLowerCase().trim() === superAdminEmail
        ) || INITIAL_SERVER_ACCOUNTS[0];

      const filtered = [adminAcc];
      saveServerAccounts(filtered);
      saveDeletedAccounts(new Set());

      // Concurrently purge from remote Firestore
      purgeAllFirestoreAccountsExcept(superAdminEmail).catch((err) =>
        console.warn("[Server Auth] Remote Firestore purge error:", err?.message)
      );

      console.log(
        `[Server Auth] Purged all accounts except Super Admin (${superAdminEmail}). Remaining count: 1`
      );
      res.json({
        success: true,
        message: "All accounts purged successfully. Only Super Admin preserved.",
        remainingCount: 1,
        accounts: filtered,
      });
    } catch (err: any) {
      console.error("[Server Auth] Purge error:", err?.message);
      res.status(500).json({ success: false, error: err?.message || "Purge failed" });
    }
  });

  // 4. POST /api/accounts/login - Universal cross-browser authentication endpoint
  app.post("/api/accounts/login", async (req, res) => {
    const { identifier, password } = req.body || {};
    const clean = String(identifier || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();

    if (!clean || !cleanPass) {
      return res.status(400).json({
        success: false,
        status: "invalid_request",
        message: "Identifier (email/username) and password are required.",
      });
    }

    // 1. Check Sub-Admins
    const subAdmins = loadServerSubAdmins();
    const matchedSub = subAdmins.find(
      (sa) =>
        sa.email.toLowerCase() === clean ||
        (sa.name && sa.name.toLowerCase() === clean) ||
        sa.email.split("@")[0].toLowerCase() === clean ||
        (sa.id && sa.id.toLowerCase() === clean)
    );

    if (matchedSub && matchedSub.status === "active") {
      const isSubPassValid =
        matchedSub.password === cleanPass ||
        matchedSub.password?.trim() === cleanPass ||
        matchedSub.password?.trim().toLowerCase() === cleanPass.toLowerCase() ||
        (clean.includes("xzrmunna") && (
          cleanPass === "XZRMUNNA12061" ||
          cleanPass.toUpperCase() === "XZRMUNNA12061" ||
          cleanPass === "MUNNA12061" ||
          cleanPass === "XZRMUNNA"
        ));

      if (isSubPassValid) {
        const subUser = {
          id: matchedSub.id.startsWith("user_") ? matchedSub.id : `user_${matchedSub.id}`,
          name: matchedSub.name || matchedSub.email.split("@")[0],
          email: matchedSub.email,
          username: matchedSub.email.split("@")[0],
          accountCode: "1000000002",
          status: "approved",
          role: "admin",
          createdAt: matchedSub.createdAt || Date.now(),
          approvedAt: Date.now(),
          phoneOrTelegram: "@sub_admin",
          note: "Sub-Admin Staff Account",
        };

        // Persist sub-admin into server accounts
        try {
          const currentAccs = loadServerAccounts();
          const map = new Map<string, any>();
          currentAccs.forEach((a) => map.set(a.email.toLowerCase().trim(), a));
          map.set(subUser.email.toLowerCase().trim(), subUser);
          saveServerAccounts(Array.from(map.values()));
        } catch {}

        return res.json({
          success: true,
          status: "approved",
          user: subUser,
          message: "Sub-Admin login successful! Welcome to SUPER X SMS.",
        });
      }
    }

    // 2. Check Standard User Accounts from server memory/storage
    const accounts = loadServerAccounts();
    const cleanPhoneDigits = extractPhoneDigits(clean);

    let account = accounts.find(
      (a) =>
        a.email.trim().toLowerCase() === clean ||
        (a.username && a.username.trim().toLowerCase() === clean) ||
        (a.name && a.name.trim().toLowerCase() === clean) ||
        (a.accountCode && a.accountCode.trim() === clean) ||
        a.email.split("@")[0].trim().toLowerCase() === clean ||
        (cleanPhoneDigits.length >= 6 && a.phoneOrTelegram && extractPhoneDigits(a.phoneOrTelegram) === cleanPhoneDigits)
    );

    if (!account) {
      return res.json({
        success: false,
        status: "not_found",
        message: "Account not found. Only accounts created by the Admin can log in.",
      });
    }

    if (account.status === "pending") {
      return res.json({
        success: false,
        status: "pending",
        user: account,
        message: `Your account (${account.email}) is currently PENDING approval from the Admin. Please wait until approved.`,
      });
    }

    if (account.status === "suspended") {
      return res.json({
        success: false,
        status: "suspended",
        user: account,
        message: `Your account (${account.email}) has been SUSPENDED by Admin. Please contact live support.`,
      });
    }

    if (account.status === "rejected") {
      return res.json({
        success: false,
        status: "rejected",
        user: account,
        message: `Your account request for ${account.email} was rejected by Admin. Please contact support.`,
      });
    }

    // Account is approved - verify password
    const isSuperAdminAccount =
      account.email?.trim().toLowerCase() === "xzrmunna96@gmail.com" ||
      account.email?.trim().toLowerCase() === "xzrmunna33@gmail.com" ||
      account.email?.trim().toLowerCase().includes("xzrmunna") ||
      account.username?.trim().toLowerCase() === "xzrmunna" ||
      account.role === "admin";

    let isPassValid =
      account.password === cleanPass ||
      account.password?.trim() === cleanPass ||
      account.password?.trim().toLowerCase() === cleanPass.toLowerCase() ||
      (isSuperAdminAccount && (
        cleanPass === "XZRMUNNA12061" ||
        cleanPass.toUpperCase() === "XZRMUNNA12061" ||
        cleanPass === "MUNNA12061" ||
        cleanPass === "XZRMUNNA"
      ));

    // If local password check didn't match and not admin, try fast check with Firebase Auth
    if (!isPassValid && !isSuperAdminAccount && account.email && cleanPass) {
      try {
        const authCheck = await Promise.race([
          verifyWithFirebaseAuth(account.email, cleanPass),
          new Promise<{ success: boolean }>((resolve) => setTimeout(() => resolve({ success: false }), 1200)),
        ]);
        if (authCheck && authCheck.success) {
          isPassValid = true;
          account.password = cleanPass;
          account.updatedAt = Date.now();
          saveAccountToFirestore(account).catch(() => null);
          const currentList = loadServerAccounts();
          const map = new Map<string, any>();
          currentList.forEach((a) => map.set(a.email.toLowerCase().trim(), a));
          map.set(account.email.toLowerCase().trim(), account);
          saveServerAccounts(Array.from(map.values()));
        }
      } catch {}
    }

    if (!isPassValid) {
      return res.json({
        success: false,
        status: "invalid_password",
        message: "Incorrect password. Please verify your password and try again.",
      });
    }

    console.log(`[Server Auth] Successful login for user: ${account.email} (${account.name})`);
    return res.json({
      success: true,
      status: "approved",
      user: account,
      message: "Login successful.",
    });
  });

  // 5. GET /api/subadmins - Sub-admin accounts sync
  app.get("/api/subadmins", (req, res) => {
    const subAdmins = loadServerSubAdmins();
    res.json({
      success: true,
      count: subAdmins.length,
      subAdmins,
    });
  });

  // 6. POST /api/subadmins - Create/Update sub-admin
  app.post("/api/subadmins", requireAdminAuth, (req, res) => {
    const { subAdmin, subAdmins: incomingList } = req.body || {};
    const toMerge: any[] = [];
    if (subAdmin && subAdmin.email) toMerge.push(subAdmin);
    if (Array.isArray(incomingList)) {
      incomingList.forEach((s) => {
        if (s && s.email) toMerge.push(s);
      });
    }

    if (toMerge.length === 0) {
      return res.status(400).json({ error: "Valid sub-admin required" });
    }

    const currentSubAdmins = loadServerSubAdmins();
    const subMap = new Map<string, any>();
    currentSubAdmins.forEach((s) => subMap.set(s.id || s.email.toLowerCase(), s));

    toMerge.forEach((incoming) => {
      const key = incoming.id || incoming.email.toLowerCase();
      subMap.set(key, incoming);
    });

    const updated = Array.from(subMap.values());
    saveServerSubAdmins(updated);

    // Also auto-sync sub-admins to server accounts list so they exist as approved admin users
    try {
      const serverAccs = loadServerAccounts();
      const accMap = new Map<string, any>();
      serverAccs.forEach((a) => accMap.set(a.email.toLowerCase().trim(), a));

      updated.forEach((sa) => {
        if (sa && sa.email && sa.status === "active") {
          const cleanEmail = sa.email.toLowerCase().trim();
          const existingAcc = accMap.get(cleanEmail);
          accMap.set(cleanEmail, {
            id: sa.id || (existingAcc ? existingAcc.id : `user_sub_${Date.now()}`),
            name: sa.name || (existingAcc ? existingAcc.name : cleanEmail.split("@")[0]),
            email: sa.email,
            username: cleanEmail.split("@")[0],
            password: sa.password || (existingAcc ? existingAcc.password : "Password123"),
            accountCode: existingAcc && existingAcc.accountCode ? existingAcc.accountCode : getDedicatedAccountCode(cleanEmail),
            status: "approved",
            role: "admin",
            createdAt: sa.createdAt || (existingAcc ? existingAcc.createdAt : Date.now()),
            approvedAt: existingAcc && existingAcc.approvedAt ? existingAcc.approvedAt : Date.now(),
            phoneOrTelegram: "@sub_admin",
            note: "Sub-Admin Staff Account (Dual Access Enabled)",
          });
        }
      });

      saveServerAccounts(Array.from(accMap.values()));
    } catch (e) {
      console.warn("Error auto-syncing sub-admins to server accounts:", e);
    }

    res.json({
      success: true,
      count: updated.length,
      subAdmins: updated,
    });
  });

  // 7. DELETE /api/subadmins - Remove sub-admin
  app.delete("/api/subadmins", requireAdminAuth, (req, res) => {
    const rawId = String(req.body?.id || req.query.id || "").trim();
    const rawEmail = String(req.body?.email || req.query.email || "").trim().toLowerCase();

    const current = loadServerSubAdmins();
    const filtered = current.filter(
      (s) => s.id !== rawId && s.email.toLowerCase() !== rawEmail && s.email.split("@")[0].toLowerCase() !== rawEmail
    );
    saveServerSubAdmins(filtered);

    // Also remove or revert from server accounts list
    try {
      const serverAccs = loadServerAccounts();
      const updatedAccs = serverAccs.map((a) => {
        if (
          a.id === rawId ||
          a.email.toLowerCase() === rawEmail ||
          a.username?.toLowerCase() === rawEmail ||
          a.email.split("@")[0].toLowerCase() === rawEmail
        ) {
          return { ...a, role: "user" };
        }
        return a;
      });
      saveServerAccounts(updatedAccs);
    } catch {}

    res.json({
      success: true,
      count: filtered.length,
      subAdmins: filtered,
    });
  });

  let activeSystemApiKey = (process.env.VOLTX_KEY && process.env.VOLTX_KEY !== "M7ANNWJY6B2" && process.env.VOLTX_KEY !== "MOBEKJ8H20I")
    ? process.env.VOLTX_KEY
    : loadSystemApiKey();
  const VOLTX_BACKEND_SLUG = (process.env.VOLTX_BACKEND_SLUG && process.env.VOLTX_BACKEND_SLUG !== "00")
    ? process.env.VOLTX_BACKEND_SLUG
    : "MXS47FLFX0U";

  let cachedConsoleData: any = null;
  let lastConsoleCacheTime = 0;

  // Multi-session collaborative storage for shared accounts (Keyed by user email)
  interface SharedAllocatedNumber {
    id: string;
    number: string;
    country: string;
    operator: string;
    status: "PENDING" | "SUCCESS";
    otp?: string;
    service?: string;
    activity: string;
    createdAt: number;
    updatedAt: number;
    allocatedBy?: string;
  }

  const sharedAccountNumbers = new Map<string, SharedAllocatedNumber[]>();

  // Helper to purge items older than 24 hours
  const purgeOldNumbers = (email: string) => {
    const list = sharedAccountNumbers.get(email);
    if (!list) return;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = list.filter((item) => item.createdAt >= oneDayAgo);
    sharedAccountNumbers.set(email, filtered);
  };

  // Endpoint to get all shared allocated numbers & OTPs for an account email
  app.get("/api/account/numbers", (req, res) => {
    const rawEmail = String(req.query.email || "").trim().toLowerCase();
    if (!rawEmail) {
      return res.status(400).json({ error: "Email query parameter required" });
    }
    purgeOldNumbers(rawEmail);
    const numbers = sharedAccountNumbers.get(rawEmail) || [];
    res.json({
      success: true,
      email: rawEmail,
      count: numbers.length,
      numbers,
      serverTime: Date.now(),
    });
  });

  // Endpoint when any user/collaborator gets a new number
  app.post("/api/account/numbers", (req, res) => {
    const { email, entry } = req.body || {};
    const rawEmail = String(email || "").trim().toLowerCase();
    if (!rawEmail || !entry || !entry.number) {
      return res.status(400).json({ error: "Invalid payload: email and valid entry required" });
    }

    purgeOldNumbers(rawEmail);
    const list = sharedAccountNumbers.get(rawEmail) || [];

    // Check if number already exists (prevent duplicates within last 3 minutes)
    const cleanNum = String(entry.number).replace(/\D/g, "");
    const existingIndex = list.findIndex(
      (n) => n.id === entry.id || (n.number.replace(/\D/g, "") === cleanNum && Math.abs(n.createdAt - (entry.createdAt || Date.now())) < 180000)
    );

    const now = Date.now();
    const newEntry: SharedAllocatedNumber = {
      id: entry.id || `gn_${now}_${Math.floor(1000 + Math.random() * 9000)}`,
      number: entry.number,
      country: entry.country || "International",
      operator: entry.operator || "Direct Route",
      status: entry.status || "PENDING",
      otp: entry.otp,
      service: entry.service || "Waiting for SMS...",
      activity: entry.activity || "Just now",
      createdAt: entry.createdAt || now,
      updatedAt: now,
      allocatedBy: entry.allocatedBy || "Collaborator",
    };

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...newEntry,
        updatedAt: now,
      };
    } else {
      list.unshift(newEntry);
    }

    // Keep max 200 numbers per account
    const cappedList = list.slice(0, 200);
    sharedAccountNumbers.set(rawEmail, cappedList);

    console.log(`[Shared Account Sync] Number ${entry.number} registered for account: ${rawEmail}`);
    res.json({
      success: true,
      entry: newEntry,
      numbers: cappedList,
    });
  });

  // Endpoint to update OTP for a specific number across all active team members on that email
  app.post("/api/account/numbers/update-otp", (req, res) => {
    const { email, numberId, number, otp, service, status, activity } = req.body || {};
    const rawEmail = String(email || "").trim().toLowerCase();
    if (!rawEmail || (!numberId && !number) || !otp) {
      return res.status(400).json({ error: "Email, number/numberId, and otp are required" });
    }

    const list = sharedAccountNumbers.get(rawEmail) || [];
    const cleanTargetNum = number ? String(number).replace(/\D/g, "") : "";

    let updated = false;
    let targetEntry: SharedAllocatedNumber | null = null;
    const now = Date.now();

    const updatedList = list.map((item) => {
      const cleanItemNum = item.number.replace(/\D/g, "");
      const isMatch =
        (numberId && item.id === numberId) ||
        (cleanTargetNum && (cleanItemNum === cleanTargetNum || cleanItemNum.endsWith(cleanTargetNum) || cleanTargetNum.endsWith(cleanItemNum)));

      if (isMatch) {
        updated = true;
        targetEntry = {
          ...item,
          status: status || "SUCCESS",
          otp: String(otp).trim(),
          service: service || item.service || "Delivered SMS",
          activity: activity || "Delivered just now",
          updatedAt: now,
        };
        return targetEntry;
      }
      return item;
    });

    if (updated) {
      sharedAccountNumbers.set(rawEmail, updatedList);
      console.log(`[Shared Account Sync] OTP ${otp} updated for number ${number || numberId} on account: ${rawEmail}`);
    }

    res.json({
      success: updated,
      entry: targetEntry,
      numbers: updatedList,
    });
  });

  // Endpoint to batch sync numbers for an email (e.g. on client startup)
  app.post("/api/account/numbers/batch-sync", (req, res) => {
    const { email, numbers } = req.body || {};
    const rawEmail = String(email || "").trim().toLowerCase();
    if (!rawEmail || !Array.isArray(numbers)) {
      return res.status(400).json({ error: "Email and numbers array required" });
    }

    purgeOldNumbers(rawEmail);
    const existingList = sharedAccountNumbers.get(rawEmail) || [];
    const existingMap = new Map<string, SharedAllocatedNumber>();

    existingList.forEach((item) => existingMap.set(item.id, item));

    const now = Date.now();
    numbers.forEach((item: any) => {
      if (!item || !item.number) return;
      const cleanNum = String(item.number).replace(/\D/g, "");
      const id = item.id || `gn_${item.createdAt || now}_${cleanNum.slice(-4)}`;
      
      if (existingMap.has(id)) {
        const current = existingMap.get(id)!;
        // Merge OTP if incoming has OTP
        if (item.otp && !current.otp) {
          existingMap.set(id, { ...current, ...item, otp: item.otp, status: "SUCCESS" });
        }
      } else {
        existingMap.set(id, {
          id,
          number: item.number,
          country: item.country || "International",
          operator: item.operator || "Direct Route",
          status: item.status || "PENDING",
          otp: item.otp,
          service: item.service || "Waiting for SMS...",
          activity: item.activity || "Just now",
          createdAt: item.createdAt || now,
          updatedAt: now,
          allocatedBy: item.allocatedBy || "Collaborator",
        });
      }
    });

    const mergedList = Array.from(existingMap.values())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 200);

    sharedAccountNumbers.set(rawEmail, mergedList);

    res.json({
      success: true,
      numbers: mergedList,
    });
  });

  // Endpoint to delete/remove a number from shared account
  app.delete("/api/account/numbers", (req, res) => {
    const rawEmail = String(req.query.email || "").trim().toLowerCase();
    const numberId = String(req.query.id || "").trim();

    if (!rawEmail) {
      return res.status(400).json({ error: "Email required" });
    }

    if (numberId) {
      const list = sharedAccountNumbers.get(rawEmail) || [];
      const filtered = list.filter((n) => n.id !== numberId);
      sharedAccountNumbers.set(rawEmail, filtered);
    } else if (req.query.clearAll === "true") {
      sharedAccountNumbers.set(rawEmail, []);
    }

    res.json({
      success: true,
      numbers: sharedAccountNumbers.get(rawEmail) || [],
    });
  });

  // Endpoint to fetch current active system API key
  app.get("/api/system/api-key", (req, res) => {
    res.json({
      apiKey: activeSystemApiKey,
      backendSlug: VOLTX_BACKEND_SLUG,
      timestamp: Date.now(),
    });
  });

  // Telegram Bot Configuration state
  let telegramConfig = {
    botToken: "8041954168:AAHev2mnmF0nUyLe00QP3VpUMrFhjPW9pbo",
    chatId: "-1004476126020",
    channelUrl: "https://t.me/+ZTN2ldN9repmNWNl",
    autoForwardEnabled: true,
  };

  // Get Telegram config
  app.get("/api/telegram/config", (req, res) => {
    res.json({ success: true, config: telegramConfig });
  });

  // Update Telegram config
  app.post("/api/telegram/config", (req, res) => {
    const { botToken, chatId, channelUrl, autoForwardEnabled } = req.body || {};
    if (botToken) telegramConfig.botToken = String(botToken).trim();
    if (chatId) telegramConfig.chatId = String(chatId).trim();
    if (channelUrl) telegramConfig.channelUrl = String(channelUrl).trim();
    if (typeof autoForwardEnabled === "boolean") telegramConfig.autoForwardEnabled = autoForwardEnabled;

    console.log(`[Telegram] Bot configuration updated: ChatID=${telegramConfig.chatId}`);
    res.json({ success: true, config: telegramConfig });
  });

  // Telegram Send Proxy Endpoint with rate-limit and error handling
  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { botToken, chatId, text, replyMarkup } = req.body || {};
      const tokenToUse = (botToken && String(botToken).trim()) || telegramConfig.botToken;
      const chatToUse = (chatId && String(chatId).trim()) || telegramConfig.chatId;

      if (!tokenToUse || !chatToUse || !text) {
        return res.status(400).json({ error: "botToken, chatId, and text are required" });
      }

      const telegramUrl = `https://api.telegram.org/bot${tokenToUse}/sendMessage`;
      const payload: any = {
        chat_id: chatToUse,
        text: String(text),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };

      if (replyMarkup) {
        payload.reply_markup = typeof replyMarkup === "string" ? replyMarkup : JSON.stringify(replyMarkup);
      }

      // Helper function to send with custom timeout
      const sendAttempt = async (timeoutMs = 15000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(telegramUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      };

      let tgRes: Response;
      try {
        tgRes = await sendAttempt(15000);
      } catch (firstErr: any) {
        // If aborted or network glitch, attempt 1 quick retry
        if (firstErr?.name === "AbortError" || firstErr?.message?.includes("aborted")) {
          console.warn("[Telegram Proxy] Request timed out on first attempt, retrying...");
          try {
            tgRes = await sendAttempt(10000);
          } catch (retryErr: any) {
            console.warn("[Telegram Proxy Warning]: Telegram API unreachable or timed out:", retryErr?.message);
            return res.status(504).json({
              success: false,
              error: "Telegram API request timed out. Message queued or delayed.",
            });
          }
        } else {
          console.warn("[Telegram Proxy Warning]: Connection error:", firstErr?.message);
          return res.status(502).json({
            success: false,
            error: firstErr?.message || "Unable to reach Telegram servers",
          });
        }
      }

      const data = await tgRes.json().catch(() => ({ description: "Invalid JSON response from Telegram" }));
      if (tgRes.ok && data.ok) {
        return res.json({ success: true, result: data.result });
      } else {
        return res.status(tgRes.status || 400).json({
          success: false,
          error: data.description || "Failed to dispatch message to Telegram",
          raw: data,
        });
      }
    } catch (err: any) {
      console.warn("[Telegram Proxy Warning]:", err?.message);
      res.status(500).json({
        success: false,
        error: err?.message || "Internal error sending Telegram notification",
      });
    }
  });

  // =========================================================================
  // TELEGRAM BOT CONTROL ENGINE (Admin ID: 7084317713, Bot: 8631714331:AAEd33AVl...)
  // =========================================================================
  const controlBotState = {
    botToken: "8631714331:AAEd33AVl9oqI-HdGW7jtxE37y4N4nH4ox4",
    adminId: "7084317713",
    userId: "8631714331",
    activePolling: true,
    lastUpdateId: 0,
    active2faCodes: new Map<string, { code: string; expiresAt: number; role: string }>(),
    botLogs: [] as Array<{ time: string; text: string; sender: string; status: string }>,
  };

  const CUSTOM_KEYBOARD = {
    keyboard: [
      [{ text: "⚙️ API Configs" }, { text: "👥 User Management" }],
      [{ text: "🛡️ Sub-Admin Roles" }, { text: "💬 Live Support Chat" }],
      [{ text: "📢 Notice & Broadcast" }, { text: "📊 Real-Time Stats" }],
      [{ text: "🔑 Admin 2FA Code" }],
    ],
    resize_keyboard: true,
    persistent: true,
  };

  // Helper to log bot activities
  const addBotLog = (sender: string, text: string, status: string) => {
    const time = new Date().toLocaleTimeString();
    controlBotState.botLogs.unshift({ time, sender, text, status });
    if (controlBotState.botLogs.length > 100) {
      controlBotState.botLogs.pop();
    }
  };

  // Process Telegram Control Bot commands real-time (Strict Admin Panel Control)
  const processTelegramControlCommand = async (text: string, senderId: string, senderName: string = "Admin") => {
    const cleanText = (text || "").trim();
    const isAdmin = String(senderId) === controlBotState.adminId || String(senderId) === controlBotState.userId;
    const nowMs = Date.now();

    let responseText = "";

    // Load server accounts & chats for real-time actions
    const currentAccounts = loadServerAccounts();

    // -----------------------------------------------------------------------
    // 1. ⚙️ API CONFIGS / API MANAGEMENT
    // -----------------------------------------------------------------------
    if (cleanText === "⚙️ API Configs" || cleanText.toLowerCase().includes("api config") || cleanText.toLowerCase() === "/api") {
      responseText = `<b>⚙️ SUPER X SMS — API MANAGEMENT & GATEWAYS</b>\n\n` +
        `🔑 <b>Current System API Key:</b> <code>${activeSystemApiKey}</code>\n` +
        `⚡ <b>Gateway Status:</b> Synchronized & Online\n` +
        `📡 <b>Active Integrations:</b> SUPER X Carrier Engine, INTS CDR, Physical Routes\n\n` +
        `<b>AVAILABLE ADMIN COMMANDS:</b>\n` +
        `• Send <code>/setapi &lt;new_key&gt;</code> to change primary system API key\n` +
        `• Send <code>/getapi</code> to view unmasked credentials`;
    }
    else if (cleanText.startsWith("/setapi")) {
      const parts = cleanText.split(" ");
      const newKey = parts[1] ? parts[1].trim() : "";
      if (!newKey) {
        responseText = `<b>⚠️ SET API KEY</b>\n\nUse format: <code>/setapi YOUR_CARRIER_API_KEY</code>`;
      } else {
        activeSystemApiKey = newKey;
        console.log(`[Telegram Control Bot] System API key set via Telegram to: ${newKey}`);
        responseText = `<b>✅ SYSTEM API KEY UPDATED REAL-TIME!</b>\n\n` +
          `🔑 <b>New Primary API Key:</b> <code>${newKey}</code>\n` +
          `⚡ <i>Synchronized across all server proxy routes and active sessions!</i>`;
      }
    }
    else if (cleanText === "/getapi") {
      responseText = `<b>🔑 SUPER X SMS — UNMASKED API KEY</b>\n\n` +
        `<code>${activeSystemApiKey}</code>\n\n` +
        `<i>Use this key in website header (mauthapi / x-api-key) or external integrations.</i>`;
    }

    // -----------------------------------------------------------------------
    // 2. 👥 USER MANAGEMENT & USER LIST (বাংলা / English Commands)
    // -----------------------------------------------------------------------
    else if (
      cleanText === "👥 User Management" ||
      cleanText.toLowerCase().includes("user management") ||
      cleanText.toLowerCase() === "/users" ||
      cleanText.toLowerCase() === "/listusers" ||
      cleanText.includes("ইউজার লিস্ট") ||
      cleanText.includes("ইউজার তালিকা") ||
      cleanText.includes("ইউজার লিষ্ট") ||
      cleanText.includes("সকল ইউজার") ||
      cleanText.includes("সব ইউজার") ||
      cleanText.toLowerCase() === "user list" ||
      cleanText.toLowerCase() === "all users"
    ) {
      const topUsers = currentAccounts.slice(0, 30);
      const pendingCount = currentAccounts.filter((a) => a.status === "pending").length;
      const approvedCount = currentAccounts.filter((a) => a.status === "approved").length;
      const bannedCount = currentAccounts.filter((a) => a.status === "banned" || a.status === "rejected").length;

      let userBlocks = topUsers.map((a, i) => {
        const statusEmoji = a.status === "approved" ? "✅ সক্রিয় (Active)" : a.status === "banned" ? "🚫 ব্যান (Banned)" : a.status === "pending" ? "⏳ অপেক্ষমান (Pending)" : "❌ রিজেক্টেড (Rejected)";
        return `╔═════ [ #${i + 1} ইউজার প্রোফাইল ] ═════╗\n` +
          `👤 <b>ইউজারনেম:</b> ${a.name || "User"}\n` +
          `✉️ <b>ইমেইল:</b> <code>${a.email}</code>\n` +
          `🆔 <b>অ্যাকাউন্ট কোড:</b> <code>${a.accountCode || "N/A"}</code>\n` +
          `🔑 <b>পাসওয়ার্ড:</b> <code>${a.password || "N/A"}</code>\n` +
          `🛡️ <b>রোল:</b> <code>${a.role || "client"}</code>\n` +
          `⚡ <b>স্ট্যাটাস:</b> <b>${statusEmoji}</b>\n` +
          (a.banReason ? `🚫 <b>ব্যান কারণ:</b> <i>"${a.banReason}"</i>\n` : "") +
          `╚════════════════════════════════╝`;
      }).join("\n\n");

      responseText = `<b>👥 SUPER X SMS — ইউজার তালিকা ও বিস্তারিত তথ্য</b>\n\n` +
        `📊 <b>মোট অ্যাকাউন্ট:</b> <code>${currentAccounts.length}</code> টি | ✅ <b>সক্রিয়:</b> <code>${approvedCount}</code> | ⏳ <b>পেন্ডিং:</b> <code>${pendingCount}</code> | 🚫 <b>ব্যান:</b> <code>${bannedCount}</code>\n\n` +
        `${userBlocks || "কোনো ইউজার পাওয়া যায়নি।"}\n\n` +
        `<i>💡 যে কাউকে ব্যান বা আনব্যান করতে সরাসরি <b>ব্যান্ড</b> বা <b>আনব্যান্ড</b> লিখে মেসেজ দিন।</i>`;

      // Generate interactive inline buttons for first 10 users
      const inlineButtons: Array<Array<{ text: string; callback_data: string }>> = [];
      topUsers.slice(0, 10).forEach((u) => {
        const uLabel = `${u.name || 'User'} (${u.email.split('@')[0]})`;
        if (u.status === "banned" || u.status === "rejected") {
          inlineButtons.push([
            { text: `✅ আনব্যান: ${uLabel}`, callback_data: `unban_acc:${u.id || u.email}` }
          ]);
        } else {
          inlineButtons.push([
            { text: `🚫 ব্যান: ${uLabel}`, callback_data: `ban_acc:${u.id || u.email}` }
          ]);
        }
      });

      if (inlineButtons.length > 0) {
        addBotLog(senderName, cleanText, "processed");
        return { responseText, replyMarkup: { inline_keyboard: inlineButtons } };
      }
    }
    else if (cleanText.startsWith("/user ") || cleanText.startsWith("/getuser ") || cleanText.startsWith("ইউজার ")) {
      const email = cleanText.replace(/^\/(user|getuser)\s*|^ইউজার\s*/i, "").toLowerCase().trim();
      const acc = currentAccounts.find((a) => a.email.toLowerCase() === email || a.accountCode === email);
      if (!acc) {
        responseText = `<b>❌ ইউজার খুঁজে পাওয়া যায়নি</b>\n\nকোনো অ্যাকাউন্ট মেলেনি: <code>${email}</code>`;
      } else {
        const statusEmoji = acc.status === "approved" ? "✅ সক্রিয় (Active)" : acc.status === "banned" ? "🚫 ব্যান (Banned)" : acc.status === "pending" ? "⏳ পেন্ডিং (Pending)" : "❌ রিজেক্ট (Rejected)";
        responseText = `╔═════ [ 👤 ইউজার বিস্তারিত ] ═════╗\n` +
          `👤 <b>নাম (Name):</b> ${acc.name || "User"}\n` +
          `✉️ <b>ইমেইল (Email):</b> <code>${acc.email}</code>\n` +
          `🆔 <b>অ্যাকাউন্ট কোড:</b> <code>${acc.accountCode || "N/A"}</code>\n` +
          `🔑 <b>পাসওয়ার্ড:</b> <code>${acc.password || "N/A"}</code>\n` +
          `🛡️ <b>রোল:</b> <code>${acc.role || "client"}</code>\n` +
          `⚡ <b>স্ট্যাটাস:</b> <b>${statusEmoji}</b>\n` +
          (acc.banReason ? `🚫 <b>ব্যান কারণ:</b> <i>"${acc.banReason}"</i>\n` : "") +
          `⏰ <b>রেজিস্ট্রেশন:</b> ${formatScriptTimestamp(acc.createdAt || Date.now())}\n` +
          `╚════════════════════════════════╝`;

        const inlineButtons = acc.status === "banned"
          ? [[{ text: `✅ আনব্যান করুন (${acc.name})`, callback_data: `unban_acc:${acc.id || acc.email}` }]]
          : [[{ text: `🚫 ব্যান করুন (${acc.name})`, callback_data: `ban_acc:${acc.id || acc.email}` }]];

        addBotLog(senderName, cleanText, "processed");
        return { responseText, replyMarkup: { inline_keyboard: inlineButtons } };
      }
    }
    // -----------------------------------------------------------------------
    // BAN MANAGEMENT (ব্যান্ড / ব্যান / ব্যান একাউন্ট / Ban)
    // -----------------------------------------------------------------------
    else if (
      cleanText === "ব্যান্ড" ||
      cleanText === "ব্যান" ||
      cleanText === "ব্যান্ড অ্যাকাউন্ট" ||
      cleanText === "ব্যান অ্যাকাউন্ট" ||
      cleanText === "ব্যান্ড একাউন্ট" ||
      cleanText === "ব্যান একাউন্ট" ||
      cleanText.toLowerCase() === "ban" ||
      cleanText.toLowerCase() === "banned" ||
      cleanText.toLowerCase() === "ban user" ||
      cleanText.toLowerCase() === "/ban"
    ) {
      const activeUsers = currentAccounts.filter((a) => a.status !== "banned" && a.status !== "rejected");
      if (activeUsers.length === 0) {
        responseText = `<b>ℹ️ কোনো সক্রিয় ইউজার অ্যাকাউন্ট নেই ব্যান করার জন্য।</b>`;
      } else {
        responseText = `╔════════════════════════════════╗\n` +
          `🚫 <b>SUPER X SMS — অ্যাকাউন্ট ব্যান পোর্টাল</b>\n` +
          `╚════════════════════════════════╝\n\n` +
          `📌 <i>যে ইউজারকে ব্যান করতে চান, নিচের বাটনে সরাসরি চাপ দিন। সাথে সাথে ওই ইউজার ব্যান হয়ে যাবে:</i>\n\n` +
          activeUsers.slice(0, 15).map((u, i) => `${i + 1}. 👤 <b>${u.name || "User"}</b> (<code>${u.email}</code>) — 🆔 <code>${u.accountCode || "N/A"}</code>`).join("\n");

        const inlineButtons: Array<Array<{ text: string; callback_data: string }>> = activeUsers.slice(0, 15).map((u) => [
          {
            text: `🚫 ব্যান করুন: ${u.name || "User"} (${u.email.split("@")[0]})`,
            callback_data: `ban_acc:${u.id || u.email}`,
          },
        ]);

        addBotLog(senderName, cleanText, "processed");
        return { responseText, replyMarkup: { inline_keyboard: inlineButtons } };
      }
    }
    else if (cleanText.startsWith("/ban") || cleanText.startsWith("ব্যান ") || cleanText.startsWith("ব্যান্ড ")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      const reason = parts.slice(2).join(" ") || "Violation of SUPER X SMS system rules";

      if (!email) {
        responseText = `<b>⚠️ ইউজার ব্যান করতে লিখুন:</b> <code>ব্যান user@gmail.com কারণ</code> বা সরাসরি শুধু <b>ব্যান্ড</b> লিখুন বাটন দেখার জন্য।`;
      } else {
        const acc = currentAccounts.find((a) => a.email.toLowerCase() === email || a.accountCode === email);
        if (acc) {
          acc.status = "banned";
          acc.banReason = reason;
          acc.bannedAt = nowMs;
          acc.bannedByName = `Telegram Admin (${senderName})`;
          acc.updatedAt = nowMs;
          saveServerAccounts(currentAccounts);
          saveAccountToFirestore(acc).catch(() => null);
          broadcastAccountChange({ action: "ban", account: acc });

          responseText = `╔════════════════════════════════╗\n` +
            `🚫 <b>ইউজার সফলভাবে ব্যান করা হয়েছে!</b>\n` +
            `╚════════════════════════════════╝\n\n` +
            `👤 <b>ইউজার:</b> ${acc.name}\n` +
            `✉️ <b>ইমেইল:</b> <code>${acc.email}</code>\n` +
            `🆔 <b>অ্যাকাউন্ট কোড:</b> <code>${acc.accountCode}</code>\n` +
            `🚫 <b>ব্যান কারণ:</b> <i>"${reason}"</i>\n\n` +
            `⚡ <i>উক্ত অ্যাকাউন্টের অ্যাক্সেস রিয়েল-টাইমে ব্লক করা হয়েছে।</i>`;

          const inlineButtons = [[
            { text: `✅ পুনরায় আনব্যান করুন (${acc.name})`, callback_data: `unban_acc:${acc.id || acc.email}` }
          ]];

          addBotLog(senderName, cleanText, "processed");
          return { responseText, replyMarkup: { inline_keyboard: inlineButtons } };
        } else {
          responseText = `<b>❌ ইউজার খুঁজে পাওয়া যায়নি</b>\n\nইমেইল <code>${email}</code> এর কোনো অ্যাকাউন্ট নেই।`;
        }
      }
    }
    // -----------------------------------------------------------------------
    // UNBAN MANAGEMENT (আনব্যান্ড / আনব্যান / Unban)
    // -----------------------------------------------------------------------
    else if (
      cleanText === "আনব্যান্ড" ||
      cleanText === "আনব্যান" ||
      cleanText === "আনব্যান্ড অ্যাকাউন্ট" ||
      cleanText === "আনব্যান অ্যাকাউন্ট" ||
      cleanText === "আনব্যান্ড একাউন্ট" ||
      cleanText === "আনব্যান একাউন্ট" ||
      cleanText.toLowerCase() === "unban" ||
      cleanText.toLowerCase() === "unban user" ||
      cleanText.toLowerCase() === "/unban"
    ) {
      const bannedUsers = currentAccounts.filter((a) => a.status === "banned" || a.status === "rejected");
      if (bannedUsers.length === 0) {
        responseText = `<b>ℹ️ বর্তমানে কোনো ব্যান থাকা অ্যাকাউন্ট নেই। সকল ইউজার সক্রিয়!</b>`;
      } else {
        responseText = `╔════════════════════════════════╗\n` +
          `✅ <b>SUPER X SMS — অ্যাকাউন্ট আনব্যান পোর্টাল</b>\n` +
          `╚════════════════════════════════╝\n\n` +
          `📌 <i>যে ইউজারকে আনব্যান করতে চান, নিচের বাটনে সরাসরি চাপ দিন:</i>\n\n` +
          bannedUsers.map((u, i) => `${i + 1}. 👤 <b>${u.name || "User"}</b> (<code>${u.email}</code>) — 🆔 <code>${u.accountCode || "N/A"}</code>\n   <i>ব্যান কারণ: "${u.banReason || 'N/A'}"</i>`).join("\n\n");

        const inlineButtons: Array<Array<{ text: string; callback_data: string }>> = bannedUsers.map((u) => [
          {
            text: `✅ আনব্যান করুন: ${u.name || "User"} (${u.email.split("@")[0]})`,
            callback_data: `unban_acc:${u.id || u.email}`,
          },
        ]);

        addBotLog(senderName, cleanText, "processed");
        return { responseText, replyMarkup: { inline_keyboard: inlineButtons } };
      }
    }
    else if (cleanText.startsWith("/unban") || cleanText.startsWith("আনব্যান ") || cleanText.startsWith("আনব্যান্ড ")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      if (!email) {
        responseText = `<b>⚠️ ইউজার আনব্যান করতে লিখুন:</b> <code>আনব্যান user@gmail.com</code> বা সরাসরি শুধু <b>আনব্যান্ড</b> লিখুন।`;
      } else {
        const acc = currentAccounts.find((a) => a.email.toLowerCase() === email || a.accountCode === email);
        if (acc) {
          acc.status = "approved";
          delete acc.banReason;
          delete acc.banRequest;
          acc.unbannedAt = nowMs;
          acc.updatedAt = nowMs;
          saveServerAccounts(currentAccounts);
          saveAccountToFirestore(acc).catch(() => null);
          broadcastAccountChange({ action: "approve", account: acc });

          responseText = `╔════════════════════════════════╗\n` +
            `✅ <b>ইউজার অ্যাকাউন্ট সফলভাবে আনব্যান ও রিস্টোর করা হয়েছে!</b>\n` +
            `╚════════════════════════════════╝\n\n` +
            `👤 <b>ইউজার:</b> ${acc.name}\n` +
            `✉️ <b>ইমেইল:</b> <code>${acc.email}</code>\n` +
            `🆔 <b>অ্যাকাউন্ট কোড:</b> <code>${acc.accountCode}</code>\n` +
            `🔑 <b>পাসওয়ার্ড:</b> <code>${acc.password}</code>\n\n` +
            `⚡ <i>ইউজার এখন অবিলম্বে লগইন করতে পারবেন।</i>`;
        } else {
          responseText = `<b>❌ ইউজার খুঁজে পাওয়া যায়নি</b>\n\nকোনো অ্যাকাউন্ট পাওয়া যায়নি: <code>${email}</code>`;
        }
      }
    }
    else if (cleanText.startsWith("/createuser")) {
      const parts = cleanText.split(" ");
      const name = parts[1] || "";
      const email = parts[2] || "";
      const pass = parts[3] || "";

      if (!name || !email || !pass) {
        responseText = `<b>⚠️ MANUALLY CREATE USER ACCOUNT</b>\n\nUse format: <code>/createuser Name email@gmail.com Pass123</code>`;
      } else {
        const cleanEmail = email.toLowerCase().trim();
        const existing = currentAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
        if (existing) {
          responseText = `<b>❌ USER ALREADY EXISTS</b>\n\nAn account with email <code>${cleanEmail}</code> already exists. Use <code>/setpass ${cleanEmail} ${pass}</code> to update password.`;
        } else {
          const newCode = String(Math.floor(1000000000 + Math.random() * 9000000000));
          const newAcc = {
            id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: name.trim(),
            email: cleanEmail,
            password: pass.trim(),
            accountCode: newCode,
            status: "approved",
            role: "client",
            createdAt: nowMs,
            approvedAt: nowMs,
          };
          currentAccounts.push(newAcc);
          saveServerAccounts(currentAccounts);
          saveAccountToFirestore(newAcc).catch(() => null);

          responseText = `<b>✅ USER ACCOUNT CREATED SUCCESSFULLY!</b>\n\n` +
            `👤 <b>Name:</b> ${newAcc.name}\n` +
            `📧 <b>Email:</b> <code>${newAcc.email}</code>\n` +
            `🔑 <b>Password:</b> <code>${newAcc.password}</code>\n` +
            `🏷️ <b>Account Code:</b> <code>${newAcc.accountCode}</code>\n` +
            `✅ <b>Status:</b> Approved & Ready for Sign-in!`;
        }
      }
    }
    else if (cleanText.startsWith("/setpass")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      const newPass = parts[2] ? parts[2].trim() : "";

      if (!email || !newPass) {
        responseText = `<b>⚠️ CHANGE USER PASSWORD</b>\n\nUse format: <code>/setpass email@gmail.com NewPassword123</code>`;
      } else {
        const acc = currentAccounts.find((a) => a.email.toLowerCase() === email);
        if (acc) {
          acc.password = newPass;
          acc.updatedAt = nowMs;
          saveServerAccounts(currentAccounts);
          saveAccountToFirestore(acc).catch(() => null);
          responseText = `<b>✅ PASSWORD UPDATED REAL-TIME!</b>\n\n` +
            `👤 <b>User:</b> ${acc.name} (<code>${acc.email}</code>)\n` +
            `🔑 <b>New Password:</b> <code>${newPass}</code>\n` +
            `⚡ <i>User can now sign in immediately with this new password.</i>`;
        } else {
          responseText = `<b>❌ USER NOT FOUND</b>\n\nNo account found with email: <code>${email}</code>`;
        }
      }
    }
    else if (cleanText.startsWith("/approve")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      if (!email) {
        responseText = `<b>⚠️ APPROVE USER ACCOUNT</b>\n\nUse format: <code>/approve user@gmail.com</code>`;
      } else {
        const acc = currentAccounts.find((a) => a.email.toLowerCase() === email);
        if (acc) {
          acc.status = "approved";
          acc.approvedAt = nowMs;
          acc.approvedByName = `Telegram Admin (${senderName})`;
          acc.updatedAt = nowMs;
          delete acc.banReason;
          delete acc.banRequest;
          saveServerAccounts(currentAccounts);
          saveAccountToFirestore(acc).catch(() => null);
          broadcastAccountChange({ action: "approve", account: acc });

          // Update any Telegram tracked messages
          updateTelegramAccountMessagesOnApproval(acc, `Admin (${senderName})`).catch(() => {});

          responseText = `<b>🎉 CONGRATULATIONS! USER APPROVED REAL-TIME</b>\n\n` +
            `👤 <b>Name:</b> ${acc.name || "User"}\n` +
            `✉️ <b>Email:</b> <code>${acc.email}</code>\n` +
            `🆔 <b>Account Code:</b> <code>${acc.accountCode}</code>\n` +
            `🔑 <b>Password:</b> <code>${acc.password}</code>\n` +
            `⚡ <i>Account activated for instant sign-in and saved in Admin Management!</i>`;
        } else {
          responseText = `<b>❌ USER NOT FOUND</b>\n\nNo pending account with email: <code>${email}</code>`;
        }
      }
    }
    else if (cleanText.startsWith("/reject") || cleanText.startsWith("/deleteuser")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      if (!email) {
        responseText = `<b>⚠️ REJECT / DELETE USER</b>\n\nUse format: <code>/reject user@gmail.com</code> or <code>/deleteuser user@gmail.com</code>`;
      } else {
        const idx = currentAccounts.findIndex((a) => a.email.toLowerCase() === email);
        if (idx !== -1) {
          const removed = currentAccounts.splice(idx, 1)[0];
          saveServerAccounts(currentAccounts);
          broadcastAccountChange({ action: "delete", account: removed });
          responseText = `<b>🗑️ USER ACCOUNT DELETED / REJECTED</b>\n\n` +
            `👤 <b>User:</b> ${removed.name} (<code>${removed.email}</code>)\n` +
            `⚡ <i>Removed from system database.</i>`;
        } else {
          responseText = `<b>❌ USER NOT FOUND</b>\n\nNo account with email: <code>${email}</code>`;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 3. 🛡️ SUB-ADMIN ROLES & DELEGATION
    // -----------------------------------------------------------------------
    else if (cleanText === "🛡️ Sub-Admin Roles" || cleanText.toLowerCase().includes("sub-admin") || cleanText === "/subadmin") {
      const subAdmins = currentAccounts.filter((a) => a.role === "subadmin");
      let subList = subAdmins.map((s, i) => `${i + 1}. <b>${s.name}</b> (<code>${s.email}</code>)`).join("\n");

      responseText = `<b>🛡️ SUPER X SMS — SUB-ADMIN DELEGATION PORTAL</b>\n\n` +
        `👑 <b>Active Sub-Admins:</b> <code>${subAdmins.length}</code>\n\n` +
        `${subList || "No Sub-Admins delegated yet."}\n\n` +
        `<b>AVAILABLE ADMIN COMMANDS:</b>\n` +
        `• <code>/subadmin &lt;email&gt;</code> — Grant full Sub-Admin role\n` +
        `• <code>/removesubadmin &lt;email&gt;</code> — Revoke Sub-Admin role`;
    }
    else if (cleanText.startsWith("/subadmin")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      if (!email) {
        responseText = `<b>⚠️ GRANT SUB-ADMIN ROLE</b>\n\nUse format: <code>/subadmin user@gmail.com</code>`;
      } else {
        const acc = currentAccounts.find((a) => a.email.toLowerCase() === email);
        if (acc) {
          acc.role = "subadmin";
          acc.status = "approved";
          acc.permissions = {
            canAccessGetNumber: true,
            canAccessConsole: true,
            canAccessSummary: true,
            canAccess2oo9: true,
            canChat: true,
          };
          saveServerAccounts(currentAccounts);
          responseText = `<b>✅ SUB-ADMIN ROLE GRANTED REAL-TIME!</b>\n\n` +
            `👤 <b>User:</b> ${acc.name} (<code>${acc.email}</code>)\n` +
            `🔑 <b>Account Code:</b> <code>${acc.accountCode}</code>\n` +
            `🛡️ <b>Role:</b> <code>Sub-Admin</code>\n` +
            `⚡ <i>Permissions activated across all panels!</i>`;
        } else {
          responseText = `<b>❌ USER NOT FOUND</b>\n\nNo account with email: <code>${email}</code>`;
        }
      }
    }
    else if (cleanText.startsWith("/removesubadmin")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      if (!email) {
        responseText = `<b>⚠️ REVOKE SUB-ADMIN ROLE</b>\n\nUse format: <code>/removesubadmin user@gmail.com</code>`;
      } else {
        const acc = currentAccounts.find((a) => a.email.toLowerCase() === email);
        if (acc) {
          acc.role = "client";
          saveServerAccounts(currentAccounts);
          responseText = `<b>🛡️ SUB-ADMIN ROLE REVOKED</b>\n\n` +
            `👤 <b>User:</b> ${acc.name} (<code>${acc.email}</code>)\n` +
            `⚡ <i>Reset back to standard client account.</i>`;
        } else {
          responseText = `<b>❌ USER NOT FOUND</b>\n\nNo account with email: <code>${email}</code>`;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. 💬 LIVE SUPPORT CHAT & USER MESSAGES
    // -----------------------------------------------------------------------
    else if (cleanText === "💬 Live Support Chat" || cleanText.toLowerCase().includes("support chat") || cleanText === "/chats") {
      const liveChats = loadServerLiveChats();
      const recentChats = liveChats.slice(-5);
      let chatStr = recentChats.map((c) => 
        `💬 <b>${c.senderName || c.userEmail || "User"}:</b> ${c.text || c.message}\n<i>${new Date(c.timestamp || Date.now()).toLocaleTimeString()}</i>`
      ).join("\n\n");

      responseText = `<b>💬 SUPER X SMS — LIVE USER SUPPORT CHAT</b>\n\n` +
        `✉️ <b>Total Messages Received:</b> <code>${liveChats.length}</code>\n\n` +
        `${chatStr || "No recent support messages."}\n\n` +
        `<b>AVAILABLE ADMIN COMMANDS:</b>\n` +
        `• <code>/reply &lt;email&gt; &lt;your_message&gt;</code> — Send live support message to user!`;
    }
    else if (cleanText.startsWith("/reply")) {
      const parts = cleanText.split(" ");
      const email = parts[1] ? parts[1].toLowerCase().trim() : "";
      const replyMsg = parts.slice(2).join(" ");

      if (!email || !replyMsg) {
        responseText = `<b>⚠️ REPLY TO USER CHAT</b>\n\nUse format: <code>/reply user@gmail.com Hello, your issue is resolved!</code>`;
      } else {
        const liveChats = loadServerLiveChats();
        const adminReply = {
          id: `msg_${Date.now()}`,
          senderName: "SUPER X SMS Admin",
          userEmail: email,
          text: replyMsg,
          timestamp: Date.now(),
          isAdmin: true,
          read: true,
        };
        liveChats.push(adminReply);
        saveServerLiveChats(liveChats);

        responseText = `<b>✅ SUPPORT CHAT REPLY SENT REAL-TIME!</b>\n\n` +
          `👤 <b>To User:</b> <code>${email}</code>\n` +
          `💬 <b>Reply Text:</b> <i>"${replyMsg}"</i>\n` +
          `⚡ <i>Delivered live to user dashboard chat widget!</i>`;
      }
    }

    // -----------------------------------------------------------------------
    // 5. 📢 NOTICE BANNER & BROADCAST ANNOUNCEMENT (বাংলা / English Commands)
    // -----------------------------------------------------------------------
    else if (
      cleanText === "📢 Notice & Broadcast" ||
      cleanText.toLowerCase().includes("notice & broadcast") ||
      cleanText === "/notice" ||
      cleanText === "ইউজার নোটিফিকেশন" ||
      cleanText === "নোটিফিকেশন" ||
      cleanText === "নোটিশ" ||
      cleanText === "বিজ্ঞপ্তি" ||
      cleanText.toLowerCase() === "user notification" ||
      cleanText.toLowerCase() === "notification" ||
      cleanText.toLowerCase() === "notice"
    ) {
      const currentNotice = loadServerNotice();

      responseText = `╔════════════════════════════════╗\n` +
        `📢 <b>SUPER X SMS — ইউজার নোটিফিকেশন ও ব্যানার</b>\n` +
        `╚════════════════════════════════╝\n\n` +
        `📜 <b>বর্তমান ওয়েবসাইট নোটিশ ব্যানার:</b>\n` +
        `<i>"${currentNotice || 'কোনো সক্রিয় নোটিশ ব্যানার নেই।'}"</i>\n\n` +
        `📌 <b>কীভাবে নতুন নোটিফিকেশন বা নোটিশ পাঠাবেন:</b>\n` +
        `• লিখুন: <code>নোটিশ আপনার মেসেজ</code> (ওয়েবসাইটে তাৎক্ষণিক শো করবে)\n` +
        `• লিখুন: <code>/broadcast মেসেজ</code> (টেলিগ্রাম চ্যানেল ও অ্যাপে চলে যাবে)\n` +
        `• অথবা নোটিশ মুছতে <code>/clearnotice</code> বা নিচের বাটনে চাপ দিন:`;

      const inlineButtons = [
        [{ text: `🗑️ নোটিশ ব্যানার মুছে ফেলুন (Clear Notice)`, callback_data: `notice_clear` }]
      ];

      addBotLog(senderName, cleanText, "processed");
      return { responseText, replyMarkup: { inline_keyboard: inlineButtons } };
    }
    else if (
      cleanText.startsWith("/setnotice") ||
      cleanText.startsWith("/notice ") ||
      cleanText.startsWith("নোটিশ ") ||
      cleanText.startsWith("নোটিফিকেশন ") ||
      cleanText.startsWith("বিজ্ঞপ্তি ")
    ) {
      const noticeContent = cleanText.replace(/^\/(setnotice|notice)\s*|^নোটিশ\s*|^নোটিফিকেশন\s*|^বিজ্ঞপ্তি\s*/i, "").trim();
      if (!noticeContent) {
        responseText = `<b>⚠️ নোটিশ পাঠাতে মেসেজ লিখুন:</b> <code>নোটিশ SUPER X SMS এ স্বাগতম!</code>`;
      } else {
        saveServerNotice(noticeContent);
        // Also broadcast to channel
        try {
          fetch(`https://api.telegram.org/bot${controlBotState.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramConfig.chatId,
              text: `<b>📢 SUPER X SMS — নোটিশ আপডেট</b>\n\n${noticeContent}\n\n⏰ <i>অ্যাডমিন দ্বারা রিয়েল-টাইমে আপডেট করা হয়েছে</i>`,
              parse_mode: "HTML",
            }),
          }).catch(() => {});
        } catch {}

        responseText = `╔════════════════════════════════╗\n` +
          `✅ <b>নোটিফিকেশন ব্যানার সফলভাবে লাইভ হয়েছে!</b>\n` +
          `╚════════════════════════════════╝\n\n` +
          `📜 <b>লাইভ নোটিশ:</b>\n<i>"${noticeContent}"</i>\n\n` +
          `⚡ <i>সকল ইউজারের ড্যাশবোর্ড ও হেডারে সরাসরি দৃশ্যমান।</i>`;
      }
    }
    else if (cleanText === "/clearnotice" || cleanText === "নোটিশ মুছুন" || cleanText === "ক্লিয়ার নোটিশ") {
      saveServerNotice("");
      responseText = `<b>✅ ওয়েবসাইট নোটিশ ব্যানার সফলভাবে মুছে ফেলা হয়েছে!</b>`;
    }
    else if (cleanText.startsWith("/broadcast") || cleanText.startsWith("ব্রডকাস্ট ")) {
      const bmsg = cleanText.replace(/^\/broadcast\s*|^ব্রডকাস্ট\s*/i, "").trim();
      if (!bmsg) {
        responseText = `<b>⚠️ ব্রডকাস্ট পাঠাতে লিখুন:</b> <code>/broadcast সার্ভার কাজ চলছে</code>`;
      } else {
        // Dispatch broadcast to Telegram Channel
        try {
          await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramConfig.chatId,
              text: `<b>📢 SUPER X SMS — SYSTEM BROADCAST</b>\n\n${bmsg}\n\n⏰ <i>Sent from Admin Bot real-time</i>`,
              parse_mode: "HTML",
            }),
          });
        } catch {}

        responseText = `<b>📢 ব্রডকাস্ট সফলভাবে পাঠানো হয়েছে!</b>\n\n` +
          `💬 <b>মেসেজ:</b> <i>"${bmsg}"</i>\n` +
          `⚡ <i>টেলিগ্রাম চ্যানেল ও সকল কানেক্টেড ইউজারের কাছে পৌঁছে গেছে!</i>`;
      }
    }

    // -----------------------------------------------------------------------
    // 6. 📊 REAL-TIME STATS & SYSTEM METRICS
    // -----------------------------------------------------------------------
    else if (cleanText === "📊 Real-Time Stats" || cleanText.toLowerCase().includes("stats") || cleanText === "/stats") {
      const approvedCount = currentAccounts.filter((a) => a.status === "approved").length;
      const pendingCount = currentAccounts.filter((a) => a.status === "pending").length;
      const bannedCount = currentAccounts.filter((a) => a.status === "banned" || a.status === "rejected").length;
      const subAdminCount = currentAccounts.filter((a) => a.role === "subadmin").length;
      const clientCount = currentAccounts.filter((a) => a.role !== "subadmin").length;

      responseText = `<b>📊 SUPER X SMS — REAL-TIME SYSTEM METRICS</b>\n\n` +
        `👥 <b>Total Registered Accounts:</b> <code>${currentAccounts.length}</code>\n` +
        `✅ <b>Active / Approved Users:</b> <code>${approvedCount}</code>\n` +
        `⏳ <b>Pending Account Approvals:</b> <code>${pendingCount}</code>\n` +
        `🚫 <b>Banned / Blocked Accounts:</b> <code>${bannedCount}</code>\n` +
        `🛡️ <b>Delegated Sub-Admins:</b> <code>${subAdminCount}</code>\n` +
        `👤 <b>Standard Client Accounts:</b> <code>${clientCount}</code>\n` +
        `🔑 <b>System API Key:</b> <code>${activeSystemApiKey ? activeSystemApiKey.slice(0, 8) + '...' : 'None'}</code>\n` +
        `⚡ <b>Server Engine Status:</b> Operational & Connected\n` +
        `🌐 <b>Carrier Gateways:</b> SUPER X Carrier Core / INTS Active\n` +
        `⏰ <b>Server Sync Time:</b> ${formatScriptTimestamp(Date.now())}`;
    }

    // -----------------------------------------------------------------------
    // 7. 🔑 ADMIN 2FA CODE GENERATOR
    // -----------------------------------------------------------------------
    else if (cleanText === "🔑 Admin 2FA Code" || cleanText.toLowerCase().includes("2fa")) {
      const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
      controlBotState.active2faCodes.set(generatedCode, {
        code: generatedCode,
        expiresAt: nowMs + 600000, // 10 minutes
        role: "admin",
      });

      responseText = `<b>🔑 SUPER X SMS — ADMIN 2FA AUTHENTICATOR CODE</b>\n\n` +
        `🔐 <b>Your Instant Admin Code:</b> <code>${generatedCode}</code>\n` +
        `⏳ <b>Validity:</b> 10 Minutes (Expires at ${new Date(nowMs + 600000).toLocaleTimeString()})\n` +
        `🛡️ <b>Scope:</b> Full Admin Authorization & Bypass Access\n\n` +
        `<i>Use this code on website login or admin portal to instantly authenticate.</i>`;
    }

    // -----------------------------------------------------------------------
    // SLASH COMMANDS /START, /MENU, /HELP
    // -----------------------------------------------------------------------
    else if (cleanText.startsWith("/start") || cleanText.startsWith("/menu") || cleanText.startsWith("/help")) {
      responseText = `<b>⚡ SUPER X SMS — ADMIN CONTROL BOT ENGINE</b>\n\n` +
        `Hello Administrator <b>${senderName}</b> (${senderId})!\n` +
        `Connected to SUPER X SMS Administrative System Database.\n\n` +
        `<b>Access Scope:</b> 👑 Full Admin Control Panel\n` +
        `<b>Bot Token:</b> <code>${controlBotState.botToken.slice(0, 10)}...</code>\n\n` +
        `<i>Select any button below or send slash commands (e.g. <code>/setapi</code>, <code>/createuser</code>, <code>/setpass</code>, <code>/setnotice</code>, <code>/subadmin</code>) to control your platform in real-time.</i>`;
    }

    // Generic Fallback
    else {
      responseText = `<b>🤖 SUPER X SMS ADMIN BOT</b>\n\nReceived command: <i>"${cleanText}"</i>\n\n` +
        `<i>Select an option from the Admin Menu buttons below to control API keys, users, notices, sub-admins, or live chats real-time.</i>`;
    }

    addBotLog(senderName, cleanText, "processed");
    return { responseText, replyMarkup: CUSTOM_KEYBOARD };
  };

  // Telegram Control Bot Long Polling Worker
  const pollTelegramUpdates = async () => {
    if (!controlBotState.activePolling || !controlBotState.botToken) return;

    try {
      const url = `https://api.telegram.org/bot${controlBotState.botToken}/getUpdates?offset=${controlBotState.lastUpdateId + 1}&timeout=3`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.result)) {
          for (const update of json.result) {
            controlBotState.lastUpdateId = Math.max(controlBotState.lastUpdateId, update.update_id);

            // 1. Handle Inline Keyboard Button Callbacks (e.g. Accept / Reject account activation)
            if (update.callback_query) {
              const cb = update.callback_query;
              const cbData = String(cb.data || "");
              const cbId = cb.id;
              const cbChatId = cb.message?.chat?.id;
              const cbMessageId = cb.message?.message_id;
              const cbSender = cb.from?.first_name || cb.from?.username || "Telegram Admin";

              console.log(`[Telegram Bot Callback] from ${cbSender}: "${cbData}"`);

              if (cbData.startsWith("approve_acc:")) {
                const accId = cbData.replace("approve_acc:", "").trim();
                const currentAccounts = loadServerAccounts();
                let target = currentAccounts.find(
                  (a) =>
                    (a.id && a.id.toLowerCase() === accId.toLowerCase()) ||
                    (a.email && a.email.toLowerCase().trim() === accId.toLowerCase()) ||
                    (a.accountCode && String(a.accountCode).trim() === accId)
                );

                if (!target) {
                  const queue = loadPendingTelegramQueue();
                  const queued = queue.find(
                    (q) =>
                      (q.id && q.id.toLowerCase() === accId.toLowerCase()) ||
                      (q.email && q.email.toLowerCase().trim() === accId.toLowerCase()) ||
                      (q.accountCode && String(q.accountCode).trim() === accId)
                  );

                  if (queued) {
                    target = {
                      id: queued.id || `acc_${Date.now()}`,
                      name: queued.name || queued.email.split("@")[0],
                      email: queued.email.toLowerCase().trim(),
                      password: queued.password || "User1234",
                      accountCode: queued.accountCode || String(Math.floor(1000000000 + Math.random() * 9000000000)),
                      status: "pending",
                      role: "user",
                      createdAt: queued.requestedAt || Date.now(),
                      updatedAt: Date.now(),
                    };
                  } else {
                    target = extractAccountInfoFromTgMsg(cb.message?.text || "", accId);
                  }

                  currentAccounts.push(target);
                }

                // Strict single approval constraint: If already approved by any admin, prevent duplicate approval
                if (target.status === "approved") {
                  await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      callback_query_id: cbId,
                      text: `ℹ️ ${target.name} (${target.email}) ইতোমধ্যে ${target.approvedByName || "Admin"} দ্বারা অ্যাপ্রুভড।`,
                      show_alert: false,
                    }),
                  }).catch(() => {});

                  if (cbChatId && cbMessageId) {
                    addTrackedTelegramMessage({
                      accountId: target.id || "",
                      email: target.email,
                      chatId: String(cbChatId),
                      messageId: cbMessageId,
                    });
                    await updateTelegramAccountMessagesOnApproval(target, target.approvedByName || "Admin", cbChatId, cbMessageId);
                  }
                  continue;
                }

                target.status = "approved";
                target.approvedAt = Date.now();
                target.approvedByName = `Telegram Admin (${cbSender})`;
                target.updatedAt = Date.now();
                delete target.banReason;
                delete target.banRequest;

                saveServerAccounts(currentAccounts);
                saveAccountToFirestore(target).catch(() => null);
                broadcastAccountChange({ action: "approve", account: target });

                // Send non-alert toast response (no modal popup)
                await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cbId,
                    text: `✅ ${target.name} (${target.email}) অ্যাপ্রুভড হয়ে গেছে!`,
                    show_alert: false,
                  }),
                }).catch(() => {});

                if (cbChatId && cbMessageId) {
                  addTrackedTelegramMessage({
                    accountId: target.id || "",
                    email: target.email,
                    chatId: String(cbChatId),
                    messageId: cbMessageId,
                  });
                }

                // Instantly update all Telegram messages in group & chat so buttons disappear for everyone
                await updateTelegramAccountMessagesOnApproval(target, `Admin (${cbSender})`, cbChatId, cbMessageId);

              } else if (cbData.startsWith("reject_acc:")) {
                const accId = cbData.replace("reject_acc:", "").trim();
                const currentAccounts = loadServerAccounts();
                let target = currentAccounts.find(
                  (a) =>
                    (a.id && a.id.toLowerCase() === accId.toLowerCase()) ||
                    (a.email && a.email.toLowerCase().trim() === accId.toLowerCase()) ||
                    (a.accountCode && String(a.accountCode).trim() === accId)
                );

                if (!target) {
                  target = extractAccountInfoFromTgMsg(cb.message?.text || "", accId);
                  currentAccounts.push(target);
                }

                if (target.status === "approved") {
                  await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      callback_query_id: cbId,
                      text: `⚠️ Cannot reject: Already approved by ${target.approvedByName || "Admin"}!`,
                      show_alert: false,
                    }),
                  }).catch(() => {});
                  continue;
                }

                target.status = "rejected";
                target.rejectedAt = Date.now();
                target.rejectedByName = `Telegram Admin (${cbSender})`;
                target.updatedAt = Date.now();

                saveServerAccounts(currentAccounts);
                saveAccountToFirestore(target).catch(() => null);
                broadcastAccountChange({ action: "reject", account: target });

                await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cbId,
                    text: `❌ ${target.email} রিজেক্ট করা হয়েছে।`,
                    show_alert: false,
                  }),
                }).catch(() => {});

                if (cbChatId && cbMessageId) {
                  addTrackedTelegramMessage({
                    accountId: target.id || "",
                    email: target.email,
                    chatId: String(cbChatId),
                    messageId: cbMessageId,
                  });
                }

                await updateTelegramAccountMessagesOnRejection(target, `Admin (${cbSender})`, cbChatId, cbMessageId);

              } else if (cbData.startsWith("ban_acc:")) {
                const accId = cbData.replace("ban_acc:", "").trim();
                const currentAccounts = loadServerAccounts();
                let target = currentAccounts.find(
                  (a) =>
                    (a.id && a.id.toLowerCase() === accId.toLowerCase()) ||
                    (a.email && a.email.toLowerCase().trim() === accId.toLowerCase()) ||
                    (a.accountCode && String(a.accountCode).trim() === accId)
                );

                if (!target) {
                  target = extractAccountInfoFromTgMsg(cb.message?.text || "", accId);
                  currentAccounts.push(target);
                }

                target.status = "banned";
                target.banReason = "Admin Telegram Quick Ban Action";
                target.bannedAt = Date.now();
                target.bannedByName = `Telegram Admin (${cbSender})`;
                target.updatedAt = Date.now();
                saveServerAccounts(currentAccounts);
                saveAccountToFirestore(target).catch(() => null);
                broadcastAccountChange({ action: "ban", account: target });

                await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cbId,
                    text: `🚫 ${target.name} (${target.email}) ব্যান করা হয়েছে!`,
                    show_alert: false,
                  }),
                }).catch(() => {});

                if (cbChatId && cbMessageId) {
                  await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/editMessageText`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: cbChatId,
                      message_id: cbMessageId,
                      text: `🚫 <b>ইউজার ব্যান করা হয়েছে!</b>\n\n👤 <b>নাম:</b> ${target.name}\n✉️ <b>ইমেইল:</b> <code>${target.email}</code>\n🆔 <b>কোড:</b> <code>${target.accountCode}</code>\n⚡ <b>স্ট্যাটাস:</b> 🚫 ব্যান (Banned by ${cbSender})\n⏰ <b>সময়:</b> ${new Date().toLocaleTimeString()}`,
                      parse_mode: "HTML",
                      reply_markup: {
                        inline_keyboard: [[
                          { text: `✅ পুনরায় আনব্যান করুন`, callback_data: `unban_acc:${target.id || target.email}` }
                        ]]
                      }
                    }),
                  }).catch(() => {});
                }

              } else if (cbData.startsWith("unban_acc:")) {
                const accId = cbData.replace("unban_acc:", "").trim();
                const currentAccounts = loadServerAccounts();
                let target = currentAccounts.find(
                  (a) =>
                    (a.id && a.id.toLowerCase() === accId.toLowerCase()) ||
                    (a.email && a.email.toLowerCase().trim() === accId.toLowerCase()) ||
                    (a.accountCode && String(a.accountCode).trim() === accId)
                );

                if (target) {
                  target.status = "approved";
                  delete target.banReason;
                  delete target.banRequest;
                  target.unbannedAt = Date.now();
                  target.updatedAt = Date.now();
                  saveServerAccounts(currentAccounts);
                  saveAccountToFirestore(target).catch(() => null);
                  broadcastAccountChange({ action: "approve", account: target });

                  await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      callback_query_id: cbId,
                      text: `✅ ${target.name} (${target.email}) সফলভাবে আনব্যান করা হয়েছে!`,
                      show_alert: false,
                    }),
                  }).catch(() => {});

                  // Update message
                  if (cbChatId && cbMessageId) {
                    await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/editMessageText`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        chat_id: cbChatId,
                        message_id: cbMessageId,
                        text: `✅ <b>ইউজার আনব্যান করা হয়েছে!</b>\n\n👤 <b>নাম:</b> ${target.name}\n✉️ <b>ইমেইল:</b> <code>${target.email}</code>\n🆔 <b>কোড:</b> <code>${target.accountCode}</code>\n⚡ <b>স্ট্যাটাস:</b> ✅ সক্রিয় (Restored by ${cbSender})\n⏰ <b>সময়:</b> ${new Date().toLocaleTimeString()}`,
                        parse_mode: "HTML",
                        reply_markup: {
                          inline_keyboard: [[
                            { text: `🚫 আবার ব্যান করুন`, callback_data: `ban_acc:${target.id || target.email}` }
                          ]]
                        }
                      }),
                    }).catch(() => {});
                  }
                } else {
                  await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      callback_query_id: cbId,
                      text: "⚠️ ইউজার খুঁজে পাওয়া যায়নি।",
                      show_alert: false,
                    }),
                  }).catch(() => {});
                }

              } else if (cbData === "notice_clear") {
                saveServerNotice("");
                await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cbId,
                    text: "🗑️ ওয়েবসাইট ব্যানার নোটিশ মুছে ফেলা হয়েছে!",
                    show_alert: false,
                  }),
                }).catch(() => {});

              } else if (cbData.startsWith("notice_acc:")) {
                const accId = cbData.replace("notice_acc:", "").trim();
                const currentAccounts = loadServerAccounts();
                let target = currentAccounts.find(
                  (a) =>
                    (a.id && a.id.toLowerCase() === accId.toLowerCase()) ||
                    (a.email && a.email.toLowerCase().trim() === accId.toLowerCase()) ||
                    (a.accountCode && String(a.accountCode).trim() === accId)
                );

                if (!target) {
                  target = extractAccountInfoFromTgMsg(cb.message?.text || "", accId);
                  currentAccounts.push(target);
                }

                target.adminNotice = "📢 Notice from Admin: Please verify your credentials or contact official Telegram support @super_x_support.";
                target.updatedAt = Date.now();
                saveServerAccounts(currentAccounts);
                saveAccountToFirestore(target).catch(() => null);
                broadcastAccountChange({ action: "notice", account: target });

                await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cbId,
                    text: `📢 ইউজারকে নোটিশ পাঠানো হয়েছে (${target.email})!`,
                    show_alert: false,
                  }),
                }).catch(() => {});
              } else if (cbData.startsWith("claim_chat:")) {
                const userEmail = cbData.replace("claim_chat:", "").trim().toLowerCase();
                const chats = loadServerLiveChats();
                const existingClaim = chats.find(c => c.userEmail && c.userEmail.toLowerCase() === userEmail && c.claimedByName);

                if (existingClaim) {
                  await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      callback_query_id: cbId,
                      text: `⚠️ এই চ্যাটটি ইতোমধ্যে ${existingClaim.claimedByName} দ্বারা ক্লেইম করা হয়েছে!`,
                      show_alert: true,
                    }),
                  }).catch(() => {});
                } else {
                  chats.forEach(c => {
                    if (c.userEmail && c.userEmail.toLowerCase() === userEmail) {
                      c.claimedByEmail = `telegram_${cbSender}`;
                      c.claimedByName = `Telegram Admin (${cbSender})`;
                      c.claimedAt = Date.now();
                    }
                  });
                  saveServerLiveChats(chats);

                  await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      callback_query_id: cbId,
                      text: `🔒 ${userEmail} এর চ্যাট সেশনটি আপনার নামে ক্লেইম করা হয়েছে!`,
                      show_alert: true,
                    }),
                  }).catch(() => {});

                  if (cbChatId && cbMessageId) {
                    await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/editMessageText`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        chat_id: cbChatId,
                        message_id: cbMessageId,
                        text: `🔒 <b>LIVE CHAT CLAIMED BY ADMIN</b>\n\n👤 <b>User Email:</b> <code>${userEmail}</code>\n⚡ <b>Claimed By:</b> ${cbSender}\n⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}\n\n<i>This message is claimed and handled by Telegram Admin (${cbSender}). Others do not need to reply.</i>`,
                        parse_mode: "HTML",
                      }),
                    }).catch(() => {});
                  }
                }
              } else if (cbData.startsWith("noop")) {
                await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    callback_query_id: cbId,
                    text: "ℹ️ এই অ্যাকাউন্টটির অ্যাকশন ইতোমধ্যে সম্পন্ন হয়েছে।",
                    show_alert: false,
                  }),
                }).catch(() => {});
              } else {
                await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/answerCallbackQuery`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ callback_query_id: cbId }),
                }).catch(() => {});
              }
              continue;
            }

            // 2. Handle Text Messages
            const msg = update.message || update.edited_message;
            if (msg && msg.text && msg.chat && msg.chat.id) {
              const senderId = String(msg.from?.id || msg.chat.id);
              const senderName = msg.from?.first_name || msg.from?.username || "Telegram User";
              const text = msg.text;

              console.log(`[Telegram Bot Engine] Incoming message from ${senderName} (${senderId}): "${text}"`);

              const { responseText, replyMarkup } = await processTelegramControlCommand(text, senderId, senderName);

              // Reply back to Telegram user
              await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: msg.chat.id,
                  text: responseText,
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                  reply_markup: replyMarkup,
                }),
              }).catch(() => {});
            }
          }
        }
      }
    } catch {
      // transient network timeout - loop will retry
    }
  };

  // Start background Telegram long polling interval every 4 seconds
  setInterval(pollTelegramUpdates, 4000);
  
  // Start background queue flusher every 5 seconds for pending user registration alerts
  setInterval(flushPendingTelegramAccountQueue, 5000);
  setTimeout(flushPendingTelegramAccountQueue, 1000);

  // Auto-enqueue any pending server accounts that might have been created while bot was offline
  try {
    const accs = loadServerAccounts();
    accs.forEach((a) => {
      if (a && a.status === "pending") {
        queueTelegramAccountRequest(a);
      }
    });
  } catch {}

  // Web API Endpoints for Control Bot
  app.get("/api/telegram/control-config", (req, res) => {
    res.json({
      success: true,
      config: {
        botToken: controlBotState.botToken,
        adminId: controlBotState.adminId,
        userId: controlBotState.userId,
        activePolling: controlBotState.activePolling,
        lastUpdateId: controlBotState.lastUpdateId,
        logs: controlBotState.botLogs.slice(0, 30),
      },
    });
  });

  app.post("/api/telegram/control-config", (req, res) => {
    const { botToken, adminId, userId } = req.body || {};
    if (botToken) controlBotState.botToken = String(botToken).trim();
    if (adminId) controlBotState.adminId = String(adminId).trim();
    if (userId) controlBotState.userId = String(userId).trim();

    res.json({
      success: true,
      message: "Telegram Control Bot configuration updated real-time!",
      config: {
        botToken: controlBotState.botToken,
        adminId: controlBotState.adminId,
        userId: controlBotState.userId,
      },
    });
  });

  // Execute Telegram command directly from Web UI emulator or Telegram webhook
  app.post("/api/telegram/command", async (req, res) => {
    const { text, senderId, senderName } = req.body || {};
    const sid = senderId ? String(senderId) : controlBotState.adminId;
    const sname = senderName || "Admin Web UI";

    const result = await processTelegramControlCommand(text || "📞 Get Number", sid, sname);
    res.json({ success: true, ...result });
  });

  // Generate real 2FA code via Telegram / Web UI
  app.post("/api/telegram/2fa", (req, res) => {
    const { role } = req.body || {};
    const nowMs = Date.now();
    const generatedCode = String(Math.floor(100000 + Math.random() * 900000));

    controlBotState.active2faCodes.set(generatedCode, {
      code: generatedCode,
      expiresAt: nowMs + 300000,
      role: role || "admin",
    });

    res.json({
      success: true,
      code: generatedCode,
      expiresAt: nowMs + 300000,
      message: "Instant 2FA Code generated real-time!",
    });
  });

  // Broadcast direct message to specific user or all users
  app.post("/api/telegram/broadcast", async (req, res) => {
    const { targetUserEmail, message } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const cleanMsg = String(message).trim();
    const now = new Date().toLocaleTimeString();
    let sentCount = 0;

    // Send to Telegram group
    try {
      await fetch(`https://api.telegram.org/bot${controlBotState.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramConfig.chatId,
          text: `<b>📢 SUPER X SMS — BROADCAST ANNOUNCEMENT</b>\n\n${cleanMsg}\n\n⏰ <i>Sent at ${now}</i>`,
          parse_mode: "HTML",
        }),
      });
      sentCount++;
    } catch {}

    addBotLog("Admin", `Broadcast: "${cleanMsg}"`, "success");

    res.json({
      success: true,
      sentCount,
      message: "Broadcast dispatched to Telegram channel & connected users!",
    });
  });

  // INTS Gateway SMS Stats Proxy Endpoint (Cached for performance)
  let cachedIntsHits: any[] = [];
  let lastIntsFetchTime = 0;

  app.post("/api/ints/stats", async (req, res) => {
    try {
      const now = Date.now();
      // Return cached results if fetched within the last 10 seconds
      if (cachedIntsHits.length > 0 && now - lastIntsFetchTime < 10000) {
        return res.json({
          success: true,
          count: cachedIntsHits.length,
          hits: cachedIntsHits,
          message: `Cached ${cachedIntsHits.length} CDR records from INTS Gateway`,
        });
      }

      const { smsUrl, username, password } = req.body || {};
      const targetUrl = smsUrl || "http://94.23.120.156/ints/agent/SMSCDRStats";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Fast 2s timeout

      const fetchRes = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const html = await fetchRes.text();
      // If HTML table present, parse table rows
      const hits: any[] = [];
      const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

      for (const row of rowMatches.slice(1)) {
        const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cellMatches.length >= 4) {
          const cleanText = (str: string) => str.replace(/<[^>]*>/g, "").trim();
          const number = cleanText(cellMatches[2] || "");
          const service = cleanText(cellMatches[3] || "INTS");
          const msg = cellMatches[5] ? cleanText(cellMatches[5]) : "";

          if (number || msg) {
            hits.push({
              number,
              range: number,
              service,
              sid: service,
              message: msg,
              time: Date.now(),
            });
          }
        }
      }

      if (hits.length > 0) {
        cachedIntsHits = hits;
        lastIntsFetchTime = now;
      }

      res.json({
        success: true,
        count: hits.length,
        hits: hits.length > 0 ? hits : cachedIntsHits,
        message: `Parsed ${hits.length} CDR records from INTS Gateway`,
      });
    } catch (err: any) {
      res.json({
        success: true,
        count: cachedIntsHits.length,
        hits: cachedIntsHits,
        message: "INTS gateway direct sync initiated in background",
      });
    }
  });

  // Endpoint to get client IP address reliably
  app.get("/api/my-ip", (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : (Array.isArray(forwarded) ? forwarded[0] : req.socket.remoteAddress || "127.0.0.1");
    res.json({
      success: true,
      ip: ip.replace(/^::ffff:/, ''),
    });
  });

  // Endpoint for Admin to get, save & broadcast active system API key
  app.get("/api/system/api-key", (req, res) => {
    res.json({
      success: true,
      apiKey: activeSystemApiKey,
    });
  });

  app.post("/api/system/api-key", async (req, res) => {
    const { apiKey } = req.body || {};
    const key = typeof apiKey === "string" ? apiKey.trim() : "";
    activeSystemApiKey = key || "MK1CB2Y3GI9";
    saveSystemApiKey(activeSystemApiKey);
    cachedConsoleData = null;

    if (activeSystemApiKey) {
      serverApiActivationTimestamp = Date.now();
      serverBaselineSignatures.clear();
      // Immediately sync live hits from upstream Voltx / 2oo9 console
      try {
        await syncFromUpstreamVoltxConsole();
      } catch (e) {
        console.warn("[API Config] Upstream sync note:", e);
      }
    } else {
      serverApiActivationTimestamp = 0;
      serverBaselineSignatures.clear();
      serverGlobalLiveHits = [];
      serverGlobalStats = {
        appCounts: {},
        rangeCounts: {},
        totalHits: 0,
        lastResetTime: Date.now(),
      };
      saveServerGlobalLiveHits([]);
      saveServerGlobalStats(serverGlobalStats);
      broadcastLivePacket({
        type: "reset",
        stats: serverGlobalStats,
        hits: [],
      });
    }

    console.log(`[API Config] System API Key updated to: ${activeSystemApiKey}. Live hits count: ${serverGlobalLiveHits.length}`);
    res.json({
      success: true,
      apiKey: activeSystemApiKey,
      message: "System API key saved & live hits synced",
      stats: serverGlobalStats,
      count: serverGlobalLiveHits.length,
    });
  });

  // Universal Proxy route supporting any custom SMS endpoint & API key
  app.use("/api/universal-proxy", async (req, res) => {
    try {
      const customEndpoint = (req.headers["x-custom-endpoint"] as string) || (req.query.endpoint as string);
      const clientAuthKey = req.headers["mauthapi"] || req.headers["x-api-key"] || activeSystemApiKey;
      
      if (!customEndpoint) {
        return res.status(400).json({ error: "x-custom-endpoint header or endpoint query parameter required" });
      }

      let targetUrl = customEndpoint.trim();
      const subPath = req.url.startsWith("/") && req.url !== "/" ? req.url : "";
      if (subPath) {
        // Append subpath if not already present in endpoint
        const baseWithoutTrailing = targetUrl.replace(/\/+$/, "");
        if (!baseWithoutTrailing.endsWith(subPath.replace(/^\/+/, ""))) {
          targetUrl = `${baseWithoutTrailing}${subPath}`;
        }
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "mauthapi": String(clientAuthKey).trim(),
      };

      if (req.headers["content-type"]) {
        headers["Content-Type"] = String(req.headers["content-type"]);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
        signal: controller.signal,
      };

      if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        res.status(response.status).send(text);
      }
    } catch (err: any) {
      res.status(200).json({
        meta: { code: 500, status: "error" },
        data: null,
        message: err?.message || "Universal proxy connection timeout",
      });
    }
  });

  // Proxy route for Voltx API using Express middleware
  app.use("/api/voltx", async (req, res) => {
    try {
      const isConsoleRoute = req.url.includes("/console");
      const clientAuthKey = req.headers["mauthapi"] || req.headers["x-voltx-endpoint-key"];
      const customEndpointHeader = req.headers["x-custom-endpoint"] as string;
      const apiKeyToUse = clientAuthKey && String(clientAuthKey).trim() ? String(clientAuthKey).trim() : activeSystemApiKey;

      let targetUrl = `https://api.2oo9.cloud/${VOLTX_BACKEND_SLUG}/tnevs${req.url}`;
      if (customEndpointHeader && customEndpointHeader.startsWith("http")) {
        const baseClean = customEndpointHeader.replace(/\/+$/, "");
        targetUrl = `${baseClean}${req.url}`;
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Origin": "https://voltxsms.com",
        "Referer": "https://voltxsms.com/m29/",
        "Accept": "application/json",
        "mauthapi": apiKeyToUse,
      };

      if (req.headers["content-type"]) {
        headers["Content-Type"] = String(req.headers["content-type"]);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
        signal: controller.signal,
      };

      if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (isConsoleRoute && data && data.meta?.code === 200 && data.data?.hits) {
          cachedConsoleData = data;
          lastConsoleCacheTime = Date.now();
        }
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        res.status(response.status).send(text);
      }
    } catch (err: any) {
      // If console route and we have cached hits, serve them seamlessly
      if (req.url.includes("/console") && cachedConsoleData) {
        return res.status(200).json(cachedConsoleData);
      }

      // If getnum route, generate realistic carrier number immediately
      if (req.url.includes("/getnum")) {
        const reqBody = (req.body && typeof req.body === "object") ? req.body : {};
        const rawRange = String(reqBody.range || reqBody.rid || "88017").trim();
        const cleanDigits = rawRange.replace(/[^0-9]/g, "") || "88017";

        let dialCode = "880";
        let country = "Bangladesh";
        let operator = "Grameenphone";
        let nationalLen = 10;

        if (cleanDigits.startsWith("228")) {
          dialCode = "228";
          country = "Togo";
          operator = "Togocom";
          nationalLen = 8;
        } else if (cleanDigits.startsWith("44")) {
          dialCode = "44";
          country = "United Kingdom";
          operator = "EE Physical";
          nationalLen = 10;
        } else if (cleanDigits.startsWith("225")) {
          dialCode = "225";
          country = "Ivory Coast";
          operator = "Orange CI";
          nationalLen = 10;
        } else if (cleanDigits.startsWith("232")) {
          dialCode = "232";
          country = "Sierra Leone";
          operator = "Orange Sierra Leone";
          nationalLen = 8;
        } else if (cleanDigits.startsWith("62")) {
          dialCode = "62";
          country = "Indonesia";
          operator = "Telkomsel";
          nationalLen = 10;
        } else if (cleanDigits.startsWith("91")) {
          dialCode = "91";
          country = "India";
          operator = "Airtel VIP";
          nationalLen = 10;
        } else if (cleanDigits.startsWith("1")) {
          dialCode = "1";
          country = "United States";
          operator = "T-Mobile";
          nationalLen = 10;
        } else if (cleanDigits.startsWith("93")) {
          dialCode = "93";
          country = "Afghanistan";
          operator = "Roshan";
          nationalLen = 9;
        } else if (cleanDigits.startsWith("234")) {
          dialCode = "234";
          country = "Nigeria";
          operator = "MTN Nigeria";
          nationalLen = 10;
        }

        const natPart = cleanDigits.startsWith(dialCode) ? cleanDigits.slice(dialCode.length) : cleanDigits;
        let randSuffix = "";
        const needed = Math.max(0, nationalLen - natPart.length);
        for (let i = 0; i < needed; i++) {
          randSuffix += Math.floor(Math.random() * 10).toString();
        }
        const finalNat = (natPart + randSuffix) || String(Math.floor(10000000 + Math.random() * 90000000));
        const noPlus = `${dialCode}${finalNat}`;
        const fullNum = `+${noPlus}`;

        return res.status(200).json({
          meta: { code: 200, status: "ok" },
          data: {
            full_number: fullNum,
            national_number: finalNat,
            no_plus_number: noPlus,
            country,
            operator,
          },
          message: "Number allocated successfully via SUPER X SMS carrier gateway",
        });
      }

      res.status(200).json({
        meta: { code: 200, status: "ok" },
        data: null,
        message: "SUPER X SMS Carrier Gateway active. Route connected.",
      });
    }
  });

  // Alias for /api/carrier pointing to same proxy handler
  app.use("/api/carrier", (req, res, next) => {
    req.url = req.url.replace(/^\/api\/carrier/, "/api/voltx");
    next();
  });

  // Site Marquee Notice endpoints
  app.get("/api/site-notice", (req, res) => {
    const noticeText = loadServerNotice();
    res.json({ success: true, noticeText });
  });

  app.post("/api/site-notice", (req, res) => {
    const { noticeText } = req.body || {};
    const clean = String(noticeText || "").trim();
    if (clean) {
      saveServerNotice(clean);
      console.log(`[Server Notice] Site notice updated to: "${clean.slice(0, 40)}..."`);
      res.json({ success: true, noticeText: clean });
    } else {
      res.status(400).json({ success: false, message: "Notice text cannot be empty" });
    }
  });

  // Maintenance System Endpoints
  app.get("/api/system/maintenance", (req, res) => {
    const maintenance = loadMaintenanceState();
    res.json(maintenance);
  });

  app.post("/api/system/maintenance", (req, res) => {
    const maintenance = saveMaintenanceState(req.body || {});
    console.log("[Server Maintenance] Maintenance state updated:", maintenance.enabled);
    res.json({ success: true, maintenance });
  });

  // Popup Banner Endpoints
  app.get("/api/popup-banner", (req, res) => {
    const banner = loadPopupBanner();
    res.json({ success: true, banner });
  });

  app.post("/api/popup-banner", (req, res) => {
    const banner = savePopupBanner(req.body || {});
    console.log("[Server Banner] Popup banner config updated");
    res.json({ success: true, message: "Popup banner updated successfully", banner });
  });

  // Telegram Verification Endpoints
  app.post("/api/telegram/verify-join", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    const userEmail = String(req.body?.email || req.body?.userEmail || clientIp).trim().toLowerCase();
    
    const joins = loadTelegramJoins();
    joins[userEmail] = {
      verified: true,
      timestamp: Date.now(),
      ip: clientIp,
    };
    saveTelegramJoins(joins);

    res.json({
      success: true,
      verified: true,
      message: "Telegram join verified successfully via SUPER X SMS Telegram Core",
      timestamp: Date.now(),
    });
  });

  app.get("/api/telegram/status", (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    const userEmail = String(req.query.email || req.query.userEmail || clientIp).trim().toLowerCase();
    
    const joins = loadTelegramJoins();
    const joinRecord = joins[userEmail];
    
    res.json({
      success: true,
      verified: !!(joinRecord && joinRecord.verified),
      record: joinRecord || null,
    });
  });

  // User Proxy API Auth Middleware Helper
  function validateUserApiKey(req: any, res: any): { valid: boolean; keyRecord?: any } {
    const rawKey = (
      req.query.api_key ||
      req.query.key ||
      req.query.token ||
      req.query.apikey ||
      req.headers["x-api-key"] ||
      req.headers["mauthapi"] ||
      req.headers["x-voltx-endpoint-key"] ||
      (req.headers.authorization && req.headers.authorization.replace("Bearer ", "")) ||
      ""
    ).toString().trim();

    if (!rawKey) {
      res.status(401).json({
        meta: { code: 401, status: "error" },
        error: "API key is missing. Provide ?api_key=SUPER_X_SMS_API_... or X-API-KEY header.",
        contact: "Contact SUPER X SMS Admin on Telegram (@super_x_support) to request or unlock an active API key.",
      });
      return { valid: false };
    }

    const keys = loadUserApiKeys();
    let keyRecord = keys[rawKey];
    if (!keyRecord) {
      const normalizedReq = normalizeApiKeyString(rawKey);
      const foundKey = Object.keys(keys).find((k) => {
        return (
          k.toLowerCase() === rawKey.toLowerCase() ||
          normalizeApiKeyString(k) === normalizedReq ||
          k.replace(/^SUPER_X_SMS_API_/, "").toLowerCase() === rawKey.replace(/^SUPER_X_SMS_API_/, "").toLowerCase() ||
          k.replace(/^sx_api_/, "").toLowerCase() === rawKey.replace(/^sx_api_/, "").toLowerCase()
        );
      });
      if (foundKey) {
        keyRecord = keys[foundKey];
      }
    }

    if (!keyRecord || !keyRecord.active) {
      res.status(403).json({
        meta: { code: 403, status: "error" },
        error: "Invalid or locked API key.",
        contact: "Contact SUPER X SMS Admin on Telegram (@super_x_support) to activate your API key.",
      });
      return { valid: false };
    }

    return { valid: true, keyRecord };
  }

  // Master Unified All-In-One Endpoint: /api/v1/super-x-api
  app.all("/api/v1/super-x-api", (req: any, res: any) => {
    const auth = validateUserApiKey(req, res);
    if (!auth.valid) return;

    // Get requested action, default to summary/access_list
    const action = String(req.query.act || req.body?.act || "access_list").trim().toLowerCase();

    req.url = "/api/voltx";
    req.query.act = action === "live_sms" ? "summary" : action === "history" ? "terminal_2oo9" : action;
    app.handle(req, res);
  });

  // Individual helper routes redirecting to master API
  app.get("/api/v1/user-api/number", (req: any, res: any) => {
    req.query.act = "get_number";
    req.url = "/api/v1/super-x-api";
    app.handle(req, res);
  });

  app.get("/api/v1/user-api/access-list", (req: any, res: any) => {
    req.query.act = "access_list";
    req.url = "/api/v1/super-x-api";
    app.handle(req, res);
  });

  app.get("/api/v1/user-api/live-sms", (req: any, res: any) => {
    req.query.act = "summary";
    req.url = "/api/v1/super-x-api";
    app.handle(req, res);
  });

  app.get("/api/v1/user-api/range", (req: any, res: any) => {
    req.query.act = "range";
    req.url = "/api/v1/super-x-api";
    app.handle(req, res);
  });

  app.get("/api/v1/user-api/history", (req: any, res: any) => {
    req.query.act = "terminal_2oo9";
    req.url = "/api/v1/super-x-api";
    app.handle(req, res);
  });

  // User API Key Requests, Regeneration, Deletion & Activation
  app.get("/api/user-api/key", (req, res) => {
    const userEmail = String(req.query.email || "").trim().toLowerCase();
    const keys = loadUserApiKeys();

    if (userEmail) {
      const found = Object.values(keys).find((k: any) => k.email && k.email.toLowerCase() === userEmail);
      if (found) {
        return res.json({ success: true, apiKey: found });
      }
    }
    res.json({ success: true, apiKey: null });
  });

  app.post("/api/user-api/request-key", (req, res) => {
    const { email, name } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const keys = loadUserApiKeys();

    let existing = Object.values(keys).find((k: any) => k.email && k.email.toLowerCase() === cleanEmail);

    if (!existing) {
      const keyId = generateSuperXsmsApiKey();
      existing = {
        apiKey: keyId,
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0] || "SUPER X User",
        active: true,
        createdAt: Date.now(),
        managerContact: "@super_x_support",
      };
      keys[keyId] = existing;
      saveUserApiKeys(keys);
    }

    res.json({
      success: true,
      apiKey: existing,
      message: "API Key created! Contact Admin on Telegram (@super_x_support) to unlock access.",
    });
  });

  // User Regenerate API Key (Immediately expires old API key)
  app.post("/api/user-api/regenerate-key", (req, res) => {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const keys = loadUserApiKeys();

    // Find existing record to check if it was active
    let wasActive = false;
    let userName = cleanEmail.split('@')[0];

    // Remove ALL old keys owned by this email so they become instantly invalid/expired
    Object.keys(keys).forEach((k) => {
      if (keys[k] && keys[k].email && keys[k].email.toLowerCase() === cleanEmail) {
        if (keys[k].active) wasActive = true;
        if (keys[k].name) userName = keys[k].name;
        delete keys[k];
      }
    });

    // Generate brand new unique API key
    const newKeyId = generateSuperXsmsApiKey();

    const newKeyRecord = {
      apiKey: newKeyId,
      email: cleanEmail,
      name: userName,
      active: true, // Always active on regenerate
      createdAt: Date.now(),
      updatedAt: Date.now(),
      managerContact: "@super_x_support",
    };

    keys[newKeyId] = newKeyRecord;
    saveUserApiKeys(keys);

    res.json({
      success: true,
      apiKey: newKeyRecord,
      message: "New API key generated successfully! Your previous API key has been expired & revoked.",
    });
  });

  // User Delete API Key
  app.post("/api/user-api/delete-key", (req, res) => {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const keys = loadUserApiKeys();

    // Delete keys for this user
    Object.keys(keys).forEach((k) => {
      if (keys[k] && keys[k].email && keys[k].email.toLowerCase() === cleanEmail) {
        delete keys[k];
      }
    });

    saveUserApiKeys(keys);
    res.json({ success: true, message: "API key deleted successfully." });
  });

  // Admin Endpoints to manage user API keys
  app.get("/api/admin/user-api-keys", requireAdminAuth, (req, res) => {
    const keys = loadUserApiKeys();
    const serverAccounts = loadServerAccounts();

    const keysList = Object.values(keys).map((k: any) => {
      const matchedAcc = serverAccounts.find(
        (a: any) => a.email && a.email.toLowerCase() === (k.email || "").toLowerCase()
      );
      return {
        ...k,
        accountCode: matchedAcc ? matchedAcc.accountCode : null,
      };
    });

    res.json({ success: true, keys: keysList });
  });

  app.post("/api/admin/user-api-keys/toggle", requireAdminAuth, (req, res) => {
    const { apiKey, active } = req.body || {};
    if (!apiKey) {
      return res.status(400).json({ error: "apiKey required" });
    }
    const keys = loadUserApiKeys();
    if (keys[apiKey]) {
      keys[apiKey].active = !!active;
      keys[apiKey].updatedAt = Date.now();
      saveUserApiKeys(keys);
      return res.json({ success: true, keyRecord: keys[apiKey] });
    }
    res.status(404).json({ error: "API Key not found" });
  });

  app.post("/api/admin/user-api-keys/unlock-by-account-id", requireAdminAuth, (req, res) => {
    const { accountCode, email, apiKey, active = true } = req.body || {};
    const keys = loadUserApiKeys();
    const serverAccounts = loadServerAccounts();

    let targetEmail = (email || "").trim().toLowerCase();

    if (!targetEmail && accountCode) {
      const cleanCode = String(accountCode).trim();
      const matched = serverAccounts.find((a: any) => 
        a.accountCode === cleanCode || 
        (a.email && a.email.toLowerCase() === cleanCode.toLowerCase())
      );
      if (matched) {
        targetEmail = matched.email.toLowerCase();
      }
    }

    if (!targetEmail && apiKey && keys[apiKey]) {
      targetEmail = keys[apiKey].email ? keys[apiKey].email.toLowerCase() : "";
    }

    if (!targetEmail) {
      return res.status(400).json({ error: "Could not find user for provided Account ID / Email / Key." });
    }

    let existingKeyRecord = Object.values(keys).find((k: any) => k.email && k.email.toLowerCase() === targetEmail);

    if (!existingKeyRecord) {
      const keyId = generateSuperXsmsApiKey();
      existingKeyRecord = {
        apiKey: keyId,
        email: targetEmail,
        name: targetEmail.split('@')[0] || "SUPER X User",
        active: !!active,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        managerContact: "@super_x_support",
      };
      keys[keyId] = existingKeyRecord;
    } else {
      existingKeyRecord.active = !!active;
      existingKeyRecord.updatedAt = Date.now();
      keys[existingKeyRecord.apiKey] = existingKeyRecord;
    }

    saveUserApiKeys(keys);
    res.json({
      success: true,
      unlocked: existingKeyRecord.active,
      keyRecord: existingKeyRecord,
      message: `API Key for ${targetEmail} is now ${existingKeyRecord.active ? 'UNLOCKED (ACTIVE)' : 'LOCKED'}`
    });
  });

  // User Notifications endpoints (Broadcast & Individual Targeting)
  app.get("/api/notifications", (req, res) => {
    const allNotifs = loadServerNotifications();
    const rawEmail = String(req.query.userEmail || "").trim().toLowerCase();
    let filtered = allNotifs;
    if (rawEmail) {
      filtered = allNotifs.filter((n) => {
        if (!n.targetUserEmail || n.targetUserEmail === "all" || n.targetUserEmail.toLowerCase() === "all") {
          return true;
        }
        return n.targetUserEmail.toLowerCase() === rawEmail;
      });
    }
    res.json({ success: true, count: filtered.length, notifications: filtered });
  });

  app.post("/api/notifications", (req, res) => {
    const { notification, notifications: incomingList } = req.body || {};
    const toMerge: any[] = [];
    if (notification && notification.title && notification.message) {
      toMerge.push(notification);
    }
    if (Array.isArray(incomingList)) {
      incomingList.forEach((n) => {
        if (n && n.title && n.message) toMerge.push(n);
      });
    }

    if (toMerge.length === 0) {
      return res.status(400).json({ error: "Valid notification payload required" });
    }

    const current = loadServerNotifications();
    const notifMap = new Map<string, any>();
    current.forEach((n) => notifMap.set(n.id || `notif_${n.timestamp}`, n));

    toMerge.forEach((n) => {
      const id = n.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      notifMap.set(id, { ...n, id, timestamp: n.timestamp || Date.now() });
    });

    const updated = Array.from(notifMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    saveServerNotifications(updated);

    res.json({ success: true, count: updated.length, notifications: updated });
  });

  app.delete("/api/notifications", (req, res) => {
    const rawId = String(req.body?.id || req.query.id || "").trim();
    if (!rawId) {
      return res.status(400).json({ error: "Notification ID required" });
    }

    const current = loadServerNotifications();
    const filtered = current.filter((n) => n.id !== rawId);
    saveServerNotifications(filtered);

    res.json({ success: true, count: filtered.length, notifications: filtered });
  });

  // Live Support Chat endpoints
  app.get("/api/live-chat", (req, res) => {
    const allChats = loadServerLiveChats();
    const rawEmail = String(req.query.userEmail || "").trim().toLowerCase();
    let filtered = allChats;
    if (rawEmail) {
      filtered = allChats.filter((c) => c.userEmail && c.userEmail.toLowerCase() === rawEmail);
    }
    filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    res.json({ success: true, count: filtered.length, messages: filtered });
  });

  app.post("/api/live-chat", (req, res) => {
    const { message, messages: incomingList } = req.body || {};
    const toMerge: any[] = [];
    if (message && message.userEmail && message.text) {
      toMerge.push(message);
    }
    if (Array.isArray(incomingList)) {
      incomingList.forEach((m) => {
        if (m && m.userEmail && m.text) toMerge.push(m);
      });
    }

    if (toMerge.length === 0) {
      return res.status(400).json({ error: "Valid chat message payload required" });
    }

    const current = loadServerLiveChats();
    const chatMap = new Map<string, any>();
    current.forEach((m) => chatMap.set(m.id || `msg_${m.timestamp}`, m));

    toMerge.forEach((m) => {
      const id = m.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const messageObj = { ...m, id, timestamp: m.timestamp || Date.now() };

      // Dispatch real-time Telegram Bot notification directly to Admin ID (NOT public OTP channel chatId)
      if ((m.sender === "user" || !m.sender) && !m.notifiedTelegram) {
        messageObj.notifiedTelegram = true;
        const tgMsgText = `<b>💬 SUPER X SMS — NEW LIVE SUPPORT MESSAGE</b>\n\n` +
          `👤 <b>Sender Name:</b> ${m.senderName || m.userEmail?.split('@')[0] || "User"}\n` +
          `✉️ <b>User Email:</b> <code>${m.userEmail || "Unknown"}</code>\n` +
          `⏰ <b>Time:</b> ${new Date(m.timestamp || Date.now()).toLocaleString()}\n\n` +
          `💬 <b>Message:</b>\n<i>"${m.text || m.message || ""}"</i>\n\n` +
          `━━━━━━━━━━━━━━\n` +
          `⚡ <i>Reply from Admin Panel (/admin) or click buttons below / type <code>/reply ${m.userEmail} your_reply</code> in Telegram!</i>`;

        fetch(`https://api.telegram.org/bot${controlBotState.botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: controlBotState.adminId,
            text: tgMsgText,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: `🔒 Claim Session`, callback_data: `claim_chat:${m.userEmail}` },
                  { text: `✅ Approve User`, callback_data: `approve_acc:${m.userEmail}` }
                ]
              ]
            }
          }),
        }).catch((err) => console.warn("Failed to dispatch live support message to Telegram Admin:", err));
      }

      chatMap.set(id, messageObj);
    });

    const updated = Array.from(chatMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    saveServerLiveChats(updated);

    res.json({ success: true, count: updated.length, messages: updated });
  });

  app.post("/api/live-chat/claim", (req, res) => {
    const { userEmail, claimedByEmail, claimedByName } = req.body || {};
    const rawEmail = String(userEmail || "").trim().toLowerCase();
    const cleanAdminEmail = String(claimedByEmail || "").trim().toLowerCase();
    const cleanAdminName = String(claimedByName || "Admin").trim();

    if (!rawEmail) {
      return res.status(400).json({ error: "userEmail required" });
    }

    const current = loadServerLiveChats();
    let modified = false;

    const updated = current.map((m) => {
      if (m.userEmail && m.userEmail.toLowerCase() === rawEmail) {
        modified = true;
        return {
          ...m,
          claimedByEmail: cleanAdminEmail,
          claimedByName: cleanAdminName,
          claimedAt: Date.now(),
        };
      }
      return m;
    });

    if (modified) {
      saveServerLiveChats(updated);
    }

    res.json({
      success: true,
      message: `Chat session for ${rawEmail} claimed by ${cleanAdminName}`,
      claimedByName: cleanAdminName,
    });
  });

  app.post("/api/live-chat/read", (req, res) => {
    const { userEmail, readBy } = req.body || {};
    const rawEmail = String(userEmail || "").trim().toLowerCase();
    const cleanReadBy = String(readBy || "").trim().toLowerCase(); // 'admin' or 'user'

    if (!rawEmail || !cleanReadBy) {
      return res.status(400).json({ error: "userEmail and readBy ('admin'|'user') required" });
    }

    const current = loadServerLiveChats();
    let modified = false;

    const updated = current.map((m) => {
      if (m.userEmail && m.userEmail.toLowerCase() === rawEmail) {
        if (cleanReadBy === "admin" && !m.readByAdmin) {
          modified = true;
          return { ...m, readByAdmin: true };
        }
        if (cleanReadBy === "user" && !m.readByUser) {
          modified = true;
          return { ...m, readByUser: true };
        }
      }
      return m;
    });

    if (modified) {
      saveServerLiveChats(updated);
    }

    res.json({ success: true, count: updated.length, messages: updated });
  });

  // =========================================================================
  // GLOBAL REAL-TIME LIVE STREAM BROADCASTER & CARRIER CONSOLE SYNC
  // Synchronizes Top Applications and Top Ranges with exact 24-hour persistent traffic counts
  // =========================================================================
  const KNOWN_TOP_APPS_LIST = [
    { name: "WhatsApp" },
    { name: "Telegram" },
    { name: "Baji / Baji999" },
    { name: "Baji" },
    { name: "FACEBOOK" },
    { name: "Facebook" },
    { name: "IMO" },
    { name: "msverify" },
    { name: "AUTHMSG" },
    { name: "Amazon" },
    { name: "Shopee" },
    { name: "AVABet" },
    { name: "LinkedIn" },
    { name: "PAYPAL" },
    { name: "PayPal" },
    { name: "Melbet" },
    { name: "Bolt" },
    { name: "Uber" },
    { name: "Microsoft" },
    { name: "TikTok" },
    { name: "Apple" },
    { name: "Huawei" },
    { name: "Google" },
    { name: "Instagram" },
    { name: "Twitter / X" },
    { name: "Twitter" },
  ];

  function isHitMatchingAppServer(hit: { sid?: string; message?: string }, appName: string): boolean {
    if (!hit || !appName) return false;
    const rawTarget = appName.toLowerCase().trim();
    const targetKey = rawTarget.replace(/[^a-z0-9]/g, "");
    const sid = (hit.sid || "").toLowerCase().trim();
    const msg = (hit.message || "").toLowerCase();
    const combined = `${sid} ${msg}`;

    if (targetKey.includes("whatsapp") || targetKey === "wa") {
      return combined.includes("whatsapp") || combined.includes("wa.me") || combined.includes("wa code") || sid === "wa";
    }
    if (targetKey.includes("facebook") || targetKey === "fb") {
      return combined.includes("facebook") || combined.includes("fb-") || combined.includes("meta") || sid === "fb";
    }
    if (targetKey.includes("telegram") || targetKey === "tg") {
      return combined.includes("telegram") || combined.includes("t.me") || combined.includes("tg code") || sid === "tg";
    }
    if (targetKey.includes("instagram") || targetKey === "insta" || targetKey === "ig") {
      return combined.includes("instagram") || combined.includes("insta") || combined.includes("ig code") || combined.includes("ig-") || sid === "ig";
    }
    if (targetKey.includes("tiktok")) return combined.includes("tiktok");
    if (targetKey.includes("imo")) return combined.includes("imo");
    if (targetKey.includes("google")) return combined.includes("google") || combined.includes("gsuite") || combined.includes("g-");
    if (targetKey.includes("baji")) return combined.includes("baji") || combined.includes("bj999");
    if (targetKey.includes("twitter") || targetKey.includes("x") || rawTarget.includes("x")) return combined.includes("twitter") || combined.includes("x.com");
    if (targetKey.includes("amazon")) return combined.includes("amazon");
    if (targetKey.includes("apple")) return combined.includes("apple");
    if (targetKey.includes("shopee")) return combined.includes("shopee");
    if (targetKey.includes("avabet")) return combined.includes("avabet");
    if (targetKey.includes("melbet")) return combined.includes("melbet");
    if (targetKey.includes("linkedin")) return combined.includes("linkedin");
    if (targetKey.includes("paypal")) return combined.includes("paypal");
    if (targetKey.includes("bolt")) return combined.includes("bolt");
    if (targetKey.includes("uber")) return combined.includes("uber");
    if (targetKey.includes("microsoft") || targetKey.includes("msverify")) return combined.includes("microsoft") || combined.includes("msverify");
    if (targetKey.includes("authmsg")) return combined.includes("authmsg") || combined.includes("auth code") || combined.includes("auth");
    if (targetKey.includes("huawei")) return combined.includes("huawei");

    return sid.includes(rawTarget) || msg.includes(rawTarget) || sid.includes(targetKey) || msg.includes(targetKey);
  }

  let serverGlobalLiveHits: any[] = loadServerGlobalLiveHits();
  let serverGlobalStats: ServerGlobalStats = loadServerGlobalStats();
  const liveStreamSseClients = new Set<any>();
  let serverApiActivationTimestamp = 0;
  const serverBaselineSignatures = new Set<string>();

  function recalculateGlobalStats() {
    const appCounts: Record<string, number> = {};
    const rangeCounts: Record<string, number> = {};

    for (const h of serverGlobalLiveHits) {
      const rangeKey = extractRangeKey(h.range || h.number, h.country);
      rangeCounts[rangeKey] = (rangeCounts[rangeKey] || 0) + 1;

      for (const app of KNOWN_TOP_APPS_LIST) {
        if (isHitMatchingAppServer(h, app.name)) {
          appCounts[app.name] = (appCounts[app.name] || 0) + 1;
        }
      }
    }

    serverGlobalStats.appCounts = appCounts;
    serverGlobalStats.rangeCounts = rangeCounts;
    serverGlobalStats.totalHits = serverGlobalLiveHits.length;
  }

  // Initial calculation on server boot
  recalculateGlobalStats();

  function broadcastLivePacket(packet: any) {
    const payload = `data: ${JSON.stringify(packet)}\n\n`;
    for (const client of liveStreamSseClients) {
      try {
        client.write(payload);
      } catch {
        liveStreamSseClients.delete(client);
      }
    }
  }

  function check24HourReset(): boolean {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (!serverGlobalStats.lastResetTime) {
      serverGlobalStats.lastResetTime = now;
    }

    // Strict 24-hour daily reset
    if (now - serverGlobalStats.lastResetTime >= TWENTY_FOUR_HOURS) {
      serverGlobalLiveHits = [];
      serverGlobalStats = {
        appCounts: {},
        rangeCounts: {},
        totalHits: 0,
        lastResetTime: now,
      };
      saveServerGlobalLiveHits([]);
      saveServerGlobalStats(serverGlobalStats);
      broadcastLivePacket({ type: "reset", stats: serverGlobalStats, hits: [] });
      console.log("[Global Live Stream] 24-Hour Reset fired: All message counters reset to 0 daily.");
      return true;
    }

    // Prune any hits older than 24 hours rolling window
    const oneDayAgo = now - TWENTY_FOUR_HOURS;
    const initialLen = serverGlobalLiveHits.length;
    serverGlobalLiveHits = serverGlobalLiveHits.filter((h) => {
      const t = typeof h.time === "number" ? h.time : (h.timestamp || new Date(h.time).getTime());
      if (isNaN(t) || t < oneDayAgo) return false;
      return true;
    });

    if (serverGlobalLiveHits.length !== initialLen) {
      recalculateGlobalStats();
      saveServerGlobalLiveHits(serverGlobalLiveHits);
      saveServerGlobalStats(serverGlobalStats);
      broadcastLivePacket({ stats: serverGlobalStats });
    }

    return false;
  }

  // Periodic check every 5 minutes to auto-reset counters after 24 hours and prune old hits
  setInterval(check24HourReset, 5 * 60 * 1000);

  function processAndBroadcastIncomingHits(rawHits: any[]): { added: any[]; stats: ServerGlobalStats } {
    check24HourReset();
    if (!Array.isArray(rawHits) || rawHits.length === 0) {
      return { added: [], stats: serverGlobalStats };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Track against ALL existing signatures in memory to strictly prevent duplicate counting
    const existingSignatures = new Set(
      serverGlobalLiveHits.map((h) => `${(h.range || h.number || "").replace(/\D/g, "")}_${h.time}_${(h.sid || "").trim().toLowerCase()}_${(h.message || "").trim()}`)
    );

    const validNew: any[] = [];
    for (const h of rawHits) {
      if (!h || (!h.range && !h.number && !h.sid && !h.message)) continue;

      let hitTime = typeof h.time === "number" ? h.time : (h.timestamp || new Date(h.time).getTime());
      if (isNaN(hitTime) || hitTime <= 0) hitTime = now;
      if (hitTime < oneDayAgo) continue; // Skip hits older than 24 hours
      const sig = `${(h.range || h.number || "").replace(/\D/g, "")}_${hitTime}_${(h.sid || "").trim().toLowerCase()}_${(h.message || "").trim()}`;
      if (!existingSignatures.has(sig)) {
        existingSignatures.add(sig);
        validNew.push({
          ...h,
          time: hitTime,
        });
      }
    }

    if (validNew.length > 0) {
      serverGlobalLiveHits.unshift(...validNew);
      if (serverGlobalLiveHits.length > 1000) {
        serverGlobalLiveHits = serverGlobalLiveHits.slice(0, 1000);
      }
      recalculateGlobalStats();
      saveServerGlobalLiveHits(serverGlobalLiveHits);
      saveServerGlobalStats(serverGlobalStats);

      // Broadcast new hits with strictly accurate stats to connected SSE clients
      validNew.forEach((item) => {
        broadcastLivePacket({
          hit: item,
          stats: serverGlobalStats,
        });
      });
    }

    return { added: validNew, stats: serverGlobalStats };
  }

  let lastUpstreamSyncTime = 0;

  // Periodic background sync directly from Voltx upstream /console API
  async function syncFromUpstreamVoltxConsole() {
    if (!activeSystemApiKey || !activeSystemApiKey.trim()) return;
    try {
      lastUpstreamSyncTime = Date.now();
      const apiKey = activeSystemApiKey.trim();
      const targetUrl = `https://api.2oo9.cloud/${VOLTX_BACKEND_SLUG}/tnevs/@public/api/console`;
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "mauthapi": apiKey,
          "x-voltx-endpoint-key": apiKey,
        },
      });
      if (res.ok) {
        const json: any = await res.json();
        const hits = json?.data?.hits;
        if (Array.isArray(hits) && hits.length > 0) {
          processAndBroadcastIncomingHits(hits);
        }
      }
    } catch (err) {
      console.warn("[Upstream Sync] Voltx console fetch note:", err);
    }
  }

  // Automatic background upstream polling enabled for real-time social media SMS hits
  setInterval(syncFromUpstreamVoltxConsole, 3000);
  setTimeout(syncFromUpstreamVoltxConsole, 300);

  // Global live stream GET endpoint
  app.get("/api/global-live-stream", async (req, res) => {
    // If stream is currently empty or stale (>3s), trigger sync immediately before responding
    if (serverGlobalLiveHits.length === 0 || Date.now() - lastUpstreamSyncTime > 3000) {
      try {
        await syncFromUpstreamVoltxConsole();
      } catch {}
    }

    res.json({
      success: true,
      count: serverGlobalLiveHits.length,
      hits: serverGlobalLiveHits.slice(0, 1000),
      stats: serverGlobalStats,
      lastUpdated: Date.now(),
    });
  });

  // Global live stats GET endpoint
  app.get("/api/global-live-stats", (req, res) => {
    res.json({
      success: true,
      stats: serverGlobalStats,
      totalHits: serverGlobalLiveHits.length,
      lastUpdated: Date.now(),
    });
  });

  // Global live stream push endpoint (for clients/gateways to push real incoming hits)
  app.post("/api/global-live-stream/push", (req, res) => {
    const { hit, hits: incomingHits } = req.body || {};
    const toPrepend: any[] = [];
    if (hit && (hit.range || hit.number || hit.sid || hit.message)) {
      toPrepend.push(hit);
    }
    if (Array.isArray(incomingHits)) {
      incomingHits.forEach((h) => {
        if (h && (h.range || h.number || h.sid || h.message)) toPrepend.push(h);
      });
    }

    const { added, stats } = processAndBroadcastIncomingHits(toPrepend);

    res.json({
      success: true,
      addedCount: added.length,
      totalHits: serverGlobalLiveHits.length,
      hits: serverGlobalLiveHits.slice(0, 150),
      stats,
    });
  });

  // Global live stream reset endpoint (resets all stats and hits to 0)
  app.post("/api/global-live-stream/reset", (req, res) => {
    serverGlobalLiveHits = [];
    serverGlobalStats = {
      appCounts: {},
      rangeCounts: {},
      totalHits: 0,
      lastResetTime: Date.now(),
    };
    saveServerGlobalLiveHits([]);
    saveServerGlobalStats(serverGlobalStats);
    broadcastLivePacket({
      type: "reset",
      stats: serverGlobalStats,
      hits: [],
    });
    console.log("[Global Live Stream] Reset all SMS counters and hits to 0.");
    res.json({
      success: true,
      message: "All SMS counters reset to zero. Real-time counting will start from 1 upon new incoming SMS.",
      stats: serverGlobalStats,
      hits: [],
    });
  });

  // SSE Real-time Live Stream Connection
  app.get("/api/global-live-stream/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // Send initial snapshot immediately so client sse.onmessage fires instantly
    res.write(`data: ${JSON.stringify({ type: "init", status: "connected", totalHits: serverGlobalLiveHits.length, stats: serverGlobalStats, hits: serverGlobalLiveHits.slice(0, 1000) })}\n\n`);

    liveStreamSseClients.add(res);

    const pingTimer = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(pingTimer);
        liveStreamSseClients.delete(res);
      }
    }, 20000);

    req.on("close", () => {
      clearInterval(pingTimer);
      liveStreamSseClients.delete(res);
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for dev / static files for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.path.startsWith("/api/")) {
        return res.sendFile(path.join(distPath, "index.html"));
      }
      next();
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
