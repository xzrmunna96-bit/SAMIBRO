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
  claimedByEmail?: string;
  claimedByName?: string;
  claimedAt?: number;
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

// Check if a user's chat is blocked by admin (24-hour block)
export function isUserChatBlocked(userEmail: string): boolean {
  if (typeof window === 'undefined') return false;
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean) return false;
  try {
    const raw = localStorage.getItem(`superx_chat_blocked_${clean}`);
    if (!raw) return false;
    const expiry = parseInt(raw, 10);
    if (isNaN(expiry)) return false;
    if (Date.now() < expiry) return true;
    localStorage.removeItem(`superx_chat_blocked_${clean}`);
  } catch {
    // ignore
  }
  return false;
}

// Block a user chat for 24 hours (or specified duration)
export function blockUserChat(userEmail: string, durationMs: number = 24 * 60 * 60 * 1000) {
  if (typeof window === 'undefined') return;
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean) return;
  const expiry = Date.now() + durationMs;
  try {
    localStorage.setItem(`superx_chat_blocked_${clean}`, expiry.toString());
  } catch {
    // ignore
  }
  sendAdminMessage(
    clean,
    `🚫 Your chat session has been closed by Support. Chat access is suspended for 24 hours.`,
    'System Support'
  );
}

// Unblock user chat
export function unblockUserChat(userEmail: string) {
  if (typeof window === 'undefined') return;
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean) return;
  try {
    localStorage.removeItem(`superx_chat_blocked_${clean}`);
  } catch {
    // ignore
  }
  sendAdminMessage(
    clean,
    `✅ Your chat session has been restored by Support. You can now send messages again.`,
    'System Support'
  );
}

// Perform Agent Handover with Dynamic Time-of-Day Greeting
export function handoverToAgent(userEmail: string, agentName: string) {
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean) return;

  const hour = new Date().getHours();
  let greetingEn = 'Good Day';
  let greetingBn = 'শুভ দিন';

  if (hour >= 5 && hour < 12) {
    greetingEn = 'Good Morning';
    greetingBn = 'শুভ সকাল';
  } else if (hour >= 12 && hour < 17) {
    greetingEn = 'Good Afternoon';
    greetingBn = 'শুভ অপরাহ্ণ';
  } else if (hour >= 17 && hour < 21) {
    greetingEn = 'Good Evening';
    greetingBn = 'শুভ সন্ধ্যা';
  } else {
    greetingEn = 'Good Night';
    greetingBn = 'শুভ রাত্রি';
  }

  const name = (agentName || '').trim() || 'Support Agent';

  sendAdminMessage(
    clean,
    `👋 ${greetingEn} / ${greetingBn}! Support Executive **${name}** has taken over your live chat session. How can we assist you today?`,
    name
  );
}

// Ensure automated initial bot welcome message for new chat sessions
export function ensureBotWelcomeMessage(userEmail: string, userName: string, lang: 'BN' | 'EN' = 'BN') {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (!cleanEmail) return;
  const msgs = getChatMessagesForUser(cleanEmail);
  if (msgs.length === 0) {
    if (lang === 'EN') {
      sendAdminMessage(
        cleanEmail,
        `👋 Welcome to SUPER X SMS Support Portal! I am SUPER X Bot (AI Assistant).\n\nHow may we help you today? Ask any questions regarding our portal, services, or CEO information.`,
        'SUPER X BOT'
      );
    } else {
      sendAdminMessage(
        cleanEmail,
        `👋 স্বাগতম SUPER X SMS লাইভ সাপোর্ট পোর্টালে! আমি সুপার এক্স সার্ভিস বট (AI Assistant)।\n\nআপনাকে কীভাবে সাহায্য করতে পারি? যেকোনো প্রশ্ন এখানে সরাসরি টাইপ করতে পারেন।`,
        'SUPER X BOT'
      );
    }
  }
}

