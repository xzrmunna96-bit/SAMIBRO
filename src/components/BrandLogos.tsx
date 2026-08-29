import React from 'react';

// 1. WhatsApp Logo
export function WhatsAppLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="waGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#29E26E" />
          <stop offset="100%" stopColor="#1EBE5D" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#waGrad)" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 15C22.611 15 15 22.611 15 32C15 35.158 15.86 38.118 17.358 40.648L15.5 47.5L22.564 45.674C25.352 47.16 28.574 48 32 48C41.389 48 49 40.389 49 32C49 22.611 41.389 15 32 15ZM32 44.8C28.877 44.8 25.973 43.957 23.473 42.493L23.003 42.218L18.665 43.344L19.824 39.117L19.52 38.636C17.935 36.12 17.091 34.148 17.091 32C17.091 23.774 23.774 17.091 32 17.091C40.226 17.091 46.909 23.774 46.909 32C46.909 40.226 40.226 44.8 32 44.8ZM39.52 36.18C39.109 35.975 37.096 34.984 36.721 34.848C36.346 34.711 36.073 34.643 35.8 35.053C35.527 35.463 34.743 36.384 34.504 36.657C34.265 36.93 34.026 36.964 33.616 36.759C33.206 36.554 31.884 36.12 30.316 34.723C29.096 33.636 28.273 32.295 28.034 31.885C27.795 31.475 28.009 31.254 28.214 31.05C28.399 30.866 28.625 30.569 28.83 30.33C29.035 30.091 29.103 29.92 29.24 29.647C29.377 29.374 29.308 29.135 29.206 28.93C29.103 28.725 28.284 26.711 27.942 25.892C27.609 25.093 27.272 25.202 27.021 25.191H26.236C25.963 25.191 25.519 25.293 25.143 25.703C24.767 26.113 23.708 27.103 23.708 29.117C23.708 31.131 25.177 33.076 25.382 33.349C25.587 33.622 28.273 37.771 32.395 39.546C33.375 39.968 34.143 40.222 34.738 40.411C35.723 40.724 36.621 40.68 37.332 40.574C38.125 40.455 39.774 39.574 40.116 38.601C40.457 37.628 40.457 36.793 40.355 36.622C40.252 36.452 39.931 36.385 39.52 36.18Z"
        fill="white"
      />
    </svg>
  );
}

// 2. Telegram Logo
export function TelegramLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tgGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2BB8F7" />
          <stop offset="100%" stopColor="#1E96D8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#tgGrad)" />
      <path
        d="M14.5 31.2L44.8 19.5C46.2 18.9 47.4 19.8 46.9 21.8L41.7 46.2C41.3 48 40.2 48.4 38.7 47.5L30.8 41.6L27 45.3C26.5 45.8 26.1 46.2 25.1 46.2L25.7 37.7L41.2 23.7C41.9 23.1 41 22.7 40.2 23.2L21 35.3L14.5 31.2Z"
        fill="white"
      />
    </svg>
  );
}

// 3. Facebook Logo
export function FacebookLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#0866FF" />
      <path
        d="M35.6 52.8V33.8H41.8L42.7 26.6H35.6V22C35.6 19.9 36.2 18.5 39.2 18.5H43V12.1C42.3 12 39.9 11.8 37.1 11.8C31.2 11.8 27.2 15.4 27.2 21.8V26.6H21V33.8H27.2V52.8H35.6Z"
        fill="white"
      />
    </svg>
  );
}

// 4. IMO Logo
export function ImoLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="imoGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00B8FF" />
          <stop offset="100%" stopColor="#008EE0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#imoGrad)" />
      <circle cx="32" cy="32" r="20" fill="white" />
      <circle cx="21" cy="24.5" r="2.2" fill="#00A3E0" />
      <rect x="19" y="28.5" width="4" height="11" rx="2" fill="#00A3E0" />
      <path
        d="M26 28.5H29.6V30.2C30.4 28.9 31.8 28.2 33.4 28.2C35 28.2 36.3 29 36.9 30.4C37.8 28.9 39.3 28.2 41 28.2C43.2 28.2 44.8 29.7 44.8 32.2V39.5H41.2V33C41.2 31.8 40.5 31.2 39.4 31.2C38.3 31.2 37.4 32 37.4 33.3V39.5H33.8V33C33.8 31.8 33.1 31.2 32 31.2C30.9 31.2 30 32 30 33.3V39.5H26V28.5Z"
        fill="#00A3E0"
      />
    </svg>
  );
}

