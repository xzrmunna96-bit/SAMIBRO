import React, { useState, useEffect, useRef } from "react";
import { 
  Globe, 
  Hash, 
  Smartphone, 
  FileText, 
  Upload, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  FileSpreadsheet,
  RefreshCw,
  Plus
} from "lucide-react";
import { GLOBAL_COUNTRIES_LIST, GlobalCountryData } from "../services/countryHelper";
import { uploadManualNumbers } from "../services/manualNumberService";

interface AdminBotUploadAssistantProps {
  onSuccess: (message: string) => void;
  onClose?: () => void;
}

export function AdminBotUploadAssistant({ onSuccess, onClose }: AdminBotUploadAssistantProps) {
  const [step, setStep] = useState<"country" | "dialCode" | "platform" | "fileUpload" | "submitting" | "success">("country");
  
  // Form State
  const [selectedCountry, setSelectedCountry] = useState<GlobalCountryData | null>(null);
  const [customCountryName, setCustomCountryName] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [platform, setPlatform] = useState("All Social (WhatsApp/TG)");
  const [pastedNumbers, setPastedNumbers] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  
  // Search state for country selection
  const [countrySearch, setCountrySearch] = useState("");
  
  // Custom Platform State
  const [platformSearch, setPlatformSearch] = useState("");
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  
  // API response details
  const [uploadResult, setUploadResult] = useState<{
    addedCount: number;
    totalProcessed: number;
    totalPoolCount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Popular countries helper
  const popularCountries = GLOBAL_COUNTRIES_LIST.filter(c => 
    ["Bangladesh", "Sri Lanka", "India", "Pakistan", "Nepal", "Russia", "United Kingdom", "United States"].includes(c.name)
  );

  // Standard Social Media Platforms suggestions
  const platformSuggestions = [
    "WhatsApp",
    "Telegram",
    "IMO",
    "Viber",
    "All Social (WhatsApp/TG)",
    "Line",
    "WeChat",
    "Signal"
  ];

  // Auto-fill dial code when country changes
  useEffect(() => {
    if (selectedCountry) {
      setDialCode(selectedCountry.dialCode);
    }
  }, [selectedCountry]);

  // Filter country list
  const filteredCountries = GLOBAL_COUNTRIES_LIST.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dialCode.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Filter platform suggestions
  const filteredPlatforms = platformSuggestions.filter(p =>
    p.toLowerCase().includes(platformSearch.toLowerCase())
  );

  // Read file utility
  const handleFileContent = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setPastedNumbers(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileContent(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileContent(e.target.files[0]);
    }
  };

  // Submit flow
  const handlePublish = async () => {
    if (!pastedNumbers.trim()) {
      setErrorMsg("Please paste or upload some numbers first!");
      return;
    }

    const finalCountryName = selectedCountry ? selectedCountry.name : customCountryName || "Global";
    const finalFlag = selectedCountry ? selectedCountry.flag : "🌐";
    const finalDialCode = dialCode || (selectedCountry ? selectedCountry.dialCode : "");

    setStep("submitting");
    setErrorMsg("");

    try {
      const res = await uploadManualNumbers({
        country: finalCountryName,
        flag: finalFlag,
        dialCode: finalDialCode,
        platform: platform,
        numbersText: pastedNumbers
      });

      if (res.success) {
        setUploadResult({
          addedCount: res.addedCount,
          totalProcessed: res.addedCount, // Approximate matching
          totalPoolCount: res.totalPoolCount
        });
        setStep("success");
        onSuccess(res.message);
      } else {
        setErrorMsg(res.message || "Failed to process numbers.");
        setStep("fileUpload");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
      setStep("fileUpload");
    }
  };

  const handleReset = () => {
    setSelectedCountry(null);
    setCustomCountryName("");
    setDialCode("");
    setPlatform("All Social (WhatsApp/TG)");
    setPlatformSearch("");
    setPastedNumbers("");
    setFileName("");
    setStep("country");
  };

  return (
    <div className="flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-xs max-h-[70vh] sm:max-h-[60vh] h-[550px] w-full">
      
      {/* Bot Identity Header */}
      <div className="bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-900/35 relative">
            <span className="text-base">🤖</span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider">
              SUPER X BOT
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Real-time Termination Upload Assistant
            </p>
          </div>
        </div>
        
        {step !== "country" && step !== "submitting" && step !== "success" && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/50 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Interactive Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/5 flex flex-col justify-between">
        
        {/* Dynamic Bot Messages */}
        <div className="space-y-4">
          
          {/* Default bot welcoming bubble */}
          <div className="flex items-start gap-2.5 max-w-[85%]">
            <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
              🤖
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-3xs">
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
                Hello, Admin! I am ready to guide you to create a live Choose Termination route. 🚀
              </p>
            </div>
          </div>

          {/* Steps Rendered as Chat History */}
          
          {/* Step 1: Country History (Completed) */}
          {(step !== "country" || selectedCountry) && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-3xs">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    Please provide the destination <b>Country Name</b>:
                  </p>
                </div>
              </div>
              <div className="flex justify-end pr-2">
                <div className="bg-[#74A50C] text-white rounded-2xl rounded-tr-none px-4 py-2 shadow-2xs max-w-[80%] flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-xs font-black">
                    {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : customCountryName || "Global"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Dial Code History (Completed) */}
          {((step !== "country" && step !== "dialCode") || dialCode) && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-3xs">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    Awesome! Please confirm the country’s <b>Dial Code</b> (e.g. <code>+880</code> for BD):
                  </p>
                </div>
              </div>
              <div className="flex justify-end pr-2">
                <div className="bg-[#74A50C] text-white rounded-2xl rounded-tr-none px-4 py-2 shadow-2xs max-w-[80%] flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="text-xs font-black">{dialCode || "None"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Platform History (Completed) */}
          {((step !== "country" && step !== "dialCode" && step !== "platform") || platform) && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-3xs">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    Now, select or type the target <b>Social Media / Platform</b>:
                  </p>
                </div>
              </div>
              <div className="flex justify-end pr-2">
                <div className="bg-[#74A50C] text-white rounded-2xl rounded-tr-none px-4 py-2 shadow-2xs max-w-[80%] flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="text-xs font-black">{platform}</span>
                </div>
              </div>
            </div>
          )}

          {/* Active / Current Step Message Prompt */}
          
          {/* ACTIVE STEP 1: Country input & popular selections */}
          {step === "country" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-3xs space-y-2">
                  <p className="text-xs sm:text-sm text-slate-800 font-bold">
                    Select a popular country or type to find any global region:
                  </p>
                  
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Type country name..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Selection helper cards */}
              <div className="pl-8 space-y-2.5">
                {!countrySearch && (
                  <div className="flex flex-wrap gap-1.5">
                    {popularCountries.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setStep("dialCode");
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 shadow-3xs transition hover:border-slate-300 active:scale-95 cursor-pointer"
                      >
                        {c.flag} {c.name}
                      </button>
                    ))}
                  </div>
                )}

                {countrySearch && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-[150px] overflow-y-auto divide-y divide-slate-100">
                    {filteredCountries.slice(0, 5).map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c);
                          setCountrySearch("");
                          setStep("dialCode");
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 transition text-xs font-bold text-slate-700 flex items-center justify-between"
                      >
                        <span>{c.flag} {c.name}</span>
                        <span className="text-slate-400 font-normal">{c.dialCode}</span>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomCountryName(countrySearch);
                          setSelectedCountry(null);
                          setCountrySearch("");
                          setStep("dialCode");
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition text-xs font-bold text-indigo-600 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add custom country: "{countrySearch}"</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE STEP 2: Dial code config */}
          {step === "dialCode" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3.5 shadow-3xs space-y-3 w-full">
                  <p className="text-xs sm:text-sm text-slate-800 font-bold">
                    Configure Area/Dial Code:
                  </p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+880"
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setStep("platform")}
                      className="px-4 py-2 bg-[#74A50C] hover:bg-[#628B0A] text-white text-xs font-black rounded-lg transition flex items-center gap-1"
                    >
                      <span>Proceed</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE STEP 3: Platform Selection with Suggestion Auto-Suggest */}
          {step === "platform" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3.5 shadow-3xs space-y-3 w-full relative">
                  <p className="text-xs sm:text-sm text-slate-800 font-bold">
                    Select suggested media or type to search/create one:
                  </p>
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type platform (e.g. WhatsApp, Imo)..."
                      value={platformSearch}
                      onChange={(e) => {
                        setPlatformSearch(e.target.value);
                        setPlatform(e.target.value);
                        setShowPlatformDropdown(true);
                      }}
                      onFocus={() => setShowPlatformDropdown(true)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    
                    {showPlatformDropdown && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[140px] overflow-y-auto divide-y divide-slate-100">
                        {filteredPlatforms.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPlatform(p);
                              setPlatformSearch("");
                              setShowPlatformDropdown(false);
                              setStep("fileUpload");
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            {p}
                          </button>
                        ))}
                        {platformSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setPlatform(platformSearch);
                              setPlatformSearch("");
                              setShowPlatformDropdown(false);
                              setStep("fileUpload");
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-slate-50 transition flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add custom: "{platformSearch}"</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Popular quick-click pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {platformSuggestions.slice(0, 5).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPlatform(p);
                          setStep("fileUpload");
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-bold text-slate-600 rounded-lg transition"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE STEP 4: Number Paste & File Drop Area */}
          {step === "fileUpload" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3.5 shadow-3xs space-y-3 w-full">
                  <p className="text-xs sm:text-sm text-slate-800 font-bold">
                    Paste raw text (TXT / Excel / CSV rows) or upload file:
                  </p>
                  
                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragActive 
                        ? "border-indigo-500 bg-indigo-50/50" 
                        : "border-slate-300 hover:border-[#74A50C] bg-slate-50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".txt,.csv,.xlsx,.xls"
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 text-[#74A50C]" />
                    <span className="text-xs font-semibold text-slate-600">
                      {fileName ? `Selected: ${fileName}` : "Drag file here or click to select"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Supports TXT, CSV, EXCEL formats
                    </span>
                  </div>

                  {/* Textarea Paste */}
                  <textarea
                    placeholder="Paste your mobile numbers list here (one per line, e.g. 8801700000000)..."
                    value={pastedNumbers}
                    onChange={(e) => setPastedNumbers(e.target.value)}
                    rows={4}
                    className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  {errorMsg && (
                    <p className="text-[11px] font-bold text-rose-600">
                      ⚠️ {errorMsg}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!pastedNumbers.trim()}
                      onClick={handlePublish}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs ${
                        pastedNumbers.trim()
                          ? "bg-slate-900 text-white hover:bg-black"
                          : "bg-slate-300 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <span>🚀 Deploy Live Termination Route</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE STEP 5: Submitting Loading Animation */}
          {step === "submitting" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0 animate-spin">
                  ⚙️
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-3xs flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">
                    Deploying termination ranges & synchronizing Firestore live database...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE STEP 6: Success Terminal screen */}
          {step === "success" && uploadResult && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-[11px] flex items-center justify-center shrink-0">
                  🎉
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl rounded-tl-none p-4 shadow-2xs space-y-3 w-full">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                      Live Synchronization Complete!
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                    The country range has been built and uploaded successfully. It is now live in <b>Choose Termination</b> across all server & Vercel domains in real-time.
                  </p>

                  <div className="bg-white/80 border border-emerald-100 rounded-lg p-2.5 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Destination:</span>
                      <span className="font-bold text-slate-800">
                        {selectedCountry ? selectedCountry.name : customCountryName || "Global"} ({platform})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Added Numbers:</span>
                      <span className="font-bold text-slate-800 font-mono">{uploadResult.addedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total System Pool:</span>
                      <span className="font-bold text-[#74A50C] font-mono">{uploadResult.totalPoolCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition shadow-3xs"
                    >
                      ➕ Add Another Route
                    </button>
                    {onClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg transition"
                      >
                        Close Wizard
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footnote instruction */}
        {step !== "success" && step !== "submitting" && (
          <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3">
            Powered by Vercel Serverless & Firebase Firestore Synchronizer 📡
          </div>
        )}

      </div>
    </div>
  );
}
