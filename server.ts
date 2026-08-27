import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy route for Voltx API using Express middleware
  app.use("/api/voltx", async (req, res) => {
    try {
      const endpointKey = req.headers["x-voltx-endpoint-key"]
        ? String(req.headers["x-voltx-endpoint-key"]).trim()
        : process.env.VOLTX_KEY || "M7ANNWJY6B2";

      const targetUrl = `https://api.2oo9.cloud/${endpointKey}/tnevs${req.url}`;

      const headers: Record<string, string> = {
        "Origin": "https://voltxsms.com",
        "Referer": "https://voltxsms.com/m29/",
      };

      if (req.headers.mauthapi) {
        headers["mauthapi"] = String(req.headers.mauthapi);
      } else {
        headers["mauthapi"] = endpointKey;
      }
      if (req.headers["content-type"]) {
        headers["Content-Type"] = String(req.headers["content-type"]);
      }
      if (req.headers["accept"]) {
        headers["Accept"] = String(req.headers["accept"]);
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ meta: { code: 500, status: "error" }, message: err?.message || "Proxy error" });
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
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
