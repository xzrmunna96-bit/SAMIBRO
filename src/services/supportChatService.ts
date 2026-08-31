import { saveChatMessageToFirebase } from './firebaseSyncService';

export interface ChatMessage {
  id: string;
  userEmail: string;
  sender: 'user' | 'admin';
  senderName: string;
  text: string;
  timestamp: number;
  readByAdmin?: boolean;
  readByUser?: boolean;
}

const CHAT_STORAGE_KEY = 'super_x_sms_support_chats';
const CHAT_BACKUP_STORAGE_KEY = 'super_x_sms_support_chats_backup';
const CHAT_UPDATE_EVENT = 'superx_support_chat_update';

function loadRawChatMessages(key: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

// Get all chat messages from storage with backup merging
export function getAllSupportMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  
  const primary = loadRawChatMessages(CHAT_STORAGE_KEY);
  const backup = loadRawChatMessages(CHAT_BACKUP_STORAGE_KEY);

  const messageMap = new Map<string, ChatMessage>();
  
  // Merge by message ID
  backup.forEach((msg) => {
    if (msg && msg.id) messageMap.set(msg.id, msg);
  });
  primary.forEach((msg) => {
    if (msg && msg.id) messageMap.set(msg.id, msg);
  });

  const merged = Array.from(messageMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Sync back to both keys
  try {
    const serialized = JSON.stringify(merged);
    localStorage.setItem(CHAT_STORAGE_KEY, serialized);
    localStorage.setItem(CHAT_BACKUP_STORAGE_KEY, serialized);
  } catch {
    // ignore
  }

  return merged;
}

// Save chat messages and broadcast change
function saveAllSupportMessages(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(messages);
    localStorage.setItem(CHAT_STORAGE_KEY, serialized);
    localStorage.setItem(CHAT_BACKUP_STORAGE_KEY, serialized);
    window.dispatchEvent(new CustomEvent(CHAT_UPDATE_EVENT, { detail: { messages } }));
  } catch {
    // ignore
  }
}

// Listen for cross-tab chat changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CHAT_STORAGE_KEY || e.key === CHAT_BACKUP_STORAGE_KEY) {
      const messages = getAllSupportMessages();
      window.dispatchEvent(new CustomEvent(CHAT_UPDATE_EVENT, { detail: { messages } }));
    }
  });
}

// Get messages for a specific user email
export function getChatMessagesForUser(userEmail: string): ChatMessage[] {
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean) return [];
  const all = getAllSupportMessages();
  return all
    .filter((m) => m && m.userEmail && m.userEmail.toLowerCase() === clean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Save chat message to server database
export async function saveChatMessageToServer(msg: ChatMessage) {
  try {
    await fetch('/api/live-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });
  } catch (err) {
    console.warn('Failed to save chat message to server:', err);
  }
}

// Fetch live chats from server and merge with local storage
export async function fetchLiveChatsFromServer(): Promise<ChatMessage[]> {
  try {
    const res = await fetch('/api/live-chat');
    if (!res.ok) return [];
    const data = await res.json();
    if (data && data.success && Array.isArray(data.messages)) {
      const serverMsgs: ChatMessage[] = data.messages;
      const current = getAllSupportMessages();
      const msgMap = new Map<string, ChatMessage>();

      current.forEach((m) => {
        if (m && m.id) msgMap.set(m.id, m);
      });

      let hasNew = false;
      serverMsgs.forEach((m) => {
        if (m && m.id) {
          const existing = msgMap.get(m.id);
          if (!existing) {
            hasNew = true;
            msgMap.set(m.id, m);
          } else {
            // Update read flags if server has newer read state
            if (m.readByAdmin && !existing.readByAdmin) {
              existing.readByAdmin = true;
              hasNew = true;
            }
            if (m.readByUser && !existing.readByUser) {
              existing.readByUser = true;
              hasNew = true;
            }
          }
        }
      });

      if (hasNew) {
        const merged = Array.from(msgMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        saveAllSupportMessages(merged);
        return merged;
      }
    }
  } catch (err) {
    // console.warn('Failed to fetch live chats from server:', err);
  }
  return [];
}

// User sends a message to Admin
export function sendUserMessage(userEmail: string, userName: string, text: string): ChatMessage {
  const cleanEmail = userEmail.trim().toLowerCase();
  const cleanText = text.trim();
  const all = getAllSupportMessages();

  const msg: ChatMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userEmail: cleanEmail,
    sender: 'user',
    senderName: userName || cleanEmail.split('@')[0],
    text: cleanText,
    timestamp: Date.now(),
    readByAdmin: false,
    readByUser: true,
  };

  all.push(msg);
  saveAllSupportMessages(all);
  saveChatMessageToFirebase(msg);
  saveChatMessageToServer(msg);
  return msg;
}

// Admin sends a message to User
export function sendAdminMessage(userEmail: string, text: string): ChatMessage {
  const cleanEmail = userEmail.trim().toLowerCase();
  const cleanText = text.trim();
  const all = getAllSupportMessages();

  const msg: ChatMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userEmail: cleanEmail,
    sender: 'admin',
    senderName: 'System Admin',
    text: cleanText,
    timestamp: Date.now(),
    readByAdmin: true,
    readByUser: false,
  };

  all.push(msg);
  saveAllSupportMessages(all);
  saveChatMessageToFirebase(msg);
  saveChatMessageToServer(msg);
  return msg;
}

// Mark messages as read by Admin
export function markChatAsReadByAdmin(userEmail: string) {
  const clean = (userEmail || '').trim().toLowerCase();
  const all = getAllSupportMessages();
  let modified = false;

  all.forEach((m) => {
    if (m && m.userEmail && m.userEmail.toLowerCase() === clean && !m.readByAdmin) {
      m.readByAdmin = true;
      modified = true;
      saveChatMessageToFirebase(m);
    }
  });

  if (modified) {
    saveAllSupportMessages(all);
    fetch('/api/live-chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: clean, readBy: 'admin' }),
    }).catch(() => {});
  }
}

