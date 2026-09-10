import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineDetectorModal() {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });

  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showRestoredToast, setShowRestoredToast] = useState<boolean>(false);

  const checkRealConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      // Attempt a lightweight fetch with cache buster to verify real internet connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`/api/health?_t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(async () => {
        // Fallback to fetching root favicon or small asset if api/health is not available
        return await fetch(`/favicon.ico?_t=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (response && (response.ok || response.status < 500)) {
        setIsOffline(false);
        setShowRestoredToast(true);
        setTimeout(() => setShowRestoredToast(false), 3000);
      } else {
        setIsOffline(true);
      }
    } catch {
      // Network check failed -> genuinely offline
      setIsOffline(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      // Verify online state
      checkRealConnection();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestoredToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkRealConnection]);

  // Periodic low-frequency check only when offline to auto-recover when connection is restored
  useEffect(() => {
    if (!isOffline) return;

    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        checkRealConnection();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOffline, checkRealConnection]);

  return (
    <>
      {/* 1. Internet Restored Notification Banner */}
      <AnimatePresence>
        {showRestoredToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 bg-emerald-600 text-white px-5 py-3 rounded-full shadow-2xl border border-emerald-400/40 text-xs sm:text-sm font-bold tracking-tight pointer-events-none select-none"
          >
            <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
            <span>ইন্টারনেট সংযোগ চালু হয়েছে! (Connected)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. No Internet Connection Offline Popup Modal */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-sm overflow-hidden text-center p-6 space-y-5"
            >
              {/* Pulsing Offline Visual Icon */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 relative z-10">
                  <WifiOff className="w-8 h-8 stroke-[2.5]" />
                </div>
              </div>

              {/* Title & Detailed Bengali Explanation */}
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  আপনার ইন্টারনেট সংযোগ নেই
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  অনুগ্রহ করে আপনার ডিভাইসের <strong className="text-slate-800">মোবাইল ডেটা</strong> বা <strong className="text-slate-800">ওয়াইফাই (Wi-Fi)</strong> সংযোগটি পরীক্ষা করুন।
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200/80">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>No Internet Connection</span>
                </div>
              </div>

              {/* Action Buttons: Retry and Status */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={checkRealConnection}
                  disabled={isChecking}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 disabled:opacity-75"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'কানেকশন চেক হচ্ছে...' : 'পুনরায় চেষ্টা করুন (Retry)'}</span>
                </button>

                <p className="text-[11px] text-slate-400 font-medium">
                  ইন্টারনেট ফিরে পাওয়ার সাথে সাথে পোর্টাল স্বয়ংক্রিয়ভাবে চালু হয়ে যাবে।
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
