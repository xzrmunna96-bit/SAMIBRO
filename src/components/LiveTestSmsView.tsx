import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  RotateCw,
  Copy,
  Check,
  Send,
  X,
  Volume2,
  VolumeX,
  Layers,
  Mail,
  Trash2,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Radio,
} from "lucide-react";
import { LiveConsoleHit, stripFlagFromCountryName } from "../services/voltxApi";
import { getCountryInfo, GLOBAL_COUNTRIES_LIST } from "../services/countryHelper";
import { getCountryFlagEmoji, speakOtpAnnouncement } from "./LoggedInDashboard";
import { CountryFlag } from "./CountryFlags";
import { sendOtpToTelegram } from "../services/telegramService";
import {
  SKYPE_DIRECT_CHAT_URL,
  handleOpenSkypeOrTeams,
} from "../utils/contactLinks";

// Web Audio API "Tung-Tung" ascending chime notification generator
export function playTungTungSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Tone 1: ~784 Hz (G5) for 0.12s
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(784, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.14);

    // Tone 2: ~1046.5 Hz (C6) starting at +0.10s
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.10);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.30);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.10);
    osc2.stop(ctx.currentTime + 0.30);
  } catch (e) {
    // Ignore audio context restriction errors
  }
}
import {
  SkypeLogo,
  WhatsAppLogo,
  TelegramLogo,
  FacebookLogo,
  ImoLogo,
  TikTokLogo,
  GoogleLogo,
  AppleLogo,
  UberLogo,
  InstagramLogo,
} from "./BrandLogos";

export interface SmsTestRecord {
  id: string;
  testNumber: string;
  country: string;
  carrier: string;
  service: string;
  otpCode: string;
  message: string;
  timestamp: number;
  status: "DELIVERED" | "SUCCESS" | "PENDING" | "FAILED";
  speedSec: number;
}

interface LiveTestSmsViewProps {
  userEmail: string;
  liveHits: LiveConsoleHit[];
  onAddTestHistory?: (record: SmsTestRecord) => void;
  onAddLiveHit?: (hit: LiveConsoleHit) => void;
  onRefreshHits?: () => void;
  onSelectService?: (service: string, range?: string, phoneNum?: string) => void;
}

export interface TestSmsCardItem {
  id: string;
  country: string;
  operator: string;
  range: string;
  number: string;
  sid: string;
  message: string;
  payout: string;
  elapsed: string;
  timeStr: string;
  timestamp: number;
}

// Function to automatically mask OTP codes with XXXX in message text
export function maskOtpInMessage(msg: string): string {
  if (!msg) return "";
  if (msg.includes("XXXX")) return msg;

  let masked = msg;
  // Mask 4 to 8 digit numbers with XXXX
  masked = masked.replace(/\b\d{4,8}\b/g, "XXXX");
  // Mask 3+3 spaced numbers like 123 456 with XXX XXX
  masked = masked.replace(/\b\d{3}\s\d{3}\b/g, "XXX XXX");
  // Mask G-123456 with G-XXXXXX
  masked = masked.replace(/G-\d{6}/gi, "G-XXXXXX");
  return masked;
}

