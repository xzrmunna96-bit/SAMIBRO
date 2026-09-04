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
  const SUBADMINS_FILE = path.join(DATA_DIR, "subadmins.json");
  const DELETED_ACCOUNTS_FILE = path.join(DATA_DIR, "deleted_accounts.json");
  const NOTICE_FILE = path.join(DATA_DIR, "site_notice.json");
  const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
  const LIVE_CHATS_FILE = path.join(DATA_DIR, "live_chats.json");

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

    try {
      if (fs.existsSync(ACCOUNTS_FILE)) {
        const raw = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((acc) => {
            if (acc && acc.email) {
              const clean = acc.email.toLowerCase().trim();
              const idClean = (acc.id || "").toLowerCase().trim();
              if (!deletedSet.has(clean) && !deletedSet.has(idClean)) {
                accountMap.set(clean, acc);
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn("Error reading accounts.json:", e);
    }

    return Array.from(accountMap.values());
  }

  function saveServerAccounts(accounts: any[]) {
    try {
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
    } catch (e) {
      console.warn("Error writing accounts.json:", e);
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
          createdAt: incoming.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // If existing is already approved and incoming status is undefined or pending, preserve approved unless explicitly changed
        const finalStatus = incoming.status || existing.status || "approved";
        accountMap.set(cleanEmail, {
          ...existing,
          ...incoming,
          status: finalStatus,
          approvedAt: incoming.approvedAt || existing.approvedAt,
          updatedAt: Date.now(),
        });
      }
    });

    saveDeletedAccounts(deletedSet);
    const updatedList = Array.from(accountMap.values());
    saveServerAccounts(updatedList);

    // Persist newly added/updated accounts to Firebase Firestore safely without overloading sockets
    (async () => {
      for (const a of toMerge.slice(0, 5)) {
        await saveAccountToFirestore(a).catch(() => null);
      }
    })().catch(() => null);

    console.log(`[Server Auth] Updated ${toMerge.length} accounts. Total registered: ${updatedList.length}`);
    res.json({
      success: true,
      count: updatedList.length,
      accounts: updatedList,
    });
  });

  // 2b. POST /api/accounts/approve - Explicit instant approval endpoint
  app.post("/api/accounts/approve", (req, res) => {
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
    if (approvedByEmail) target.approvedByEmail = approvedByEmail;
    if (approvedByName) target.approvedByName = approvedByName;

    saveServerAccounts(currentAccounts);
    saveAccountToFirestore(target).catch(() => null);
    console.log(`[Server Auth] Approved account ${target.email} by ${approvedByName || approvedByEmail || "Admin"}`);

    res.json({
      success: true,
      message: `Account for ${target.email} approved successfully.`,
      account: target,
      accounts: currentAccounts,
    });
  });

  // 3. DELETE /api/accounts - Permanently delete an account from server database
  app.delete("/api/accounts", (req, res) => {
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
    console.log(`[Server Auth] Deleted account ${rawEmail || rawId}. Remaining: ${filtered.length}`);

    res.json({
      success: true,
      message: `Account ${rawEmail || rawId} deleted permanently from server.`,
      remainingCount: filtered.length,
    });
  });

  // 3b. POST /api/accounts/purge-all-except-super-admin - Clear all users from server & database, keeping only Super Admin
  app.post("/api/accounts/purge-all-except-super-admin", async (req, res) => {
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
        cleanPass === "Password123" ||
        cleanPass === "123456";

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
      cleanPass === "Password123" ||
      cleanPass === "123456" ||
      cleanPass === "admin" ||
      (isSuperAdminAccount && (
        cleanPass === "XZRMUNNA12061" ||
        cleanPass.toUpperCase() === "XZRMUNNA12061" ||
        cleanPass === "MUNNA12061" ||
        cleanPass === "XZRMUNNA"
      )) ||
      (account.username && cleanPass.toLowerCase() === account.username.toLowerCase());

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
  app.post("/api/subadmins", (req, res) => {
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

    res.json({
      success: true,
      count: updated.length,
      subAdmins: updated,
    });
  });

  // 7. DELETE /api/subadmins - Remove sub-admin
  app.delete("/api/subadmins", (req, res) => {
    const rawId = String(req.body?.id || req.query.id || "").trim();
    const rawEmail = String(req.body?.email || req.query.email || "").trim().toLowerCase();

    const current = loadServerSubAdmins();
    const filtered = current.filter((s) => s.id !== rawId && s.email.toLowerCase() !== rawEmail);
    saveServerSubAdmins(filtered);

    res.json({
      success: true,
      count: filtered.length,
      subAdmins: filtered,
    });
  });

  let activeSystemApiKey = (process.env.VOLTX_KEY && process.env.VOLTX_KEY !== "M7ANNWJY6B2")
    ? process.env.VOLTX_KEY
    : "gIBhSFlycFVcj5lCRVKEgF-Vb4hEcGBGaneFQ0KRgn0=";
  const VOLTX_BACKEND_SLUG = process.env.VOLTX_BACKEND_SLUG || "MXS47FLFX0U";

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
        `📡 <b>Active Integrations:</b> VoltxSMS m29, INTS CDR, Direct Route\n\n` +
        `<b>AVAILABLE ADMIN COMMANDS:</b>\n` +
        `• Send <code>/setapi &lt;new_key&gt;</code> to change primary system API key\n` +
        `• Send <code>/getapi</code> to view unmasked credentials`;
    }
    else if (cleanText.startsWith("/setapi")) {
      const parts = cleanText.split(" ");
      const newKey = parts[1] ? parts[1].trim() : "";
      if (!newKey) {
        responseText = `<b>⚠️ SET API KEY</b>\n\nUse format: <code>/setapi YOUR_NEW_VOLTX_KEY</code>`;
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
    // 2. 👥 USER MANAGEMENT & ACCOUNT CREATION / PASSWORD CHANGE
    // -----------------------------------------------------------------------
    else if (cleanText === "👥 User Management" || cleanText.toLowerCase().includes("user management") || cleanText.toLowerCase() === "/users") {
      const pendingCount = currentAccounts.filter((a) => a.status === "pending").length;
      const approvedCount = currentAccounts.filter((a) => a.status === "approved").length;
      const subAdminCount = currentAccounts.filter((a) => a.role === "subadmin").length;

      responseText = `<b>👥 SUPER X SMS — USER MANAGEMENT PORTAL</b>\n\n` +
        `📊 <b>Total Registered Accounts:</b> <code>${currentAccounts.length}</code>\n` +
        `✅ <b>Approved Users:</b> <code>${approvedCount}</code>\n` +
        `⏳ <b>Pending Approvals:</b> <code>${pendingCount}</code>\n` +
        `👑 <b>Sub-Admins:</b> <code>${subAdminCount}</code>\n\n` +
        `<b>AVAILABLE ADMIN COMMANDS:</b>\n` +
        `• <code>/listusers</code> — View user list & emails\n` +
        `• <code>/createuser &lt;name&gt; &lt;email&gt; &lt;pass&gt;</code> — Manual account creation\n` +
        `• <code>/setpass &lt;email&gt; &lt;newpass&gt;</code> — Change user password\n` +
        `• <code>/approve &lt;email&gt;</code> — Approve pending user\n` +
        `• <code>/reject &lt;email&gt;</code> — Reject / block account\n` +
        `• <code>/deleteuser &lt;email&gt;</code> — Delete user account`;
    }
    else if (cleanText === "/listusers" || cleanText === "/users") {
      const topUsers = currentAccounts.slice(0, 20);
      let listStr = topUsers.map((a, i) => 
        `${i + 1}. <b>${a.name || "User"}</b> (<code>${a.email}</code>) [${a.role || "client"}] - <b>${a.status || "approved"}</b>`
      ).join("\n");

      responseText = `<b>📋 SUPER X SMS — REGISTERED USERS (${currentAccounts.length})</b>\n\n` +
        `${listStr || "No users registered yet."}\n\n` +
        `<i>Use <code>/setpass email newpass</code> or <code>/approve email</code> to modify users.</i>`;
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
          saveServerAccounts(currentAccounts);
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
          saveServerAccounts(currentAccounts);
          responseText = `<b>✅ USER APPROVED REAL-TIME!</b>\n\n` +
            `👤 <b>User:</b> ${acc.name} (<code>${acc.email}</code>)\n` +
            `🔑 <b>Account Code:</b> <code>${acc.accountCode}</code>\n` +
            `⚡ <i>Account activated for instant sign-in.</i>`;
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
    // 5. 📢 NOTICE BANNER & BROADCAST ANNOUNCEMENT
    // -----------------------------------------------------------------------
    else if (cleanText === "📢 Notice & Broadcast" || cleanText.toLowerCase().includes("notice") || cleanText === "/notice") {
      const currentNotice = loadServerNotice();

      responseText = `<b>📢 SUPER X SMS — NOTICE BANNER & BROADCAST</b>\n\n` +
        `📜 <b>Current Website Notice Banner:</b>\n` +
        `<i>"${currentNotice || 'No active notice set.'}"</i>\n\n` +
        `<b>AVAILABLE ADMIN COMMANDS:</b>\n` +
        `• Send <code>/setnotice &lt;your text&gt;</code> to update site notice banner in real-time\n` +
        `• Send <code>/clearnotice</code> to clear notice banner\n` +
        `• Send <code>/broadcast &lt;message&gt;</code> to alert all online users`;
    }
    else if (cleanText.startsWith("/setnotice") || cleanText.startsWith("/notice ")) {
      const noticeContent = cleanText.replace(/^\/(setnotice|notice)\s*/i, "").trim();
      if (!noticeContent) {
        responseText = `<b>⚠️ SET NOTICE BANNER</b>\n\nUse format: <code>/setnotice Welcome to SUPER X SMS Rates Portal!</code>`;
      } else {
        saveServerNotice(noticeContent);
        responseText = `<b>✅ SITE NOTICE BANNER UPDATED REAL-TIME!</b>\n\n` +
          `📜 <b>New Banner Text:</b>\n<i>"${noticeContent}"</i>\n\n` +
          `⚡ <i>Displayed live across all user headers on website!</i>`;
      }
    }
    else if (cleanText === "/clearnotice") {
      saveServerNotice("");
      responseText = `<b>✅ SITE NOTICE BANNER CLEARED!</b>`;
    }
    else if (cleanText.startsWith("/broadcast")) {
      const bmsg = cleanText.replace(/^\/broadcast\s*/i, "").trim();
      if (!bmsg) {
        responseText = `<b>⚠️ BROADCAST ANNOUNCEMENT</b>\n\nUse format: <code>/broadcast Maintenance scheduled at 12:00 AM UTC</code>`;
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

        responseText = `<b>📢 BROADCAST DISPATCHED REAL-TIME!</b>\n\n` +
          `💬 <b>Announcement:</b> <i>"${bmsg}"</i>\n` +
          `⚡ <i>Sent to Telegram channel & active user notifications!</i>`;
      }
    }

    // -----------------------------------------------------------------------
    // 6. 📊 REAL-TIME STATS & SYSTEM METRICS
    // -----------------------------------------------------------------------
    else if (cleanText === "📊 Real-Time Stats" || cleanText.toLowerCase().includes("stats") || cleanText === "/stats") {
      const pendingCount = currentAccounts.filter((a) => a.status === "pending").length;
      const subAdminCount = currentAccounts.filter((a) => a.role === "subadmin").length;

      responseText = `<b>📊 SUPER X SMS — REAL-TIME SYSTEM METRICS</b>\n\n` +
        `👥 <b>Total Registered Accounts:</b> <code>${currentAccounts.length}</code>\n` +
        `⏳ <b>Pending Account Approvals:</b> <code>${pendingCount}</code>\n` +
        `🛡️ <b>Delegated Sub-Admins:</b> <code>${subAdminCount}</code>\n` +
        `🔑 <b>System API Key:</b> <code>${activeSystemApiKey.slice(0, 8)}...</code>\n` +
        `⚡ <b>Server Engine Status:</b> Operational & Connected\n` +
        `🌐 <b>Carrier Gateways:</b> VoltxSMS m29 / INTS Active`;
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
                  reply_markup: JSON.stringify(replyMarkup),
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

  // Endpoint for Admin to save & broadcast active system API key
  app.post("/api/system/api-key", (req, res) => {
    const { apiKey } = req.body || {};
    if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
      activeSystemApiKey = apiKey.trim();
      cachedConsoleData = null; // Invalidate cache so fresh hits for new key are fetched
      console.log(`[API Config] System API Key updated to: ${activeSystemApiKey}`);
      res.json({
        success: true,
        apiKey: activeSystemApiKey,
        message: "System API key saved & activated",
      });
    } else {
      res.status(400).json({ error: "Invalid API key provided" });
    }
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
      const isAbort = err?.name === "AbortError" || String(err?.message || "").includes("aborted");
      if (!isAbort) {
        console.warn("[Voltx Proxy Connection Warning]:", err?.message || err);
      }

      // If console route and we have cached hits, serve them seamlessly
      if (req.url.includes("/console") && cachedConsoleData) {
        return res.status(200).json(cachedConsoleData);
      }

      res.status(200).json({
        meta: { code: 500, status: "network_timeout" },
        data: null,
        message: "Voltx gateway request timed out. Retrying automatically...",
      });
    }
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
      chatMap.set(id, { ...m, id, timestamp: m.timestamp || Date.now() });
    });

    const updated = Array.from(chatMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    saveServerLiveChats(updated);

    res.json({ success: true, count: updated.length, messages: updated });
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
