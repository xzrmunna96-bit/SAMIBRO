import React, { useState, useEffect } from "react";
import {
  getLocalMaintenanceState,
  updateGlobalMaintenanceMode,
  MaintenanceState,
} from "../services/maintenanceService";
import {
  Wrench,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
  Megaphone,
  Sparkles,
  Link,
  ShieldAlert,
  Radio,
} from "lucide-react";

interface MaintenanceControlCardProps {
  currentAdminEmail?: string;
  onToast?: (msg: string) => void;
}

export const MaintenanceControlCard: React.FC<MaintenanceControlCardProps> = ({
  currentAdminEmail,
  onToast,
}) => {
  const [maintenance, setMaintenance] = useState<MaintenanceState>(() =>
    getLocalMaintenanceState()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"popup" | "fullscreen">("popup");

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail) setMaintenance(e.detail);
      else setMaintenance(getLocalMaintenanceState());
    };
    window.addEventListener("super_x_maintenance_change", handleUpdate);
    return () => window.removeEventListener("super_x_maintenance_change", handleUpdate);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const updated = await updateGlobalMaintenanceMode(
        { enabled },
        currentAdminEmail || "Admin"
      );
      setMaintenance(updated);
      if (onToast) {
        onToast(
          enabled
            ? "⚠️ নোটিশ/মেইনটেন্যান্স মোড চালু হয়েছে! সকল ইউজার এই নোটিশ দেখতে পাবে।"
            : "✅ নোটিশ/মেইনটেন্যান্স বন্ধ করা হয়েছে! সব ব্রাউজারে ইউজাররা স্বাভাবিকভাবে ঢুকতে পারবে।"
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const updated = await updateGlobalMaintenanceMode(
        {
          mode: maintenance.mode || "popup",
          title: maintenance.title.trim(),
          message: maintenance.message.trim(),
          imageUrl: maintenance.imageUrl?.trim() || "",
          buttonText: maintenance.buttonText?.trim() || "অ্যাক্টিভেশন ফর্ম পূরণ করুন",
          buttonAction: maintenance.buttonAction || "activation_modal",
          buttonUrl: maintenance.buttonUrl?.trim() || "https://t.me/super_x_support",
        },
        currentAdminEmail || "Admin"
      );
      setMaintenance(updated);
      if (onToast) onToast("✅ নোটিশ ও মেইনটেন্যান্স কনফিগারেশন রিয়েল-টাইমে সেভ ও পাবলিশ হয়েছে!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      if (onToast) onToast("⚠️ Image size is large. Please select an image under 2.5MB.");
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setMaintenance((prev: MaintenanceState) => ({ ...prev, imageUrl: base64 }));
      if (onToast) onToast("📸 Image selected from gallery! Click 'Save & Publish' to push.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header with main toggle switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
              maintenance.enabled
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse"
                : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {maintenance.enabled ? <Megaphone className="w-6 h-6 animate-bounce" /> : <Wrench className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                ওয়েবসাইট নোটিশ ও মেইনটেন্যান্স কন্ট্রোলার (Master Notice Control)
              </h3>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                  maintenance.enabled
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {maintenance.enabled ? "🔴 নোটিশ সক্রিয় (ACTIVE)" : "🟢 সাইট লাইভ (ONLINE)"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              এক ক্লিকে নোটিশ চালু বা বন্ধ করুন। বন্ধ থাকলে কোনো ইউজার স্ক্রিনে কোনো পপআপ বা লক দেখতে পাবে না।
            </p>
          </div>
        </div>

        {/* Master ON/OFF Switch */}
        <label className="relative inline-flex items-center cursor-pointer select-none bg-slate-950 p-2.5 rounded-2xl border border-slate-800 shadow-inner">
          <input
            type="checkbox"
            checked={maintenance.enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={isSaving}
            className="sr-only peer"
          />
          <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[12px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
          <span className="ml-3 text-xs font-black text-slate-200">
            {maintenance.enabled ? "নোটিশ চালু (ON)" : "সাইট ওপেন (OFF)"}
          </span>
        </label>
      </div>

      {/* Notice Display Mode Selector */}
      <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          নোটিশ প্রদর্শনের ধরণ (Display Mode)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMaintenance({ ...maintenance, mode: "popup" })}
            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
              maintenance.mode === "popup"
                ? "bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <div className={`p-2 rounded-lg ${maintenance.mode === "popup" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-1.5">
                <span>পপআপ ব্যানার নোটিশ (Popup Banner Modal)</span>
                <span className="text-[10px] text-emerald-400 font-normal">[সুপারিশকৃত]</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                ওয়েবসাইটে ঢোকার সাথে সাথে একটি সুন্দর নোটিশ পপআপ আসবে। ইউজাররা নোটিশ পড়ে বন্ধ করে সাইট ব্যবহার করতে পারবে।
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMaintenance({ ...maintenance, mode: "fullscreen" })}
            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
              maintenance.mode === "fullscreen"
                ? "bg-amber-950/40 border-amber-500 text-white shadow-lg shadow-amber-950/50 ring-1 ring-amber-500/50"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <div className={`p-2 rounded-lg ${maintenance.mode === "fullscreen" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black flex items-center gap-1.5">
                <span>ফুলস্ক্রিন মেইনটেন্যান্স লক (Full Screen Maintenance Lock)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                ওয়েবসাইটে সম্পূর্ণ প্রবেশ সাময়িকভাবে বন্ধ থাকবে। বড় ধরণের আপডেটের সময় এটি ব্যবহার করুন।
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Form Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              নোটিশ টাইটেল (Title)
            </label>
            <input
              type="text"
              value={maintenance.title}
              onChange={(e) =>
                setMaintenance({ ...maintenance, title: e.target.value })
              }
              placeholder="ওয়েবসাইট মোটেন্যান্স নোটিশ 📢"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              বিস্তারিত বার্তা / নোটিশ (Notice Message)
            </label>
            <textarea
              rows={4}
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance({ ...maintenance, message: e.target.value })
              }
              placeholder="আমাদের ওয়েবসাইটের কাজ চলার কারণে পূর্বে যারা..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Action Button Label & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                বাটন টেক্সট (Button Label)
              </label>
              <input
                type="text"
                value={maintenance.buttonText || ""}
                onChange={(e) =>
                  setMaintenance({ ...maintenance, buttonText: e.target.value })
                }
                placeholder="অ্যাক্টিভেশন ফর্ম পূরণ করুন"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                বাটনের অ্যাকশন (Button Action)
              </label>
              <select
                value={maintenance.buttonAction || "activation_modal"}
                onChange={(e) =>
                  setMaintenance({
                    ...maintenance,
                    buttonAction: e.target.value as any,
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="activation_modal">অ্যাক্টিভেশন ফর্ম ওপেন হবে (Open Activation Form)</option>
                <option value="telegram">টেলিগ্রাম চ্যানেলে যাবে (Telegram Channel)</option>
                <option value="custom_url">কাস্টম লিংক (Custom Web Link)</option>
                <option value="dismiss">শুধুমাত্র নোটিশ বন্ধ হবে (Dismiss Modal)</option>
              </select>
            </div>
          </div>

          {maintenance.buttonAction === "custom_url" && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                কাস্টম লিংক URL (Website Link)
              </label>
              <input
                type="url"
                value={maintenance.buttonUrl || ""}
                onChange={(e) =>
                  setMaintenance({ ...maintenance, buttonUrl: e.target.value })
                }
                placeholder="https://example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          )}

          {/* Gallery Photo Upload & URL */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between uppercase tracking-wider">
              <span>নোটিশ ব্যানার / ছবি (Notice Banner Image)</span>
              {maintenance.imageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setMaintenance((prev: MaintenanceState) => ({ ...prev, imageUrl: "" }))
                  }
                  className="text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ছবি ডিলিট করুন
                </button>
              )}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={maintenance.imageUrl || ""}
                onChange={(e) => setMaintenance({ ...maintenance, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer transition text-xs font-bold shrink-0 border border-slate-700">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>গ্যালারি থেকে সিলেক্ট করুন</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Save & Sync Action */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={handleSaveDetails}
              disabled={isSaving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-teal-600/25 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? "সংরক্ষণ করা হচ্ছে..." : "রিয়েল-টাইমে সেভ ও পাবলিশ করুন"}</span>
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between text-center overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>লাইভ প্রিভিউ (User Screen Live Preview)</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              {maintenance.mode === "popup" ? "পপআপ মোড" : "মেইনটেন্যান্স মোড"}
            </span>
          </div>

          {/* Preview Container matching user UI */}
          <div className="w-full my-auto flex items-center justify-center">
            {maintenance.mode === "popup" ? (
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 text-slate-800 text-left">
                <div className="relative h-28 bg-slate-900 overflow-hidden">
                  <img
                    src={
                      maintenance.imageUrl ||
                      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <span className="text-[9px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded uppercase">
                      Important Notice
                    </span>
                    <h5 className="text-xs font-bold leading-tight mt-1 text-white truncate">
                      {maintenance.title || "ওয়েবসাইট মোটেন্যান্স নোটিশ 📢"}
                    </h5>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-slate-800 line-clamp-3">
                    {maintenance.message || "নোটিশ মেসেজ..."}
                  </div>
                  <button className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1">
                    <span>{maintenance.buttonText || "অ্যাক্টিভেশন ফর্ম পূরণ করুন"}</span>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-2xl p-4 text-center space-y-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold">
                  <Radio className="w-3 h-3 animate-ping" />
                  <span>SYSTEM MAINTENANCE ACTIVE</span>
                </div>
                {maintenance.imageUrl && (
                  <div className="h-24 rounded-lg overflow-hidden border border-amber-500/30">
                    <img src={maintenance.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <h5 className="text-xs font-bold text-white uppercase">
                  {maintenance.title || "Website Under Scheduled Maintenance"}
                </h5>
                <p className="text-[11px] text-slate-300 line-clamp-2">
                  {maintenance.message || "System updates in progress..."}
                </p>
                <div className="p-2 rounded-lg bg-cyan-600 text-white text-[11px] font-bold">
                  {maintenance.buttonText || "JOIN TELEGRAM CHANNEL"}
                </div>
              </div>
            )}
          </div>

          <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>স্ট্যাটাস: {maintenance.enabled ? "🔴 নোটিশ সক্রিয়" : "🟢 সাইট স্বাভাবিক"}</span>
            <span>সিঙ্ক: Instant Live</span>
          </div>
        </div>
      </div>
    </div>
  );
};

