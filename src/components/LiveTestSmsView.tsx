import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Key,
} from "lucide-react";
import { LiveConsoleHit, stripFlagFromCountryName } from "../services/voltxApi";
import { getCountryInfo, GLOBAL_COUNTRIES_LIST } from "../services/countryHelper";
import { getCountryFlagEmoji, speakOtpAnnouncement } from "./LoggedInDashboard";
import { CountryFlag } from "./CountryFlags";
import { sendOtpToTelegram, extractOtpCode } from "../services/telegramService";
import {
  SKYPE_DIRECT_CHAT_URL,
  handleOpenSkypeOrTeams,
} from "../utils/contactLinks";
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

export interface LiveTestSmsViewProps {
  userEmail: string;
  liveHits: LiveConsoleHit[];
  onAddTestHistory?: (record: SmsTestRecord) => void;
  onAddLiveHit?: (hit: LiveConsoleHit) => void;
  onMergeHits?: (hits: LiveConsoleHit[]) => void;
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
  otpCode?: string;
  source?: string;
  isFoxSms?: boolean;
}

// Convert any incoming hit (from FOX SMS API or Voltx API) to display card item
export function convertHitToCard(h: any, i: number = 0): TestSmsCardItem {
  const rawRange = (h.range || (h as any).rangeCode || "").trim();
  const rawPhone = ((h as any).number || (h as any).num || (h as any).testNumber || rawRange).trim();
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
  let tVal = typeof h.time === "number" ? (h.time < 1e10 ? h.time * 1000 : h.time) : now;
  if ((h as any).dt) {
    const dtStr = String((h as any).dt).trim();
    const isoStr = dtStr.includes(" ") && !dtStr.includes("T") ? dtStr.replace(" ", "T") + "Z" : dtStr;
    const parsedDt = new Date(isoStr).getTime();
    if (!isNaN(parsedDt) && parsedDt > 0) tVal = parsedDt;
  }
  const elapsedSec = Math.max(0, Math.floor((now - tVal) / 1000));
  let elapsedStr = "Just now";
  if (elapsedSec < 60) elapsedStr = `${Math.max(1, elapsedSec)}s ago`;
  else if (elapsedSec < 3600) elapsedStr = `${Math.floor(elapsedSec / 60)}m ago`;
  else if (elapsedSec < 86400) elapsedStr = `${Math.floor(elapsedSec / 3600)}h ago`;
  else elapsedStr = `${Math.floor(elapsedSec / 86400)}d ago`;

  const rawMsg = String(h.message || h.text || "Incoming SMS Packet").trim();
  const extractedOtp = (h as any).code || (h as any).otp || extractOtpCode(rawMsg) || "";

  return {
    id: (h as any).id || `hit_${cleanDigits}_${tVal}_${(h.sid || "").toLowerCase()}_${i}`,
    country: countryName.toUpperCase(),
    operator: operatorName,
    range: rawRange || info.dialCode.replace("+", ""),
    number: rawPhone,
    sid: h.sid || (h as any).service || (h as any).cli || "SMS",
    message: rawMsg,
    payout: h.payout && h.payout !== "-" ? String(h.payout) : "-",
    elapsed: elapsedStr,
    timeStr: new Date(tVal).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    timestamp: tVal,
    otpCode: extractedOtp ? String(extractedOtp).trim() : undefined,
    source: h.source || (h.isFoxSms ? "FOX SMS" : "VOLTX SMS"),
    isFoxSms: Boolean(h.isFoxSms || h.source === "FOX SMS" || (h.operator && String(h.operator).includes("FOX SMS"))),
  };
}

