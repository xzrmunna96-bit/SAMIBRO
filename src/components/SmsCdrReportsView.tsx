import React, { useState, useMemo, useEffect } from "react";
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  Filter,
  Layers,
  ChevronDown,
  Printer,
  FileText,
  FileCode,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { getCountryInfo } from "../services/countryHelper";
import { LiveConsoleHit } from "../services/voltxApi";
import { extractOtpCode } from "../services/telegramService";

export interface SmsCdrRecord {
  id: string;
  date: string;
  timestamp: number;
  range: string;
  number: string;
  cli: string;
  client: string;
  sms: string;
  otpCode: string | null;
  country: string;
  operator: string;
}

interface SmsCdrReportsViewProps {
  userEmail: string;
  liveHits: LiveConsoleHit[];
  liveSuccessOtps?: Array<{ otp_id: string; number: string; message: string; time: number }>;
  onSelectCountryRange?: (range: string, service?: string, countryName?: string) => void;
  onSelectService?: (service: string, range?: string) => void;
  onRefresh?: () => void;
}

export const SmsCdrReportsView = React.memo(function SmsCdrReportsView({
  userEmail,
  liveHits,
  liveSuccessOtps = [],
  onSelectCountryRange,
  onSelectService,
  onRefresh,
}: SmsCdrReportsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recordsPerPage, setRecordsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"date" | "range" | "number" | "cli">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    range: true,
    number: true,
    cli: true,
    client: true,
    sms: true,
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const copyToClipboard = (text: string, id: string, label = "Copied") => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  // Convert liveHits and successOtps into CDR records
  const cdrRecords: SmsCdrRecord[] = useMemo(() => {
    const list: SmsCdrRecord[] = [];
    const seen = new Set<string>();

    const formatDate = (ts: number | string) => {
      const d = typeof ts === "number" ? new Date(ts < 1e10 ? ts * 1000 : ts) : new Date(ts);
      if (isNaN(d.getTime())) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    };

    // 1. Live console and INTS hits
    liveHits.forEach((hit, idx) => {
      const num = (hit as any).number || hit.range || "";
      const info = getCountryInfo(num || hit.range);
      const otp = extractOtpCode(hit.message || "");
      const key = `${hit.time}_${num}_${hit.message?.slice(0, 20)}`;

      if (!seen.has(key)) {
        seen.add(key);
        const timestamp = typeof hit.time === "number" ? (hit.time < 1e10 ? hit.time * 1000 : hit.time) : Date.now() - idx * 2500;
        
        let rangeDisplayName = hit.range || `${info.name} bmet MAN 2`;
        if (/^\d+$/.test(rangeDisplayName) && rangeDisplayName.length <= 6) {
          rangeDisplayName = `${info.name} bmet MAN ${rangeDisplayName.slice(0, 2)}`;
        }

        list.push({
          id: `CDR-${idx}-${timestamp}`,
          date: formatDate(timestamp),
          timestamp,
          range: rangeDisplayName,
          number: num || "967734998590",
          cli: hit.sid || "Live Route",
          client: (hit as any).client || "",
          sms: hit.message || "Incoming verification message",
          otpCode: otp,
          country: info.name,
          operator: (hit as any).operator || "Direct Carrier Route",
        });
      }
    });

    // 2. Verified delivered OTPs
    liveSuccessOtps.forEach((otpItem, idx) => {
      const info = getCountryInfo(otpItem.number);
      const otp = extractOtpCode(otpItem.message);
      const key = `${otpItem.time}_${otpItem.number}_${otpItem.message.slice(0, 20)}`;

      if (!seen.has(key)) {
        seen.add(key);
        const timestamp = typeof otpItem.time === "number" ? (otpItem.time < 1e10 ? otpItem.time * 1000 : otpItem.time) : Date.now();
        list.push({
          id: `CDR-OTP-${otpItem.otp_id || idx}`,
          date: formatDate(timestamp),
          timestamp,
          range: `${info.name} bmet MAN 2`,
          number: otpItem.number,
          cli: "WhatsApp",
          client: "",
          sms: otpItem.message,
          otpCode: otp,
          country: info.name,
          operator: "INTS Carrier Gateway",
        });
      }
    });

    // Sort newest first by default
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [liveHits, liveSuccessOtps]);

  // Filter & Search
  const filteredRecords = useMemo(() => {
    let result = cdrRecords.filter((rec) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        rec.date.toLowerCase().includes(q) ||
        rec.range.toLowerCase().includes(q) ||
        rec.number.toLowerCase().includes(q) ||
        rec.cli.toLowerCase().includes(q) ||
        rec.client.toLowerCase().includes(q) ||
        rec.sms.toLowerCase().includes(q) ||
        (rec.otpCode && rec.otpCode.toLowerCase().includes(q))
      );
    });

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "date") {
        return sortOrder === "asc" ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
      }
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return result;
  }, [cdrRecords, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredRecords.slice(start, start + recordsPerPage);
  }, [filteredRecords, currentPage, recordsPerPage]);

  const handleSort = (field: "date" | "range" | "number" | "cli") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Export handlers
  const handleCopyTable = () => {
    const text = filteredRecords
      .map((r) => `${r.date}\t${r.range}\t${r.number}\t${r.cli}\t${r.client}\t${r.sms}`)
      .join("\n");
    navigator.clipboard.writeText(`Date\tRange\tNumber\tCLI\tClient\tSMS\n` + text);
    showToast(`Copied ${filteredRecords.length} records to clipboard!`);
  };

  const handleExportCsv = () => {
    const headers = ["Date,Range,Number,CLI,Client,SMS,OTP"];
    const rows = filteredRecords.map((r) => {
      const safeSms = `"${(r.sms || "").replace(/"/g, '""')}"`;
      return `"${r.date}","${r.range}","${r.number}","${r.cli}","${r.client}",${safeSms},"${r.otpCode || ""}"`;
    });
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CDR_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV file downloaded successfully!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="cdr-reports-stats-section" className="space-y-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP ACTION BUTTONS (Export Report & Show Report) */}
      <div className="flex items-center gap-2 bg-slate-200/80 p-2 rounded-t-sm border border-slate-300">
        <button
          type="button"
          onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
          className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold px-4 py-1.5 rounded-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Report</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onRefresh) onRefresh();
            showToast("CDR Reports synchronized with live stream!");
          }}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Show Report</span>
        </button>
      </div>

      {/* Export Dropdown Menu */}
      {isExportDropdownOpen && (
        <div className="absolute z-30 bg-white border border-slate-300 rounded-md shadow-lg p-2 flex flex-col gap-1 text-xs">
          <button
            type="button"
            onClick={() => {
              handleExportCsv();
              setIsExportDropdownOpen(false);
            }}
            className="text-left px-3 py-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium"
          >
            Export as CSV (.csv)
          </button>
          <button
            type="button"
            onClick={() => {
              handleExportCsv();
              setIsExportDropdownOpen(false);
            }}
            className="text-left px-3 py-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium"
          >
            Export as Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => {
              handlePrint();
              setIsExportDropdownOpen(false);
            }}
            className="text-left px-3 py-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium"
          >
            Export / Print PDF
          </button>
        </div>
      )}

      {/* 2. CDR REPORTS & STATS MAIN CARD */}
      <div className="bg-white border border-slate-300 shadow-2xs rounded-xs">
        {/* Card Header */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-800">
            CDR REPORTS & STATS
          </h2>
          <div className="text-[11px] text-slate-500 font-medium">
            Total Records: <span className="font-bold text-slate-800">{totalRecords}</span>
          </div>
        </div>

        {/* Card Controls Toolbar */}
        <div className="p-3 sm:p-4 space-y-3">
          {/* Top Search & Records selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Search:</span>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder=""
                  className="w-48 sm:w-64 pl-2 pr-7 py-1 text-xs border border-slate-300 rounded-xs focus:outline-none focus:border-blue-500 bg-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                  🔍
                </span>
              </div>
            </div>

            {/* Show Records Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Show Records:</span>
              <select
                value={recordsPerPage}
                onChange={(e) => {
                  setRecordsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-300 rounded-xs px-2 py-1 bg-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Action Buttons Row: Copy, CSV, Excel, PDF, Print | Show/Hide Columns */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyTable}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-xs border border-slate-300 transition cursor-pointer"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-xs border border-slate-300 transition cursor-pointer"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-xs border border-slate-300 transition cursor-pointer"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-xs border border-slate-300 transition cursor-pointer"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-xs border border-slate-300 transition cursor-pointer"
              >
                Print
              </button>
            </div>

            {/* Show / Hide Columns Dropdown Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-xs border border-slate-300 transition cursor-pointer flex items-center gap-1"
              >
                <span>Show / hide columns</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isColumnDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-300 rounded-md shadow-lg p-2 min-w-[160px] text-xs space-y-1.5">
                  {Object.keys(visibleColumns).map((colKey) => {
                    const key = colKey as keyof typeof visibleColumns;
                    return (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key]}
                          onChange={(e) =>
                            setVisibleColumns((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                          className="rounded text-blue-600"
                        />
                        <span className="capitalize">{key}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. TABLE EXACT TO SCREENSHOT */}
          <div className="overflow-x-auto border border-slate-300 rounded-xs">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-300">
                  {visibleColumns.date && (
                    <th
                      onClick={() => handleSort("date")}
                      className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap min-w-[140px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Date</span>
                        <span className="text-[10px] text-blue-600 font-mono">
                          {sortField === "date" ? (sortOrder === "asc" ? "▲" : "▼") : "▾"}
                        </span>
                      </div>
                    </th>
                  )}

                  {visibleColumns.range && (
                    <th
                      onClick={() => handleSort("range")}
                      className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap min-w-[130px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Range</span>
                        <span className="text-[10px] text-blue-600 font-mono">
                          {sortField === "range" ? (sortOrder === "asc" ? "▲" : "▼") : "▾"}
                        </span>
                      </div>
                    </th>
                  )}

                  {visibleColumns.number && (
                    <th
                      onClick={() => handleSort("number")}
                      className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap min-w-[120px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>Number</span>
                        <span className="text-[10px] text-blue-600 font-mono">
                          {sortField === "number" ? (sortOrder === "asc" ? "▲" : "▼") : "▾"}
                        </span>
                      </div>
                    </th>
                  )}

                  {visibleColumns.cli && (
                    <th
                      onClick={() => handleSort("cli")}
                      className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap min-w-[100px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>CLI</span>
                        <span className="text-[10px] text-blue-600 font-mono">
                          {sortField === "cli" ? (sortOrder === "asc" ? "▲" : "▼") : "▾"}
                        </span>
                      </div>
                    </th>
                  )}

                  {visibleColumns.client && (
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[80px]">
                      Client
                    </th>
                  )}

                  {visibleColumns.sms && (
                    <th className="py-2.5 px-3 min-w-[280px]">
                      SMS
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 bg-slate-50 text-xs">
                      No matching CDR records available.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec, idx) => {
                    return (
                      <tr key={rec.id} className="hover:bg-blue-50/40 transition">
                        {/* 1. Date */}
                        {visibleColumns.date && (
                          <td className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap text-slate-800 font-mono text-[11px] align-top">
                            {rec.date}
                          </td>
                        )}

                        {/* 2. Range */}
                        {visibleColumns.range && (
                          <td className="py-2.5 px-3 border-r border-slate-200 text-slate-800 font-medium text-xs align-top whitespace-nowrap">
                            <span
                              onClick={() => {
                                if (onSelectCountryRange) {
                                  onSelectCountryRange(rec.number.slice(0, 5), rec.cli, rec.country);
                                }
                              }}
                              className="hover:text-blue-600 cursor-pointer"
                              title="Click to allocate"
                            >
                              {rec.range}
                            </span>
                          </td>
                        )}

                        {/* 3. Number */}
                        {visibleColumns.number && (
                          <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-medium text-slate-900 text-xs align-top whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>{rec.number}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(rec.number, `num_${rec.id}`, "Number")}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title="Copy Number"
                              >
                                {copiedId === `num_${rec.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        )}

                        {/* 4. CLI (Social Media / App Name) - Clickable to open social stream */}
                        {visibleColumns.cli && (
                          <td className="py-2.5 px-3 border-r border-slate-200 text-slate-800 font-medium text-xs align-top whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectService) {
                                  onSelectService(rec.cli, rec.number.slice(0, 5));
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer text-left"
                              title={`Click to open ${rec.cli} social feed`}
                            >
                              {rec.cli}
                            </button>
                          </td>
                        )}

                        {/* 5. Client */}
                        {visibleColumns.client && (
                          <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 text-xs align-top whitespace-nowrap">
                            {rec.client || "—"}
                          </td>
                        )}

                        {/* 6. SMS Content with Extracted OTP Highlight */}
                        {visibleColumns.sms && (
                          <td className="py-2.5 px-3 text-slate-800 text-xs leading-normal max-w-sm sm:max-w-md break-words align-top">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {rec.otpCode && (
                                  <span className="inline-flex items-center gap-1 font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[11px] border border-amber-300 mr-1.5">
                                    <span>OTP:</span>
                                    <span>{rec.otpCode}</span>
                                  </span>
                                )}
                                <span className="select-all">{rec.sms}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(rec.otpCode || rec.sms, `sms_${rec.id}`, rec.otpCode ? "OTP Code" : "SMS Text")}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded shrink-0 cursor-pointer"
                                title="Copy Message / OTP"
                              >
                                {copiedId === `sms_${rec.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. BOTTOM PAGINATION & INFO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-600">
            <div>
              Showing {totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1} to{" "}
              {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} entries
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 py-1 border border-slate-300 rounded-xs bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="First Page"
              >
                First
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 border border-slate-300 rounded-xs bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Page"
              >
                Previous
              </button>
              <span className="px-2.5 py-1 font-bold bg-blue-600 text-white rounded-xs">
                {currentPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 border border-slate-300 rounded-xs bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next Page"
              >
                Next
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 py-1 border border-slate-300 rounded-xs bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Last Page"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
