import React, { useState } from 'react';

interface FlagProps {
  countryCode: string;
  className?: string;
}

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'ALGERIA': 'dz',
  'MADAGASCAR': 'mg',
  'SIERRA LEONE': 'sl',
  'CAMEROON': 'cm',
  'BENIN': 'bj',
  'TOGO': 'tg',
  'BANGLADESH': 'bd',
  'TAIWAN': 'tw',
  'NEPAL': 'np',
  'BHUTAN': 'bt',
  'MALDIVES': 'mv',
  'MONGOLIA': 'mn',
  'TAJIKISTAN': 'tj',
  'TURKMENISTAN': 'tm',
  'AZERBAIJAN': 'az',
  'GEORGIA': 'ge',
  'KYRGYZSTAN': 'kg',
  'UZBEKISTAN': 'uz',
  'SAUDI ARABIA': 'sa',
  'SAUDI': 'sa',
  'UAE': 'ae',
  'UNITED ARAB EMIRATES': 'ae',
  'EMIRATES': 'ae',
  'KUWAIT': 'kw',
  'QATAR': 'qa',
  'OMAN': 'om',
  'BAHRAIN': 'bh',
  'JORDAN': 'jo',
  'LEBANON': 'lb',
  'SYRIA': 'sy',
  'IRAQ': 'iq',
  'YEMEN': 'ye',
  'INDIA': 'in',
  'PAKISTAN': 'pk',
  'TURKEY': 'tr',
  'MALAYSIA': 'my',
  'INDONESIA': 'id',
  'PHILIPPINES': 'ph',
  'THAILAND': 'th',
  'VIETNAM': 'vn',
  'UNITED KINGDOM': 'gb',
  'UK': 'gb',
  'BRITAIN': 'gb',
  'GERMANY': 'de',
  'FRANCE': 'fr',
  'ITALY': 'it',
  'SPAIN': 'es',
  'RUSSIA': 'ru',
  'UNITED STATES': 'us',
  'USA': 'us',
  'BRAZIL': 'br',
  'EGYPT': 'eg',
  'NIGERIA': 'ng',
  'KENYA': 'ke',
  'MOROCCO': 'ma',
  'GHANA': 'gh',
  'TANZANIA': 'tz',
  'UGANDA': 'ug',
  'SENEGAL': 'sn',
  'IVORY COAST': 'ci',
  "COTE D'IVOIRE": 'ci',
  'CENTRAL AFRICAN REPUBLIC': 'cf',
  'MONTENEGRO': 'me',
  'AFGHANISTAN': 'af',
  'ALBANIA': 'al',
  'ANDORRA': 'ad',
  'ANGOLA': 'ao',
  'ARGENTINA': 'ar',
  'ARMENIA': 'am',
  'AUSTRALIA': 'au',
  'AUSTRIA': 'at',
  'BELARUS': 'by',
  'BELGIUM': 'be',
  'BELIZE': 'bz',
  'BOSNIA': 'ba',
  'BOSNIA HERZEGOVINA': 'ba',
  'CHINA': 'cn',
  'COLOMBIA': 'co',
  'COSTA RICA': 'cr',
  'CROATIA': 'hr',
  'CUBA': 'cu',
  'CYPRUS': 'cy',
  'CZECH REPUBLIC': 'cz',
  'DENMARK': 'dk',
  'DOMINICAN REPUBLIC': 'do',
  'ECUADOR': 'ec',
  'EL SALVADOR': 'sv',
  'ESTONIA': 'ee',
  'ETHIOPIA': 'et',
  'FINLAND': 'fi',
  'GREECE': 'gr',
  'GUATEMALA': 'gt',
  'HAITI': 'ht',
  'HONDURAS': 'hn',
  'HONG KONG': 'hk',
  'HUNGARY': 'hu',
  'ICELAND': 'is',
  'IRAN': 'ir',
  'IRELAND': 'ie',
  'ISRAEL': 'il',
  'JAMAICA': 'jm',
  'JAPAN': 'jp',
  'KAZAKHSTAN': 'kz',
  'KOREA': 'kr',
  'LAOS': 'la',
  'LATVIA': 'lv',
  'LIBYA': 'ly',
  'LITHUANIA': 'lt',
  'LUXEMBOURG': 'lu',
  'MEXICO': 'mx',
  'MOLDOVA': 'md',
  'MOZAMBIQUE': 'mz',
  'MYANMAR': 'mm',
  'NETHERLANDS': 'nl',
  'NEW ZEALAND': 'nz',
  'NORWAY': 'no',
  'PANAMA': 'pa',
  'PARAGUAY': 'py',
  'PERU': 'pe',
  'POLAND': 'pl',
  'PORTUGAL': 'pt',
  'ROMANIA': 'ro',
  'RWANDA': 'rw',
  'SERBIA': 'rs',
  'SINGAPORE': 'sg',
  'SLOVAKIA': 'sk',
  'SLOVENIA': 'si',
  'SOMALIA': 'so',
  'SOUTH AFRICA': 'za',
  'SWEDEN': 'se',
  'SWITZERLAND': 'ch',
  'TUNISIA': 'tn',
  'UKRAINE': 'ua',
  'URUGUAY': 'uy',
  'VENEZUELA': 've',
  'ZAMBIA': 'zm',
  'ZIMBABWE': 'zw',
};

export function getIsoFromCountryInput(rawInput: string): string | null {
  if (!rawInput) return null;
  const clean = rawInput
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\d+/g, '')
    .replace(/xxx/gi, '')
    .replace(/[^\w\s]/gi, '')
    .trim()
    .toUpperCase();

  if (!clean) return null;

  if (clean.length === 2 && /^[A-Z]{2}$/.test(clean)) {
    return clean.toLowerCase();
  }

  if (COUNTRY_NAME_TO_ISO[clean]) {
    return COUNTRY_NAME_TO_ISO[clean];
  }

  for (const [key, iso] of Object.entries(COUNTRY_NAME_TO_ISO)) {
    if (clean.includes(key) || key.includes(clean)) {
      return iso;
    }
  }

  return null;
}

export function CountryFlag({ countryCode, className = "w-10 h-7 rounded-sm shadow-xs object-cover" }: FlagProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const iso = getIsoFromCountryInput(countryCode);

  if (iso && !imgFailed) {
    return (
      <div className="relative inline-block shrink-0 overflow-hidden rounded-xs border border-slate-200/90 shadow-2xs group hover:scale-105 transition-all duration-300">
        <img
          src={`https://flagcdn.com/w160/${iso}.png`}
          alt={countryCode || 'Country Flag'}
          onError={() => setImgFailed(true)}
          className={`${className} animate-flag-float object-cover`}
          loading="lazy"
        />
        {/* Glossy sheen overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
      </div>
    );
  }

  // High quality Globe fallback (NO blue box with white circle!)
  return (
    <div className={`${className} animate-flag-float relative flex items-center justify-center bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-950 rounded-xs border border-blue-400/40 shadow-xs overflow-hidden`}>
      <svg className="w-5 h-5 text-blue-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m18 0a9 9 0 01-9 9m9-9a9 9 0 00-9-9m0 18a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    </div>
  );
}
