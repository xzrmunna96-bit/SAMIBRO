import React, { useState, useEffect } from 'react';
import { Send, X, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';

interface ManagerPopupData {
  enabled: boolean;
  title?: string;
  message?: string;
  buttonText?: string;
  telegramUrl?: string;
}

export const ManagerSupportPopupModal: React.FC = () => {
  const [popupData, setPopupData] = useState<ManagerPopupData | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const fetchPopupNotice = async () => {
    try {
      const res = await fetch('/api/manager-popup-notice?t=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data && data.success) {
        setPopupData({
          enabled: !!data.enabled,
          title: data.title || '🎧 MANAGER SUPPORT (ম্যানেজার সাপোর্ট)',
          message: data.message || 'ম্যানেজার সাপোর্ট: যেকোনো সমস্যা, একাউন্ট বা অতিরিক্ত রেঞ্জ পেতে সরাসরি ম্যানেজারের সাথে যোগাযোগ করুন।',
          buttonText: data.buttonText || 'CONTACT MANAGER (ম্যানেজার সাপোর্ট)',
          telegramUrl: data.telegramUrl || 'https://t.me/super_x_sms_support',
        });
      }
    } catch {
      // Keep previous state on error
    }
  };

  useEffect(() => {
    fetchPopupNotice();

    // Poll every 3 seconds for real-time status changes
    const interval = setInterval(fetchPopupNotice, 3000);

    const handleUpdateEvent = () => fetchPopupNotice();
    window.addEventListener('super_x_manager_popup_updated', handleUpdateEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('super_x_manager_popup_updated', handleUpdateEvent);
    };
  }, []);

  if (!popupData || !popupData.enabled || dismissed) {
    return null;
  }

  const handleOpenManagerTelegram = () => {
    window.open(popupData.telegramUrl || 'https://t.me/super_x_sms_support', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-x-0 top-3 z-[999999] px-3 sm:px-6 pointer-events-none flex justify-center animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="pointer-events-auto w-full max-w-2xl bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/50 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] p-4 sm:p-5 relative overflow-hidden text-white space-y-3">
        {/* Glowing Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-emerald-300 flex items-center gap-1.5 font-sans tracking-wide">
                <span>{popupData.title || '🎧 MANAGER SUPPORT (ম্যানেজার সাপোর্ট)'}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                  REAL-TIME LIVE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Official Telegram Manager Direct Support</p>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            title="Close Notice"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0 border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Message Content */}
        <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 leading-relaxed font-sans shadow-inner">
          <p className="whitespace-pre-line font-medium text-emerald-100">
            {popupData.message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer border border-slate-700"
          >
            Close
          </button>

          <button
            onClick={handleOpenManagerTelegram}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition cursor-pointer border border-emerald-400/30"
          >
            <Send className="w-4 h-4" />
            <span>{popupData.buttonText || 'CONTACT MANAGER (ম্যানেজার সাপোর্ট)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
