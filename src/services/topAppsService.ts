import React from 'react';
import { saveTopAppsToFirebase } from './firebaseSyncService';

export interface TopAppItem {
  id: string;
  name: string;
  range: string;
  status: 'active' | 'coming_soon';
  isEnabled: boolean;
  messageCount?: number;
  category?: string;
}

export const TOP_APPS_STORAGE_KEY = 'super_x_top_applications_config_v3';
export const TOP_APPS_UPDATE_EVENT = 'super_x_top_apps_updated';

export const DEFAULT_TOP_APPS: TopAppItem[] = [
  { id: 'wa', name: 'WhatsApp', range: '22501', status: 'active', isEnabled: true, category: 'Messaging' },
  { id: 'tiktok', name: 'TikTok', range: '88017', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'microsoft', name: 'Microsoft', range: '15552', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'apple', name: 'Apple', range: '44740', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'authmsg', name: 'AUTHMSG', range: '14322', status: 'active', isEnabled: true, category: 'Verification' },
  { id: 'fb', name: 'FACEBOOK', range: '44740', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'huawei', name: 'Huawei', range: '23274', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'paypal', name: 'PayPal', range: '1937', status: 'active', isEnabled: true, category: 'Finance' },
  { id: 'tg', name: 'Telegram', range: '88017', status: 'active', isEnabled: true, category: 'Messaging' },
  { id: 'imo', name: 'IMO', range: '62812', status: 'active', isEnabled: true, category: 'Messaging' },
  { id: 'msverify', name: 'msverify', range: '14306', status: 'active', isEnabled: true, category: 'Verification' },
  { id: 'amazon', name: 'Amazon', range: '15552', status: 'active', isEnabled: true, category: 'E-Commerce' },
  { id: 'shopee', name: 'Shopee', range: '62812', status: 'active', isEnabled: true, category: 'E-Commerce' },
  { id: 'google', name: 'Google', range: '91987', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'instagram', name: 'Instagram', range: '23762', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'twitter', name: 'Twitter / X', range: '62812', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'baji', name: 'Baji / Baji999', range: '88017', status: 'active', isEnabled: true, category: 'Gaming / Betting' },
  { id: 'avabet', name: 'AVABet', range: '38267', status: 'active', isEnabled: true, category: 'Gaming / Betting' },
  { id: 'linkedin', name: 'LinkedIn', range: '5651', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'melbet', name: 'Melbet', range: '88019', status: 'active', isEnabled: true, category: 'Gaming / Betting' },
  { id: 'bolt', name: 'Bolt', range: '23480', status: 'active', isEnabled: true, category: 'Rides' },
  { id: 'uber', name: 'Uber', range: '15552', status: 'active', isEnabled: true, category: 'Rides' },
];

