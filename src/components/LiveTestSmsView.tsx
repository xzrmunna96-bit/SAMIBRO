import React, { useState, useEffect } from "react";
import {
  FileText,
  Home,
  Copy,
  Check,
  Send,
  X,
  MessageSquare,
  Sparkles,
  Search,
  RotateCw,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { LiveConsoleHit } from "../services/voltxApi";
import { CountryFlag } from "./CountryFlags";
import { sendOtpToTelegram, extractOtpCode } from "../services/telegramService";

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
  onSelectService?: (service: string, range?: string) => void;
}

interface TestSmsItem {
  id: string;
  country: string;
  range: string;
  number: string;
  sid: string;
  message: string;
  time: string;
}

// Initial realistic items perfectly matching the reference screenshot
const INITIAL_DEMO_ITEMS: TestSmsItem[] = [
  {
    id: "t_1",
    country: "IVORY COAST",
    range: "9413",
    number: "2250702587327",
    sid: "Apple",
    message: "ùéèΩy@@REG-RESP?v=X;r=XXXXXXXX;r...",
    time: "Just now",
  },
  {
    id: "t_2",
    country: "YEMEN",
    range: "4935",
    number: "967737863500",
    sid: "Google",
    message: "G-XXXXXX التحقق من",
    time: "1s ago",
  },
  {
    id: "t_3",
    country: "IRAQ",
    range: "34948",
    number: "9647832488185",
    sid: "TikTok",
    message: "[#] [TikTok] XXXX يعد",
    time: "2s ago",
  },
  {
    id: "t_4",
    country: "BANGLADESH",
    range: "37342",
    number: "8801613546451",
    sid: "WhatsApp",
    message: "<#> Your WhatsApp code is 492-810. Do not share this code with anyone.",
    time: "3s ago",
  },
  {
    id: "t_5",
    country: "SAUDI ARABIA",
    range: "17590",
    number: "966508867576",
    sid: "WhatsApp",
    message: "لا تشارك رمز واتساب مع أحد: 839-204",
    time: "4s ago",
  },
  {
    id: "t_6",
    country: "SRI LANKA",
    range: "10348",
    number: "94719865432",
    sid: "WhatsApp",
    message: "Your WhatsApp code is 194-582. You can also tap this link to verify.",
    time: "5s ago",
  },
  {
    id: "t_7",
    country: "IRAQ",
    range: "27712",
    number: "9647901771166",
    sid: "TikTok",
    message: "التحقق يرجى إدخال رمز [TikTok] 682140",
    time: "7s ago",
  },
  {
    id: "t_8",
    country: "TAJIKISTAN",
    range: "2252",
    number: "992927001234",
    sid: "ULLAWEi",
    message: "[ULLAWEi] Your verification login pin is 501934",
    time: "9s ago",
  },
  {
    id: "t_9",
    country: "ALGERIA",
    range: "8821",
    number: "213550194827",
    sid: "Telegram",
    message: "Telegram code: 82014. You can also tap on this link to log in.",
    time: "12s ago",
  },
  {
    id: "t_10",
    country: "NIGERIA",
    range: "1290",
    number: "2348039281745",
    sid: "Facebook",
    message: "948201 is your Facebook security code",
    time: "15s ago",
  },
  {
    id: "t_11",
    country: "EGYPT",
    range: "4410",
    number: "201092837461",
    sid: "Google",
    message: "G-739201 هو رمز التحقق من Google لحسابك",
    time: "18s ago",
  },
];

const TOP_RANGES_DATA = [
  { range: "BANGLADESH 37342", country: "BANGLADESH", payout: "€0.038", traffic: "High", success: "99.8%" },
  { range: "IVORY COAST 9413", country: "IVORY COAST", payout: "€0.045", traffic: "Very High", success: "99.4%" },
  { range: "IRAQ 34948", country: "IRAQ", payout: "€0.052", traffic: "High", success: "99.1%" },
  { range: "YEMEN 4935", country: "YEMEN", payout: "€0.049", traffic: "High", success: "98.9%" },
  { range: "SAUDI ARABIA 17590", country: "SAUDI ARABIA", payout: "€0.035", traffic: "Moderate", success: "99.7%" },
  { range: "SRI LANKA 10348", country: "SRI LANKA", payout: "€0.042", traffic: "High", success: "99.2%" },
];

