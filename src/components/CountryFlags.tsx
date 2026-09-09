import React, { useState } from 'react';
import { GLOBAL_COUNTRIES_LIST } from '../services/countryHelper';
import { getCountryFlagEmoji } from './LoggedInDashboard';

interface FlagProps {
  countryCode: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
  'BOLIVIA': 'bo',
  'CAMBODIA': 'kh',
  'ECUADOR': 'ec',
  'CHILE': 'cl',
  'CHINA': 'cn',
  'COLOMBIA': 'co',
  'COSTA RICA': 'cr',
  'CROATIA': 'hr',
  'CUBA': 'cu',
  'CYPRUS': 'cy',
  'CZECH REPUBLIC': 'cz',
  'DENMARK': 'dk',
  'DOMINICAN REPUBLIC': 'do',
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

/**
 * Universal ISO Code Resolver
 * Supports: Regional Indicator Emojis (🇲🇬), Full Names, Dial Codes, Ranges, etc.
 */
export function getIsoFromCountryInput(rawInput: string): string | null {
  if (!rawInput) return null;

  // 1. Check if the string contains Regional Indicator flag emoji (e.g. 🇲🇬 -> MG)
  const emojiMatches = rawInput.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
  if (emojiMatches && emojiMatches[0]) {
    try {
      const code1 = emojiMatches[0].codePointAt(0)! - 0x1F1E6 + 65;
      const code2 = emojiMatches[0].codePointAt(2)! - 0x1F1E6 + 65;
      if (code1 >= 65 && code1 <= 90 && code2 >= 65 && code2 <= 90) {
        return (String.fromCharCode(code1) + String.fromCharCode(code2)).toLowerCase();
      }
    } catch {
      // ignore
    }
  }

  // 2. Clean country name text
  const clean = rawInput
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\d+/g, '')
    .replace(/xxx/gi, '')
    .replace(/[^\w\s]/gi, '')
    .trim()
    .toUpperCase();

  // 3. Direct 2-letter ISO
  if (clean.length === 2 && /^[A-Z]{2}$/.test(clean)) {
    return clean.toLowerCase();
  }

  // 4. Check against static country map
  if (clean && COUNTRY_NAME_TO_ISO[clean]) {
    return COUNTRY_NAME_TO_ISO[clean];
  }

  // 5. Partial match against static country map
  if (clean) {
    for (const [key, iso] of Object.entries(COUNTRY_NAME_TO_ISO)) {
      if (clean.includes(key) || key.includes(clean)) {
        return iso;
      }
    }
  }

  // 6. Check against full GLOBAL_COUNTRIES_LIST
  if (clean) {
    const matched = GLOBAL_COUNTRIES_LIST.find(
      (c) =>
        c.name.toUpperCase() === clean ||
        c.name.toUpperCase().includes(clean) ||
        clean.includes(c.name.toUpperCase())
    );
    if (matched) {
      return matched.iso.toLowerCase();
    }
  }

  // 7. Check if digits in rawInput match a dialCode / phone prefix (e.g. 26134 -> 261 -> Madagascar)
  const digits = rawInput.replace(/\D/g, '');
  if (digits.length >= 1) {
    for (const len of [4, 3, 2, 1]) {
      const prefix = digits.slice(0, len);
      const matchDial = GLOBAL_COUNTRIES_LIST.find(
        (c) => c.dialCode.replace(/\D/g, '') === prefix
      );
      if (matchDial) {
        return matchDial.iso.toLowerCase();
      }
    }
  }

  return null;
}

export function CountryFlag({
  countryCode,
  className = "",
  size = "md",
}: FlagProps) {
  const [hasError, setHasError] = useState(false);
  const iso = getIsoFromCountryInput(countryCode);
  const flagUrl = iso ? `https://flagcdn.com/w80/${iso.toLowerCase()}.png` : null;
  const emoji = getCountryFlagEmoji(countryCode);

  // Default sizes matching user screenshot (rounded rectangle with subtle border)
  const sizeClasses: Record<string, string> = {
    sm: "w-6 h-4 rounded-xs border border-slate-300/80 shadow-2xs",
    md: "w-8 h-5.5 rounded-sm border border-slate-300/80 shadow-2xs",
    lg: "w-10 h-7 rounded-md border border-slate-300/90 shadow-2xs",
    xl: "w-12 h-8.5 rounded-md border border-slate-300/90 shadow-2xs",
  };

  const hasCustomSize = className.includes('w-') || className.includes('h-');
  const sizeClass = hasCustomSize ? "" : sizeClasses[size || 'md'];

  if (flagUrl && !hasError) {
    return (
      <img
        src={flagUrl}
        alt={countryCode || 'Country Flag'}
        onError={() => setHasError(true)}
        className={`object-cover shrink-0 select-none ${sizeClass} ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 leading-none select-none text-xl ${className}`}
      role="img"
      aria-label={countryCode || 'Country Flag'}
    >
      {emoji}
    </span>
  );
}

