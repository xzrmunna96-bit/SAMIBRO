import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Lock,
  Unlock,
  Shield,
  Send,
  User,
  Clock,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ChevronRight,
  Eye,
  Trash2,
  Check,
  Zap,
  Bot,
  HelpCircle,
  FileText,
  Key
} from "lucide-react";

interface SupportChatAdminProps {
  userRole: string;
  userEmail: string;
}

interface ChatMessage {
  id?: string;
  sender: "user" | "admin";
  senderName?: string;
  userEmail: string;
  text: string;
  timestamp: number;
}

interface CustomButtons {
  getNumber: string;
  rangeFiles: string;
  liveSupport: string;
  adminPanel: string;
  stats: string;
  notice: string;
  userManagement: string;
}

// Special Premium Emoji Codes Map for instant selection
const PREMIUM_EMOJI_CODES = [
  { code: "PREM-CROWN-77", emoji: "👑", name: "Imperial Crown", animation: "animate-bounce" },
  { code: "PREM-STAR-99", emoji: "⭐", name: "Glittering Star", animation: "animate-pulse" },
  { code: "PREM-BOLT-22", emoji: "⚡", name: "Supercharged Volt", animation: "animate-pulse" },
  { code: "PREM-FIRE-33", emoji: "🔥", name: "Blazing Flame", animation: "animate-bounce" },
  { code: "PREM-GEM-11", emoji: "💎", name: "Sparkling Diamond", animation: "animate-spin [animation-duration:3s]" },
  { code: "PREM-MAGIC-44", emoji: "🔮", name: "Magic Portal Orb", animation: "animate-pulse" }
];

