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
    .filter((m) => m.userEmail.toLowerCase() === clean)
    .sort((a, b) => a.timestamp - b.timestamp);
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
  return msg;
}

// Mark messages as read by Admin
export function markChatAsReadByAdmin(userEmail: string) {
  const clean = (userEmail || '').trim().toLowerCase();
  const all = getAllSupportMessages();
  let modified = false;

  all.forEach((m) => {
    if (m.userEmail.toLowerCase() === clean && !m.readByAdmin) {
      m.readByAdmin = true;
      modified = true;
      saveChatMessageToFirebase(m);
    }
  });

  if (modified) {
    saveAllSupportMessages(all);
  }
}

// Mark messages as read by User
export function markChatAsReadByUser(userEmail: string) {
  const clean = (userEmail || '').trim().toLowerCase();
  const all = getAllSupportMessages();
  let modified = false;

  all.forEach((m) => {
    if (m.userEmail.toLowerCase() === clean && !m.readByUser) {
      m.readByUser = true;
      modified = true;
      saveChatMessageToFirebase(m);
    }
  });

  if (modified) {
    saveAllSupportMessages(all);
  }
}

// Get total unread count for Admin across all users
export function getAdminUnreadChatCount(): number {
  const all = getAllSupportMessages();
  return all.filter((m) => m.sender === 'user' && !m.readByAdmin).length;
}

// Get total unread count for a specific user (admin messages unread by user)
export function getUserUnreadChatCount(userEmail: string): number {
  const clean = (userEmail || '').trim().toLowerCase();
  const all = getAllSupportMessages();
  return all.filter((m) => m.userEmail.toLowerCase() === clean && m.sender === 'admin' && !m.readByUser).length;
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
    const key = m.userEmail.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(m);
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
