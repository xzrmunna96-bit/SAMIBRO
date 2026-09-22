import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initServerRealtimeSync } from './services/serverAuthSync';
import { initializeFirebaseSync } from './services/firebaseSyncService';

// Suppress and handle Firebase Auth network request failures globally (e.g. when blocked by adblockers/sandboxes)
if (typeof window !== "undefined") {
  // Override console.error to block Firebase network request failed messages from console
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const msg = args.map(arg => {
      try {
        if (!arg) return "";
        return String(arg.message || arg.stack || arg);
      } catch {
        return String(arg);
      }
    }).join(" ");
    if (msg.includes("auth/network-request-failed") || msg.includes("network-request-failed")) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Override console.warn as well
  const originalConsoleWarn = console.warn;
  console.warn = function (...args) {
    const msg = args.map(arg => {
      try {
        if (!arg) return "";
        return String(arg.message || arg.stack || arg);
      } catch {
        return String(arg);
      }
    }).join(" ");
    if (msg.includes("auth/network-request-failed") || msg.includes("network-request-failed")) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const str = String(reason?.message || reason?.code || reason || "");
    if (
      str.includes("auth/network-request-failed") ||
      str.includes("network-request-failed") ||
      str.includes("auth/internal-error") ||
      reason?.code === "auth/network-request-failed"
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  });

  window.addEventListener("error", (event) => {
    const error = event.error || event;
    const str = String(error?.message || error?.code || event.message || error || "");
    if (
      str.includes("auth/network-request-failed") ||
      str.includes("network-request-failed") ||
      str.includes("auth/internal-error") ||
      error?.code === "auth/network-request-failed"
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  });
}

// Initialize real-time server synchronizer (SSE stream + heartbeat) immediately
initServerRealtimeSync();
initializeFirebaseSync();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
