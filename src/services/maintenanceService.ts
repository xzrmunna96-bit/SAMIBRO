import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, onValue, set } from "firebase/database";
import { firestoreDb, realtimeDb } from "./firebaseConfig";

export interface MaintenanceState {
  enabled: boolean;
  mode: "popup" | "fullscreen";
  title: string;
  message: string;
  imageUrl?: string;
  buttonText: string;
  buttonAction: "activation_modal" | "telegram" | "custom_url" | "dismiss";
  buttonUrl?: string;
  updatedAt: number;
  updatedBy?: string;
  estimatedEndTime?: string;
}

const STORAGE_KEY = "super_x_maintenance_mode_v2";

export const DEFAULT_MAINTENANCE_STATE: MaintenanceState = {
  enabled: false, // Default is strictly FALSE so no popup appears unless explicitly turned on by admin
  mode: "popup",
  title: "ওয়েবসাইট মোটেন্যান্স নোটিশ 📢",
  message:
    "আমাদের ওয়েবসাইটের কাজ চলার কারণে পূর্বে যারা অ্যাকাউন্ট অ্যাক্টিভ করার জন্য রিকোয়েস্ট পাঠিয়েছেন, তাদের সবগুলো রিজেক্ট করা হয়েছে। আপনারা নতুন করে আবার অ্যাকাউন্ট অ্যাক্টিভ করার জন্য তথ্যগুলো প্রদান করুন।",
  imageUrl:
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  buttonText: "অ্যাক্টিভেশন ফর্ম পূরণ করুন",
  buttonAction: "activation_modal",
  buttonUrl: "https://t.me/super_x_support",
  updatedAt: Date.now(),
  updatedBy: "Admin",
};

export function getLocalMaintenanceState(): MaintenanceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_MAINTENANCE_STATE,
        ...parsed,
        enabled: Boolean(parsed.enabled),
        mode: parsed.mode === "fullscreen" ? "fullscreen" : "popup",
      };
    }
  } catch (err) {
    console.warn("Could not parse maintenance state:", err);
  }
  return DEFAULT_MAINTENANCE_STATE;
}

export function saveLocalMaintenanceState(state: MaintenanceState) {
  try {
    const cleanState: MaintenanceState = {
      ...DEFAULT_MAINTENANCE_STATE,
      ...state,
      enabled: Boolean(state.enabled),
      mode: state.mode === "fullscreen" ? "fullscreen" : "popup",
      updatedAt: state.updatedAt || Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
    window.dispatchEvent(
      new CustomEvent("super_x_maintenance_change", { detail: cleanState })
    );
  } catch (err) {
    console.warn("Could not save local maintenance state:", err);
  }
}

export async function updateGlobalMaintenanceMode(
  state: Partial<MaintenanceState>,
  author = "Admin"
): Promise<MaintenanceState> {
  const current = getLocalMaintenanceState();
  const updated: MaintenanceState = {
    ...current,
    ...state,
    enabled: state.enabled !== undefined ? Boolean(state.enabled) : current.enabled,
    mode: state.mode || current.mode || "popup",
    updatedAt: Date.now(),
    updatedBy: author,
  };

  // 1. Save locally immediately
  saveLocalMaintenanceState(updated);

  // 2. Broadcast to Server / Cloud Run / Vercel API
  fetch("/api/system/maintenance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  }).catch(() => null);

  fetch("/api/popup-banner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  }).catch(() => null);

  // 3. Save to Firebase Firestore (Global real-time sync across all hosting)
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "super_x_system", "maintenance");
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.warn("Firestore maintenance save note:", err);
    }
  }

  // 4. Save to Firebase Realtime DB
  if (realtimeDb) {
    try {
      const rtdbRef = ref(realtimeDb, "system_config/maintenance");
      await set(rtdbRef, updated);
    } catch (err) {
      console.warn("RealtimeDB maintenance save note:", err);
    }
  }

  return updated;
}

export function initMaintenanceRealtimeSync(
  callback?: (state: MaintenanceState) => void
) {
  // Fetch initial from server
  fetch("/api/system/maintenance")
    .then((r) => r.json())
    .then((data) => {
      if (data && typeof data.enabled === "boolean") {
        saveLocalMaintenanceState(data);
        if (callback) callback(data);
      }
    })
    .catch(() => null);

  // Listen via Firestore
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "super_x_system", "maintenance");
      onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as MaintenanceState;
            if (data && typeof data.enabled === "boolean") {
              saveLocalMaintenanceState(data);
              if (callback) callback(data);
            }
          }
        },
        (err) => console.warn("Firestore maintenance snapshot listener:", err.message)
      );
    } catch (err) {
      console.warn("Could not attach maintenance Firestore listener:", err);
    }
  }

  // Listen via Realtime DB
  if (realtimeDb) {
    try {
      const rtdbRef = ref(realtimeDb, "system_config/maintenance");
      onValue(rtdbRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as MaintenanceState;
          if (data && typeof data.enabled === "boolean") {
            saveLocalMaintenanceState(data);
            if (callback) callback(data);
          }
        }
      });
    } catch (err) {
      console.warn("Could not attach maintenance RealtimeDB listener:", err);
    }
  }
}

