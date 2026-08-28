import React from 'react';

export interface TopAppItem {
  id: string;
  name: string;
  range: string;
  status: 'active' | 'coming_soon';
  isEnabled: boolean;
  category?: string;
}

export const TOP_APPS_STORAGE_KEY = 'super_x_top_applications_config';
export const TOP_APPS_UPDATE_EVENT = 'super_x_top_apps_updated';

export const DEFAULT_TOP_APPS: TopAppItem[] = [
  { id: 'wa', name: 'WhatsApp', range: '22501', status: 'active', isEnabled: true },
  { id: 'tg', name: 'Telegram', range: '88017', status: 'active', isEnabled: true },
  { id: 'fb', name: 'Facebook', range: '44740', status: 'active', isEnabled: true },
  { id: 'imo', name: 'IMO', range: '62812', status: 'coming_soon', isEnabled: true },
  { id: 'tiktok', name: 'TikTok', range: '88017', status: 'coming_soon', isEnabled: true },
  { id: 'microsoft', name: 'Microsoft', range: '15552', status: 'coming_soon', isEnabled: true },
  { id: 'google', name: 'Google', range: '91987', status: 'coming_soon', isEnabled: true },
  { id: 'apple', name: 'Apple', range: '44740', status: 'coming_soon', isEnabled: true },
  { id: 'instagram', name: 'Instagram', range: '23762', status: 'coming_soon', isEnabled: true },
  { id: 'twitter', name: 'Twitter / X', range: '62812', status: 'coming_soon', isEnabled: true },
];

export function getTopAppsConfig(): TopAppItem[] {
  try {
    const stored = localStorage.getItem(TOP_APPS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