export const SupportChatAdmin: React.FC<SupportChatAdminProps> = ({ userRole, userEmail }) => {
  // Passcode verification
  const [passcode, setPasscode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("superx_support_admin_unlocked") === "true";
    } catch {
      return false;
    }
  });
  const [passcodeError, setPasscodeError] = useState("");

  // Tabs: "simulator" | "chats"
  const [activeTab, setActiveTab] = useState<"simulator" | "chats">("simulator");

  // Custom Buttons State
  const [customButtons, setCustomButtons] = useState<CustomButtons>({
    getNumber: "📱 Get Number",
    rangeFiles: "📁 File",
    liveSupport: "💬 Live Support Chat",
    adminPanel: "🔑 Admin 2FA Code",
    stats: "📊 Stats",
    notice: "📢 Notice & Broadcast",
    userManagement: "👥 User Management",
  });
  const [loadingButtons, setLoadingButtons] = useState(false);
  const [updatingButton, setUpdatingButton] = useState<keyof CustomButtons | null>(null);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [customTextPreview, setCustomTextPreview] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // Chats state
  const [allChats, setAllChats] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Search filter for chats
  const [searchQuery, setSearchQuery] = useState("");

  // Load custom buttons & chats on mount
  useEffect(() => {
    if (isUnlocked) {
      fetchCustomButtons();
      fetchChats();
      // Auto-poll chats every 5 seconds for real-time responsiveness
      const interval = setInterval(fetchChats, 5000);
      return () => clearInterval(interval);
    }
  }, [isUnlocked]);

  const fetchCustomButtons = async () => {
    try {
      setLoadingButtons(true);
      const res = await fetch("/api/telegram/custom-buttons");
      const data = await res.json();
      if (data.success && data.customButtons) {
        setCustomButtons(data.customButtons);
      }
    } catch (e) {
      console.error("Error fetching custom buttons:", e);
    } finally {
      setLoadingButtons(false);
    }
  };

  const fetchChats = async () => {
    try {
      if (loadingChats) return; // Prevent double trigger
      const res = await fetch("/api/live-chat");
      const data = await res.json();
      if (data.success && data.messages) {
        setAllChats(data.messages);
      }
    } catch (e) {
      console.error("Error fetching live chats:", e);
    }
  };

  // Lock panel
  const handleLockPanel = () => {
    setIsUnlocked(false);
    localStorage.removeItem("superx_support_admin_unlocked");
    setPasscode("");
    setPasscodeError("");
  };

  // Unlock panel
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === "MUNNA12061") {
      setIsUnlocked(true);
      localStorage.setItem("superx_support_admin_unlocked", "true");
      setPasscodeError("");
    } else {
      setPasscodeError("ভুল সিক্রেট পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ডটি পুনরায় লিখুন।");
    }
  };

  // Handle premium customization trigger
  const handleOpenCustomizer = (key: keyof CustomButtons) => {
    setUpdatingButton(key);
    // Find if the button currently has any premium emoji prefix
    const currentName = customButtons[key];
    setCustomTextPreview(currentName);
    setCustomCodeInput("");
    setSaveStatus("");
  };

  // Apply Premium Code
  const handleApplyPremiumCode = async (code: string) => {
    if (!updatingButton) return;
    const matched = PREMIUM_EMOJI_CODES.find((c) => c.code === code || c.emoji === code);
    let finalEmoji = code; // default fallback is raw emoji
    if (matched) {
      finalEmoji = matched.emoji;
    }

    // Clean original name of any previous emojis
    const rawNames: Record<keyof CustomButtons, string> = {
      getNumber: "Get Number",
      rangeFiles: "Range / Files",
      liveSupport: "Live Support",
      adminPanel: "Admin Panel (2F)",
      stats: "Stats",
      notice: "Notice & Broadcast",
      userManagement: "User Management",
    };
    const originalText = rawNames[updatingButton];
    const newText = `${finalEmoji} ${originalText}`;

    try {
      const updatedConfig = { ...customButtons, [updatingButton]: newText };
      const res = await fetch("/api/telegram/custom-buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      const data = await res.json();
      if (data.success && data.customButtons) {
        setCustomButtons(data.customButtons);
        setCustomTextPreview(newText);
        setSaveStatus("প্রিমিয়াম বাটন সফলভাবে কনফিগার করা হয়েছে!");
        setTimeout(() => {
          setUpdatingButton(null);
          setSaveStatus("");
        }, 1500);
      }
    } catch (e) {
      console.error("Error saving button configuration:", e);
      setSaveStatus("সংরক্ষণ করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
    }
  };

  // Submit custom code form
  const handleCustomCodeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCodeInput.trim()) return;
    handleApplyPremiumCode(customCodeInput.trim());
  };

  // Send Reply Message
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedUserEmail) return;

    try {
      setSendingReply(true);
      const res = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            sender: "admin",
            senderName: "SUPER X ADMIN",
            userEmail: selectedUserEmail,
            text: replyText.trim(),
            timestamp: Date.now()
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        fetchChats();
      }
    } catch (e) {
      console.error("Error sending reply:", e);
    } finally {
      setSendingReply(false);
    }
  };

  // Group chats by unique users
  const uniqueUsers = Array.from(new Set(allChats.map((c) => c.userEmail.toLowerCase())))
    .filter(Boolean)
    .map((email) => {
      const userMessages = allChats.filter((c) => c.userEmail.toLowerCase() === email);
      const lastMessage = userMessages[userMessages.length - 1];
      return {
        email,
        lastMsgText: lastMessage?.text || "",
        lastMsgTime: lastMessage?.timestamp || Date.now(),
        unreadCount: userMessages.filter((m) => m.sender === "user").length, // simple unread logic
      };
    })
    .sort((a, b) => b.lastMsgTime - a.lastMsgTime);

  // Filter users by search query
  const filteredUsers = uniqueUsers.filter((u) => u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  // Get active chat logs for selected user
  const activeChatMessages = allChats.filter(
    (c) => c.userEmail.toLowerCase() === selectedUserEmail.toLowerCase()
  );

  // Parse button names to display correct premium animated emojis
  const renderPremiumButton = (key: keyof CustomButtons, baseLabel: string, colorClass: string) => {
    const fullText = customButtons[key] || baseLabel;
    const firstChar = fullText.split(" ")[0];
    const restText = fullText.substring(firstChar.length).trim();

    // Check if the prefix character is an emoji
    const isEmoji = /\p{Emoji}/u.test(firstChar);
    const matchedEmojiConfig = PREMIUM_EMOJI_CODES.find((c) => c.emoji === firstChar);
    const animationClass = matchedEmojiConfig ? matchedEmojiConfig.animation : "animate-pulse";

    return (
      <button
        type="button"
        onClick={() => handleOpenCustomizer(key)}
        className={`relative group px-4 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide transition active:scale-95 flex items-center justify-center gap-2 border shadow-lg cursor-pointer ${colorClass}`}
      >
        {isEmoji && (
          <span className={`text-base sm:text-lg inline-block filter drop-shadow-md ${animationClass}`}>
            {firstChar}
          </span>
        )}
        <span>{isEmoji ? restText : fullText}</span>
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
          <Sparkles className="w-3.5 h-3.5 text-white animate-spin [animation-duration:4s]" />
        </div>
      </button>
    );
  };

  // Locked Lockscreen View
  if (!isUnlocked) {
    return (
      <div className="w-full min-h-[75vh] flex items-center justify-center py-8 px-4 animate-fadeIn bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-md rounded-3xl border border-slate-800 p-8 text-center relative z-10 shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/20">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>

          <h2 className="text-xl font-black text-white tracking-wide uppercase">
            Live Support & Control Gate
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            এই প্যানেলের মাধ্যমে বটের কাস্টমাইজেশন, প্রিমিয়াম ইমোজি এবং লাইভ সাপোর্ট চ্যাট সেশন রিয়েল-টাইমে নিয়ন্ত্রণ করা যায়। প্রবেশাধিকারের জন্য সিক্রেট পাসওয়ার্ড দিন।
          </p>

          <form onSubmit={handleVerifyPasscode} className="mt-6 space-y-4">
            <div className="relative">
              <input
                type="password"
                placeholder="Enter Admin Secret Password..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-2xl px-4 py-3.5 text-center font-mono text-sm tracking-widest text-white placeholder-slate-600 focus:outline-none transition duration-150"
              />
              <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>

            {passcodeError && (
              <p className="text-[11px] font-semibold text-rose-500 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-xl">
                ⚠️ {passcodeError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-500/15 active:scale-95 transition cursor-pointer"
            >
              Verify Passcode
            </button>
          </form>

          <div className="mt-6 border-t border-slate-900 pt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Lock className="w-3 h-3 text-rose-500" />
            <span>2FA Encrypted Authentication</span>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked Dashboard Layout
  return (
    <div className="w-full space-y-6 py-4 animate-fadeIn">
      {/* Upper header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-500 animate-pulse" />
            <span>Premium Control & Live Support Panel</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time customization dashboard to change bot buttons layout with beautiful animative premium icons and reply user chats instantly.
          </p>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("simulator")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "simulator"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🤖 Bot Simulator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chats")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "chats"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              💬 Support Inbox
              {allChats.length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {allChats.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleLockPanel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-extrabold text-xs rounded-xl border border-slate-800 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Lock Screen</span>
          </button>
        </div>
      </div>

      {/* TABS CONTAINER */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* SIMULATOR LAYOUT COL (Left) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            {/* Telegram Bot Phone Simulator Mockup */}
            <div className="w-full max-w-[340px] bg-[#0f172a] rounded-[40px] p-3 border-[6px] border-slate-800 shadow-2xl relative">
              {/* Speaker & Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-900 rounded-full" />
              </div>

              {/* simulated screen area */}
              <div className="w-full bg-[#182232] rounded-[32px] pt-7 pb-4 px-3 flex flex-col justify-between min-h-[460px] relative overflow-hidden">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

                {/* Top Telegram Bar */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-black text-xs text-white">
                    SX
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1">
                      <span>SUPER X SMS CONTROL</span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    </h4>
                    <p className="text-[9px] text-slate-400">bot runs 24/7 online</p>
                  </div>
                </div>

                {/* Chat Flow Scroll Area */}
                <div className="flex-1 py-3 overflow-y-auto space-y-2.5 relative z-10 text-[10px]">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-slate-300">
                    👋 <b>আসসালামু আলাইকুম!</b><br />
                    সুপার এক্স ওটিপি সিস্টেমে আপনাকে স্বাগতম। আপনি এখান থেকে দেশভিত্তিক ওটিপি নাম্বারের রেঞ্জ এবং প্রিমিয়াম লাইভ চ্যাট নিয়ন্ত্রণ করতে পারেন।
                  </div>
                  <div className="bg-indigo-950/70 border border-indigo-900/30 rounded-xl p-2 text-indigo-200">
                    ⚡ <i>প্রতিটি বাটন আকাশী, ব্লু ও লাল রঙে সুসজ্জিত করতে নিচের কিবোর্ডে ক্লিক করে প্রিমিয়াম কোড বসান।</i>
                  </div>
                </div>

                {/* Simulated Premium Keyboard Area with Sky, Blue, Red buttons */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800 relative z-10">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">
                    📋 BOT KEYBOARD MENU (CLICK BUTTON TO EDIT)
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Sky blue style */}
                    {renderPremiumButton(
                      "getNumber",
                      "📱 Get Number",
                      "bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white border-sky-400/40 shadow-sky-500/10"
                    )}
                    {/* Deep Blue style */}
                    {renderPremiumButton(
                      "rangeFiles",
                      "📁 File",
                      "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-500/40 shadow-blue-500/10"
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Indigo/Slate style */}
                    {renderPremiumButton(
                      "stats",
                      "📊 Stats",
                      "bg-gradient-to-r from-slate-800 to-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700/60 shadow-inner"
                    )}
                    {/* Sky Blue style */}
                    {renderPremiumButton(
                      "liveSupport",
                      "💬 Live Chat",
                      "bg-gradient-to-r from-sky-600 via-sky-500 to-sky-700 hover:from-sky-500 text-white border-sky-400/30"
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Red style */}
                    {renderPremiumButton(
                      "adminPanel",
                      "🔑 Admin 2F",
                      "bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white border-red-400/40 shadow-red-500/10"
                    )}
                    {/* Indigo style */}
                    {renderPremiumButton(
                      "userManagement",
                      "👥 Users",
                      "bg-gradient-to-r from-indigo-800 via-violet-800 to-indigo-900 hover:from-indigo-700 text-white border-indigo-700/30"
                    )}
                  </div>

                  {/* Centered Notice bottom bar */}
                  {renderPremiumButton(
                    "notice",
                    "📢 Notice & Broadcast",
                    "w-full bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMIZER CONFIGURATOR COL (Right) */}
          <div className="lg:col-span-7 space-y-6">
            {updatingButton ? (
              <div className="bg-slate-950 text-white rounded-3xl border border-indigo-500/30 p-6 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Configure Premium Button Layout</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Choose an animated premium logo or enter your own custom code.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUpdatingButton(null)}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 transition"
                  >
                    ✕
                  </button>
                </div>

                {/* Current Item Profile */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Button Key</span>
                      <code className="text-xs font-mono text-amber-400 font-bold">{updatingButton}</code>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Live Button Preview</span>
                      <span className="text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-white font-extrabold inline-block mt-1 font-mono">
                        {customTextPreview}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Selection Grid for Animated Emojis */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    ⭐ Select Premium Animative Logo Code
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PREMIUM_EMOJI_CODES.map((emojiObj) => (
                      <button
                        key={emojiObj.code}
                        type="button"
                        onClick={() => {
                          setCustomCodeInput(emojiObj.code);
                          handleApplyPremiumCode(emojiObj.code);
                        }}
                        className="p-3 rounded-2xl bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 text-left transition duration-150 flex items-center justify-between group active:scale-98 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`text-xl ${emojiObj.animation}`}>
                            {emojiObj.emoji}
                          </span>
                          <div>
                            <span className="text-xs font-extrabold block text-slate-200">{emojiObj.name}</span>
                            <span className="text-[9px] font-mono text-slate-500 block">{emojiObj.code}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Customization Code Field */}
                <form onSubmit={handleCustomCodeFormSubmit} className="mt-6 border-t border-slate-900 pt-5 space-y-3">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    ✍️ Manual Premium Code Input
                  </label>
                  <p className="text-[10px] text-slate-400">
                    পাসপোর্ট সাইজ বা প্রিমিয়াম কোড লিখুন অথবা সরাসরি যেকোনো কাস্টম ইমোজি পেস্ট করে দিতে পারেন।
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. PREM-CROWN-77 or 🔥"
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition active:scale-95 cursor-pointer"
                    >
                      Apply Code
                    </button>
                  </div>
                </form>

                {saveStatus && (
                  <div className="mt-4 px-4 py-2 bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{saveStatus}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sliders className="w-5 h-5 shrink-0" />
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    Real-time Customize Guide
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  বামপাশের টেলিগ্রাম বট সিমুলেটরের যেকোনো বাটনের উপরে ক্লিক করলেই সাথে সাথে কাস্টমাইজ প্যানেলটি সক্রিয় হবে। সেখানে প্রিমিয়াম কোড নম্বর সেট করলেই বাটনটিতে রিয়েল-টাইম এনিমেটেড ইমোজি বা লোগো যুক্ত হয়ে যাবে।
                </p>

                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    🔐 Premium System Rules:
                  </h4>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                    <li><b>Sky blue</b> gradient matches number allocations.</li>
                    <li><b>Blue</b> gradient highlights range/files upload.</li>
                    <li><b>Red</b> is preserved for important secure modules like 2FA.</li>
                    <li>Premium logos and animative crowns instantly mirror inside Telegram in real-time.</li>
                  </ul>
                </div>

                {/* Status Indicator */}
                <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-extrabold animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sync Server Endpoint Status: Connected</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "chats" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {/* USER CHAT LIST COLUMN (Left 4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-200 flex flex-col min-h-[500px]">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search user inbox by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto max-h-[450px] divide-y divide-slate-100">
              {loadingChats && uniqueUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Loading chats logs from database...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 px-4">
                  কোনো সক্রিয় সাপোর্ট চ্যাট মেসেজ পাওয়া যায়নি।
                </div>
              ) : (
                filteredUsers.map((userObj) => {
                  const isSelected = selectedUserEmail.toLowerCase() === userObj.email.toLowerCase();
                  return (
                    <button
                      key={userObj.email}
                      type="button"
                      onClick={() => setSelectedUserEmail(userObj.email)}
                      className={`w-full p-4 text-left transition duration-150 flex items-start gap-3 cursor-pointer ${
                        isSelected ? "bg-slate-50 border-l-4 border-indigo-600" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200 font-extrabold text-xs">
                        {userObj.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 truncate block max-w-[130px]">
                            {userObj.email}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {new Date(userObj.lastMsgTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-1">
                          {userObj.lastMsgText}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE MESSAGES AREA COLUMN (Right 8 cols) */}
          <div className="lg:col-span-8 flex flex-col min-h-[500px]">
            {selectedUserEmail ? (
              <div className="flex flex-col h-full flex-1 justify-between">
                {/* Header Profile Info */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-black">
                      {selectedUserEmail.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 font-mono">
                        {selectedUserEmail}
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Support Session Active</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserEmail("");
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Close Log
                  </button>
                </div>

                {/* Messages scroll list */}
                <div className="flex-1 p-5 overflow-y-auto max-h-[340px] space-y-3.5 bg-slate-50/40">
                  {activeChatMessages.map((msg, i) => {
                    const isAdmin = msg.sender === "admin";
                    return (
                      <div
                        key={msg.id || i}
                        className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl p-3.5 text-xs shadow-xs relative ${
                            isAdmin
                              ? "bg-slate-900 text-white rounded-br-none"
                              : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                          }`}
                        >
                          <div className="font-bold text-[9px] text-slate-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                            <span>{isAdmin ? "Manager Reply" : "User Support Link"}</span>
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="leading-relaxed font-semibold">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Reply Box */}
                <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-white">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Type support reply for ${selectedUserEmail}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {sendingReply ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Reply</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 py-20 bg-slate-50/50">
                <MessageSquare className="w-12 h-12 text-slate-300 animate-bounce mb-3" />
                <h4 className="text-sm font-black text-slate-800">No User Selected</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  বামপাশের তালিকা থেকে যেকোনো ব্যবহারকারীর ইমেইল বা অ্যাকাউন্ট কোড নির্বাচন করে তার মেসেজ লগ দেখুন এবং সরাসরি চ্যাট সাপোর্ট দিন।
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
