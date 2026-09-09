// Robust, Permanent Site Notice & Banner Synchronization Service
// Guarantees notice text never reverts to old defaults after container restarts or time passes

export interface SiteNoticeData {
  noticeText: string;
  updatedAt: number;
}

const STORAGE_KEY = 'super_x_site_marquee_notice';
const META_KEY = 'super_x_site_marquee_notice_meta';
const BACKUP_KEY = 'super_x_site_marquee_notice_backup';

export const FALLBACK_NOTICE =
  'SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active';

export function getLocalNoticeData(): SiteNoticeData {
  if (typeof window === 'undefined') {
    return { noticeText: FALLBACK_NOTICE, updatedAt: 0 };
  }

  try {
    const metaRaw = localStorage.getItem(META_KEY);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      if (meta && typeof meta.noticeText === 'string' && meta.noticeText.trim()) {
        return {
          noticeText: meta.noticeText.trim(),
          updatedAt: Number(meta.updatedAt) || 0,
        };
      }
    }

    const text = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);
    if (text && text.trim()) {
      return { noticeText: text.trim(), updatedAt: 1 };
    }
  } catch {}

  return { noticeText: FALLBACK_NOTICE, updatedAt: 0 };
}

export function saveLocalNotice(noticeText: string, timestamp: number = Date.now()): void {
  if (typeof window === 'undefined' || !noticeText || !noticeText.trim()) return;
  const clean = noticeText.trim();
  const data: SiteNoticeData = { noticeText: clean, updatedAt: timestamp };

  try {
    localStorage.setItem(STORAGE_KEY, clean);
    localStorage.setItem(BACKUP_KEY, clean);
    localStorage.setItem(META_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('super_x_marquee_notice_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

export async function publishNotice(noticeText: string): Promise<SiteNoticeData> {
  const clean = noticeText.trim();
  const now = Date.now();
  saveLocalNotice(clean, now);

  // Sync to server backend
  try {
    await fetch('/api/site-notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noticeText: clean, updatedAt: now }),
    });
  } catch {}

  return { noticeText: clean, updatedAt: now };
}

export async function fetchAndSyncNotice(): Promise<SiteNoticeData> {
  const local = getLocalNoticeData();

  try {
    const res = await fetch('/api/site-notice');
    if (!res.ok) return local;

    const data = await res.json();
    if (data && data.success && data.noticeText) {
      const serverText = String(data.noticeText).trim();
      const serverTime = Number(data.updatedAt) || 0;

      // Anti-Reversion Guard:
      // If the server notice is the generic default and local notice is custom, do NOT overwrite!
      if (serverText === FALLBACK_NOTICE && local.noticeText !== FALLBACK_NOTICE && local.updatedAt > 0) {
        // Push local custom notice to server to fix server's stale data
        publishNotice(local.noticeText).catch(() => null);
        return local;
      }

      // If server timestamp is newer, accept server
      if (serverTime > local.updatedAt) {
        saveLocalNotice(serverText, serverTime);
        return { noticeText: serverText, updatedAt: serverTime };
      }

      // If local is newer, keep local and update server
      if (local.updatedAt > serverTime && local.noticeText.trim()) {
        publishNotice(local.noticeText).catch(() => null);
        return local;
      }
    }
  } catch {
    // If /api/site-notice failed, try static fallback public/site_notice.json (for Vercel)
    try {
      const staticRes = await fetch('/site_notice.json');
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        if (staticData && staticData.noticeText && local.noticeText === FALLBACK_NOTICE) {
          saveLocalNotice(staticData.noticeText, staticData.updatedAt || Date.now());
          return { noticeText: staticData.noticeText, updatedAt: staticData.updatedAt || Date.now() };
        }
      }
    } catch {}
  }

  return local;
}
