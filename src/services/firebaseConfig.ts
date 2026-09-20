// Firebase Configuration for SUPER X SMS Real-time Synchronization
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
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

let auth: any;
try {
  auth = getAuth(firebaseApp);
  try {
    const isIframe = typeof window !== "undefined" && window.self !== window.top;
    if (isIframe) {
      // Force in-memory persistence inside sandboxed iframes to bypass third-party cookie/IndexedDB restrictions
      setPersistence(auth, inMemoryPersistence).catch(() => {});
    } else {
      // Use local persistence in full window context
      setPersistence(auth, browserLocalPersistence).catch(() => {});
    }
  } catch {
    // ignore
  }
} catch (e) {
  auth = null;
}
export const firebaseAuth = auth;

// Initialize Analytics if supported in current browser environment
export let analyticsInstance: any = null;
if (typeof window !== "undefined") {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(firebaseApp);
        console.log("Firebase Analytics initialized successfully.");
      }
    })
    .catch((err) => {
      console.warn("Firebase Analytics could not be initialized:", err);
    });
}