export function getTopAppsConfig(): TopAppItem[] {
  try {
    const stored = localStorage.getItem(TOP_APPS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge and deduplicate by id to avoid duplicate keys in React render
        const map = new Map<string, TopAppItem>();
        parsed.forEach((p: any) => {
          if (p && p.id && p.id !== 'verify' && p.id !== 'iatsms') {
            map.set(p.id, p);
          }
        });
        DEFAULT_TOP_APPS.forEach((d) => {
          if (!map.has(d.id) && d.id !== 'verify' && d.id !== 'iatsms') {
            map.set(d.id, d);
          }
        });
        const merged = Array.from(map.values()).filter(
          (app) => app.id !== 'verify' && app.id !== 'iatsms'
        );
        localStorage.setItem(TOP_APPS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.error('Failed to load top apps config', err);
  }
  return DEFAULT_TOP_APPS.filter(
    (app) => app.id !== 'verify' && app.id !== 'iatsms'
  );
}

export function saveTopAppsConfig(apps: TopAppItem[]) {
  try {
    localStorage.setItem(TOP_APPS_STORAGE_KEY, JSON.stringify(apps));
    window.dispatchEvent(new Event(TOP_APPS_UPDATE_EVENT));
    saveTopAppsToFirebase(apps);
  } catch (err) {
    console.error('Failed to save top apps config', err);
  }
}

/**
 * 24-Hour Reset & Time Window Utilities
 */
export const TOP_APPS_LAST_RESET_KEY = 'super_x_sms_last_reset_timestamp_24h';

export function get24HourResetTimestamp(): number {
  if (typeof window === 'undefined') return Date.now();
  try {
    const saved = localStorage.getItem(TOP_APPS_LAST_RESET_KEY);
    if (saved) {
      const n = Number(saved);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {}
  const now = Date.now();
  try {
    localStorage.setItem(TOP_APPS_LAST_RESET_KEY, String(now));
  } catch {}
  return now;
}

export function set24HourResetTimestamp(ts: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOP_APPS_LAST_RESET_KEY, String(ts));
  } catch {}
}

export function checkAndApply24HourReset(): { didReset: boolean; lastResetTime: number } {
  if (typeof window === 'undefined') return { didReset: false, lastResetTime: Date.now() };
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const lastReset = get24HourResetTimestamp();

  if (now - lastReset >= TWENTY_FOUR_HOURS) {
    try {
      localStorage.removeItem('super_x_live_console_hits_24h');
      localStorage.setItem(TOP_APPS_LAST_RESET_KEY, String(now));
      window.dispatchEvent(new CustomEvent('super_x_24h_reset', { detail: { resetAt: now } }));
    } catch {}
    return { didReset: true, lastResetTime: now };
  }
  return { didReset: false, lastResetTime: lastReset };
}

export function parseHitTimestamp(rawTime: any): number {
  if (typeof rawTime === 'number') {
    return rawTime < 10000000000 ? rawTime * 1000 : rawTime;
  }
  if (!rawTime) return Date.now();
  const str = String(rawTime).trim();
  const num = Number(str);
  if (!isNaN(num) && num > 0) {
    return num < 10000000000 ? num * 1000 : num;
  }
  const isoStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
  const parsed = new Date(isoStr).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Detect canonical service category with 100% strictness to prevent cross-service OTP leakage
 */
export function detectCanonicalService(hit: { sid?: string; message?: string; service?: string }): string {
  if (!hit) return 'Other';
  const sid = ((hit as any).service || hit.sid || '').toLowerCase().trim();
  const msg = (hit.message || '').toLowerCase();

  // 1. WhatsApp
  if (sid.includes('whatsapp') || sid === 'wa' || msg.includes('whatsapp') || msg.includes('wa.me') || msg.includes('wa code')) {
    return 'WhatsApp';
  }
  // 2. Facebook / Meta
  if (sid.includes('facebook') || sid === 'fb' || sid === 'meta' || msg.includes('facebook') || msg.includes('fb-') || msg.includes('fb code') || msg.includes('meta code')) {
    return 'FACEBOOK';
  }
  // 3. Telegram
  if (sid.includes('telegram') || sid === 'tg' || msg.includes('telegram') || msg.includes('t.me') || msg.includes('tg code')) {
    return 'Telegram';
  }
  // 4. Instagram
  if (sid.includes('instagram') || sid === 'insta' || sid === 'ig' || sid.startsWith('insta_') || msg.includes('instagram') || msg.includes('ig code') || msg.includes('ig-')) {
    return 'Instagram';
  }
  // 5. TikTok
  if (sid.includes('tiktok') || msg.includes('tiktok')) {
    return 'TikTok';
  }
  // 6. IMO
  if (sid.includes('imo') || msg.includes('imo code') || msg.includes('imo verification') || msg.includes('imo ')) {
    return 'IMO';
  }
  // 7. Google
  if (sid.includes('google') || sid === 'gsuite' || msg.includes('google verification') || msg.includes('g-') || msg.includes('google code')) {
    return 'Google';
  }
  // 8. Apple
  if (sid.includes('apple') || msg.includes('apple id') || msg.includes('apple code') || msg.includes('apple verification')) {
    return 'Apple';
  }
  // 9. Microsoft
  if (sid.includes('microsoft') || msg.includes('microsoft') || msg.includes('msft') || msg.includes('live.com') || msg.includes('xbox')) {
    return 'Microsoft';
  }
  // 10. msverify
  if (sid.includes('msverify') || msg.includes('msverify')) {
    return 'msverify';
  }
  // 11. AUTHMSG
  if (sid === 'authmsg' || (sid.includes('authmsg') && !sid.includes('facebook') && !sid.includes('whatsapp'))) {
    return 'AUTHMSG';
  }
  // 12. Amazon
  if (sid.includes('amazon') || msg.includes('amazon')) {
    return 'Amazon';
  }
  // 13. Shopee
  if (sid.includes('shopee') || msg.includes('shopee')) {
    return 'Shopee';
  }
  // 14. Baji / Baji999
  if (sid.includes('baji') || msg.includes('baji') || msg.includes('bj999')) {
    return 'Baji / Baji999';
  }
  // 15. Melbet
  if (sid.includes('melbet') || msg.includes('melbet')) {
    return 'Melbet';
  }
  // 16. AVABet
  if (sid.includes('avabet') || msg.includes('avabet')) {
    return 'AVABet';
  }
  // 17. LinkedIn
  if (sid.includes('linkedin') || msg.includes('linkedin')) {
    return 'LinkedIn';
  }
  // 18. PAYPAL
  if (sid.includes('paypal') || msg.includes('paypal')) {
    return 'PAYPAL';
  }
  // 19. Uber
  if (sid.includes('uber') || msg.includes('uber code')) {
    return 'Uber';
  }
  // 20. Bolt
  if (sid.includes('bolt') || msg.includes('bolt code')) {
    return 'Bolt';
  }
  // 21. Snapchat
  if (sid.includes('snapchat') || msg.includes('snapchat')) {
    return 'Snapchat';
  }
  // 22. Viber
  if (sid.includes('viber') || msg.includes('viber')) {
    return 'Viber';
  }
  // 23. Discord
  if (sid.includes('discord') || msg.includes('discord')) {
    return 'Discord';
  }
  // 24. Huawei
  if (sid.includes('huawei') || msg.includes('huawei')) {
    return 'Huawei';
  }
  // 25. Twitter / X
  if (sid === 'twitter' || sid === 'x' || sid === 'x.com' || msg.includes('twitter') || msg.includes('x.com')) {
    return 'Twitter / X';
  }

  if (sid) {
    return sid.charAt(0).toUpperCase() + sid.slice(1);
  }
  return 'Other';
}

/**
 * Robust, Canonical App Matching
 * Matches incoming SMS hits strictly to the target application.
 * Prevents false positives and cross-app OTP bleeding.
 */
export function isHitMatchingApp(hit: { sid?: string; message?: string; service?: string }, appNameOrId: string): boolean {
  if (!hit || !appNameOrId) return false;
  const canonical = detectCanonicalService(hit);
  const target = appNameOrId.trim();
  const targetLower = target.toLowerCase();
  const targetKey = targetLower.replace(/[^a-z0-9]/g, '');
  const canonicalLower = canonical.toLowerCase();
  const canonicalKey = canonicalLower.replace(/[^a-z0-9]/g, '');

  if (canonicalKey === targetKey) return true;
  if (canonicalLower === targetLower) return true;

  if (targetKey === 'wa' || targetKey === 'whatsapp') {
    return canonicalKey === 'whatsapp' || canonicalKey === 'wa';
  }
  if (targetKey === 'fb' || targetKey === 'facebook') {
    return canonicalKey === 'facebook' || canonicalKey === 'fb';
  }
  if (targetKey === 'tg' || targetKey === 'telegram') {
    return canonicalKey === 'telegram' || canonicalKey === 'tg';
  }
  if (targetKey === 'ig' || targetKey === 'insta' || targetKey === 'instagram') {
    return canonicalKey === 'instagram' || canonicalKey === 'ig' || canonicalKey === 'insta';
  }
  if (targetKey.includes('baji')) {
    return canonicalKey.includes('baji');
  }
  if (targetKey === 'msverify') {
    return canonicalKey === 'msverify';
  }
  if (targetKey === 'authmsg') {
    return canonicalKey === 'authmsg';
  }
  if (targetKey === 'microsoft') {
    return canonicalKey === 'microsoft';
  }
  if (targetKey === 'apple') {
    return canonicalKey === 'apple';
  }
  if (targetKey === 'tiktok') {
    return canonicalKey === 'tiktok';
  }
  if (targetKey === 'imo') {
    return canonicalKey === 'imo';
  }
  if (targetKey === 'google') {
    return canonicalKey === 'google';
  }
  if (targetKey.includes('twitter') || targetKey === 'x') {
    return canonicalKey.includes('twitter') || canonicalKey === 'x';
  }
  if (targetKey === 'amazon') {
    return canonicalKey === 'amazon';
  }
  if (targetKey === 'shopee') {
    return canonicalKey === 'shopee';
  }
  if (targetKey === 'avabet') {
    return canonicalKey === 'avabet';
  }
  if (targetKey === 'melbet') {
    return canonicalKey === 'melbet';
  }
  if (targetKey === 'linkedin') {
    return canonicalKey === 'linkedin';
  }
  if (targetKey === 'paypal') {
    return canonicalKey === 'paypal';
  }
  if (targetKey === 'uber') {
    return canonicalKey === 'uber';
  }
  if (targetKey === 'bolt') {
    return canonicalKey === 'bolt';
  }
  if (targetKey === 'huawei') {
    return canonicalKey === 'huawei';
  }

  return false;
}

/**
 * Filter hits for a specific app strictly within the 24-hour rolling window
 */
export function filterHitsForApp(hits: any[], appNameOrId: string, maxAgeMs = 24 * 60 * 60 * 1000): any[] {
  if (!Array.isArray(hits) || hits.length === 0 || !appNameOrId) return [];
  const now = Date.now();
  const minTime = now - maxAgeMs;

  const isAll =
    appNameOrId.trim().toUpperCase() === "ALL" ||
    appNameOrId.trim().toUpperCase() === "ALL APPLICATIONS" ||
    appNameOrId.trim().toUpperCase() === "ALL APPS";

  return hits.filter((h) => {
    if (!h) return false;
    const t = parseHitTimestamp(h.time ?? h.timestamp);
    if (t < minTime) return false; // Enforce strict 24-hour limit
    if (isAll) return true;
    return isHitMatchingApp(h, appNameOrId);
  });
}