const INITIAL_SAMPLE_HITS: TestSmsCardItem[] = [
  {
    id: "hit_01",
    country: "CAMBODIA",
    operator: "Metfone 12",
    range: "85567464345",
    number: "85567464345",
    sid: "AUTHMSG",
    message: "Your foodpanda verification code is: XXXX",
    payout: "0.0102 USD",
    elapsed: "1m",
    timeStr: "15:29:26",
    timestamp: Date.now() - 60000,
  },
  {
    id: "hit_02",
    country: "UZBEKISTAN",
    operator: "Daewoo Unitel 32",
    range: "998918617252",
    number: "998918617252",
    sid: "Facebook",
    message: "<#> XXX XXX— ваш код Instagram. Никому не показывайте его. GdDGCwrWHVm",
    payout: "-",
    elapsed: "48s",
    timeStr: "15:30:07",
    timestamp: Date.now() - 48000,
  },
  {
    id: "hit_03",
    country: "TOGO",
    operator: "Moov 34",
    range: "22897437931",
    number: "22897437931",
    sid: "Facebook",
    message: "Tap to reset your Instagram password: https://ig.me/XXyXuSQUXosAXTG",
    payout: "-",
    elapsed: "49s",
    timeStr: "15:30:06",
    timestamp: Date.now() - 49000,
  },
  {
    id: "hit_04",
    country: "IVORY COAST",
    operator: "Orange 111",
    range: "2250767490303",
    number: "2250767490303",
    sid: "Apple",
    message: "REG-RESP?v=X;r=XXXXXXXXX;n=+XXXXXXXXXXXXX;s=XXXAAXXBXXFFFFFFFFXXX",
    payout: "0.0102 USD",
    elapsed: "50s",
    timeStr: "15:30:05",
    timestamp: Date.now() - 50000,
  },
  {
    id: "hit_05",
    country: "SIERRA LEONE",
    operator: "Lintel 8",
    range: "23277595046",
    number: "23277595046",
    sid: "Uber",
    message: "HAKAN KHAGAN is arriving now in a Silver MG ZS EV HKXXCVM. Need help? Contact Support: XXXX XXX XXXX",
    payout: "0.0102 USD",
    elapsed: "51s",
    timeStr: "15:30:04",
    timestamp: Date.now() - 51000,
  },
  {
    id: "hit_06",
    country: "IVORY COAST",
    operator: "Moov 136",
    range: "2250140426646",
    number: "2250140426646",
    sid: "WhatsApp",
    message: "Your WhatsApp code is: XXXX. Do not share this code with anyone.",
    payout: "0.0102 USD",
    elapsed: "53s",
    timeStr: "15:30:02",
    timestamp: Date.now() - 53000,
  },
];

