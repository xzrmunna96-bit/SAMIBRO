import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as fs from "fs";

// Standard client SDK doesn't support listCollections, but we can try common names, or we can use the firebase-admin SDK if it's installed.
// Let's check if firebase-admin is in node_modules!
const hasAdmin = fs.existsSync("./node_modules/firebase-admin");
console.log("has firebase-admin:", hasAdmin);

// We can also try querying common collection names:
const commonCollections = [
  "api_configs", "api_keys", "gateways", "system_configs", "bot_configs", "manual_pools", "manual_ranges", "ranges",
  "super_x_accounts", "users", "pending_accounts", "support_chats", "marquee_notice", "top_apps", "notifications",
  "sms_hits", "console_hits", "live_hits", "received_sms", "gateway_configs", "voltx_configs", "fox_sms_configs"
];

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function scanAll() {
  for (const col of commonCollections) {
    try {
      const snap = await getDocs(collection(db, col));
      if (snap.size > 0) {
        console.log(`Found collection "${col}" with ${snap.size} documents. Sample ID:`, snap.docs[0].id);
        if (col.includes("config") || col.includes("gateway") || col.includes("pool") || col.includes("range")) {
          console.log(`Data for "${col}":`, JSON.stringify(snap.docs.map(d => ({ id: d.id, ...d.data() })), null, 2));
        }
      }
    } catch (e: any) {
      // ignore
    }
  }
  process.exit(0);
}

scanAll();
