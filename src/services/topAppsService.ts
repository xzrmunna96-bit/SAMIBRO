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
  { id: 'tg', name: 'Telegram', range: '88017', status: 'active', isEnabled: true, category: 'Messaging' },
  { id: 'baji', name: 'Baji / Baji999', range: '88017', status: 'active', isEnabled: true, category: 'Gaming / Betting' },
  { id: 'fb', name: 'FACEBOOK', range: '44740', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'imo', name: 'IMO', range: '62812', status: 'active', isEnabled: true, category: 'Messaging' },
  { id: 'msverify', name: 'msverify', range: '14306', status: 'active', isEnabled: true, category: 'Verification' },
  { id: 'authmsg', name: 'AUTHMSG', range: '14322', status: 'active', isEnabled: true, category: 'Verification' },
  { id: 'amazon', name: 'Amazon', range: '15552', status: 'active', isEnabled: true, category: 'E-Commerce' },
  { id: 'shopee', name: 'Shopee', range: '62812', status: 'active', isEnabled: true, category: 'E-Commerce' },
  { id: 'avabet', name: 'AVABet', range: '38267', status: 'active', isEnabled: true, category: 'Gaming / Betting' },
  { id: 'linkedin', name: 'LinkedIn', range: '5651', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'paypal', name: 'PAYPAL', range: '1937', status: 'active', isEnabled: true, category: 'Finance' },
  { id: 'melbet', name: 'Melbet', range: '88019', status: 'active', isEnabled: true, category: 'Gaming / Betting' },
  { id: 'bolt', name: 'Bolt', range: '23480', status: 'active', isEnabled: true, category: 'Rides' },
  { id: 'uber', name: 'Uber', range: '15552', status: 'active', isEnabled: true, category: 'Rides' },
  { id: 'microsoft', name: 'Microsoft', range: '15552', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'tiktok', name: 'TikTok', range: '88017', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'apple', name: 'Apple', range: '44740', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'huawei', name: 'Huawei', range: '23274', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'google', name: 'Google', range: '91987', status: 'active', isEnabled: true, category: 'Tech' },
  { id: 'instagram', name: 'Instagram', range: '23762', status: 'active', isEnabled: true, category: 'Social' },
  { id: 'twitter', name: 'Twitter / X', range: '62812', status: 'active', isEnabled: true, category: 'Social' },
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

/**
 * Robust, Canonical App Matching
 * Matches incoming SMS hits (by SID and content signatures) to Top Applications
 */
export function isHitMatchingApp(hit: { sid?: string; message?: string }, appNameOrId: string): boolean {
  if (!hit || !appNameOrId) return false;
  const rawTarget = appNameOrId.toLowerCase().trim();
  const targetKey = rawTarget.replace(/[^a-z0-9]/g, '');
  const sid = (hit.sid || '').toLowerCase().trim();
  const msg = (hit.message || '').toLowerCase();
  const combined = `${sid} ${msg}`;

  if (targetKey.includes('whatsapp') || targetKey === 'wa') {
    return combined.includes('whatsapp') || combined.includes('wa.me') || combined.includes('wa code') || sid === 'wa';
  }
  if (targetKey.includes('facebook') || targetKey === 'fb') {
    return combined.includes('facebook') || combined.includes('fb-') || combined.includes('meta') || sid === 'fb';
  }
  if (targetKey.includes('telegram') || targetKey === 'tg') {
    return combined.includes('telegram') || combined.includes('t.me') || combined.includes('tg code') || sid === 'tg';
  }
  if (targetKey.includes('instagram') || targetKey === 'insta' || targetKey === 'ig') {
    return combined.includes('instagram') || combined.includes('insta') || combined.includes('ig code') || combined.includes('ig-') || sid === 'ig';
  }
  if (targetKey.includes('tiktok')) {
    return combined.includes('tiktok');
  }
  if (targetKey.includes('imo')) {
    return combined.includes('imo');
  }
  if (targetKey.includes('google')) {
    return combined.includes('google') || combined.includes('gsuite') || combined.includes('g-');
  }
  if (targetKey.includes('baji')) {
    return combined.includes('baji') || combined.includes('bj999');
  }
  if (targetKey.includes('twitter') || targetKey.includes('x') || rawTarget.includes('x')) {
    return combined.includes('twitter') || combined.includes('x.com');
  }
  if (targetKey.includes('amazon')) {
    return combined.includes('amazon');
  }
  if (targetKey.includes('apple')) {
    return combined.includes('apple');
  }
  if (targetKey.includes('shopee')) {
    return combined.includes('shopee');
  }
  if (targetKey.includes('avabet')) {
    return combined.includes('avabet');
  }
  if (targetKey.includes('melbet')) {
    return combined.includes('melbet');
  }
  if (targetKey.includes('linkedin')) {
    return combined.includes('linkedin');
  }
  if (targetKey.includes('paypal')) {
    return combined.includes('paypal');
  }
  if (targetKey.includes('bolt')) {
    return combined.includes('bolt');
  }
  if (targetKey.includes('uber')) {
    return combined.includes('uber');
  }
  if (targetKey.includes('microsoft') || targetKey.includes('msverify')) {
    return combined.includes('microsoft') || combined.includes('msverify');
  }
  if (targetKey.includes('authmsg')) {
    return combined.includes('authmsg') || combined.includes('auth code') || combined.includes('auth');
  }
  if (targetKey.includes('huawei')) {
    return combined.includes('huawei');
  }

  return sid.includes(rawTarget) || msg.includes(rawTarget) || sid.includes(targetKey) || msg.includes(targetKey);
}

/**
 * Filter hits for a specific app strictly within the 24-hour rolling window
 */
export function filterHitsForApp(hits: any[], appNameOrId: string, maxAgeMs = 24 * 60 * 60 * 1000): any[] {
  if (!Array.isArray(hits) || hits.length === 0 || !appNameOrId) return [];
  const now = Date.now();
  const minTime = now - maxAgeMs;

  return hits.filter((h) => {
    if (!h) return false;
    let t = typeof h.time === 'number'
      ? (h.time < 10000000000 ? h.time * 1000 : h.time)
      : (h.timestamp || new Date(h.time).getTime());
    if (isNaN(t) || t <= 0) t = now;
    if (t < minTime) return false; // Enforce strict 24-hour limit
    return isHitMatchingApp(h, appNameOrId);
  });
}
