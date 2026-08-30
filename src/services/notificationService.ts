import { saveNotificationToFirebase, deleteNotificationFromFirebase } from './firebaseSyncService';

// Notification & Updates Service for SUPER X SMS

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'update' | 'alert' | 'urgent';
  timestamp: number;
  createdBy?: string;
}

const NOTIFICATIONS_STORAGE_KEY = 'super_x_sms_notifications';
const READ_STORAGE_PREFIX = 'super_x_sms_read_notifs_';
export const NOTIFICATION_UPDATE_EVENT = 'superx_notification_update';

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export function getAllNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: NotificationItem[] = JSON.parse(raw);
    // Remove old default items containing API key disclosures if present in legacy storage
    const cleaned = parsed.filter(n => !n.id.startsWith('notif_default_'));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (err) {
    console.error('Error reading notifications:', err);
    return [];
  }
}

export function saveAllNotifications(notifs: NotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
    window.dispatchEvent(new Event(NOTIFICATION_UPDATE_EVENT));
  } catch (err) {
    console.error('Error saving notifications:', err);
  }
}

export function addNotification(
  title: string,
  message: string,
  type: NotificationItem['type'] = 'update'
): NotificationItem {
  const current = getAllNotifications();
  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    message: message.trim(),
    type,
    timestamp: Date.now(),
    createdBy: 'Admin',
  };
  const updated = [newNotif, ...current];
  saveAllNotifications(updated);
  saveNotificationToFirebase(newNotif);
  return newNotif;
}

export function deleteNotification(id: string): void {
  const current = getAllNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveAllNotifications(updated);
  deleteNotificationFromFirebase(id);
}

export function getReadNotificationIdsForUser(userEmail: string): string[] {
  if (typeof window === 'undefined' || !userEmail) return [];
  try {
    const cleanEmail = userEmail.trim().toLowerCase();
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}${cleanEmail}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markNotificationsAsReadForUser(userEmail: string): void {
  if (typeof window === 'undefined' || !userEmail) return;
  try {
    const all = getAllNotifications();
    const cleanEmail = userEmail.trim().toLowerCase();
    const allIds = all.map((n) => n.id);
    localStorage.setItem(`${READ_STORAGE_PREFIX}${cleanEmail}`, JSON.stringify(allIds));
    window.dispatchEvent(new Event(NOTIFICATION_UPDATE_EVENT));
  } catch (err) {
    console.error('Error marking notifications as read:', err);
  }
}

export function getUnreadNotificationCountForUser(userEmail: string): number {
  const all = getAllNotifications();
  const readIds = getReadNotificationIdsForUser(userEmail);
  return all.filter((n) => !readIds.includes(n.id)).length;
}
