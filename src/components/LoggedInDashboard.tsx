import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { SmsCdrReportsView } from "./SmsCdrReportsView";
import { LiveTestSmsView, SmsTestRecord } from "./LiveTestSmsView";
import { SmsTestHistoryView } from "./SmsTestHistoryView";
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
} from "../services/voltxApi";
import {
  COUNTRY_OPERATOR_LIST,
  CountryOperatorItem,
} from "../data/countryOperators";
import {
  extractOtpCode,
  getTelegramConfig,
  sendOtpToTelegram,
} from "../services/telegramService";
import { getCountryInfo } from "../services/countryHelper";
import { fetchIntsCdrStats } from "../services/intsGatewayService";
import { getActiveApiKeys } from "../services/apiConfigService";
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
import { triggerAdminRoute } from "../App";
import {
  getChatMessagesForUser,
  sendUserMessage,
  markChatAsReadByUser,
  getUserUnreadChatCount,
  CHAT_UPDATE_EVENT,
  ChatMessage,
} from "../services/supportChatService";
import {
  getTopAppsConfig,
  TOP_APPS_UPDATE_EVENT,
  TopAppItem,
} from "../services/topAppsService";
import { getBrandLogoComponent } from "./BrandLogos";
import { CountryFlag } from "./CountryFlags";

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
  { id: "1937", countryCode: "MZ", country: "MOZAMBIQUE", range: "1937", service: "WhatsApp", operator: "Vodacom", baseHits: 148 },
  { id: "51", countryCode: "BA", country: "BOSNIA HERZEGOVINA", range: "51", service: "Facebook", operator: "BH Telecom", baseHits: 134 },
  { id: "35467", countryCode: "EG", country: "EGYPT", range: "35467", service: "TikTok", operator: "Vodafone EG", baseHits: 122 },
  { id: "5651", countryCode: "DZ", country: "ALGERIA", range: "5651", service: "WhatsApp", operator: "Djezzy", baseHits: 114 },
  { id: "14322", countryCode: "TZ", country: "TANZANIA", range: "14322", service: "IMO", operator: "Vodacom TZ", baseHits: 106 },
  { id: "14306", countryCode: "TZ", country: "TANZANIA", range: "14306", service: "Telegram", operator: "Airtel TZ", baseHits: 98 },
  { id: "8979", countryCode: "DZ", country: "ALGERIA", range: "8979", service: "Facebook", operator: "Mobilis", baseHits: 92 },
  { id: "14320", countryCode: "TZ", country: "TANZANIA", range: "14320", service: "WhatsApp", operator: "Tigo", baseHits: 88 },
  { id: "88017", countryCode: "BD", country: "BANGLADESH", range: "88017", service: "WhatsApp", operator: "Grameenphone", baseHits: 85 },
  { id: "91987", countryCode: "IN", country: "INDIA", range: "91987", service: "Telegram", operator: "Airtel India", baseHits: 81 },
  { id: "92300", countryCode: "PK", country: "PAKISTAN", range: "92300", service: "WhatsApp", operator: "Jazz", baseHits: 78 },
  { id: "15552", countryCode: "US", country: "UNITED STATES", range: "15552", service: "Microsoft", operator: "T-Mobile", baseHits: 74 },
  { id: "44740", countryCode: "GB", country: "UNITED KINGDOM", range: "44740", service: "Apple", operator: "EE UK", baseHits: 70 },
  { id: "23480", countryCode: "NG", country: "NIGERIA", range: "23480", service: "TikTok", operator: "MTN NG", baseHits: 67 },
  { id: "62812", countryCode: "ID", country: "INDONESIA", range: "62812", service: "IMO", operator: "Telkomsel", baseHits: 64 },
  { id: "23762", countryCode: "CM", country: "CAMEROON", range: "23762", service: "WhatsApp", operator: "Orange CM", baseHits: 60 },
  { id: "23275", countryCode: "SL", country: "SIERRA LEONE", range: "23275", service: "Facebook", operator: "Orange SL", baseHits: 56 },
  { id: "22501", countryCode: "CI", country: "IVORY COAST", range: "22501", service: "WhatsApp", operator: "Moov CI", baseHits: 52 },
  { id: "63917", countryCode: "PH", country: "PHILIPPINES", range: "63917", service: "Facebook", operator: "Globe PH", baseHits: 48 },
  { id: "25471", countryCode: "KE", country: "KENYA", range: "25471", service: "TikTok", operator: "Safaricom", baseHits: 44 },
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

