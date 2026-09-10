import React, { useState, useEffect } from 'react';
import {
  Wrench,
  ShieldAlert,
  Radio,
  Send,
  RefreshCw,
  Cpu,
  ExternalLink,
  X,
  Megaphone,
  UserPlus,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  MaintenanceState,
  initMaintenanceRealtimeSync,
  getLocalMaintenanceState,
} from '../services/maintenanceService';

export function MaintenanceOverlay() {
  const [maintenance, setMaintenance] = useState<MaintenanceState>(() =>
    getLocalMaintenanceState()
  );
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);

  useEffect(() => {
    // 1. Listen for real-time Firebase & local storage changes
    initMaintenanceRealtimeSync((state) => {
      setMaintenance(state);
    });

    const handleLocalEvent = (e: any) => {
      if (e?.detail) setMaintenance(e.detail);
      else setMaintenance(getLocalMaintenanceState());
    };
    window.addEventListener('super_x_maintenance_change', handleLocalEvent);

    // 2. Poll server every 5 seconds for hosting parity
    const interval = setInterval(() => {
      fetch('/api/system/maintenance')
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.enabled === 'boolean') {
            setMaintenance((prev) => {
              if (
                prev.enabled !== data.enabled ||
                prev.mode !== data.mode ||
                prev.title !== data.title ||
                prev.message !== data.message ||
                prev.imageUrl !== data.imageUrl ||
                prev.buttonText !== data.buttonText ||
                prev.buttonAction !== data.buttonAction ||
                prev.buttonUrl !== data.buttonUrl ||
                prev.updatedAt !== data.updatedAt
              ) {
                return {
                  ...prev,
                  ...data,
                };
              }
              return prev;
            });
          }
        })
        .catch(() => null);
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('super_x_maintenance_change', handleLocalEvent);
    };
  }, []);

  // Update popup open state based on maintenance enabled status and dismissal session
  useEffect(() => {
    if (!maintenance.enabled) {
      setIsPopupOpen(false);
      return;
    }

    if (maintenance.mode === 'popup') {
      try {
        const dismissKey = `super_x_notice_dismissed_${maintenance.updatedAt || 'v1'}`;
        const isDismissed = sessionStorage.getItem(dismissKey);
        if (!isDismissed) {
          setIsPopupOpen(true);
        }
      } catch {
        setIsPopupOpen(true);
      }
    }
  }, [maintenance.enabled, maintenance.mode, maintenance.updatedAt]);

  // If maintenance is OFF -> Strictly render nothing!
  if (!maintenance.enabled) return null;

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    try {
      const dismissKey = `super_x_notice_dismissed_${maintenance.updatedAt || 'v1'}`;
      sessionStorage.setItem(dismissKey, 'true');
    } catch {
      // ignore
    }
  };

  const handleActionButtonClick = () => {
    if (maintenance.buttonAction === 'activation_modal') {
      handleClosePopup();
      window.dispatchEvent(new CustomEvent('open_active_account_modal'));
    } else if (maintenance.buttonAction === 'telegram') {
      window.open(maintenance.buttonUrl || 'https://t.me/super_x_support', '_blank');
    } else if (maintenance.buttonAction === 'custom_url' && maintenance.buttonUrl) {
      window.open(maintenance.buttonUrl, '_blank');
    } else {
      handleClosePopup();
    }
  };

  // =========================================================================
  // MODE 1: POPUP BANNER MODAL (Default Notice Dialog with Close button)
  // =========================================================================
  if (maintenance.mode === 'popup') {
    return (
      <>
        {/* Floating Re-Open Badge if user dismissed modal */}
        {!isPopupOpen && (
          <button
            onClick={() => setIsPopupOpen(true)}
            className="fixed top-4 left-4 z-40 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3.5 py-2 rounded-full shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95 border border-emerald-400/40 animate-pulse cursor-pointer"
            title="ওয়েবসাইট নোটিশ দেখুন"
          >
            <Megaphone className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>📢 নোটিশ দেখুন</span>
          </button>
        )}

        {/* Main Popup Modal Overlay */}
        {isPopupOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
            {/* Modal Card */}
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scaleUp">
              {/* Top Close Button */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={handleClosePopup}
                  className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-90 border border-white/30 backdrop-blur-sm group cursor-pointer"
                  title="বন্ধ করুন (Close)"
                  aria-label="Close Notice"
                >
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* Banner Image Container */}
              <div className="relative w-full h-48 sm:h-56 bg-slate-900 overflow-hidden shrink-0">
                <img
                  src={
                    maintenance.imageUrl ||
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
                  }
                  alt="Notice Banner"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                {/* Title overlay */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/90 text-slate-950 text-[11px] font-bold uppercase tracking-wider mb-1.5 shadow-md">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Important Notice</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold leading-snug drop-shadow-md text-white">
                    {maintenance.title || 'ওয়েবসাইট মোটেন্যান্স নোটিশ 📢'}
                  </h3>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-slate-800 text-sm sm:text-base leading-relaxed font-medium shadow-sm flex items-start gap-3">
                  <Megaphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line text-slate-800 font-medium">
                    {maintenance.message ||
                      'আমাদের ওয়েবসাইটের কাজ চলার কারণে পূর্বে যারা অ্যাকাউন্ট অ্যাক্টিভ করার জন্য রিকোয়েস্ট পাঠিয়েছেন, তাদের সবগুলো রিজেক্ট করা হয়েছে। আপনারা নতুন করে আবার অ্যাকাউন্ট অ্যাক্টিভ করার জন্য তথ্যগুলো প্রদান করুন।'}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleActionButtonClick}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-teal-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-400/30 cursor-pointer"
                  >
                    <UserPlus className="w-5 h-5 text-emerald-200" />
                    <span>{maintenance.buttonText || 'অ্যাক্টিভেশন ফর্ম পূরণ করুন'}</span>
                    <Sparkles className="w-4 h-4 text-amber-300 ml-1" />
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span>Super X SMS Official Portal</span>
                <button
                  onClick={handleClosePopup}
                  className="text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2 cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // =========================================================================
  // MODE 2: FULLSCREEN SYSTEM MAINTENANCE LOCK
  // =========================================================================
  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-amber-500 selection:text-slate-950 animate-fadeIn">
      {/* Background Animated Gradient Blobs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Cyber Grid Pattern Background */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Full-Screen Maintenance Card Container */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950/95 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(245,158,11,0.25)] backdrop-blur-xl text-center space-y-6 my-auto animate-scaleUp overflow-hidden">
        {/* Top Status Badge */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-widest">
            <Radio className="w-4 h-4 animate-ping text-amber-400" />
            <span>SYSTEM MAINTENANCE ACTIVE</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>ACCESS RESTRICTED</span>
          </span>
        </div>

        {/* Custom Uploaded Image Banner (if provided) */}
        {maintenance.imageUrl && (
          <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl group">
            <img
              src={maintenance.imageUrl}
              alt="Maintenance Banner"
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-amber-300">
              <span className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>SUPER X CORE ENGINE</span>
              </span>
              <span className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30 text-cyan-300">
                LIVE SYNC
              </span>
            </div>
          </div>
        )}

        {/* Maintenance Animated Icon Header */}
        {!maintenance.imageUrl && (
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-bounceOnce">
            <Wrench
              className="w-10 h-10 text-amber-400 animate-spin"
              style={{ animationDuration: '8s' }}
            />
          </div>
        )}

        {/* Title & Announcement */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-md">
            {maintenance.title || 'Website Under Scheduled Maintenance'}
          </h2>
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-slate-300 text-xs sm:text-sm leading-relaxed text-left space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>OFFICIAL MAINTENANCE ANNOUNCEMENT</span>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-200">
              {maintenance.message ||
                'We are currently performing important system upgrades and maintenance to serve you better. Access is temporarily suspended.'}
            </p>
          </div>
        </div>

        {/* Live Status Indicator & Action Button */}
        <div className="space-y-3 pt-2">
          <a
            href={maintenance.buttonUrl || 'https://t.me/super_x_support'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.4)] border border-cyan-300/40 transition transform hover:scale-[1.02] active:scale-98 cursor-pointer"
          >
            <Send className="w-4 h-4 text-cyan-200" />
            <span>
              {maintenance.buttonText && maintenance.buttonText !== 'অ্যাক্টিভেশন ফর্ম পূরণ করুন'
                ? maintenance.buttonText
                : 'JOIN TELEGRAM CHANNEL FOR LIVE UPDATES'}
            </span>
            <ExternalLink className="w-4 h-4 text-cyan-200 ml-auto" />
          </a>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center justify-center gap-2 animate-pulse font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Real-time listener active. Site will auto-unlock once admin turns maintenance off.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>SUPER X SMS OFFICIAL PORTAL</span>
          <span className="text-amber-400 font-bold">SYSTEM UPGRADE IN PROGRESS</span>
        </div>
      </div>
    </div>
  );
}

