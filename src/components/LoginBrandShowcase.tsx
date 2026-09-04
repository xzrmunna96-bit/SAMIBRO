import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Radio,
  Server,
  Terminal,
  Activity,
  CheckCircle2,
  Lock,
  Headphones,
  Globe,
} from 'lucide-react';

export function LoginBrandShowcase() {
  return (
    <div className="w-full h-full flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* Background glowing ambient orbs */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative cyber grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Brand & Gateway Status Header */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 backdrop-blur-md shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold tracking-wide text-emerald-400 uppercase">
              Gateway v4.8 Online
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>99.9% UPTIME</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                SUPER X SMS
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-indigo-200 font-medium">
                Enterprise Telephony & Real-Time OTP Hub
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Dynamic Feature Showcase */}
      <div className="relative z-10 my-6 space-y-3">
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              2oo9 Terminal & Real-time Console
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono">
              ACTIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Multi-route SMS reception with instant OTP decoding, high-throughput delivery and live CDR analytics.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-[11px]">Anti-Block Shield</p>
              <p className="text-[10px] text-slate-400">Zero VPN Required</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-[11px]">Instant Routing</p>
              <p className="text-[10px] text-slate-400">&lt;200ms Latency</p>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900/60 border border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-slate-300 text-[11px]">
              256-Bit TLS Secured Gateway
            </span>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
      </div>

      {/* Bottom Footer & Direct Support Info */}
      <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] text-slate-300">Admin Support:</span>
          <a
            href="https://t.me/xzrmunna"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline transition"
          >
            @xzrmunna
          </a>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <Globe className="w-3.5 h-3.5" />
          <span>Global Access</span>
        </div>
      </div>
    </div>
  );
}
