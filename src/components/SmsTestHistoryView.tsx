import React, { useState, useEffect } from "react";
import {
  Calendar,
  Filter,
  RotateCcw,
  Plus,
  ChevronDown,
  Check,
  CheckCircle2,
  RefreshCw,
  Inbox,
  Clock
} from "lucide-react";
import { SmsTestRecord } from "./LiveTestSmsView";

interface SmsTestHistoryViewProps {
  userEmail: string;
  records: SmsTestRecord[];
  onClearHistory?: () => void;
  onRetest?: (record: SmsTestRecord) => void;
  onAddNumber?: (number: string, country: string) => void;
}

interface PeerSmsRecord {
  id: string;
  date: string;
  time: string;
  sid: string;
  serviceType: "whatsapp" | "bolt" | "facebook" | "authmsg" | "apple" | "google" | "telegram" | "tiktok" | "amazon" | "other";
  destination: string;
  country: string;
  operator: string;
  rangeName: string;
  message: string;
  isNew?: boolean;
}

export const SmsTestHistoryView = React.memo(function SmsTestHistoryView({
  records,
  onClearHistory,
  onAddNumber,
}: SmsTestHistoryViewProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sidFilter, setSidFilter] = useState("");
  const [prefixFilter, setPrefixFilter] = useState("");
  const [rangeFilter, setRangeFilter] = useState("All Ranges");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [addedNumberIds, setAddedNumberIds] = useState<Record<string, boolean>>({});

  // UTC Time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const month = String(now.getUTCMonth() + 1).padStart(2, "0");
      const day = String(now.getUTCDate()).padStart(2, "0");
      const year = now.getUTCFullYear();
      let hours = now.getUTCHours();
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const seconds = String(now.getUTCSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = String(hours).padStart(2, "0");
      setCurrentTimeStr(`${month}/${day}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Convert real records into table display format
  const allRecords: PeerSmsRecord[] = React.useMemo(() => {
    if (!records || records.length === 0) {
      return [];
    }

    return records.map((r, i) => {
      const d = new Date(r.timestamp);
      const sidLower = (r.service || "SMS").toLowerCase();
      let st: PeerSmsRecord["serviceType"] = "other";
      if (sidLower.includes("whatsapp")) st = "whatsapp";
      else if (sidLower.includes("bolt")) st = "bolt";
      else if (sidLower.includes("facebook") || sidLower.includes("fb")) st = "facebook";
      else if (sidLower.includes("auth")) st = "authmsg";
      else if (sidLower.includes("apple")) st = "apple";
      else if (sidLower.includes("google")) st = "google";
      else if (sidLower.includes("telegram")) st = "telegram";
      else if (sidLower.includes("tiktok")) st = "tiktok";
      else if (sidLower.includes("amazon")) st = "amazon";

      const maskedMsg = r.message
        ? r.message.replace(/\b\d{4,8}\b/g, (m) => "X".repeat(m.length))
        : `Verification code: ${r.otpCode || "XXXXXX"}`;

      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} UTC`;
      const timeStr = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")} UTC`;

      return {
        id: r.id || `real_${i}_${r.timestamp}`,
        date: dateStr,
        time: timeStr,
        sid: r.service || "SMS",
        serviceType: st,
        destination: r.testNumber,
        country: r.country || "International",
        operator: r.carrier || "Direct Route",
        rangeName: `${r.country || "Global"} - ${r.carrier || "Standard 01"}`,
        message: maskedMsg,
      };
    });
  }, [records]);

  // Extract unique ranges for dropdown from actual records
  const availableRanges = React.useMemo(() => {
    const ranges = new Set<string>();
    allRecords.forEach((r) => {
      if (r.rangeName) ranges.add(r.rangeName);
    });
    return Array.from(ranges);
  }, [allRecords]);

  // Filter records based on active user filter inputs
  const filteredRecords = allRecords.filter((rec) => {
    if (sidFilter.trim() && !rec.sid.toLowerCase().includes(sidFilter.toLowerCase())) {
      return false;
    }
    if (prefixFilter.trim() && !rec.destination.replace(/\D/g, "").startsWith(prefixFilter.trim().replace(/\D/g, ""))) {
      return false;
    }
    if (rangeFilter !== "All Ranges" && !rec.rangeName.toLowerCase().includes(rangeFilter.toLowerCase())) {
      return false;
    }
    if (dateFrom.trim() && !rec.date.toLowerCase().includes(dateFrom.toLowerCase())) {
      return false;
    }
    if (dateTo.trim() && !rec.date.toLowerCase().includes(dateTo.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setSidFilter("");
    setPrefixFilter("");
    setRangeFilter("All Ranges");
    setToastMessage("Filters reset to default.");
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(`Filters applied. Found ${filteredRecords.length} records.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddNumberClick = (id: string, destination: string, country: string) => {
    setAddedNumberIds((prev) => ({ ...prev, [id]: true }));
    if (onAddNumber) {
      onAddNumber(destination, country);
    }
    setToastMessage(`Number +${destination} (${country}) added successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Render Service Icon helper
  const renderServiceIcon = (type: PeerSmsRecord["serviceType"], sid: string) => {
    switch (type) {
      case "whatsapp":
        return (
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.97.54 1.77.828 2.796.828 3.182 0 5.77-2.587 5.77-5.767 0-3.18-2.588-5.767-5.77-5.767zm3.387 8.213c-.14.394-.817.755-1.129.805-.312.05-.717.072-2.18-.535-1.761-.73-2.883-2.52-2.97-2.637-.088-.117-.714-.95-.714-1.812 0-.862.453-1.287.615-1.463.162-.176.353-.22.47-.22.118 0 .236 0 .339.006.11.006.257-.042.403.31.147.352.5 1.22.544 1.308.044.088.073.191.015.309-.059.117-.088.191-.176.294-.088.103-.186.23-.265.31-.088.088-.18.184-.078.36.103.176.456.753.978 1.218.673.599 1.24.785 1.416.873.177.088.28.074.383-.044.103-.118.441-.515.559-.691.118-.177.235-.147.397-.089.162.059 1.029.485 1.206.574.176.088.294.132.338.206.044.073.044.426-.096.82z" />
            </svg>
          </span>
        );
      case "telegram":
        return (
          <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z"/>
            </svg>
          </span>
        );
      case "bolt":
        return (
          <span className="w-5 h-5 rounded-sm bg-teal-100 text-teal-700 border border-teal-300 flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
            B
          </span>
        );
      case "facebook":
        return (
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </span>
        );
      case "authmsg":
        return (
          <span className="w-5 h-5 rounded-sm bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
            A
          </span>
        );
      case "apple":
        return (
          <span className="w-5 h-5 rounded-sm bg-slate-200 text-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .61-2.64 1.37-.56.65-1.05 1.7-0.92 2.72 1.02.08 2.03-.49 2.64-1.24z" />
            </svg>
          </span>
        );
      case "google":
        return (
          <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
            G
          </span>
        );
      case "tiktok":
        return (
          <span className="w-5 h-5 rounded-full bg-slate-900 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
            T
          </span>
        );
      case "amazon":
        return (
          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
            a
          </span>
        );
      default:
        return (
          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
            {sid.charAt(0).toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 text-slate-800 animate-in fade-in duration-150 font-sans pb-16">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white border border-slate-700 shadow-2xl px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Row with Official Website Name: SUPER X SMS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 p-4 sm:p-5 rounded-xl border border-amber-200/80 shadow-xs">
        <div>
          {/* Website Name Display */}
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md text-xs tracking-wider shadow-2xs">
              OFFICIAL
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>SUPER X SMS</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Peer SMS Test History & Real Records</span>
          </p>
        </div>

        {/* Real-time status and time without fake stream generation */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Status Badge */}
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>REAL-TIME READY</span>
          </div>

          {/* UTC Clock Badge */}
          <div className="bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 font-semibold shadow-2xs">
            {currentTimeStr || "00:00:00 UTC"}
          </div>

          {/* Clear History Button (if records exist) */}
          {onClearHistory && allRecords.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Clear Real Test History"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Section Card */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* 1. Date from */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Date from
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            {/* 2. Date to */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Date to
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            {/* 3. SID (sender ID) */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                SID (sender ID)
              </label>
              <input
                type="text"
                value={sidFilter}
                onChange={(e) => setSidFilter(e.target.value)}
                placeholder="e.g. WhatsApp, Google..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition placeholder-slate-400"
              />
            </div>

            {/* 4. Prefix */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Prefix
              </label>
              <input
                type="text"
                value={prefixFilter}
                onChange={(e) => setPrefixFilter(e.target.value)}
                placeholder="e.g. 880, 1, 92, 44..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition placeholder-slate-400"
              />
            </div>

            {/* 5. Range */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Range
              </label>
              <div className="relative">
                <select
                  value={rangeFilter}
                  onChange={(e) => setRangeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition appearance-none cursor-pointer pr-8"
                >
                  <option value="All Ranges">All Ranges</option>
                  {availableRanges.map((rng) => (
                    <option key={rng} value={rng}>{rng}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action Buttons: Apply filters (Green) & Reset */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="submit"
              className="bg-[#70b82c] hover:bg-[#62a425] active:bg-[#54901f] text-white font-bold px-5 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Filter className="w-3.5 h-3.5 fill-current" />
              <span>Apply filters</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </div>

      {/* Chessboard / Grid-Styled Records Table */}
      <div className="bg-white border-2 border-slate-400 rounded-xl overflow-hidden shadow-sm">
        {/* Table Header Bar */}
        <div className="px-4 py-3 border-b-2 border-slate-300 flex items-center justify-between bg-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base tracking-wide">
              SUPER X SMS Records
            </h2>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
              filteredRecords.length > 0
                ? "text-emerald-800 bg-emerald-100 border-emerald-300"
                : "text-slate-600 bg-slate-200 border-slate-300"
            }`}>
              {filteredRecords.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />}
              {filteredRecords.length} Items
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 bg-slate-200/90 border border-slate-300 px-2 py-0.5 rounded tracking-wider uppercase">
            REAL SMS RECORDS
          </span>
        </div>

        {/* Table with Chessboard alternating grid pattern and clear column borders */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-200 border-b-2 border-slate-400 text-slate-800 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap w-[15%] border-r border-slate-300">DATE / TIME</th>
                <th className="py-3 px-3.5 whitespace-nowrap w-[13%] border-r border-slate-300">SOURCE (SID)</th>
                <th className="py-3 px-3.5 whitespace-nowrap w-[14%] border-r border-slate-300">DESTINATION</th>
                <th className="py-3 px-3.5 whitespace-nowrap w-[18%] border-r border-slate-300">COUNTRY / ROUTE</th>
                <th className="py-3 px-3.5 min-w-[200px] w-[26%] border-r border-slate-300">MESSAGE (DIGITS HIDDEN)</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap w-[14%]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 mb-1">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        কোনো এসএমএস টেস্ট রেকর্ড পাওয়া যায়নি (No Records Yet)
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        সকল ডেমো ডেটা রিমুভ করা হয়েছে। লাইভ টেস্ট এসএমএস পাঠালে বা রিয়েল ট্রাফিক রেকর্ড তৈরি হলে তা স্বয়ংক্রিয়ভাবে এই টেবিলে প্রদর্শিত হবে।
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => {
                  const isAdded = !!addedNumberIds[item.id];
                  // Chessboard alternating row background
                  const isEvenRow = idx % 2 === 0;
                  const rowBg = isEvenRow ? "bg-white" : "bg-slate-100/70";

                  return (
                    <tr
                      key={item.id || idx}
                      className={`${rowBg} hover:bg-amber-100/60 transition-colors border-b border-slate-300`}
                    >
                      {/* 1. DATE / TIME */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top border-r border-slate-300 font-medium">
                        <div className="font-bold text-slate-900 text-xs">{item.date}</div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">{item.time}</div>
                      </td>

                      {/* 2. SOURCE (SID) */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top border-r border-slate-300">
                        <div className="flex items-center gap-2">
                          {renderServiceIcon(item.serviceType, item.sid)}
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{item.sid}</span>
                        </div>
                      </td>

                      {/* 3. DESTINATION */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-slate-900 text-xs sm:text-[13px] align-top border-r border-slate-300">
                        {item.destination}
                      </td>

                      {/* 4. COUNTRY / ROUTE */}
                      <td className="py-3 px-3.5 whitespace-nowrap align-top border-r border-slate-300">
                        <div className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          {item.rangeName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.destination}
                        </div>
                      </td>

                      {/* 5. MESSAGE (DIGITS HIDDEN) */}
                      <td className="py-3 px-3.5 text-slate-800 text-xs leading-relaxed align-top font-medium break-words border-r border-slate-300">
                        {item.message}
                      </td>

                      {/* 6. ACTIONS (+ Add number button) */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap align-top">
                        <button
                          type="button"
                          onClick={() => handleAddNumberClick(item.id, item.destination, item.country)}
                          disabled={isAdded}
                          className={`inline-flex items-center justify-center gap-1 font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer ${
                            isAdded
                              ? "bg-slate-200 text-emerald-800 border border-emerald-400 cursor-default"
                              : "bg-[#70b82c] hover:bg-[#62a425] active:bg-[#54901f] text-white hover:shadow-sm"
                          }`}
                          title="Add number to allocation"
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>+ Add number</span>
                            </>
                          )}
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
    </div>
  );
});
