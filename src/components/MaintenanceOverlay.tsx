import React, { useState, useEffect } from 'react';
import { Wrench, ShieldAlert, Radio, Send, RefreshCw, Cpu, ExternalLink, Sparkles } from 'lucide-react';
import { MaintenanceState, initMaintenanceRealtimeSync, getLocalMaintenanceState } from '../services/maintenanceService';

export function MaintenanceOverlay() {
  const [maintenance, setMaintenance] = useState<MaintenanceState>(() => getLocalMaintenanceState());

  useEffect(() => {
    initMaintenanceRealtimeSync((state) => {
      setMaintenance(state);
    });

    // Poll /api/system/maintenance every 15 seconds for smooth performance
    const interval = setInterval(() => {
      fetch('/api/system/maintenance')
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.enabled === 'boolean') {
            setMaintenance((prev) => {
              if (
                prev.enabled !== data.enabled ||
                prev.title !== data.title ||
                prev.message !== data.message ||
                prev.imageUrl !== data.imageUrl
              ) {
                return data;
              }
              return prev;
            });
          }
        })
        .catch(() => null);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (!maintenance.enabled) return null;

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
            <Wrench className="w-10 h-10 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
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

        {/* Live Status Indicator & Join Telegram Button */}
        <div className="space-y-3 pt-2">
          <a
            href="https://t.me/super_x_support"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.4)] border border-cyan-300/40 transition transform hover:scale-[1.02] active:scale-98 cursor-pointer"
          >
            <Send className="w-4 h-4 text-cyan-200" />
            <span>JOIN TELEGRAM CHANNEL FOR LIVE UPDATES</span>
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
