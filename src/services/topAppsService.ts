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
  { id: 'verify', name: 'Verify', range: '88017', status: 'active', isEnabled: true, category: 'Verification' },
  { id: 'msverify', name: 'msverify', range: '14306', status: 'active', isEnabled: true, category: 'Verification' },
  { id: 'authmsg', name: 'AUTHMSG', range: '14322', status: 'active', isEnabled: true, category: 'Verification' },
  { id: 'iatsms', name: 'iATSMS', range: '23274', status: 'active', isEnabled: true, category: 'Verification' },
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
          if (p && p.id) {
            map.set(p.id, p);
          }
        });
        DEFAULT_TOP_APPS.forEach((d) => {
          if (!map.has(d.id)) {
            map.set(d.id, d);
          }
        });
        const merged = Array.from(map.values());
        localStorage.setItem(TOP_APPS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.error('Failed to load top apps config', err);
  }
  return DEFAULT_TOP_APPS;
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