// Process user input and generate intelligent automated bot replies
export function processBotResponse(userEmail: string, userName: string, userText: string, lang: 'BN' | 'EN' = 'BN') {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (!cleanEmail || !userText) return;

  // If chat is blocked, do not reply
  if (isUserChatBlocked(cleanEmail)) return;

  const q = userText.toLowerCase().trim();

  // 1. STRICT SECURITY GUARD: Block API keys / Secret internal data leaking
  if (
    q.includes('api') ||
    q.includes('এপিআই') ||
    q.includes('key') ||
    q.includes('secret') ||
    q.includes('token') ||
    q.includes('database') ||
    q.includes('password') ||
    q.includes('পাসওয়ার্ড') ||
    q.includes('কী')
  ) {
    setTimeout(() => {
      sendAdminMessage(
        cleanEmail,
        lang === 'EN'
          ? `🚫 SECURITY POLICY WARNING: Requesting private website API keys, internal secrets, or database credentials is strictly prohibited for user privacy and platform security.`
          : `🚫 সিকিউরিটি পলিসি ওয়ার্নিং: ওয়েবসাইটের প্রাইভেট এপিআই (API), সিক্রেট কী বা ডাটাবেজ তথ্য প্রদান করা সম্পূর্ণ নিষেধ।`,
        'SUPER X BOT'
      );
    }, 600);
    return;
  }

  // Check if admin chat stop command sent
  if (q === 'stop' || q === 'chat stop' || q === 'block chat') {
    return;
  }

  // 2. CEO & Executive Leadership Information
  if (
    q.includes('ceo') ||
    q.includes('সিইও') ||
    q.includes('মালিক') ||
    q.includes('ওনার') ||
    q.includes('owner') ||
    q.includes('founder') ||
    q.includes('ফাউন্ডার') ||
    q.includes('munna') ||
    q.includes('মুন্না') ||
    q.includes('who created') ||
    q.includes('creator')
  ) {
    setTimeout(() => {
      sendAdminMessage(
        cleanEmail,
        `👤 **EXECUTIVE LEADERSHIP & CEO DETAILS:**\n• **Founder & CEO:** XZR Munna\n• **Corporate HQ:** Khulna, Bangladesh\n• **Official Contact Email:** xzrmunna96@gmail.com\n\nSUPER X SMS is founded and led by XZR Munna as a high-reliability virtual SMS routing network.`,
        'SUPER X BOT'
      );
    }, 600);
    return;
  }

  // 3. Website & Services Enterprise Overview
  if (
    q.includes('ওয়েবসাইট') ||
    q.includes('ওয়েবসাইট') ||
    q.includes('সার্ভিস') ||
    q.includes('super x') ||
    q.includes('website') ||
    q.includes('about') ||
    q.includes('সম্পর্কে') ||
    q.includes('work') ||
    q.includes('how it works') ||
    q.includes('service')
  ) {
    setTimeout(() => {
      sendAdminMessage(
        cleanEmail,
        `🌐 **ABOUT SUPER X SMS GATEWAY:**\nSUPER X SMS is a premier, enterprise-grade automated virtual number gateway and SMS verification portal. We deliver 24/7 dedicated virtual carrier routes for global platforms including WhatsApp, Telegram, Facebook, Imo, TikTok, Google, Apple, and custom apps with real-time OTP delivery.`,
        'SUPER X BOT'
      );
    }, 600);
    return;
  }

  // 4. Escalation to Human Agent
  if (
    q.includes('agent') ||
    q.includes('এজেন্ট') ||
    q.includes('talk to human') ||
    q.includes('human') ||
    q.includes('মানুষ') ||
    q.includes('লাইভ') ||
    q.includes('support') ||
    q.includes('অ্যাডমিন') ||
    q.includes('admin') ||
    q.includes('help')
  ) {
    setTimeout(() => {
      sendAdminMessage(
        cleanEmail,
        lang === 'EN'
          ? `✅ Your inquiry has been escalated to our Support Executive queue. An available agent will connect shortly.`
          : `✅ আপনার মেসেজটি সাপোর্ট এজেন্টের কাছে পাঠানো হয়েছে। কিছুক্ষণের মধ্যেই একজন এজেন্ট যুক্ত হবেন।`,
        'SUPER X BOT'
      );

      // Broadcast alert to Telegram
      import('./telegramService').then(({ sendUserActivityToTelegram }) => {
        sendUserActivityToTelegram({
          action: '🚨 LIVE CHAT AGENT REQUEST',
          userEmail: cleanEmail,
          userName: userName || cleanEmail.split('@')[0],
          details: `User requested live support agent: "${userText}"`,
        }).catch(() => {});
      }).catch(() => {});
    }, 600);
    return;
  }

  // 5. Default General Enterprise Response
  setTimeout(() => {
    sendAdminMessage(
      cleanEmail,
      lang === 'EN'
        ? `🤖 Thank you for contacting SUPER X SMS Support. Type your question directly regarding our services, platform overview, or CEO details.`
        : `🤖 ধন্যবাদ আপনার বার্তার জন্য। আপনার প্রয়োজনীয় প্রশ্ন টাইপ করুন (যেমন: ওয়েবসাইট পরিচিতি, সিইও তথ্য, সাপোর্ট)।`,
      'SUPER X BOT'
    );
  }, 600);
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

  // Dispatch real-time activity alert to Telegram
  import('./telegramService').then(({ sendUserActivityToTelegram }) => {
    sendUserActivityToTelegram({
      action: '💬 LIVE CHAT MESSAGE',
      userEmail: cleanEmail,
      userName: userName || cleanEmail.split('@')[0],
      details: cleanText,
    }).catch(() => {});
  }).catch(() => {});

  // Trigger automated AI bot logic to evaluate and reply
  processBotResponse(cleanEmail, userName, cleanText);

  return msg;
}

