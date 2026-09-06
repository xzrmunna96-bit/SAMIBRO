import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, onValue, set } from "firebase/database";
import { firestoreDb, realtimeDb } from "./firebaseConfig";

export interface MaintenanceState {
  enabled: boolean;
  title: string;
  message: string;
  imageUrl?: string;
  updatedAt: number;
  updatedBy?: string;
  estimatedEndTime?: string;
}

const STORAGE_KEY = "super_x_maintenance_mode_v1";

export const DEFAULT_MAINTENANCE_STATE: MaintenanceState = {
  enabled: false,
  title: "Website Under Scheduled Maintenance",
  message: "We are currently performing important system upgrades and maintenance to serve you better. Please check back shortly!",
  imageUrl: "",
  updatedAt: Date.now(),
  updatedBy: "Admin",
};

export function getLocalMaintenanceState(): MaintenanceState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_MAINTENANCE_STATE, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn("Could not parse maintenance state:", err);
  }
  return DEFAULT_MAINTENANCE_STATE;
}

export function saveLocalMaintenanceState(state: MaintenanceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("super_x_maintenance_change", { detail: state }));
  } catch (err) {
    console.warn("Could not save local maintenance state:", err);
  }
}

export async function updateGlobalMaintenanceMode(state: Partial<MaintenanceState>, author = "Admin") {
  const current = getLocalMaintenanceState();
  const updated: MaintenanceState = {
    ...current,
    ...state,
    updatedAt: Date.now(),
    updatedBy: author,
  };

  // 1. Save locally
  saveLocalMaintenanceState(updated);

  // 2. Broadcast to Server / Cloud Run / Vercel API
  fetch("/api/system/maintenance", {
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

export function initMaintenanceRealtimeSync(callback?: (state: MaintenanceState) => void) {
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
