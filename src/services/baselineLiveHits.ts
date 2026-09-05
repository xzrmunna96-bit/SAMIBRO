// Central Global Live Hits & Real-Time Traffic Synchronizer
// Only authentic real-time carrier hits from connected API routes are stored and displayed

import { LiveConsoleHit } from './voltxApi';

/**
 * Returns baseline live hits (clean empty state for fresh accounts, real incoming API stream populates counts)
 */
export function generateBaselineLiveHits(): LiveConsoleHit[] {
  return [];
}

/**
 * Null/No-op placeholder for live packet simulation - all traffic comes directly from real API
 */
export function generateNextLivePacket(): LiveConsoleHit | null {
  return null;
}