// 5. TikTok Logo
export function TikTokLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#000000" />
      <path
        d="M44.5 25.8C41.6 25.8 39 24.3 37.5 22.1V35C37.5 40.5 33 45 27.5 45C22 45 17.5 40.5 17.5 35C17.5 29.5 22 25 27.5 25C28.2 25 28.8 25.1 29.5 25.3V30.1C28.9 29.9 28.2 29.8 27.5 29.8C24.6 29.8 22.3 32.1 22.3 35C22.3 37.9 24.6 40.2 27.5 40.2C30.4 40.2 32.7 37.9 32.7 35V15H37.5C37.5 18.2 40.1 20.8 43.3 20.8H44.5V25.8Z"
        fill="#00F2FE"
      />
      <path
        d="M43.5 24.8C40.6 24.8 38 23.3 36.5 21.1V34C36.5 39.5 32 44 26.5 44C21 44 16.5 39.5 16.5 34C16.5 28.5 21 24 26.5 24C27.2 24 27.8 24.1 28.5 24.3V29.1C27.9 28.9 27.2 28.8 26.5 28.8C23.6 28.8 21.3 31.1 21.3 34C21.3 36.9 23.6 39.2 26.5 39.2C29.4 39.2 31.7 36.9 31.7 34V14H36.5C36.5 17.2 39.1 19.8 42.3 19.8H43.5V24.8Z"
        fill="#FF0050"
      />
      <path
        d="M44 25.3C41.1 25.3 38.5 23.8 37 21.6V34.5C37 40 32.5 44.5 27 44.5C21.5 44.5 17 40 17 34.5C17 29 21.5 24.5 27 24.5C27.7 24.5 28.3 24.6 29 24.8V29.6C28.4 29.4 27.7 29.3 27 29.3C24.1 29.3 21.8 31.6 21.8 34.5C21.8 37.4 24.1 39.7 27 39.7C29.9 39.7 32.2 37.4 32.2 34.5V14.5H37C37 17.7 39.6 20.3 42.8 20.3H44V25.3Z"
        fill="white"
      />
    </svg>
  );
}

// 6. Microsoft Logo
export function MicrosoftLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#1E293B" />
      <g transform="translate(18, 18)">
        <rect x="0" y="0" width="13" height="13" fill="#F25022" />
        <rect x="15" y="0" width="13" height="13" fill="#7FBA00" />
        <rect x="0" y="15" width="13" height="13" fill="#00A4EF" />
        <rect x="15" y="15" width="13" height="13" fill="#FFB900" />
      </g>
    </svg>
  );
}

// 7. Google Logo
export function GoogleLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      <path
        d="M44.5 32.5C44.5 31.4 44.4 30.5 44.2 29.5H32V34.8H39C38.7 36.4 37.7 37.9 36.3 38.8V42.1H40.7C43.3 39.7 44.8 36.2 44.8 32.5H44.5Z"
        fill="#4285F4"
      />
      <path
        d="M32 45.2C35.6 45.2 38.6 44 40.7 42.1L36.3 38.8C35.1 39.6 33.7 40.1 32 40.1C28.5 40.1 25.5 37.7 24.5 34.5H19.9V38.1C22 42.3 26.6 45.2 32 45.2Z"
        fill="#34A853"
      />
      <path
        d="M24.5 34.5C24.2 33.6 24.1 32.8 24.1 32C24.1 31.2 24.2 30.4 24.5 29.5V25.9H19.9C19 27.7 18.5 29.8 18.5 32C18.5 34.2 19 36.3 19.9 38.1L24.5 34.5Z"
        fill="#FBBC05"
      />
      <path
        d="M32 23.9C33.9 23.9 35.7 24.6 37 25.8L40.9 21.9C38.5 19.7 35.5 18.8 32 18.8C26.6 18.8 22 21.7 19.9 25.9L24.5 29.5C25.5 26.3 28.5 23.9 32 23.9Z"
        fill="#EA4335"
      />
    </svg>
  );
}

// 8. Apple Logo
export function AppleLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#111827" />
      <path
        d="M37.9 32.2C37.9 28.4 41 26.5 41.2 26.4C39.4 23.8 36.6 23.4 35.6 23.3C33.2 23.1 30.8 24.8 29.5 24.8C28.3 24.8 26.3 23.4 24.3 23.4C21.7 23.4 19.3 24.9 18 27.2C15.3 31.9 17.3 38.8 19.9 42.6C21.2 44.4 22.7 46.5 24.6 46.4C26.5 46.3 27.2 45.2 29.4 45.2C31.6 45.2 32.3 46.4 34.2 46.4C36.2 46.4 37.5 44.5 38.7 42.7C40.1 40.7 40.7 38.7 40.8 38.6C40.7 38.5 37.9 37.4 37.9 32.2ZM34.2 20.3C35.3 18.9 36 17 35.8 15.1C34.1 15.2 32 16.2 30.8 17.6C29.8 18.8 28.9 20.8 29.2 22.6C31.1 22.8 33.1 21.6 34.2 20.3Z"
        fill="white"
      />
    </svg>
  );
}