export const LiveTestSmsView = React.memo(function LiveTestSmsView({
  userEmail,
  liveHits,
  onAddTestHistory,
  onAddLiveHit,
  onMergeHits,
  onRefreshHits,
  onSelectService,
}: LiveTestSmsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testNumberInput, setTestNumberInput] = useState("8801712345678");
  const [testServiceInput, setTestServiceInput] = useState("WhatsApp");
  const [testCustomOtp, setTestCustomOtp] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [itemsList, setItemsList] = useState<TestSmsCardItem[]>([]);

  // Sound chime tracking ref
  const prevItemsCountRef = useRef<number | null>(null);

  // Merge newly received hits into the card feed
  const mergeCardsIntoList = useCallback((newHits: any[]) => {
    if (!Array.isArray(newHits) || newHits.length === 0) return;

    setItemsList((prev) => {
      const map = new Map<string, TestSmsCardItem>();
      prev.forEach((item) => {
        const sig = `${item.number.replace(/\D/g, "")}_${item.timestamp}_${item.sid.toLowerCase()}_${item.message.slice(0, 40)}`;
        map.set(sig, item);
      });

      let hasNew = false;
      newHits.forEach((h, idx) => {
        if (!h) return;
        const card = convertHitToCard(h, idx);
        const sig = `${card.number.replace(/\D/g, "")}_${card.timestamp}_${card.sid.toLowerCase()}_${card.message.slice(0, 40)}`;
        if (!map.has(sig)) {
          map.set(sig, card);
          hasNew = true;
        }
      });

      if (!hasNew && map.size === prev.length) return prev;
      const sorted = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
      return sorted;
    });
  }, []);

  // Fetch real-time hits from FOX SMS & global stream immediately
  const syncLiveData = useCallback(async () => {
    try {
      if (onRefreshHits) {
        onRefreshHits();
      }

      // 1. Fetch from global live stream
      const resStream = await fetch("/api/global-live-stream").catch(() => null);
      let streamHits: any[] = [];
      if (resStream && resStream.ok) {
        const sJson = await resStream.json();
        if (sJson?.success && Array.isArray(sJson.hits)) {
          streamHits = sJson.hits;
        }
      }

      // 2. Fetch directly from FOX SMS stats endpoint
      const resFox = await fetch("/api/foxsms/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: 100, forceRefresh: true }),
      }).catch(() => null);
      let foxHits: any[] = [];
      if (resFox && resFox.ok) {
        const fJson = await resFox.json();
        if (fJson?.success && Array.isArray(fJson.hits)) {
          foxHits = fJson.hits;
        }
      }

      const combined = [...streamHits, ...foxHits];
      if (combined.length > 0) {
        mergeCardsIntoList(combined);
        if (onMergeHits) {
          onMergeHits(combined);
        }
      }
    } catch (e) {
      // quiet
    }
  }, [mergeCardsIntoList, onMergeHits, onRefreshHits]);

  // Initial load & continuous 3-second live polling
  useEffect(() => {
    syncLiveData();

    if (!isLiveConnected) return;
    const interval = setInterval(() => {
      syncLiveData();
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveConnected, syncLiveData]);

  // Sync when liveHits prop changes from parent
  useEffect(() => {
    if (liveHits && liveHits.length > 0) {
      mergeCardsIntoList(liveHits);
    }
  }, [liveHits, mergeCardsIntoList]);

  // Sound notification trigger when new SMS arrives
  useEffect(() => {
    if (itemsList.length === 0) return;

    if (prevItemsCountRef.current === null) {
      // User entered Live Test SMS view - announce incoming feed
      if (isSoundOn) {
        playTungTungSound();
      }
    } else if (itemsList.length > prevItemsCountRef.current) {
      // New incoming OTP arrived in real time
      if (isSoundOn) {
        playTungTungSound();
      }
    }

    prevItemsCountRef.current = itemsList.length;
  }, [itemsList, isSoundOn]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await syncLiveData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter items based on search query (Country, Range, Number, Operator, Service, Message, OTP)
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return itemsList;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, "");
    return itemsList.filter((item) => {
      const cleanNum = item.number.replace(/\D/g, "");
      const cleanRange = item.range.replace(/\D/g, "");
      return (
        item.country.toLowerCase().includes(q) ||
        item.operator.toLowerCase().includes(q) ||
        item.range.toLowerCase().includes(q) ||
        item.number.toLowerCase().includes(q) ||
        (cleanQ.length > 0 && (cleanNum.includes(cleanQ) || cleanRange.includes(cleanQ))) ||
        item.sid.toLowerCase().includes(q) ||
        (item.otpCode && item.otpCode.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
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
          {sid.charAt(0).toUpperCase()}
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md text-xs font-bold text-slate-800">
        {logoElem}
        <span className="truncate max-w-[120px]">{sid}</span>
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
      message: rawMsg,
      payout: "0.0102 USD",
      elapsed: "Just now",
      timeStr: new Date(testNow).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      timestamp: testNow,
      otpCode: generatedOtp,
      source: "FOX SMS",
      isFoxSms: true,
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
        isFoxSms: true,
        source: "FOX SMS",
        code: generatedOtp,
        otp: generatedOtp,
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
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">
              TOTAL MESSAGES
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {itemsList.length}
            </div>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FOX SMS &amp; Live Stream Active Feed
            </span>
          </div>

          <div className="w-12 h-12 rounded-xl bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center border border-[#c8e6c9]/60 shadow-2xs">
            <Mail className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Live Test SMS Main Panel */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Panel Header: Title + Status Pill */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Live Test SMS Feed</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-extrabold uppercase border border-orange-200">
                FOX SMS
              </span>
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

        {/* Toolbar Row: LIVE pill, Refresh, Clear, Export */}
        <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 flex-wrap justify-between">
          <div className="flex items-center gap-2 flex-wrap">
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
              <span>{isLiveConnected ? "LIVE ●" : "PAUSED"}</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-60"
              title="Refresh FOX SMS & Stream Hits"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
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

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{itemsList.length} OTPs Available</span>
            </span>
          </div>
        </div>

        {/* Filter Controls Row: Search Input */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by OTP code, phone number, service, message, or country..."
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
              No live test messages received yet. Click Refresh above or wait for incoming stream.
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
                    isNewest ? "bg-[#f4fbf7] ring-1 ring-emerald-400/20" : "bg-white"
                  }`}
                >
                  {/* Top Line: Flag + Country Name (Operator) + Source Tag + Elapsed Time + Timestamp */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Flag Image */}
                      <CountryFlag
                        countryCode={item.country || item.range}
                        size="lg"
                        className="mt-0.5 shrink-0"
                      />

                      <div className="min-w-0">
                        {/* Title: Country Name + Operator + Route Badge */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm tracking-tight leading-tight">
                            {cleanCountry}{!isGenericGateway ? ` - ${item.operator}` : ""}
                          </span>
                          {item.isFoxSms ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200 uppercase tracking-wide">
                              FOX SMS
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                              VOLTX SMS
                            </span>
                          )}
                        </div>

                        {/* Subtitle: Phone Number + Copy Button */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-slate-600 font-bold">
                            {item.number}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.number, `num_${item.id}`)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 transition cursor-pointer"
                            title="Copy phone number"
                          >
                            {copiedId === `num_${item.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
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

                  {/* Second Line: Social Brand Logo + Name + PROMINENT OTP BADGE (Just like Voltx) */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderBrandBadge(item.sid)}

                      {/* Prominent OTP Code Badge with 1-click copy */}
                      {item.otpCode && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.otpCode!, `otp_${item.id}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 active:scale-95 border border-emerald-300 text-emerald-900 rounded-md text-xs font-mono font-bold transition cursor-pointer shadow-2xs"
                          title="Click to copy OTP"
                        >
                          <Key className="w-3.5 h-3.5 text-emerald-600" />
                          <span>🔑 OTP: {item.otpCode}</span>
                          {copiedId === `otp_${item.id}` ? (
                            <span className="text-emerald-700 font-extrabold text-[11px]">Copied!</span>
                          ) : (
                            <Copy className="w-3 h-3 text-emerald-600/70" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Copy Full Message Button */}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.message, `msg_${item.id}`)}
                      className="text-slate-400 hover:text-slate-800 p-1 transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                      title="Copy message content"
                    >
                      {copiedId === `msg_${item.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Third Line: Real incoming message body with visible OTP */}
                  <div className="text-xs text-slate-800 leading-relaxed font-mono bg-slate-50/70 border border-slate-200/70 rounded-lg p-2.5 break-words font-medium">
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
                  <option value="Uber">Uber</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Imo">Imo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Custom OTP (Optional):</label>
                <input
                  type="text"
                  value={testCustomOtp}
                  onChange={(e) => setTestCustomOtp(e.target.value)}
                  placeholder="e.g. 589412 (Leave empty for random OTP)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-4 py-2 rounded-lg bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-60"
                >
                  {isSendingTest ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Test SMS</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
