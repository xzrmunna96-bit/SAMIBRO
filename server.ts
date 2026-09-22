import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Directories and Paths
const SERVER_DATA_DIR = path.join(__dirname, 'server-data');
const ACCOUNTS_FILE = path.join(SERVER_DATA_DIR, 'accounts.json');
const SUBADMINS_FILE = path.join(SERVER_DATA_DIR, 'subadmins.json');
const API_CONFIGS_FILE = path.join(SERVER_DATA_DIR, 'api_configs.json');
const CHATS_FILE = path.join(SERVER_DATA_DIR, 'chats.json');
const MARQUEE_FILE = path.join(SERVER_DATA_DIR, 'marquee.json');
const TOP_APPS_FILE = path.join(SERVER_DATA_DIR, 'top_apps.json');

// Ensure server-data directory exists
if (!fs.existsSync(SERVER_DATA_DIR)) {
  fs.mkdirSync(SERVER_DATA_DIR, { recursive: true });
}

// Helper functions for reading/writing JSON files
function readJSON(file: string, defaultValue: any) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf-8');
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(file, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

function writeJSON(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// Initialize files if they don't exist
const accounts = readJSON(ACCOUNTS_FILE, [
  {
    "id": "user_admin_munna",
    "name": "Munna Admin",
    "email": "xzrmunna96@gmail.com",
    "username": "admin_munna",
    "password": "Password123",
    "role": "admin",
    "status": "active",
    "accountCode": "SUPERX-ADMIN",
    "apiKey": "superxsms_admin_key_999",
    "apiUnlocked": true
  }
]);

const subadmins = readJSON(SUBADMINS_FILE, []);
const apiConfigs = readJSON(API_CONFIGS_FILE, []);

const chats = readJSON(CHATS_FILE, []);
const marquee = readJSON(MARQUEE_FILE, { text: "Welcome to SUPER X SMS Routing Gateway. Active high-speed channels are ready." });
const topApps = readJSON(TOP_APPS_FILE, [
  { id: "app_1", name: "WhatsApp", count: 420 },
  { id: "app_2", name: "Telegram", count: 312 },
  { id: "app_3", name: "Google", count: 256 },
  { id: "app_4", name: "Facebook", count: 184 },
  { id: "app_5", name: "Tinder", count: 98 }
]);

// Global memory list for real SMS Hits fetched from live APIs
let globalSmsHits: any[] = [];

// Helper functions for parsing
function detectService(msg: string): string {
  if (!msg) return 'Other';
  const lower = msg.toLowerCase();
  if (lower.includes('whatsapp') || lower.includes('wa ')) return 'WhatsApp';
  if (lower.includes('telegram') || lower.includes('tg ')) return 'Telegram';
  if (lower.includes('google') || lower.includes('g-') || lower.includes('gmail')) return 'Google';
  if (lower.includes('facebook') || lower.includes('fb ')) return 'Facebook';
  if (lower.includes('tinder')) return 'Tinder';
  if (lower.includes('imo')) return 'Imo';
  if (lower.includes('viber')) return 'Viber';
  return 'Other';
}

function detectCountry(num: string): string {
  if (!num) return 'Unknown';
  if (num.startsWith('+880') || num.startsWith('880')) return 'Bangladesh';
  if (num.startsWith('+44') || num.startsWith('44')) return 'United Kingdom';
  if (num.startsWith('+1') || num.startsWith('1')) return 'United States';
  if (num.startsWith('+66') || num.startsWith('66')) return 'Thailand';
  if (num.startsWith('+7') || num.startsWith('7')) return 'Russia';
  return 'International';
}

function extractOtpCode(msg: string): string {
  if (!msg) return '';
  const match = msg.match(/\b\d{4,6}\b/);
  return match ? match[0] : '';
}

function parseSmsHits(data: any, gatewayType: string = 'voltx'): any[] {
  if (!data) return [];
  let list: any[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (typeof data === 'object' && data !== null) {
    for (const key of ['data', 'sms', 'hits', 'messages', 'history', 'list', 'orders', 'records', 'msg_list', 'otp_list']) {
      if (Array.isArray(data[key])) {
        list = data[key];
        break;
      }
    }
    // If still not found, scan any key that holds an array
    if (list.length === 0) {
      for (const key in data) {
        if (Array.isArray(data[key])) {
          list = data[key];
          break;
        }
      }
    }
  }

  if (list.length === 0 && typeof data === 'object' && data !== null) {
    // Check if it is an error or status message response instead of an actual SMS object
    const statusVal = String(data.status || data.error || "").toLowerCase();
    const msgVal = String(data.message || data.msg || "").toLowerCase();
    
    const isErrorPayload = 
      statusVal.includes('err') || 
      statusVal.includes('fail') || 
      data.code === 400 || 
      data.code === 401 || 
      data.code === 404 ||
      msgVal.includes('no records') || 
      msgVal.includes('not found') || 
      msgVal.includes('invalid') || 
      msgVal.includes('error') || 
      msgVal.includes('fail') ||
      msgVal.includes('success'); // System response message, not a single SMS

    if (!isErrorPayload) {
      // Must look like an actual single SMS message object containing both content and a recipient/sender number
      const hasMessageContent = !!(data.message || data.msg || data.text || data.sms || data.body || data.otp);
      const hasRecipientNumber = !!(data.number || data.phone || data.phoneNumber || data.sender || data.cli || data.mobile || data.to);
      
      if (hasMessageContent && hasRecipientNumber) {
        list = [data];
      }
    }
  }

  // Map gateway types to custom friendly names
  let sourceName = 'VoltSMS';
  if (gatewayType === 'fox') sourceName = 'FoxSms';
  else if (gatewayType === 'plusonetel') sourceName = 'PlusOneTel';
  else if (gatewayType === 'sevenonetel') sourceName = 'SevenOneTel';

  const results: any[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;

    const message = item.message || item.msg || item.text || item.sms || item.content || item.smsContent || item.smsText || item.body || item.msg_text || item.otp || "";
    const number = item.number || item.phone || item.phoneNumber || item.sender || item.cli || item.mobile || item.to || "";

    if (!message && !number) continue;

    const time = item.time || item.date || item.timestamp || item.created_at || item.createdAt || item.received_at || Date.now();
    const service = item.service || item.app || item.appName || item.type || detectService(message);
    const country = item.country || item.countryCode || item.nation || item.operator || detectCountry(number);
    const code = item.code || extractOtpCode(message);

    // Generate a deterministic stable ID to prevent duplicates if none is returned by API
    const stableId = item.id || item.sid || item.sms_id || item.msg_id || item.order_id || `${number}_${message}_${time}`;

    results.push({
      id: stableId,
      number,
      message,
      time,
      service,
      country,
      code,
      source: sourceName
    });
  }

  return results;
}

// Background Polling Service (Queries user-defined API gateways every 5 seconds)
async function pollGateways() {
  const configs = readJSON(API_CONFIGS_FILE, apiConfigs);
  const activeGates = configs.filter((g: any) => g.status === 'active');
  
  let newHits: any[] = [];

  for (const gate of activeGates) {
    try {
      if (!gate.url) continue;

      const urlObj = new URL(gate.url);
      if (gate.apiKey) {
        urlObj.searchParams.append("key", gate.apiKey);
        urlObj.searchParams.append("apiKey", gate.apiKey);
        urlObj.searchParams.append("token", gate.apiKey);
        urlObj.searchParams.append("api_key", gate.apiKey);
      }
      if (gate.slug) {
        urlObj.searchParams.append("slug", gate.slug);
      }

      const res = await fetch(urlObj.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (res.status === 200) {
        const data = await res.json();
        const parsed = parseSmsHits(data, gate.type);
        newHits = [...newHits, ...parsed];
      }
    } catch (e: any) {
      // Sliently skip failing gateways in background
    }
  }

  // Deduplicate and store in memory (max 100 entries)
  if (newHits.length > 0) {
    const seenIds = new Set(globalSmsHits.map(h => h.id));
    const uniqueNew = newHits.filter(h => !seenIds.has(h.id));
    globalSmsHits = [...uniqueNew, ...globalSmsHits].slice(0, 100);
  }
}

// Start gateway background poller
setInterval(pollGateways, 5000);
pollGateways(); // Initial invocation

// API Endpoints

// 1. Auth Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and Password are required." });
  }

  const currentAccounts = readJSON(ACCOUNTS_FILE, accounts);
  const user = currentAccounts.find((u: any) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: "Your account has been suspended. Please contact Admin." });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    accountCode: user.accountCode,
    apiKey: user.apiKey,
    apiUnlocked: user.apiUnlocked
  });
});