// 9. Instagram Logo
export function InstagramLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="igGrad" x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="30%" stopColor="#FF543E" />
          <stop offset="60%" stopColor="#C837AB" />
          <stop offset="100%" stopColor="#3771C8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#igGrad)" />
      <rect x="19" y="19" width="26" height="26" rx="7.5" stroke="white" strokeWidth="3.5" fill="none" />
      <circle cx="32" cy="32" r="6.5" stroke="white" strokeWidth="3.5" fill="none" />
      <circle cx="39" cy="25" r="1.8" fill="white" />
    </svg>
  );
}

// 10. Twitter / X Logo
export function TwitterXLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#0F172A" />
      <path
        d="M38.5 19H43.8L32.2 32.3L45.9 50H35.2L26.8 39.1L17.2 50H11.9L24.3 35.8L11.2 19H22.2L29.8 29.1L38.5 19ZM36.6 46.8H39.5L20.6 21.9H17.5L36.6 46.8Z"
        fill="white"
      />
    </svg>
  );
}

// 11. LinkedIn Logo
export function LinkedInLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#0A66C2" />
      <path
        d="M21.5 26.5H27V44H21.5V26.5ZM24.2 18.2C26 18.2 27.5 19.6 27.5 21.4C27.5 23.2 26 24.6 24.2 24.6C22.4 24.6 21 23.2 21 21.4C21 19.6 22.4 18.2 24.2 18.2ZM29.8 26.5H35.1V28.9H35.2C35.9 27.5 37.7 26 40.5 26C46.1 26 47.1 29.7 47.1 34.5V44H41.6V35.9C41.6 33.9 41.6 31.4 38.9 31.4C36.1 31.4 35.7 33.5 35.7 35.7V44H30.2L29.8 26.5Z"
        fill="white"
      />
    </svg>
  );
}

// 12. PayPal Logo
export function PayPalLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#003087" />
      <path
        d="M26.5 18H36.2C40.5 18 43.5 20.8 43 25C42.4 30.2 38.6 33.2 34.2 33.2H30.8L28.8 46H23.5L26.5 18Z"
        fill="#0079C1"
      />
      <path
        d="M29.5 24H37.8C41.5 24 44.1 26.4 43.6 30C43.1 34.4 39.9 37 36.1 37H33.2L31.8 46H27.5L29.5 24Z"
        fill="#00457C"
      />
    </svg>
  );
}

// 13. Amazon Logo
export function AmazonLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#131921" />
      {/* Amazon letter 'a' */}
      <path
        d="M24.8 33.5C24.8 35.8 26.2 37.2 28.5 37.2C30.6 37.2 32.8 35.7 33.8 34.2V36.8H37.5V23.5H33.8V26.2C32.6 24.8 30.5 23.8 28.5 23.8C24.8 23.8 21.8 26.8 21.8 30.8C21.8 35.2 24.8 38 28.8 38C30.4 38 32.2 37.3 33.2 36.3L32.2 34.2C31.5 34.8 30.2 35.3 29 35.3C26.8 35.3 25.2 33.8 25.2 31.8H37.5C37.5 31.2 37.5 30.5 37.5 29.8C37.5 25.2 34.2 22.5 29.5 22.5C24.5 22.5 21 26.2 21 31.2C21 36.5 24.8 40 30.2 40C32.8 40 35.5 38.8 37 37.2L35.2 35.2C34 36.5 32 37.5 30 37.5C26.5 37.5 24.8 35.2 24.8 33.5Z"
        fill="white"
      />
      {/* Amazon Smile Arrow */}
      <path
        d="M17.5 42.5C24 47 36 47.5 45.5 41.5"
        stroke="#FF9900"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M42.5 38.5L47.2 41.2L44.2 45.8C44 44.2 43.2 41 42.5 38.5Z"
        fill="#FF9900"
      />
    </svg>
  );
}

