// Master Seed & Real Data Feed Helpers for SUPER X SMS
// Strictly real FOX SMS API messages only - No demo or mock data

import { LiveConsoleHit } from './voltxApi';

export interface RawSeedHit {
  range: string;
  number: string;
  sid: string;
  service: string;
  cli: string;
  message: string;
  code: string;
  otp: string;
  payout: string;
  operator: string;
  country: string;
  ageMinutesAgo: number;
  source: string;
  isFoxSms?: boolean;
}

export const MASTER_SEED_HITS_DEF: RawSeedHit[] = [];

/**
 * Return master seed hits - strictly empty so ONLY real hits from FOX SMS API show
 */
export function getMasterSeedHits(): LiveConsoleHit[] {
  return [];
}

/**
 * Baseline Application Hit Counts - strictly 0 so counts reflect ONLY real FOX SMS API hits
 */
export const BASELINE_APP_COUNTS: Record<string, number> = {
  WhatsApp: 0,
  Telegram: 0,
  Facebook: 0,
  IMO: 0,
  TikTok: 0,
  Instagram: 0,
  Google: 0,
  Apple: 0,
};