// 2. Auth Register (creates a pending account)
app.post('/api/register', (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const currentAccounts = readJSON(ACCOUNTS_FILE, accounts);
  if (currentAccounts.some((u: any) => u.username === username || u.email === email)) {
    return res.status(400).json({ error: "Username or Email is already registered." });
  }

  const newAccount = {
    id: "user_" + Math.random().toString(36).substring(7),
    name,
    email,
    username,
    password,
    role: "user",
    status: "pending",
    accountCode: "SUPERX-" + Math.floor(10000 + Math.random() * 90000),
    apiKey: "superxsms_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    apiUnlocked: false
  };

  currentAccounts.push(newAccount);
  writeJSON(ACCOUNTS_FILE, currentAccounts);

  res.json({ message: "Registration successful. Your account is pending Approval.", account: newAccount });
});

// 3. Get all accounts (Admin only)
app.get('/api/accounts', (req, res) => {
  const currentAccounts = readJSON(ACCOUNTS_FILE, accounts);
  res.json(currentAccounts);
});

// 4. Update account (Admin only)
app.put('/api/accounts/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const currentAccounts = readJSON(ACCOUNTS_FILE, accounts);
  const idx = currentAccounts.findIndex((u: any) => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Account not found." });
  }

  currentAccounts[idx] = { ...currentAccounts[idx], ...updates };
  writeJSON(ACCOUNTS_FILE, currentAccounts);
  res.json({ message: "Account updated successfully.", account: currentAccounts[idx] });
});