// 14. Shopee Logo
export function ShopeeLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#EE4D2D" />
      {/* Bag handle */}
      <path
        d="M26 23C26 19.7 28.7 17 32 17C35.3 17 38 19.7 38 23"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Shopping bag */}
      <path
        d="M20 23.5H44L41.5 47H22.5L20 23.5Z"
        fill="white"
        fillOpacity="0.15"
        stroke="white"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Shopee 'S' */}
      <path
        d="M35.2 28.5C34.5 27.8 33.3 27.5 32 27.5C29.8 27.5 28.5 28.8 28.5 30.5C28.5 34.5 36 33.2 36 38.2C36 41.2 33.5 42.8 30.8 42.8C28.8 42.8 27.2 41.9 26.2 40.8L27.6 39C28.4 39.9 29.6 40.5 30.8 40.5C32.8 40.5 33.8 39.5 33.8 38.2C33.8 34.8 26.2 35.8 26.2 30.5C26.2 27.8 28.5 25.5 32 25.5C33.8 25.5 35.5 26.2 36.6 27.2L35.2 28.5Z"
        fill="white"
      />
    </svg>
  );
}

// 15. AVABet Logo
export function AvaBetLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avaGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#avaGrad)" stroke="#EAB308" strokeWidth="1.5" />
      {/* Crown */}
      <path
        d="M24 23L27.5 27L32 21L36.5 27L40 23L39 30H25L24 23Z"
        fill="url(#goldGrad)"
      />
      {/* AVA Text */}
      <text
        x="32"
        y="42"
        fill="url(#goldGrad)"
        fontSize="11"
        fontWeight="900"
        textAnchor="middle"
        fontFamily="sans-serif"
        letterSpacing="1"
      >
        AVABET
      </text>
      <rect x="22" y="46" width="20" height="2" rx="1" fill="#EAB308" />
    </svg>
  );
}

// 16. Melbet Logo
export function MelbetLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#182030" stroke="#F59E0B" strokeWidth="1.5" />
      {/* Melbet M & Stripes */}
      <rect x="15" y="20" width="34" height="24" rx="4" fill="#0F172A" />
      <path
        d="M20 38V24H24.5L28.5 31.5L32.5 24H37V38H33V29.5L29.5 35.5H27.5L24 29.5V38H20Z"
        fill="#F59E0B"
      />
      <text
        x="42"
        y="36"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        BET
      </text>
    </svg>
  );
}

// 17. Bolt Logo
export function BoltLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#34D186" />
      {/* Bolt 'B' / Lightning motif */}
      <path
        d="M27 18H36C40.4 18 44 21.6 44 26C44 29.2 42.1 32 39.3 33.3C42.8 34.6 45 37.8 45 41.5C45 46.2 41.2 50 36.5 50H27V18ZM33.5 24.5V31.5H35.5C37.2 31.5 38.5 30.2 38.5 28.5C38.5 26.8 37.2 25.5 35.5 25.5H33.5V24.5ZM33.5 36.5V43.5H36.2C38 43.5 39.5 42 39.5 40.2C39.5 38.4 38 36.9 36.2 36.9H33.5V36.5Z"
        fill="white"
      />
    </svg>
  );
}

// 18. Uber Logo
export function UberLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#000000" />
      <circle cx="32" cy="32" r="26" stroke="#222222" strokeWidth="1" />
      <text
        x="32"
        y="37"
        fill="white"
        fontSize="13"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="sans-serif"
        letterSpacing="-0.5"
      >
        Uber
      </text>
    </svg>
  );
}

// 19. Verify Badge Logo
export function VerifyLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="verifyGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#verifyGrad)" />
      {/* Shield check */}
      <path
        d="M32 16L44 21V31C44 38.5 38.8 45.4 32 48C25.2 45.4 20 38.5 20 31V21L32 16Z"
        fill="white"
        fillOpacity="0.2"
        stroke="white"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M26 31.5L30 35.5L38 27.5"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 20. msverify / Microsoft Verify Logo
export function MsVerifyLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="msvGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0078D4" />
          <stop offset="100%" stopColor="#004578" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#msvGrad)" />
      {/* Microsoft 4-square mini & Key/Shield */}
      <rect x="22" y="20" width="8" height="8" fill="#F25022" />
      <rect x="34" y="20" width="8" height="8" fill="#7FBA00" />
      <rect x="22" y="32" width="8" height="8" fill="#00A4EF" />
      <rect x="34" y="32" width="8" height="8" fill="#FFB900" />
      <circle cx="42" cy="42" r="9" fill="#10B981" stroke="white" strokeWidth="2" />
      <path d="M39 42L41.5 44.5L45.5 39.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 21. AUTHMSG Logo