// Claim a chat conversation by an Admin / Sub-Admin
export function claimChatConversation(userEmail: string, adminEmail: string, adminName: string) {
  const cleanUser = (userEmail || '').trim().toLowerCase();
  const cleanAdminEmail = (adminEmail || '').trim().toLowerCase();
  const cleanAdminName = (adminName || 'Admin').trim();

  if (!cleanUser) return;

  const all = getAllSupportMessages();
  let modified = false;

  all.forEach((m) => {
    if (m && m.userEmail && m.userEmail.toLowerCase() === cleanUser) {
      m.claimedByEmail = cleanAdminEmail;
      m.claimedByName = cleanAdminName;
      m.claimedAt = Date.now();
      modified = true;
    }
  });

  if (modified) {
    saveAllSupportMessages(all);
    fetch('/api/live-chat/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: cleanUser,
        claimedByEmail: cleanAdminEmail,
        claimedByName: cleanAdminName,
      }),
    }).catch(() => {});
  }
}

// Admin sends a message to User
export function sendAdminMessage(userEmail: string, text: string, senderName: string = 'System Admin'): ChatMessage {
  const cleanEmail = userEmail.trim().toLowerCase();
  const cleanText = text.trim();
  const all = getAllSupportMessages();

  const msg: ChatMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userEmail: cleanEmail,
    sender: 'admin',
    senderName: senderName || 'System Admin',
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
  claimedByEmail?: string;
  claimedByName?: string;
  claimedAt?: number;
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

    // Find claim information from messages
    const claimedMsg = messages.slice().reverse().find((m) => m.claimedByName);

    list.push({
      userEmail,
      userName,
      lastMessage: last,
      unreadCount,
      totalMessages: messages.length,
      claimedByEmail: claimedMsg?.claimedByEmail,
      claimedByName: claimedMsg?.claimedByName,
      claimedAt: claimedMsg?.claimedAt,
    });
  });

  // Sort by most recent message
  list.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
  return list;
}

// Send typing status to server
export async function sendTypingStatus(userEmail: string, isTyping: boolean, who: 'user' | 'admin', name: string) {
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean) return;
  try {
    await fetch('/api/live-chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: clean, isTyping, who, name }),
    });
  } catch {
    // ignore
  }
}

// Fetch current typing status for a user conversation
export async function fetchTypingStatus(userEmail: string): Promise<{ isTyping: boolean; who?: string; name?: string }> {
  const clean = (userEmail || '').trim().toLowerCase();
  if (!clean) return { isTyping: false };
  try {
    const res = await fetch(`/api/live-chat/typing?userEmail=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      return data || { isTyping: false };
    }
  } catch {
    // ignore
  }
  return { isTyping: false };
}

export { CHAT_UPDATE_EVENT };
