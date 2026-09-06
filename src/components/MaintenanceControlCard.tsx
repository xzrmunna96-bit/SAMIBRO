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
  const [previewMode, setPreviewMode] = useState(false);

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
            ? "⚠️ Maintenance mode is now LIVE across all hosting platforms!"
            : "✅ Maintenance mode is now OFF. Website is accessible to all users!"
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
          title: maintenance.title,
          message: maintenance.message,
          imageUrl: maintenance.imageUrl,
        },
        currentAdminEmail || "Admin"
      );
      setMaintenance(updated);
      if (onToast) onToast("✅ Maintenance banner details saved & synced globally!");
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
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Global Website Maintenance Mode
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  maintenance.enabled
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {maintenance.enabled ? "Maintenance Live (Locked)" : "Online (Normal)"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly lock or unlock the website across Vercel, Cloud Run, and Firebase in real time.
            </p>
          </div>
        </div>

        {/* Master ON/OFF Switch */}
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={maintenance.enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={isSaving}
            className="sr-only peer"
          />
          <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
          <span className="ml-3 text-xs font-bold text-slate-300">
            {maintenance.enabled ? "MAINTENANCE ON" : "NORMAL SITE"}
          </span>
        </label>
      </div>

      {/* Form Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Notice Title / Heading
            </label>
            <input
              type="text"
              value={maintenance.title}
              onChange={(e) =>
                setMaintenance({ ...maintenance, title: e.target.value })
              }
              placeholder="Website Under Scheduled Maintenance"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Announcement Message for Users
            </label>
            <textarea
              rows={4}
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance({ ...maintenance, message: e.target.value })
              }
              placeholder="We are currently upgrading servers..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium leading-relaxed resize-none"
            />
          </div>

          {/* Gallery Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Upload Custom Banner / Photo from Gallery</span>
              {maintenance.imageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setMaintenance((prev: MaintenanceState) => ({ ...prev, imageUrl: "" }))
                  }
                  className="text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Image
                </button>
              )}
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-950 border border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl cursor-pointer transition-all text-xs font-bold text-slate-300 hover:text-white">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Choose Image from Device / Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleSaveDetails}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save & Sync Globally"}</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>{previewMode ? "Hide Preview" : "Live Preview"}</span>
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Live Preview of User Screen
          </span>

          {maintenance.imageUrl ? (
            <div className="w-full max-h-40 rounded-xl overflow-hidden mb-3 border border-slate-800 bg-slate-900">
              <img
                src={maintenance.imageUrl}
                alt="Banner preview"
                className="w-full h-full object-contain max-h-40"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}

          <h4 className="text-sm font-bold text-white mb-2">
            {maintenance.title || "Website Under Scheduled Maintenance"}
          </h4>

          <p className="text-xs text-slate-400 max-w-sm line-clamp-3 leading-relaxed mb-3">
            {maintenance.message || "We are currently performing important updates..."}
          </p>

          <div className="w-full pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Status: {maintenance.enabled ? "🔴 Maintenance Active" : "🟢 Site Live"}</span>
            <span>Synced: Real-Time</span>
          </div>
        </div>
      </div>
    </div>
  );
};