export function AuthMsgLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="authGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#authGrad)" stroke="#F59E0B" strokeWidth="1.5" />
      {/* Message bubble with keyhole */}
      <path
        d="M19 22C19 19.8 20.8 18 23 18H41C43.2 18 45 19.8 45 22V36C45 38.2 43.2 40 41 40H28L21 45V40H23C20.8 40 19 38.2 19 36V22Z"
        fill="#F59E0B"
      />
      {/* Keyhole / Lock */}
      <circle cx="32" cy="27" r="3" fill="#1E293B" />
      <path d="M30.5 28.5L33.5 28.5L34 34L30 34L30.5 28.5Z" fill="#1E293B" />
    </svg>
  );
}

// 22. iATSMS Logo
export function IatSmsLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="iatGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#iatGrad)" />
      {/* Signal / Antenna & SMS wave */}
      <path
        d="M20 38V30M26 38V24M32 38V18M38 38V24M44 38V30"
        stroke="#A5B4FC"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="43" r="3" fill="#38BDF8" />
      <text
        x="32"
        y="50"
        fill="white"
        fontSize="6.5"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        iATSMS
      </text>
    </svg>
  );
}

// 23. Huawei Logo
export function HuaweiLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#CF0A2C" />
      <g transform="translate(18, 16)" fill="white">
        <path d="M14 2C14 2 17 8 17 12C17 14 15.5 15.5 14 15.5C12.5 15.5 11 14 11 12C11 8 14 2 14 2Z" />
        <path d="M8 5C8 5 12 10 12 14C12 16 10.5 17 9 17C7.5 17 6.5 15.5 6.5 14C6.5 10 8 5 8 5Z" />
        <path d="M20 5C20 5 16 10 16 14C16 16 17.5 17 19 17C20.5 17 21.5 15.5 21.5 14C21.5 10 20 5 20 5Z" />
        <path d="M3 11C3 11 8 14 8 18C8 19.5 7 21 5.5 21C4 21 3 19.5 3 18C3 15 3 11 3 11Z" />
        <path d="M25 11C25 11 20 14 20 18C20 19.5 21 21 22.5 21C24 21 25 19.5 25 18C25 15 25 11 25 11Z" />
        <rect x="2" y="24" width="24" height="2.5" rx="1" fill="white" />
      </g>
    </svg>
  );
}

// Helper to get brand logo component by app ID or name
export function getBrandLogoComponent(appId: string, className = "w-9 h-9 sm:w-10 sm:h-10") {
  const norm = (appId || "").toLowerCase().trim();
  if (norm === 'wa' || norm.includes('whatsapp')) return <WhatsAppLogo className={className} />;
  if (norm === 'tg' || norm.includes('telegram')) return <TelegramLogo className={className} />;
  if (norm === 'fb' || norm.includes('facebook')) return <FacebookLogo className={className} />;
  if (norm === 'imo') return <ImoLogo className={className} />;
  if (norm === 'verify' || norm === 'verification') return <VerifyLogo className={className} />;
  if (norm.includes('msverify')) return <MsVerifyLogo className={className} />;
  if (norm.includes('authmsg')) return <AuthMsgLogo className={className} />;
  if (norm.includes('iatsms') || norm.includes('iat')) return <IatSmsLogo className={className} />;
  if (norm.includes('amazon')) return <AmazonLogo className={className} />;
  if (norm.includes('shopee')) return <ShopeeLogo className={className} />;
  if (norm.includes('avabet') || norm.includes('ava')) return <AvaBetLogo className={className} />;
  if (norm.includes('linkedin')) return <LinkedInLogo className={className} />;
  if (norm.includes('paypal')) return <PayPalLogo className={className} />;
  if (norm.includes('melbet')) return <MelbetLogo className={className} />;
  if (norm.includes('bolt')) return <BoltLogo className={className} />;
  if (norm.includes('uber')) return <UberLogo className={className} />;
  if (norm.includes('microsoft')) return <MicrosoftLogo className={className} />;
  if (norm.includes('tiktok')) return <TikTokLogo className={className} />;
  if (norm.includes('apple')) return <AppleLogo className={className} />;
  if (norm.includes('huawei')) return <HuaweiLogo className={className} />;
  if (norm.includes('google')) return <GoogleLogo className={className} />;
  if (norm.includes('instagram')) return <InstagramLogo className={className} />;
  if (norm.includes('twitter')) return <TwitterXLogo className={className} />;
  
  return <VerifyLogo className={className} />;
}

