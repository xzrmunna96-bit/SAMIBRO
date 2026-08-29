import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let activeSystemApiKey = process.env.VOLTX_KEY || "M7ANNWJY6B2";
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

  // Proxy route for Voltx API using Express middleware
  app.use("/api/voltx", async (req, res) => {
    try {
      const isConsoleRoute = req.url.includes("/console");
      const clientAuthKey = req.headers["mauthapi"] || req.headers["x-voltx-endpoint-key"];
      const apiKeyToUse = clientAuthKey && String(clientAuthKey).trim() ? String(clientAuthKey).trim() : activeSystemApiKey;

      const targetUrl = `https://api.2oo9.cloud/${VOLTX_BACKEND_SLUG}/tnevs${req.url}`;

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
      const timeoutId = setTimeout(() => controller.abort(), 7000);

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
      console.error("[Voltx Proxy Error]:", err?.message);
      // If console route and we have cached hits from within the last 60 seconds, serve them seamlessly
      if (req.url.includes("/console") && cachedConsoleData && (Date.now() - lastConsoleCacheTime < 60000)) {
        return res.status(200).json(cachedConsoleData);
      }
      res.status(500).json({
        meta: { code: 500, status: "error" },
        message: err?.message || "Proxy error reaching upstream carrier gateway",
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for dev / static files for production
  if (process.env.NODE_ENV !== "production") {
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