// Mark messages as read by User
export function markChatAsReadByUser(userEmail: string) {
  const clean = (userEmail || '').trim().toLowerCase();
  const all = getAllSupportMessages();
  let modified = false;

  all.forEach((m) => {
    if (m && m.userEmail && m.userEmail.toLowerCase() === clean && !m.readByUser) {
      m.readByUser = true;
      modified = true;
      saveChatMessageToFirebase(m);
    }
  });

  if (modified) {
    saveAllSupportMessages(all);
    fetch('/api/live-chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: clean, readBy: 'user' }),
    }).catch(() => {});
  }
}

// Automatic real-time background sync for live chat across sub-admins and users (every 3 seconds)
if (typeof window !== 'undefined') {
  fetchLiveChatsFromServer();
  setInterval(() => {
    fetchLiveChatsFromServer();
  }, 3000);
}

// Get total unread count for Admin across all users
export function getAdminUnreadChatCount(): number {
  const all = getAllSupportMessages();
  return all.filter((m) => m && m.sender === 'user' && !m.readByAdmin).length;
}

// Get total unread count for a specific user (admin messages unread by user)
export function getUserUnreadChatCount(userEmail: string): number {
  const clean = (userEmail || '').trim().toLowerCase();
  const all = getAllSupportMessages();
  return all.filter((m) => m && m.userEmail && m.userEmail.toLowerCase() === clean && m.sender === 'admin' && !m.readByUser).length;
}

// Get list of active conversations for Admin
export interface ChatConversationSummary {
  userEmail: string;
  userName: string;
  lastMessage: ChatMessage;
  unreadCount: number;
  totalMessages: number;
}

export function getAllChatConversations(): ChatConversationSummary[] {
  const all = getAllSupportMessages();
  const grouped = new Map<string, ChatMessage[]>();

  all.forEach((m) => {
    if (m && m.userEmail) {
      const key = m.userEmail.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(m);
    }
  });

  const list: ChatConversationSummary[] = [];

  grouped.forEach((messages, userEmail) => {
    messages.sort((a, b) => a.timestamp - b.timestamp);
    const last = messages[messages.length - 1];
    const userMsg = messages.find((m) => m.sender === 'user');
    const userName = userMsg ? userMsg.senderName : userEmail.split('@')[0];
    const unreadCount = messages.filter((m) => m.sender === 'user' && !m.readByAdmin).length;

    list.push({
      userEmail,
      userName,
      lastMessage: last,
      unreadCount,
      totalMessages: messages.length,
    });
  });

  // Sort by most recent message
  list.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
  return list;
}

export { CHAT_UPDATE_EVENT };