export const LiveTestSmsView = React.memo(function LiveTestSmsView({
  userEmail,
  liveHits,
  onAddTestHistory,
  onAddLiveHit,
  onRefreshHits,
  onSelectService,
}: LiveTestSmsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testNumberInput, setTestNumberInput] = useState("8801712345678");
  const [testServiceInput, setTestServiceInput] = useState("WhatsApp");
  const [testCustomOtp, setTestCustomOtp] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Filter & Search states matching Screenshot 1
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [itemsList, setItemsList] = useState<TestSmsCardItem[]>(INITIAL_SAMPLE_HITS);

  // Sync real liveHits when prop changes
  useEffect(() => {
    if (liveHits && liveHits.length > 0) {
      const converted: TestSmsCardItem[] = liveHits.map((h, i) => {
        const rawRange = (h.range || (h as any).rangeCode || "").trim();
        const rawPhone = ((h as any).number || (h as any).testNumber || rawRange).trim();
        const cleanDigits = (rawPhone || rawRange).replace(/\D/g, "");
        const info = getCountryInfo(rawRange || rawPhone);

        let countryName = (h.country || (h as any).countryName || "").trim();
        if (
          !countryName ||
          countryName.toUpperCase().includes("INTERNATIONAL") ||
          (countryName.toUpperCase().includes("SRI LANKA") && !cleanDigits.startsWith("94"))
        ) {
          countryName = info.name;
        }

        let operatorName = h.operator || "";
        if (
          !operatorName ||
          operatorName === "Gateway Route" ||
          (operatorName.toLowerCase().includes("dialog") && !cleanDigits.startsWith("94"))
        ) {
          const matchedCountry = GLOBAL_COUNTRIES_LIST.find(
            (c) => c.name.toLowerCase() === countryName.toLowerCase()
          );
          if (matchedCountry && matchedCountry.operators && matchedCountry.operators.length > 0) {
            operatorName = matchedCountry.operators.join(" / ");
          } else {
            operatorName = "Direct Carrier";
          }
        }

        const now = Date.now();
        const tVal = typeof h.time === "number" ? (h.time < 1e10 ? h.time * 1000 : h.time) : now;
        const elapsedSec = Math.max(1, Math.floor((now - tVal) / 1000));
        const elapsedStr = elapsedSec < 60 ? `${elapsedSec}s` : `${Math.floor(elapsedSec / 60)}m`;

        return {
          id: (h as any).id || `prop_hit_${rawPhone}_${tVal}_${h.sid || ""}_${i}`,
          country: countryName.toUpperCase(),
          operator: operatorName,
          range: rawRange || info.dialCode.replace("+", ""),
          number: rawPhone,
          sid: h.sid || (h as any).service || "WhatsApp",
          message: maskOtpInMessage(h.message || "Incoming SMS Packet"),
          payout: "-",
          elapsed: elapsedStr,
          timeStr: new Date(tVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          timestamp: tVal,
        };
      });

      setItemsList(converted);
    }
  }, [liveHits]);

  const prevItemsCountRef = useRef<number | null>(null);

  // Sound notification trigger when user is inside Live Test SMS view
  useEffect(() => {
    if (itemsList.length === 0) return;

    if (prevItemsCountRef.current === null) {
      // User just entered/opened Live Test SMS view - play chime to announce initial SMS feed
      if (isSoundOn) {
        playTungTungSound();
      }
    } else if (itemsList.length > prevItemsCountRef.current) {
      // A new SMS arrived while the user is inside Live Test SMS view
      if (isSoundOn) {
        playTungTungSound();
      }
    }

    prevItemsCountRef.current = itemsList.length;
  }, [itemsList, isSoundOn]);

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.country.toLowerCase().includes(q) ||
        item.operator.toLowerCase().includes(q) ||
        item.range.toLowerCase().includes(q) ||
        item.number.toLowerCase().includes(q) ||
        item.sid.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      );
    });
  }, [itemsList, searchQuery]);

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredItems.slice(start, start + perPage);
  }, [filteredItems, currentPage, perPage]);

  // Handle Plus Button click: copy number, set range, and navigate to Get Number
  const handlePlusClick = (item: TestSmsCardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectService) {
      onSelectService(item.sid, item.range, item.number);
    }
  };

  // Render Service Brand Badge matching user request
  const renderBrandBadge = (sid: string) => {
    const sLower = sid.toLowerCase();
    let logoElem = null;

    if (sLower.includes("whatsapp")) {
      logoElem = <WhatsAppLogo className="w-4 h-4 text-[#25D366]" />;
    } else if (sLower.includes("facebook") || sLower.includes("fb")) {
      logoElem = <FacebookLogo className="w-4 h-4 text-[#1877F2]" />;
    } else if (sLower.includes("instagram") || sLower.includes("ig")) {
      logoElem = <InstagramLogo className="w-4 h-4" />;
    } else if (sLower.includes("apple")) {
      logoElem = <AppleLogo className="w-4 h-4 text-slate-900" />;
    } else if (sLower.includes("uber")) {
      logoElem = <UberLogo className="w-4 h-4 text-slate-900" />;
    } else if (sLower.includes("tiktok")) {
      logoElem = <TikTokLogo className="w-4 h-4" />;
    } else if (sLower.includes("google")) {
      logoElem = <GoogleLogo className="w-4 h-4" />;
    } else if (sLower.includes("telegram")) {
      logoElem = <TelegramLogo className="w-4 h-4 text-[#0088cc]" />;
    } else if (sLower.includes("imo")) {
      logoElem = <ImoLogo className="w-4 h-4 text-[#00aaff]" />;
    } else {
      logoElem = (
        <span className="w-4 h-4 rounded bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
          A
        </span>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-800 border border-slate-200/60">
        {logoElem}
        <span>{sid}</span>
      </div>
    );
  };

  const handleSendTestSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumberInput.trim()) return;

    setIsSendingTest(true);
    const generatedOtp = testCustomOtp.trim() || String(Math.floor(100000 + Math.random() * 900000));
    let rawMsg = `${testServiceInput} verification code: ${generatedOtp}`;

    if (testServiceInput === "WhatsApp") {
      rawMsg = `<#> Your WhatsApp code is ${generatedOtp}. Do not share this code with anyone.`;
    } else if (testServiceInput === "Facebook") {
      rawMsg = `${generatedOtp} is your Facebook security code`;
    }

    const testNow = Date.now();
    const resolvedCountry = testNumberInput.startsWith("880") ? "BANGLADESH" : testNumberInput.startsWith("966") ? "SAUDI ARABIA" : "CAMBODIA";

    sendOtpToTelegram({
      number: testNumberInput.trim(),
      service: testServiceInput,
      message: rawMsg,
      time: testNow,
    }).catch(() => {});

    // Speak OTP announcement in localized voice
    speakOtpAnnouncement(generatedOtp, resolvedCountry);

    const newCardItem: TestSmsCardItem = {
      id: `live_tst_${testNow}`,
      country: resolvedCountry,
      operator: "Direct Test Gateway",
      range: testNumberInput.slice(0, 6) || "880171",
      number: testNumberInput.trim(),
      sid: testServiceInput,
      message: maskOtpInMessage(rawMsg),
      payout: "0.0102 USD",
      elapsed: "1s",
      timeStr: new Date(testNow).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      timestamp: testNow,
    };

    setItemsList((prev) => [newCardItem, ...prev]);

    if (onAddLiveHit) {
      onAddLiveHit({
        id: `tst_live_${testNow}`,
        country: resolvedCountry,
        range: testNumberInput.slice(0, 6) || "880171",
        number: testNumberInput.trim(),
        sid: testServiceInput,
        message: rawMsg,
        time: testNow,
        operator: "Live Test Direct",
      } as any);
    }

    setTimeout(() => {
      if (onAddTestHistory) {
        onAddTestHistory({
          id: `TST-${Math.floor(100000 + Math.random() * 900000)}`,
          testNumber: testNumberInput.trim(),
          country: resolvedCountry,
          carrier: "Direct Route",
          service: testServiceInput,
          otpCode: generatedOtp,
          message: rawMsg,
          timestamp: testNow,
          status: "DELIVERED",
          speedSec: 0.9,
        });
      }
      setIsSendingTest(false);
      setIsTestModalOpen(false);
    }, 300);
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150 font-sans text-slate-800">
      {/* 1. Breadcrumb Navigation Bar matching Screenshot 1 */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-200/80 shadow-2xs text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="hover:text-slate-800 transition cursor-pointer">Dashboard</span>
          <span className="text-slate-300">›</span>
          <span className="hover:text-slate-800 transition cursor-pointer">Test System</span>
          <span className="text-slate-300">›</span>
          <span className="text-slate-900 font-bold">Live Test SMS</span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          <a
            href={SKYPE_DIRECT_CHAT_URL}
            onClick={handleOpenSkypeOrTeams}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center group shrink-0 cursor-pointer text-center"
            title="Contact Manager (charlesjames997@outlook.com)"
          >
            <div className="w-8 h-8 rounded-full bg-[#00AFF0] hover:bg-[#0098d4] active:scale-95 text-white flex items-center justify-center shadow-2xs border border-sky-300/50 transition-all group-hover:scale-105">
              <SkypeLogo className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-900 group-hover:text-black tracking-tight leading-none mt-0.5">
              Skype
            </span>
          </a>
        </div>
      </div>

      {/* 2. Top Metric Cards (TOTAL MESSAGES) matching user screenshot */}
      <div className="grid grid-cols-1 gap-4">
        {/* TOTAL MESSAGES Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
              TOTAL MESSAGES
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {itemsList.length}
            </div>
            <div className="text-xs text-slate-500 font-medium">Live Stream</div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center shrink-0 border border-[#c8e6c9]/60">
            <Mail className="w-5 h-5 stroke-[2.2]" />
          </div>
          {/* Top accent border */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/30" />
        </div>
      </div>

      {/* 3. Main Message Stream Card matching Screenshot 1 & 2 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Card Header: Message stream + Connected status */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Message stream
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const next = !isSoundOn;
                setIsSoundOn(next);
                if (next) playTungTungSound();
              }}
              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                isSoundOn
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                  : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
              }`}
              title={isSoundOn ? "Sound Enabled (Click to Mute)" : "Sound Muted (Click to Enable)"}
            >
              {isSoundOn ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <span className="inline-flex items-center gap-1.5 bg-[#e8f5e9] text-[#2e7d32] px-3 py-1 rounded-full text-xs font-bold border border-[#c8e6c9]">
              <span className="w-2 h-2 rounded-full bg-[#2e7d32] animate-pulse" />
              <span>Connected</span>
            </span>
          </div>
        </div>

        {/* Toolbar Row: LIVE pill, Clear, Export */}
        <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLiveConnected(!isLiveConnected)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer ${
              isLiveConnected
                ? "bg-[#2e7d32] text-white hover:bg-[#1b5e20]"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>LIVE ●</span>
          </button>

          <button
            type="button"
            onClick={() => setItemsList([])}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itemsList, null, 2));
              const downloadAnchor = document.createElement("a");
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `live_sms_stream_${Date.now()}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>

        {/* Filter Controls Row: Search Input */}
        <div className="p-3 border-b border-slate-100">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search messages, phone numbers, countries..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-sans"
            />
          </div>
        </div>

        {/* Pagination Controls Row matching Screenshot 1 */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span>Per page</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={5000}>All (5000+)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-slate-500 text-[11px] font-medium">
            {paginatedItems.length} / {totalItems} messages
          </div>
        </div>

        {/* 4. SMS Feed Cards List matching Screenshots 1 & 2 */}
        <div className="divide-y divide-slate-100">
          {paginatedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No live test messages received yet.
            </div>
          ) : (
            paginatedItems.map((item, idx) => {
              const cleanCountry = stripFlagFromCountryName(item.country);
              const isGenericGateway = !item.operator || item.operator === "Gateway Route" || item.operator === "Direct Test Gateway";
              const isNewest = currentPage === 1 && idx === 0;

              return (
                <div
                  key={item.id || `hit_card_${idx}`}
                  className={`p-4 transition-colors relative space-y-2 border-b border-slate-100/90 ${
                    isNewest ? "bg-[#f4fbf7]" : "bg-white"
                  }`}
                >
                  {/* Top Line: Flag + Country Name (Operator if applicable) + Time Elapsed + Timestamp */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Flag Image */}
                      <CountryFlag
                        countryCode={item.country || item.range}
                        size="lg"
                        className="mt-0.5 shrink-0"
                      />

                      <div className="min-w-0">
                        {/* Title: Country Name */}
                        <div className="font-bold text-slate-900 text-sm tracking-tight leading-tight">
                          {cleanCountry}{!isGenericGateway ? ` - ${item.operator}` : ""}
                        </div>
                        {/* Subtitle: Phone Number */}
                        <div className="text-xs font-mono text-slate-500 font-medium mt-0.5">
                          {item.number}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Time elapsed + Timestamp */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <div className="text-xs font-bold text-slate-800">
                        {item.elapsed}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {item.timeStr}
                      </div>
                    </div>
                  </div>

                  {/* Second Line: Social Brand Logo + Name */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {renderBrandBadge(item.sid)}

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.message, `item_copy_${idx}`)}
                      className="text-slate-400 hover:text-slate-800 p-1 transition cursor-pointer"
                      title="Copy message content"
                    >
                      {copiedId === `item_copy_${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Third Line: Message Body with XXXX Masked OTP (No border or background box as requested) */}
                  <div className="text-xs text-slate-700 leading-relaxed font-sans break-words pt-1 font-medium">
                    {item.message}
                  </div>

                  {/* Bottom Right: Green Plus Action Button matching Screenshot */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={(e) => handlePlusClick(item, e)}
                      className="w-8 h-8 rounded-lg bg-[#e8f5e9] hover:bg-[#c8e6c9] active:scale-95 text-[#2e7d32] border border-[#a5d6a7]/60 flex items-center justify-center transition-all shadow-2xs cursor-pointer group"
                      title="Get number from this range"
                    >
                      <Plus className="w-4 h-4 stroke-[2.8] transition-transform group-hover:scale-110" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button at Bottom Right for Simulating Test SMS */}
      <button
        type="button"
        onClick={() => setIsTestModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Simulate / Send Test SMS"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Simulate Test SMS Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#2e7d32]" />
                <h3 className="text-lg font-bold text-slate-800">Simulate Live Test SMS</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestSms} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Test Number:</label>
                <input
                  type="text"
                  value={testNumberInput}
                  onChange={(e) => setTestNumberInput(e.target.value)}
                  placeholder="8801712345678"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono font-medium focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Service / SID:</label>
                <select
                  value={testServiceInput}
                  onChange={(e) => setTestServiceInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Facebook">Facebook</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Google">Google</option>
                  <option value="Apple">Apple</option>
                  <option value="Telegram">Telegram</option>
                  <option value="AUTHMSG">AUTHMSG</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Custom OTP (Optional):</label>
                <input
                  type="text"
                  value={testCustomOtp}
                  onChange={(e) => setTestCustomOtp(e.target.value)}
                  placeholder="Auto-generated if empty (e.g. 492810)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-5 py-2 rounded-lg bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSendingTest ? "Sending..." : "Send Test Packet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
