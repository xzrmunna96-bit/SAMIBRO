import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initServerRealtimeSync } from './services/serverAuthSync';
import { initializeFirebaseSync } from './services/firebaseSyncService';

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