export function getCountryFlagEmoji(countryName: string): string {
  if (!countryName) return "🌐";
  const norm = countryName.toLowerCase().trim();

  if (norm.includes("bangladesh")) return "🇧🇩";
  if (norm.includes("sierra leone")) return "🇸🇱";
  if (norm.includes("cameroon")) return "🇨🇲";
  if (norm.includes("ivory coast") || norm.includes("cote d'ivoire")) return "🇨🇮";
  if (norm.includes("united states") || norm.includes("usa") || norm.includes("us")) return "🇺🇸";
  if (norm.includes("united kingdom") || norm.includes("uk") || norm.includes("britain")) return "🇬🇧";
  if (norm.includes("indonesia")) return "🇮🇩";
  if (norm.includes("india")) return "🇮🇳";
  if (norm.includes("central african")) return "🇨🇫";
  if (norm.includes("madagascar")) return "🇲🇬";
  if (norm.includes("benin")) return "🇧🇯";
  if (norm.includes("togo")) return "🇹🇬";
  if (norm.includes("montenegro")) return "🇲🇪";
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
  if (norm.includes("afghanistan")) return "🇦🇫";
  if (norm.includes("albania")) return "🇦🇱";
  if (norm.includes("algeria")) return "🇩🇿";
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
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "Active Stream", defaultHits: 28 },
    { code: "23275XXX", operator: "Orange (Airtel)", country: "Sierra Leone", rate: "$0.18", status: "Active Gateway", defaultHits: 19 },
    { code: "23762XXX", operator: "Orange Cameroun", country: "Cameroon", rate: "$0.25", status: "Working Stream", defaultHits: 14 },
    { code: "62812XXX", operator: "Telkomsel", country: "Indonesia", rate: "$0.20", status: "High Demand", defaultHits: 32 },
    { code: "22501XXX", operator: "Moov", country: "Ivory Coast", rate: "$0.19", status: "Active Stream", defaultHits: 11 },
    { code: "15552XXX", operator: "T-Mobile", country: "United States", rate: "$0.35", status: "Ready", defaultHits: 8 },
  ],
  Telegram: [
    { code: "88018XXX", operator: "Robi", country: "Bangladesh", rate: "$0.22", status: "Active Stream", defaultHits: 35 },
    { code: "88019XXX", operator: "Banglalink", country: "Bangladesh", rate: "$0.22", status: "High Output", defaultHits: 24 },
    { code: "91981XXX", operator: "Airtel", country: "India", rate: "$0.15", status: "Active Gateway", defaultHits: 42 },
    { code: "92300XXX", operator: "Jazz / Telenor", country: "Pakistan", rate: "$0.18", status: "Working Stream", defaultHits: 16 },
    { code: "62852XXX", operator: "Telkomsel", country: "Indonesia", rate: "$0.20", status: "Active Stream", defaultHits: 21 },
    { code: "23480XXX", operator: "MTN Nigeria", country: "Nigeria", rate: "$0.26", status: "Ready", defaultHits: 12 },
  ],
  Facebook: [
    { code: "23762XXX", operator: "Orange Cameroun", country: "Cameroon", rate: "$0.25", status: "Active Stream", defaultHits: 22 },
    { code: "88017XXX", operator: "Grameenphone", country: "Bangladesh", rate: "$0.22", status: "Working Stream", defaultHits: 31 },
    { code: "23324XXX", operator: "MTN Ghana", country: "Ghana", rate: "$0.28", status: "Active Gateway", defaultHits: 15 },
    { code: "25471XXX", operator: "Safaricom", country: "Kenya", rate: "$0.30", status: "Ready Stream", defaultHits: 10 },
    { code: "63917XXX", operator: "Globe / Smart", country: "Philippines", rate: "$0.24", status: "High Demand", defaultHits: 27 },
    { code: "20100XXX", operator: "Vodafone", country: "Egypt", rate: "$0.20", status: "Active Stream", defaultHits: 18 },
  ],
  IMO: [
    { code: "62812XXX", operator: "Telkomsel", country: "Indonesia", rate: "$0.20", status: "Active Stream", defaultHits: 29 },
    { code: "88016XXX", operator: "Robi (Airtel)", country: "Bangladesh", rate: "$0.22", status: "Working Stream", defaultHits: 25 },
    { code: "91701XXX", operator: "Airtel", country: "India", rate: "$0.15", status: "High Output", defaultHits: 38 },
    { code: "97150XXX", operator: "Etisalat", country: "UAE", rate: "$0.40", status: "Active Gateway", defaultHits: 14 },
    { code: "96655XXX", operator: "STC", country: "Saudi Arabia", rate: "$0.38", status: "Ready Stream", defaultHits: 17 },
    { code: "60123XXX", operator: "Maxis / Celcom", country: "Malaysia", rate: "$0.25", status: "Active Stream", defaultHits: 13 },
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
    id: "91987",
    name: "India Airtel VIP",
    code: "91987XXX",
    country: "India",
    rate: "$0.15",
    cap: "99%",
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

export function LoggedInDashboard({ user, onLogout }: LoggedInDashboardProps) {
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
  >(() => {
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
          return realOnly;
        }
      }
    } catch {
      // ignore
    }
    return [];
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
    return () => {
      window.removeEventListener(
        "super_x_accounts_updated",
        handleAccountsUpdated,
      );
    };
  }, []);

  const pendingUsersCount = allUsersList.filter(
    (u) => u.status === "pending",
  ).length;

  useEffect(() => {
    try {
      localStorage.setItem("super_x_current_view", currentView);
    } catch {
      // ignore
    }
  }, [currentView]);
  const [accountCode, setAccountCode] = useState(() =>
    getDedicatedAccountCode(user.email, user.accountCode),
  );

  // Live Admin Permission Check for Super Admin & Sub-Admins created by Main Admin
  const [isAdminUser, setIsAdminUser] = useState<boolean>(() => {
    if (!user || !user.email) return false;
    const cleanEmail = user.email.toLowerCase();
    const isSuperAdmin =
      cleanEmail === "xzrmunna33@gmail.com" ||
      cleanEmail === "xzrmunna96@gmail.com" ||
      cleanEmail === "xzrmunna" ||
      user.role === "admin";
    if (isSuperAdmin) return true;
    const subAdmins = getAllSubAdmins();
    return subAdmins.some(
      (sa) => sa.email.toLowerCase() === cleanEmail && sa.status === "active"
    );
  });

  useEffect(() => {
    const checkAdminPermission = () => {
      if (!user || !user.email) {
        setIsAdminUser(false);
        return;
      }
      const cleanEmail = user.email.toLowerCase();
      const isSuperAdmin =
        cleanEmail === "xzrmunna33@gmail.com" ||
        cleanEmail === "xzrmunna96@gmail.com" ||
        cleanEmail === "xzrmunna" ||
        user.role === "admin";
      if (isSuperAdmin) {
        setIsAdminUser(true);
        return;
      }
      const subAdmins = getAllSubAdmins();
      const isSub = subAdmins.some(
        (sa) => sa.email.toLowerCase() === cleanEmail && sa.status === "active"
      );
      setIsAdminUser(isSub);
    };

    checkAdminPermission();

    window.addEventListener("super_x_sub_admins_updated", checkAdminPermission);
    window.addEventListener("super_x_accounts_updated", checkAdminPermission);
    window.addEventListener("storage", checkAdminPermission);

    return () => {
      window.removeEventListener("super_x_sub_admins_updated", checkAdminPermission);
      window.removeEventListener("super_x_accounts_updated", checkAdminPermission);
      window.removeEventListener("storage", checkAdminPermission);
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
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(user.name || "");
    setProfilePhone(user.phoneOrTelegram || "");
    setProfileNote(user.note || "");
  }, [user]);

  const handleSaveProfileInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveError(null);
    setProfileSaveSuccess(null);

    const res = updateUserProfileAndPassword({
      email: user.email,
      name: profileName,
      phoneOrTelegram: profilePhone,
      note: profileNote,
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

  // Live Real Data State with 24-Hour Persistence & Automatic Reset
  const [liveHits, setLiveHits] = useState<LiveConsoleHit[]>(() => {
    try {
      const saved = localStorage.getItem("super_x_live_console_hits_24h");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          // Keep only messages within the last 24 hours
          return parsed.filter((item: any) => {
            const t = typeof item.time === "number" ? item.time : (item.timestamp || new Date(item.time).getTime());
            return !isNaN(t) && t >= oneDayAgo;
          });
        }
      }
    } catch {}
    return [];
  });

  // Save live hits to localStorage with debouncing (prevents UI freeze/hang)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const validHits = liveHits.slice(0, 80).filter((item: any) => {
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
            localStorage.setItem("super_x_live_console_hits_24h", JSON.stringify(filtered.slice(0, 80)));
          } catch {}
          return filtered;
        }
        return prev;
      });
    }, 120000);

    return () => clearInterval(purgeInterval);
  }, []);
  const [liveAccessList, setLiveAccessList] = useState<LiveAccessService[]>([]);
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

  // Get Number Screen Specific State (voltxsms/m29 matching)
  const [getNumTab, setGetNumTab] = useState<"RANGE" | "SEARCH" | "ACCESS">(
    "RANGE",
  );
  const [rangeCustomInput, setRangeCustomInput] = useState("");
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
  // Helper to sanitize allocated history and prevent fake/duplicate OTPs across numbers
  const sanitizeAllocatedHistory = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    const otpCounts = new Map<string, number>();
    list.forEach((item) => {
      if (item && item.otp) {
        const code = String(item.otp).trim();
        otpCounts.set(code, (otpCounts.get(code) || 0) + 1);
      }
    });

    return list.map((item) => {
      if (!item) return item;
      const otp = item.otp ? String(item.otp).trim() : undefined;
      // If duplicate OTP (shared across multiple numbers) or known false OTPs, reset to PENDING
      const isDuplicateOrFalse =
        otp === "247-535" ||
        otp === "817-089" ||
        otp === "980-424" ||
        (otp && (otpCounts.get(otp) || 0) > 1);

      if (isDuplicateOrFalse) {
        return {
          ...item,
          status: "PENDING",
          otp: undefined,
          service: "Waiting for SMS...",
          activity: item.activity === "Delivered just now" ? "Waiting for SMS..." : item.activity,
        };
      }
      return item;
    });
  };

  // Dynamic User Role / Level calculation
  const currentUserDisplayRole: string = React.useMemo(() => {
    if (user.role === 'admin' || user.role === 'super_admin' || (user.role as string) === 'sub_admin' || isAdminUser) return 'Admin';
    try {
      const accounts = getAllAccounts();
      const match = accounts.find((a) => a.email.toLowerCase() === user.email.toLowerCase());
      if (match && (match.role === 'admin' || (match.role as string) === 'sub_admin')) return 'Admin';
      const subAdmins = getAllSubAdmins();
      const isSub = subAdmins.some((sa) => sa.email.toLowerCase() === user.email.toLowerCase());
      if (isSub) return 'Admin';
    } catch {}
    return 'Agent';
  }, [user, isAdminUser, allUsersList]);

  // Real-time Account Status & Privilege Monitor (revokes suspended/deleted users instantly)
  useEffect(() => {
    const monitorAccountState = () => {
      if (!user || !user.email) return;
      try {
        const cleanEmail = user.email.toLowerCase().trim();
        const deletedSet = getDeletedAccountEmails();
        if (deletedSet.has(cleanEmail)) {
          onLogout();
          return;
        }

        const accounts = getAllAccounts();
        const currentAcc = accounts.find(
          (a) => a.email.toLowerCase().trim() === cleanEmail
        );

        const subAdmins = getAllSubAdmins();
        const isSubAdmin = subAdmins.some((sa) => sa.email.toLowerCase().trim() === cleanEmail);

        // Check if explicitly suspended or rejected
        if (currentAcc) {
          if (currentAcc.status === 'suspended' || currentAcc.status === 'rejected') {
            onLogout();
            return;
          }
          if (currentAcc.role === 'admin' && user.role !== 'admin') {
            user.role = 'admin';
          }
        }

        if (isSubAdmin && user.role !== 'admin') {
          user.role = 'admin';
        }
      } catch {}
    };

    window.addEventListener('super_x_accounts_updated', monitorAccountState);
    window.addEventListener('super_x_sub_admins_updated', monitorAccountState);
    window.addEventListener('storage', monitorAccountState);
    const interval = setInterval(monitorAccountState, 2500);

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

  const [showAllTopApps, setShowAllTopApps] = useState(false);
  const [showAllTopRanges, setShowAllTopRanges] = useState(false);
  const [activeAppConsoleService, setActiveAppConsoleService] = useState<string | null>(null);

  // Dynamic Real-Time Top Ranges Hit Counter & Ranking linked directly to Console feed
  const [dynamicRangeHits, setDynamicRangeHits] = useState<Record<string, number>>({});

  // Sync real-time console hits to range counters whenever new SMS packet hits console
  useEffect(() => {
    if (!liveHits.length) return;
    const latestHit = liveHits[0];
    if (latestHit && (latestHit.range || latestHit.country)) {
      const cleanR = (latestHit.range || "").replace(/\D/g, "");
      // Extract prefix (up to 5 digits) or full match
      const prefix = cleanR.slice(0, 5);
      const matched = TOP_PORTAL_RANGES.find(
        (p) =>
          (cleanR && (cleanR.startsWith(p.range) || p.range.startsWith(cleanR))) ||
          (latestHit.country && latestHit.country.toUpperCase().includes(p.country.toUpperCase())),
      );
      const keyToBump = matched ? matched.range : (prefix || cleanR);
      if (keyToBump) {
        setDynamicRangeHits((prev) => ({
          ...prev,
          [keyToBump]: (prev[keyToBump] || 0) + 2,
        }));
      }
    }
  }, [liveHits]);

  // Compute live sorted top ranges strictly aggregated from real Console (liveHits) traffic
  const sortedTopRanges = React.useMemo(() => {
    if (!liveHits.length) {
      return [];
    }

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

      // Group by range or carrier prefix (first 4-6 digits)
      const rangeKey = cleanRange.length > 7 ? cleanRange.slice(0, 5) : cleanRange;

      if (rangeMap.has(rangeKey)) {
        const entry = rangeMap.get(rangeKey)!;
        entry.consoleHitCount += 1;
        if (hit.sid) {
          entry.service = hit.sid;
        }
      } else {
        rangeMap.set(rangeKey, {
          id: rangeKey,
          countryCode: hitCountry,
          country: hitCountry,
          range: rangeKey,
          service: hitService,
          operator: hitOperator,
          consoleHitCount: 1,
        });
      }
    });

    // Sort strictly descending by real received hit volume
    return Array.from(rangeMap.values())
      .map((item) => ({
        ...item,
        totalHits: item.consoleHitCount,
        recentHits: item.consoleHitCount,
      }))
      .sort((a, b) => b.totalHits - a.totalHits);
  }, [liveHits]);

  const [getNumHistory, setGetNumHistory] = useState<
    Array<{
      id: string;
      number: string;
      country: string;
      operator: string;
      status: "PENDING" | "SUCCESS";
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

  // Support Chat State for User
  const [isUserChatOpen, setIsUserChatOpen] = useState(false);
  const [userChatInput, setUserChatInput] = useState("");
  const [userChatMessages, setUserChatMessages] = useState<ChatMessage[]>(() =>
    getChatMessagesForUser(user.email),
  );
  const [userUnreadCount, setUserUnreadCount] = useState<number>(() =>
    getUserUnreadChatCount(user.email),
  );
  const userChatEndRef = useRef<HTMLDivElement | null>(null);

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
      setLiveHits([]); // Reset hits for clean streaming on newly configured key
    };
    window.addEventListener("voltx_key_updated", handleKeyUpdate);
    window.addEventListener("storage", handleKeyUpdate);
    return () => {
      window.removeEventListener("voltx_key_updated", handleKeyUpdate);
      window.removeEventListener("storage", handleKeyUpdate);
    };
  }, []);

  useEffect(() => {
    if (isUserChatOpen) {
      markChatAsReadByUser(user.email);
      setUserUnreadCount(0);
      setTimeout(() => {
        userChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isUserChatOpen, userChatMessages.length, user.email]);

  const handleSendUserMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userChatInput.trim()) return;
    sendUserMessage(user.email, user.name, userChatInput);
    setUserChatInput("");
    setUserChatMessages(getChatMessagesForUser(user.email));
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

  // Live tick state for real-time relative time counting (Just now, 1 min ago, 2 min ago...)
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 5000);
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
  ) => {
    setDashboardToast({ message: msg, type });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setDashboardToast(null);
    }, 4000);
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

  // Helper to mask OTP code in message with 'X' (e.g. 088309 -> XXXXXX)
  const maskOtpInMessage = (
    message: string,
    otpCode: string | null,
  ): string => {
    if (!message) return "";
    if (otpCode) {
      // Replace all numeric digits in the extracted OTP code with 'X'
      const masked = otpCode.replace(/\d/g, "X");
      return message.split(otpCode).join(masked);
    }
    // Fallback: replace any isolated 4 to 8 digit numbers in message with 'X'
    return message.replace(/\b\d{4,8}\b/g, (match) => "X".repeat(match.length));
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
      const cleanRange = (hit.range || "").trim();
      if (!cleanRange) return;
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
          latestMessage: isHitOwnedByUser(hit).isOwner
            ? hit.message
            : maskOtpInMessage(hit.message, extractOtp(hit.message)),
          latestTime: hit.time,
          hasActiveStream: true,
        });
      } else {
        const item = map.get(key)!;
        item.hitsCount += 1;
      }
    });

    // 2. Incorporate access list services
    liveAccessList.forEach((srv) => {
      (srv.ranges || []).forEach((r) => {
        const cleanRange = (r || "").trim();
        if (!cleanRange) return;
        const key = `${srv.sid}_${cleanRange}`;
        if (!map.has(key)) {
          const carrier = resolveCarrierDetails(cleanRange);
          map.set(key, {
            key,
            range: cleanRange,
            sid: srv.sid,
            operator: carrier.operator,
            country: carrier.country,
            hitsCount: 0,
            latestMessage: "Carrier range active and ready for incoming OTP",
            latestTime: srv.last_at ? srv.last_at * 1000 : Date.now(),
            hasActiveStream: false,
          });
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

  const filteredSenderRanges = senderRangeList.filter((item) => {
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
      const activeKeys = getActiveApiKeys();
      const targetKeys = activeKeys.length > 0 ? activeKeys : [apiKey];

      const consolePromises = targetKeys.map((k) =>
        fetchLiveConsoleDetailed(k).catch(() => ({ hits: [], code: 200, message: "OK", status: 200 }))
      );

      const [consoleResults, access, otps, sharedAccRes, intsRes] = await Promise.all([
        Promise.all(consolePromises),
        fetchLiveAccess(targetKeys[0] || apiKey),
        fetchSuccessOtps(targetKeys[0] || apiKey),
        user?.email
          ? fetch(`/api/account/numbers?email=${encodeURIComponent(user.email)}`)
              .then((r) => r.json())
              .catch(() => null)
          : Promise.resolve(null),
        fetchIntsCdrStats().catch(() => ({ success: false, hits: [] })),
      ]);

      const allConsoleHits = consoleResults.flatMap((r) => r.hits || []);
      const primaryRes = consoleResults[0] || { code: 200, message: "OK", status: 200 };

      setConsoleApiMeta({
        code: primaryRes.code,
        message: primaryRes.message,
        status: primaryRes.status != null ? String(primaryRes.status) : undefined,
      });

      const combinedHits = [...allConsoleHits, ...(intsRes?.hits || [])];

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

        setLiveHits((prev) => {
          if (prev.length === 0) return combinedHits.slice(0, 100);
          const existingKeys = new Set(
            prev.map((h) => `${h.range}_${h.time}_${h.sid}_${h.message}`),
          );
          const newEntries = combinedHits.filter(
            (h) =>
              !existingKeys.has(`${h.range}_${h.time}_${h.sid}_${h.message}`),
          );
          if (newEntries.length === 0) return prev;
          const merged = [...newEntries, ...prev];
          return merged.slice(0, 100);
        });
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
              const cleanRange = (hit.range || "").replace(/\D/g, "");
              const hitMsg = hit.message || "";

              // Do NOT match partial carrier ranges (e.g. 22901400 is an 8-digit carrier prefix, not the user's specific number)
              const isFullNumberMatch =
                cleanRange.length >= 10 &&
                (cleanNum === cleanRange ||
                  (cleanNum.endsWith(cleanRange) &&
                    Math.abs(cleanNum.length - cleanRange.length) <= 3));

              const isMessageMatch =
                cleanNum.length >= 9 && hitMsg.includes(cleanNum);

              if (!isFullNumberMatch && !isMessageMatch) return false;

              const hitTime =
                typeof hit.time === "number"
                  ? hit.time < 10000000000
                    ? hit.time * 1000
                    : hit.time
                  : hit.time
                    ? new Date(hit.time).getTime()
                    : Date.now();

              return !(entry.createdAt && hitTime < entry.createdAt - 5000);
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
          showDashboardToast(
            `🎉 আপনার নাম্বারে ওটিপি এসেছে: ${newlyDeliveredOtp}${newlyDeliveredNum ? ` (${newlyDeliveredNum})` : ""}`,
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
      fetchRealTimeData();
    }, 3000);
    return () => clearInterval(timer);
  }, [apiKey]);

  const handleManualRefreshConsole = async () => {
    setIsConsoleRefreshing(true);
    await fetchRealTimeData();
    setTimeout(() => setIsConsoleRefreshing(false), 400);
  };

  const handleNavClick = (view: typeof currentView) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
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
      showDashboardToast(`Copied OTP: ${text}`, "success");
    } else if (id.startsWith("msg_")) {
      showDashboardToast("Copied message text", "success");
    } else if (id.startsWith("range_")) {
      showDashboardToast(`Copied Range: ${text}`, "success");
    } else {
      showDashboardToast(
        `Copied (Without Area Code): ${textToCopy}`,
        "success",
      );
    }
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Get Number Custom Allocation matching voltxsms / m29 UI with RANGE validation
  const handleGetNumberCustom = async (
    customRangePrefix?: string,
    countryOverride?: string,
    operatorOverride?: string,
  ) => {
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
      showDashboardToast("Please enter a number range", "warning");
      return;
    }

    setRangeInputError(false);
    setIsAllocating(true);

    try {
      const prefix = cleanDigits.slice(0, 6) || "88017";
      const matchedRange = POPULAR_RANGES.find(
        (r) => r.id === prefix || r.code.includes(prefix),
      );
      const fallbackCountry =
        countryOverride ||
        selectedCountryOperator?.country ||
        matchedRange?.country ||
        (prefix.startsWith("880")
          ? "Bangladesh"
          : prefix.startsWith("44")
            ? "United Kingdom"
            : prefix.startsWith("225")
              ? "Ivory Coast"
              : prefix.startsWith("232")
                ? "Sierra Leone"
                : prefix.startsWith("93")
                  ? "Afghanistan"
                  : "International");
      const fallbackOperator =
        operatorOverride ||
        selectedCountryOperator?.operator ||
        matchedRange?.name ||
        (prefix.startsWith("880")
          ? "Grameenphone"
          : prefix.startsWith("44")
            ? "EE Physical"
            : prefix.startsWith("232")
              ? "Orange (Airtel)"
              : prefix.startsWith("93")
                ? "Mobile"
                : "Carrier Route");

      const res = await allocateRealNumberDetailed(
        rangeToUse || prefix,
        apiKey,
        activeAppConsoleService || undefined
      );
      if (!res.success || !res.data?.full_number) {
        showDashboardToast(
          res.message || "এই রেঞ্জে কোনো নাম্বার পাওয়া যায়নি। অন্য রেঞ্জ চেষ্টা করুন।",
          "warning",
        );
        return;
      }

      const targetCountry = countryOverride || res.data.country || fallbackCountry;
      let generatedNum = formatNumberWithAreaCode(res.data.full_number || "", targetCountry);
      if (nationalFormat && res.data.national_number) {
        generatedNum = res.data.national_number;
      } else if (removePlus && res.data.no_plus_number) {
        generatedNum = res.data.no_plus_number;
      } else if (removePlus) {
        generatedNum = generatedNum.replace(/^\+/, "");
      }
      generatedNum = formatNumberWithAreaCode(generatedNum, targetCountry);

      // Strip area code for clipboard copy
      const copiedWithoutAreaCode = stripAreaCode(generatedNum, targetCountry);

      // 2. Real-time instant auto copy to clipboard (fire & forget for ultra performance)
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(copiedWithoutAreaCode).catch(() => {});
      }

      showDashboardToast(`Copied ${copiedWithoutAreaCode} (No Area Code)`, "success");

      const newId = `gn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const nowMs = Date.now();
      const newEntry = {
        id: newId,
        number: generatedNum,
        country: countryOverride || res.data.country || fallbackCountry,
        operator: operatorOverride || res.data.operator || fallbackOperator,
        status: "PENDING" as const,
        otp: undefined as string | undefined,
        service: "Waiting for SMS...",
        activity: "Just now",
        createdAt: nowMs,
      };

      setGetNumHistory((prev) => [newEntry, ...prev]);

      // Broadcast new allocated number to server so all 4-5 teammates on this email see it immediately
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
        err?.message || "সার্ভার এপিআই এর সাথে যোগাযোগ করা যায়নি।",
        "warning",
      );
    } finally {
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

  const renderUserChatModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-lg h-[85vh] max-h-[640px] shadow-2xl flex flex-col overflow-hidden text-white animate-scaleUp">
        {/* Chat Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-indigo-500/20 border border-indigo-400/30">
              <MessageSquare className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Live Support Chat
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[11px] text-indigo-200">
                Admin Support &amp; Helpdesk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUserChatOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60">
          {userChatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-indigo-400/50" />
              <p className="text-xs font-medium">No previous messages.</p>
              <p className="text-[11px] text-slate-500">
                Type your question below to start chatting directly with Admin!
              </p>
            </div>
          ) : (
            userChatMessages.map((msg) => {
              const isMe = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-br-none shadow-md"
                        : "bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none"
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-300/80 mb-0.5">
                      {isMe ? "You" : "Admin"}
                    </div>
                    <div>{msg.text}</div>
                    <div className="text-[9px] text-slate-300/60 text-right mt-1 font-mono">
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
            onChange={(e) => setUserChatInput(e.target.value)}
            placeholder="Type your message to Admin..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            type="submit"
            disabled={!userChatInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition cursor-pointer text-xs shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );

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
            Close / বন্ধ করুন
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
              Account Suspended / স্থগিত করা হয়েছে
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SUPER X SMS ACCESS BLOCKED
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-medium pt-1">
              আপনার সুপার এক্স এসএমএস (SUPER X SMS) অ্যাকাউন্টটি অ্যাডমিন কর্তৃক{" "}
              <strong className="text-rose-400">স্থগিত (SUSPENDED)</strong> করা
              হয়েছে। পুনরায় সার্ভিসটি ব্যবহার করতে অথবা সমস্যার সমাধানের জন্য
              অ্যাডমিনের সাথে সরাসরি কথা বলুন।
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
                💬 অ্যাডমিনের সাথে লাইভ চ্যাট করুন (Live Chat Support)
              </span>
            </button>

            <a
              href="https://t.me/xzrmunna"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 text-xs border border-slate-700"
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
              <span>লগ আউট করুন (Log Out)</span>
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
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
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
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide truncate">
                {user.name || "SAMI"}
              </h3>
              <p className="text-xs text-slate-400 font-normal mt-0.5 flex items-center gap-1.5">
                <span>Level:</span>
                <span className={`font-medium px-1.5 py-0.2 rounded border text-[11px] ${
                  currentUserDisplayRole === 'Admin'
                    ? 'text-amber-300 bg-amber-950/60 border-amber-500/40 font-bold'
                    : currentUserDisplayRole === 'Sub-Admin'
                    ? 'text-indigo-300 bg-indigo-950/60 border-indigo-500/40 font-bold'
                    : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20'
                }`}>
                  {currentUserDisplayRole}
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
              onClick={handleReloadAccount}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 px-2 py-1 rounded border border-slate-700/50 text-[11px] transition cursor-pointer active:scale-95"
              title="Reload Account Code"
            >
              <RotateCw
                className={`w-3 h-3 text-slate-400 ${isReloading ? "animate-spin text-emerald-400" : ""}`}
              />
              <span className="font-medium">Reload</span>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-3 space-y-1">
            {/* Dashboard */}
            <button
              type="button"
              id="sidebar-item-dashboard"
              onClick={() => handleNavClick("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                currentView === "dashboard"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Home className="w-4.5 h-4.5 shrink-0 opacity-90" />
              <span>Dashboard</span>
            </button>

            {userPerms.canGetNumber && (
              <button
                type="button"
                id="sidebar-item-get-number"
                onClick={() => handleNavClick("getNumber")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                  currentView === "getNumber"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                    currentView === "smsRange"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                    currentView === "smsNumber"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                  currentView === "accessList"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                  currentView === "senderRange"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
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

            {/* Profile Navigation Item */}
            <button
              type="button"
              id="sidebar-item-profile"
              onClick={() => handleNavClick("profile")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                currentView === "profile"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
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
            {/* Top Applications Access with Modern Slate & Blue Gradient Header */}
            <section
              id="top-applications-section"
              className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-4 sm:px-5 py-3.5 text-white flex items-center justify-between border-b border-indigo-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="font-bold text-sm sm:text-base tracking-wide text-white">
                    Top Applications Access
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-indigo-200 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 rounded-full font-bold">
                    Instant Allocate
                  </span>
                </div>
              </div>

              {/* 2-Column Checkerboard Chessboard Grid of Apps with Grid Borders */}
              <div
                id="top-apps-scrollable-container"
                className="max-h-[520px] sm:max-h-[580px] overflow-y-auto overscroll-contain bg-slate-200/80 p-0.5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
              >
                <div className="grid grid-cols-2 gap-0 border border-slate-300/80 rounded-lg overflow-hidden bg-slate-200">
                  {topAppsList
                    .filter((app) => app.isEnabled !== false)
                    .map((app, index) => {
                      const appSearchName = app.name.toLowerCase();
                      const realHitsForApp = liveHits.filter((h) => {
                        const sid = (h.sid || "").toLowerCase();
                        const msg = (h.message || "").toLowerCase();
                        if (sid.includes(appSearchName) || appSearchName.includes(sid)) return true;
                        if (appSearchName === "whatsapp" && (msg.includes("whatsapp") || sid.includes("wa"))) return true;
                        if (appSearchName === "facebook" && (msg.includes("facebook") || sid.includes("fb"))) return true;
                        if (appSearchName === "telegram" && (msg.includes("telegram") || sid.includes("tg"))) return true;
                        if (appSearchName === "tiktok" && msg.includes("tiktok")) return true;
                        if (appSearchName === "imo" && (msg.includes("imo") || sid.includes("imo"))) return true;
                        if (appSearchName === "verify" && (msg.includes("verify") || msg.includes("verification") || sid.includes("verify"))) return true;
                        if (appSearchName === "msverify" && (sid.includes("msverify") || msg.includes("msverify"))) return true;
                        if (appSearchName === "authmsg" && (sid.includes("authmsg") || msg.includes("authmsg"))) return true;
                        if (appSearchName === "iatsms" && (sid.includes("iat") || msg.includes("iatsms"))) return true;
                        if (appSearchName === "amazon" && (msg.includes("amazon") || sid.includes("amazon"))) return true;
                        if (appSearchName === "shopee" && (msg.includes("shopee") || sid.includes("shopee"))) return true;
                        if (appSearchName === "avabet" && (msg.includes("avabet") || sid.includes("ava"))) return true;
                        if (appSearchName === "paypal" && (msg.includes("paypal") || sid.includes("paypal"))) return true;
                        if (appSearchName === "linkedin" && (msg.includes("linkedin") || sid.includes("linkedin"))) return true;
                        if (appSearchName === "melbet" && (msg.includes("melbet") || sid.includes("melbet"))) return true;
                        if (appSearchName === "bolt" && (msg.includes("bolt") || sid.includes("bolt"))) return true;
                        if (appSearchName === "uber" && (msg.includes("uber") || sid.includes("uber"))) return true;
                        if (appSearchName === "apple" && (msg.includes("apple") || sid.includes("apple"))) return true;
                        if (appSearchName === "microsoft" && (msg.includes("microsoft") || sid.includes("msft"))) return true;
                        if (appSearchName === "google" && (msg.includes("google") || msg.includes("g-") || sid.includes("google") || sid.includes("gsuite"))) return true;
                        if (appSearchName === "instagram" && (msg.includes("instagram") || sid.includes("instagram") || sid.includes("insta"))) return true;
                        if (appSearchName.includes("twitter") && (msg.includes("twitter") || msg.includes("x.com") || sid.includes("twitter") || sid.includes("x.com"))) return true;
                        if (msg.includes(appSearchName)) return true;
                        return false;
                      });
                      const realCount = realHitsForApp.length;

                      const row = Math.floor(index / 2);
                      const col = index % 2;
                      const isCheckerDark = (row + col) % 2 === 1;

                      return (
                        <div
                          key={app.id}
                          id={`top-app-${app.id}`}
                          onClick={() => {
                            setActiveAppConsoleService(app.name);
                          }}
                          className={`p-3.5 sm:p-4.5 flex flex-col items-center justify-center text-center transition cursor-pointer group relative select-none border-r border-b border-slate-300/80 ${
                            isCheckerDark
                              ? "bg-slate-100/90 hover:bg-indigo-100/70"
                              : "bg-white hover:bg-indigo-50/70"
                          }`}
                        >
                          <div className="w-9 h-9 sm:w-10 sm:h-10 mb-1.5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {getBrandLogoComponent(
                              app.id,
                              "w-9 h-9 sm:w-10 sm:h-10",
                            )}
                          </div>
                          <h4 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                            {app.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-normal mt-0.5">
                            {realCount > 0
                              ? `${realCount.toLocaleString()} message`
                              : "0 message"}
                          </span>
                          <span
                            className={`mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                              realCount > 0
                                ? "text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white"
                                : "text-slate-400 bg-slate-100"
                            }`}
                          >
                            {realCount > 0 ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live Feed
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                No Feed
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                </div>
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
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 sm:w-11 h-6 sm:h-7 shrink-0 flex items-center justify-center">
                            <CountryFlag
                              countryCode={item.countryCode || item.country}
                              className="w-10 sm:w-11 h-6 sm:h-7 rounded-sm shadow-xs border border-slate-200 object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wide group-hover:text-blue-600 transition-colors truncate">
                                {item.country} {item.range}
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

                        {/* Right: Active Service Badge + Realtime Hits */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

                {/* Segmented Buttons & Sync Mode switch */}
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
                            setRangeCustomInput(e.target.value);
                            if (rangeInputError) setRangeInputError(false);
                          }}
                          placeholder="e.g., 88017XXX (type the trailing X's you want)"
                          className={`w-full pl-8 pr-4 py-3.5 bg-white border rounded-2xl text-gray-900 font-mono text-xs sm:text-sm focus:outline-none placeholder-gray-400 tracking-wide transition shadow-2xs ${
                            rangeInputError
                              ? "border-red-400 ring-2 ring-red-400/30 bg-red-50/20 animate-pulse"
                              : "border-[#34d399] focus:ring-2 focus:ring-[#34d399]/20 focus:border-[#10b981]"
                          }`}
                        />
                        {rangeCustomInput && (
                          <button
                            type="button"
                            onClick={() => setRangeCustomInput("")}
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
                        className="min-w-[145px] bg-[#10b981] hover:bg-[#059669] text-white font-black px-6 py-2.5 rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Phone
                          className={`w-3.5 h-3.5 text-white ${isAllocating ? "animate-spin" : ""}`}
                        />
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
                        className="min-w-[145px] bg-[#10b981] hover:bg-[#059669] text-white font-black px-6 py-2.5 rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Phone
                          className={`w-3.5 h-3.5 text-white ${isAllocating ? "animate-spin" : ""}`}
                        />
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
                          range: "22501",
                          country: "Ivory Coast (Orange)",
                          rate: "99.4%",
                          status: "Online",
                          desc: "Instant WhatsApp registration codes with zero block rate",
                        },
                        {
                          name: "Telegram Ultra",
                          range: "88017",
                          country: "Bangladesh (Grameenphone)",
                          rate: "98.8%",
                          status: "Online",
                          desc: "Direct Telegram SMS carrier line for instant account creation",
                        },
                        {
                          name: "IMO Messenger",
                          range: "62812",
                          country: "Indonesia (Telkomsel)",
                          rate: "97.5%",
                          status: "Online",
                          desc: "Physical SIM routing for IMO phone verification",
                        },
                        {
                          name: "Meta Facebook",
                          range: "44740",
                          country: "United Kingdom (EE Physical)",
                          rate: "99.1%",
                          status: "Online",
                          desc: "Official EE Carrier UK numbers for Facebook / Instagram verification",
                        },
                        {
                          name: "Google / Gmail",
                          range: "91987",
                          country: "India (Airtel VIP)",
                          rate: "96.8%",
                          status: "Online",
                          desc: "High-speed Airtel physical routes for Google Workspace / Gmail",
                        },
                        {
                          name: "TikTok / ByteDance",
                          range: "23276",
                          country: "Sierra Leone (Orange)",
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
                {/* Table Header with Stats and Refresh */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 text-white">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-mono font-medium text-slate-300">
                      {getNumHistory.length > 0
                        ? `1-${getNumHistory.length} of ${getNumHistory.length}`
                        : "0 of 0"}
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 font-mono font-bold border border-emerald-600/50 hidden sm:inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Real-time Carrier Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleManualRefreshConsole()}
                      disabled={isConsoleRefreshing}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition active:scale-95 disabled:opacity-50"
                    >
                      <RotateCw
                        className={`w-3.5 h-3.5 text-slate-300 ${isConsoleRefreshing ? "animate-spin text-emerald-400" : ""}`}
                      />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Table Column Labels */}
                <div className="grid grid-cols-12 px-4 py-3 text-[11px] font-extrabold text-slate-200 uppercase tracking-wider bg-slate-800 border-b-2 border-slate-700">
                  <div className="col-span-5 sm:col-span-4 border-r border-slate-700 pr-2">NUMBER INFO</div>
                  <div className="col-span-4 sm:col-span-5 border-r border-slate-700 px-2">
                    COUNTRY / OPERATOR
                  </div>
                  <div className="col-span-3 text-right pl-2">ACTIVITY</div>
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
                      <strong className="text-gray-700 font-mono">44740</strong>
                      ,{" "}
                      <strong className="text-gray-700 font-mono">23275</strong>
                      ) above and click{" "}
                      <strong className="text-emerald-700">Get Number</strong>{" "}
                      to allocate numbers automatically.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-300 bg-white border border-slate-300">
                    {getNumHistory.map((item, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-12 px-4 py-4 items-center text-xs transition gap-2 border-b border-slate-300 ${
                          isEven ? "bg-white hover:bg-emerald-50/50" : "bg-slate-100/90 hover:bg-emerald-100/50"
                        }`}
                      >
                        {/* NUMBER INFO */}
                        <div className="col-span-5 sm:col-span-4 space-y-1 border-r border-slate-300 pr-2 h-full flex flex-col justify-center">
                          <div className="font-mono text-gray-900 font-black tracking-wide text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{formatNumberWithAreaCode(item.number, item.country)}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.number, `num_${item.id}`, item.country)}
                              className="p-1 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-900 transition cursor-pointer border border-slate-300 flex items-center gap-1"
                              title="Copy number (without area code)"
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
                          ) : (
                            <div>
                              <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] uppercase tracking-wider">
                                PENDING
                              </span>
                            </div>
                          )}
                        </div>

                        {/* COUNTRY / OPERATOR */}
                        <div className="col-span-4 sm:col-span-5 space-y-0.5 border-r border-slate-300 px-2 h-full flex flex-col justify-center">
                          <div className="text-gray-900 font-bold text-xs sm:text-sm">
                            {item.country}
                          </div>
                          <div className="text-gray-600 text-[11px] sm:text-xs flex items-center gap-1">
                            <Radio className="w-3 h-3 text-gray-600 shrink-0" />
                            <span className="truncate">{item.operator}</span>
                          </div>
                        </div>

                        {/* ACTIVITY */}
                        <div className="col-span-3 text-right space-y-1 pl-2 h-full flex flex-col justify-center items-end">
                          <span className="inline-block text-[11px] text-gray-700 font-mono bg-slate-200/80 px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs">
                            {formatRelativeActivityTime(item, nowTick)}
                          </span>
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
                  (api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/console)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LIVE STREAM CONNECTED</span>
                </span>
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
              const filteredHits = liveHits.filter((hit) => {
                if (!consoleFilter.trim()) return true;
                const q = consoleFilter.toLowerCase();
                return (
                  hit.sid?.toLowerCase().includes(q) ||
                  hit.operator?.toLowerCase().includes(q) ||
                  hit.country?.toLowerCase().includes(q) ||
                  hit.range?.toLowerCase().includes(q) ||
                  hit.message?.toLowerCase().includes(q)
                );
              });

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

                    // Mask OTP in message if not owned by this user
                    const displayedMessage = isOwner
                      ? log.message
                      : maskOtpInMessage(log.message, extractedOtpCode);

                    // Masked OTP digits representation: e.g. 088309 -> XXXXXX
                    const maskedOtpCode = extractedOtpCode
                      ? extractedOtpCode.replace(/\d/g, "X")
                      : "XXXXXX";

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border border-l-[4px] p-4 sm:p-5 shadow-2xs space-y-2.5 transition ${
                          isOwner
                            ? "bg-emerald-50/20 border-emerald-300 border-l-emerald-600 ring-1 ring-emerald-500/20 hover:shadow-xs"
                            : "bg-white border-gray-200/90 border-l-gray-400 hover:shadow-xs"
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
                                <span>আপনার নাম্বার (Your Number)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-medium px-2 py-0.5 rounded border border-gray-200">
                                <Lock className="w-2.5 h-2.5 text-gray-400" />
                                <span>সুরক্ষিত (Protected)</span>
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

                        {/* Optional Quick Action Bar for convenience */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                          {extractedOtpCode &&
                            (isOwner ? (
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    extractedOtpCode,
                                    `otp_${idx}`,
                                  )
                                }
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Copy your verified OTP"
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
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  showDashboardToast(
                                    '🔒 সুরক্ষিত ওটিপি: শুধুমাত্র যে ব্যক্তি "Get Number" থেকে এই নাম্বারটি নিয়েছেন তিনি এই ওটিপি দেখতে পারবেন।',
                                    "info",
                                  )
                                }
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 font-mono transition cursor-pointer flex items-center gap-1 select-none"
                                title="Protected OTP Code"
                              >
                                <Lock className="w-3 h-3 text-gray-500" />
                                <span>🔒 OTP: {maskedOtpCode}</span>
                              </button>
                            ))}
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
            <div className="border-b pb-3 border-slate-200">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <List className="w-5 h-5 text-blue-600" />
                <span>Access List</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active services and supported range pools.
              </p>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 font-extrabold uppercase text-slate-200 border-b-2 border-slate-700 text-[11px]">
                    <th className="p-3 border-r border-slate-700">Service Name</th>
                    <th className="p-3 border-r border-slate-700">Active Ranges</th>
                    <th className="p-3">Last Active Hit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {liveAccessList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-8 text-center text-slate-500 font-sans text-xs bg-slate-50"
                      >
                        No active service access rules found. Access list is
                        currently empty.
                      </td>
                    </tr>
                  ) : (
                    liveAccessList.map((item, i) => {
                      const isEven = i % 2 === 0;
                      return (
                      <tr key={i} className={`transition ${isEven ? 'bg-white hover:bg-indigo-50/50' : 'bg-slate-100/90 hover:bg-indigo-100/50'}`}>
                        <td className="p-3 font-bold text-blue-700 border-r border-b border-slate-300">
                          {item.sid}
                        </td>
                        <td className="p-3 font-mono text-slate-900 font-bold border-r border-b border-slate-300">
                          {item.ranges?.join(", ") || "N/A"}
                        </td>
                        <td className="p-3 text-slate-600 font-mono border-b border-slate-300">
                          {item.last_at
                            ? new Date(item.last_at).toLocaleTimeString()
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
                      <th className="py-3 px-4 border-r border-slate-700">Sender / Service</th>
                      <th className="py-3 px-4 border-r border-slate-700">Range Prefix</th>
                      <th className="py-3 px-4 border-r border-slate-700">Operator &amp; Country</th>
                      <th className="py-3 px-4 text-center border-r border-slate-700">Stream Hits</th>
                      <th className="py-3 px-4 border-r border-slate-700">Latest Message</th>
                      <th className="py-3 px-4 text-right">Direct Action</th>
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
                        const isOwner = isHitOwnedByUser({
                          range: item.range,
                        }).isOwner;
                        const displayedLatestMessage = isOwner
                          ? item.latestMessage
                          : maskOtpInMessage(item.latestMessage, extractedOtp);
                        const displayedOtp = isOwner
                          ? extractedOtp
                          : extractedOtp
                            ? extractedOtp.replace(/\d/g, "X")
                            : "XXXXXX";
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
                            {/* Service */}
                            <td className="py-3.5 px-4 border-r border-b border-slate-300">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${style.badge}`}
                              >
                                <span>{item.sid}</span>
                              </span>
                            </td>

                            {/* Range */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs sm:text-sm border-r border-b border-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span>{item.range}</span>
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

                            {/* Operator & Country */}
                            <td className="py-3.5 px-4 border-r border-b border-slate-300">
                              <div className="font-bold text-slate-900">
                                {item.operator}
                              </div>
                              <div className="text-[11px] text-slate-600">
                                {item.country}
                              </div>
                            </td>

                            {/* Stream Hits */}
                            <td className="py-3.5 px-4 text-center border-r border-b border-slate-300">
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
                            </td>

                            {/* Latest Message */}
                            <td className="py-3.5 px-4 max-w-xs border-r border-b border-slate-300">
                              <div className="truncate font-mono text-slate-800 text-[11px]">
                                {displayedLatestMessage}
                              </div>
                              {extractedOtp && (
                                <span
                                  className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                    isOwner
                                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                      : "bg-slate-200 text-slate-600 border border-slate-300"
                                  }`}
                                >
                                  {isOwner
                                    ? `🔑 OTP: ${displayedOtp}`
                                    : `🔒 OTP: ${displayedOtp}`}
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-4 text-right border-b border-slate-300">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAllocateFromSenderRange(item.range)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
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
                    const displayedMessage = isOwner
                      ? hit.message
                      : maskOtpInMessage(hit.message, otpCode);
                    const maskedOtp = otpCode
                      ? otpCode.replace(/\d/g, "X")
                      : "XXXXXX";

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
                          {otpCode &&
                            (isOwner ? (
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(otpCode, `sender_otp_${idx}`)
                                }
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-mono transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Copy your verified OTP"
                              >
                                <Key className="w-3 h-3 text-emerald-600" />
                                {copiedText === `sender_otp_${idx}`
                                  ? "Copied!"
                                  : `OTP: ${otpCode}`}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  showDashboardToast(
                                    '🔒 সুরক্ষিত ওটিপি: শুধুমাত্র যে ব্যক্তি "Get Number" থেকে এই নাম্বারটি নিয়েছেন তিনি এই ওটিপি দেখতে পারবেন।',
                                    "info",
                                  )
                                }
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 font-mono transition cursor-pointer flex items-center gap-1 select-none"
                                title="Protected OTP Code"
                              >
                                <Lock className="w-3 h-3 text-gray-500" />
                                <span>OTP: {maskedOtp}</span>
                              </button>
                            ))}
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
                  const displayedMsg = isOwner
                    ? h.message
                    : maskOtpInMessage(h.message, extractOtp(h.message));
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
                            : "text-gray-400"
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

        {/* -------------------- SMS RANGE VIEW (COMING SOON) -------------------- */}
        {currentView === "smsRange" && (
          <div className="w-full min-h-[70vh] flex items-center justify-center py-6 px-4 animate-fadeIn">
            <div className="w-full max-w-2xl relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border border-amber-500/30 p-8 sm:p-14 text-center text-white shadow-2xl flex flex-col items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-amber-300/10 border border-amber-400/30 shadow-inner mb-6 relative">
                <Radio className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-300 uppercase mb-2">
                SMS Range
              </h1>
              
              <div className="text-4xl sm:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-indigo-300 py-3 drop-shadow-md">
                COMING SOON
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => handleNavClick("dashboard")}
                  className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-2xl text-sm sm:text-base shadow-xl shadow-amber-500/20 transition active:scale-95 cursor-pointer flex items-center gap-2.5"
                >
                  <Home className="w-5 h-5" />
                  <span>Home to Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- SMS NUMBER VIEW (COMING SOON) -------------------- */}
        {currentView === "smsNumber" && (
          <div className="w-full min-h-[70vh] flex items-center justify-center py-6 px-4 animate-fadeIn">
            <div className="w-full max-w-2xl relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950 border border-purple-500/30 p-8 sm:p-14 text-center text-white shadow-2xl flex flex-col items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-purple-500/20 to-amber-300/10 border border-purple-400/30 shadow-inner mb-6 relative">
                <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-300 uppercase mb-2">
                SMS Number
              </h1>

              <div className="text-4xl sm:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-amber-200 to-indigo-300 py-3 drop-shadow-md">
                COMING SOON
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => handleNavClick("dashboard")}
                  className="px-8 py-3.5 bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black rounded-2xl text-sm sm:text-base shadow-xl shadow-purple-500/20 transition active:scale-95 cursor-pointer flex items-center gap-2.5"
                >
                  <Home className="w-5 h-5" />
                  <span>Home to Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- 7. PROFILE VIEW -------------------- */}
        {currentView === "profile" && (
          <div className="space-y-6">
            {/* Header Title Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 shrink-0">
                  {(profileName || user.name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {profileName || user.name || "Agent User"}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      currentUserDisplayRole === 'Admin'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        : currentUserDisplayRole === 'Sub-Admin'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    }`}>
                      {currentUserDisplayRole}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2">
                    <span>Email: {user.email}</span>
                    <span className="text-slate-500">•</span>
                    <span>Code: <strong className="text-amber-400">{accountCode}</strong></span>
                  </p>
                </div>
              </div>
            </div>

            {/* Toast Alerts for Profile Actions */}
            {profileSaveSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{profileSaveSuccess}</span>
              </div>
            )}
            {profileSaveError && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{profileSaveError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Details Form Card */}
              <div className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <User className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Submitted Profile & Registration Info
                  </h3>
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Account Note / Registration Form Details:
                    </label>
                    <input
                      type="text"
                      value={profileNote}
                      onChange={(e) => setProfileNote(e.target.value)}
                      placeholder="Form submission details or note"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save & Sync Profile</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Security & Change Password Card */}
              <div className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Key className="w-5 h-5 text-blue-400" />
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-400 transition"
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-400 transition"
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
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
            onSelectService={(service, range) => {
              setActiveAppConsoleService(service);
              setSelectedService(service);
              if (range) {
                setSelectedRange(range);
              }
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
      </main>

      {/* Floating Compact Toast Notification matching User Red Box Area */}
      {dashboardToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-white border border-gray-200/90 shadow-xl px-4 py-2.5 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 w-auto max-w-sm whitespace-nowrap">
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
        </div>
      )}

      {/* Footer matching Screenshot layout */}
      <footer className="w-full bg-[#1e293b] text-gray-400 py-3 text-center border-t border-slate-700">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <span className="text-[11px] sm:text-xs text-gray-300 font-medium tracking-wide">
            Copyright &copy; 2018-2026 SUPER X SMS. All rights reserved.
          </span>
        </div>
      </footer>

      {/* Floating Orange Chat Button matching Screenshot bottom right */}
      <button
        type="button"
        id="floating-support-chat-btn"
        onClick={() => setIsUserChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#f97316] hover:bg-[#ea580c] text-white p-3.5 rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        title="Live Support Chat"
        aria-label="Open Live Support Chat"
      >
        <MessageSquare className="w-6 h-6" />
        {userUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
            {userUnreadCount}
          </span>
        )}
      </button>

      {/* Live Support Chat Modal for User */}
      {isUserChatOpen && renderUserChatModal()}

      {/* Notifications Modal for User */}
      {isNotifModalOpen && renderNotificationModal()}

      {/* Live Console Stream Full Screen View when clicking an app (e.g. WhatsApp, Facebook, TikTok) matching user's exact Screenshot */}
      {activeAppConsoleService && (
        <div
          id="app-console-stream-fullscreen"
          className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden animate-in fade-in duration-150"
        >
          {/* Top Premium Minimal Navigation Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-amber-500/30 px-3 sm:px-5 py-3 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400/50" />
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm sm:text-base tracking-wide uppercase">
                  {activeAppConsoleService}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Live
                </span>
              </div>
            </div>

            <button
              type="button"
              id="fullscreen-stream-close-btn"
              onClick={() => setActiveAppConsoleService(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Close Stream"
              aria-label="Close Stream"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Full-Screen Pure Table matching Screenshot 1 */}
          <div className="flex-1 overflow-auto bg-slate-900 p-0 relative">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse bg-white border border-slate-300">
              <thead className="bg-slate-900 sticky top-0 z-10 border-b-2 border-slate-700 text-slate-100 font-extrabold text-xs sm:text-[13px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 sm:px-4 border-r border-slate-700 whitespace-nowrap bg-slate-900 text-slate-100">
                    <div className="flex items-center gap-1">
                      <span>Range Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3 sm:px-4 border-r border-slate-700 whitespace-nowrap bg-slate-900 text-slate-100">
                    Test Number
                  </th>
                  <th className="py-3 px-3 sm:px-4 border-r border-slate-700 whitespace-nowrap bg-slate-900 text-slate-100">
                    SID
                  </th>
                  <th className="py-3 px-3 sm:px-4 border-r border-slate-700 bg-slate-900 text-slate-100 min-w-[200px]">
                    Message content
                  </th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap bg-slate-900 text-slate-100">
                    Receive time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 bg-white">
                {(() => {
                  const targetService = activeAppConsoleService.toLowerCase().trim();

                  // Combine liveHits + liveSuccessOtps to maximize real hits
                  const allAvailableHits: LiveConsoleHit[] = [
                    ...liveHits,
                    ...liveSuccessOtps.map((o) => ({
                      range: o.number,
                      sid: 'Carrier OTP Direct',
                      message: o.message,
                      time: typeof o.time === 'number' ? o.time : new Date(o.time).getTime() || Date.now(),
                      country: getCountryInfo(o.number).name,
                      operator: 'Carrier Gateway Route',
                    })),
                  ];

                  const filteredHits = allAvailableHits.filter((h) => {
                    const sid = (h.sid || "").toLowerCase();
                    const msg = (h.message || "").toLowerCase();

                    if (targetService === "all" || !targetService) return true;
                    if (sid.includes(targetService) || targetService.includes(sid)) return true;

                    if (targetService.includes("huawei") && (sid.includes("huawei") || msg.includes("huawei") || sid.includes("ullawei") || msg.includes("هواوي"))) return true;
                    if ((targetService.includes("qsms") || targetService.includes("pubg")) && (sid.includes("qsms") || msg.includes("pubgm") || msg.includes("pubg") || sid.includes("pubg"))) return true;
                    if ((targetService.includes("auth") || targetService.includes("authmesage") || targetService.includes("authmsg")) && (sid.includes("auth") || msg.includes("auth") || msg.includes("verification"))) return true;
                    if (targetService.includes("baji") && (sid.includes("baji") || msg.includes("baji") || msg.includes("baji999") || msg.includes("bj999") || msg.includes("bet") || msg.includes("casino"))) return true;
                    if (targetService.includes("whatsapp") && (msg.includes("whatsapp") || sid.includes("whatsapp") || sid === "wa" || msg.includes("wa.me") || msg.includes("whats"))) return true;
                    if (targetService.includes("facebook") && (msg.includes("facebook") || sid.includes("facebook") || sid.includes("fb") || msg.includes("meta"))) return true;
                    if (targetService.includes("telegram") && (msg.includes("telegram") || sid.includes("telegram") || sid === "tg" || msg.includes("t.me"))) return true;
                    if (targetService.includes("tiktok") && (msg.includes("tiktok") || sid.includes("tiktok"))) return true;
                    if (targetService.includes("imo") && (msg.includes("imo") || sid.includes("imo"))) return true;
                    if (targetService.includes("google") && (msg.includes("google") || msg.includes("g-") || sid.includes("google") || sid.includes("gsuite"))) return true;
                    if (targetService.includes("apple") && (msg.includes("apple") || sid.includes("apple") || msg.includes("icloud"))) return true;
                    if (targetService.includes("instagram") && (msg.includes("instagram") || sid.includes("instagram") || sid.includes("insta"))) return true;
                    if (targetService.includes("twitter") && (msg.includes("twitter") || msg.includes("x.com") || sid.includes("twitter") || sid.includes("x.com"))) return true;
                    if (targetService.includes("melbet") && (msg.includes("melbet") || sid.includes("melbet"))) return true;
                    if (targetService.includes("avabet") && (msg.includes("avabet") || sid.includes("avabet"))) return true;
                    if (targetService.includes("verify") && (msg.includes("verify") || msg.includes("code") || sid.includes("verify") || sid.includes("auth"))) return true;

                    if (msg.includes(targetService)) return true;
                    return false;
                  });

                  if (filteredHits.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-500 bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <TerminalIcon className="w-5 h-5" />
                            </div>
                            <p className="font-semibold text-slate-700 text-sm">No Message</p>
                            <p className="text-xs text-slate-400 max-w-sm">
                              No active live SMS or OTP received for {activeAppConsoleService} yet. Waiting for incoming carrier stream packets...
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const dynamicRows = filteredHits.map((h) => {
                    const carrier = resolveCarrierDetails(h.range || "");
                    const timeMs = typeof h.time === "number"
                      ? (h.time < 10000000000 ? h.time * 1000 : h.time)
                      : (new Date(h.time).getTime() || Date.now());
                    const rawTime = typeof h.time === "number"
                      ? new Date(timeMs).toISOString().replace("T", " ").substring(0, 19)
                      : (h.time || new Date().toISOString().replace("T", " ").substring(0, 19));
                    
                    // Calculate relative time (e.g. Just now, 12 mins ago, 2 hrs ago)
                    const diffSec = Math.max(0, Math.floor((nowTick - timeMs) / 1000));
                    let relativeStr = "Just now";
                    if (diffSec >= 45 && diffSec < 3600) {
                      const mins = Math.floor(diffSec / 60);
                      relativeStr = mins === 1 ? "1 min ago" : `${mins} mins ago`;
                    } else if (diffSec >= 3600 && diffSec < 86400) {
                      const hrs = Math.floor(diffSec / 3600);
                      relativeStr = hrs === 1 ? "1 hr ago" : `${hrs} hrs ago`;
                    } else if (diffSec >= 86400) {
                      const days = Math.floor(diffSec / 86400);
                      relativeStr = days === 1 ? "1 day ago" : `${days} days ago`;
                    }

                    const resolvedCountry = getRealCountryName(h.country, h.range);
                    const extractedOtpMatch = (h.message || "").match(/\b\d{4,8}\b/);
                    const extractedOtp = extractedOtpMatch ? extractedOtpMatch[0] : null;

                    return {
                      country: resolvedCountry,
                      range: h.range || "",
                      number: formatNumberWithAreaCode(h.range || "", resolvedCountry),
                      sid: h.sid || activeAppConsoleService,
                      message: h.message || "",
                      otp: extractedOtp,
                      time: rawTime,
                      relativeTime: relativeStr,
                    };
                  });

                  return dynamicRows.map((hit, idx) => {
                    const countryUpper = getRealCountryName(hit.country, hit.range).toUpperCase();
                    const rangeName = hit.range
                      ? `${countryUpper}\n${hit.range}`
                      : countryUpper;

                    const isEvenRow = idx % 2 === 0;

                    return (
                      <tr
                        key={`${hit.number}-${hit.time}-${idx}`}
                        className={`transition-colors group ${
                          isEvenRow
                            ? "bg-white hover:bg-amber-50/70"
                            : "bg-slate-50/90 hover:bg-amber-50/70"
                        }`}
                      >
                        {/* Range Name (Uppercase Country + Range code underneath) */}
                        <td className="py-3.5 px-3 sm:px-4 border-r border-b border-slate-300 font-extrabold text-slate-900 align-top whitespace-pre-line leading-tight">
                          <span className="tracking-tight uppercase">
                            {rangeName}
                          </span>
                        </td>

                        {/* Test Number */}
                        <td className="py-3.5 px-3 sm:px-4 border-r border-b border-slate-300 font-mono font-bold text-slate-900 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{hit.number || "—"}</span>
                            {hit.number && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(hit.number.replace(/\D/g, ''));
                                  showDashboardToast(`Number copied: ${hit.number}`, "success");
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-800 p-0.5 rounded cursor-pointer transition"
                                title="Copy Number"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* SID */}
                        <td className="py-3.5 px-3 sm:px-4 border-r border-b border-slate-300 font-bold text-slate-900 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                            {hit.sid || activeAppConsoleService}
                          </span>
                        </td>

                        {/* Message content + Extracted OTP badge */}
                        <td className="py-3.5 px-3 sm:px-4 border-r border-b border-slate-300 text-slate-800 text-xs sm:text-[13px] leading-relaxed max-w-xs sm:max-w-md break-words align-top font-sans">
                          <div className="space-y-1.5">
                            {hit.otp && (
                              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono font-bold text-xs border border-amber-300">
                                <span>OTP:</span>
                                <span className="text-amber-950 text-sm tracking-wider">{hit.otp}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(hit.otp!);
                                    showDashboardToast(`OTP Copied: ${hit.otp}`, "success");
                                  }}
                                  className="text-amber-800 hover:text-black p-0.5 ml-1 rounded cursor-pointer"
                                  title="Copy OTP Code"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="text-slate-800 leading-normal select-all">
                              {hit.message || "—"}
                            </div>
                          </div>
                        </td>

                        {/* Receive time */}
                        <td className="py-3.5 px-3 sm:px-4 border-b border-slate-300 text-slate-800 whitespace-nowrap align-top text-xs sm:text-[13px]">
                          <div className="font-semibold text-slate-900">{hit.relativeTime}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{hit.time}</div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>

            {/* Floating Orange Chat Bubble Icon matching Screenshot 1 */}
            <div className="fixed bottom-6 right-6 z-20">
              <button
                type="button"
                id="stream-floating-chat-btn"
                onClick={() => {
                  showDashboardToast("Super X SMS Support Desk", "info");
                }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#f97316] hover:bg-[#ea580c] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                title="Support Chat"
                aria-label="Support Chat"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
