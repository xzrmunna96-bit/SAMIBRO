// Firebase Configuration for SUPER X SMS Real-time Synchronization
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, setLogLevel } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth, setPersistence, inMemoryPersistence, browserLocalPersistence } from "firebase/auth";
import appletConfig from "../../firebase-applet-config.json";

export const firebaseConfig = {
  ...appletConfig,
  databaseURL: (appletConfig as any).databaseURL || "https://super-x-sms-default-rtdb.firebaseio.com",
};

// Initialize Firebase safely (avoid multi-instance duplication)
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Suppress internal Firestore connection retry warnings
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Export Firebase services with robust long-polling for sandboxed iframes & containers
let db: any;
try {
  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  const dbId = (appletConfig as any).firestoreDatabaseId;
  if (dbId) {
    db = getFirestore(firebaseApp, dbId);
  } else if (isIframe) {
    db = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    });
  } else {
    db = initializeFirestore(firebaseApp, {});
  }
} catch {
  try {
    const dbId = (appletConfig as any).firestoreDatabaseId;
    db = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
  } catch {
    db = null;
  }
}
export const firestoreDb = db;

let rtdb: any;
try {
  rtdb = getDatabase(firebaseApp);
} catch (e) {
  rtdb = null;
}
export const realtimeDb = rtdb;

let auth: any = null;
try {
  if (typeof window !== "undefined") {
    auth = getAuth(firebaseApp);
    const isIframe = window.self !== window.top;
    try {
      if (isIframe) {
        setPersistence(auth, inMemoryPersistence).catch(() => {});
      } else {
        setPersistence(auth, browserLocalPersistence).catch(() => {});
      }
    } catch {
      // ignore persistence error
    }
  }
} catch {
  auth = null;
}
export const firebaseAuth = auth;

// Firebase Analytics is only loaded if a valid Google Analytics measurementId (G-XXXXX) is configured
export let analyticsInstance: any = null;
const measurementId = (appletConfig as any)?.measurementId;
if (typeof window !== "undefined" && typeof measurementId === "string" && measurementId.trim().startsWith("G-")) {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) => {
      isSupported()
        .then((supported) => {
          if (supported) {
            try {
              analyticsInstance = getAnalytics(firebaseApp);
            } catch {
              analyticsInstance = null;
            }
          }
        })
        .catch(() => {
          analyticsInstance = null;
        });
    })
    .catch(() => {
      analyticsInstance = null;
    });
}

