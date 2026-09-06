import React, { useState, useEffect } from 'react';
import { X, Megaphone, UserPlus, Sparkles, AlertCircle } from 'lucide-react';

export interface PopupBannerData {
  enabled: boolean;
  imageUrl: string;
  title: string;
  message: string;
  buttonText: string;
  updatedAt?: number;
}

interface PopupBannerModalProps {
  onOpenActivationForm?: () => void;
}

export function PopupBannerModal({ onOpenActivationForm }: PopupBannerModalProps) {
  const [banner, setBanner] = useState<PopupBannerData>({
    enabled: true,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    title: 'ওয়েবসাইট মোটেন্যান্স নোটিশ 📢',
    message:
      'আমাদের ওয়েবসাইটের কাজ চলার কারণে পূর্বে যারা অ্যাকাউন্ট অ্যাক্টিভ করার জন্য রিকোয়েস্ট পাঠিয়েছেন, তাদের সবগুলো রিজেক্ট করা হয়েছে। আপনারা নতুন করে আবার অ্যাকাউন্ট অ্যাক্টিভ করার জন্য তথ্যগুলো প্রদান করুন।',
    buttonText: 'অ্যাক্টিভেশন ফর্ম পূরণ করুন',
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/popup-banner')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.banner) {
          setBanner(data.banner);
          if (data.banner.enabled) {
            const dismissed = sessionStorage.getItem('super_x_popup_banner_dismissed');
            if (!dismissed) {
              setIsOpen(true);
            }
          }
        }
      })
      .catch(() => {
        setIsOpen(true);
      })
      .finally(() => {
        setHasLoaded(true);
      });
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('super_x_popup_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleActionClick = () => {
    handleClose();
    if (onOpenActivationForm) {
      onOpenActivationForm();
    } else {
      window.dispatchEvent(new CustomEvent('open_active_account_modal'));
    }
  };

  if (!hasLoaded || !banner.enabled) return null;

  return (
    <>
      {/* Floating Notice Re-open Badge if modal was closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3.5 py-2 rounded-full shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95 border border-emerald-400/40 animate-pulse cursor-pointer"
          title="ওয়েবসাইট নোটিশ দেখুন"
        >
          <Megaphone className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>📢 নোটিশ দেখুন</span>
        </button>
      )}

      {/* Main Popup Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          {/* Card Container */}
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scaleUp">
            
            {/* Top Bar with Prominent Cross Close Icon */}
            <div className="absolute top-3 right-3 z-20">
              <button
                onClick={handleClose}
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
                src={banner.imageUrl}
                alt="Notice Banner"
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

              {/* Title overlay on image bottom */}
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/90 text-slate-950 text-[11px] font-bold uppercase tracking-wider mb-1.5 shadow-md">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Important Notice</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold leading-snug drop-shadow-md text-white">
                  {banner.title}
                </h3>
              </div>
            </div>

            {/* Modal Body / Notice Message */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-slate-800 text-sm sm:text-base leading-relaxed font-medium shadow-sm flex items-start gap-3">
                <Megaphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="whitespace-pre-line text-slate-800 font-medium">
                  {banner.message}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleActionClick}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-teal-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-400/30 cursor-pointer"
                >
                  <UserPlus className="w-5 h-5 text-emerald-200" />
                  <span>{banner.buttonText || 'অ্যাক্টিভেশন ফর্ম পূরণ করুন'}</span>
                  <Sparkles className="w-4 h-4 text-amber-300 ml-1" />
                </button>
              </div>
            </div>

            {/* Modal Footer / Close Button */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>Super X SMS Official Portal</span>
              <button
                onClick={handleClose}
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
