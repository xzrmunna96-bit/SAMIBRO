// Firebase Configuration for SUPER X SMS Real-time Synchronization
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeFirestore, getFirestore, setLogLevel } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBhXcv4tNEO7vFmqfMlvZlndcUGtsWLIHs",
  authDomain: "super-x-sms.firebaseapp.com",
  databaseURL: "https://super-x-sms-default-rtdb.firebaseio.com",
  projectId: "super-x-sms",
  storageBucket: "super-x-sms.firebasestorage.app",
  messagingSenderId: "560607077548",
  appId: "1:560607077548:web:aba384c4d34f6b01166b09",
  measurementId: "G-M2MVV39R6Y"
};

// Initialize Firebase safely (avoid multi-instance duplication)
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Suppress internal Firestore connection retry warnings
try {
  setLogLevel('error');
} catch {
  // ignore
}

// Export Firebase services with robust long-polling auto-detection for cloud/iframe containers
let db: any;
try {
  db = getFirestore(firebaseApp);
} catch {
  try {
    db = initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    db = getFirestore(firebaseApp);
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

