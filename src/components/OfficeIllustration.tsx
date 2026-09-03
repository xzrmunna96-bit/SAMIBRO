import React from 'react';

export const OfficeIllustration = React.memo(function OfficeIllustration() {
  return (
    <div className="relative w-full flex items-center justify-center select-none overflow-visible p-1 sm:p-2">
      {/* Decorative ambient background glow behind illustration */}
      <div className="absolute w-36 h-36 bg-purple-200/30 rounded-full blur-xl pointer-events-none -z-10" />

      <svg
        viewBox="0 0 540 460"
        className="w-full max-w-[210px] sm:max-w-[260px] md:max-w-[290px] h-auto drop-shadow-xs transition-transform duration-300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3f4f8" />
          </linearGradient>
          <linearGradient id="chairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e9d5ff" />
            <stop offset="100%" stopColor="#d8b4fe" />
          </linearGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <linearGradient id="briefcaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Floor Base Shadow Line */}
        <ellipse cx="270" cy="408" rx="230" ry="12" fill="#e2e8f0" opacity="0.65" />
        <ellipse cx="150" cy="410" rx="90" ry="8" fill="#cbd5e1" opacity="0.5" />
        <ellipse cx="380" cy="410" rx="90" ry="8" fill="#cbd5e1" opacity="0.5" />

        {/* ================= DESK ================= */}
        {/* Desk back legs */}
        <line x1="175" y1="240" x2="145" y2="405" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" />
        <line x1="390" y1="240" x2="420" y2="405" stroke="#a78bfa" strokeWidth="5" strokeLinecap="round" />
        
        {/* Desk Crossbar */}
        <line x1="155" y1="360" x2="408" y2="360" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" opacity="0.7" />

        {/* Desk front legs */}
        <line x1="140" y1="240" x2="185" y2="405" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />
        <line x1="435" y1="240" x2="385" y2="405" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />

        {/* Desk Surface Tabletop */}
        <path
          d="M105 236 C105 233 107 231 110 231 L460 231 C463 231 465 233 465 236 L460 245 C460 247 458 249 455 249 L115 249 C112 249 110 247 110 245 Z"
          fill="#ede9fe"
          stroke="#c4b5fd"
          strokeWidth="2"
        />
        <rect x="110" y="244" width="348" height="4" rx="2" fill="#8b5cf6" opacity="0.6" />

        {/* ================= COMPUTER MONITOR ================= */}
        {/* Monitor Base & Neck */}
        <path d="M290 234 L284 218 L296 218 Z" fill="#94a3b8" />
        <ellipse cx="290" cy="234" rx="22" ry="4" fill="#cbd5e1" />
        <rect x="286" y="200" width="8" height="20" rx="2" fill="#94a3b8" />

        {/* Monitor Frame */}
        <rect
          x="215"
          y="115"
          width="150"
          height="98"
          rx="7"
          fill="#1e1b4b"
          stroke="#475569"
          strokeWidth="3"
        />
        {/* Monitor Screen Glass */}
        <rect
          x="219"
          y="119"
          width="142"
          height="88"
          rx="4"
          fill="url(#screenGrad)"
        />
        <rect x="219" y="196" width="142" height="11" rx="0" fill="#e2e8f0" />
        <circle cx="290" cy="201.5" r="1.5" fill="#64748b" />

        {/* Monitor Screen Content (Login UI representation inside screen) */}
        <g transform="translate(252, 126)">
          {/* Card container inside screen */}
          <rect x="0" y="0" width="76" height="66" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          {/* User circle icon */}
          <circle cx="38" cy="16" r="8" fill="#f3e8ff" />
          <circle cx="38" cy="13" r="3.5" fill="#a855f7" />
          <path d="M33 21 C33 18.5 35 17 38 17 C41 17 43 18.5 43 21 Z" fill="#a855f7" />
          {/* Input field 1 */}
          <rect x="10" y="28" width="56" height="6" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" />
          <rect x="14" y="30.5" width="22" height="1.5" rx="0.75" fill="#94a3b8" />
          {/* Input field 2 */}
          <rect x="10" y="38" width="56" height="6" rx="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" />
          <circle cx="16" cy="41" r="1" fill="#94a3b8" />
          <circle cx="20" cy="41" r="1" fill="#94a3b8" />
          <circle cx="24" cy="41" r="1" fill="#94a3b8" />
          <circle cx="28" cy="41" r="1" fill="#94a3b8" />
          {/* Login button */}
          <rect x="16" y="48" width="44" height="6.5" rx="3.25" fill="#8b5cf6" />
          <rect x="26" y="50.5" width="24" height="1.8" rx="0.9" fill="#ffffff" />
        </g>

        {/* ================= DESK ACCESSORIES ================= */}
        {/* Coffee Mug (Red/Coral) */}
        <g transform="translate(325, 218)">
          <rect x="0" y="0" width="16" height="14" rx="2" fill="#ef4444" />
          <path d="M16 3 C19 3 20 5 20 7 C20 9 19 11 16 11" stroke="#ef4444" strokeWidth="2" fill="none" />
          {/* Steam animation */}
          <path
            d="M5 -3 Q3 -6 6 -9 Q9 -12 6 -15"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
            className="animate-pulse"
          />
          <path
            d="M10 -2 Q12 -5 9 -8 Q6 -11 9 -14"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
            className="animate-pulse"
          />
        </g>

        {/* File Binders (Yellow & Teal/Green) */}
        <g transform="translate(360, 185)">
          {/* Binder 1: Golden Yellow */}
          <rect x="0" y="0" width="12" height="46" rx="2" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
          <circle cx="6" cy="10" r="2.5" fill="#ffffff" opacity="0.8" />
          <rect x="3" y="18" width="6" height="14" rx="1" fill="#fef3c7" />
          
          {/* Binder 2: Vibrant Green */}
          <rect x="13" y="0" width="12" height="46" rx="2" fill="#10b981" stroke="#059669" strokeWidth="1" />
          <circle cx="19" cy="10" r="2.5" fill="#ffffff" opacity="0.8" />
          <rect x="16" y="18" width="6" height="14" rx="1" fill="#d1fae5" />
          
          {/* Binder 3: Cyan Blue */}
          <rect x="26" y="0" width="12" height="46" rx="2" fill="#06b6d4" stroke="#0891b2" strokeWidth="1" />
          <circle cx="32" cy="10" r="2.5" fill="#ffffff" opacity="0.8" />
          <rect x="29" y="18" width="6" height="14" rx="1" fill="#cffafe" />
        </g>

        {/* ================= PERSON & CHAIR ================= */}
        {/* Chair Backrest */}
        <rect
          x="88"
          y="235"
          width="62"
          height="75"
          rx="12"
          fill="url(#chairGrad)"
          stroke="#c084fc"
          strokeWidth="2"
        />
        {/* Chair Seat */}
        <rect
          x="88"
          y="300"
          width="68"
          height="14"
          rx="6"
          fill="#c084fc"
        />
        {/* Chair Legs */}
        <line x1="92" y1="314" x2="84" y2="405" stroke="#7e22ce" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="148" y1="314" x2="160" y2="405" stroke="#7e22ce" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="120" y1="314" x2="122" y2="402" stroke="#6b21a8" strokeWidth="4" strokeLinecap="round" />

        {/* Person - Legs & Pants */}
        <g>
          {/* Back leg */}
          <path
            d="M142 300 L188 300 L178 395 L198 398 L204 405 L168 405 L166 392 L142 300 Z"
            fill="#312e81"
          />
          {/* Front leg */}
          <path
            d="M136 295 C146 290 196 292 208 308 C218 322 200 376 195 396 L218 399 C220 401 220 405 214 406 L175 406 C173 400 178 370 184 326 C168 316 142 312 136 295 Z"
            fill="#1e1b4b"
          />
          {/* Black Shoes */}
          <path
            d="M174 397 C174 397 194 395 210 398 C218 400 226 405 224 407 L174 407 Z"
            fill="#0f172a"
          />
        </g>

        {/* Person - Torso & Magenta/Pink Top */}
        <g>
          {/* Torso */}
          <path
            d="M136 218 C144 212 165 216 172 230 C176 238 178 268 172 298 C158 302 138 296 135 285 Z"
            fill="url(#shirtGrad)"
          />
          {/* Arm extending to keyboard */}
          <path
            d="M152 226 C160 234 186 242 216 238 L232 238 C236 239 238 243 234 246 L212 248 C188 250 166 244 150 236 Z"
            fill="url(#shirtGrad)"
          />
          {/* Hand on desk typing */}
          <ellipse cx="233" cy="242" rx="5" ry="3" fill="#fbcfe8" />
        </g>

        {/* Person - Neck & Head */}
        <path d="M158 206 L164 219 L154 220 Z" fill="#fbcfe8" />
        <circle cx="165" cy="192" r="14" fill="#fbcfe8" />
        {/* Profile nose/chin indicator */}
        <path d="M175 190 C179 193 177 198 173 199" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" fill="none" />

        {/* Flowing Purple Hair */}
        <g>
          {/* Main hair body */}
          <path
            d="M154 180 C162 170 178 174 182 186 C186 198 180 206 172 208 C166 214 154 218 144 226 C136 234 125 250 128 265 C129 274 125 286 118 292 C108 278 110 252 118 238 C124 228 132 216 134 204 C136 192 144 184 154 180 Z"
            fill="url(#hairGrad)"
          />
          {/* Ponytail strand curl */}
          <path
            d="M170 180 C184 176 195 186 186 200 C178 205 174 195 170 180 Z"
            fill="#7c3aed"
          />
        </g>

        {/* ================= FLOOR ITEMS ================= */}
        {/* Blue Briefcase */}
        <g transform="translate(270, 345)">
          {/* Briefcase shadow */}
          <ellipse cx="28" cy="60" rx="30" ry="4" fill="#94a3b8" opacity="0.4" />
          {/* Briefcase Body */}
          <rect x="0" y="16" width="56" height="42" rx="4" fill="url(#briefcaseGrad)" stroke="#2563eb" strokeWidth="1.5" />
          {/* Center divider stripe */}
          <line x1="0" y1="36" x2="56" y2="36" stroke="#1d4ed8" strokeWidth="2" />
          {/* Silver Locks & Details */}
          <rect x="14" y="32" width="6" height="8" rx="1" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
          <rect x="36" y="32" width="6" height="8" rx="1" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
          {/* Handle */}
          <path d="M20 16 L20 8 C20 5 36 5 36 8 L36 16" stroke="#1e40af" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        {/* Potted Plant with Whimsical Leaves */}
        <g transform="translate(350, 275)">
          {/* Plant Shadow */}
          <ellipse cx="60" cy="130" rx="34" ry="6" fill="#94a3b8" opacity="0.4" />
          
          {/* Leaves */}
          {/* Leaf 1: Vibrant Magenta/Pink Leaf */}
          <path
            d="M48 65 C20 40 10 70 30 90 C45 105 52 95 48 65 Z"
            fill="#f43f5e"
            opacity="0.9"
          />
          <path d="M48 65 Q35 80 40 92" stroke="#be123c" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Leaf 2: Deep Indigo / Violet Leaf */}
          <path
            d="M58 50 C55 10 88 15 82 55 C80 75 68 85 58 50 Z"
            fill="#4338ca"
          />
          <path d="M72 30 Q70 55 64 75" stroke="#312e81" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Leaf 3: Soft Pinkish Purple Leaf */}
          <path
            d="M65 55 C90 35 105 60 90 85 C78 98 68 88 65 55 Z"
            fill="#ec4899"
          />
          <path d="M65 55 Q85 68 76 88" stroke="#be185d" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Leaf 4: Lilac Leaf */}
          <path
            d="M55 70 C70 65 78 85 62 100 C55 102 52 90 55 70 Z"
            fill="#a855f7"
          />

          {/* Plant Pot (Deep Purple Geometric) */}
          <polygon
            points="38,88 78,88 72,130 44,130"
            fill="#4c1d95"
            stroke="#581c87"
            strokeWidth="1.5"
          />
          <ellipse cx="58" cy="88" rx="20" ry="4" fill="#6b21a8" />
          <line x1="42" y1="94" x2="74" y2="94" stroke="#7c3aed" strokeWidth="2" opacity="0.6" />
        </g>

        {/* ================= FLOATING BADGES (Animated Micro-Bounce) ================= */}
        {/* Badge 1: Red/Coral Email Envelope */}
        <g transform="translate(262, 54)" className="animate-bounce" style={{ animationDuration: '3.2s' }}>
          <circle cx="15" cy="15" r="14" fill="#ef4444" filter="url(#badgeShadow)" />
          <path
            d="M8 10 H22 V19 C22 19.5 21.5 20 21 20 H9 C8.5 20 8 19.5 8 19 V10 Z"
            fill="#ffffff"
          />
          <path
            d="M8 11 L15 15.5 L22 11"
            stroke="#ef4444"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Badge 2: Yellow Lock Badge */}
        <g transform="translate(230, 78)" className="animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.4s' }}>
          <circle cx="13" cy="13" r="12" fill="#f59e0b" filter="url(#badgeShadow)" />
          {/* Lock Icon */}
          <rect x="8" y="11" width="10" height="8" rx="2" fill="#ffffff" />
          <path d="M10 11 V8.5 C10 6.5 16 6.5 16 8.5 V11" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="13" cy="14.5" r="1" fill="#d97706" />
        </g>

        {/* Badge 3: Green Checkmark Badge */}
        <g transform="translate(300, 50)" className="animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.8s' }}>
          <circle cx="12" cy="12" r="11" fill="#10b981" filter="url(#badgeShadow)" />
          <path
            d="M7.5 12 L10.5 15 L16.5 9"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* Badge 4: Blue User Profile Badge */}
        <g transform="translate(322, 78)" className="animate-bounce" style={{ animationDuration: '3.1s', animationDelay: '0.2s' }}>
          <circle cx="12" cy="12" r="11" fill="#3b82f6" filter="url(#badgeShadow)" />
          <circle cx="12" cy="9.5" r="3.2" fill="#ffffff" />
          <path
            d="M7.5 17 C7.5 14.5 9.5 13.5 12 13.5 C14.5 13.5 16.5 14.5 16.5 17"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
});
