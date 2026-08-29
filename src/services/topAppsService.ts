import React from 'react';

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
  { id: 'wa', name: 'WhatsApp', range: '22501', status: 'active', isEnabled: true },
  { id: 'tg', name: 'Telegram', range: '88017', status: 'active', isEnabled: true },
  { id: 'fb', name: 'FACEBOOK', range: '44740', status: 'active', isEnabled: true },
  { id: 'imo', name: 'IMO', range: '62812', status: 'active', isEnabled: true },
  { id: 'verify', name: 'Verify', range: '88017', status: 'active', isEnabled: true },
  { id: 'msverify', name: 'msverify', range: '14306', status: 'active', isEnabled: true },
  { id: 'authmsg', name: 'AUTHMSG', range: '14322', status: 'active', isEnabled: true },
  { id: 'iatsms', name: 'iATSMS', range: '23274', status: 'active', isEnabled: true },
  { id: 'amazon', name: 'Amazon', range: '15552', status: 'active', isEnabled: true },
  { id: 'shopee', name: 'Shopee', range: '62812', status: 'active', isEnabled: true },
  { id: 'avabet', name: 'AVABet', range: '38267', status: 'active', isEnabled: true },
  { id: 'linkedin', name: 'LinkedIn', range: '5651', status: 'active', isEnabled: true },
  { id: 'paypal', name: 'PAYPAL', range: '1937', status: 'active', isEnabled: true },
  { id: 'melbet', name: 'Melbet', range: '88019', status: 'active', isEnabled: true },
  { id: 'bolt', name: 'Bolt', range: '23480', status: 'active', isEnabled: true },
  { id: 'uber', name: 'Uber', range: '15552', status: 'active', isEnabled: true },
  { id: 'microsoft', name: 'Microsoft', range: '15552', status: 'active', isEnabled: true },
  { id: 'tiktok', name: 'TikTok', range: '88017', status: 'active', isEnabled: true },
  { id: 'apple', name: 'Apple', range: '44740', status: 'active', isEnabled: true },
  { id: 'huawei', name: 'Huawei', range: '23274', status: 'active', isEnabled: true },
  { id: 'google', name: 'Google', range: '91987', status: 'active', isEnabled: true },
  { id: 'instagram', name: 'Instagram', range: '23762', status: 'active', isEnabled: true },
  { id: 'twitter', name: 'Twitter / X', range: '62812', status: 'active', isEnabled: true },
];

export function getTopAppsConfig(): TopAppItem[] {
  try {
    const stored = localStorage.getItem(TOP_APPS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge any new default apps that are not yet in stored list
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const missingDefaults = DEFAULT_TOP_APPS.filter((d) => !existingIds.has(d.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          localStorage.setItem(TOP_APPS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
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
  } catch (err) {
    console.error('Failed to save top apps config', err);
  }
}
