import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Radio,
  Terminal,
  Activity,
  CheckCircle2,
  Lock,
  Headphones,
  Globe,
  ArrowLeft,
} from 'lucide-react';

export function LoginBrandShowcase() {
  return (
    <div className="w-full h-full flex flex-col justify-center p-6 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-[#0e5c75] via-[#0f6c7c] to-[#1da189] text-white relative overflow-hidden select-none">
      {/* Background organic fluid liquid blobs */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-[#34d399]/20 rounded-full blur-2xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/3 -right-20 w-72 h-72 bg-[#06b6d4]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-12 w-64 h-64 bg-[#22c55e]/30 rounded-full blur-2xl pointer-events-none" />

      {/* Organic fluid shapes SVG pattern overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none object-cover"
        viewBox="0 0 500 500"
        preserveAspectRatio="none"
      >
        <path
          d="M0,100 C150,200 350,0 500,100 L500,0 L0,0 Z"
          fill="rgba(255, 255, 255, 0.15)"
        />
        <path
          d="M0,350 C200,250 300,450 500,300 L500,500 L0,500 Z"
          fill="rgba(255, 255, 255, 0.1)"
        />
      </svg>

      {/* Brand Logo Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-lg shrink-0">
            <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
              SUPER X SMS
              <Sparkles className="w-4 h-4 text-amber-300" />
            </h1>
          </div>
        </div>
      </div>

      {/* Welcome Back Hero text */}
      <div className="relative z-10 space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm leading-tight">
          Welcome back!
        </h2>
        <p className="text-xs sm:text-sm text-emerald-50 max-w-xs font-medium leading-relaxed opacity-95">
          You can sign in to access with your existing profile and live SMS terminal.
        </p>
      </div>
    </div>
  );
}
