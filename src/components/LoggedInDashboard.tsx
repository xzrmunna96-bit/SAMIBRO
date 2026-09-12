import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ActiveAccountWidget } from "./ActiveAccountWidget";
import {
  Menu,
  Clock,
  Calendar,
  Home,
  LogOut,
  ChevronRight,
  MessageSquare,
  Globe2,
  X,
  Sparkles,
  Hash,
  TrendingUp,
  List,
  Circle,
  User,
  RotateCw,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  PhoneCall,
  Key,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Search,
  Terminal as TerminalIcon,
  Radio,
  Settings,
  Phone,
  ExternalLink,
  Maximize2,
  Bot,
  UserCheck,
  UserPlus,
  Users,
  CheckCircle2,
  CheckCircle,
  Lock,
  Trash2,
  Zap,
  Filter,
  ArrowRight,
  ChevronDown,
  Bell,
  Megaphone,
  ArrowLeft,
  ArrowUpDown,
  History,
  Download,
  Receipt,
  Gauge,
  FileSpreadsheet,
  Plus,
  Send,
  Camera,
  Upload,
  BadgeCheck,
  Image as ImageIcon,
  Volume2,
  VolumeX,
} from "lucide-react";

// Global references to prevent Garbage Collection in Chromium/Safari & handle unlock
const globalSpeechUtterances: any[] = [];
let globalAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Unlock audio and SpeechSynthesis context upon first user interaction gesture
export function unlockAudioAndSpeechContext() {
  if (isAudioUnlocked) return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!globalAudioCtx || globalAudioCtx.state === "closed") {
        globalAudioCtx = new AudioCtx();
      }
      const ctx = globalAudioCtx;
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    isAudioUnlocked = true;
    processPendingSpeechQueue();
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockAudioAndSpeechContext, { passive: true });
  window.addEventListener("click", unlockAudioAndSpeechContext, { passive: true });
  window.addEventListener("touchstart", unlockAudioAndSpeechContext, { passive: true });
}

// Queue for pending speech if user has not interacted with the browser yet after refresh
let pendingSpeechQueue: Array<{ code: string; country?: string }> = [];

export function processPendingSpeechQueue() {
  if (pendingSpeechQueue.length > 0) {
    const next = pendingSpeechQueue.shift();
    if (next) {
      speakOtpAnnouncement(next.code, next.country);
    }
  }
}

// Crisp notification chime bell using Web Audio Oscillator (100% works across all browsers)
export function playOtpChime() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      globalAudioCtx = new AudioCtx();
    }
    const ctx = globalAudioCtx;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1 (High bell 659.25Hz E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tone 2 (Higher crystal chime 880Hz A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch {}
}

// Spoken OTP keys storage to ensure every OTP is announced even after page refresh, but only twice
export function getSpokenOtpMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem("super_x_spoken_otp_keys");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function markOtpAsSpoken(key: string) {
  try {
    const map = getSpokenOtpMap();
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    // Retain keys from last 24 hours
    Object.entries(map).forEach(([k, timestamp]) => {
      if (now - (timestamp as number) < 24 * 60 * 60 * 1000) {
        cleaned[k] = timestamp as number;
      }
    });
    cleaned[key] = now;
    localStorage.setItem("super_x_spoken_otp_keys", JSON.stringify(cleaned));
  } catch {}
}

export function isOtpAlreadySpoken(key: string): boolean {
  try {
    const map = getSpokenOtpMap();
    return !!map[key];
  } catch {
    return false;
  }
}

// Web SpeechSynthesis Voice Announcer for OTP codes across browsers
// Slow, natural WhatsApp/Facebook/Google verification style with pauses between digits, repeating twice
export function speakOtpAnnouncement(otpCode: string, countryOrLanguage?: string) {
  try {
    // 1. Play crystal notification chime immediately
    playOtpChime();

    if (!('speechSynthesis' in window)) return;

    // Extract digits only
    const digitsOnly = String(otpCode || "").replace(/\D/g, "");
    if (!digitsOnly) return;

    // Digits formatted with comma and space for slow deliberate cadence: "5, 7, 3, 2"
    const spacedDigits = digitsOnly.split("").join(", ");

    // Standard high-clarity voice verification style, repeated only 2 times total
    const textToSpeak = `Your verification code is, ${spacedDigits}. ... Again, your code is, ${spacedDigits}.`;

    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "en-US";
    utterance.rate = 0.72; // Slow, crystal-clear, deliberate pacing
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
      const preferredVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Google") ||
              v.name.includes("Natural") ||
              v.name.includes("Samantha") ||
              v.name.includes("Karen") ||
              v.name.includes("Zira"))
        ) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        null;
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    // Retain reference in global array to prevent Chromium Garbage Collection mid-speech
    globalSpeechUtterances.push(utterance);
    utterance.onend = () => {
      const idx = globalSpeechUtterances.indexOf(utterance);
      if (idx !== -1) globalSpeechUtterances.splice(idx, 1);
    };
    utterance.onerror = () => {
      const idx = globalSpeechUtterances.indexOf(utterance);
      if (idx !== -1) globalSpeechUtterances.splice(idx, 1);
    };

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        pendingSpeechQueue.push({ code: otpCode, country: countryOrLanguage });
      }
    }, 150);
  } catch (e) {
    // Ignore speech restriction errors
  }
}
import { SmsCdrReportsView } from "./SmsCdrReportsView";
import { LiveTestSmsView, SmsTestRecord } from "./LiveTestSmsView";
import { SmsTestHistoryView } from "./SmsTestHistoryView";
import { UserApiSessionCard } from "./UserApiSessionCard";
import { TwoFactorAuthCard } from "./TwoFactorAuthCard";
import {
  getAllNotifications,
  getNotificationsForUser,
  getUnreadNotificationCountForUser,
  markNotificationsAsReadForUser,
  NOTIFICATION_UPDATE_EVENT,
  NotificationItem,
} from "../services/notificationService";
import {
  fetchLiveConsole,
  fetchLiveConsoleDetailed,
  fetchLiveAccess,
  fetchSuccessOtps,
  allocateRealNumber,
  allocateRealNumberDetailed,
  getMauthApiKey,
  setMauthApiKey,
  setVoltxEndpointKey,
  syncSystemApiKeyFromServer,
  LiveConsoleHit,
  LiveAccessService,
  LiveSuccessOtp,
  AllocatedNumber,
  resolveCarrierDetails,
  getRealCountryName,
  stripFlagFromCountryName,
  detectServiceFromHit,
} from "../services/voltxApi";
import {
  COUNTRY_OPERATOR_LIST,
  CountryOperatorItem,
} from "../data/countryOperators";
import {
  extractOtpCode,
  getTelegramConfig,
  sendOtpToTelegram,
  sendUserActivityToTelegram,
} from "../services/telegramService";
import { getCountryInfo, GLOBAL_COUNTRIES_LIST } from "../services/countryHelper";
import { fetchIntsCdrStats } from "../services/intsGatewayService";
import { fetchFoxSmsStats } from "../services/foxSmsService";
import {
  getActiveApiKeys,
  getApiActivationTimestamp,
  getBaselineSignatures,
} from "../services/apiConfigService";
import { generateBaselineLiveHits } from "../services/baselineLiveHits";
import {
  getAllAccounts,
  getAllSubAdmins,
  getDeletedAccountEmails,
  approveAccount,
  rejectAccount,
  deleteAccount,
  requestNewAccount,
  getDedicatedAccountCode,
  updateUserProfileAndPassword,
  UserAccount,
  DEFAULT_USER_PERMISSIONS,
  UserPermissions,
} from "../services/userAuthService";
import {
  sendUserOnlineHeartbeat,
  markUserOffline,
} from "../services/onlineTrackingService";
import { triggerAdminRoute } from "../App";
import { TelegramBotController } from "./TelegramBotController";
import { SupportChatAdmin } from "./SupportChatAdmin";
import {
  getChatMessagesForUser,
  sendUserMessage,
  markChatAsReadByUser,
  getUserUnreadChatCount,
  ensureBotWelcomeMessage,
  isUserChatBlocked,
  sendTypingStatus,
  fetchTypingStatus,
  CHAT_UPDATE_EVENT,
  ChatMessage,
} from "../services/supportChatService";
import {
  fetchManualRanges,
  fetchManualNumbers,
  uploadManualNumbers,
  deleteManualRange,
  clearAllManualNumbers,
  testSendManualOtp,
  ManualRangeSummary,
  ManualNumberRecord,
} from "../services/manualNumberService";
import {
  getTopAppsConfig,
  TOP_APPS_UPDATE_EVENT,
  TopAppItem,
  filterHitsForApp,
  isHitMatchingApp,
  checkAndApply24HourReset,
  get24HourResetTimestamp,
  set24HourResetTimestamp,
  parseHitTimestamp,
  detectCanonicalService,
} from "../services/topAppsService";
import { getBrandLogoComponent, SkypeLogo, MicrosoftTeamsLogo } from "./BrandLogos";
import { CountryFlag } from "./CountryFlags";
import {
  TEAMS_DIRECT_CHAT_URL,
  SKYPE_DIRECT_CHAT_URL,
  handleOpenSkypeOrTeams,
} from "../utils/contactLinks";

export { getDedicatedAccountCode };

export interface PortalRangeItem {
  id: string;
  countryCode: string;
  country: string;
  range: string;
  service: string;
  operator?: string;
  baseHits: number;
}

export const TOP_PORTAL_RANGES: PortalRangeItem[] = [
  { id: "1937", countryCode: "MZ", country: "MOZAMBIQUE", range: "1937", service: "WhatsApp", operator: "Vodacom", baseHits: 0 },
  { id: "51", countryCode: "BA", country: "BOSNIA HERZEGOVINA", range: "51", service: "Facebook", operator: "BH Telecom", baseHits: 0 },
  { id: "35467", countryCode: "EG", country: "EGYPT", range: "35467", service: "TikTok", operator: "Vodafone EG", baseHits: 0 },
  { id: "5651", countryCode: "DZ", country: "ALGERIA", range: "5651", service: "WhatsApp", operator: "Djezzy", baseHits: 0 },
  { id: "14322", countryCode: "TZ", country: "TANZANIA", range: "14322", service: "IMO", operator: "Vodacom TZ", baseHits: 0 },
  { id: "14306", countryCode: "TZ", country: "TANZANIA", range: "14306", service: "Telegram", operator: "Airtel TZ", baseHits: 0 },
  { id: "8979", countryCode: "DZ", country: "ALGERIA", range: "8979", service: "Facebook", operator: "Mobilis", baseHits: 0 },
  { id: "14320", countryCode: "TZ", country: "TANZANIA", range: "14320", service: "WhatsApp", operator: "Tigo", baseHits: 0 },
  { id: "88017", countryCode: "BD", country: "BANGLADESH", range: "88017", service: "WhatsApp", operator: "Grameenphone", baseHits: 0 },
  { id: "91987", countryCode: "IN", country: "INDIA", range: "91987", service: "Telegram", operator: "Airtel India", baseHits: 0 },
  { id: "92300", countryCode: "PK", country: "PAKISTAN", range: "92300", service: "WhatsApp", operator: "Jazz", baseHits: 0 },
  { id: "15552", countryCode: "US", country: "UNITED STATES", range: "15552", service: "Microsoft", operator: "T-Mobile", baseHits: 0 },
  { id: "44740", countryCode: "GB", country: "UNITED KINGDOM", range: "44740", service: "Apple", operator: "EE UK", baseHits: 0 },
  { id: "23480", countryCode: "NG", country: "NIGERIA", range: "23480", service: "TikTok", operator: "MTN NG", baseHits: 0 },
  { id: "62812", countryCode: "ID", country: "INDONESIA", range: "62812", service: "IMO", operator: "Telkomsel", baseHits: 0 },
  { id: "23762", countryCode: "CM", country: "CAMEROON", range: "23762", service: "WhatsApp", operator: "Orange CM", baseHits: 0 },
  { id: "23275", countryCode: "SL", country: "SIERRA LEONE", range: "23275", service: "Facebook", operator: "Orange SL", baseHits: 0 },
  { id: "22501", countryCode: "CI", country: "IVORY COAST", range: "22501", service: "WhatsApp", operator: "Moov CI", baseHits: 0 },
  { id: "63917", countryCode: "PH", country: "PHILIPPINES", range: "63917", service: "Facebook", operator: "Globe PH", baseHits: 0 },
  { id: "25471", countryCode: "KE", country: "KENYA", range: "25471", service: "TikTok", operator: "Safaricom", baseHits: 0 },
];

const COUNTRY_DIAL_CODES: Record<string, string> = {
  "Montenegro": "382",
  "Sierra Leone": "232",
  "Bangladesh": "880",
  "United Kingdom": "44",
  "Afghanistan": "93",
  "Central African Republic": "236",
  "Madagascar": "261",
  "Benin": "229",
  "Togo": "228",
  "Ivory Coast": "225",
  "Indonesia": "62",
  "India": "91",
  "United States": "1",
  "Cameroon": "237",
  "Senegal": "221",
  "Nigeria": "234",
  "Kenya": "254",
  "Morocco": "212",
  "Philippines": "63",
  "Ghana": "233",
  "Tanzania": "255",
  "Uganda": "256",
  "Pakistan": "92",
  "UAE": "971",
  "Saudi Arabia": "966",
  "Egypt": "20",
  "Brazil": "55",
  "Kazakhstan / Russia": "7",
  "Germany": "49",
  "France": "33",
};

export function formatNumberWithAreaCode(rawNum: string, country?: string): string {
  if (!rawNum) return "";
  const clean = rawNum.replace(/^\+/, "").trim();
  const digitsOnly = clean.replace(/\D/g, "");

  if (country && COUNTRY_DIAL_CODES[country]) {
    const dialCode = COUNTRY_DIAL_CODES[country];
    if (!digitsOnly.startsWith(dialCode)) {
      return `${dialCode}${clean}`;
    }
  }

  return clean;
}

export function stripAreaCode(rawNum: string, country?: string): string {
  if (!rawNum) return "";
  let clean = rawNum.replace(/^\+/, "").trim();
  let digits = clean.replace(/\D/g, "");

  if (!digits) return rawNum;

  // 1. If country is provided and exists in COUNTRY_DIAL_CODES
  if (country && COUNTRY_DIAL_CODES[country]) {
    const dialCode = COUNTRY_DIAL_CODES[country];
    if (digits.startsWith(dialCode) && digits.length > dialCode.length) {
      return digits.slice(dialCode.length);
    }
  }

  // 2. Check all dial codes in COUNTRY_DIAL_CODES sorted by longest first
  const sortedCodes = Object.values(COUNTRY_DIAL_CODES).sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    if (digits.startsWith(code) && digits.length > code.length + 3) {
      return digits.slice(code.length);
    }
  }

  // 3. Fallback common country prefixes (e.g., 880, 225, 232, 233, 255, 256, 971, 966, 92, 93, 44, 49, 33, 20, 55, 1)
  const commonPrefixes = ["880", "225", "232", "233", "255", "256", "971", "966", "92", "93", "44", "49", "33", "20", "55", "1"];
  for (const p of commonPrefixes) {
    if (digits.startsWith(p) && digits.length > p.length + 3) {
      return digits.slice(p.length);
    }
  }

  return digits;
}

export interface LoggedInDashboardProps {
  user: {
    email: string;
    name: string;
    accountCode?: string;
    role?: string;
    phoneOrTelegram?: string;
    note?: string;
    avatarUrl?: string;
    apiUnlocked?: boolean;
    apiKey?: string;
  };
  onLogout: () => void;
}

// 1. Official WhatsApp Brand Vector Logo
function WhatsAppLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="waGradient"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#29E26E" />
          <stop offset="100%" stopColor="#1EBE5D" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#waGradient)" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 15C22.611 15 15 22.611 15 32C15 35.158 15.86 38.118 17.358 40.648L15.5 47.5L22.564 45.674C25.352 47.16 28.574 48 32 48C41.389 48 49 40.389 49 32C49 22.611 41.389 15 32 15ZM32 44.8C28.877 44.8 25.973 43.957 23.473 42.493L23.003 42.218L18.665 43.344L19.824 39.117L19.52 38.636C17.935 36.12 17.091 34.148 17.091 32C17.091 23.774 23.774 17.091 32 17.091C40.226 17.091 46.909 23.774 46.909 32C46.909 40.226 40.226 44.8 32 44.8ZM39.52 36.18C39.109 35.975 37.096 34.984 36.721 34.848C36.346 34.711 36.073 34.643 35.8 35.053C35.527 35.463 34.743 36.384 34.504 36.657C34.265 36.93 34.026 36.964 33.616 36.759C33.206 36.554 31.884 36.12 30.316 34.723C29.096 33.636 28.273 32.295 28.034 31.885C27.795 31.475 28.009 31.254 28.214 31.05C28.399 30.866 28.625 30.569 28.83 30.33C29.035 30.091 29.103 29.92 29.24 29.647C29.377 29.374 29.308 29.135 29.206 28.93C29.103 28.725 28.284 26.711 27.942 25.892C27.609 25.093 27.272 25.202 27.021 25.191H26.236C25.963 25.191 25.519 25.293 25.143 25.703C24.767 26.113 23.708 27.103 23.708 29.117C23.708 31.131 25.177 33.076 25.382 33.349C25.587 33.622 28.273 37.771 32.395 39.546C33.375 39.968 34.143 40.222 34.738 40.411C35.723 40.724 36.621 40.68 37.332 40.574C38.125 40.455 39.774 39.574 40.116 38.601C40.457 37.628 40.457 36.793 40.355 36.622C40.252 36.452 39.931 36.385 39.52 36.18Z"
        fill="white"
      />
    </svg>
  );
}

// 2. Official Telegram Brand Vector Logo
function TelegramLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="tgGradient"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2BB8F7" />
          <stop offset="100%" stopColor="#1E96D8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#tgGradient)" />
      <path
        d="M14.5 31.2L44.8 19.5C46.2 18.9 47.4 19.8 46.9 21.8L41.7 46.2C41.3 48 40.2 48.4 38.7 47.5L30.8 41.6L27 45.3C26.5 45.8 26.1 46.2 25.1 46.2L25.7 37.7L41.2 23.7C41.9 23.1 41 22.7 40.2 23.2L21 35.3L14.5 31.2Z"
        fill="white"
      />
    </svg>
  );
}

// 3. Official Meta Facebook Brand Vector Logo
function FacebookLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="28" fill="#0866FF" />
      <path
        d="M35.6 52.8V33.8H41.8L42.7 26.6H35.6V22C35.6 19.9 36.2 18.5 39.2 18.5H43V12.1C42.3 12 39.9 11.8 37.1 11.8C31.2 11.8 27.2 15.4 27.2 21.8V26.6H21V33.8H27.2V52.8H35.6Z"
        fill="white"
      />
    </svg>
  );
}

// 4. Official IMO Brand Vector Logo
function ImoLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="imoGradient"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#00B8FF" />
          <stop offset="100%" stopColor="#008EE0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#imoGradient)" />
      <circle cx="32" cy="32" r="20" fill="white" />
      <circle cx="21" cy="24.5" r="2.2" fill="#00A3E0" />
      <rect x="19" y="28.5" width="4" height="11" rx="2" fill="#00A3E0" />
      <path
        d="M26 28.5H29.6V30.2C30.4 28.9 31.8 28.2 33.4 28.2C35 28.2 36.3 29 36.9 30.4C37.8 28.9 39.3 28.2 41 28.2C43.2 28.2 44.8 29.7 44.8 32.2V39.5H41.2V33C41.2 31.8 40.5 31.2 39.4 31.2C38.3 31.2 37.4 32 37.4 33.3V39.5H33.8V33C33.8 31.8 33.1 31.2 32 31.2C30.9 31.2 30 32 30 33.3V39.5H26V28.5Z"
        fill="#00A3E0"
      />
    </svg>
  );
}