// 5. Get/Set API Configs (Admin only)
app.get('/api/api-configs', (req, res) => {
  const configs = readJSON(API_CONFIGS_FILE, apiConfigs);
  res.json(configs);
});

app.post('/api/api-configs', (req, res) => {
  const newConfigs = req.body;
  if (!Array.isArray(newConfigs)) {
    return res.status(400).json({ error: "Invalid data format. Expected an array." });
  }
  writeJSON(API_CONFIGS_FILE, newConfigs);
  pollGateways(); // Re-trigger poller immediately
  res.json({ message: "API Gateways updated successfully." });
});

// 6. Live Stream SMS hits
app.get('/api/live-stream', (req, res) => {
  res.json(globalSmsHits);
});

// 7. Chats endpoints
app.get('/api/chats', (req, res) => {
  const currentChats = readJSON(CHATS_FILE, chats);
  res.json(currentChats);
});

app.post('/api/chats', (req, res) => {
  const msg = req.body;
  if (!msg.sender || !msg.text) {
    return res.status(400).json({ error: "Sender and text are required." });
  }
  const currentChats = readJSON(CHATS_FILE, chats);
  const newMsg = {
    id: "msg_" + Math.random().toString(36).substring(7),
    sender: msg.sender,
    role: msg.role || 'user',
    text: msg.text,
    time: Date.now()
  };
  currentChats.push(newMsg);
  writeJSON(CHATS_FILE, currentChats);
  res.json(newMsg);
});

// 8. Marquee text endpoints
app.get('/api/marquee', (req, res) => {
  const currentMarquee = readJSON(MARQUEE_FILE, marquee);
  res.json(currentMarquee);
});

app.post('/api/marquee', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required." });
  writeJSON(MARQUEE_FILE, { text });
  res.json({ text });
});

// 9. Top targeted apps
app.get('/api/top-apps', (req, res) => {
  // Dynamically calculate counts from globalSmsHits to avoid any static/placeholder numbers
  const appCounts: { [key: string]: number } = {};
  globalSmsHits.forEach(hit => {
    const service = hit.service || 'Other';
    appCounts[service] = (appCounts[service] || 0) + 1;
  });

  const list = Object.entries(appCounts)
    .map(([name, count], idx) => ({
      id: `dynamic_app_${idx}`,
      name,
      count
    }))
    .sort((a, b) => b.count - a.count);

  res.json(list);
});

app.post('/api/top-apps', (req, res) => {
  const newApps = req.body;
  writeJSON(TOP_APPS_FILE, newApps);
  res.json(newApps);
});

// 10. Gateway External API Route (for client developer scripts to fetch their keys)
app.get('/api/v1/sms', (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(401).json({ error: "API key is required." });
  }

  const currentAccounts = readJSON(ACCOUNTS_FILE, accounts);
  const user = currentAccounts.find((u: any) => u.apiKey === key);

  if (!user) {
    return res.status(401).json({ error: "Invalid API key." });
  }

  if (!user.apiUnlocked) {
    return res.status(403).json({ error: "API access is locked for your account. Please unlock first." });
  }

  // Return the active global SMS list
  res.json({
    status: "success",
    hitsCount: globalSmsHits.length,
    sms: globalSmsHits
  });
});

// Serve Vite build assets or mount Vite dev middleware
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('/', (req, res) => {
        res.send('Vite build not found. Please run "npm run build" first.');
      });
    }
  }
}

setupVite().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SUPER X SMS server is listening on port ${PORT}`);
  });
});
