// Central Global Live Hits & Real-Time Traffic Synchronizer
// ONLY authentic real-time carrier hits from connected API routes & Telegram are displayed.
// All demo/fake SMS messages are strictly disabled as requested.

import { LiveConsoleHit } from './voltxApi';

/**
 * Returns empty array - strictly no demo or fake SMS messages are generated.
 * Only real OTP messages received from connected servers and Telegram will be shown.
 */
export function generateBaselineLiveHits(): LiveConsoleHit[] {
  return [];
}

/**
 * Null placeholder for live packet simulation
 */
export function generateNextLivePacket(): LiveConsoleHit | null {
  return null;
}
