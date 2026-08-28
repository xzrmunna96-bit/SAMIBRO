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
