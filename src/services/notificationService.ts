import { saveNotificationToFirebase, deleteNotificationFromFirebase } from './firebaseSyncService';

// Notification & Updates Service for SUPER X SMS

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'update' | 'alert' | 'urgent';
  timestamp: number;
  createdBy?: string;
  targetUserEmail?: string; // 'all' or specific user email/username/account code
}

const NOTIFICATIONS_STORAGE_KEY = 'super_x_sms_notifications';
const READ_STORAGE_PREFIX = 'super_x_sms_read_notifs_';
export const NOTIFICATION_UPDATE_EVENT = 'superx_notification_update';

export function getAllNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter(n => n && typeof n === 'object' && n.id && typeof n.id === 'string' && !n.id.startsWith('notif_default_'));
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

// Save notification to server database
export async function saveNotificationToServer(notif: NotificationItem) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification: notif }),
    });
  } catch (err) {
    console.warn('Failed to save notification to server:', err);
  }
}

// Delete notification from server database
export async function deleteNotificationFromServer(id: string) {
  try {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch (err) {
    console.warn('Failed to delete notification on server:', err);
  }
}

// Fetch notifications from server database & sync locally
export async function fetchNotificationsFromServer(): Promise<NotificationItem[]> {
  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) return [];
    const data = await res.json();
    if (data && data.success && Array.isArray(data.notifications)) {
      const serverNotifs: NotificationItem[] = data.notifications;
      const current = getAllNotifications();
      const notifMap = new Map<string, NotificationItem>();

      current.forEach((n) => {
        if (n && n.id) notifMap.set(n.id, n);
      });

      let hasNew = false;
      serverNotifs.forEach((n) => {
        if (n && n.id && !notifMap.has(n.id)) {
          hasNew = true;
          notifMap.set(n.id, n);
        }
      });

      if (hasNew) {
        const merged = Array.from(notifMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        saveAllNotifications(merged);
        return merged;
      }
    }
  } catch (err) {
    // ignore
  }
  return [];
}

export function addNotification(
  title: string,
  message: string,
  type: NotificationItem['type'] = 'update',
  targetUserEmail: string = 'all',
  createdBy: string = 'Admin'
): NotificationItem {
  const current = getAllNotifications();
  const cleanTarget = (targetUserEmail || 'all').trim().toLowerCase();
  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    message: message.trim(),
    type,
    timestamp: Date.now(),
    createdBy,
    targetUserEmail: cleanTarget,
  };
  const updated = [newNotif, ...current];
  saveAllNotifications(updated);
  saveNotificationToFirebase(newNotif);
  saveNotificationToServer(newNotif);
  return newNotif;
}

export function deleteNotification(id: string): void {
  const current = getAllNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveAllNotifications(updated);
  deleteNotificationFromFirebase(id);
  deleteNotificationFromServer(id);
}

// Get notifications applicable for a specific user email
export function getNotificationsForUser(userEmail?: string): NotificationItem[] {
  const all = getAllNotifications();
  if (!userEmail) return all.filter((n) => n && (!n.targetUserEmail || n.targetUserEmail === 'all'));
  const clean = userEmail.trim().toLowerCase();
  return all.filter((n) => {
    if (!n) return false;
    if (!n.targetUserEmail || n.targetUserEmail === 'all' || n.targetUserEmail.toLowerCase() === 'all') {
      return true;
    }
    return n.targetUserEmail.toLowerCase() === clean;
  });
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
    const all = getNotificationsForUser(userEmail);
    const cleanEmail = userEmail.trim().toLowerCase();
    const allIds = all.map((n) => n.id);
    localStorage.setItem(`${READ_STORAGE_PREFIX}${cleanEmail}`, JSON.stringify(allIds));
    window.dispatchEvent(new Event(NOTIFICATION_UPDATE_EVENT));
  } catch (err) {
    console.error('Error marking notifications as read:', err);
  }
}

export function getUnreadNotificationCountForUser(userEmail: string): number {
  const all = getNotificationsForUser(userEmail);
  const readIds = getReadNotificationIdsForUser(userEmail);
  return all.filter((n) => !readIds.includes(n.id)).length;
}

// Real-time server notification polling (every 4 seconds)
if (typeof window !== 'undefined') {
  fetchNotificationsFromServer();
  setInterval(() => {
    fetchNotificationsFromServer();
  }, 4000);
}