export function LiveTestSmsView({
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
  const [searchQuery, setSearchQuery] = useState("");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Merge live hits if available, or fall back to demo items matching screenshot
  const displayItems: TestSmsItem[] = React.useMemo(() => {
    if (liveHits && liveHits.length > 0) {
      return liveHits.map((h, i) => {
        const countryUpper = (h.country || (h as any).countryName || "BANGLADESH").toUpperCase();
        const rangeNum = h.range || (h as any).rangeCode || "37342";
        const phoneNum = (h as any).number || (h as any).testNumber || `88017${Math.floor(1000000 + Math.random() * 9000000)}`;
        return {
          id: (h as any).id || `hit_${i}_${Date.now()}`,
          country: countryUpper,
          range: rangeNum,
          number: phoneNum,
          sid: h.sid || (h as any).service || "WhatsApp",
          message: h.message || `<#> Your WhatsApp verification code is ${Math.floor(100000 + Math.random() * 900000)}`,
          time: typeof h.time === "number" ? new Date(h.time * (h.time < 1e10 ? 1000 : 1)).toLocaleTimeString() : (h.time || "Just now"),
        };
      });
    }
    return INITIAL_DEMO_ITEMS;
  }, [liveHits]);

  const filteredItems = displayItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.country.toLowerCase().includes(q) ||
      item.range.toLowerCase().includes(q) ||
      item.number.toLowerCase().includes(q) ||
      item.sid.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q)
    );
  });

  const handleSendTestSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumberInput.trim()) return;

    setIsSendingTest(true);
    const generatedOtp = testCustomOtp.trim() || String(Math.floor(100000 + Math.random() * 900000));
    let messageBody = "";

    if (testServiceInput === "WhatsApp") {
      messageBody = `<#> Your WhatsApp code is ${generatedOtp}. Do not share this code with anyone.`;
    } else if (testServiceInput === "Google") {
      messageBody = `G-${generatedOtp} هو رمز التحقق من Google لحسابك`;
    } else if (testServiceInput === "TikTok") {
      messageBody = `[#] [TikTok] ${generatedOtp} is your verification code`;
    } else if (testServiceInput === "Apple") {
      messageBody = `ùéèΩy@@REG-RESP?v=X;r=${generatedOtp};r...`;
    } else if (testServiceInput === "Telegram") {
      messageBody = `Telegram code: ${generatedOtp}. You can also tap on this link to log in.`;
    } else if (testServiceInput === "Facebook") {
      messageBody = `${generatedOtp} is your Facebook security code`;
    } else if (testServiceInput === "IMO") {
      messageBody = `imo verification code: ${generatedOtp}. Never share this code.`;
    } else {
      messageBody = `${testServiceInput} verification code: ${generatedOtp}`;
    }

    const testNow = Date.now();
    const resolvedCountry = testNumberInput.startsWith("880") ? "BANGLADESH" : testNumberInput.startsWith("966") ? "SAUDI ARABIA" : "INTERNATIONAL";

    // 1. Dispatch real-time Telegram notification
    sendOtpToTelegram({
      number: testNumberInput.trim(),
      service: testServiceInput,
      message: messageBody,
      time: testNow,
    }).catch(() => {});

    // 2. Add as live hit for instant reflection in live test feed and social app stream
    if (onAddLiveHit) {
      onAddLiveHit({
        id: `tst_live_${testNow}`,
        country: resolvedCountry,
        range: testNumberInput.slice(0, 5) || "37342",
        number: testNumberInput.trim(),
        sid: testServiceInput,
        message: messageBody,
        time: testNow,
        operator: "Live Test Direct",
      } as any);
    }

    setTimeout(() => {
      const newRecord: SmsTestRecord = {
        id: `TST-${Math.floor(100000 + Math.random() * 900000)}`,
        testNumber: testNumberInput.trim(),
        country: resolvedCountry,
        carrier: "Direct Gateway Route",
        service: testServiceInput,
        otpCode: generatedOtp,
        message: messageBody,
        timestamp: testNow,
        status: "DELIVERED",
        speedSec: +(0.8 + Math.random() * 0.5).toFixed(1),
      };

      if (onAddTestHistory) {
        onAddTestHistory(newRecord);
      }

      setIsSendingTest(false);
      setIsTestModalOpen(false);
    }, 400);
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Main Table Card (Yellow header: Live test SMS) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Yellow Header Banner */}
        <div className="bg-[#fbb03b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-950 text-sm tracking-wide">
            Live test SMS
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onRefreshHits) onRefreshHits();
              }}
              className="text-slate-900 hover:text-black p-1 rounded transition cursor-pointer"
              title="Refresh Stream"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 text-xs font-bold bg-white">
                <th className="py-3 px-4 w-[35%]">Live test SMS</th>
                <th className="py-3 px-4 w-[20%]">SID</th>
                <th className="py-3 px-4 w-[45%]">Message content</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                    No live test messages found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id || `item_${idx}`}
                    onClick={() => {
                      if (onSelectService) {
                        onSelectService(item.sid, item.range);
                      }
                    }}
                    className="hover:bg-amber-50/60 transition-colors group cursor-pointer"
                  >
                    {/* Column 1: Flag + Country Name & Range + Number */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          <CountryFlag
                            countryCode={item.country}
                            className="w-10 h-7 object-cover shadow-xs border border-slate-200 rounded-xs"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-wide">
                            {item.country} {item.range}
                          </div>
                          <div className="font-medium text-slate-700 text-xs tracking-tight">
                            {item.number}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: SID */}
                    <td className="py-3.5 px-4 font-normal text-slate-800 text-xs sm:text-sm align-top">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.sid}
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </span>
                    </td>

                    {/* Column 3: Message content */}
                    <td className="py-3.5 px-4 text-xs sm:text-[13px] leading-relaxed text-slate-900 font-normal align-top break-words">
                      <div className="flex items-start justify-between gap-2">
                        <span className="break-all whitespace-pre-wrap">{item.message}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.message, `msg_${idx}`);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-800 p-1 transition cursor-pointer shrink-0"
                          title="Copy Message"
                        >
                          {copiedId === `msg_${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Ranges Card (Yellow header: Top Ranges, shown at the bottom of screenshot) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-[#fbb03b] px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-950 text-sm tracking-wide">
            Top Ranges
          </h2>
          <span className="text-[11px] font-bold text-slate-900 bg-amber-300/60 px-2 py-0.5 rounded">
            Live Rates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 text-xs font-semibold bg-slate-50/60">
                <th className="py-2.5 px-4">Range</th>
                <th className="py-2.5 px-4">Country</th>
                <th className="py-2.5 px-4">Payout / SMS</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
              {TOP_RANGES_DATA.map((tr, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{tr.range}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <CountryFlag countryCode={tr.country} className="w-6 h-4 object-cover rounded-2xs border border-slate-200" />
                      <span>{tr.country}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-bold text-emerald-700 font-mono">{tr.payout}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active ({tr.success})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Button at Bottom Right (Orange circular button as shown in screenshot) */}
      <button
        type="button"
        onClick={() => setIsTestModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full bg-[#f77f00] hover:bg-[#e06d00] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Simulate / Send Test SMS"
      >
        <MessageSquare className="w-6 h-6 stroke-[2.2]" />
      </button>

      {/* Simulate Test SMS Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#fbb03b]" />
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono font-medium focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Service / SID:</label>
                <select
                  value={testServiceInput}
                  onChange={(e) => setTestServiceInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Google">Google</option>
                  <option value="Apple">Apple</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="ULLAWEi">ULLAWEi</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Custom OTP (Optional):</label>
                <input
                  type="text"
                  value={testCustomOtp}
                  onChange={(e) => setTestCustomOtp(e.target.value)}
                  placeholder="Auto-generated if empty (e.g. 492810)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500"
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
                  className="px-5 py-2 rounded-lg bg-[#fbb03b] hover:bg-[#f59e0b] text-slate-950 font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
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
}