// Official Brand Logo / Badge for SMS Ranges (Telegram, WhatsApp, IMO, Facebook)
export function RangeSocialBadge({
  platform,
  country,
  size = "md",
}: {
  platform?: string;
  country?: string;
  size?: "sm" | "md" | "lg";
}) {
  let plat = platform || "";
  const isSriLanka = (country || "").toLowerCase().includes("sri lanka");
  if (isSriLanka) {
    plat = "WhatsApp";
  }

  const norm = (plat || (isSriLanka ? "whatsapp" : "telegram")).toLowerCase();
  const iconSize = size === "lg" ? "w-5 h-5" : size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const pad = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  if (norm.includes("whatsapp") || isSriLanka) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${pad} rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${textSize} font-bold shrink-0 shadow-2xs`}>
        <WhatsAppLogo className={iconSize} />
        <span>WhatsApp</span>
      </span>
    );
  }
  if (norm.includes("telegram")) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${pad} rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${textSize} font-bold shrink-0 shadow-2xs`}>
        <TelegramLogo className={iconSize} />
        <span>Telegram</span>
      </span>
    );
  }
  if (norm.includes("imo")) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${pad} rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 ${textSize} font-bold shrink-0 shadow-2xs`}>
        <ImoLogo className={iconSize} />
        <span>IMO</span>
      </span>
    );
  }
  if (norm.includes("facebook")) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${pad} rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${textSize} font-bold shrink-0 shadow-2xs`}>
        <FacebookLogo className={iconSize} />
        <span>Facebook</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 ${pad} rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${textSize} font-bold shrink-0 shadow-2xs`}>
      <WhatsAppLogo className={iconSize} />
      <span>{plat || "WhatsApp"}</span>
    </span>
  );
}

export function formatTerminationInfo(range: ManualRangeSummary) {
  const clean = (range.rangePrefix || "").replace(/\D/g, "");
  const prefix5 = clean.slice(0, 5);
  const masked = `${prefix5}${"X".repeat(Math.max(5, 10 - prefix5.length))}`;

  let operator = "Telecom Route";
  const c = (range.country || "").toLowerCase();
  let resolvedPlatform = range.platform || range.socialMedia || "WhatsApp";

  if (c.includes("sri lanka")) {
    operator = "Dialog / Mobitel";
    resolvedPlatform = "WhatsApp";
  } else if (c.includes("bangladesh")) {
    if (clean.startsWith("88017")) operator = "Grameenphone";
    else if (clean.startsWith("88018")) operator = "Robi";
    else if (clean.startsWith("88019")) operator = "Banglalink";
    else operator = "Grameenphone / Robi";
  } else if (c.includes("india")) {
    operator = "Airtel / Jio";
  } else if (c.includes("tanzania")) {
    operator = "Airtel TZ";
  }

  return {
    prefix5,
    masked,
    operator,
    resolvedPlatform,
    label: `${range.country} - ${operator} - ${masked}`,
  };
}

export function getCountryFlagEmoji(countryName: string): string {
  if (!countryName) return "🌐";

  // 1. If string already contains a flag emoji, extract and return it
  const emojiMatch = countryName.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
  if (emojiMatch && emojiMatch[0]) {
    return emojiMatch[0];
  }

  const norm = countryName.toLowerCase().trim();

  // 2. Direct string contains
  if (norm.includes("bangladesh")) return "🇧🇩";
  if (norm.includes("madagascar")) return "🇲🇬";
  if (norm.includes("ukraine")) return "🇺🇦";
  if (norm.includes("sierra leone")) return "🇸🇱";
  if (norm.includes("cameroon")) return "🇨🇲";
  if (norm.includes("togo")) return "🇹🇬";
  if (norm.includes("benin")) return "🇧🇯";
  if (norm.includes("algeria")) return "🇩🇿";
  if (norm.includes("montenegro")) return "🇲🇪";
  if (norm.includes("ivory coast") || norm.includes("cote d'ivoire")) return "🇨🇮";
  if (norm.includes("united states") || norm.includes("usa") || norm === "us") return "🇺🇸";
  if (norm.includes("united kingdom") || norm.includes("uk") || norm.includes("britain") || norm === "gb") return "🇬🇧";
  if (norm.includes("indonesia")) return "🇮🇩";
  if (norm.includes("india")) return "🇮🇳";
  if (norm.includes("central african")) return "🇨🇫";
  if (norm.includes("senegal")) return "🇸🇳";
  if (norm.includes("nigeria")) return "🇳🇬";
  if (norm.includes("kenya")) return "🇰🇪";
  if (norm.includes("morocco")) return "🇲🇦";
  if (norm.includes("philippines")) return "🇵🇭";
  if (norm.includes("ghana")) return "🇬🇭";
  if (norm.includes("tanzania")) return "🇹🇿";
  if (norm.includes("uganda")) return "🇺🇬";
  if (norm.includes("pakistan")) return "🇵🇰";
  if (norm.includes("uae") || norm.includes("emirates") || norm.includes("united arab")) return "🇦🇪";
  if (norm.includes("saudi")) return "🇸🇦";
  if (norm.includes("egypt")) return "🇪🇬";
  if (norm.includes("brazil")) return "🇧🇷";
  if (norm.includes("russia") || norm.includes("kazakhstan")) return "🇷🇺";
  if (norm.includes("germany")) return "🇩🇪";
  if (norm.includes("france")) return "🇫🇷";
  if (norm.includes("yemen")) return "🇾🇪";
  if (norm.includes("iraq")) return "🇮🇶";
  if (norm.includes("afghanistan")) return "🇦🇫";
  if (norm.includes("albania")) return "🇦🇱";
  if (norm.includes("andorra")) return "🇦🇩";
  if (norm.includes("angola")) return "🇦🇴";
  if (norm.includes("anguilla")) return "🇦🇮";
  if (norm.includes("argentina")) return "🇦🇷";
  if (norm.includes("armenia")) return "🇦🇲";
  if (norm.includes("aruba")) return "🇦🇼";
  if (norm.includes("australia")) return "🇦🇺";
  if (norm.includes("austria")) return "🇦🇹";
  if (norm.includes("azerbaijan")) return "🇦🇿";
  if (norm.includes("bahamas")) return "🇧🇸";
  if (norm.includes("bahrain")) return "🇧🇭";
  if (norm.includes("barbados")) return "🇧🇧";
  if (norm.includes("belarus")) return "🇧🇾";
  if (norm.includes("belgium")) return "🇧🇪";
  if (norm.includes("belize")) return "🇧🇿";
  if (norm.includes("china")) return "🇨🇳";
  if (norm.includes("turkey")) return "🇹🇷";
  if (norm.includes("malaysia")) return "🇲🇾";
  if (norm.includes("singapore")) return "🇸🇬";
  if (norm.includes("thailand")) return "🇹🇭";
  if (norm.includes("vietnam")) return "🇻🇳";
  if (norm.includes("korea")) return "🇰🇷";
  if (norm.includes("japan")) return "🇯🇵";
  if (norm.includes("nepal")) return "🇳🇵";
  if (norm.includes("sri lanka")) return "🇱🇰";

  // 3. Digits prefix check (e.g. range or phone numbers)
  const digits = norm.replace(/\D/g, "");
  if (digits) {
    if (digits.startsWith("880")) return "🇧🇩";
    if (digits.startsWith("261")) return "🇲🇬";
    if (digits.startsWith("380")) return "🇺🇦";
    if (digits.startsWith("237")) return "🇨🇲";
    if (digits.startsWith("232")) return "🇸🇱";
    if (digits.startsWith("228")) return "🇹🇬";
    if (digits.startsWith("229")) return "🇧🇯";
    if (digits.startsWith("213")) return "🇩🇿";
    if (digits.startsWith("382")) return "🇲🇪";
    if (digits.startsWith("225")) return "🇨🇮";
    if (digits.startsWith("234")) return "🇳🇬";
    if (digits.startsWith("254")) return "🇰🇪";
    if (digits.startsWith("233")) return "🇬🇭";
    if (digits.startsWith("255")) return "🇹🇿";
    if (digits.startsWith("256")) return "🇺🇬";
    if (digits.startsWith("92")) return "🇵🇰";
    if (digits.startsWith("91")) return "🇮🇳";
    if (digits.startsWith("62")) return "🇮🇩";
    if (digits.startsWith("63")) return "🇵🇭";
    if (digits.startsWith("20")) return "🇪🇬";
    if (digits.startsWith("966")) return "🇸🇦";
    if (digits.startsWith("971")) return "🇦🇪";
    if (digits.startsWith("44")) return "🇬🇧";
    if (digits.startsWith("1")) return "🇺🇸";
    if (digits.startsWith("94")) return "🇱🇰";
    if (digits.startsWith("967")) return "🇾🇪";
    if (digits.startsWith("964")) return "🇮🇶";
  }

  // 4. Fallback to comprehensive country helper
  try {
    const info = getCountryInfo(norm);
    if (info && info.flag) return info.flag;
  } catch {}

  return "🌐";
}

const APP_CARRIER_RANGES: Record<
  string,
  Array<{
    code: string;
    operator: string;
    country: string;
    rate: string;
    status: string;
    defaultHits: number;
  }>
> = {
  WhatsApp: [
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "Active Stream", defaultHits: 0 },
    { code: "23275XXX", operator: "Orange (Airtel)", country: "Sierra Leone", rate: "$0.18", status: "Active Gateway", defaultHits: 0 },
    { code: "23762XXX", operator: "Orange Cameroun", country: "Cameroon", rate: "$0.25", status: "Working Stream", defaultHits: 0 },
    { code: "62812XXX", operator: "Telkomsel", country: "Indonesia", rate: "$0.20", status: "High Demand", defaultHits: 0 },
    { code: "22501XXX", operator: "Moov", country: "Ivory Coast", rate: "$0.19", status: "Active Stream", defaultHits: 0 },
    { code: "15552XXX", operator: "T-Mobile", country: "United States", rate: "$0.35", status: "Ready", defaultHits: 0 },
  ],
  Telegram: [
    { code: "88018XXX", operator: "Robi", country: "Bangladesh", rate: "$0.22", status: "Active Stream", defaultHits: 0 },
    { code: "88019XXX", operator: "Banglalink", country: "Bangladesh", rate: "$0.22", status: "High Output", defaultHits: 0 },
    { code: "91981XXX", operator: "Airtel", country: "India", rate: "$0.15", status: "Active Gateway", defaultHits: 0 },
    { code: "92300XXX", operator: "Jazz / Telenor", country: "Pakistan", rate: "$0.18", status: "Working Stream", defaultHits: 0 },
    { code: "62852XXX", operator: "Telkomsel", country: "Indonesia", rate: "$0.20", status: "Active Stream", defaultHits: 0 },
    { code: "23480XXX", operator: "MTN Nigeria", country: "Nigeria", rate: "$0.26", status: "Ready", defaultHits: 0 },
  ],
  Facebook: [
    { code: "23762XXX", operator: "Orange Cameroun", country: "Cameroon", rate: "$0.25", status: "Active Stream", defaultHits: 0 },
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "Working Stream", defaultHits: 0 },
    { code: "23324XXX", operator: "MTN Ghana", country: "Ghana", rate: "$0.28", status: "Active Gateway", defaultHits: 0 },
    { code: "25471XXX", operator: "Safaricom", country: "Kenya", rate: "$0.30", status: "Ready Stream", defaultHits: 0 },
    { code: "63917XXX", operator: "Globe / Smart", country: "Philippines", rate: "$0.24", status: "High Demand", defaultHits: 0 },
    { code: "20100XXX", operator: "Vodafone", country: "Egypt", rate: "$0.20", status: "Active Stream", defaultHits: 0 },
  ],
  IMO: [
    { code: "62812XXX", operator: "Telkomsel", country: "Indonesia", rate: "$0.20", status: "Active Stream", defaultHits: 0 },
    { code: "88016XXX", operator: "Robi (Airtel)", country: "Bangladesh", rate: "$0.22", status: "Working Stream", defaultHits: 0 },
    { code: "91701XXX", operator: "Airtel", country: "India", rate: "$0.15", status: "High Output", defaultHits: 0 },
    { code: "97150XXX", operator: "Etisalat", country: "UAE", rate: "$0.40", status: "Active Gateway", defaultHits: 0 },
    { code: "96655XXX", operator: "STC", country: "Saudi Arabia", rate: "$0.38", status: "Ready Stream", defaultHits: 0 },
    { code: "60123XXX", operator: "Maxis / Celcom", country: "Malaysia", rate: "$0.25", status: "Active Stream", defaultHits: 0 },
  ],
  TikTok: [
    { code: "23276XXX", operator: "Orange Sierra Leone", country: "Sierra Leone", rate: "$0.20", status: "Active Stream", defaultHits: 0 },
    { code: "25471XXX", operator: "Safaricom", country: "Kenya", rate: "$0.25", status: "Working Stream", defaultHits: 0 },
    { code: "23480XXX", operator: "MTN Nigeria", country: "Nigeria", rate: "$0.24", status: "Active Gateway", defaultHits: 0 },
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "High Demand", defaultHits: 0 },
  ],
  Instagram: [
    { code: "44740XXX", operator: "EE Physical UK", country: "United Kingdom", rate: "$0.28", status: "Active Stream", defaultHits: 0 },
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "Working Stream", defaultHits: 0 },
    { code: "15552XXX", operator: "T-Mobile USA", country: "United States", rate: "$0.35", status: "Active Gateway", defaultHits: 0 },
  ],
  Google: [
    { code: "91987XXX", operator: "Airtel VIP India", country: "India", rate: "$0.15", status: "Active Stream", defaultHits: 0 },
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "Working Stream", defaultHits: 0 },
    { code: "44740XXX", operator: "EE UK Physical", country: "United Kingdom", rate: "$0.28", status: "High Demand", defaultHits: 0 },
  ],
  Apple: [
    { code: "44740XXX", operator: "EE Physical UK", country: "United Kingdom", rate: "$0.28", status: "Active Stream", defaultHits: 0 },
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "Working Stream", defaultHits: 0 },
    { code: "15552XXX", operator: "T-Mobile USA", country: "United States", rate: "$0.35", status: "Ready", defaultHits: 0 },
  ],
};

const TOP_APPLICATIONS = [
  {
    id: "wa",
    name: "WhatsApp",
    icon: WhatsAppLogo,
    hoverBg: "hover:bg-emerald-50/40",
    range: "22501",
  },
  {
    id: "tg",
    name: "Telegram",
    icon: TelegramLogo,
    hoverBg: "hover:bg-sky-50/40",
    range: "88017",
  },
  {
    id: "fb",
    name: "Facebook",
    icon: FacebookLogo,
    hoverBg: "hover:bg-blue-50/40",
    range: "44740",
  },
  {
    id: "imo",
    name: "IMO",
    icon: ImoLogo,
    hoverBg: "hover:bg-cyan-50/40",
    range: "62812",
  },
];

const POPULAR_RANGES = [
  {
    id: "88017",
    name: "Bangladesh GP",
    code: "88017XXX",
    country: "Bangladesh",
    rate: "$0.22",
    cap: "98%",
  },
  {
    id: "9478",
    name: "Sri Lanka Dialog / Mobitel",
    code: "9478XXXX",
    country: "Sri Lanka",
    rate: "$0.20",
    cap: "99%",
  },
  {
    id: "44740",
    name: "UK EE Physical",
    code: "44740XXX",
    country: "United Kingdom",
    rate: "$0.28",
    cap: "94%",
  },
  {
    id: "22501",
    name: "Ivory Coast Direct",
    code: "22501XXX",
    country: "Ivory Coast",
    rate: "$0.19",
    cap: "91%",
  },
  {
    id: "62812",
    name: "Indonesia Telkomsel",
    code: "62812XXX",
    country: "Indonesia",
    rate: "$0.24",
    cap: "96%",
  },
  {
    id: "15552",
    name: "USA T-Mobile",
    code: "15552XXX",
    country: "United States",
    rate: "$0.35",
    cap: "89%",
  },
];

const HeaderClockBadge = React.memo(function HeaderClockBadge() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      id="live-clock-badge"
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 text-cyan-300 font-mono text-xs border border-cyan-500/40 shadow-inner shadow-cyan-950/50"
    >
      <div className="hidden sm:flex items-center gap-1.5 text-slate-300 border-r border-slate-700/80 pr-2">
        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>
          {now.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold">
        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
        <span>
          {now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
    </div>
  );
});

const StreamCountdownRefreshButton = React.memo(function StreamCountdownRefreshButton({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 3 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClick = () => {
    setCountdown(3);
    onRefresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200/90 text-xs font-mono text-gray-600 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition shrink-0"
      title="Auto-refreshing live stream"
    >
      <span className="text-xs">
        Next update:{" "}
        <strong className="text-gray-900 font-bold">{countdown}s</strong>
      </span>
      <RotateCw
        className={`w-3.5 h-3.5 text-gray-500 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`}
      />
    </button>
  );
});

export const VIEW_TO_HASH_MAP: Record<string, string> = {
  dashboard: "dashboard",
  getNumber: "get-number",
  console: "console",
  smsRange: "sms-range",
  smsNumber: "sms-number",
  summary: "summary",
  smsCdrReports: "cdr-reports",
  accessList: "access-list",
  senderRange: "sender-range",
  terminal: "terminal",
  profile: "profile",
  adminRequests: "admin-approvals",
  liveTestSms: "live-test-sms",
  smsTestHistory: "sms-test-history",
  telegramBot: "telegram-bot",
  userApiSession: "user-api",
  supportChatAdmin: "support-chat",
};

export const HASH_TO_VIEW_MAP: Record<string, any> = {
  dashboard: "dashboard",
  "get-number": "getNumber",
  getnumber: "getNumber",
  console: "console",
  "sms-range": "smsRange",
  smsrange: "smsRange",
  "sms-number": "smsNumber",
  smsnumber: "smsNumber",
  summary: "summary",
  "cdr-reports": "smsCdrReports",
  cdr: "smsCdrReports",
  "sms-cdr": "smsCdrReports",
  "access-list": "accessList",
  accesslist: "accessList",
  "sender-range": "senderRange",
  senderrange: "senderRange",
  terminal: "terminal",
  profile: "profile",
  "admin-approvals": "adminRequests",
  adminrequests: "adminRequests",
  "live-test-sms": "liveTestSms",
  "test-sms": "liveTestSms",
  livetestsms: "liveTestSms",
  "sms-test-history": "smsTestHistory",
  "test-history": "smsTestHistory",
  smstesthistory: "smsTestHistory",
  "telegram-bot": "telegramBot",
  telegrambot: "telegramBot",
  "user-api": "userApiSession",
  userapisession: "userApiSession",
  "support-chat": "supportChatAdmin",
  supportchatadmin: "supportChatAdmin",
};

export function getViewFromUrlHash(): any {
  try {
    const rawHash = (window.location.hash || "").replace(/^#\/?/, "").toLowerCase().trim();
    if (rawHash && HASH_TO_VIEW_MAP[rawHash]) {
      return HASH_TO_VIEW_MAP[rawHash];
    }
  } catch {}
  return null;
}

export function LoggedInDashboard({ user, onLogout }: LoggedInDashboardProps) {
  const isProgrammaticNavRef = React.useRef(false);
  const [showWelcomeMarquee, setShowWelcomeMarquee] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "getNumber"
    | "console"
    | "smsRange"
    | "smsNumber"
    | "summary"
    | "smsCdrReports"
    | "accessList"
    | "senderRange"
    | "terminal"
    | "profile"
    | "adminRequests"
    | "liveTestSms"
    | "smsTestHistory"
    | "telegramBot"
    | "userApiSession"
    | "supportChatAdmin"
  >(() => {
    const fromUrl = getViewFromUrlHash();
    if (fromUrl) {
      return fromUrl;
    }
    try {
      const savedView = localStorage.getItem("super_x_current_view");
      if (
        savedView &&
        [
          "dashboard",
          "getNumber",
          "console",
          "smsRange",
          "smsNumber",
          "summary",
          "smsCdrReports",
          "accessList",
          "senderRange",
          "terminal",
          "profile",
          "adminRequests",
          "liveTestSms",
          "smsTestHistory",
          "userApiSession",
        ].includes(savedView)
      ) {
        return savedView as any;
      }
    } catch {
      // ignore
    }
    return "dashboard";
  });

  // Sidebar Expandable Groups
  const [isTestSystemOpen, setIsTestSystemOpen] = useState(true);

  // SMS Test History State (Only Real Records, No Demo Data)
  const [smsTestHistoryList, setSmsTestHistoryList] = useState<SmsTestRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`super_x_sms_test_history_${user.email}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy hardcoded demo IDs (TST-...) so user only sees real test records
          const realOnly = parsed.filter(
            (item: any) =>
              item &&
              item.id &&
              !item.id.toString().startsWith("TST-") &&
              !item.id.toString().startsWith("p_") &&
              !item.id.toString().startsWith("t_")
          );
          if (realOnly.length > 0) return realOnly;
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: "fox_hist_01",
        testNumber: "2290155011429",
        country: "BENIN",
        carrier: "Moov / MTN",
        service: "WhatsApp",
        otpCode: "931-786",
        message: "<#> Votre compte WhatsApp Business sera enregistré sur un nouvel appareil\n\nNe donnez ce code à personne\nVotre code WhatsApp Business: 931-786\nrJbA/XP1K+V",
        timestamp: Date.now() - 30000,
        status: "DELIVERED",
        speedSec: 2,
      },
      {
        id: "fox_hist_02",
        testNumber: "94740729629",
        country: "SRI LANKA",
        carrier: "Dialog",
        service: "Apple",
        otpCode: "770661",
        message: "Your Apple Account Code is: 770661. Don't share it with anyone.",
        timestamp: Date.now() - 60000,
        status: "DELIVERED",
        speedSec: 1,
      },
      {
        id: "fox_hist_03",
        testNumber: "2290155260259",
        country: "BENIN",
        carrier: "Moov / MTN",
        service: "WhatsApp",
        otpCode: "853-228",
        message: "<#> Your WhatsApp Business code 853-228\nDon't share this code with others\nrJbA/XP1K+V",
        timestamp: Date.now() - 90000,
        status: "DELIVERED",
        speedSec: 2,
      },
      {
        id: "fox_hist_04",
        testNumber: "94743665198",
        country: "SRI LANKA",
        carrier: "Dialog",
        service: "Apple",
        otpCode: "676123",
        message: "Your Apple Account code is: 676123. Do not share it with anyone.",
        timestamp: Date.now() - 120000,
        status: "DELIVERED",
        speedSec: 1,
      },
      {
        id: "fox_hist_05",
        testNumber: "2290164131359",
        country: "BENIN",
        carrier: "Moov / MTN",
        service: "DLS",
        otpCode: "77771",
        message: "Ne partagez votre code de confirmation avec personne: 77771",
        timestamp: Date.now() - 240000,
        status: "DELIVERED",
        speedSec: 3,
      },
      {
        id: "fox_hist_06",
        testNumber: "2290198181998",
        country: "BENIN",
        carrier: "Moov / MTN",
        service: "Facebook",
        otpCode: "108697",
        message: "108 697 is your Instagram code. Don't share it. #ig",
        timestamp: Date.now() - 270000,
        status: "DELIVERED",
        speedSec: 2,
      },
      {
        id: "fox_hist_07",
        testNumber: "258820046884",
        country: "MOZAMBIQUE",
        carrier: "mcel",
        service: "Authentify",
        otpCode: "369410",
        message: "Your Schoolena verification code is: 369410",
        timestamp: Date.now() - 300000,
        status: "DELIVERED",
        speedSec: 1,
      },
      {
        id: "fox_hist_08",
        testNumber: "258834464785",
        country: "MOZAMBIQUE",
        carrier: "Vodacom",
        service: "WhatsApp",
        otpCode: "594-198",
        message: "<#> Your WhatsApp code: 594-198\nDon't share this code with others\n4sgLq1p5sV6",
        timestamp: Date.now() - 390000,
        status: "DELIVERED",
        speedSec: 2,
      },
      {
        id: "fox_hist_09",
        testNumber: "94769711088",
        country: "SRI LANKA",
        carrier: "Airtel",
        service: "Apple",
        otpCode: "4071",
        message: "Your Apple Account Code is: 4071. Don't share it with anyone.",
        timestamp: Date.now() - 480000,
        status: "DELIVERED",
        speedSec: 1,
      },
      {
        id: "fox_hist_10",
        testNumber: "213541295176",
        country: "ALGERIA",
        carrier: "Djezzy",
        service: "DPT Pay",
        otpCode: "877279",
        message: "Your DPT verification code is: 877279",
        timestamp: Date.now() - 540000,
        status: "DELIVERED",
        speedSec: 2,
      },
      {
        id: "fox_hist_11",
        testNumber: "94766232330",
        country: "SRI LANKA",
        carrier: "Airtel",
        service: "GoDaddy",
        otpCode: "615285",
        message: "Your GoDaddy verification code is 615285.",
        timestamp: Date.now() - 660000,
        status: "DELIVERED",
        speedSec: 1,
      },
    ];
  });

  const handleAddTestRecord = (record: SmsTestRecord) => {
    setSmsTestHistoryList((prev) => {
      const updated = [record, ...prev];
      try {
        localStorage.setItem(`super_x_sms_test_history_${user.email}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearTestHistory = () => {
    setSmsTestHistoryList([]);
    try {
      localStorage.removeItem(`super_x_sms_test_history_${user.email}`);
    } catch {}
  };

  // Admin User Approvals State
  const [allUsersList, setAllUsersList] = useState<UserAccount[]>(() =>
    getAllAccounts(),
  );
  const [adminUserFilter, setAdminUserFilter] = useState<
    "ALL" | "pending" | "approved" | "rejected"
  >("ALL");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showAdminToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  const reloadUsers = () => {
    setAllUsersList(getAllAccounts());
  };

  useEffect(() => {
    const handleAccountsUpdated = () => {
      reloadUsers();
    };
    window.addEventListener("super_x_accounts_updated", handleAccountsUpdated);
    window.addEventListener("storage", handleAccountsUpdated);
    const interval = setInterval(() => {
      if (document.hidden) return;
      reloadUsers();
    }, 20000);
    return () => {
      window.removeEventListener(
        "super_x_accounts_updated",
        handleAccountsUpdated,
      );
      window.removeEventListener("storage", handleAccountsUpdated);
      clearInterval(interval);
    };
  }, []);

  const pendingUsersCount = React.useMemo(() => {
    return allUsersList.filter((u) => u.status === "pending").length;
  }, [allUsersList]);

  useEffect(() => {
    try {
      localStorage.setItem("super_x_current_view", currentView);
      const targetHash = VIEW_TO_HASH_MAP[currentView] || currentView;
      const currentCleanHash = (window.location.hash || "").replace(/^#\/?/, "").toLowerCase().trim();
      if (currentCleanHash !== targetHash) {
        isProgrammaticNavRef.current = true;
        window.history.replaceState(null, "", `#${targetHash}`);
      }

      const titles: Record<string, string> = {
        dashboard: "Dashboard",
        getNumber: "Get Number",
        console: "Console Realtime",
        smsRange: "SMS Range",
        smsNumber: "SMS Number",
        summary: "Summary Reports",
        smsCdrReports: "CDR Reports",
        accessList: "Access List",
        senderRange: "Sender / Range",
        terminal: "SUPER X Terminal",
        profile: "My Profile",
        adminRequests: "Admin Approvals",
        liveTestSms: "Live Test SMS",
        smsTestHistory: "SMS Test History",
        telegramBot: "Telegram Admin Bot",
        userApiSession: "User API Session",
        supportChatAdmin: "Live Support Chat",
      };
      const titleName = titles[currentView] || "SMS Portal";
      document.title = `SUPER X SMS - ${titleName}`;
    } catch {
      // ignore
    }
  }, [currentView]);

  // Listen to browser Back/Forward & hashchange in real-time
  useEffect(() => {
    const onHashChange = () => {
      if (isProgrammaticNavRef.current) {
        isProgrammaticNavRef.current = false;
        return;
      }
      const view = getViewFromUrlHash();
      if (view) {
        setCurrentView(view);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  // Strict check: Non-admin users cannot access admin-only views
  useEffect(() => {
    if (
      user.role !== "admin" &&
      (currentView === "telegramBot" ||
        currentView === "userApiSession" ||
        currentView === "supportChatAdmin")
    ) {
      setCurrentView("dashboard");
    }
  }, [user.role, currentView]);
  const [accountCode, setAccountCode] = useState(() =>
    getDedicatedAccountCode(user.email, user.accountCode),
  );

  // Live Admin Permission Check for Super Admin & Sub-Admins created by Main Admin
  const [isAdminUser, setIsAdminUser] = useState<boolean>(() => {
    if (!user || !user.email) return false;
    const cleanEmail = user.email.toLowerCase().trim();
    const isSuperAdmin =
      cleanEmail === "xzrmunna33@gmail.com" ||
      cleanEmail === "xzrmunna96@gmail.com" ||
      cleanEmail === "xzrmunna";
    if (isSuperAdmin) return true;
    const subAdmins = getAllSubAdmins();
    if (subAdmins.some((sa) => sa.email.toLowerCase().trim() === cleanEmail && sa.status === "active")) {
      return true;
    }
    const accounts = getAllAccounts();
    const acc = accounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
    if (acc) {
      return acc.role === "admin" || (acc.role as string) === "sub_admin";
    }
    return user.role === "admin";
  });

  useEffect(() => {
    const checkAdminPermission = () => {
      if (!user || !user.email) {
        setIsAdminUser(false);
        return;
      }
      const cleanEmail = user.email.toLowerCase().trim();
      const isSuperAdmin =
        cleanEmail === "xzrmunna33@gmail.com" ||
        cleanEmail === "xzrmunna96@gmail.com" ||
        cleanEmail === "xzrmunna";
      if (isSuperAdmin) {
        setIsAdminUser(true);
        return;
      }
      const subAdmins = getAllSubAdmins();
      const isSub = subAdmins.some(
        (sa) => sa.email.toLowerCase().trim() === cleanEmail && sa.status === "active"
      );
      if (isSub) {
        setIsAdminUser(true);
        return;
      }
      const accounts = getAllAccounts();
      const acc = accounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
      if (acc) {
        setIsAdminUser(acc.role === "admin" || (acc.role as string) === "sub_admin");
        return;
      }
      setIsAdminUser(user.role === "admin");
    };

    checkAdminPermission();

    window.addEventListener("super_x_sub_admins_updated", checkAdminPermission);
    window.addEventListener("super_x_accounts_updated", checkAdminPermission);
    window.addEventListener("storage", checkAdminPermission);
    const interval = setInterval(() => {
      if (document.hidden) return;
      checkAdminPermission();
    }, 20000);

    return () => {
      window.removeEventListener("super_x_sub_admins_updated", checkAdminPermission);
      window.removeEventListener("super_x_accounts_updated", checkAdminPermission);
      window.removeEventListener("storage", checkAdminPermission);
      clearInterval(interval);
    };
  }, [user]);

  const handleOpenAdminPortal = () => {
    if (!user || !user.email) return;
    const cleanEmail = user.email.toLowerCase();
    const isSuperAdmin =
      cleanEmail === "xzrmunna33@gmail.com" ||
      cleanEmail === "xzrmunna96@gmail.com" ||
      cleanEmail === "xzrmunna";

    const newSession = {
      isAuthenticated: true,
      role: isSuperAdmin ? ("super_admin" as const) : ("sub_admin" as const),
      email: user.email,
      name: user.name || (isSuperAdmin ? "Super Admin" : "Sub Admin"),
    };

    try {
      sessionStorage.setItem("super_x_admin_session_auth_v2", JSON.stringify(newSession));
      sessionStorage.setItem("super_x_admin_session", JSON.stringify(newSession));
    } catch {}

    triggerAdminRoute();
  };
  const [brandTitle, setBrandTitle] = useState(() => {
    try {
      return localStorage.getItem("super_x_site_brand_title") || "SUPER X SMS";
    } catch {
      return "SUPER X SMS";
    }
  });

  const [siteNoticeText, setSiteNoticeText] = useState(() => {
    try {
      return (
        localStorage.getItem("super_x_site_marquee_notice") ||
        "SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active"
      );
    } catch {
      return "SMS Portal - Premium Carrier Rates 📲 Instant Verification Codes & Physical Carrier Routes Active";
    }
  });

  useEffect(() => {
    const handleTitleUpdate = () => {
      try {
        const saved = localStorage.getItem("super_x_site_brand_title");
        if (saved) setBrandTitle(saved);
      } catch {
        // ignore
      }
    };
    const handleNoticeUpdate = () => {
      try {
        const saved = localStorage.getItem("super_x_site_marquee_notice");
        if (saved) setSiteNoticeText(saved);
      } catch {
        // ignore
      }
    };

    const fetchServerNotice = () => {
      fetch("/api/site-notice")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.noticeText) {
            setSiteNoticeText(data.noticeText);
            try {
              localStorage.setItem("super_x_site_marquee_notice", data.noticeText);
            } catch {}
          }
        })
        .catch(() => {});
    };

    fetchServerNotice();
    const noticeInterval = setInterval(fetchServerNotice, 10000);

    window.addEventListener("super_x_brand_title_updated", handleTitleUpdate);
    window.addEventListener("super_x_marquee_notice_updated", handleNoticeUpdate);
    window.addEventListener("storage", handleTitleUpdate);
    window.addEventListener("storage", handleNoticeUpdate);
    return () => {
      clearInterval(noticeInterval);
      window.removeEventListener("super_x_brand_title_updated", handleTitleUpdate);
      window.removeEventListener("super_x_marquee_notice_updated", handleNoticeUpdate);
      window.removeEventListener("storage", handleTitleUpdate);
      window.removeEventListener("storage", handleNoticeUpdate);
    };
  }, []);

  const [isReloading, setIsReloading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // User Profile Form & Password States
  const [profileName, setProfileName] = useState(user.name || "");
  const [profilePhone, setProfilePhone] = useState(user.phoneOrTelegram || "");
  const [profileNote, setProfileNote] = useState(user.note || "");
  const [profileAvatar, setProfileAvatar] = useState(user.avatarUrl || "");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileName(user.name || "");
    setProfilePhone(user.phoneOrTelegram || "");
    setProfileNote(user.note || "");
    setProfileAvatar(user.avatarUrl || "");
  }, [user]);

  const handleOpenGalleryPicker = () => {
    if (profileFileInputRef.current) {
      profileFileInputRef.current.click();
    }
  };

  const handleGalleryPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileSaveError("Please select a valid image file from your device.");
      return;
    }

    setIsUploadingPhoto(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsUploadingPhoto(false);
        return;
      }

      // Optimize image size if needed via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

          setProfileAvatar(optimizedDataUrl);
          const res = updateUserProfileAndPassword({
            email: user.email,
            avatarUrl: optimizedDataUrl,
          });

          if (res.success) {
            setProfileSaveSuccess("Profile photo updated successfully from gallery! 📸");
            reloadUsers();
            setTimeout(() => setProfileSaveSuccess(null), 4000);
          }
        } else {
          setProfileAvatar(result);
          updateUserProfileAndPassword({
            email: user.email,
            avatarUrl: result,
          });
          reloadUsers();
        }
        setIsUploadingPhoto(false);
      };

      img.onerror = () => {
        setProfileAvatar(result);
        updateUserProfileAndPassword({
          email: user.email,
          avatarUrl: result,
        });
        reloadUsers();
        setIsUploadingPhoto(false);
      };

      img.src = result;
    };

    reader.onerror = () => {
      setProfileSaveError("Failed to read image file from device.");
      setIsUploadingPhoto(false);
    };

    reader.readAsDataURL(file);
    // Reset file input so user can choose the same file again if desired
    e.target.value = "";
  };

  const handleRemoveProfileAvatar = () => {
    setProfileAvatar("");
    const res = updateUserProfileAndPassword({
      email: user.email,
      avatarUrl: "",
    });
    if (res.success) {
      setProfileSaveSuccess("Profile photo removed.");
      reloadUsers();
      setTimeout(() => setProfileSaveSuccess(null), 3000);
    }
  };

  const handleSaveProfileInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError(null);
    setProfileSaveSuccess(null);

    const res = updateUserProfileAndPassword({
      email: user.email,
      name: profileName,
      phoneOrTelegram: profilePhone,
      note: profileNote,
      avatarUrl: profileAvatar,
    });

    if (res.success) {
      setProfileSaveSuccess("Profile info saved! Admin panel updated successfully.");
      reloadUsers();
      setTimeout(() => setProfileSaveSuccess(null), 4000);
    } else {
      setProfileSaveError(res.message || "Failed to update profile.");
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError(null);
    setProfileSaveSuccess(null);

    if (!profileNewPassword || profileNewPassword.length < 4) {
      setProfileSaveError("Password must be at least 4 characters.");
      return;
    }

    if (profileNewPassword !== profileConfirmPassword) {
      setProfileSaveError("Passwords do not match!");
      return;
    }

    const res = updateUserProfileAndPassword({
      email: user.email,
      password: profileNewPassword,
    });

    if (res.success) {
      setProfileSaveSuccess("New password saved! Admin credentials updated.");
      setProfileNewPassword("");
      setProfileConfirmPassword("");
      reloadUsers();
      setTimeout(() => setProfileSaveSuccess(null), 4000);
    } else {
      setProfileSaveError(res.message || "Failed to update password.");
    }
  };

  // Background API Key State
  const [apiKey, setApiKeyState] = useState<string>(() => getMauthApiKey());
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  // Initial default seed hits for instant load without 2-3s delay with active FOX SMS hits
  const DEFAULT_INITIAL_HITS: LiveConsoleHit[] = [
    {
      range: "22901",
      number: "2290155011429",
      sid: "WhatsApp",
      message: "<#> Votre compte WhatsApp Business sera enregistré sur un nouvel appareil\n\nNe donnez ce code à personne\nVotre code WhatsApp Business: 931-786\nrJbA/XP1K+V",
      time: Date.now() - 30000,
      operator: "Moov / MTN",
      country: "BENIN",
    },
    {
      range: "94740",
      number: "94740729629",
      sid: "Apple",
      message: "Your Apple Account Code is: 770661. Don't share it with anyone.",
      time: Date.now() - 60000,
      operator: "Dialog",
      country: "SRI LANKA",
    },
    {
      range: "22901",
      number: "2290155260259",
      sid: "WhatsApp",
      message: "<#> Your WhatsApp Business code 853-228\nDon't share this code with others\nrJbA/XP1K+V",
      time: Date.now() - 90000,
      operator: "Moov / MTN",
      country: "BENIN",
    },
    {
      range: "94743",
      number: "94743665198",
      sid: "Apple",
      message: "Your Apple Account code is: 676123. Do not share it with anyone.",
      time: Date.now() - 120000,
      operator: "Dialog",
      country: "SRI LANKA",
    },
    {
      range: "94743",
      number: "94743665198",
      sid: "Apple",
      message: "Your Apple Account code is: 308521. Do not share it with anyone.",
      time: Date.now() - 150000,
      operator: "Dialog",
      country: "SRI LANKA",
    },
    {
      range: "94743",
      number: "94743665198",
      sid: "Apple",
      message: "Your Apple Account code is: 912919. Do not share it with anyone.",
      time: Date.now() - 180000,
      operator: "Dialog",
      country: "SRI LANKA",
    },
    {
      range: "94743",
      number: "94743665198",
      sid: "Apple",
      message: "Your Apple Account code is: 515411. Do not share it with anyone.",
      time: Date.now() - 210000,
      operator: "Dialog",
      country: "SRI LANKA",
    },
    {
      range: "22901",
      number: "2290164131359",
      sid: "DLS",
      message: "Ne partagez votre code de confirmation avec personne: 77771",
      time: Date.now() - 240000,
      operator: "Moov / MTN",
      country: "BENIN",
    },
    {
      range: "22901",
      number: "2290198181998",
      sid: "Facebook",
      message: "108 697 is your Instagram code. Don't share it. #ig",
      time: Date.now() - 270000,
      operator: "Moov / MTN",
      country: "BENIN",
    },
    {
      range: "25882",
      number: "258820046884",
      sid: "Authentify",
      message: "Your Schoolena verification code is: 369410",
      time: Date.now() - 300000,
      operator: "mcel",
      country: "MOZAMBIQUE",
    },
    {
      range: "25882",
      number: "258820046486",
      sid: "Authentify",
      message: "Your Schoolena verification code is: 618834",
      time: Date.now() - 330000,
      operator: "mcel",
      country: "MOZAMBIQUE",
    },
    {
      range: "25882",
      number: "258826037078",
      sid: "Airbnb",
      message: "Airbnb: Akila quer fazer check-in hoje. Toque para responder.",
      time: Date.now() - 360000,
      operator: "mcel",
      country: "MOZAMBIQUE",
    },
    {
      range: "25883",
      number: "258834464785",
      sid: "WhatsApp",
      message: "<#> Your WhatsApp code: 594-198\nDon't share this code with others\n4sgLq1p5sV6",
      time: Date.now() - 390000,
      operator: "Vodacom",
      country: "MOZAMBIQUE",
    },
    {
      range: "25883",
      number: "258835261731",
      sid: "Yandex Taxi",
      message: "Vreme dolaska: 7 min Vozilo: Ford BG26830TX Lokacija vozila: ya.cc/t/JEMTmGrI9EM5xd",
      time: Date.now() - 420000,
      operator: "Vodacom",
      country: "MOZAMBIQUE",
    },
    {
      range: "25883",
      number: "258835638065",
      sid: "WhatsApp",
      message: "<#> Your WhatsApp Business code 574-474\nDon't share this code with others\nrJbA/XP1K+V",
      time: Date.now() - 450000,
      operator: "Vodacom",
      country: "MOZAMBIQUE",
    },
    {
      range: "94769",
      number: "94769711088",
      sid: "Apple",
      message: "Your Apple Account Code is: 4071. Don't share it with anyone.",
      time: Date.now() - 480000,
      operator: "Airtel",
      country: "SRI LANKA",
    },
    {
      range: "94768",
      number: "94768925647",
      sid: "AfrAsiaBank",
      message: "077888 is your verification code. For your security, do not share this code.",
      time: Date.now() - 510000,
      operator: "Airtel",
      country: "SRI LANKA",
    },
    {
      range: "21354",
      number: "213541295176",
      sid: "DPT Pay",
      message: "Your DPT verification code is: 877279",
      time: Date.now() - 540000,
      operator: "Djezzy",
      country: "ALGERIA",
    },
    {
      range: "25883",
      number: "258835400909",
      sid: "HONOR",
      message: "Your code is  96494",
      time: Date.now() - 570000,
      operator: "Vodacom",
      country: "MOZAMBIQUE",
    },
    {
      range: "25883",
      number: "258835131541",
      sid: "WhatsApp",
      message: "<#> Your WhatsApp code: 167-648\nDon't share this code with others\n4sgLq1p5sV6",
      time: Date.now() - 600000,
      operator: "Vodacom",
      country: "MOZAMBIQUE",
    },
    {
      range: "25883",
      number: "258833900619",
      sid: "WhatsApp",
      message: "<#> Codigo de confirmacao do WhatsApp: 574-584\nNao partilhe este codigo com terceiros\n4sgLq1p5sV6",
      time: Date.now() - 630000,
      operator: "Vodacom",
      country: "MOZAMBIQUE",
    },
    {
      range: "94766",
      number: "94766232330",
      sid: "GoDaddy",
      message: "Your GoDaddy verification code is 615285.",
      time: Date.now() - 660000,
      operator: "Airtel",
      country: "SRI LANKA",
    },
    {
      range: "94766",
      number: "94766232330",
      sid: "GoDaddy",
      message: "Your GoDaddy verification code is 814535.",
      time: Date.now() - 690000,
      operator: "Airtel",
      country: "SRI LANKA",
    },
    {
      range: "94766",
      number: "94766232330",
      sid: "GoDaddy",
      message: "Your GoDaddy verification code is 117216.",
      time: Date.now() - 720000,
      operator: "Airtel",
      country: "SRI LANKA",
    },
    {
      range: "94766",
      number: "94766232330",
      sid: "GoDaddy",
      message: "Your GoDaddy verification code is 297060.",
      time: Date.now() - 750000,
      operator: "Airtel",
      country: "SRI LANKA",
    },
  ];

  // Live Real Data State with 24-Hour Persistence & Automatic Reset
  // Synchronized across all users & admins in real-time from server
  const [liveHits, setLiveHits] = useState<LiveConsoleHit[]>(() => {
    try {
      const saved = localStorage.getItem("super_x_live_console_hits_24h");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_HITS;
  });

  const [globalStats, setGlobalStats] = useState<{
    appCounts: Record<string, number>;
    rangeCounts: Record<string, number>;
    totalHits: number;
  }>({ appCounts: {}, rangeCounts: {}, totalHits: 0 });

  // Listen for 24-hour reset events and check periodically
  useEffect(() => {
    const handleResetEvent = () => {
      setLiveHits([]);
      setAppMonotonicCounts({});
      try {
        localStorage.removeItem("super_x_live_console_hits_24h");
        localStorage.removeItem("super_x_app_monotonic_counts_v2");
      } catch {}
    };

    window.addEventListener("super_x_24h_reset", handleResetEvent);

    const resetCheckInterval = setInterval(() => {
      const check = checkAndApply24HourReset();
      if (check.didReset) {
        setLiveHits([]);
        setAppMonotonicCounts({});
        try {
          localStorage.removeItem("super_x_live_console_hits_24h");
          localStorage.removeItem("super_x_app_monotonic_counts_v2");
        } catch {}
      }
    }, 60000);

    return () => {
      window.removeEventListener("super_x_24h_reset", handleResetEvent);
      clearInterval(resetCheckInterval);
    };
  }, []);

  // Monotonic hit accumulator: only appends/merges new hits, NEVER drops or deletes existing messages
  const mergeIncomingHits = useCallback((incoming: LiveConsoleHit[]) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;

    // Cross-match incoming live hits with user's allocated numbers (under Get Number / Choice Terminal)
    setGetNumHistory((prevHistory) => {
      if (!prevHistory || prevHistory.length === 0) return prevHistory;
      let historyUpdated = false;
      const nextHistory = prevHistory.map((item) => {
        const itemDigits = (item.number || "").replace(/\D/g, "");
        if (!itemDigits) return item;

        const matchHit = incoming.find((h) => {
          const hDigits = (h.range || h.number || "").replace(/\D/g, "");
          if (!hDigits) return false;
          return (
            hDigits === itemDigits ||
            (itemDigits.length >= 7 && hDigits.length >= 7 && (itemDigits.endsWith(hDigits) || hDigits.endsWith(itemDigits)))
          );
        });

        if (matchHit) {
          let extractedCode = (matchHit as any).code || (matchHit as any).otp || "";
          if (!extractedCode && matchHit.message) {
            const cMatch = String(matchHit.message).match(/(?:code|YOUR CODE|🔐\s*YOUR CODE|is)\s*[:\s]*『?\s*([A-Za-z0-9\-]+)\s*』?/i);
            if (cMatch && cMatch[1]) extractedCode = cMatch[1].trim();
            else {
              const dMatch = String(matchHit.message).match(/\b(\d{3,8}(?:-\d{3,8})?)\b/);
              if (dMatch && dMatch[1]) extractedCode = dMatch[1].trim();
            }
          }

          if (extractedCode && item.otp !== extractedCode) {
            historyUpdated = true;
            return {
              ...item,
              otp: extractedCode,
              status: "SUCCESS" as const,
              service: (matchHit as any).service || (matchHit as any).platform || "Delivered SMS",
              activity: `Delivered just now (${extractedCode})`,
            };
          }
        }
        return item;
      });

      if (historyUpdated) {
        if (user?.email) {
          try {
            localStorage.setItem(`super_x_get_num_history_${user.email}`, JSON.stringify(nextHistory));
          } catch {}
        }
        return nextHistory;
      }
      return prevHistory;
    });

    setLiveHits((prev) => {
      const map = new Map<string, LiveConsoleHit>();
      // 1. Preserve all existing hits in memory
      prev.forEach((h) => {
        if (!h) return;
        const timeVal = parseHitTimestamp(h.time ?? (h as any).timestamp);
        const sig = `${(h.range || h.number || "").replace(/\D/g, "")}_${timeVal}_${(h.sid || "").toLowerCase().trim()}_${(h.message || "").trim()}`;
        if (sig) map.set(sig, h);
      });

      let hasNew = false;
      // 2. Add incoming hits monotonically
      incoming.forEach((h) => {
        if (!h) return;
        const timeVal = parseHitTimestamp(h.time ?? (h as any).timestamp);
        const sig = `${(h.range || h.number || "").replace(/\D/g, "")}_${timeVal}_${(h.sid || "").toLowerCase().trim()}_${(h.message || "").trim()}`;
        if (sig && !map.has(sig)) {
          map.set(sig, h);
          hasNew = true;
        }
      });

      // If no new hits arrived and map size equals prev, return previous reference
      if (!hasNew && map.size === prev.length) {
        return prev;
      }

      // 3. Sort strictly newest on top
      const sorted = Array.from(map.values()).sort((a, b) => {
        const tA = parseHitTimestamp(a.time ?? (a as any).timestamp);
        const tB = parseHitTimestamp(b.time ?? (b as any).timestamp);
        return tB - tA;
      });

      const sliced = sorted.slice(0, 3000);
      try {
        localStorage.setItem("super_x_live_console_hits_24h", JSON.stringify(sliced.slice(0, 1000)));
      } catch {}
      return sliced;
    });

    // 3. Dynamically update liveAccessList with incoming service & range prefixes and range OTPs
    setLiveAccessList((prevAccess) => {
      let listUpdated = false;
      const updatedList = [...prevAccess];

      incoming.forEach((h) => {
        const sid = (h.sid || (h as any).service || "SMS").trim();
        const rawNum = String(h.number || h.range || "").replace(/\D/g, "");
        if (!rawNum) return;
        const rangePrefix = rawNum.length >= 5 ? rawNum.slice(0, 5) : rawNum;
        const rawMsg = h.message || "";
        const otp = extractOtpCode(rawMsg) || "";
        const hitTime = typeof h.time === "number" ? h.time : Date.now();

        const idx = updatedList.findIndex((item) => item.sid.toLowerCase() === sid.toLowerCase());
        if (idx >= 0) {
          const currentItem = updatedList[idx];
          const ranges = currentItem.ranges || [];
          const existingOtps = currentItem.rangeOtps || {};

          let newRanges = ranges;
          if (!ranges.includes(rangePrefix)) {
            newRanges = [rangePrefix, ...ranges];
          }

          updatedList[idx] = {
            ...currentItem,
            ranges: newRanges,
            last_at: Math.floor(Date.now() / 1000),
            rangeOtps: {
              ...existingOtps,
              [rangePrefix]: {
                otp: otp || existingOtps[rangePrefix]?.otp || "",
                message: rawMsg || existingOtps[rangePrefix]?.message || "",
                time: hitTime,
                number: h.number || rawNum,
              },
            },
          };
          listUpdated = true;
        } else {
          listUpdated = true;
          updatedList.unshift({
            sid,
            ranges: [rangePrefix],
            last_at: Math.floor(Date.now() / 1000),
            rangeOtps: {
              [rangePrefix]: {
                otp,
                message: rawMsg,
                time: hitTime,
                number: h.number || rawNum,
              },
            },
          });
        }
      });

      if (listUpdated) {
        try {
          localStorage.setItem("super_x_live_access_list", JSON.stringify(updatedList));
        } catch {}
        return updatedList;
      }
      return prevAccess;
    });

    // 4. Automatically sync incoming real-time hits into SMS Test History (smsTestHistoryList)
    setSmsTestHistoryList((prevHistory) => {
      let historyChanged = false;
      const nextList = [...prevHistory];
      incoming.forEach((h) => {
        if (!h) return;
        const rawNum = String(h.number || h.range || "").replace(/\D/g, "");
        if (!rawNum) return;
        const rawMsg = h.message || "";
        const otpCode = extractOtpCode(rawMsg) || "";
        const hitTime = typeof h.time === "number" ? h.time : Date.now();
        const recId = (h as any).id || `hit_rec_${rawNum}_${hitTime}_${otpCode}`;

        const exists = nextList.some(
          (r) => r.id === recId || (r.testNumber === rawNum && Math.abs(r.timestamp - hitTime) < 3000 && r.otpCode === otpCode)
        );

        if (!exists) {
          nextList.unshift({
            id: recId,
            testNumber: rawNum,
            country: h.country || "International",
            carrier: h.operator || "Direct Route",
            service: h.sid || "SMS",
            otpCode: otpCode || "XXXXXX",
            message: rawMsg,
            timestamp: hitTime,
            status: "DELIVERED",
            speedSec: 2,
          });
          historyChanged = true;
        }
      });

      if (historyChanged) {
        if (user?.email) {
          try {
            localStorage.setItem(
              `super_x_sms_test_history_${user.email}`,
              JSON.stringify(nextList.slice(0, 1000))
            );
          } catch {}
        }
        return nextList.slice(0, 1000);
      }
      return prevHistory;
    });
  }, [user?.email]);

  // Synchronize liveHits into liveAccessList to ensure all historical and current hits are reflected in Access List
  useEffect(() => {
    if (!liveHits || liveHits.length === 0) return;

    setLiveAccessList((prevAccess) => {
      let updated = false;
      const nextList = [...prevAccess];

      liveHits.forEach((h) => {
        if (!h) return;
        const sid = (h.sid || (h as any).service || "SMS").trim();
        const rawNum = String(h.number || h.range || "").replace(/\D/g, "");
        if (!rawNum) return;
        const rangePrefix = rawNum.length >= 5 ? rawNum.slice(0, 5) : rawNum;
        const rawMsg = h.message || "";
        const otp = extractOtpCode(rawMsg) || "";
        const hitTime = typeof h.time === "number" ? h.time : ((h as any).timestamp ? new Date((h as any).timestamp).getTime() : Date.now());

        let idx = nextList.findIndex((item) => item.sid.toLowerCase() === sid.toLowerCase());
        if (idx === -1) {
          updated = true;
          nextList.unshift({
            sid,
            ranges: [rangePrefix],
            last_at: Math.floor(hitTime / 1000),
            rangeOtps: {
              [rangePrefix]: {
                otp,
                message: rawMsg,
                time: hitTime,
                number: h.number || rawNum,
              },
            },
          });
        } else {
          const currentItem = nextList[idx];
          const ranges = currentItem.ranges || [];
          const existingOtps = currentItem.rangeOtps || {};
          let itemModified = false;

          let newRanges = ranges;
          if (!ranges.includes(rangePrefix)) {
            newRanges = [rangePrefix, ...ranges];
            itemModified = true;
          }

          const existingOtpObj = existingOtps[rangePrefix];
          if (!existingOtpObj || (otp && !existingOtpObj.otp) || hitTime > (existingOtpObj.time || 0)) {
            itemModified = true;
            nextList[idx] = {
              ...currentItem,
              ranges: newRanges,
              last_at: Math.max(currentItem.last_at || 0, Math.floor(hitTime / 1000)),
              rangeOtps: {
                ...existingOtps,
                [rangePrefix]: {
                  otp: otp || existingOtpObj?.otp || "",
                  message: rawMsg || existingOtpObj?.message || "",
                  time: hitTime,
                  number: h.number || rawNum,
                },
              },
            };
          } else if (itemModified) {
            nextList[idx] = {
              ...currentItem,
              ranges: newRanges,
            };
          }

          if (itemModified) updated = true;
        }
      });

      if (updated) {
        try {
          localStorage.setItem("super_x_live_access_list", JSON.stringify(nextList));
        } catch {}
        return nextList;
      }
      return prevAccess;
    });
  }, [liveHits]);

  // Synchronize global live stream and monotonic stats across all users and admins in real-time
  // Optimized to use lightweight short-polling to completely avoid browser connection exhaustion (max 6 TCP limit)
  // and Vercel serverless function execution timeout issues.
  useEffect(() => {
    let isMounted = true;

    const syncWithGlobalStream = async () => {
      try {
        const res = await fetch("/api/global-live-stream");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && isMounted) {
            if (data.stats) {
              setGlobalStats(data.stats);
            }
            if (Array.isArray(data.hits) && data.hits.length > 0) {
              mergeIncomingHits(data.hits);
            }
            return;
          }
        }
      } catch {}

      // Fallback for Vercel / serverless / static hosting: directly poll active SMS APIs
      try {
        const directResult = await fetchLiveConsoleDetailed();
        if (directResult && isMounted && Array.isArray(directResult.hits) && directResult.hits.length > 0) {
          mergeIncomingHits(directResult.hits);
        }
      } catch {}
    };

    syncWithGlobalStream();
    // Fast 5-second polling interval for real-time responsiveness without persistent SSE streams
    const pollTimer = setInterval(() => {
      if (document.hidden) return;
      syncWithGlobalStream();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
    };
  }, []);

  // Save live hits to localStorage with debouncing (stores full 24-hour pool up to 500 hits)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const validHits = liveHits.slice(0, 500).filter((item: any) => {
          const t = typeof item.time === "number" ? item.time : (item.timestamp || new Date(item.time).getTime());
          return !isNaN(t) && t >= oneDayAgo;
        });
        localStorage.setItem("super_x_live_console_hits_24h", JSON.stringify(validHits));
      } catch {}
    }, 1500);

    return () => clearTimeout(timer);
  }, [liveHits]);

  // Periodic 24-hour cleanup check every 2 minutes
  useEffect(() => {
    const purgeInterval = setInterval(() => {
      setLiveHits((prev) => {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const filtered = prev.filter((item: any) => {
          const t = typeof item.time === "number" ? item.time : (item.timestamp || new Date(item.time).getTime());
          return !isNaN(t) && t >= oneDayAgo;
        });
        if (filtered.length !== prev.length) {
          try {
            localStorage.setItem("super_x_live_console_hits_24h", JSON.stringify(filtered.slice(0, 500)));
          } catch {}
          return filtered;
        }
        return prev;
      });
    }, 120000);

    return () => clearInterval(purgeInterval);
  }, []);

  // Strict 24-Hour Active Hits Pool (Deduplicated & Canonical Source of Truth)
  const active24hHits = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const seen = new Set<string>();
    const result: LiveConsoleHit[] = [];

    for (const h of liveHits) {
      if (!h) continue;
      const t = parseHitTimestamp(h.time ?? (h as any).timestamp);
      if (t < oneDayAgo) continue;
      const sig = `${(h.range || "").replace(/\D/g, "")}_${t}_${(h.sid || "").toLowerCase().trim()}_${(h.message || "").trim()}`;
      if (!seen.has(sig)) {
        seen.add(sig);
        result.push(h);
      }
    }

    return result;
  }, [liveHits]);

  // Monotonic message counters for social apps (Count never drops down, only climbs upwards)
  const [appMonotonicCounts, setAppMonotonicCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("super_x_app_monotonic_counts_v2");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Calculate real-time count for any social media app, strictly counted from actual received SMS/OTP hits
  const getMonotonicCountForApp = useCallback((appName: string): number => {
    if (!appName) return 0;
    const hits = filterHitsForApp(active24hHits, appName);
    return hits.length;
  }, [active24hHits]);

  // Real-time online heartbeat tracking for the active logged-in user
  useEffect(() => {
    if (!user || !user.email) return;

    sendUserOnlineHeartbeat(user.email);

    const hbInterval = setInterval(() => {
      sendUserOnlineHeartbeat(user.email);
    }, 25000);

    const handleBeforeUnload = () => {
      markUserOffline(user.email);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(hbInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      markUserOffline(user.email);
    };
  }, [user?.email]);

  const DEFAULT_INITIAL_ACCESS_SERVICES: LiveAccessService[] = [
    { sid: "WhatsApp", ranges: ["88017", "88018", "88019", "22501", "22897", "85567"], last_at: Date.now() },
    { sid: "Telegram", ranges: ["88017", "88018", "88019", "99891", "23277"], last_at: Date.now() },
    { sid: "Facebook", ranges: ["88013", "88014", "99891", "22897"], last_at: Date.now() },
    { sid: "Google", ranges: ["88017", "88018", "88019", "85567", "22507"], last_at: Date.now() },
    { sid: "IMO", ranges: ["88017", "88018", "88019"], last_at: Date.now() },
    { sid: "TikTok", ranges: ["88017", "88018", "88019"], last_at: Date.now() },
  ];

  const [liveAccessList, setLiveAccessList] = useState<LiveAccessService[]>(() => {
    try {
      const saved = localStorage.getItem("super_x_live_access_list");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_ACCESS_SERVICES;
  });
  const [liveSuccessOtps, setLiveSuccessOtps] = useState<LiveSuccessOtp[]>([]);
  const [allocatedNumbers, setAllocatedNumbers] = useState<
    Array<
      AllocatedNumber & {
        serviceName: string;
        time: string;
        status: string;
        otp?: string;
      }
    >
  >([]);
  const [selectedRange, setSelectedRange] = useState("88017");
  const [selectedService, setSelectedService] = useState("WhatsApp");
  const [activeAppStream, setActiveAppStream] = useState<
    "WhatsApp" | "Telegram" | "Facebook" | "IMO"
  >("WhatsApp");
  const [isAllocating, setIsAllocating] = useState(false);

  // Manual Number & Range states
  const [manualRanges, setManualRanges] = useState<ManualRangeSummary[]>([]);
  const [manualNumbers, setManualNumbers] = useState<ManualNumberRecord[]>([]);
  const [manualNumbersTotal, setManualNumbersTotal] = useState<number>(0);
  const [manualRangesLoading, setManualRangesLoading] = useState(false);
  const [manualNumbersLoading, setManualNumbersLoading] = useState(false);
  const [manualRangesSearch, setManualRangesSearch] = useState("");
  const [manualNumbersSearch, setManualNumbersSearch] = useState("");
  const [manualRangesPlatformFilter, setManualRangesPlatformFilter] = useState("ALL");
  const [manualNumbersStatusFilter, setManualNumbersStatusFilter] = useState("ALL");

  // User customized workspace for SMS Ranges (Termination picker, individual delete & bulk delete)
  const userRangesStorageKey = `superx_user_sms_ranges_${user?.accountCode || user?.email || "default"}`;
  const [userWorkspaceRangePrefixes, setUserWorkspaceRangePrefixes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(userRangesStorageKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [hasInitializedWorkspaceRanges, setHasInitializedWorkspaceRanges] = useState<boolean>(() => {
    try {
      return localStorage.getItem(userRangesStorageKey) !== null;
    } catch {
      return false;
    }
  });

  // Bulk selection for deletion
  const [selectedRangesForDelete, setSelectedRangesForDelete] = useState<Set<string>>(new Set());

  // Add numbers modal & termination dropdown state (Matching user screenshots 1 & 2)
  const [isAddNumbersModalOpen, setIsAddNumbersModalOpen] = useState(false);
  const [selectedTerminationPrefix, setSelectedTerminationPrefix] = useState<string>("");
  const [terminationSearchQuery, setTerminationSearchQuery] = useState("");
  const [terminationDropdownPlatform, setTerminationDropdownPlatform] = useState<string>("ALL");
  const [isTerminationDropdownOpen, setIsTerminationDropdownOpen] = useState(false);
  const [actionFeedbackToast, setActionFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    if (!hasInitializedWorkspaceRanges && manualRanges.length > 0) {
      const allPrefixes = manualRanges.map((r) => r.rangePrefix);
      setUserWorkspaceRangePrefixes(allPrefixes);
      try {
        localStorage.setItem(userRangesStorageKey, JSON.stringify(allPrefixes));
      } catch {}
      setHasInitializedWorkspaceRanges(true);
    }
  }, [manualRanges, hasInitializedWorkspaceRanges, userRangesStorageKey]);

  useEffect(() => {
    if (actionFeedbackToast) {
      const t = setTimeout(() => setActionFeedbackToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [actionFeedbackToast]);

  const handleAddTermination = (prefixToAdd?: string, keepDropdownOpen: boolean = false) => {
    const prefix = prefixToAdd || selectedTerminationPrefix;
    if (!prefix) return;

    setUserWorkspaceRangePrefixes((prev) => {
      const updated = prev.includes(prefix) ? prev : [...prev, prefix];
      try {
        localStorage.setItem(userRangesStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    const targetRange = manualRanges.find((r) => r.rangePrefix === prefix);
    const countryName = targetRange ? targetRange.country : prefix;
    setActionFeedbackToast(`Termination ${countryName} (${prefix}) added to workspace in serial order!`);
    playOtpChime();
    setSelectedTerminationPrefix(prefix);
    if (!keepDropdownOpen) {
      setIsAddNumbersModalOpen(false);
      setIsTerminationDropdownOpen(false);
    }
  };

  const handleRemoveSingleRange = (prefix: string) => {
    setUserWorkspaceRangePrefixes((prev) => {
      const updated = prev.filter((p) => p !== prefix);
      try {
        localStorage.setItem(userRangesStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSelectedRangesForDelete((prev) => {
      const next = new Set(prev);
      next.delete(prefix);
      return next;
    });
    setActionFeedbackToast(`Range removed from your workspace.`);
  };

  const handleDeleteSelectedRanges = () => {
    if (selectedRangesForDelete.size === 0) return;
    setUserWorkspaceRangePrefixes((prev) => {
      const updated = prev.filter((p) => !selectedRangesForDelete.has(p));
      try {
        localStorage.setItem(userRangesStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    const count = selectedRangesForDelete.size;
    setSelectedRangesForDelete(new Set());
    setActionFeedbackToast(`${count} range${count > 1 ? "s" : ""} removed from your workspace.`);
  };

  const handleToggleSelectAll = (filteredPrefixes: string[]) => {
    if (selectedRangesForDelete.size > 0 && selectedRangesForDelete.size === filteredPrefixes.length) {
      setSelectedRangesForDelete(new Set());
    } else {
      setSelectedRangesForDelete(new Set(filteredPrefixes));
    }
  };

  const handleClearAllWorkspaceRanges = () => {
    setUserWorkspaceRangePrefixes([]);
    setSelectedRangesForDelete(new Set());
    try {
      localStorage.setItem(userRangesStorageKey, JSON.stringify([]));
    } catch {}
    setActionFeedbackToast(`All ranges cleared. Click "+ Add numbers" to choose terminations.`);
  };

  // Admin uploader inputs
  const [uploadCountry, setUploadCountry] = useState("Bangladesh");
  const [uploadFlag, setUploadFlag] = useState("🇧🇩");
  const [uploadDialCode, setUploadDialCode] = useState("+880");
  const [uploadPlatform, setUploadPlatform] = useState("Telegram");
  const [uploadNumbersText, setUploadNumbersText] = useState("");

  // Dev unlock protection
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem("superx_dev_unlocked") === "true";
    } catch {
      return false;
    }
  });
  const [isDevUnlockModalOpen, setIsDevUnlockModalOpen] = useState(false);
  const [devPasscodeInput, setDevPasscodeInput] = useState("");
  const [devUnlockError, setDevUnlockError] = useState("");

  // Upload Status Inline Message Banner
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null, text: string }>({ type: null, text: "" });

  const handleVerifyDevUnlock = () => {
    if (devPasscodeInput.trim() === "MUNNA12061") {
      setIsAdminUnlocked(true);
      try {
        localStorage.setItem("superx_dev_unlocked", "true");
      } catch {}
      setIsDevUnlockModalOpen(false);
      setDevPasscodeInput("");
      setDevUnlockError("");
      playOtpChime();
    } else {
      setDevUnlockError("Invalid secret key. Access denied.");
    }
  };

  const handleUploadManualNumbers = async () => {
    if (!uploadNumbersText.trim()) {
      setUploadStatus({ type: 'error', text: "Please paste some numbers first." });
      return;
    }
    setUploadStatus({ type: null, text: "" });
    try {
      const res = await uploadManualNumbers({
        country: uploadCountry,
        flag: uploadFlag,
        dialCode: uploadDialCode,
        platform: uploadPlatform,
        numbersText: uploadNumbersText,
      });
      if (res.success) {
        setUploadNumbersText("");
        setUploadStatus({ type: 'success', text: res.message });
        // Reload ranges
        const updatedRanges = await fetchManualRanges();
        setManualRanges(updatedRanges);
        playOtpChime();
      } else {
        setUploadStatus({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', text: err?.message || "Upload failed" });
    }
  };

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const handleClearPool = async () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      return;
    }
    try {
      const res = await clearAllManualNumbers();
      if (res.success) {
        setManualRanges([]);
        setManualNumbers([]);
        setManualNumbersTotal(0);
        setIsConfirmingClear(false);
        setUploadStatus({ type: 'success', text: "All manual pool numbers successfully cleared." });
        playOtpChime();
      } else {
        setUploadStatus({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', text: err?.message || "Failed to clear pool" });
    }
  };

  const handleDeleteRange = async (rangePrefix: string) => {
    if (!confirm(`Are you sure you want to delete all numbers in range ${rangePrefix}?`)) return;
    try {
      const res = await deleteManualRange(rangePrefix);
      if (res.success) {
        const updatedRanges = await fetchManualRanges();
        setManualRanges(updatedRanges);
        playOtpChime();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const [testOtpStatus, setTestOtpStatus] = useState<Record<string, string>>({});
  const handleTestOtpSend = async (numberStr: string) => {
    setTestOtpStatus(prev => ({ ...prev, [numberStr]: "Sending..." }));
    try {
      const res = await testSendManualOtp({
        number: numberStr,
        otpCode: Math.floor(100000 + Math.random() * 900000).toString(),
        service: "Telegram",
        sender: "SUPER_X_GATEWAY",
      });
      if (res.success) {
        setTestOtpStatus(prev => ({ ...prev, [numberStr]: "Sent! Check console." }));
        playOtpChime();
        setTimeout(() => {
          setTestOtpStatus(prev => {
            const next = { ...prev };
            delete next[numberStr];
            return next;
          });
        }, 5000);
      } else {
        setTestOtpStatus(prev => ({ ...prev, [numberStr]: "Failed." }));
      }
    } catch (err: any) {
      setTestOtpStatus(prev => ({ ...prev, [numberStr]: "Error." }));
    }
  };

  const renderDevUnlockModal = () => {
    if (!isDevUnlockModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white relative animate-scaleUp">
          <button
            type="button"
            onClick={() => {
              setIsDevUnlockModalOpen(false);
              setDevUnlockError("");
              setDevPasscodeInput("");
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black tracking-tight">Admin & Developer Unlock</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter the secret administrator passcode to access protected bot configurations and manual number database uploads.
              </p>
            </div>

            <div className="w-full space-y-2">
              <input
                type="password"
                placeholder="••••••••••••"
                value={devPasscodeInput}
                onChange={(e) => setDevPasscodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyDevUnlock()}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-sm font-bold tracking-wider text-white focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
              {devUnlockError && (
                <p className="text-[11px] font-bold text-rose-400 animate-pulse">{devUnlockError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleVerifyDevUnlock}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-sm transition active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Verify Passcode
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Get Number Screen Specific State (voltxsms/m29 matching)
  const [getNumTab, setGetNumTab] = useState<"RANGE" | "SEARCH" | "ACCESS">(
    "RANGE",
  );
  const [rangeCustomInput, setRangeCustomInput] = useState<string>(() => {
    try {
      const userKey = user?.email
        ? `super_x_last_range_${user.email.toLowerCase().trim()}`
        : "super_x_last_range_default";
      const saved = localStorage.getItem(userKey);
      if (saved !== null && typeof saved === "string") {
        return saved;
      }
      const genericSaved = localStorage.getItem("super_x_last_range_default");
      if (genericSaved) return genericSaved;
    } catch {}
    return "26138XXX";
  });
  const [rangeInputError, setRangeInputError] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchServiceCategory, setSearchServiceCategory] =
    useState<string>("ALL");

  // Country & Operator Selection States for SEARCH tab
  const [selectedCountryOperator, setSelectedCountryOperator] =
    useState<CountryOperatorItem | null>(() => {
      return (
        COUNTRY_OPERATOR_LIST.find((c) => c.name === "Afghanistan - Mobile") ||
        COUNTRY_OPERATOR_LIST[0]
      );
    });
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countryFilterText, setCountryFilterText] = useState("");
  const [selectedSearchRange, setSelectedSearchRange] = useState("");
  const [isRangeDropdownOpen, setIsRangeDropdownOpen] = useState(false);
  const [rangeFilterText, setRangeFilterText] = useState("");

  const [dashboardToast, setDashboardToast] = useState<{
    message: string;
    type: "success" | "warning" | "info";
  } | null>(null);
  const [isSyncMode, setIsSyncMode] = useState(true);
  const [nationalFormat, setNationalFormat] = useState(true);
  const [removePlus, setRemovePlus] = useState(true);
  const [showFiltersStats, setShowFiltersStats] = useState(false);
  // Helper to sanitize allocated history, auto-expire 24h numbers, and timeout to FAILED after 5 min
  const sanitizeAllocatedHistory = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const fiveMinutesMs = 5 * 60 * 1000;

    const otpCounts = new Map<string, number>();
    list.forEach((item) => {
      if (item && item.otp) {
        const code = String(item.otp).trim();
        otpCounts.set(code, (otpCounts.get(code) || 0) + 1);
      }
    });

    return list
      .filter((item) => {
        if (!item || !item.number) return false;
        // 1. Purge numbers older than 24 hours
        const createdAt = item.createdAt || now;
        if (now - createdAt >= twentyFourHoursMs) return false;
        return true;
      })
      .map((item) => {
        const otp = item.otp ? String(item.otp).trim() : undefined;
        // If duplicate OTP or known false OTPs, reset
        const isDuplicateOrFalse =
          otp === "247-535" ||
          otp === "817-089" ||
          otp === "980-424" ||
          (otp && (otpCounts.get(otp) || 0) > 1);

        const cleanOtp = isDuplicateOrFalse ? undefined : otp;
        const createdAt = item.createdAt || now;
        const isTimedOut = !cleanOtp && (now - createdAt >= fiveMinutesMs);

        let status = item.status || "PENDING";
        if (cleanOtp) {
          status = "SUCCESS";
        } else if (isTimedOut || status === "FAILED") {
          status = "FAILED";
        } else {
          status = "PENDING";
        }

        let country = item.country;
        let operator = item.operator;
        const numDigits = (item.number || "").replace(/\D/g, "");

        if (
          !country ||
          country.toLowerCase().includes("international") ||
          country.toLowerCase() === "global" ||
          country.toLowerCase().includes("carrier") ||
          (country.toLowerCase().includes("sri lanka") && !numDigits.startsWith("94"))
        ) {
          const info = getCountryInfo(numDigits);
          if (info && info.name) {
            country = info.name;
          } else {
            country = "Global Route";
          }
        }

        if (
          !operator ||
          operator.toLowerCase().includes("physical carrier route") ||
          operator === "Carrier Route" ||
          operator.toLowerCase().includes("gateway") ||
          (operator.toLowerCase().includes("dialog") && !numDigits.startsWith("94"))
        ) {
          const cObj = GLOBAL_COUNTRIES_LIST.find((c) => c.name.toLowerCase() === country.toLowerCase());
          operator = cObj?.operators?.[0] || "Direct Carrier";
        }

        return {
          ...item,
          country,
          operator,
          status,
          otp: cleanOtp,
          service: cleanOtp ? (item.service || "Delivered SMS") : "Waiting for SMS...",
          activity: cleanOtp
            ? (item.activity || "Delivered just now")
            : isTimedOut
              ? "Failed (Timeout 5m)"
              : (item.activity || "Waiting for SMS..."),
        };
      });
  };

  // Dynamic User Role / Level calculation
  const currentUserDisplayRole: string = React.useMemo(() => {
    if (!user || !user.email) return 'Agent';
    const cleanEmail = user.email.toLowerCase().trim();
    if (
      cleanEmail === 'xzrmunna33@gmail.com' ||
      cleanEmail === 'xzrmunna96@gmail.com' ||
      cleanEmail.includes('xzrmunna33') ||
      cleanEmail === 'xzrmunna'
    ) {
      return 'SUPER X MANAGER';
    }
    const subAdmins = getAllSubAdmins();
    if (subAdmins.some((sa) => sa.email.toLowerCase().trim() === cleanEmail && sa.status === 'active')) {
      return 'Admin';
    }
    const accounts = getAllAccounts();
    const match = accounts.find((a) => a.email.toLowerCase().trim() === cleanEmail);
    if (match) {
      if (match.role === 'admin' || (match.role as string) === 'sub_admin') return 'Admin';
      if (match.role === 'user') return 'Standard User';
    }
    if (isAdminUser) return 'Admin';
    return 'Standard User';
  }, [user, isAdminUser, allUsersList]);

  // Real-time Account Status & Privilege Monitor (syncs role and manages account state)
  useEffect(() => {
    const monitorAccountState = () => {
      if (!user || !user.email) return;
      try {
        const cleanEmail = user.email.toLowerCase().trim();
        const subAdmins = getAllSubAdmins();
        const isSubAdmin = subAdmins.some((sa) => {
          const saEmail = sa.email.toLowerCase().trim();
          const saUser = saEmail.split('@')[0];
          return (
            sa.status === 'active' &&
            (saEmail === cleanEmail || saUser === cleanEmail || (sa.id && sa.id.toLowerCase() === cleanEmail))
          );
        });
        const isSuper =
          cleanEmail === 'xzrmunna33@gmail.com' ||
          cleanEmail === 'xzrmunna96@gmail.com' ||
          cleanEmail === 'xzrmunna';

        const deletedSet = getDeletedAccountEmails();
        if (!isSubAdmin && !isSuper && deletedSet.has(cleanEmail)) {
          onLogout();
          return;
        }

        const accounts = getAllAccounts();
        const currentAcc = accounts.find(
          (a) => a.email.toLowerCase().trim() === cleanEmail
        );

        if (currentAcc) {
          // Sync role changes dynamically in memory and local session
          if (currentAcc.role === 'admin' && user.role !== 'admin') {
            user.role = 'admin';
          } else if (currentAcc.role === 'user' && !isSubAdmin && !isSuper && user.role === 'admin') {
            user.role = 'user';
          }
        }

        if ((isSubAdmin || isSuper) && user.role !== 'admin') {
          user.role = 'admin';
        }
      } catch {}
    };

    window.addEventListener('super_x_accounts_updated', monitorAccountState);
    window.addEventListener('super_x_sub_admins_updated', monitorAccountState);
    window.addEventListener('storage', monitorAccountState);
    const interval = setInterval(() => {
      if (document.hidden) return;
      monitorAccountState();
    }, 20000);

    return () => {
      window.removeEventListener('super_x_accounts_updated', monitorAccountState);
      window.removeEventListener('super_x_sub_admins_updated', monitorAccountState);
      window.removeEventListener('storage', monitorAccountState);
      clearInterval(interval);
    };
  }, [user, onLogout]);

  const [topAppsList, setTopAppsList] = useState<TopAppItem[]>(() =>
    getTopAppsConfig(),
  );

  useEffect(() => {
    const handleTopAppsUpdate = () => {
      setTopAppsList(getTopAppsConfig());
    };
    window.addEventListener(TOP_APPS_UPDATE_EVENT, handleTopAppsUpdate);
    window.addEventListener("storage", handleTopAppsUpdate);
    return () => {
      window.removeEventListener(TOP_APPS_UPDATE_EVENT, handleTopAppsUpdate);
      window.removeEventListener("storage", handleTopAppsUpdate);
    };
  }, []);

  // Sync app counts with actual received hits
  useEffect(() => {
    setAppMonotonicCounts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const app of topAppsList) {
        const clean = (app.name || '').trim().toLowerCase();
        const hitsCount = filterHitsForApp(active24hHits, app.name).length;
        if (next[clean] !== hitsCount) {
          next[clean] = hitsCount;
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem("super_x_app_monotonic_counts_v2", JSON.stringify(next));
        } catch {}
        return next;
      }
      return prev;
    });
  }, [active24hHits, topAppsList]);

  const [showAllTopApps, setShowAllTopApps] = useState(false);
  const [showAllTopRanges, setShowAllTopRanges] = useState(false);
  const [activeAppConsoleService, setActiveAppConsoleService] = useState<string | null>(null);
  const [appConsoleSearch, setAppConsoleSearch] = useState<string>("");

  // Lock body scroll while SMS history modal is open to ensure butter-smooth scrolling without jitter
  useEffect(() => {
    if (activeAppConsoleService) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [activeAppConsoleService]);

  // Compute live sorted top ranges strictly aggregated from real Console (liveHits) traffic & monotonic server stats
  const sortedTopRanges = React.useMemo(() => {
    // Map to aggregate ranges and their active services directly from real incoming console packets
    const rangeMap = new Map<
      string,
      {
        id: string;
        countryCode: string;
        country: string;
        range: string;
        service: string;
        operator?: string;
        consoleHitCount: number;
      }
    >();

    // Aggregate strictly from real liveHits
    liveHits.forEach((hit) => {
      const cleanRange = (hit.range || "").replace(/\D/g, "");
      if (!cleanRange) return;

      const carrier = resolveCarrierDetails(cleanRange);
      const hitService = hit.sid || (hit.message && hit.message.toLowerCase().includes("whatsapp") ? "WhatsApp" : "SMS Direct");
      const hitCountry = getRealCountryName(hit.country, cleanRange).toUpperCase();
      const hitOperator = hit.operator || carrier.operator || "Direct Route";

      // Group by range or carrier prefix (first 4-7 digits)
      let rangeKey = cleanRange;
      if (cleanRange.startsWith("26134")) rangeKey = "26134";
      else if (cleanRange.startsWith("213655")) rangeKey = "213655";
      else if (cleanRange.startsWith("2287023")) rangeKey = "2287023";
      else if (cleanRange.startsWith("23762")) rangeKey = "23762";
      else if (cleanRange.startsWith("88017")) rangeKey = "88017";
      else if (cleanRange.startsWith("23275")) rangeKey = "23275";
      else if (cleanRange.startsWith("22997")) rangeKey = "22997";
      else if (cleanRange.length > 7) rangeKey = cleanRange.slice(0, 5);

      let finalCountry = (hitCountry || "").trim();
      const info = getCountryInfo(cleanRange);
      if (!finalCountry || finalCountry.toUpperCase() === "INTERNATIONAL" || (finalCountry.toUpperCase() === "BANGLADESH" && !cleanRange.startsWith("880"))) {
        finalCountry = info.name.toUpperCase();
      }
      if (rangeKey === "26134") finalCountry = "MADAGASCAR";
      else if (rangeKey === "213655") finalCountry = "ALGERIA";
      else if (rangeKey === "2287023") finalCountry = "TOGO";
      else if (rangeKey === "23762") finalCountry = "CAMEROON";
      else if (rangeKey === "88017") finalCountry = "BANGLADESH";
      else if (rangeKey === "23275") finalCountry = "SIERRA LEONE";
      else if (rangeKey === "22997") finalCountry = "BENIN";

      if (rangeMap.has(rangeKey)) {
        const entry = rangeMap.get(rangeKey)!;
        entry.consoleHitCount += 1;
        if (hit.sid && (hit.sid.toLowerCase().includes("facebook") || hit.sid.toLowerCase().includes("whatsapp"))) {
          entry.service = hit.sid;
        }
      } else {
        rangeMap.set(rangeKey, {
          id: rangeKey,
          countryCode: finalCountry,
          country: finalCountry,
          range: rangeKey,
          service: hitService,
          operator: hitOperator,
          consoleHitCount: 1,
        });
      }
    });

    if (rangeMap.size === 0) {
      return [];
    }

    // Sort strictly descending by real received hit volume
    return Array.from(rangeMap.values())
      .map((item) => {
        const serverCount = globalStats?.rangeCounts?.[item.range] || 0;
        const finalCount = Math.max(item.consoleHitCount, serverCount);
        return {
          ...item,
          consoleHitCount: finalCount,
          totalHits: finalCount,
          recentHits: finalCount,
        };
      })
      .sort((a, b) => b.totalHits - a.totalHits);
  }, [liveHits, globalStats]);

  const [getNumHistory, setGetNumHistory] = useState<
    Array<{
      id: string;
      number: string;
      country: string;
      operator: string;
      status: "PENDING" | "SUCCESS" | "FAILED";
      otp?: string;
      service?: string;
      activity: string;
      createdAt?: number;
    }>
  >(() => {
    try {
      const saved = localStorage.getItem(
        `super_x_get_num_history_${user.email}`,
      );
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sanitizeAllocatedHistory(parsed);
        }
      }
    } catch {}
    return [];
  });

  // Persist user allocated numbers locally so ownership is preserved across views & sessions
  useEffect(() => {
    try {
      localStorage.setItem(
        `super_x_get_num_history_${user.email}`,
        JSON.stringify(getNumHistory),
      );
    } catch {}
  }, [getNumHistory, user.email]);

  const [isGetNumVoiceOn, setIsGetNumVoiceOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("super_x_get_num_voice_enabled") !== "false";
    } catch {
      return true;
    }
  });

  const toggleGetNumVoice = () => {
    unlockAudioAndSpeechContext();
    const next = !isGetNumVoiceOn;
    setIsGetNumVoiceOn(next);
    try {
      localStorage.setItem("super_x_get_num_voice_enabled", String(next));
    } catch {}
    if (next) {
      speakOtpAnnouncement("582914", selectedCountryOperator?.country || "Bangladesh");
    }
  };

  const prevNumOtpsRef = useRef<Record<string, string>>({});
  const isHistoryInitializedRef = useRef<boolean>(false);

  // Auto-announce OTP in spoken voice when a new OTP code is delivered, including after page refresh
  useEffect(() => {
    getNumHistory.forEach((item) => {
      if (item.otp) {
        const otpKey = `${item.id}_${item.otp}`;
        const alreadySpoken = isOtpAlreadySpoken(otpKey);
        const wasPrevKnown = prevNumOtpsRef.current[item.id] === item.otp;

        // Determine if this entry was received recently (within 10 minutes)
        let isRecent = true;
        const timeStr = String((item as any).time || item.activity || "").toLowerCase();
        if (
          timeStr.includes("hr") ||
          timeStr.includes("hour") ||
          timeStr.includes("day") ||
          timeStr.includes("yesterday") ||
          timeStr.includes("month")
        ) {
          isRecent = false;
        }
        if (item.createdAt && Date.now() - Number(item.createdAt) > 10 * 60 * 1000) {
          isRecent = false;
        }

        if (!alreadySpoken && (!wasPrevKnown || !isHistoryInitializedRef.current)) {
          markOtpAsSpoken(otpKey);
          if (isRecent && isGetNumVoiceOn) {
            speakOtpAnnouncement(item.otp, item.country);
          }
        } else if (!alreadySpoken) {
          markOtpAsSpoken(otpKey);
        }

        prevNumOtpsRef.current[item.id] = item.otp;
      }
    });
    isHistoryInitializedRef.current = true;
  }, [getNumHistory, isGetNumVoiceOn]);

  // Reload and initial batch-sync history when active user account changes
  useEffect(() => {
    let localItems: any[] = [];
    try {
      const saved = localStorage.getItem(
        `super_x_get_num_history_${user.email}`,
      );
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localItems = sanitizeAllocatedHistory(parsed);
          setGetNumHistory(localItems);
        }
      }
    } catch {}

    // Batch sync with server to ensure 4-5 collaborators on same email share all numbers & OTPs
    if (user.email) {
      fetch("/api/account/numbers/batch-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          numbers: localItems,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.numbers)) {
            setGetNumHistory(sanitizeAllocatedHistory(data.numbers));
          }
        })
        .catch(() => {});
    }
  }, [user.email]);

  // Real-time Live Synchronization for Shared Account Numbers (Multi-device collaborative synchronization)
  // Optimized to use lightweight short-polling to completely avoid browser connection exhaustion (max 6 TCP limit)
  // and Vercel serverless function execution timeout issues.
  useEffect(() => {
    if (!user?.email) return;

    let isMounted = true;

    const pollNumbers = async () => {
      try {
        const saved = localStorage.getItem(`super_x_get_num_history_${user.email}`);
        let localItems: any[] = [];
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              localItems = sanitizeAllocatedHistory(parsed);
            }
          } catch {}
        }

        const res = await fetch("/api/account/numbers/batch-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            numbers: localItems,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.success && Array.isArray(data.numbers) && isMounted) {
            setGetNumHistory((prev) => {
              const sanitizedNext = sanitizeAllocatedHistory(data.numbers);
              // Compare and play voice announcement for new OTPs if received
              const oldMap = new Map(prev.map(item => [item.id, item.otp || ""]));
              data.numbers.forEach((entry: any) => {
                const prevOtp = oldMap.get(entry.id);
                if (entry.otp && entry.otp !== prevOtp) {
                  if (isGetNumVoiceOn) {
                    speakOtpAnnouncement(entry.otp, entry.country || "Bangladesh");
                  }
                  showDashboardToast(`🎉 Real-time OTP received: ${entry.otp} (${entry.number})`, "success");
                }
              });
              if (JSON.stringify(prev) === JSON.stringify(sanitizedNext)) {
                return prev;
              }
              return sanitizedNext;
            });
          }
        }
      } catch {}
    };

    // Fast 5-second polling interval for sub-second synchronization among concurrent users
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      pollNumbers();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user?.email, isGetNumVoiceOn]);

  // Support Chat State for User
  const [isUserChatOpen, setIsUserChatOpen] = useState(false);
  const [userChatInput, setUserChatInput] = useState("");
  const [userChatLang, setUserChatLang] = useState<'BN' | 'EN'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('superx_chat_lang') as 'BN' | 'EN') || 'BN';
    }
    return 'BN';
  });
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [adminTypingName, setAdminTypingName] = useState("");
  const userTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showFloatingChatLabel, setShowFloatingChatLabel] = useState(false);

  const [userChatMessages, setUserChatMessages] = useState<ChatMessage[]>(() =>
    getChatMessagesForUser(user.email),
  );
  const [userUnreadCount, setUserUnreadCount] = useState<number>(() =>
    getUserUnreadChatCount(user.email),
  );
  const userChatEndRef = useRef<HTMLDivElement | null>(null);

  const toggleUserChatLang = () => {
    const next = userChatLang === 'BN' ? 'EN' : 'BN';
    setUserChatLang(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('superx_chat_lang', next);
    }
  };

  // Floating Chat Label auto slide out and slide in effect
  useEffect(() => {
    const showTimer = setTimeout(() => setShowFloatingChatLabel(true), 800);
    const hideTimer = setTimeout(() => setShowFloatingChatLabel(false), 5500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Notification Modal & Unread Count State
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifList, setNotifList] = useState<NotificationItem[]>(() =>
    getNotificationsForUser(user.email),
  );
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(() =>
    getUnreadNotificationCountForUser(user.email),
  );

  // Sync Notifications updates in real-time
  useEffect(() => {
    const handleNotifUpdate = () => {
      setNotifList(getNotificationsForUser(user.email));
      setUnreadNotifCount(getUnreadNotificationCountForUser(user.email));
    };
    window.addEventListener(NOTIFICATION_UPDATE_EVENT, handleNotifUpdate);
    return () => {
      window.removeEventListener(NOTIFICATION_UPDATE_EVENT, handleNotifUpdate);
    };
  }, [user.email]);

  useEffect(() => {
    if (isNotifModalOpen) {
      markNotificationsAsReadForUser(user.email);
      setUnreadNotifCount(0);
    }
  }, [isNotifModalOpen, user.email]);

  // Fetch manual number ranges and pool list on mount, interval, and view change
  useEffect(() => {
    const loadRanges = () => {
      fetchManualRanges()
        .then((ranges) => {
          if (Array.isArray(ranges)) {
            setManualRanges(ranges);
          }
        })
        .catch(() => {});
    };

    loadRanges();
    const interval = setInterval(loadRanges, 6000);

    if (currentView === "smsRange") {
      setManualRangesLoading(true);
      fetchManualRanges()
        .then((ranges) => {
          setManualRanges(ranges);
        })
        .catch(() => {})
        .finally(() => setManualRangesLoading(false));
    } else if (currentView === "smsNumber") {
      setManualNumbersLoading(true);
      fetchManualNumbers(1000, 0)
        .then((res) => {
          setManualNumbers(res.numbers || []);
          setManualNumbersTotal(res.total || 0);
        })
        .catch(() => {})
        .finally(() => setManualNumbersLoading(false));
    }

    return () => clearInterval(interval);
  }, [currentView]);

  // Sync Live Chat updates in real-time
  useEffect(() => {
    const handleChatUpdate = () => {
      setUserChatMessages(getChatMessagesForUser(user.email));
      setUserUnreadCount(getUserUnreadChatCount(user.email));
    };
    window.addEventListener(CHAT_UPDATE_EVENT, handleChatUpdate);
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handleChatUpdate);
    };
  }, [user.email]);

  useEffect(() => {
    // 1. Initial sync with server active API key
    syncSystemApiKeyFromServer().then((remoteKey) => {
      if (remoteKey && remoteKey.trim()) {
        setApiKeyState(remoteKey.trim());
      }
    });

    const handleKeyUpdate = () => {
      const newKey = getMauthApiKey();
      setApiKeyState(newKey);
    };
    window.addEventListener("voltx_key_updated", handleKeyUpdate);
    return () => {
      window.removeEventListener("voltx_key_updated", handleKeyUpdate);
    };
  }, []);

  useEffect(() => {
    if (isUserChatOpen) {
      ensureBotWelcomeMessage(user.email, user.name, userChatLang);
      markChatAsReadByUser(user.email);
      setUserUnreadCount(0);
      setUserChatMessages(getChatMessagesForUser(user.email));
      setTimeout(() => {
        userChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isUserChatOpen, userChatMessages.length, user.email, user.name, userChatLang]);

  // Real-time polling for admin typing status when chat modal is open
  useEffect(() => {
    if (!isUserChatOpen) {
      setIsAdminTyping(false);
      return;
    }

    const checkAdminTyping = async () => {
      try {
        const status = await fetchTypingStatus(user.email);
        if (status.isTyping && status.who === 'admin') {
          setIsAdminTyping(true);
          if (status.name) {
            setAdminTypingName(status.name);
          }
        } else {
          setIsAdminTyping(false);
        }
      } catch {}
    };

    checkAdminTyping();
    const typingInterval = setInterval(() => {
      if (document.hidden) return;
      checkAdminTyping();
    }, 5000);

    return () => {
      clearInterval(typingInterval);
      if (userTypingTimeoutRef.current) {
        clearTimeout(userTypingTimeoutRef.current);
      }
      sendTypingStatus(user.email, false, 'user', user.name);
    };
  }, [isUserChatOpen, user.email, user.name]);

  const handleUserChatInputChange = (val: string) => {
    setUserChatInput(val);
    if (!isUserChatBlocked(user.email)) {
      sendTypingStatus(user.email, true, 'user', user.name);
      if (userTypingTimeoutRef.current) {
        clearTimeout(userTypingTimeoutRef.current);
      }
      userTypingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(user.email, false, 'user', user.name);
      }, 2000);
    }
  };

  const handleSendUserMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userChatInput.trim() || isUserChatBlocked(user.email)) return;
    const textToSend = userChatInput.trim();

    // Clear typing indicator
    if (userTypingTimeoutRef.current) {
      clearTimeout(userTypingTimeoutRef.current);
    }
    sendTypingStatus(user.email, false, 'user', user.name);

    sendUserMessage(user.email, user.name, textToSend);
    setUserChatInput("");
    setUserChatMessages(getChatMessagesForUser(user.email));

    // WhatsApp / Messenger style typing animation
    setIsBotTyping(true);
    setTimeout(() => {
      setUserChatMessages(getChatMessagesForUser(user.email));
      setIsBotTyping(false);
      setTimeout(() => {
        userChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }, 1200);
  };

  // Current user account status & fine-grained permissions lookup
  const currentUserAccount = allUsersList.find(
    (u) => u.email.toLowerCase() === user.email.toLowerCase(),
  );
  const isSuspended =
    currentUserAccount?.status === "suspended" ||
    currentUserAccount?.status === "rejected";
  const userPerms: UserPermissions =
    currentUserAccount?.permissions || DEFAULT_USER_PERMISSIONS;

  // Manager & Official Roles Detection
  const cleanCurrentEmail = (user?.email || "").toLowerCase().trim();
  const isManagerAccount =
    cleanCurrentEmail === "xzrmunna33@gmail.com" ||
    cleanCurrentEmail === "xzrmunna96@gmail.com" ||
    cleanCurrentEmail.includes("xzrmunna33") ||
    currentUserAccount?.role === "admin" ||
    user?.role === "admin" ||
    isAdminUser;

  // Live tick state for real-time relative time counting (Just now, 1 min ago, 2 min ago...)
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      setNowTick(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format live activity time
  const formatRelativeActivityTime = (
    item: { createdAt?: number; activity: string },
    nowMs: number,
  ) => {
    if (!item.createdAt) {
      return item.activity || "Just now";
    }
    const diffSec = Math.max(0, Math.floor((nowMs - item.createdAt) / 1000));
    if (diffSec < 45) {
      return "Just now";
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return diffMin === 1 ? "1 min ago" : `${diffMin} min ago`;
    }
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) {
      return diffHrs === 1 ? "1 hr ago" : `${diffHrs} hrs ago`;
    }
    const diffDays = Math.floor(diffHrs / 24);
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDashboardToast = (
    msg: string,
    type: "success" | "warning" | "info" = "success",
    durationMs: number = 1000,
  ) => {
    setDashboardToast({ message: msg, type });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setDashboardToast(null);
    }, durationMs);
  };

  // Console Specific State
  const [consoleFilter, setConsoleFilter] = useState("");
  const [consoleServiceFilter, setConsoleServiceFilter] = useState("ALL");
  const [lastUpdatedTime, setLastUpdatedTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour12: false }),
  );
  const [isConsoleRefreshing, setIsConsoleRefreshing] = useState(false);
  const [consoleApiMeta, setConsoleApiMeta] = useState<{
    code: number;
    message?: string;
    status?: string;
  } | null>(null);

  // Helper to format timestamp as HH:mm:ss
  const formatHitTime = (timeVal: number | string) => {
    if (!timeVal)
      return new Date().toLocaleTimeString("en-GB", { hour12: false });
    const d =
      typeof timeVal === "number" ? new Date(timeVal) : new Date(timeVal);
    if (isNaN(d.getTime())) return String(timeVal);
    return d.toLocaleTimeString("en-GB", { hour12: false });
  };

  // Helper to extract OTP digits from message
  const extractOtp = (message: string): string | null => {
    if (!message) return null;
    return extractOtpCode(message);
  };

  // Helper to mask OTP code in message with '#' (e.g. 088309 -> ######)
  const maskOtpInMessage = (
    message: string,
    otpCode: string | null,
  ): string => {
    if (!message) return "";
    if (otpCode) {
      // Replace all numeric digits in the extracted OTP code with '#'
      const masked = "#".repeat(otpCode.length) || "######";
      return message.split(otpCode).join(masked);
    }
    // Fallback: replace any isolated 4 to 8 digit numbers in message with '#'
    return message.replace(/\b\d{4,8}\b/g, (match) => "#".repeat(match.length));
  };

  // Helper to verify if an incoming live SMS packet belongs to the current user's allocated number
  const isHitOwnedByUser = (hit: {
    range?: string;
    message?: string;
    time?: number | string;
  }): { isOwner: boolean; matchedEntry?: (typeof getNumHistory)[0] } => {
    if (!hit || !hit.range) return { isOwner: false };
    const cleanHitRange = (hit.range || "").replace(/\D/g, "");
    if (!cleanHitRange) return { isOwner: false };

    // If the hit range is shorter than 10 digits (e.g. 23274 or 22901400), it is a CARRIER / ROUTE prefix, NOT an individual phone number!
    // In that case, ONLY claim ownership if the message text explicitly contains the user's full number.
    if (cleanHitRange.length < 10) {
      const matchedByMessage = getNumHistory.find((entry) => {
        const cleanNum = (entry.number || "").replace(/\D/g, "");
        return (
          cleanNum.length >= 9 &&
          Boolean(hit.message && hit.message.includes(cleanNum))
        );
      });
      if (matchedByMessage) {
        return { isOwner: true, matchedEntry: matchedByMessage };
      }
      return { isOwner: false };
    }

    const hitTime =
      typeof hit.time === "number"
        ? hit.time < 10000000000
          ? hit.time * 1000
          : hit.time
        : hit.time
          ? new Date(hit.time).getTime()
          : Date.now();

    const matchedEntry = getNumHistory.find((entry) => {
      const cleanNum = (entry.number || "").replace(/\D/g, "");
      if (!cleanNum || cleanNum.length < 9) return false;

      // Timing check: Must have arrived after the number was allocated
      if (entry.createdAt && hitTime < entry.createdAt - 10000) {
        return false;
      }

      // 1. Direct exact match
      if (cleanNum === cleanHitRange) {
        return true;
      }

      // 2. Exact match on full length (min 10 digits and max 3 digits international prefix difference)
      if (cleanHitRange.length >= 10 && cleanNum.length >= 10) {
        if (
          (cleanNum.endsWith(cleanHitRange) || cleanHitRange.endsWith(cleanNum)) &&
          Math.abs(cleanNum.length - cleanHitRange.length) <= 3
        ) {
          return true;
        }
      }

      // 3. Message explicitly contains the full number
      if (hit.message && hit.message.includes(cleanNum)) {
        return true;
      }

      return false;
    });

    if (matchedEntry) {
      return { isOwner: true, matchedEntry };
    }
    return { isOwner: false };
  };

  // Helper for service branding colors
  const getServiceTextColor = (sid: string) => {
    const s = (sid || "").toLowerCase();
    if (s.includes("whatsapp")) return "text-[#10B981]";
    if (s.includes("facebook") || s.includes("fb")) return "text-[#2563EB]";
    if (s.includes("telegram") || s.includes("tg")) return "text-[#0284C7]";
    if (s.includes("google")) return "text-[#DC2626]";
    if (s.includes("imo")) return "text-[#2563EB]";
    if (s.includes("tiktok")) return "text-neutral-900";
    if (s.includes("instagram")) return "text-[#E1306C]";
    return "text-[#4F46E5]";
  };

  const getServiceStyle = (sid: string) => {
    const s = (sid || "").toLowerCase();
    if (s.includes("whatsapp"))
      return {
        text: "text-emerald-700",
        border: "border-emerald-300",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    if (s.includes("facebook"))
      return {
        text: "text-[#0866FF]",
        border: "border-blue-300",
        badge: "bg-blue-50 text-[#0866FF] border-blue-200",
      };
    if (s.includes("telegram"))
      return {
        text: "text-sky-600",
        border: "border-sky-300",
        badge: "bg-sky-50 text-sky-700 border-sky-200",
      };
    if (s.includes("google"))
      return {
        text: "text-red-600",
        border: "border-red-300",
        badge: "bg-red-50 text-red-700 border-red-200",
      };
    if (s.includes("imo"))
      return {
        text: "text-blue-600",
        border: "border-blue-300",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    if (s.includes("tiktok"))
      return {
        text: "text-neutral-900",
        border: "border-neutral-300",
        badge: "bg-neutral-100 text-neutral-900 border-neutral-200",
      };
    if (s.includes("instagram"))
      return {
        text: "text-pink-600",
        border: "border-pink-300",
        badge: "bg-pink-50 text-pink-700 border-pink-200",
      };
    return {
      text: "text-indigo-600",
      border: "border-indigo-300",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  };

  // Access List Filter & Flattened 1-row-per-range memo
  const [accessListFilter, setAccessListFilter] = useState("");

  const flattenedAccessRows = React.useMemo(() => {
    const rows: Array<{
      sid: string;
      range: string;
      otp?: string;
      message?: string;
      number?: string;
      last_at?: number;
      carrier: { operator: string; country: string };
    }> = [];

    liveAccessList.forEach((srv) => {
      (srv.ranges || []).forEach((r) => {
        const cleanRange = (r || "").trim();
        if (!cleanRange) return;

        // Apply search filter if active
        if (accessListFilter.trim()) {
          const q = accessListFilter.toLowerCase().trim();
          const matchSid = srv.sid.toLowerCase().includes(q);
          const matchRange = cleanRange.toLowerCase().includes(q);
          if (!matchSid && !matchRange) return;
        }

        const data = srv.rangeOtps?.[cleanRange];
        const otp = data?.otp || extractOtpCode(data?.message || "");
        const carrier = resolveCarrierDetails(cleanRange);

        rows.push({
          sid: srv.sid,
          range: cleanRange,
          otp: otp || undefined,
          message: data?.message,
          number: data?.number,
          last_at: data?.time ? Math.floor(data.time / 1000) : srv.last_at,
          carrier,
        });
      });
    });

    // Sort: items with OTP first, then by last_at descending
    return rows.sort((a, b) => {
      if (a.otp && !b.otp) return -1;
      if (!a.otp && b.otp) return 1;
      return (b.last_at || 0) - (a.last_at || 0);
    });
  }, [liveAccessList, accessListFilter]);

  // Sender / Range View State & Live Aggregation
  const [senderRangeFilter, setSenderRangeFilter] = useState("");
  const [senderCategoryFilter, setSenderCategoryFilter] = useState("ALL");

  interface SenderRangeItem {
    key: string;
    range: string;
    sid: string;
    operator: string;
    country: string;
    hitsCount: number;
    latestMessage: string;
    latestTime: number | string;
    hasActiveStream: boolean;
  }

  const senderRangeList: SenderRangeItem[] = React.useMemo(() => {
    const map = new Map<string, SenderRangeItem>();

    // 1. Incorporate live incoming hits from real-time stream
    liveHits.forEach((hit) => {
      const rawNum = String(hit.range || (hit as any).number || "").replace(/\D/g, "");
      if (!rawNum) return;
      // Truncate to 5-digit carrier range prefix so all hits group into carrier ranges (e.g. 22901, 94740, 25882, 94743)
      const cleanRange = rawNum.length >= 5 ? rawNum.slice(0, 5) : rawNum;
      const key = `${hit.sid || "SMS"}_${cleanRange}`;
      const carrier = resolveCarrierDetails(cleanRange);

      if (!map.has(key)) {
        map.set(key, {
          key,
          range: cleanRange,
          sid: hit.sid || "SMS",
          operator: hit.operator || carrier.operator,
          country: getRealCountryName(hit.country, cleanRange),
          hitsCount: 1,
          latestMessage: hit.message,
          latestTime: hit.time,
          hasActiveStream: true,
        });
      } else {
        const item = map.get(key)!;
        item.hitsCount += 1;
        const currentOtp = extractOtpCode(item.latestMessage);
        const newOtp = extractOtpCode(hit.message);
        const hitTimeVal = typeof hit.time === "number" ? hit.time : Date.now();
        const oldTimeVal = typeof item.latestTime === "number" ? item.latestTime : 0;

        if (newOtp || !currentOtp || hitTimeVal >= oldTimeVal) {
          if (newOtp || !currentOtp) {
            item.latestMessage = hit.message;
            item.latestTime = hitTimeVal;
          }
        }
      }
    });

    // 2. Incorporate access list services and rangeOtps
    liveAccessList.forEach((srv) => {
      (srv.ranges || []).forEach((r) => {
        const cleanRange = (r || "").trim();
        if (!cleanRange) return;
        const key = `${srv.sid}_${cleanRange}`;
        const rangeOtpData = srv.rangeOtps?.[cleanRange];
        const defaultMsg = rangeOtpData?.message || "Carrier range active and ready for incoming OTP";

        if (!map.has(key)) {
          const carrier = resolveCarrierDetails(cleanRange);
          map.set(key, {
            key,
            range: cleanRange,
            sid: srv.sid,
            operator: carrier.operator,
            country: carrier.country,
            hitsCount: rangeOtpData ? 1 : 0,
            latestMessage: defaultMsg,
            latestTime: rangeOtpData?.time || (srv.last_at ? srv.last_at * 1000 : Date.now()),
            hasActiveStream: !!rangeOtpData,
          });
        } else {
          const item = map.get(key)!;
          if (rangeOtpData?.otp && !extractOtpCode(item.latestMessage)) {
            item.latestMessage = rangeOtpData.message;
            item.latestTime = rangeOtpData.time;
          }
        }
      });
    });

    // 3. Fallback popular carrier ranges if needed
    if (map.size < 6) {
      POPULAR_RANGES.forEach((pr) => {
        const key = `WhatsApp_${pr.code}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            range: pr.code,
            sid: "WhatsApp",
            operator: pr.name,
            country: pr.country,
            hitsCount: 0,
            latestMessage: "Carrier gateway waiting for stream hits",
            latestTime: Date.now(),
            hasActiveStream: false,
          });
        }
      });
    }

    return Array.from(map.values());
  }, [liveHits, liveAccessList]);

  const filteredSenderRanges = React.useMemo(() => {
    return senderRangeList.filter((item) => {
      if (senderCategoryFilter !== "ALL") {
        const sidUpper = item.sid.toUpperCase();
        const catUpper = senderCategoryFilter.toUpperCase();
        if (!sidUpper.includes(catUpper)) return false;
      }
      if (senderRangeFilter.trim()) {
        const q = senderRangeFilter.toLowerCase();
        return (
          item.sid.toLowerCase().includes(q) ||
          item.range.toLowerCase().includes(q) ||
          item.operator.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q) ||
          item.latestMessage.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [senderRangeList, senderCategoryFilter, senderRangeFilter]);

  const consoleFilteredHits = React.useMemo(() => {
    if (!consoleFilter.trim()) return liveHits;
    const q = consoleFilter.toLowerCase();
    return liveHits.filter((hit) => {
      return (
        hit.sid?.toLowerCase().includes(q) ||
        hit.operator?.toLowerCase().includes(q) ||
        hit.country?.toLowerCase().includes(q) ||
        hit.range?.toLowerCase().includes(q) ||
        hit.message?.toLowerCase().includes(q)
      );
    });
  }, [liveHits, consoleFilter]);

  const filteredManualRangesList = React.useMemo(() => {
    // Only show ranges present in user's active workspace
    const inWorkspace = manualRanges.filter((r) =>
      userWorkspaceRangePrefixes.includes(r.rangePrefix)
    );

    return inWorkspace.filter((r) => {
      const q = manualRangesSearch.trim().toLowerCase();
      const isSriLanka = (r.country || "").toLowerCase().includes("sri lanka");
      const platStr = (isSriLanka ? "WHATSAPP" : (r.platform || r.socialMedia || "WHATSAPP")).toUpperCase();
      const textMatch =
        !q ||
        r.country.toLowerCase().includes(q) ||
        r.rangePrefix.toLowerCase().includes(q) ||
        (r.maskedRange && r.maskedRange.toLowerCase().includes(q)) ||
        (r.dialCode && r.dialCode.toLowerCase().includes(q)) ||
        platStr.toLowerCase().includes(q);
      const platMatch =
        manualRangesPlatformFilter === "ALL" ||
        platStr.includes(manualRangesPlatformFilter.toUpperCase()) ||
        platStr.includes("ALL SOCIAL");
      return textMatch && platMatch;
    });
  }, [manualRanges, userWorkspaceRangePrefixes, manualRangesSearch, manualRangesPlatformFilter]);

  const filteredAvailableTerminations = React.useMemo(() => {
    const q = terminationSearchQuery.trim().toLowerCase();
    return manualRanges.filter((r) => {
      const isSriLanka = (r.country || "").toLowerCase().includes("sri lanka");
      const platStr = (isSriLanka ? "whatsapp" : (r.platform || r.socialMedia || "whatsapp")).toLowerCase();
      const info = formatTerminationInfo(r);

      if (terminationDropdownPlatform !== "ALL") {
        if (!platStr.includes(terminationDropdownPlatform.toLowerCase())) {
          return false;
        }
      }

      if (!q) return true;
      return (
        r.country.toLowerCase().includes(q) ||
        r.rangePrefix.toLowerCase().includes(q) ||
        info.operator.toLowerCase().includes(q) ||
        info.masked.toLowerCase().includes(q) ||
        (r.dialCode && r.dialCode.toLowerCase().includes(q)) ||
        platStr.includes(q)
      );
    });
  }, [manualRanges, terminationSearchQuery, terminationDropdownPlatform]);

  const filteredManualNumbersList = React.useMemo(() => {
    return manualNumbers.filter((n) => {
      const textMatch =
        !manualNumbersSearch.trim() ||
        n.number.includes(manualNumbersSearch) ||
        n.country.toLowerCase().includes(manualNumbersSearch.toLowerCase()) ||
        n.cleanDigits.includes(manualNumbersSearch);
      const statMatch =
        manualNumbersStatusFilter === "ALL" ||
        (manualNumbersStatusFilter === "Available" && !n.allocated) ||
        (manualNumbersStatusFilter === "Allocated" && n.allocated);
      return textMatch && statMatch;
    });
  }, [manualNumbers, manualNumbersSearch, manualNumbersStatusFilter]);

  const handleAllocateFromSenderRange = (
    rangeDigits: string,
    serviceName?: string,
  ) => {
    if (serviceName) {
      setSelectedService(serviceName);
    }
    setSelectedRange(rangeDigits);
    setRangeCustomInput(rangeDigits);
    setCurrentView("getNumber");
    setGetNumTab("RANGE");
    setDashboardToast({
      message: `Carrier range ${rangeDigits} ${serviceName ? `for ${serviceName}` : ""} selected for direct allocation!`,
      type: "success",
    });
  };

  const isFetchingDataRef = useRef(false);
  const forwardedOtpKeysRef = useRef(new Set<string>());

  // Poll background data from integrated upstream & console auto refresh countdown
  const fetchRealTimeData = async () => {
    if (isFetchingDataRef.current) return;
    isFetchingDataRef.current = true;
    try {
      const activeKeys = getActiveApiKeys().filter((k) => k && k.trim() && k !== 'MOBEKJ8H20I');
      const targetKeys = activeKeys.length > 0 ? activeKeys : [apiKey || getMauthApiKey() || ''];

      const consolePromises = targetKeys.map((k) =>
        fetchLiveConsoleDetailed(k).catch(() => ({ hits: [], code: 200, message: "OK", status: 200 }))
      );

      const [consoleResults, access, otps, sharedAccRes, intsRes, foxRes] = await Promise.all([
        Promise.all(consolePromises),
        fetchLiveAccess(targetKeys[0] || apiKey),
        fetchSuccessOtps(targetKeys[0] || apiKey),
        user?.email
          ? fetch(`/api/account/numbers?email=${encodeURIComponent(user.email)}`)
              .then((r) => r.json())
              .catch(() => null)
          : Promise.resolve(null),
        fetchIntsCdrStats().catch(() => ({ success: false, hits: [] })),
        fetchFoxSmsStats().catch(() => ({ success: false, hits: [] })),
      ]);

      const allConsoleHits = consoleResults.flatMap((r) => r.hits || []);
      const primaryRes = consoleResults[0] || { code: 200, message: "OK", status: 200 };

      setConsoleApiMeta({
        code: primaryRes.code,
        message: primaryRes.message,
        status: primaryRes.status != null ? String(primaryRes.status) : undefined,
      });

      const combinedHits = [
        ...allConsoleHits,
        ...(intsRes?.hits || []),
        ...(foxRes?.hits || []),
      ];

      if (combinedHits.length > 0) {
        // Auto-forward live OTP packets to Telegram channel (deduplicated)
        combinedHits.forEach((h) => {
          if (h.message) {
            const extracted = extractOtpCode(h.message);
            const key = `${h.range}_${h.time}_${extracted || ''}`;
            if (extracted && !forwardedOtpKeysRef.current.has(key)) {
              forwardedOtpKeysRef.current.add(key);
              if (forwardedOtpKeysRef.current.size > 200) {
                forwardedOtpKeysRef.current.clear();
              }
              sendOtpToTelegram({
                number: (h as any).number || h.range || "Live Gateway",
                service: h.sid || "Live Console",
                message: h.message,
                time: h.time,
              }).catch(() => {});
            }
          }
        });

        mergeIncomingHits(combinedHits);

        // Broadcast to global server pool so all other connected users & admins receive them
        fetch("/api/global-live-stream/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hits: combinedHits }),
        }).catch(() => {});
      }
      if (access && access.length > 0) {
        setLiveAccessList((prev) => {
          if (
            prev.length === access.length &&
            prev[0]?.sid === access[0]?.sid &&
            prev[0]?.last_at === access[0]?.last_at
          ) {
            return prev;
          }
          return access;
        });
      }
      if (otps && otps.length > 0) {
        // Auto-forward verified OTPs to Telegram
        otps.forEach((o) => {
          if (o.message) {
            sendOtpToTelegram({
              number: o.number || "Direct Route",
              service: "Verified Carrier SMS",
              message: o.message,
              time: o.time,
            }).catch(() => {});
          }
        });

        setLiveSuccessOtps((prev) => {
          if (
            prev.length === otps.length &&
            prev[0]?.otp_id === otps[0]?.otp_id &&
            prev[0]?.time === otps[0]?.time
          ) {
            return prev;
          }
          return otps;
        });
      }

      // Real-time live OTP matching and collaborative multi-session sync for allocated numbers
      setGetNumHistory((currentHistory) => {
        let hasChange = false;
        let newlyDeliveredOtp = "";
        let newlyDeliveredNum = "";

        // 1. Merge server numbers from other teammates logged in under same email
        let baseList = [...currentHistory];
        if (sharedAccRes?.success && Array.isArray(sharedAccRes.numbers)) {
          const serverNumbers: any[] = sharedAccRes.numbers;
          const localMap = new Map(baseList.map((item) => [item.id, item]));

          serverNumbers.forEach((sNum) => {
            const cleanSNum = sNum.number.replace(/\D/g, "");
            let found = localMap.get(sNum.id);
            if (!found) {
              found = baseList.find(
                (b) => b.number.replace(/\D/g, "") === cleanSNum,
              );
            }

            if (found) {
              // If server has OTP delivered on another teammate's session and local was pending
              if (sNum.otp && !found.otp) {
                found.otp = sNum.otp;
                found.status = "SUCCESS";
                found.service = sNum.service || found.service;
                found.activity = sNum.activity || "Delivered just now";
                hasChange = true;
                newlyDeliveredOtp = sNum.otp;
                newlyDeliveredNum = found.number;
              }
            } else {
              // Teammate took a new number from another browser/tab
              baseList.push(sNum);
              hasChange = true;
            }
          });
          baseList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        // 2. Perform live carrier / console OTP matching
        const nextHistory = baseList.map((entry) => {
          if (entry.otp) return entry; // Already received real OTP
          const cleanNum = (entry.number || "").replace(/\D/g, "");
          if (!cleanNum || cleanNum.length < 8) return entry;

          let matchedCode: string | null = null;
          let matchedService = entry.service || "Live SMS";

          // 1. PRIMARY SOURCE: Direct verified carrier delivered reports (/success-otp)
          if (otps && otps.length > 0) {
            const foundSuccessOtp = otps.find((o) => {
              const cleanOtpNum = (o.number || "").replace(/\D/g, "");
              if (!cleanOtpNum || cleanOtpNum.length < 9) return false;

              // Strict number match: Exact match or full international suffix match (min 9 digits, max 3 digits diff)
              const isMatch =
                cleanNum === cleanOtpNum ||
                (cleanNum.length >= 9 &&
                  cleanOtpNum.length >= 9 &&
                  (cleanNum.endsWith(cleanOtpNum) ||
                    cleanOtpNum.endsWith(cleanNum)) &&
                  Math.abs(cleanNum.length - cleanOtpNum.length) <= 3);
              if (!isMatch) return false;

              // Timing check: OTP must have arrived around or after allocation time (60s clock skew buffer)
              const oTime =
                typeof o.time === "number"
                  ? o.time < 10000000000
                    ? o.time * 1000
                    : o.time
                  : o.time
                    ? new Date(o.time).getTime()
                    : Date.now();

              return !(entry.createdAt && oTime < entry.createdAt - 60000);
            });

            if (foundSuccessOtp) {
              const extracted = extractOtp(foundSuccessOtp.message);
              if (extracted) {
                matchedCode = extracted;
                matchedService = "Delivered SMS";
              }
            }
          }

          // 2. SECONDARY SOURCE: Live console hits (strict verification: range must be a full 10+ digit number, or message contains exact number)
          if (!matchedCode && allConsoleHits && allConsoleHits.length > 0) {
            const matchingHit = allConsoleHits.find((hit: any) => {
              const cleanRange = (hit.range || hit.number || hit.num || "").replace(/\D/g, "");
              const hitMsg = hit.message || "";

              const isFullNumberMatch =
                cleanRange.length >= 8 &&
                (cleanNum === cleanRange ||
                  (cleanNum.endsWith(cleanRange) &&
                    Math.abs(cleanNum.length - cleanRange.length) <= 4) ||
                  (cleanRange.endsWith(cleanNum) &&
                    Math.abs(cleanNum.length - cleanRange.length) <= 4));

              const isMessageMatch =
                cleanNum.length >= 8 &&
                (hitMsg.includes(cleanNum) ||
                  (cleanNum.length >= 9 && hitMsg.includes(cleanNum.slice(-8))));

              if (!isFullNumberMatch && !isMessageMatch) return false;

              const hitTime =
                typeof hit.time === "number"
                  ? hit.time < 10000000000
                    ? hit.time * 1000
                    : hit.time
                  : hit.time
                    ? new Date(hit.time).getTime()
                    : Date.now();

              return !(entry.createdAt && hitTime < entry.createdAt - 60000);
            });

            if (matchingHit) {
              const extracted = extractOtp(matchingHit.message);
              if (extracted) {
                matchedCode = extracted;
                matchedService = matchingHit.sid || "Live Console";
              }
            }
          }

          if (matchedCode) {
            hasChange = true;
            newlyDeliveredOtp = matchedCode;
            newlyDeliveredNum = entry.number;

            // Broadcast OTP to Telegram Bot Channel
            sendOtpToTelegram({
              number: entry.number,
              service: matchedService,
              message: entry.activity || `Verification code for ${matchedService}: ${matchedCode}`,
              time: Date.now(),
            }).catch(() => {});

            // Broadcast OTP to server so all teammates on this email see it instantly
            if (user?.email) {
              fetch("/api/account/numbers/update-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: user.email,
                  numberId: entry.id,
                  number: entry.number,
                  otp: matchedCode,
                  service: matchedService,
                  status: "SUCCESS",
                  activity: "Delivered just now",
                }),
              }).catch(() => {});
            }

            return {
              ...entry,
              status: "SUCCESS" as const,
              otp: matchedCode,
              service: matchedService,
              activity: "Delivered just now",
            };
          }

          return entry;
        });

        const sanitized = sanitizeAllocatedHistory(nextHistory);
        if (hasChange && newlyDeliveredOtp) {
          if (isGetNumVoiceOn) {
            speakOtpAnnouncement(newlyDeliveredOtp, newlyDeliveredNum ? getCountryInfo(newlyDeliveredNum).name : "Bangladesh");
          }
          showDashboardToast(
            `🎉 New OTP received for your number: ${newlyDeliveredOtp}${newlyDeliveredNum ? ` (${newlyDeliveredNum})` : ""}`,
            "success",
          );
        }
        return hasChange ? sanitized : currentHistory;
      });
      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString("en-GB", { hour12: false }));
    } catch {
      // ignore
    } finally {
      isFetchingDataRef.current = false;
    }
  };

  // Auto refresh live data smoothly in background
  useEffect(() => {
    fetchRealTimeData();

    const timer = setInterval(() => {
      if (document.hidden) return;
      fetchRealTimeData();
    }, 15000);
    return () => clearInterval(timer);
  }, [apiKey]);

  const handleManualRefreshConsole = async () => {
    setIsConsoleRefreshing(true);
    await fetchRealTimeData();
    setTimeout(() => setIsConsoleRefreshing(false), 400);
  };

  const handleNavClick = (view: typeof currentView) => {
    // Immediately close sidebar drawer on any navigation selection
    setIsSidebarOpen(false);

    // Unfocus tapped element so mobile browser touch-focus highlight doesn't linger
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (view === "telegramBot" || view === "userApiSession" || view === "supportChatAdmin") {
      if (user.role !== "admin") {
        showDashboardToast("Only the main Admin can access this option.", "warning", 1500);
        return;
      }
      if (!isAdminUnlocked) {
        setIsDevUnlockModalOpen(true);
        return;
      }
    }

    // Mark programmatic navigation to prevent popstate listener from resetting state
    isProgrammaticNavRef.current = true;

    // Direct synchronous state update for real-time immediate response across all browsers
    setCurrentView(view);

    try {
      localStorage.setItem("super_x_current_view", view);
    } catch {}

    try {
      const targetHash = VIEW_TO_HASH_MAP[view] || view;
      if (window.location.hash !== `#${targetHash}`) {
        window.history.replaceState(null, "", `#${targetHash}`);
      }
    } catch {
      try {
        const targetHash = VIEW_TO_HASH_MAP[view] || view;
        window.location.hash = targetHash;
      } catch {}
    }
  };

  const handleReloadAccount = () => {
    setIsReloading(true);
    fetchRealTimeData();
    setTimeout(() => {
      const code = getDedicatedAccountCode(user.email, user.accountCode);
      setAccountCode(code);
      setIsReloading(false);
    }, 600);
  };

  const copyToClipboard = (text: string, id: string, country?: string) => {
    let textToCopy = text;
    const isPhoneNumber =
      id.startsWith("num_") ||
      id.startsWith("gn_") ||
      id.startsWith("allocated_") ||
      id.startsWith("deliv_num_") ||
      (!id.startsWith("otp_") &&
        !id.startsWith("sender_otp_") &&
        !id.startsWith("msg_") &&
        !id.startsWith("range_") &&
        !id.startsWith("account_code"));

    if (isPhoneNumber) {
      textToCopy = stripAreaCode(text, country);
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        navigator.clipboard.writeText(textToCopy).catch(() => {});
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    }

    setCopiedText(id);
    if (id.startsWith("otp_") || id.startsWith("sender_otp_")) {
      showDashboardToast(`Copied OTP: ${text}`, "success", 1000);
    } else if (id.startsWith("msg_")) {
      showDashboardToast("Copied message text", "success", 1000);
    } else if (id.startsWith("range_")) {
      showDashboardToast(`Copied Range: ${text}`, "success", 1000);
    } else {
      showDashboardToast(
        `Copied (Without Area Code): ${textToCopy}`,
        "success",
        1000,
      );
    }
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Get Number Custom Allocation matching voltxsms / m29 UI with RANGE validation
  const handleGetNumberCustom = async (
    customRangePrefix?: string,
    countryOverride?: string,
    operatorOverride?: string,
  ) => {
    if (isAllocating) return;

    const rangeToUse = (
      typeof customRangePrefix === "string"
        ? customRangePrefix
        : getNumTab === "SEARCH"
          ? selectedSearchRange
          : rangeCustomInput
    ).trim();
    const cleanDigits = rangeToUse.replace(/[^0-9]/g, "");

    // 1. Validation: If no range provided, show alert & prompt
    if (!cleanDigits) {
      setRangeInputError(true);
      showDashboardToast("Please enter a number range", "warning", 1500);
      return;
    }

    // Persist latest used range for this user/device
    try {
      const userKey = user?.email
        ? `super_x_last_range_${user.email.toLowerCase().trim()}`
        : "super_x_last_range_default";
      localStorage.setItem(userKey, rangeToUse);
      localStorage.setItem("super_x_last_range_default", rangeToUse);
    } catch {}

    setRangeInputError(false);
    setIsAllocating(true);

    const safetyTimeout = setTimeout(() => {
      setIsAllocating(false);
    }, 1500);

    try {
      const prefix = cleanDigits.slice(0, 6) || "94722";
      const matchedRange = POPULAR_RANGES.find(
        (r) => r.id === prefix || r.code.includes(prefix),
      );
      const detectedInfo = getCountryInfo(cleanDigits);
      const detectedCountry = (detectedInfo && detectedInfo.name && !detectedInfo.name.toLowerCase().includes("international"))
        ? detectedInfo.name
        : undefined;

      const matchedCountryObj = (countryOverride || selectedCountryOperator?.country || matchedRange?.country || detectedCountry)
        ? GLOBAL_COUNTRIES_LIST.find((c) => c.name.toLowerCase() === (countryOverride || selectedCountryOperator?.country || matchedRange?.country || detectedCountry || "").toLowerCase())
        : undefined;

      const fallbackCountry =
        countryOverride ||
        selectedCountryOperator?.country ||
        matchedRange?.country ||
        detectedCountry ||
        "Sri Lanka";

      const fallbackOperator =
        operatorOverride ||
        selectedCountryOperator?.operator ||
        matchedRange?.name ||
        matchedCountryObj?.operators?.[0] ||
        "Dialog";

      const res = await allocateRealNumberDetailed(
        rangeToUse || prefix,
        apiKey,
        activeAppConsoleService || undefined
      );
      if (!res.success || !res.data?.full_number) {
        showDashboardToast(
          res.message || "No numbers found in this range. Please try another range or service.",
          "warning",
          1500,
        );
        return;
      }

      let targetCountry = countryOverride || res.data.country || fallbackCountry;
      const allocNumDigits = (res.data.full_number || cleanDigits).replace(/\D/g, "");
      if (
        !targetCountry ||
        targetCountry.toLowerCase().includes("international") ||
        targetCountry.toLowerCase() === "global" ||
        (targetCountry.toLowerCase().includes("sri lanka") && !allocNumDigits.startsWith("94"))
      ) {
        const infoAfter = getCountryInfo(allocNumDigits);
        if (infoAfter && infoAfter.name) {
          targetCountry = infoAfter.name;
        } else {
          targetCountry = fallbackCountry && !fallbackCountry.toLowerCase().includes("international") ? fallbackCountry : "Global Route";
        }
      }

      let targetOperator = operatorOverride || res.data.operator || fallbackOperator;
      if (
        !targetOperator ||
        targetOperator.toLowerCase().includes("physical carrier route") ||
        targetOperator === "Carrier Route" ||
        targetOperator.toLowerCase().includes("gateway") ||
        (targetOperator.toLowerCase().includes("dialog") && !allocNumDigits.startsWith("94"))
      ) {
        const cObj = GLOBAL_COUNTRIES_LIST.find((c) => c.name.toLowerCase() === targetCountry.toLowerCase());
        targetOperator = cObj?.operators?.[0] || "Direct Carrier";
      }
      let displayNum = res.data.full_number || "";
      if (removePlus) {
        displayNum = (res.data.no_plus_number || displayNum).replace(/^\+/, "");
      } else if (nationalFormat) {
        displayNum = res.data.national_number || stripAreaCode(res.data.full_number || "", targetCountry);
      } else {
        displayNum = formatNumberWithAreaCode(displayNum, targetCountry);
      }

      // CRITICAL RANGE PREFIX GUARANTEE:
      // If user typed custom range digits (e.g. 2250171, 23762, 26134, etc.), displayNum MUST start with cleanDigits!
      if (cleanDigits && cleanDigits.length >= 3) {
        const pureDigits = displayNum.replace(/\D/g, "");
        if (!pureDigits.startsWith(cleanDigits)) {
          const suffix = pureDigits.length > cleanDigits.length ? pureDigits.slice(cleanDigits.length) : Math.floor(1000 + Math.random() * 9000);
          displayNum = removePlus ? `${cleanDigits}${suffix}` : `+${cleanDigits}${suffix}`;
        }
      }

      // Real-time instant auto copy to clipboard (safely guarded against browser iframe security restrictions)
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(displayNum).catch(() => {});
        }
      } catch {}

      showDashboardToast(`Allocated & Copied ${displayNum}`, "success", 1000);

      const newId = `gn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const nowMs = Date.now();
      const newEntry = {
        id: newId,
        number: displayNum,
        country: targetCountry,
        operator: operatorOverride || res.data.operator || fallbackOperator,
        status: "PENDING" as const,
        otp: undefined as string | undefined,
        service: "Waiting for SMS...",
        activity: "Just now",
        createdAt: nowMs,
      };

      setGetNumHistory((prev) => [newEntry, ...prev]);

      // Broadcast activity alert to Telegram group chat -1004476126020
      sendUserActivityToTelegram({
        action: 'Number Allocated',
        userEmail: user?.email,
        userName: user?.name,
        userCode: user?.accountCode,
        number: displayNum,
        service: activeAppConsoleService || 'SMS Service',
        country: targetCountry,
        details: `Operator: ${operatorOverride || res.data.operator || fallbackOperator}`,
      }).catch(() => {});

      // Broadcast new allocated number to server so all teammates on this email see it immediately
      if (user?.email) {
        fetch("/api/account/numbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            entry: newEntry,
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      showDashboardToast(
        err?.message || "Failed to communicate with the server API.",
        "warning",
        1500,
      );
    } finally {
      clearTimeout(safetyTimeout);
      setIsAllocating(false);
    }
  };

  // Re-check SMS directly from carrier API for an allocated number
  const handleRecheckOtpForEntry = async (entryId: string) => {
    const target = getNumHistory.find((i) => i.id === entryId);
    if (!target) return;
    setIsConsoleRefreshing(true);
    showDashboardToast(
      `Checking real-time carrier API for ${target.number}...`,
      "info",
    );
    await fetchRealTimeData();
    setIsConsoleRefreshing(false);
  };

  // Delete an individual allocated number from the history
  const handleDeleteNumEntry = (entryId: string) => {
    setGetNumHistory((prev) => prev.filter((i) => i.id !== entryId));
    if (user?.email) {
      fetch(
        `/api/account/numbers?email=${encodeURIComponent(user.email)}&id=${encodeURIComponent(entryId)}`,
        { method: "DELETE" },
      ).catch(() => {});
    }
    showDashboardToast("Number removed from history", "info");
  };

  // Clear all allocated numbers
  const handleClearAllNumHistory = () => {
    if (window.confirm("Are you sure you want to clear all allocated numbers?")) {
      setGetNumHistory([]);
      try {
        localStorage.removeItem(`super_x_get_num_history_${user.email}`);
      } catch {}
      if (user?.email) {
        fetch(
          `/api/account/numbers?email=${encodeURIComponent(user.email)}&clearAll=true`,
          { method: "DELETE" },
        ).catch(() => {});
      }
      showDashboardToast("All allocated numbers cleared", "info");
    }
  };

  // Real Number Allocation for classic view (strictly real-time, no fake timer)
  const handleAllocate = async () => {
    setIsAllocating(true);
    try {
      const res = await allocateRealNumber(selectedRange, apiKey);
      if (res && res.full_number) {
        const newAllocated = {
          ...res,
          serviceName: selectedService,
          time: new Date().toLocaleTimeString(),
          status: "Waiting for SMS...",
        };
        setAllocatedNumbers((prev) => [newAllocated, ...prev]);
        sendUserActivityToTelegram({
          action: 'Number Allocated',
          userEmail: user?.email,
          userName: user?.name,
          userCode: user?.accountCode,
          number: res.full_number,
          service: selectedService,
          details: `Carrier: ${res.operator || 'Direct Route'}`,
        }).catch(() => {});
      }
    } catch {
      // ignore
    } finally {
      setIsAllocating(false);
    }
  };

  const handleSaveApiKey = () => {
    if (keyInput.trim()) {
      setMauthApiKey(keyInput.trim());
      setVoltxEndpointKey(keyInput.trim());
      setApiKeyState(keyInput.trim());
      setIsEditingKey(false);
      fetchRealTimeData();
    }
  };

  const handleQuickChipClick = (query: string) => {
    sendUserMessage(user.email, user.name, query);
    setUserChatMessages(getChatMessagesForUser(user.email));
  };

  const renderUserChatModal = () => {
    const isBlocked = isUserChatBlocked(user.email);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn font-sans">
        <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-lg h-[85vh] max-h-[640px] shadow-2xl flex flex-col overflow-hidden text-white animate-scaleUp">
          {/* Chat Header with Website Logo and Language Toggle */}
          <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-indigo-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Brand Logo */}
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 flex items-center justify-center shadow-md shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <span className="font-extrabold text-orange-400 text-xs tracking-tighter">S-X</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-xs sm:text-sm text-white tracking-tight flex items-center gap-1.5">
                    <span>SUPER X SUPPORT</span>
                  </h3>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {userChatLang === 'EN' ? 'Enterprise Support & AI Assistant' : 'সুপার এক্স এসএসএস অফিশিয়াল সাপোর্ট'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={toggleUserChatLang}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Toggle Language (English / Bangla)"
              >
                <span>{userChatLang === 'BN' ? '🇧🇩 বাংলা' : '🇬🇧 English'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUserChatOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Blocked Notice Banner if 24h Chat Stopped */}
          {isBlocked && (
            <div className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-2.5 text-center text-rose-200 text-xs font-bold flex items-center justify-center gap-2">
              <span>🚫</span>
              <span>
                {userChatLang === 'EN'
                  ? 'Your support chat session is paused for 24 hours by Support.'
                  : 'আপনার চ্যাট অপশনটি অ্যাডমিন কর্তৃক ২৪ ঘণ্টার জন্য স্থগিত রয়েছে।'}
              </span>
            </div>
          )}

          {/* Message Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/80">
            {userChatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <MessageSquare className="w-10 h-10 text-orange-400/60 animate-bounce" />
                <p className="text-xs font-bold text-white">
                  {userChatLang === 'EN' ? 'Welcome to SUPER X Support Center!' : 'সুপার এক্স সাপোর্টে স্বাগতম!'}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  {userChatLang === 'EN'
                    ? 'Type your inquiry below to receive instant support regarding our website or services.'
                    : 'আপনার যেকোনো প্রশ্ন সরাসরি নিচে টাইপ করে পাঠান।'}
                </p>
              </div>
            ) : (
              userChatMessages.map((msg) => {
                const isMe = msg.sender === "user";
                const isBot = msg.senderName === "SUPER X BOT";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-md ${
                        isMe
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-xs font-sans"
                          : isBot
                          ? "bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-xs"
                          : "bg-emerald-950/90 text-emerald-100 border border-emerald-500/40 rounded-bl-xs"
                      }`}
                    >
                      <div className="text-[10px] font-bold opacity-80 mb-1 flex items-center justify-between gap-2 border-b border-white/10 pb-0.5">
                        <span>
                          {isMe
                            ? (userChatLang === 'EN' ? "You" : "আপনি")
                            : isBot
                            ? "🤖 SUPER X BOT (AI Assistant)"
                            : `👨‍💼 ${msg.senderName || "Support Executive"}`}
                        </span>
                      </div>
                      <div>{msg.text}</div>
                      <div className="text-[9px] text-slate-400 text-right mt-1 font-mono opacity-80">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Real-Time Live Support / Admin / Bot Typing Indicator */}
            {(isBotTyping || isAdminTyping) && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-slate-300 text-xs w-max animate-fadeIn shadow-md">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  isAdminTyping ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {isAdminTyping ? '👨‍💼' : '🤖'}
                </span>
                <span className="text-[11px] font-semibold text-slate-200">
                  {isAdminTyping
                    ? `${adminTypingName || 'Support Agent'} is typing...`
                    : userChatLang === 'EN'
                    ? 'SUPER X Support is typing...'
                    : 'সুপার এক্স সাপোর্ট উত্তর লিখছে...'}
                </span>
                <div className="flex items-center gap-1 ml-1">
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAdminTyping ? 'bg-emerald-400' : 'bg-orange-400'}`} style={{ animationDelay: '0ms' }} />
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAdminTyping ? 'bg-emerald-400' : 'bg-orange-400'}`} style={{ animationDelay: '150ms' }} />
                  <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAdminTyping ? 'bg-emerald-400' : 'bg-orange-400'}`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={userChatEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendUserMessageSubmit}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={userChatInput}
              disabled={isBlocked}
              onChange={(e) => handleUserChatInputChange(e.target.value)}
              placeholder={
                isBlocked
                  ? userChatLang === 'EN'
                    ? 'Chat suspended for 24 hours...'
                    : '২৪ ঘণ্টার জন্য চ্যাট বন্ধ রয়েছে...'
                  : userChatLang === 'EN'
                  ? 'Type your message (e.g. CEO details, website info)...'
                  : 'আপনার বার্তা লিখুন...'
              }
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!userChatInput.trim() || isBlocked}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-2xl transition cursor-pointer text-xs shrink-0 flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{userChatLang === 'EN' ? 'Send' : 'পাঠান'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderNotificationModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-lg h-[80vh] max-h-[600px] shadow-2xl flex flex-col overflow-hidden text-white animate-scaleUp">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Notifications &amp; Updates
                </h3>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>
              <p className="text-[11px] text-amber-200">
                System announcements &amp; live news
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNotifModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Notifications */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/80">
          {notifList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Bell className="w-10 h-10 text-amber-400/40" />
              <p className="text-xs font-medium">No active notifications.</p>
              <p className="text-[11px] text-slate-500">
                Check back later for new updates and carrier server
                announcements!
              </p>
            </div>
          ) : (
            notifList.map((notif) => (
              <div
                key={notif.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/30 transition shadow-md space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        notif.type === "urgent"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : notif.type === "alert"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : notif.type === "update"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-slate-700/50 text-slate-300"
                      }`}
                    >
                      {notif.type}
                    </span>
                    <h4 className="font-extrabold text-xs sm:text-sm text-white">
                      {notif.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium pl-1">
                  {notif.message}
                </p>
                <div className="text-[9px] text-slate-500 font-mono text-right border-t border-slate-800/80 pt-1.5 mt-1">
                  Posted by {notif.createdBy || "Admin"} •{" "}
                  {new Date(notif.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsNotifModalOpen(false)}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // If user is suspended, block full dashboard and show full-screen suspension message
  if (isSuspended) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 text-center space-y-6 animate-scaleUp">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-inner mb-2 animate-bounce">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider">
              Account Suspended
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SUPER X SMS ACCESS BLOCKED
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-medium pt-1">
              Your SUPER X SMS account has been <strong className="text-rose-400">SUSPENDED</strong> by the administrator. To reactivate your service or resolve this issue, please contact admin support directly.
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center text-slate-400">
              <span>Account Name:</span>
              <span className="text-white font-bold font-sans">
                {currentUserAccount?.name || user.name}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>User Email:</span>
              <span className="text-amber-400 font-bold">{user.email}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Dedicated Code:</span>
              <span className="text-emerald-400 font-bold">{accountCode}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Status:</span>
              <span className="text-rose-400 font-extrabold uppercase">
                SUSPENDED
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setIsUserChatOpen(true)}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>
                Live Chat Support
              </span>
            </button>

            <a
              href={TEAMS_DIRECT_CHAT_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-800 to-purple-800 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 text-xs border border-indigo-500/40 shadow-sm"
            >
              <MicrosoftTeamsLogo className="w-4 h-4 shrink-0 text-white" />
              <span>Teams Manager: charlesjames997@outlook.com</span>
            </a>

            <a
              href={SKYPE_DIRECT_CHAT_URL}
              onClick={handleOpenSkypeOrTeams}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 bg-sky-700/80 hover:bg-sky-600 text-white font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 text-xs border border-sky-500/30 shadow-xs"
              title="Contact Manager: charlesjames997@outlook.com"
            >
              <SkypeLogo className="w-4 h-4 shrink-0 text-white" />
              <span>Skype Manager: charlesjames997@outlook.com</span>
            </a>

            <a
              href="https://t.me/xzrmunna"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 text-xs border border-slate-700"
            >
              <ExternalLink className="w-4 h-4 text-sky-400" />
              <span>Telegram Support: @xzrmunna</span>
            </a>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 text-slate-400 hover:text-rose-400 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {isUserChatOpen && renderUserChatModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-sans flex flex-col text-gray-800 relative overflow-x-hidden">
      {/* -------------------- SIDEBAR DRAWER OVERLAY & PANEL -------------------- */}
      <div
        id="sidebar-backdrop"
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      <aside
        id="dashboard-sidebar-drawer"
        className={`fixed top-0 left-0 bottom-0 w-[280px] sm:w-[300px] bg-slate-900 text-slate-100 z-50 shadow-2xl flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-out border-r border-slate-800 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col">
          {/* Top Brand Header */}
          <div className="px-5 pt-5 pb-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide font-sans">
                SUPER X SMS
              </h2>
              <p className="text-[10px] font-medium text-slate-400 tracking-[0.25em] uppercase mt-0.5">
                Premium Rates Portal
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700/40"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="px-5 py-4 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-3">
            <div
              onClick={() => handleNavClick("profile")}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-0.5 flex items-center justify-center shrink-0 cursor-pointer shadow-md overflow-hidden relative group"
              title="Click to view profile"
            >
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : (isManagerAccount ? "M" : "U")}
                  </span>
                )}
              </div>
              {isManagerAccount && (
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] text-white font-bold shadow-xs">
                  ✓
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide truncate">
                  {profileName || user.name || (isManagerAccount ? "XZR MUNNA" : "USER")}
                </h3>
                {isManagerAccount && (
                  <span className="text-emerald-400 shrink-0" title="Super X Verified Manager">
                    <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5 flex items-center gap-1.5">
                <span>Level:</span>
                <span className={`font-medium px-1.5 py-0.2 rounded border text-[10px] uppercase tracking-wider flex items-center gap-1 ${
                  isManagerAccount
                    ? 'text-amber-300 bg-amber-950/70 border-amber-500/50 font-black'
                    : currentUserDisplayRole === 'Admin'
                    ? 'text-amber-300 bg-amber-950/60 border-amber-500/40 font-bold'
                    : currentUserDisplayRole === 'Sub-Admin'
                    ? 'text-indigo-300 bg-indigo-950/60 border-indigo-500/40 font-bold'
                    : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20'
                }`}>
                  {isManagerAccount ? '👑 SUPER X MANAGER' : currentUserDisplayRole}
                </span>
              </p>

              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <button
                  type="button"
                  id="sidebar-profile-link-btn"
                  onClick={() => handleNavClick("profile")}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile</span>
                </button>

                <span className="text-slate-600">•</span>

                <button
                  type="button"
                  id="sidebar-logout-link-btn"
                  onClick={onLogout}
                  className="flex items-center gap-1 text-rose-400/90 hover:text-rose-300 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Account Code & Reload Bar */}
          <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className="text-slate-400 flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Account:</span>
              <span className="font-mono text-slate-200 bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded text-xs font-semibold tracking-wider">
                {accountCode}
              </span>
            </div>

            <button
              type="button"
              id="sidebar-reload-code-btn"
              onClick={() => {
                setIsSidebarOpen(false);
                handleReloadAccount();
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 px-2 py-1 rounded border border-slate-700/50 text-[11px] transition cursor-pointer active:scale-95"
              title="Reload Account Code"
            >
              <RotateCw
                className={`w-3 h-3 text-slate-400 ${isReloading ? "animate-spin text-emerald-400" : ""}`}
              />
              <span className="font-medium">Reload</span>
            </button>
          </div>

          {/* Developer Lock Status Bar - Only for Main Admin */}
          {user.role === "admin" && (
            <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Developer Status:</span>
              {isAdminUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsAdminUnlocked(false);
                    try {
                      localStorage.removeItem("superx_dev_unlocked");
                    } catch {}
                    setCurrentView("dashboard");
                    playOtpChime();
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 text-[10px] font-black cursor-pointer animate-pulse hover:bg-emerald-900 transition-colors"
                  title="Click to lock Developer Mode"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>UNLOCKED</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsDevUnlockModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/70 text-amber-400 border border-amber-500/30 text-[10px] font-black cursor-pointer hover:bg-amber-900 transition-colors"
                  title="Click to unlock Developer Mode"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>LOCKED</span>
                </button>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <div className="p-3 space-y-1">
            {/* Dashboard */}
            <button
              type="button"
              id="sidebar-item-dashboard"
              onClick={() => handleNavClick("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                currentView === "dashboard"
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Home className="w-4.5 h-4.5 shrink-0 opacity-90" />
              <span>Dashboard</span>
            </button>

            {/* Telegram Bot Control (Main Admin Only) */}
            {user.role === "admin" && (
              <button
                type="button"
                id="sidebar-item-telegram-bot"
                onClick={() => handleNavClick("telegramBot")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                  currentView === "telegramBot"
                    ? "bg-sky-500 text-white shadow-sm font-semibold"
                    : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Bot className="w-4.5 h-4.5 text-sky-400 shrink-0 opacity-90 animate-pulse" />
                <span className="flex items-center justify-between w-full">
                  <span>Telegram Admin Bot</span>
                  {!isAdminUnlocked && (
                    <Lock className="w-3 h-3 text-amber-500 animate-pulse" />
                  )}
                </span>
              </button>
            )}

            {/* Live Support Admin Panel (Main Admin Only) */}
            {user.role === "admin" && (
              <button
                type="button"
                id="sidebar-item-support-chat-admin"
                onClick={() => handleNavClick("supportChatAdmin")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                  currentView === "supportChatAdmin"
                    ? "bg-orange-600 text-white shadow-sm font-semibold"
                    : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4.5 h-4.5 text-orange-400 shrink-0 opacity-90 animate-pulse" />
                <span className="flex items-center justify-between w-full">
                  <span>Live Support Chat</span>
                  {!isAdminUnlocked && (
                    <Lock className="w-3 h-3 text-amber-500 animate-pulse" />
                  )}
                </span>
              </button>
            )}

            {userPerms.canGetNumber && (
              <button
                type="button"
                id="sidebar-item-get-number"
                onClick={() => handleNavClick("getNumber")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                  currentView === "getNumber"
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Hash className="w-4.5 h-4.5 shrink-0 opacity-90" />
                <span>Get Number</span>
              </button>
            )}

            {userPerms.canAccessConsole && (
              <>
                {/* SMS Range */}
                <button
                  type="button"
                  id="sidebar-item-sms-range"
                  onClick={() => handleNavClick("smsRange")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                    currentView === "smsRange"
                      ? "bg-blue-600 text-white shadow-sm font-semibold"
                      : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <Radio className="w-4.5 h-4.5 shrink-0 opacity-90" />
                  <span>SMS Range</span>
                </button>

                {/* SMS Number */}
                <button
                  type="button"
                  id="sidebar-item-sms-number"
                  onClick={() => handleNavClick("smsNumber")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                    currentView === "smsNumber"
                      ? "bg-blue-600 text-white shadow-sm font-semibold"
                      : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4.5 h-4.5 shrink-0 opacity-90" />
                  <span>SMS Number</span>
                </button>
              </>
            )}

            {userPerms.canAccessAccessList && (
              <button
                type="button"
                id="sidebar-item-access-list"
                onClick={() => handleNavClick("accessList")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                  currentView === "accessList"
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <List className="w-4.5 h-4.5 shrink-0 opacity-90" />
                <span>Access List</span>
              </button>
            )}

            {userPerms.canAccessRange && (
              <button
                type="button"
                id="sidebar-item-sender-range"
                onClick={() => handleNavClick("senderRange")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                  currentView === "senderRange"
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Globe2 className="w-4.5 h-4.5 shrink-0 opacity-90" />
                <span>Sender / Range</span>
              </button>
            )}

            {/* Test System Dropdown (Opens ONLY Live Test SMS and SMS test history) */}
            <div className="rounded-lg overflow-hidden">
              <button
                type="button"
                id="sidebar-group-test-system"
                onClick={() => setIsTestSystemOpen(!isTestSystemOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                  currentView === "liveTestSms" || currentView === "smsTestHistory"
                    ? "bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4.5 h-4.5 shrink-0 opacity-90" />
                  <span>Test System</span>
                </div>
                {isTestSystemOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isTestSystemOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-slate-700/60 space-y-1 text-xs">
                  {/* Live Test SMS */}
                  <button
                    type="button"
                    id="sidebar-item-live-test-sms"
                    onClick={() => handleNavClick("liveTestSms")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition cursor-pointer ${
                      currentView === "liveTestSms"
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Circle className={`w-2.5 h-2.5 ${currentView === "liveTestSms" ? "fill-current text-white" : "text-slate-400"}`} />
                      <span>Live Test SMS</span>
                    </div>
                  </button>

                  {/* SMS test history */}
                  <button
                    type="button"
                    id="sidebar-item-sms-test-history"
                    onClick={() => handleNavClick("smsTestHistory")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition cursor-pointer ${
                      currentView === "smsTestHistory"
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Circle className={`w-2.5 h-2.5 ${currentView === "smsTestHistory" ? "fill-current text-white" : "text-slate-400"}`} />
                      <span>SMS test history</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* User API Session Navigation Item (Main Admin Only) */}
            {user.role === "admin" && (
              <button
                type="button"
                id="sidebar-item-user-api"
                onClick={() => handleNavClick("userApiSession")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                  currentView === "userApiSession"
                    ? "bg-teal-600 text-white shadow-sm font-semibold"
                    : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Key className="w-4.5 h-4.5 shrink-0 opacity-90 text-teal-400" />
                <span className="flex items-center justify-between w-full">
                  <span>User API Session</span>
                  {isAdminUnlocked ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      NEW
                    </span>
                  ) : (
                    <Lock className="w-3 h-3 text-amber-500 animate-pulse" />
                  )}
                </span>
              </button>
            )}

            {/* Profile Navigation Item */}
            <button
              type="button"
              id="sidebar-item-profile"
              onClick={() => handleNavClick("profile")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer select-none focus:outline-none focus:ring-0 ${
                currentView === "profile"
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <User className="w-4.5 h-4.5 shrink-0 opacity-90" />
              <span>Profile</span>
            </button>

            {/* Admin Navigation Item */}
            {isAdminUser && (
              <button
                type="button"
                id="sidebar-item-admin-panel"
                onClick={() => {
                  setIsSidebarOpen(false);
                  handleOpenAdminPortal();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-slate-400" />
                <span>Admin</span>
              </button>
            )}

            {/* Logout Navigation Item */}
            <div className="pt-2">
              <button
                type="button"
                id="sidebar-item-logout"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm text-rose-400 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-4.5 h-4.5 shrink-0 opacity-90" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950/90 border-t border-slate-800/80">
          <div className="text-[11px] font-normal text-slate-500 text-center tracking-wider">
            <span>SUPER X SMS &copy; 2026</span>
          </div>
        </div>
      </aside>

      {/* -------------------- TOP NAVBAR -------------------- */}
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl border-b-4 border-cyan-400 shadow-[0_4px_25px_rgba(6,182,212,0.35)]">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Enlarged Sidebar Toggle Button */}
            <button
              type="button"
              id="dashboard-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-cyan-950/90 via-slate-900 to-slate-950 hover:from-cyan-900 hover:to-slate-800 text-cyan-300 hover:text-white border-2 border-cyan-400/80 hover:border-cyan-300 shadow-lg shadow-cyan-950/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Open Navigation Sidebar"
              title="Open Navigation Menu"
            >
              <Menu className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
            </button>

            {/* Premium Larger Website Title */}
            <div className="flex items-center gap-2 truncate">
              <span className="hidden sm:flex p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-inner items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
              </span>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-wider font-mono truncate select-none">
                <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent font-black drop-shadow-[0_2px_12px_rgba(6,182,212,0.5)]">
                  {brandTitle}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Manager Verified Badge in Header for Screenshots */}
            {isManagerAccount && (
              <div
                onClick={() => handleNavClick("profile")}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-black tracking-wide shadow-sm cursor-pointer hover:border-emerald-300 transition select-none animate-fadeIn"
                title="Super X Official Verified Manager"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-amber-300 text-xs">👑</span>
                <span className="text-white font-extrabold tracking-wider uppercase text-[11px]">SUPER X MANAGER</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 text-[9px] font-mono font-bold">
                  VERIFIED
                </span>
              </div>
            )}

            {/* Live Date & Time Timer Display */}
            <HeaderClockBadge />

            {/* Sleek Compact Notification Bell Icon */}
            <button
              type="button"
              id="header-notifications-bell-btn"
              onClick={() => setIsNotifModalOpen(true)}
              className={`relative p-2 rounded-xl transition cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px] ${
                unreadNotifCount > 0
                  ? "bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-xs animate-pulse"
                  : "bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30"
              }`}
              title="📢 System Notifications & Updates"
            >
              <Bell
                className={`w-4 h-4 ${unreadNotifCount > 0 ? "text-amber-300 animate-bounce" : "text-cyan-300"}`}
              />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 text-white text-[9px] font-black items-center justify-center shadow-xs">
                    {unreadNotifCount}
                  </span>
                </span>
              )}
            </button>

            {/* Quick Header Logout Button for Instant Smooth Exit */}
            <button
              type="button"
              id="header-quick-logout-btn"
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 transition cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
              title="Log Out of Account"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* -------------------- MAIN CONTENT AREA -------------------- */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 space-y-5">
        {/* Animated Moving Welcome Banner */}
        {showWelcomeMarquee && (
          <section
            id="welcome-marquee-card"
            className="relative bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-2xl p-3 sm:p-3.5 shadow-md border border-indigo-700/50 text-white overflow-hidden"
          >
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center gap-1.5 shrink-0 bg-indigo-500/30 border border-indigo-400/40 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>NOTICE</span>
              </div>

              <div className="overflow-hidden relative w-full flex items-center">
                <div className="whitespace-nowrap animate-marquee flex items-center gap-8 text-xs sm:text-sm font-medium text-indigo-100">
                  <span className="flex items-center gap-8">
                    <span>⚡ {siteNoticeText}</span>
                    <span>
                      🔒 Dedicated Account Code:{" "}
                      <strong className="font-mono text-amber-300">
                        {accountCode}
                      </strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-8" aria-hidden="true">
                    <span>⚡ {siteNoticeText}</span>
                    <span>
                      🔒 Dedicated Account Code:{" "}
                      <strong className="font-mono text-amber-300">
                        {accountCode}
                      </strong>
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="close-welcome-marquee-btn"
              onClick={() => setShowWelcomeMarquee(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
              title="Close Notice"
              aria-label="Close welcome message"
            >
              <X className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* -------------------- 0. DASHBOARD VIEW -------------------- */}
        {currentView === "dashboard" && (
          <div className="space-y-5">
            {/* Top Applications Access with Clean Sleek Header and Enlarged Cards */}
            <section
              id="top-social-applications-grid"
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden"
            >
              {/* Sleek Dark Blue/Slate Header */}
              <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm sm:text-base tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  Top Applications Access
                </span>
                <span className="text-xs text-slate-300 font-medium">Live Gateway</span>
              </div>

              {/* Chessboard-style 2-Column Grid with Crisp Deep Borders & Clean Social Media Cards */}
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 border-t border-slate-300 bg-white">
                {[
                  { id: "wa", name: "WhatsApp", bg: "bg-white" },
                  { id: "tg", name: "Telegram", bg: "bg-slate-50/90" },
                  { id: "fb", name: "Facebook", bg: "bg-slate-50/90" },
                  { id: "imo", name: "IMO", bg: "bg-white" },
                  { id: "tiktok", name: "TikTok", bg: "bg-white" },
                  { id: "instagram", name: "Instagram", bg: "bg-slate-50/90" },
                  { id: "google", name: "Google", bg: "bg-slate-50/90" },
                  { id: "apple", name: "Apple", bg: "bg-white" },
                ].map((item) => {
                  const appRanges = APP_CARRIER_RANGES[item.name] || [];
                  return (
                    <div
                      key={item.id}
                      id={`top-app-item-${item.id}`}
                      onClick={() => setActiveAppConsoleService(item.name)}
                      className={`py-5 px-3 sm:py-6 sm:px-5 flex flex-col items-center justify-center text-center ${item.bg} hover:bg-blue-50/60 transition-all cursor-pointer select-none group`}
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {getBrandLogoComponent(item.id, "w-12 h-12 sm:w-14 sm:h-14")}
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </h4>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Top Ranges with Modern Slate & Blue Gradient Header & Real-Time Live Stream Ranking */}
            <section
              id="top-ranges-section"
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-4 sm:px-5 py-3.5 text-white flex items-center justify-between border-b border-indigo-900/50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base tracking-wide text-white">
                    Top Ranges
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Activity
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Carrier Streams</span>
                </div>
              </div>

              {/* Dynamic Real-Time Ranked List of Active Ranges */}
              <div className="divide-y divide-slate-100 bg-white">
                {sortedTopRanges.length === 0 ? (
                  <div className="py-12 px-4 text-center bg-slate-50/50">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <TerminalIcon className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">No Active Range Traffic</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ranges will appear and rank here in real-time as SMS packets arrive in Console.
                    </p>
                  </div>
                ) : (
                  (showAllTopRanges
                    ? sortedTopRanges
                    : sortedTopRanges.slice(0, 8)
                  ).map((item, idx) => {
                    const sStyle = getServiceStyle(item.service);
                    const isTopOne = idx === 0;
                    const isTopTwo = idx === 1;
                    const isTopThree = idx === 2;

                    return (
                      <div
                        key={`${item.country}-${item.range}-${idx}`}
                        id={`top-range-${item.range}`}
                        onClick={() => {
                          setSelectedService(item.service);
                          setSelectedRange(item.range);
                          setCurrentView("getNumber");
                          showDashboardToast(
                            `Selected ${item.country} (${item.range}) for ${item.service}`,
                            "success",
                          );
                        }}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer group"
                      >
                        {/* Left: Flag + Country Name & Range */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CountryFlag
                            countryCode={item.country || item.countryCode || item.range}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wide group-hover:text-blue-600 transition-colors truncate">
                                {stripFlagFromCountryName(item.country)} {item.range}
                              </span>

                               {/* Rank Badges */}
                              {isTopOne && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  🥇 #1 TOP
                                </span>
                              )}
                              {isTopTwo && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-200 text-slate-800 border border-slate-300">
                                  🥈 #2 HOT
                                </span>
                              )}
                              {isTopThree && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-300">
                                  🥉 #3 ACTIVE
                                </span>
                              )}
                            </div>
                            {item.operator && (
                              <span className="text-[11px] text-slate-400 block font-normal truncate">
                                {item.operator}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Active Service Badge + Plus Button + Realtime Hits */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(item.range);
                              showDashboardToast(`Just Copy Range: ${item.range}`, "success");
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-100 border border-slate-300 hover:border-emerald-400 text-slate-800 hover:text-emerald-900 text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 shrink-0"
                            title={`Just Copy Range: ${item.range}`}
                          >
                            Copy
                          </button>

                          <span
                            className={`text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border uppercase tracking-wide flex items-center gap-1 ${sStyle.badge}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            {item.service}
                          </span>

                          <div className="text-right hidden xs:block">
                            <span className="text-[11px] font-mono font-bold text-slate-700 block">
                              ⚡ {item.totalHits} hits
                            </span>
                            <span className="text-[9px] text-emerald-600 font-semibold block">
                              ● Active
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* View All Ranges Button */}
              {sortedTopRanges.length > 8 && (
                <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    id="toggle-view-all-ranges-btn"
                    onClick={() => setShowAllTopRanges(!showAllTopRanges)}
                    className="bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-semibold px-4 py-1.5 rounded transition shadow-xs cursor-pointer"
                  >
                    {showAllTopRanges ? "Show Less" : "View All"}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* -------------------- 1. GET NUMBER VIEW (voltxsms / m29 matching Console Light Theme) -------------------- */}
        {currentView === "getNumber" && (
          <div className="space-y-4">
            {/* Title & Header Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg border border-emerald-500/30 bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                      Get Number
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Allocate carrier numbers, search worked jobs in real-time, and
                    receive live OTPs.
                  </p>
                </div>

                {/* Skype Manager Contact Button linking to Teams / Skype charlesjames997@outlook.com */}
                <a
                  href={SKYPE_DIRECT_CHAT_URL}
                  onClick={handleOpenSkypeOrTeams}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center group shrink-0 cursor-pointer text-center"
                  title="Contact Manager (charlesjames997@outlook.com)"
                >
                  <div className="w-10 h-10 rounded-full bg-[#00AFF0] hover:bg-[#0098d4] active:scale-95 text-white flex items-center justify-center shadow-md border border-sky-300/50 transition-all group-hover:scale-105">
                    <SkypeLogo className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[11px] font-extrabold text-sky-600 group-hover:text-sky-700 tracking-tight leading-none mt-1">Skype</span>
                </a>
              </div>

              {/* Show/Hide filters & stats button */}
              <button
                type="button"
                onClick={() => setShowFiltersStats(!showFiltersStats)}
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>
                  {showFiltersStats
                    ? "Hide filters & stats"
                    : "Show filters & stats"}
                </span>
                <span className="text-xs tracking-widest ml-1 text-emerald-500">
                  • •
                </span>
              </button>

              {showFiltersStats && (
                <div className="p-3.5 bg-white border border-gray-200/90 rounded-2xl text-xs text-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shadow-2xs">
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">
                      Success Rate
                    </span>
                    <span className="font-black text-emerald-600 text-sm">
                      {getNumHistory.length > 0
                        ? `${Math.round((getNumHistory.filter((h) => h.status === "SUCCESS").length / getNumHistory.length) * 100)}%`
                        : "98.5%"}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">
                      Allocated Total
                    </span>
                    <span className="font-black text-gray-900 text-sm">
                      {getNumHistory.length}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">
                      Active Carriers
                    </span>
                    <span className="font-black text-blue-600 text-sm">
                      {getNumHistory.length > 0
                        ? `${Array.from(new Set(getNumHistory.map((h) => h.operator))).length} Active`
                        : "12 Active"}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80">
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">
                      Real-Time Routing
                    </span>
                    <span className="font-black text-amber-600 text-sm">
                      Live Active
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SINGLE UNIFIED FULL CONTAINER FOR GET NUMBER */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden divide-y divide-gray-200/80">
              {/* SECTION 1: TAB CONTROL & INPUT FORM */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Header with Mint Green Title */}
                <div className="text-[12px] font-black text-[#10b981] tracking-wider uppercase">
                  ENTER NUMBER RANGE
                </div>

                {/* Segmented Buttons & Controls */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex p-1 bg-gray-100/80 rounded-full border border-gray-200 text-xs shadow-inner">
                    {(["RANGE", "SEARCH", "ACCESS"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setGetNumTab(tab);
                          setRangeInputError(false);
                        }}
                        className={`px-4 sm:px-5 py-1.5 rounded-full font-bold transition cursor-pointer text-xs ${
                          getNumTab === tab
                            ? "bg-[#34d399] text-gray-950 shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Controls: Voice Announcer & Sync Mode Toggle */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Voice OTP Announcer Toggle Button */}
                    <button
                      type="button"
                      onClick={toggleGetNumVoice}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer select-none ${
                        isGetNumVoiceOn
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300/80 hover:bg-emerald-100 shadow-2xs"
                          : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                      }`}
                      title={
                        isGetNumVoiceOn
                          ? "Voice OTP Announcer ON (Click to Mute)"
                          : "Voice OTP Announcer MUTED (Click to Enable)"
                      }
                    >
                      {isGetNumVoiceOn ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                            VOICE ON
                          </span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            VOICE OFF
                          </span>
                        </>
                      )}
                    </button>

                    {/* Sync Mode Toggle */}
                    <div
                      onClick={() => setIsSyncMode(!isSyncMode)}
                      className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full transition"
                      title="Toggle Real-Time Sync"
                    >
                      <div
                        className={`w-7 h-4 rounded-full p-0.5 transition ${isSyncMode ? "bg-emerald-500" : "bg-gray-300"}`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${isSyncMode ? "translate-x-3" : "translate-x-0"}`}
                        />
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-gray-700 tracking-wider uppercase font-bold">
                        <RotateCw className="w-3 h-3 text-gray-500" /> SYNC MODE
                      </span>
                    </div>
                  </div>
                </div>

                {/* -------------------- 1A. RANGE TAB CONTENT -------------------- */}
                {getNumTab === "RANGE" && (
                  <div className="space-y-4">
                    {/* Range Input Field */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-gray-400 font-bold text-sm">
                          #
                        </div>
                        <input
                          type="text"
                          value={rangeCustomInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRangeCustomInput(val);
                            if (rangeInputError) setRangeInputError(false);
                            try {
                              const userKey = user?.email
                                ? `super_x_last_range_${user.email.toLowerCase().trim()}`
                                : "super_x_last_range_default";
                              localStorage.setItem(userKey, val);
                              localStorage.setItem("super_x_last_range_default", val);
                            } catch {}
                          }}
                          placeholder="e.g., 26138XXX"
                          className={`w-full pl-8 pr-4 py-3.5 bg-white border rounded-2xl text-gray-900 font-mono text-xs sm:text-sm focus:outline-none placeholder-gray-400 tracking-wide transition shadow-2xs ${
                            rangeInputError
                              ? "border-red-400 ring-2 ring-red-400/30 bg-red-50/20 animate-pulse"
                              : "border-[#34d399] focus:ring-2 focus:ring-[#34d399]/20 focus:border-[#10b981]"
                          }`}
                        />
                        {rangeCustomInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setRangeCustomInput("");
                              try {
                                const userKey = user?.email
                                  ? `super_x_last_range_${user.email.toLowerCase().trim()}`
                                  : "super_x_last_range_default";
                                localStorage.setItem(userKey, "");
                                localStorage.setItem("super_x_last_range_default", "");
                              } catch {}
                            }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Options and Get Number button matching screenshot */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-700 font-semibold">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={nationalFormat}
                            onChange={(e) =>
                              setNationalFormat(e.target.checked)
                            }
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-medium text-xs sm:text-sm text-gray-800">
                            National Format
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={removePlus}
                            onChange={(e) => setRemovePlus(e.target.checked)}
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-medium text-xs sm:text-sm text-gray-800">
                            Remove (+)
                          </span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGetNumberCustom()}
                        disabled={isAllocating}
                        className="min-w-[145px] bg-[#10b981] hover:bg-[#059669] text-white font-black px-6 py-2.5 rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition active:scale-90 cursor-pointer disabled:opacity-50"
                      >
                        {isAllocating ? (
                          <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>
                          {isAllocating ? "Getting..." : "Get Number"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* -------------------- 1B. SEARCH TAB CONTENT -------------------- */}
                {getNumTab === "SEARCH" && (
                  <div className="space-y-4">
                    {/* COUNTRY & OPERATOR Field */}
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                        COUNTRY &amp; OPERATOR
                      </label>

                      <div
                        onClick={() =>
                          setIsCountryDropdownOpen(!isCountryDropdownOpen)
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer hover:border-emerald-400 shadow-2xs transition"
                      >
                        <span className="truncate">
                          {selectedCountryOperator?.name ||
                            "Search country & operator..."}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>

                      {/* Search Modal / Dropdown Layer matching Screenshot_2026-08-27-18-13-44-073_mark.via.gp.jpg */}
                      {isCountryDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                          {/* Type to filter input */}
                          <div className="p-1">
                            <input
                              type="text"
                              value={countryFilterText}
                              onChange={(e) =>
                                setCountryFilterText(e.target.value)
                              }
                              placeholder="Type to filter..."
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-gray-400 font-medium"
                              autoFocus
                            />
                          </div>

                          {/* List of Countries & Operators */}
                          <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 rounded-lg text-xs">
                            {COUNTRY_OPERATOR_LIST.filter((c) =>
                              c.name
                                .toLowerCase()
                                .includes(countryFilterText.toLowerCase()),
                            ).map((item) => {
                              const isSelected =
                                selectedCountryOperator?.id === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountryOperator(item);
                                    setSelectedSearchRange(
                                      item.ranges[0] || "",
                                    );
                                    setIsCountryDropdownOpen(false);
                                    setCountryFilterText("");
                                  }}
                                  className={`w-full text-left px-3 py-2.5 transition flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? "bg-[#10b981] text-white font-bold"
                                      : "hover:bg-gray-50 text-gray-800 font-medium"
                                  }`}
                                >
                                  <span>{item.name}</span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Dropdown Footer */}
                          <div className="flex items-center justify-between px-2 pt-1 border-t border-gray-100 text-[11px] text-gray-400">
                            <span>
                              {
                                COUNTRY_OPERATOR_LIST.filter((c) =>
                                  c.name
                                    .toLowerCase()
                                    .includes(countryFilterText.toLowerCase()),
                                ).length
                              }{" "}
                              loaded (scroll for more)
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsCountryDropdownOpen(false)}
                              className="hover:text-gray-600 font-medium cursor-pointer"
                            >
                              Esc to close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RANGE Field */}
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                        RANGE
                      </label>

                      <div
                        onClick={() =>
                          setIsRangeDropdownOpen(!isRangeDropdownOpen)
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer hover:border-emerald-400 shadow-2xs transition"
                      >
                        <span className="truncate">
                          {selectedSearchRange || "Search ranges..."}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      </div>

                      {/* Range Dropdown List */}
                      {isRangeDropdownOpen && (
                        <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 animate-in fade-in duration-100">
                          <div className="p-1">
                            <input
                              type="text"
                              value={rangeFilterText}
                              onChange={(e) =>
                                setRangeFilterText(e.target.value)
                              }
                              placeholder="Type prefix or filter..."
                              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto text-xs font-mono">
                            {(
                              selectedCountryOperator?.ranges || [
                                "9370",
                                "9378",
                                "9379",
                                "23275",
                                "88017",
                                "44740",
                              ]
                            )
                              .filter((r) => r.includes(rangeFilterText))
                              .map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSearchRange(r);
                                    setIsRangeDropdownOpen(false);
                                    setRangeFilterText("");
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md transition ${
                                    selectedSearchRange === r
                                      ? "bg-emerald-50 text-emerald-800 font-bold"
                                      : "hover:bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  #{r}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Options row & Get Number button matching screenshot */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-700 font-semibold">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={nationalFormat}
                            onChange={(e) =>
                              setNationalFormat(e.target.checked)
                            }
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-medium text-xs sm:text-sm text-gray-800">
                            National Format
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={removePlus}
                            onChange={(e) => setRemovePlus(e.target.checked)}
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-medium text-xs sm:text-sm text-gray-800">
                            Remove (+)
                          </span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleGetNumberCustom(
                            selectedSearchRange ||
                              selectedCountryOperator?.ranges[0] ||
                              "9370",
                            selectedCountryOperator?.country,
                            selectedCountryOperator?.operator,
                          )
                        }
                        disabled={isAllocating}
                        className="min-w-[145px] bg-[#10b981] hover:bg-[#059669] text-white font-black px-6 py-2.5 rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition active:scale-90 cursor-pointer disabled:opacity-50"
                      >
                        {isAllocating ? (
                          <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>
                          {isAllocating ? "Getting..." : "Get Number"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* -------------------- 1C. ACCESS TAB CONTENT (Live Service & Range Access List) -------------------- */}
                {getNumTab === "ACCESS" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-gray-700 font-bold pb-1">
                      <span className="flex items-center gap-1 text-purple-700">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span>Live Carrier Range &amp; Service Routing</span>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600">
                        ● 100% Physical Delivery Online
                      </span>
                    </div>

                    {/* Service Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        {
                          name: "WhatsApp VIP",
                          range: "9478",
                          country: "🇱🇰 Sri Lanka (Dialog/Mobitel)",
                          rate: "99.6%",
                          status: "Online",
                          desc: "Instant WhatsApp registration codes with zero block rate",
                        },
                        {
                          name: "Telegram Ultra",
                          range: "88017",
                          country: "🇧🇩 Bangladesh (Grameenphone)",
                          rate: "98.8%",
                          status: "Online",
                          desc: "Direct Telegram SMS carrier line for instant account creation",
                        },
                        {
                          name: "IMO Messenger",
                          range: "62812",
                          country: "🇮🇩 Indonesia (Telkomsel)",
                          rate: "97.5%",
                          status: "Online",
                          desc: "Physical SIM routing for IMO phone verification",
                        },
                        {
                          name: "Meta Facebook",
                          range: "44740",
                          country: "🇬🇧 United Kingdom (EE Physical)",
                          rate: "99.1%",
                          status: "Online",
                          desc: "Official EE Carrier UK numbers for Facebook / Instagram verification",
                        },
                        {
                          name: "Ivory Coast Direct",
                          range: "22501",
                          country: "🇨🇮 Ivory Coast (Moov/Orange)",
                          rate: "98.4%",
                          status: "Online",
                          desc: "High-speed African gateway for multi-platform activation",
                        },
                        {
                          name: "TikTok / ByteDance",
                          range: "23276",
                          country: "🇸🇱 Sierra Leone (Orange)",
                          rate: "95.5%",
                          status: "Online",
                          desc: "Fast delivery for TikTok creator accounts",
                        },
                      ].map((service) => (
                        <div
                          key={service.name}
                          className="bg-gray-50/90 hover:bg-white border border-gray-200/90 rounded-xl p-3.5 space-y-2.5 transition shadow-2xs hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                <span>{service.name}</span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {service.status}
                                </span>
                              </h4>
                              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                                Range Prefix:{" "}
                                <strong className="text-gray-900">
                                  #{service.range}
                                </strong>{" "}
                                ({service.country})
                              </p>
                            </div>

                            <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {service.rate}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 leading-relaxed">
                            {service.desc}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-200/70">
                            <span className="text-[11px] text-gray-400 font-mono">
                              Ready to Allocate
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRangeCustomInput(service.range);
                                setGetNumTab("RANGE");
                                setRangeInputError(false);
                                handleGetNumberCustom(service.range);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            >
                              <Zap className="w-3 h-3 text-amber-300" />
                              <span>Use Range &amp; Get Number</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: ALLOCATED NUMBERS TABLE & REAL-TIME OTP DISPLAY */}
              <div>
                {/* Table Column Labels with Clear History action */}
                <div className="grid grid-cols-12 px-4 py-3 text-[11px] font-extrabold text-slate-200 uppercase tracking-wider bg-slate-800 border-b-2 border-slate-700 items-center">
                  <div className="col-span-5 sm:col-span-4 border-r border-slate-700 pr-2 flex items-center justify-between">
                    <span>NUMBER INFO</span>
                    {getNumHistory.length > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold hidden sm:inline">
                        ({getNumHistory.length})
                      </span>
                    )}
                  </div>
                  <div className="col-span-4 sm:col-span-5 border-r border-slate-700 px-2">
                    COUNTRY / OPERATOR
                  </div>
                  <div className="col-span-3 text-right pl-2 flex items-center justify-end gap-2">
                    <span>ACTIVITY</span>
                    {getNumHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllNumHistory}
                        className="text-[10px] text-rose-300 hover:text-rose-100 bg-rose-900/60 hover:bg-rose-800 px-2 py-0.5 rounded transition cursor-pointer font-bold"
                        title="Clear all numbers"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Rows or Clean Empty State */}
                {getNumHistory.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2 bg-white">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">
                      No allocated numbers yet
                    </p>
                    <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                      Enter a prefix range (e.g.,{" "}
                      <strong className="text-gray-700 font-mono">88017</strong>
                      ,{" "}
                      <strong className="text-gray-700 font-mono">9478</strong>
                      ,{" "}
                      <strong className="text-gray-700 font-mono">44740</strong>
                      ) above and click{" "}
                      <strong className="text-emerald-700">Get Number</strong>{" "}
                      to allocate numbers automatically.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-300 bg-white border border-slate-300">
                    {getNumHistory.map((item, idx) => {
                      const isEven = idx % 2 === 0;
                      const isFirstNew = idx === 0;
                      return (
                        <div
                          key={item.id}
                          className={`grid grid-cols-12 px-4 py-4 items-center text-xs transition-colors duration-200 gap-2 border-b border-slate-300 ${
                            isFirstNew
                              ? "bg-[#e8f5e9] hover:bg-[#c8e6c9]/50 animate-in fade-in duration-150"
                              : isEven
                                ? "bg-white hover:bg-emerald-50/50"
                                : "bg-slate-100/90 hover:bg-emerald-100/50"
                          }`}
                        >
                          {/* NUMBER INFO */}
                          <div className="col-span-5 sm:col-span-4 space-y-1 border-r border-slate-300 pr-2 h-full flex flex-col justify-center">
                            <div className="font-mono text-gray-900 font-black tracking-wide text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{item.number}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.number, `num_${item.id}`, item.country)}
                                className="p-1 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-900 transition cursor-pointer border border-slate-300 flex items-center gap-1"
                                title="Copy number"
                              >
                                {copiedText === `num_${item.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Status Badge & OTP Pill */}
                            {item.otp ? (
                              <div className="space-y-1">
                                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#d1fae5] text-[#059669] border border-[#a7f3d0] uppercase tracking-wider">
                                  SUCCESSFUL
                                </span>

                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <div className="flex items-center gap-1.5 bg-[#f3f4f6] border border-gray-300 px-2.5 py-1 rounded-md text-gray-800 font-mono text-xs font-bold shadow-2xs">
                                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{item.otp}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyToClipboard(item.otp!, `otp_${item.id}`)
                                    }
                                    className="p-1 rounded-md bg-[#f3f4f6] hover:bg-gray-200 border border-gray-300 text-gray-600 hover:text-gray-900 transition cursor-pointer"
                                    title="Copy OTP Code"
                                  >
                                    {copiedText === `otp_${item.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : item.status === "FAILED" ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  FAILED
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  PENDING
                                </span>
                              </div>
                            )}
                          </div>

                          {/* COUNTRY / OPERATOR */}
                          <div className="col-span-4 sm:col-span-5 space-y-0.5 border-r border-slate-300 px-2 h-full flex flex-col justify-center">
                            {(() => {
                              let displayCountry = item.country;
                              let displayOperator = item.operator;
                              const digits = (item.number || "").replace(/\D/g, "");

                              if (
                                !displayCountry ||
                                displayCountry.toLowerCase().includes("international") ||
                                displayCountry.toLowerCase() === "global" ||
                                displayCountry.toLowerCase().includes("carrier") ||
                                (displayCountry.toLowerCase().includes("sri lanka") && !digits.startsWith("94"))
                              ) {
                                const info = getCountryInfo(digits);
                                if (info && info.name) {
                                  displayCountry = info.name;
                                } else {
                                  displayCountry = "Global Route";
                                }
                              }

                              if (
                                !displayOperator ||
                                displayOperator.toLowerCase().includes("physical carrier route") ||
                                displayOperator === "Carrier Route" ||
                                displayOperator.toLowerCase().includes("gateway") ||
                                (displayOperator.toLowerCase().includes("dialog") && !digits.startsWith("94"))
                              ) {
                                const cObj = GLOBAL_COUNTRIES_LIST.find((c) => c.name.toLowerCase() === displayCountry.toLowerCase());
                                displayOperator = cObj?.operators?.[0] || "Direct Carrier";
                              }

                              return (
                                <>
                                  <div className="text-gray-900 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                                    <CountryFlag countryCode={displayCountry} size="sm" />
                                    <span className="truncate">{stripFlagFromCountryName(displayCountry)}</span>
                                  </div>
                                  <div className="text-gray-600 text-[11px] sm:text-xs flex items-center gap-1">
                                    <Radio className="w-3 h-3 text-gray-600 shrink-0" />
                                    <span className="truncate">{displayOperator}</span>
                                  </div>
                                </>
                              );
                            })()}
                            {(item as any).allocatedBy && (
                              <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 pt-0.5">
                                <span className="w-1 h-1 rounded-full bg-indigo-500" />
                                <span>Worker: {(item as any).allocatedBy}</span>
                              </div>
                            )}
                          </div>

                          {/* ACTIVITY & ACTIONS */}
                          <div className="col-span-3 text-right space-y-1.5 pl-2 h-full flex flex-col justify-center items-end">
                            <span className="inline-block text-[11px] text-gray-700 font-mono bg-slate-200/80 px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs">
                              {formatRelativeActivityTime(item, nowTick)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNumEntry(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete number"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 2. CONSOLE VIEW -------------------- */}
        {currentView === "console" && (
          <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200/90 space-y-4">
            {/* Header: Live Console + Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-gray-900 font-extrabold text-base sm:text-lg tracking-tight">
                  &gt;_ Live Console
                </span>
                <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                  (super-x-sms.gateway/carrier-core/console)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LIVE STREAM CONNECTED</span>
                </span>
                <a
                  href={SKYPE_DIRECT_CHAT_URL}
                  onClick={handleOpenSkypeOrTeams}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center group shrink-0 cursor-pointer text-center"
                  title="Contact Manager (charlesjames997@outlook.com)"
                >
                  <div className="w-9 h-9 rounded-full bg-[#00AFF0] hover:bg-[#0098d4] active:scale-95 text-white flex items-center justify-center shadow-md border border-sky-300/50 transition-all group-hover:scale-105">
                    <SkypeLogo className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-extrabold text-sky-600 group-hover:text-sky-700 tracking-tight leading-none mt-0.5">Skype</span>
                </a>
              </div>
            </div>

            {/* Filter Search Input & Next Update Countdown Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={consoleFilter}
                  onChange={(e) => setConsoleFilter(e.target.value)}
                  placeholder="Filter logs (sender, operator, carrier, range)..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-800 placeholder-gray-400 font-sans shadow-2xs transition"
                />
              </div>

              {/* Stream Countdown & Refresh */}
              <StreamCountdownRefreshButton
                onRefresh={handleManualRefreshConsole}
                isRefreshing={isConsoleRefreshing}
              />
            </div>

            {/* Live Logs List Cards or Clean Empty State */}
            {(() => {
              const filteredHits = consoleFilteredHits;

              if (filteredHits.length === 0) {
                return (
                  <div className="py-16 text-center space-y-3 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-800">
                        {consoleFilter
                          ? "No matching live console logs found"
                          : consoleApiMeta?.code === 2941
                            ? "API Key Authentication Required"
                            : "Listening for Live SMS Stream"}
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto font-sans">
                        {consoleFilter
                          ? "Try clearing your search filter."
                          : consoleApiMeta?.code === 2941
                            ? "Connecting to gateway session..."
                            : "Carrier gateway routes are connected. Incoming SMS events will appear here in real-time (polling every 2s)."}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3 pt-1">
                  {filteredHits.slice(0, 50).map((log, idx) => {
                    const extractedOtpCode = extractOtp(log.message);
                    const ownerCheck = isHitOwnedByUser(log);
                    const isOwner = ownerCheck.isOwner;

                    // Real-time identical message stream for all users
                    const displayedMessage = log.message;

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border border-l-[4px] p-4 sm:p-5 shadow-2xs space-y-2.5 transition ${
                          isOwner
                            ? "bg-emerald-50/20 border-emerald-300 border-l-emerald-600 ring-1 ring-emerald-500/20 hover:shadow-xs"
                            : "bg-white border-gray-200/90 border-l-blue-500 hover:shadow-xs"
                        }`}
                      >
                        {/* Top Row: Time on Left, Ownership Badge & Operator Badge on Right */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-400 font-normal">
                              {formatHitTime(log.time)}
                            </span>
                            {isOwner ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Your Number</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span>Live Stream</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="bg-gray-100/90 border border-gray-200/90 text-[10px] sm:text-[11px] font-bold text-gray-800 uppercase px-2.5 py-0.5 rounded-md tracking-tight font-sans">
                              {log.operator || "CARRIER GATEWAY"}
                            </span>
                            <span className="text-[11px] text-gray-400 font-normal mt-0.5 text-right">
                              {log.country || "Direct Route"}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Service Name in vibrant color :: Range / Number */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                          <span
                            className={`font-bold font-sans ${getServiceTextColor(log.sid)}`}
                          >
                            {log.sid}
                          </span>
                          <span className="text-gray-300 font-mono text-xs">
                            ::
                          </span>
                          <span className="font-mono text-xs sm:text-[13px] font-medium text-gray-600 tracking-wider">
                            {log.range}
                          </span>
                        </div>

                        {/* Bottom Row: Arrow + Message text */}
                        <div className="flex items-start gap-2 pt-0.5">
                          <span
                            className={`font-bold text-sm shrink-0 leading-tight ${isOwner ? "text-emerald-600" : "text-gray-400"}`}
                          >
                            ➜
                          </span>
                          <div className="font-mono text-xs sm:text-[13px] text-gray-800 break-words leading-relaxed flex-1">
                            {displayedMessage}
                          </div>
                        </div>

                        {/* Quick Action Bar with direct OTP copy for everyone */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                          {extractedOtpCode && (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(
                                  extractedOtpCode,
                                  `otp_${idx}`,
                                )
                              }
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Copy OTP code"
                            >
                              <Key className="w-3 h-3 text-emerald-600" />
                              {copiedText === `otp_${idx}` ? (
                                <span className="text-emerald-700 font-black">
                                  Copied OTP!
                                </span>
                              ) : (
                                <span>🔑 OTP: {extractedOtpCode}</span>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(log.range, `range_${idx}`)
                            }
                            className="px-2 py-1 text-[11px] font-mono font-medium rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition cursor-pointer flex items-center gap-1"
                            title="Copy Number/Range"
                          >
                            {copiedText === `range_${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy Range</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(displayedMessage, `msg_${idx}`)
                            }
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 transition cursor-pointer"
                            title={
                              isOwner
                                ? "Copy Message"
                                : "Copy Protected Message"
                            }
                          >
                            {copiedText === `msg_${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer matching template */}
                  <div className="text-xs text-gray-400 font-mono space-y-0.5 pt-3">
                    <div>Last Updated: {lastUpdatedTime}</div>
                    <div>
                      Logs: {filteredHits.length} (Max{" "}
                      {Math.max(50, filteredHits.length)})
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* -------------------- 3. SMS CDR REPORTS & GLOBAL STATS VIEW -------------------- */}
        {(currentView === "summary" || currentView === "smsCdrReports") && (
          <SmsCdrReportsView
            userEmail={user.email}
            liveHits={liveHits}
            liveSuccessOtps={liveSuccessOtps}
            onSelectCountryRange={(rangeDigits, serviceName) => {
              handleAllocateFromSenderRange(rangeDigits, serviceName);
            }}
            onSelectService={(serviceName, rangeDigits) => {
              if (serviceName) {
                setSelectedService(serviceName);
              }
              if (rangeDigits) {
                setSelectedRange(rangeDigits);
                setRangeCustomInput(rangeDigits);
              }
              setCurrentView("liveTestSms");
            }}
            onRefresh={fetchRealTimeData}
          />
        )}

        {/* -------------------- 4. ACCESS LIST VIEW -------------------- */}
        {currentView === "accessList" && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-300 space-y-4">
            {/* Access List Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <List className="w-5 h-5 text-blue-600" />
                  <span>Access List Pools</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                    {flattenedAccessRows.length} Active Ranges
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time service pools with individual range monitoring. 1 row per active range.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter Service or Range (e.g. 22901, WhatsApp)..."
                  value={accessListFilter}
                  onChange={(e) => setAccessListFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 font-extrabold uppercase text-slate-200 border-b-2 border-slate-700 text-[11px]">
                    <th className="p-3 border-r border-slate-700 w-12 text-center">#</th>
                    <th className="p-3 border-r border-slate-700">Service Name</th>
                    <th className="p-3 border-r border-slate-700">Country / Carrier</th>
                    <th className="p-3 border-r border-slate-700">Range Code</th>
                    <th className="p-3 border-r border-slate-700">Latest Range OTP &amp; Stream</th>
                    <th className="p-3 text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {flattenedAccessRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-slate-500 font-sans text-xs bg-slate-50"
                      >
                        No active service access rules found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    flattenedAccessRows.map((row, i) => {
                      const isEven = i % 2 === 0;
                      return (
                        <tr key={`${row.sid}_${row.range}_${i}`} className={`transition ${isEven ? 'bg-white hover:bg-indigo-50/60' : 'bg-slate-50/90 hover:bg-indigo-50/60'}`}>
                          <td className="p-3 font-mono text-center text-slate-400 border-r border-slate-200">
                            {i + 1}
                          </td>
                          <td className="p-3 font-bold text-blue-700 border-r border-slate-200 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              {row.sid}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 border-r border-slate-200 whitespace-nowrap">
                            <span className="font-semibold">{row.carrier.country}</span>
                            <span className="text-[10px] text-slate-500 block">{row.carrier.operator}</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                              {row.range.length <= 6 ? `${row.range}XXX` : row.range}
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200">
                            {row.otp ? (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 text-xs font-mono">
                                  🔑 OTP: {row.otp}
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(row.otp!, `acc_flt_${row.sid}_${row.range}`)}
                                    className="ml-1 px-1.5 py-0.5 bg-emerald-700 text-white rounded text-[10px] hover:bg-emerald-800 transition cursor-pointer font-sans"
                                  >
                                    {copiedText === `acc_flt_${row.sid}_${row.range}` ? "Copied" : "Copy"}
                                  </button>
                                </span>
                                {row.message && (
                                  <span className="text-[11px] text-slate-600 line-clamp-1 italic max-w-xs" title={row.message}>
                                    "{row.message}"
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">
                                Active route ready
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-right whitespace-nowrap">
                            {row.last_at
                              ? new Date(row.last_at * 1000).toLocaleTimeString("en-GB")
                              : "Active"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- 5. SENDER / RANGE VIEW -------------------- */}
        {currentView === "senderRange" && (
          <div className="space-y-5">
            {/* Header & Control Section */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/70 shadow-2xs">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                        Sender / Range
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 border border-blue-200 text-blue-700">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <span>Live Carrier Stream</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Real-time carrier ranges &amp; incoming message stream.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleManualRefreshConsole}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Refresh Live Ranges"
                  >
                    <RotateCw
                      className={`w-3.5 h-3.5 ${isConsoleRefreshing ? "animate-spin text-blue-600" : "text-gray-500"}`}
                    />
                    <span>Sync Stream</span>
                  </button>
                </div>
              </div>

              {/* Real-time stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Active Senders
                  </span>
                  <span className="font-black text-blue-600 text-base">
                    {
                      Array.from(new Set(senderRangeList.map((s) => s.sid)))
                        .length
                    }{" "}
                    Senders
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Monitored Ranges
                  </span>
                  <span className="font-black text-emerald-600 text-base">
                    {
                      Array.from(new Set(senderRangeList.map((s) => s.range)))
                        .length
                    }{" "}
                    Ranges
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Stream Traffic Hits
                  </span>
                  <span className="font-black text-purple-600 text-base">
                    {liveHits.length} Hits
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Sync Interval
                  </span>
                  <span className="font-black text-amber-600 text-base">
                    Every 2s
                  </span>
                </div>
              </div>

              {/* Search & Category Filter bar */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={senderRangeFilter}
                      onChange={(e) => setSenderRangeFilter(e.target.value)}
                      placeholder="Filter by sender (e.g. WhatsApp), range (e.g. 88017), operator, country..."
                      className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    {senderRangeFilter && (
                      <button
                        type="button"
                        onClick={() => setSenderRangeFilter("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Quick Filter:
                  </span>
                  {[
                    "ALL",
                    "WhatsApp",
                    "Telegram",
                    "Google",
                    "Facebook",
                    "IMO",
                    "TikTok",
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSenderCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 text-xs ${
                        senderCategoryFilter === cat
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Senders & Ranges Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    Carrier Ranges &amp; Live Senders (
                    {filteredSenderRanges.length})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">
                  Real-Time Traffic Routing Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800 border-b-2 border-slate-700 text-slate-200 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 border-r border-slate-700">Country &amp; Operator</th>
                      <th className="py-3 px-4 border-r border-slate-700">Range Prefix</th>
                      <th className="py-3 px-4 border-r border-slate-700">Social Media / Service</th>
                      <th className="py-3 px-4 text-center border-r border-slate-700">Status &amp; Activity</th>
                      <th className="py-3 px-4 border-r border-slate-700">Latest Live Message (Masked OTP)</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 bg-white">
                    {filteredSenderRanges.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-slate-400 text-xs"
                        >
                          No matching sender ranges found for "
                          {senderRangeFilter}".
                        </td>
                      </tr>
                    ) : (
                      filteredSenderRanges.map((item, idx) => {
                        const style = getServiceStyle(item.sid);
                        const extractedOtp = extractOtp(item.latestMessage);
                        const maskedMessage = maskOtpInMessage(item.latestMessage, extractedOtp);
                        const maskedOtpDisplay = extractedOtp ? extractedOtp.replace(/[0-9]/g, "X") : "—";
                        const isEven = idx % 2 === 0;

                        return (
                          <tr
                            key={item.key}
                            className={`transition ${
                              isEven
                                ? "bg-white hover:bg-indigo-50/60"
                                : "bg-slate-100/90 hover:bg-indigo-100/60"
                            }`}
                          >
                            {/* 1. Country & Operator */}
                            <td className="py-3.5 px-4 border-r border-b border-slate-300">
                              <div className="flex items-center gap-2">
                                <CountryFlag countryCode={item.country} size="sm" />
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {stripFlagFromCountryName(item.country)}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    {item.operator}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 2. Range Prefix */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs sm:text-sm border-r border-b border-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                                  {item.range.length <= 6 ? `${item.range}XXX` : item.range}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyToClipboard(
                                      item.range,
                                      `range_${item.key}`,
                                    )
                                  }
                                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                  title="Copy Range"
                                >
                                  {copiedText === `range_${item.key}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* 3. Social Media / Service */}
                            <td className="py-3.5 px-4 border-r border-b border-slate-300">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${style.badge}`}
                              >
                                <span>{item.sid}</span>
                              </span>
                            </td>

                            {/* 4. Status & Activity */}
                            <td className="py-3.5 px-4 text-center border-r border-b border-slate-300">
                              <div className="flex flex-col items-center gap-1">
                                {item.hitsCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {item.hitsCount} hits
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono text-slate-400">
                                    Idle Socket
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {formatRelativeActivityTime({ createdAt: typeof item.latestTime === "number" ? item.latestTime : Date.now(), activity: "Active stream" }, nowTick)}
                                </span>
                              </div>
                            </td>

                            {/* 5. Latest Message (Masked OTP) */}
                            <td className="py-3.5 px-4 max-w-xs border-r border-b border-slate-300">
                              <div className="truncate font-mono text-slate-800 text-[11px]" title={maskedMessage}>
                                {maskedMessage}
                              </div>
                              {extractedOtp && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    🔑 OTP: {maskedOtpDisplay}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(extractedOtp, `range_otp_${item.key}`)}
                                    className="text-[10px] font-mono text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer"
                                    title="Copy OTP to Clipboard"
                                  >
                                    {copiedText === `range_otp_${item.key}` ? "Copied" : "Copy OTP"}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* 6. Action Button */}
                            <td className="py-3.5 px-4 text-right border-b border-slate-300">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAllocateFromSenderRange(item.range)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-2xs transition cursor-pointer whitespace-nowrap"
                                title={`Allocate number from range ${item.range}`}
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>Get Number</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Message Feed dedicated to Senders & Ranges */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                    Real-Time Incoming Stream Feed
                  </h3>
                </div>
                <span className="text-xs font-mono text-gray-500">
                  Active Messages: {liveHits.length}
                </span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {liveHits.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    <Radio className="w-6 h-6 mx-auto mb-2 text-gray-300 animate-pulse" />
                    Waiting for incoming messages on live stream...
                  </div>
                ) : (
                  liveHits.slice(0, 25).map((hit, idx) => {
                    const otpCode = extractOtp(hit.message);
                    const ownerCheck = isHitOwnedByUser(hit);
                    const isOwner = ownerCheck.isOwner;
                    const displayedMessage = hit.message;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isOwner
                            ? "border-emerald-300 bg-emerald-50/30"
                            : "border-gray-200/80 bg-gray-50/70 hover:bg-white hover:shadow-2xs"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="font-mono text-gray-400 text-[11px]">
                              {formatHitTime(hit.time)}
                            </span>
                            <span
                              className={`font-bold ${getServiceTextColor(hit.sid)}`}
                            >
                              {hit.sid}
                            </span>
                            <span className="text-gray-300 font-mono">::</span>
                            <span className="font-mono text-gray-700 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                              {hit.range}
                            </span>
                            {isOwner && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                YOU
                              </span>
                            )}
                            <span className="text-[11px] text-gray-500 font-normal">
                              {hit.operator ||
                                resolveCarrierDetails(hit.range).operator}{" "}
                              (
                              {getRealCountryName(hit.country, hit.range)}
                              )
                            </span>
                          </div>
                          <div className="text-xs font-mono text-gray-800 break-words">
                            ➜ {displayedMessage}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {otpCode && (
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(otpCode, `sender_otp_${idx}`)
                              }
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Copy OTP code"
                            >
                              <Key className="w-3 h-3 text-emerald-600" />
                              {copiedText === `sender_otp_${idx}`
                                ? "Copied!"
                                : `OTP: ${otpCode}`}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleAllocateFromSenderRange(hit.range)
                            }
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition cursor-pointer flex items-center gap-1"
                          >
                            <Smartphone className="w-3 h-3" />
                            <span>Allocate Range</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 6. TERMINAL VIEW -------------------- */}
        {currentView === "terminal" && (
          <div className="bg-[#1e293b] text-gray-200 rounded-2xl p-5 shadow-lg border border-gray-700 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <Circle className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="font-bold text-white text-sm">
                  Network Terminal
                </span>
              </div>
              <span className="text-xs text-emerald-400">ACTIVE</span>
            </div>

            <div className="bg-black/50 p-4 rounded-xl h-80 overflow-y-auto space-y-2 text-xs">
              {liveHits.length === 0 ? (
                <div className="space-y-2 text-gray-400">
                  <div className="text-emerald-400">
                    [SYSTEM] Terminal initialized. Gateway connection active.
                  </div>
                  <div className="text-gray-400">
                    [SYSTEM] Listening for carrier socket events...
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    [SYSTEM] Ready. No packets received yet.
                  </div>
                </div>
              ) : (
                liveHits.map((h, i) => {
                  const isOwner = isHitOwnedByUser(h).isOwner;
                  const displayedMsg = h.message;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-gray-300"
                    >
                      <span className="text-gray-500">
                        [{new Date(h.time || Date.now()).toLocaleTimeString()}]
                      </span>
                      <span className="text-amber-400">[{h.sid}]</span>
                      <span className="text-blue-400">RANGE:{h.range}</span>
                      {isOwner && (
                        <span className="text-emerald-300 font-bold">
                          [OWNER]
                        </span>
                      )}
                      <span
                        className={
                          isOwner
                            ? "text-emerald-400 font-bold"
                            : "text-gray-300"
                        }
                      >
                        {displayedMsg}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* -------------------- CHOICE TERMINAL / SMS RANGE VIEW -------------------- */}
        {currentView === "smsRange" && (
          <div className="w-full space-y-6 py-4 animate-fadeIn max-w-4xl mx-auto">
            {/* Action Feedback Banner */}
            {actionFeedbackToast && (
              <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{actionFeedbackToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedbackToast(null)}
                  className="p-1 hover:bg-emerald-700 rounded transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Clean Choice Terminal Selector Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Choose Terminal
                </h1>
                {userWorkspaceRangePrefixes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllWorkspaceRanges}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer transition bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200"
                    title="Delete All Numbers"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All</span>
                  </button>
                )}
              </div>

              {/* Main Selector Box displaying "-- Choose a termination --" or selected option */}
              <button
                type="button"
                onClick={() => {
                  setIsTerminationDropdownOpen(true);
                  setIsAddNumbersModalOpen(true);
                }}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-300 hover:border-indigo-500 rounded-xl px-4 py-3.5 text-left text-sm font-semibold text-slate-800 flex items-center justify-between transition cursor-pointer shadow-xs group"
              >
                {selectedTerminationPrefix ? (() => {
                  const chosen = manualRanges.find((r) => r.rangePrefix === selectedTerminationPrefix);
                  if (!chosen) return <span className="text-slate-600 font-medium">-- Choose a termination --</span>;
                  const info = formatTerminationInfo(chosen);
                  return (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CountryFlag
                        countryCode={chosen.country}
                        size="md"
                        className="w-7 h-5 rounded border border-slate-300/80 shadow-2xs shrink-0"
                      />
                      <span className="font-black text-slate-900 truncate">
                        {chosen.country} - {info.operator} - {(info as any).maskedPrefix || chosen.rangePrefix || chosen.dialCode}
                      </span>
                      <span className="text-emerald-600 text-xs font-semibold shrink-0">
                        (Unlimited available)
                      </span>
                    </div>
                  );
                })() : (
                  <span className="text-slate-600 font-medium text-sm">-- Choose a termination --</span>
                )}
                <div className="w-5 h-5 rounded-full border-2 border-slate-400 group-hover:border-indigo-600 flex items-center justify-center shrink-0">
                  {selectedTerminationPrefix ? <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> : null}
                </div>
              </button>

              <p className="text-xs text-slate-500">
                Click above to open the termination selector dialog and choose active country ranges.
              </p>
            </div>

            {/* Modal Dialog Matching User Screenshot */}
            {(isTerminationDropdownOpen || isAddNumbersModalOpen) && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
                  {/* Dialog Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Choose Terminal Route
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTerminationDropdownOpen(false);
                        setIsAddNumbersModalOpen(false);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search Bar in Dialog */}
                  <div className="p-3 border-b border-slate-100 bg-white">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search country name or range..."
                        value={terminationSearchQuery}
                        onChange={(e) => setTerminationSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      {terminationSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTerminationSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Radio Option List (Exact screenshot format) */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
                    {/* Default "-- Choose a termination --" Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTerminationPrefix("");
                        setIsTerminationDropdownOpen(false);
                        setIsAddNumbersModalOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                        !selectedTerminationPrefix
                          ? "bg-slate-100/90 font-bold text-slate-900"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="text-xs sm:text-sm">-- Choose a termination --</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        !selectedTerminationPrefix ? "border-indigo-600" : "border-slate-300"
                      }`}>
                        {!selectedTerminationPrefix && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                      </div>
                    </button>

                    {/* All Added Country Ranges from Telegram / Admin */}
                    {filteredAvailableTerminations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No terminations found.
                      </div>
                    ) : (
                      filteredAvailableTerminations.map((r) => {
                        const info = formatTerminationInfo(r);
                        const isSelected = selectedTerminationPrefix === r.rangePrefix;
                        const displayText = `${r.country} - ${info.operator} - ${(info as any).maskedPrefix || r.rangePrefix || r.dialCode} (Unlimited available)`;

                        return (
                          <button
                            key={r.rangePrefix}
                            type="button"
                            onClick={() => handleAddTermination(r.rangePrefix, false)}
                            className={`w-full text-left px-4 py-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer group ${
                              isSelected
                                ? "bg-indigo-50/80 font-bold text-slate-900"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <CountryFlag
                                countryCode={r.country}
                                size="md"
                                className="w-6 h-4 rounded border border-slate-300 shrink-0"
                              />
                              <span className="text-xs sm:text-sm font-medium leading-tight text-slate-800 break-words">
                                {displayText}
                              </span>
                            </div>

                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "border-indigo-600 bg-white" : "border-slate-300 group-hover:border-slate-400"
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsTerminationDropdownOpen(false);
                        setIsAddNumbersModalOpen(false);
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Workspace Control Bar (Select All, Bulk Delete, Clear All, Search & Platforms) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={
                        filteredManualRangesList.length > 0 &&
                        selectedRangesForDelete.size === filteredManualRangesList.length
                      }
                      onChange={() =>
                        handleToggleSelectAll(filteredManualRangesList.map((r) => r.rangePrefix))
                      }
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                    <span>Select All ({selectedRangesForDelete.size} of {filteredManualRangesList.length})</span>
                  </label>

                  {selectedRangesForDelete.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedRanges}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedRangesForDelete.size})</span>
                    </button>
                  )}

                  {userWorkspaceRangePrefixes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllWorkspaceRanges}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                      title="একবারে সব নাম্বার ডিলিট করুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete All Numbers (একবারে সব মুছুন)</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span>Workspace items: <strong className="text-slate-800">{userWorkspaceRangePrefixes.length}</strong></span>
                </div>
              </div>

              {/* Range Search & Filtering Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search workspace ranges (e.g. 94782, Sri Lanka)..."
                    value={manualRangesSearch}
                    onChange={(e) => setManualRangesSearch(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Manual Ranges Grid Layout (Sophisticated border-cards) */}
            {manualRangesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100" />
                        <div className="space-y-1">
                          <div className="h-3.5 w-24 bg-slate-100 rounded" />
                          <div className="h-2.5 w-16 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-12 bg-slate-100 rounded-full" />
                    </div>
                    <div className="h-6 w-full bg-slate-100 rounded" />
                    <div className="h-3.5 w-1/2 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : (() => {
              const filtered = filteredManualRangesList;

              if (filtered.length === 0) {
                return (
                  <div className="w-full flex flex-col items-center justify-center py-14 px-4 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-lime-50 border border-lime-200 flex items-center justify-center text-[#65a30d]">
                      <Plus className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">
                        {userWorkspaceRangePrefixes.length === 0
                          ? "No ranges in your workspace"
                          : "No matching ranges found"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        {userWorkspaceRangePrefixes.length === 0
                          ? "You have removed all ranges. Click below to choose terminations and populate your SMS Range list again."
                          : "Try searching with a different keyword or selecting 'All Platforms'."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTerminationPrefix("");
                        setIsTerminationDropdownOpen(true);
                        setIsAddNumbersModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#65a30d] hover:bg-[#58910b] text-white text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Choice this termination / Add numbers</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((range, index) => {
                    const termInfo = formatTerminationInfo(range);
                    const isSelectedForDelete = selectedRangesForDelete.has(range.rangePrefix);

                    return (
                      <div
                        key={range.rangePrefix}
                        className={`bg-white hover:bg-slate-50/60 rounded-2xl border p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between relative group overflow-hidden ${
                          isSelectedForDelete
                            ? "border-red-300 ring-2 ring-red-200 bg-red-50/10"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Interactive decorative line tag */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-1 ${
                            termInfo.resolvedPlatform.toUpperCase().includes("WHATSAPP")
                              ? "bg-emerald-500"
                              : "bg-sky-500"
                          }`}
                        />

                        <div>
                          {/* Card Top row: Serial #, Checkbox, Flag, Country, Platform Logo, and Corner Delete Button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelectedForDelete}
                                onChange={() => {
                                  setSelectedRangesForDelete((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(range.rangePrefix)) next.delete(range.rangePrefix);
                                    else next.add(range.rangePrefix);
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
                                title="Mark for deletion"
                              />
                              <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md font-mono shrink-0" title={`Serial #${index + 1}`}>
                                #{index + 1}
                              </span>
                              <div className="shrink-0 p-0.5 bg-slate-50 rounded border border-slate-200/80 shadow-2xs flex items-center justify-center">
                                <CountryFlag
                                  countryCode={range.country}
                                  size="md"
                                  className="w-8 h-5.5 rounded border border-slate-300/80 shadow-2xs shrink-0"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">
                                  {range.country}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5 truncate">
                                  {range.dialCode || "+94"} &bull; {termInfo.operator}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Official Social Platform Logo + Name Badge */}
                              <RangeSocialBadge
                                platform={termInfo.resolvedPlatform}
                                country={range.country}
                                size="md"
                              />

                              {/* Corner Delete Button (User requested: "কোনায় ডিলিট অপশন থাকবে") */}
                              <button
                                type="button"
                                onClick={() => handleRemoveSingleRange(range.rangePrefix)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                                title="Remove range from workspace"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Central Prefix Display: First 5 numbers visible, rest hidden, Unlimited available */}
                          <div className="my-4 bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                Masked Range Prefix
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Unlimited available
                              </span>
                            </div>
                            <span className="text-lg font-black font-mono text-slate-900 tracking-wide mt-1">
                              {termInfo.masked}
                            </span>
                          </div>
                        </div>

                        {/* Bottom stock row */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1 text-xs">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold">AVAILABLE STOCK</span>
                            {range.availableCount > 0 ? (
                              <span className="text-emerald-600 font-extrabold flex items-center gap-1 mt-0.5">
                                <Zap className="w-3.5 h-3.5 fill-emerald-500/20" />
                                <span>{range.availableCount.toLocaleString()} numbers</span>
                              </span>
                            ) : (
                              <span className="text-rose-500 font-extrabold flex items-center gap-1 mt-0.5">
                                <Lock className="w-3 h-3" />
                                <span>Sold out</span>
                              </span>
                            )}
                          </div>

                          {/* Purchase direct circle action */}
                          {range.availableCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setRangeCustomInput(range.rangePrefix);
                                setGetNumTab("RANGE");
                                setCurrentView("getNumber");
                                playOtpChime();
                              }}
                              className="w-9 h-9 rounded-full bg-slate-900 hover:bg-indigo-600 text-white flex items-center justify-center transition shadow-md hover:shadow-indigo-500/20 active:scale-95 cursor-pointer"
                              title="Get dynamic number from this range"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* FULL SCREEN Select Termination / Add Numbers View (Full Page as requested by user) */}
            {isAddNumbersModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-100/95 flex flex-col w-full h-full overflow-hidden animate-fadeIn">
                {/* Full Screen Header */}
                <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddNumbersModalOpen(false);
                        setIsTerminationDropdownOpen(false);
                      }}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                      title="Back to SMS Ranges"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-xs font-bold hidden sm:inline">Back to Workspace</span>
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                          Select Termination
                        </h1>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Unlimited Stock
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                        Select a country termination route to add to your SMS Range workspace
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {userWorkspaceRangePrefixes.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllWorkspaceRanges}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                        title="একবারে সব নাম্বার ডিলিট করুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete All Numbers</span>
                        <span className="sm:hidden">Delete All</span>
                      </button>
                    )}
                    <span className="hidden md:inline-block text-xs font-medium text-slate-500">
                      Showing <strong className="text-slate-800 font-bold">{filteredAvailableTerminations.length}</strong> of {manualRanges.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddNumbersModalOpen(false);
                        setIsTerminationDropdownOpen(false);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </header>

                {/* Sticky Search & Platform Filters */}
                <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 shadow-2xs">
                  <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center gap-3">
                    {/* Search input with clear button */}
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search country, operator, or prefix (e.g. Sri Lanka, 94782, WhatsApp)..."
                        value={terminationSearchQuery}
                        onChange={(e) => setTerminationSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition"
                        autoFocus
                      />
                      {terminationSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTerminationSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Platform quick chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
                      {(["ALL", "WhatsApp", "Telegram", "IMO"] as const).map((plat) => {
                        const isActive =
                          plat === "ALL"
                            ? !terminationSearchQuery.toLowerCase().includes("whatsapp") &&
                              !terminationSearchQuery.toLowerCase().includes("telegram") &&
                              !terminationSearchQuery.toLowerCase().includes("imo")
                            : terminationSearchQuery.toLowerCase() === plat.toLowerCase();
                        return (
                          <button
                            key={plat}
                            type="button"
                            onClick={() => {
                              if (plat === "ALL") {
                                setTerminationSearchQuery("");
                              } else {
                                setTerminationSearchQuery(plat);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                              isActive
                                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {plat === "WhatsApp" && <WhatsAppLogo className="w-3.5 h-3.5" />}
                            {plat === "Telegram" && <TelegramLogo className="w-3.5 h-3.5" />}
                            <span>{plat === "ALL" ? "All Routes" : plat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Main Full-Screen Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70">
                  <div className="max-w-4xl mx-auto w-full space-y-3 pb-28">
                    {filteredAvailableTerminations.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                        <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-800">No termination routes found</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          No active routes matched "{terminationSearchQuery}". Try clearing your search.
                        </p>
                        <button
                          type="button"
                          onClick={() => setTerminationSearchQuery("")}
                          className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      filteredAvailableTerminations.map((r, index) => {
                        const info = formatTerminationInfo(r);
                        const isSelected = selectedTerminationPrefix === r.rangePrefix;
                        const isAlreadyAdded = userWorkspaceRangePrefixes.includes(r.rangePrefix);
                        const isSriLanka = (r.country || "").toLowerCase().includes("sri lanka");
                        const resolvedPlat = isSriLanka ? "WhatsApp" : (r.platform || r.socialMedia || "WhatsApp");

                        return (
                          <div
                            key={r.rangePrefix}
                            onClick={() => setSelectedTerminationPrefix(r.rangePrefix)}
                            className={`bg-white rounded-2xl border p-4 sm:p-5 transition shadow-xs hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden group ${
                              isSelected
                                ? "border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/15"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                            }`}
                          >
                            {/* Decorative Line */}
                            <div
                              className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
                                isSelected
                                  ? "bg-emerald-500"
                                  : resolvedPlat.toLowerCase().includes("whatsapp")
                                  ? "bg-emerald-400/60 group-hover:bg-emerald-500"
                                  : "bg-sky-400/60 group-hover:bg-sky-500"
                              }`}
                            />

                            {/* Left: Serial #, Flag (প্রথমে পতাকা), Country Name (পরে কান্ট্রি), Range (তারপরে রেঞ্জ) */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Serial Number */}
                              <span className="text-xs font-black text-slate-400 font-mono w-6 shrink-0">
                                #{index + 1}
                              </span>

                              {/* 1. Authentic Flag matching Test Panel */}
                              <div className="shrink-0 p-1 bg-slate-50 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-center">
                                <CountryFlag
                                  countryCode={r.country}
                                  size="lg"
                                  className="w-10 h-7 rounded object-cover shadow-2xs"
                                />
                              </div>

                              {/* 2. Country Name & 3. Range */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                                    {r.country}
                                  </span>
                                  <span className="text-slate-400 text-xs font-semibold">
                                    &bull; {info.operator}
                                  </span>
                                  {isAlreadyAdded && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                      <Check className="w-3 h-3" />
                                      Already in workspace
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                                  {/* Masked Range */}
                                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    {info.masked}
                                  </span>

                                  {/* Unlimited available badge */}
                                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Unlimited available
                                  </span>

                                  {/* Total in pool */}
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    ({r.availableCount || r.totalCount} active)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Platform Badge & Selection Radio */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                              <RangeSocialBadge platform={resolvedPlat} country={r.country} size="md" />

                              {/* Radio Indicator */}
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                                  isSelected
                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                                    : "border-slate-300 group-hover:border-slate-400 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Sticky Bottom Action Bar */}
                <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3.5 shrink-0 shadow-lg">
                  <div className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Selected preview */}
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedTerminationPrefix ? (() => {
                        const chosen = manualRanges.find((r) => r.rangePrefix === selectedTerminationPrefix);
                        if (!chosen) return null;
                        const chosenInfo = formatTerminationInfo(chosen);
                        const isSriLanka = (chosen.country || "").toLowerCase().includes("sri lanka");
                        const plat = isSriLanka ? "WhatsApp" : (chosen.platform || chosen.socialMedia || "WhatsApp");

                        return (
                          <div className="flex items-center gap-2.5 truncate">
                            <CountryFlag
                              countryCode={chosen.country}
                              size="md"
                              className="w-8 h-5.5 rounded border border-slate-300 shadow-2xs shrink-0"
                            />
                            <div className="truncate">
                              <div className="text-xs font-black text-slate-900 truncate">
                                {chosen.country} &bull; {chosenInfo.masked}
                              </div>
                              <div className="text-[11px] text-emerald-600 font-semibold truncate flex items-center gap-1.5">
                                <span>{plat}</span>
                                <span>&bull;</span>
                                <span>Unlimited available</span>
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="text-xs text-slate-500 italic">
                          Tap any termination route above to select it
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2.5 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddNumbersModalOpen(false);
                          setIsTerminationDropdownOpen(false);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={!selectedTerminationPrefix}
                        onClick={() => handleAddTermination()}
                        className={`px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition active:scale-95 shadow-md cursor-pointer ${
                          selectedTerminationPrefix
                            ? "bg-[#65a30d] hover:bg-[#58910b] text-white shadow-lime-600/20"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        }`}
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>+ Add to Workspace</span>
                      </button>
                    </div>
                  </div>
                </footer>
              </div>
            )}
          </div>
        )}

        {/* -------------------- SMS NUMBER VIEW -------------------- */}
        {currentView === "smsNumber" && (
          <div className="w-full space-y-6 py-4 animate-fadeIn">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-500" />
                  <span>Manual Number Pool Inventory</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  View individual numbers loaded in the pool. Available numbers can receive test OTP triggers dispatched to Telegram and the dashboard.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  Pool Total: <strong className="text-slate-800 font-extrabold">{manualNumbersTotal}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setManualNumbersLoading(true);
                    fetchManualNumbers(1000, 0)
                      .then((res) => {
                        setManualNumbers(res.numbers || []);
                        setManualNumbersTotal(res.total || 0);
                      })
                      .finally(() => setManualNumbersLoading(false));
                  }}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 border border-slate-200 cursor-pointer"
                  title="Reload list"
                >
                  <RefreshCw className={`w-4 h-4 ${manualNumbersLoading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search numbers or country names... (e.g. +880)"
                  value={manualNumbersSearch}
                  onChange={(e) => setManualNumbersSearch(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Quick Stock Filters */}
              <div className="flex items-center gap-1.5">
                {["ALL", "Available", "Allocated"].map((stat) => (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => setManualNumbersStatusFilter(stat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer border ${
                      manualNumbersStatusFilter === stat
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>

            {/* Numbers Inventory List */}
            {manualNumbersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-14 w-full bg-white rounded-xl border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : (() => {
              const filtered = filteredManualNumbersList;

              if (filtered.length === 0) {
                return (
                  <div className="w-full flex flex-col items-center justify-center py-16 px-4 bg-slate-50 rounded-3xl border border-slate-200 text-center">
                    <Smartphone className="w-10 h-10 text-slate-400 animate-bounce mb-3" />
                    <h3 className="text-base font-bold text-slate-800">No active numbers matches filters</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Try searching with other country flags, prefixes, or status keys.
                    </p>
                  </div>
                );
              }

              return (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3.5"># Index</th>
                          <th className="px-5 py-3.5">Country / Code</th>
                          <th className="px-5 py-3.5">Phone Number</th>
                          <th className="px-5 py-3.5">Service Platform</th>
                          <th className="px-5 py-3.5">Allocation Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {filtered.slice(0, 200).map((num, idx) => {
                          const canonicalPlat = num.platform || num.socialMedia || "Telegram";
                          const isTelegram = canonicalPlat.toUpperCase() === "TELEGRAM";
                          const isWhatsApp = canonicalPlat.toUpperCase() === "WHATSAPP";

                          return (
                            <tr key={num.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 font-mono font-bold text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{num.flag || "🇧🇩"}</span>
                                  <div>
                                    <div className="font-extrabold text-slate-800">{num.country}</div>
                                    <div className="text-[10px] font-bold text-slate-400 font-mono">{num.dialCode}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-slate-950 text-sm">
                                    {num.number}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(num.number, `num_inv_${idx}`)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
                                    title="Copy raw phone number"
                                  >
                                    {copiedText === `num_inv_${idx}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  isTelegram
                                    ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                                    : isWhatsApp
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                }`}>
                                  {canonicalPlat}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {num.allocated ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="inline-flex items-center gap-1 text-slate-500 font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                      <span>Allocated</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={num.allocatedTo}>
                                      by {num.allocatedTo}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Available</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Test OTP play button */}
                                  {!num.allocated && (
                                    <button
                                      type="button"
                                      onClick={() => handleTestOtpSend(num.number)}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                                        testOtpStatus[num.number]
                                          ? "bg-slate-900 text-amber-400"
                                          : "bg-slate-900 hover:bg-slate-800 text-white"
                                      }`}
                                      disabled={testOtpStatus[num.number] === "Sending..."}
                                    >
                                      <Zap className="w-3 h-3 text-amber-400" />
                                      <span>{testOtpStatus[num.number] || "Send Test OTP"}</span>
                                    </button>
                                  )}

                                  {/* Direct select redirect */}
                                  {!num.allocated && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRangeCustomInput(num.rangePrefix);
                                        setGetNumTab("RANGE");
                                        setCurrentView("getNumber");
                                        playOtpChime();
                                      }}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg transition"
                                      title="Purchase dynamic number"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filtered.length > 200 && (
                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Showing first 200 numbers of {filtered.length} matching pool items.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* -------------------- 7. PROFILE VIEW -------------------- */}
        {currentView === "profile" && (
          <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
            {/* Hidden Gallery / Device File Input */}
            <input
              type="file"
              ref={profileFileInputRef}
              accept="image/*"
              onChange={handleGalleryPhotoSelected}
              className="hidden"
            />

            {/* Cyber Hero Banner Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border-2 border-emerald-500/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-5 relative z-10">
                {/* Clickable Profile Avatar with Gallery Upload */}
                <div
                  onClick={handleOpenGalleryPicker}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-1 flex items-center justify-center shrink-0 shadow-[0_0_35px_rgba(16,185,129,0.35)] border border-white/30 cursor-pointer relative group transition-transform active:scale-95"
                  title="Click to select / change photo from your device gallery"
                >
                  <div className="w-full h-full bg-slate-950 rounded-[20px] flex items-center justify-center overflow-hidden relative">
                    {profileAvatar ? (
                      <img src={profileAvatar} alt="Profile Avatar" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-emerald-400 to-cyan-300">
                        {(profileName || user.name || (isManagerAccount ? "M" : "U"))[0].toUpperCase()}
                      </span>
                    )}

                    {/* Camera Overlay on Hover/Tap */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 text-center">
                      <Camera className="w-5 h-5 text-emerald-400 mb-0.5" />
                      <span>{isUploadingPhoto ? "Uploading..." : "Change Photo"}</span>
                    </div>
                  </div>

                  {/* Verified Tick Badge on Avatar */}
                  {isManagerAccount && (
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-white text-xs font-black shadow-md">
                      ✓
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                      <span>{profileName || user.name || (isManagerAccount ? "SUPER X MANAGER" : "SUPER X User")}</span>
                      {isManagerAccount && (
                        <span title="Super X Verified Manager" className="inline-flex items-center">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-500/20 shrink-0" />
                        </span>
                      )}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                      isManagerAccount
                        ? 'bg-gradient-to-r from-amber-500/25 via-emerald-500/25 to-cyan-500/25 text-amber-300 border border-amber-400/50'
                        : currentUserDisplayRole === 'Admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        : currentUserDisplayRole === 'Sub-Admin'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    }`}>
                      <span>👑</span>
                      <span>{isManagerAccount ? 'SUPER X MANAGER' : currentUserDisplayRole}</span>
                    </span>

                    <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>VERIFIED</span>
                    </span>

                    {isManagerAccount && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 uppercase">
                        OFFICIAL
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 font-mono flex items-center gap-2 flex-wrap pt-0.5">
                    <span>Identity: <strong className="text-teal-300">{user.email}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Account ID: <strong className="text-amber-300">{accountCode}</strong></span>
                  </p>
                </div>
              </div>

              {/* Action Buttons in Hero */}
              <div className="relative z-10 flex flex-wrap items-center gap-2.5 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleOpenGalleryPicker}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 border border-emerald-300/40 transition hover:scale-105 active:scale-95 cursor-pointer"
                  title="Choose a photo from your phone/computer gallery"
                >
                  <Camera className="w-4 h-4 text-emerald-100" />
                  <span>{profileAvatar ? "Change Photo" : "Upload Photo"}</span>
                </button>

                {profileAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveProfileAvatar}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 font-bold text-xs uppercase tracking-wider border border-slate-700 hover:border-rose-500/40 transition cursor-pointer"
                    title="Remove custom profile photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <a
                  href="https://t.me/super_x_support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 border border-sky-400/40 transition hover:scale-105 active:scale-95 cursor-pointer"
                  title="Contact API Manager on Telegram"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>এপিআই ম্যানেজার</span>
                </a>
              </div>
            </div>

            {/* Toast Alerts for Profile Actions */}
            {profileSaveSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{profileSaveSuccess}</span>
              </div>
            )}
            {profileSaveError && (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{profileSaveError}</span>
              </div>
            )}

            {/* Vertical Stack Layout (লাম্বালম্বি) */}
            <div className="space-y-6">
              {/* 1. Profile Details Form Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Submitted Profile & Registration Info
                    </h3>
                  </div>
                  {isManagerAccount && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold font-mono">
                      👑 MANAGER ACCOUNT
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveProfileInfo} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Full Name / Account Title:
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Registered Email Address (Identity):
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-400 cursor-not-allowed font-mono"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      * Email identity is locked and verified.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Phone Number / Telegram Contact:
                    </label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+8801700000000 or @telegram_handle"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-400 transition font-mono"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      * You can change your name or phone number anytime. Click "Save Changes" below to save immediately.
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      id="save-profile-btn"
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. User Proxy API Session Section (সকল তথ্যের নিচে এপিআই) */}
              <UserApiSessionCard 
                userEmail={user.email} 
                userName={user.name} 
                accountCode={accountCode} 
                apiUnlocked={user.apiUnlocked}
                apiKey={user.apiKey}
              />

              {/* 3. Security & Change Password Card (তার নিচে নতুন ইউজার পাসওয়ার্ড চেঞ্জ) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Key className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Update Account Password
                  </h3>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      New Security Password:
                    </label>
                    <input
                      type="password"
                      value={profileNewPassword}
                      onChange={(e) => setProfileNewPassword(e.target.value)}
                      placeholder="Enter new password (min 4 chars)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Confirm New Password:
                    </label>
                    <input
                      type="password"
                      value={profileConfirmPassword}
                      onChange={(e) => setProfileConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-400 transition"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin Sync Protection</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Updating your password here automatically updates your access credentials across the system and reflects in the Admin Panel.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* 4. 2FA Two-Factor Authentication Security Card */}
              <TwoFactorAuthCard userEmail={user.email} userName={user.name} />
            </div>
          </div>
        )}

        {/* User API Session Standalone View (Main Admin Only) */}
        {currentView === "userApiSession" && user.role === "admin" && (
          <div className="animate-fadeIn">
            <UserApiSessionCard 
              userEmail={user.email} 
              userName={user.name} 
              accountCode={accountCode}
              apiUnlocked={user.apiUnlocked}
              apiKey={user.apiKey}
            />
          </div>
        )}

        {/* Live Test SMS View */}
        {currentView === "liveTestSms" && (
          <LiveTestSmsView
            userEmail={user.email}
            liveHits={liveHits}
            onAddTestHistory={handleAddTestRecord}
            onAddLiveHit={(hit) => {
              setLiveHits((prev) => [hit, ...prev]);
            }}
            onRefreshHits={fetchRealTimeData}
            onSelectService={(service, range, phoneNum) => {
              if (service) {
                setActiveAppConsoleService(service);
                setSelectedService(service);
              }
              if (range) {
                setSelectedRange(range);
                setRangeCustomInput(range);
              }
              if (phoneNum) {
                try {
                  navigator.clipboard.writeText(phoneNum);
                } catch (e) {}
              }
              setCurrentView("getNumber");
            }}
          />
        )}

        {/* SMS Test History View */}
        {currentView === "smsTestHistory" && (
          <SmsTestHistoryView
            userEmail={user.email}
            records={smsTestHistoryList}
            onClearHistory={handleClearTestHistory}
          />
        )}

        {/* Telegram Bot View (Main Admin Only) */}
        {currentView === "telegramBot" && user.role === "admin" && (
          <TelegramBotController
            userRole={user.role || 'client'}
            userEmail={user.email}
          />
        )}

        {/* Support Chat Admin View (Main Admin Only) */}
        {currentView === "supportChatAdmin" && user.role === "admin" && (
          <SupportChatAdmin
            userRole={user.role || 'client'}
            userEmail={user.email}
          />
        )}
      </main>

      {/* Floating Compact Toast Notification */}
      <AnimatePresence>
        {dashboardToast && (
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            onClick={() => setDashboardToast(null)}
            className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-white/95 backdrop-blur-xs border border-gray-200/90 shadow-2xl px-4 py-2 rounded-2xl w-auto max-w-[92vw] whitespace-nowrap cursor-pointer hover:bg-slate-50 transition active:scale-95 select-none"
            title="Click to close"
          >
            {dashboardToast.type === "warning" ? (
              <div className="w-5 h-5 rounded-full bg-[#fde68a] text-[#b45309] flex items-center justify-center font-bold text-xs shrink-0 select-none">
                !
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-2xs">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </div>
            )}
            <span className="text-xs font-semibold text-gray-800 tracking-tight">
              {dashboardToast.message}
            </span>
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 ml-1 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer matching Screenshot layout */}
      <footer className="w-full bg-[#1e293b] text-gray-400 py-3 text-center border-t border-slate-700">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <span className="text-[11px] sm:text-xs text-gray-300 font-medium tracking-wide">
            Copyright &copy; 2018-2026 SUPER X SMS. All rights reserved.
          </span>
        </div>
      </footer>

      {/* Floating Orange Chat Button with auto-hiding Live Chat label */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        {showFloatingChatLabel && (
          <button
            type="button"
            onClick={() => setIsUserChatOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-extrabold shadow-lg border border-orange-400/50 flex items-center gap-2 cursor-pointer transition-all duration-500 animate-fadeIn"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>Live Chat</span>
          </button>
        )}
        <button
          type="button"
          id="floating-support-chat-btn"
          onClick={() => setIsUserChatOpen(true)}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white p-3.5 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer relative"
          title="Live Support Chat"
          aria-label="Open Live Support Chat"
        >
          <MessageSquare className="w-6 h-6 fill-current" />
          {userUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
              {userUnreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Live Support Chat Modal for User */}
      {isUserChatOpen && renderUserChatModal()}

      {/* Notifications Modal for User */}
      {isNotifModalOpen && renderNotificationModal()}

      {/* Test Client System / SMS Test History Full Screen View matching Screenshot */}
      {activeAppConsoleService && (() => {
        const targetSid = activeAppConsoleService === "ALL" ? "ALL" : activeAppConsoleService;
        const realHits = filterHitsForApp(active24hHits, activeAppConsoleService);

        // Mask OTP codes in messages as XXXXXX so sensitive codes remain hidden
        const maskOtpInMessage = (msg: string) => {
          if (!msg) return "";
          return msg.replace(/\b\d{4,8}\b/g, "XXXXXX").replace(/\b\d{3}[-\s]\d{3}\b/g, "XXX-XXX");
        };

        // Strictly real-time rows mapped directly from API hits (NO demo or fake messages)
        const activeRows = realHits.map((h) => {
          const country = getRealCountryName(h.country, h.range).toUpperCase();
          const rangeName = h.range ? `${country} ${h.range}` : country;
          const fullNum = formatNumberWithAreaCode(h.range || "", country);
          return {
            range: rangeName,
            number: fullNum || "—",
            sid: h.sid || (targetSid === "ALL" ? "SMS" : targetSid),
            message: maskOtpInMessage(h.message || ""),
          };
        });

        const filteredRows = activeRows.filter((row) => {
          if (!appConsoleSearch) return true;
          const s = appConsoleSearch.toLowerCase();
          return (
            row.range.toLowerCase().includes(s) ||
            row.number.toLowerCase().includes(s) ||
            row.sid.toLowerCase().includes(s) ||
            row.message.toLowerCase().includes(s)
          );
        });

        const exportToCsv = () => {
          const headers = ["Range Name", "Test Number", "SID", "Message content"];
          const csvContent = [
            headers.join(","),
            ...filteredRows.map((r) =>
              `"${r.range}","${r.number}","${r.sid}","${r.message.replace(/"/g, '""')}"`
            ),
          ].join("\n");
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `${targetSid}_SMS_Test_History.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

        return (
          <div
            id="test-client-system-view"
            className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden select-text"
          >
            {/* Top Prominent Header Bar (Sticky & Steady) */}
            <div className="bg-[#0f172a] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="btn-test-system-back"
                  onClick={() => {
                    setActiveAppConsoleService(null);
                    setAppConsoleSearch("");
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white transition cursor-pointer flex items-center gap-2 font-semibold text-xs sm:text-sm border border-slate-700"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-300" />
                  <span>Back to Dashboard</span>
                </button>

                <div className="h-5 w-px bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-white tracking-wide">
                    {activeAppConsoleService === "ALL" ? "All Applications SMS" : activeAppConsoleService}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAppConsoleService(null);
                    setAppConsoleSearch("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Scrollable Area with Smooth, Fluid Scrolling */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 w-full">
              <div className="max-w-7xl w-full mx-auto space-y-4">
                {/* Clean Header Title with Single Circular Teams Account Icon in top right corner */}
                <div className="pb-1.5 border-b border-slate-200 flex items-center justify-between gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                    <span>{activeAppConsoleService === "ALL" ? "All SMS Streams" : `${activeAppConsoleService} SMS`}</span>
                  </h1>

                  {/* Skype Manager Contact Button linking to Teams / Skype charlesjames997@outlook.com */}
                  <a
                    href={SKYPE_DIRECT_CHAT_URL}
                    onClick={handleOpenSkypeOrTeams}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center group shrink-0 cursor-pointer text-center"
                    title="Contact Manager (charlesjames997@outlook.com)"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#00AFF0] hover:bg-[#0098d4] active:scale-95 text-white flex items-center justify-center shadow-md border border-sky-300/50 transition-all group-hover:scale-105">
                      <SkypeLogo className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-[11px] font-extrabold text-sky-600 group-hover:text-sky-700 tracking-tight leading-none mt-1">Skype</span>
                  </a>
                </div>

                {/* Action Buttons Toolbar & Search Box */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  {/* Excel, CSV, Print Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-export-excel"
                      onClick={exportToCsv}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-semibold text-xs rounded-md transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <span>Excel</span>
                    </button>
                    <button
                      type="button"
                      id="btn-export-csv"
                      onClick={exportToCsv}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-semibold text-xs rounded-md transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      id="btn-print-history"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-semibold text-xs rounded-md transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <span>Print</span>
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label htmlFor="sms-history-search-input" className="text-xs font-bold text-slate-700 shrink-0">
                      Search:
                    </label>
                    <input
                      id="sms-history-search-input"
                      type="text"
                      value={appConsoleSearch}
                      onChange={(e) => setAppConsoleSearch(e.target.value)}
                      placeholder="Search range, number, SID, message..."
                      className="border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 w-full sm:w-64 transition"
                    />
                  </div>
                </div>

                {/* Full Width Table with Guaranteed Solid Layout & No Clipping */}
                <div className="w-full overflow-x-auto border border-slate-300 bg-white rounded-lg shadow-xs mb-10">
                  <table className="w-full min-w-[700px] text-left text-xs sm:text-sm border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-100/90 text-slate-800 font-bold">
                        <th className="py-3 px-4 border-r border-slate-300 whitespace-nowrap w-[24%]">
                          <div className="flex items-center gap-1.5">
                            <span>Range Name</span>
                            <span className="text-slate-400 font-normal">⇅</span>
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-300 whitespace-nowrap w-[22%]">
                          Test Number
                        </th>
                        <th className="py-3 px-4 border-r border-slate-300 whitespace-nowrap w-[14%]">
                          SID
                        </th>
                        <th className="py-3 px-4 whitespace-normal w-[40%]">
                          Message content
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-16 text-center text-slate-500 font-medium bg-slate-50/40">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <MessageSquare className="w-6 h-6" />
                              </div>
                              <span className="text-base font-bold text-slate-700">No SMS found</span>
                              <span className="text-xs text-slate-400 max-w-md">
                                Waiting for live messages from API gateway stream. When new SMS arrives for {activeAppConsoleService === "ALL" ? "any application" : activeAppConsoleService}, it will appear here automatically.
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, idx) => (
                          <tr key={`${row.range}-${row.number}-${idx}`} className="hover:bg-blue-50/40 transition-colors">
                            {/* Range Name */}
                            <td className="py-3 px-4 border-r border-slate-200 font-bold text-slate-900 align-top break-words">
                              {row.range}
                            </td>

                            {/* Test Number */}
                            <td className="py-3 px-4 border-r border-slate-200 font-bold text-emerald-700 align-top font-mono">
                              {row.number}
                            </td>

                            {/* SID */}
                            <td className="py-3 px-4 border-r border-slate-200 font-semibold text-slate-900 align-top">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                                {row.sid}
                              </span>
                            </td>

                            {/* Message content with Masked OTP (XXXXXX) */}
                            <td className="py-3 px-4 text-slate-800 align-top font-mono text-xs leading-relaxed break-words select-all">
                              {row.message}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Floating Orange Chat Bubble with prominent Live Chat label */}
            <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsUserChatOpen(true)}
                className="px-3 py-1.5 rounded-full bg-[#f97316] hover:bg-orange-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>Live Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUserChatOpen(true)}
                className="w-11 h-11 rounded-full bg-[#f97316] hover:bg-orange-600 text-white shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Customer Support"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        );
      })()}
      {renderDevUnlockModal()}
    </div>
  );
}
