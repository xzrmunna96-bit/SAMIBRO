// Official VoltxSMS / 2oo9 Live API Integration Layer
// Upstream Source: https://voltxsms.com/m29/#/doc/api

export const DEFAULT_VOLTX_ENDPOINT_KEY = 'M7ANNWJY6B2';
export const DEFAULT_MAUTH_API_KEY = 'M7ANNWJY6B2';
export const VOLTX_BACKEND_SLUG = 'MXS47FLFX0U';

export function getVoltxEndpointKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('voltx_endpoint_key');
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_VOLTX_ENDPOINT_KEY;
}

export function setVoltxEndpointKey(key: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    localStorage.setItem('voltx_endpoint_key', trimmed);
    localStorage.setItem('voltx_mauthapi_key', trimmed);
    window.dispatchEvent(new Event('voltx_key_updated'));
    broadcastSystemApiKeyToServer(trimmed).catch(() => {});
  }
}

export function getMauthApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('voltx_mauthapi_key') || localStorage.getItem('voltx_endpoint_key');
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_MAUTH_API_KEY;
}

export function setMauthApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    localStorage.setItem('voltx_mauthapi_key', trimmed);
    localStorage.setItem('voltx_endpoint_key', trimmed);
    window.dispatchEvent(new Event('voltx_key_updated'));
    broadcastSystemApiKeyToServer(trimmed).catch(() => {});
  }
}

/**
 * Sync active system API key set by Admin from server
 */
export async function syncSystemApiKeyFromServer(): Promise<string> {
  try {
    const res = await fetch('/api/system/api-key');
    if (res.ok) {
      const data = await res.json();
      if (data && data.apiKey && typeof data.apiKey === 'string') {
        const remoteKey = data.apiKey.trim();
        if (typeof window !== 'undefined') {
          const current = localStorage.getItem('voltx_mauthapi_key');
          if (current !== remoteKey) {
            localStorage.setItem('voltx_mauthapi_key', remoteKey);
            localStorage.setItem('voltx_endpoint_key', remoteKey);
            window.dispatchEvent(new Event('voltx_key_updated'));
          }
        }
        return remoteKey;
      }
    }
  } catch {
    // ignore
  }
  return getMauthApiKey();
}

/**
 * Broadcast updated API key from Admin panel to server so all users receive it
 */
export async function broadcastSystemApiKeyToServer(key: string): Promise<boolean> {
  try {
    const res = await fetch('/api/system/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key.trim() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getUpstreamBaseUrl(): string {
  return `https://api.2oo9.cloud/${VOLTX_BACKEND_SLUG}/tnevs/@public/api`;
}

export const PROXY_BASE_URL = '/api/voltx/@public/api';

export interface LiveConsoleHit {
  range: string;
  sid: string;
  message: string;
  time: number | string;
  operator?: string;
  country?: string;
}

export interface LiveAccessService {
  sid: string;
  last_at: number;
  ranges: string[];
}

export interface LiveSuccessOtp {
  otp_id: string;
  number: string;
  message: string;
  time: number;
}

export interface AllocatedNumber {
  full_number: string;
  national_number: string;
  no_plus_number: string;
  country: string;
  operator: string;
}

export interface ApiResponse<T> {
  meta: {
    code: number;
    status: string;
  };
  data: T | null;
  message?: string;
  rid?: string;
}

/**
 * Generic Fetcher executing requests to Voltx / 2oo9 endpoints
 */
export async function callVoltxApi<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    body?: any;
    apiKey?: string;
  } = {}
): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const apiKey = options.apiKey || getMauthApiKey();
  const endpointKey = getVoltxEndpointKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'mauthapi': apiKey,
    'x-voltx-endpoint-key': endpointKey,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST' && options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // 1. Try local dev proxy route first to avoid CORS in all browser modes
  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${PROXY_BASE_URL}${cleanEndpoint}`, fetchOptions);
    const json = await res.json();
    if (json && (json.meta || json.data !== undefined)) {
      return json;
    }
  } catch {
    // try direct fetch fallback
  }

  // 2. Direct HTTPS fetch to upstream CDN/API
  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const directRes = await fetch(`${getUpstreamBaseUrl()}${cleanEndpoint}`, fetchOptions);
    const json = await directRes.json();
    if (json && (json.meta || json.data !== undefined)) {
      return json;
    }
  } catch {
    // ignore
  }

  return {
    meta: { code: 500, status: 'network_error' },
    data: null,
    message: 'Unable to reach VoltxSMS server'
  };
}

/**
 * 1. Base API Ping: https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api
 */
export async function testBaseApi(apiKey?: string): Promise<ApiResponse<any>> {
  return await callVoltxApi('', { apiKey });
}

export function resolveCarrierDetails(range: string): { operator: string; country: string } {
  const digits = (range || '').replace(/\D/g, '');

  // 3-digit country dialing prefixes
  if (digits.startsWith('856')) return { operator: 'LAO TELECOM / Tplus', country: 'Laos' };
  if (digits.startsWith('855')) return { operator: 'SMART / METFONE', country: 'Cambodia' };
  if (digits.startsWith('852')) return { operator: 'CSL / HK TONE', country: 'Hong Kong' };
  if (digits.startsWith('853')) return { operator: 'CTM', country: 'Macau' };
  if (digits.startsWith('886')) return { operator: 'CHUNGHWA / TAIWAN MOBILE', country: 'Taiwan' };
  if (digits.startsWith('880')) return { operator: 'GRAMEENPHONE / ROBI', country: 'Bangladesh' };
  if (digits.startsWith('977')) return { operator: 'NCELL / NTC', country: 'Nepal' };
  if (digits.startsWith('975')) return { operator: 'B-MOBILE', country: 'Bhutan' };
  if (digits.startsWith('960')) return { operator: 'DHIRAAGU', country: 'Maldives' };
  if (digits.startsWith('976')) return { operator: 'MOBICOM', country: 'Mongolia' };
  if (digits.startsWith('992')) return { operator: 'TACELL', country: 'Tajikistan' };
  if (digits.startsWith('993')) return { operator: 'TMCELL', country: 'Turkmenistan' };
  if (digits.startsWith('994')) return { operator: 'AZERCELL', country: 'Azerbaijan' };
  if (digits.startsWith('995')) return { operator: 'MAGTICOM', country: 'Georgia' };
  if (digits.startsWith('996')) return { operator: 'MEGACOM', country: 'Kyrgyzstan' };
  if (digits.startsWith('998')) return { operator: 'UCELL', country: 'Uzbekistan' };

  // Middle East 3-digits
  if (digits.startsWith('966')) return { operator: 'STC / MOBILY', country: 'Saudi Arabia' };
  if (digits.startsWith('971')) return { operator: 'ETISALAT / DU', country: 'UAE' };
  if (digits.startsWith('965')) return { operator: 'ZAIN / OOREDOO', country: 'Kuwait' };
  if (digits.startsWith('974')) return { operator: 'OOREDOO / VODAFONE', country: 'Qatar' };
  if (digits.startsWith('968')) return { operator: 'OMANTEL', country: 'Oman' };
  if (digits.startsWith('973')) return { operator: 'BATELCO', country: 'Bahrain' };
  if (digits.startsWith('962')) return { operator: 'ZAIN / ORANGE', country: 'Jordan' };
  if (digits.startsWith('961')) return { operator: 'TOUCH / ALPHA', country: 'Lebanon' };
  if (digits.startsWith('963')) return { operator: 'SYRIATEL', country: 'Syria' };
  if (digits.startsWith('964')) return { operator: 'ASIACELL / ZAIN', country: 'Iraq' };
  if (digits.startsWith('967')) return { operator: 'YEMEN MOBILE', country: 'Yemen' };
  if (digits.startsWith('970')) return { operator: 'JAWWAL', country: 'Palestine' };
  if (digits.startsWith('972')) return { operator: 'PARTNER / CELLCOM', country: 'Israel' };

  // Africa 3-digits
  if (digits.startsWith('236')) return { operator: 'ORANGE CENTRAFRIQUE', country: 'Central African Republic' };
  if (digits.startsWith('261')) return { operator: 'AIRTEL', country: 'Madagascar' };
  if (digits.startsWith('229')) return { operator: 'MTN BENIN', country: 'Benin' };
  if (digits.startsWith('228')) return { operator: 'TOGO CELLULAIRE', country: 'Togo' };
  if (digits.startsWith('225')) return { operator: "ORANGE COTE D'IVOIRE", country: 'Ivory Coast' };
  if (digits.startsWith('237')) return { operator: 'ORANGE CAMEROUN', country: 'Cameroon' };
  if (digits.startsWith('221')) return { operator: 'ORANGE SENEGAL', country: 'Senegal' };
  if (digits.startsWith('234')) return { operator: 'MTN NIGERIA', country: 'Nigeria' };
  if (digits.startsWith('254')) return { operator: 'SAFARICOM', country: 'Kenya' };
  if (digits.startsWith('212')) return { operator: 'MAROC TELECOM', country: 'Morocco' };
  if (digits.startsWith('213')) return { operator: 'MOBILIS / DZEZZY', country: 'Algeria' };
  if (digits.startsWith('216')) return { operator: 'OOREDOO / TUNISIE', country: 'Tunisia' };
  if (digits.startsWith('218')) return { operator: 'LIBYANA', country: 'Libya' };
  if (digits.startsWith('232')) return { operator: 'ORANGE (AIRTEL)', country: 'Sierra Leone' };
  if (digits.startsWith('233')) return { operator: 'MTN GHANA', country: 'Ghana' };
  if (digits.startsWith('255')) return { operator: 'VODACOM', country: 'Tanzania' };
  if (digits.startsWith('256')) return { operator: 'MTN UGANDA', country: 'Uganda' };
  if (digits.startsWith('257')) return { operator: 'LUMITEL', country: 'Burundi' };
  if (digits.startsWith('258')) return { operator: 'VODACOM', country: 'Mozambique' };
  if (digits.startsWith('260')) return { operator: 'AIRTEL ZAMBIA', country: 'Zambia' };
  if (digits.startsWith('263')) return { operator: 'ECONET', country: 'Zimbabwe' };
  if (digits.startsWith('264')) return { operator: 'MTC', country: 'Namibia' };
  if (digits.startsWith('265')) return { operator: 'AIRTEL MALAWI', country: 'Malawi' };
  if (digits.startsWith('242')) return { operator: 'MTN CONGO', country: 'Congo' };
  if (digits.startsWith('243')) return { operator: 'VODACOM DRC', country: 'DR Congo' };
  if (digits.startsWith('250')) return { operator: 'MTN RWANDA', country: 'Rwanda' };
  if (digits.startsWith('251')) return { operator: 'ETHIO TELECOM', country: 'Ethiopia' };
  if (digits.startsWith('252')) return { operator: 'HORMUUD', country: 'Somalia' };

  // Europe 3-digits
  if (digits.startsWith('382')) return { operator: 'TELENOR', country: 'Montenegro' };
  if (digits.startsWith('351')) return { operator: 'MEO / VODAFONE', country: 'Portugal' };
  if (digits.startsWith('352')) return { operator: 'POST MOBILE', country: 'Luxembourg' };
  if (digits.startsWith('353')) return { operator: 'VODAFONE / THREE', country: 'Ireland' };
  if (digits.startsWith('354')) return { operator: 'SIMINN', country: 'Iceland' };
  if (digits.startsWith('355')) return { operator: 'ONE ALBANIA', country: 'Albania' };
  if (digits.startsWith('356')) return { operator: 'EPIC MALTA', country: 'Malta' };
  if (digits.startsWith('357')) return { operator: 'CYTA / MTN', country: 'Cyprus' };
  if (digits.startsWith('358')) return { operator: 'ELISA / DNA', country: 'Finland' };
  if (digits.startsWith('359')) return { operator: 'A1 BULGARIA', country: 'Bulgaria' };
  if (digits.startsWith('370')) return { operator: 'TELIA', country: 'Lithuania' };
  if (digits.startsWith('371')) return { operator: 'LMT', country: 'Latvia' };
  if (digits.startsWith('372')) return { operator: 'TELESTI', country: 'Estonia' };
  if (digits.startsWith('373')) return { operator: 'MOLDCELL', country: 'Moldova' };
  if (digits.startsWith('374')) return { operator: 'TEAM TELECOM', country: 'Armenia' };
  if (digits.startsWith('375')) return { operator: 'A1 BELARUS', country: 'Belarus' };
  if (digits.startsWith('380')) return { operator: 'KYIVSTAR', country: 'Ukraine' };
  if (digits.startsWith('381')) return { operator: 'MTS SERBIA', country: 'Serbia' };
  if (digits.startsWith('383')) return { operator: 'VALA KOSOVO', country: 'Kosovo' };
  if (digits.startsWith('385')) return { operator: 'A1 CROATIA', country: 'Croatia' };
  if (digits.startsWith('386')) return { operator: 'A1 SLOVENIA', country: 'Slovenia' };
  if (digits.startsWith('387')) return { operator: 'BH TELECOM', country: 'Bosnia and Herzegovina' };
  if (digits.startsWith('389')) return { operator: 'TELEKOM MK', country: 'North Macedonia' };
  if (digits.startsWith('420')) return { operator: 'O2 / T-MOBILE', country: 'Czech Republic' };
  if (digits.startsWith('421')) return { operator: 'ORANGE SK', country: 'Slovakia' };

  // Americas 3-digits
  if (digits.startsWith('501')) return { operator: 'DIGICELL', country: 'Belize' };
  if (digits.startsWith('502')) return { operator: 'TIGO GUATEMALA', country: 'Guatemala' };
  if (digits.startsWith('503')) return { operator: 'TIGO SALVADOR', country: 'El Salvador' };
  if (digits.startsWith('504')) return { operator: 'TIGO HONDURAS', country: 'Honduras' };
  if (digits.startsWith('505')) return { operator: 'CLARO NICARAGUA', country: 'Nicaragua' };
  if (digits.startsWith('506')) return { operator: 'KOLBI', country: 'Costa Rica' };
  if (digits.startsWith('507')) return { operator: 'CABLE & WIRELESS', country: 'Panama' };
  if (digits.startsWith('509')) return { operator: 'DIGICEL HAITI', country: 'Haiti' };
  if (digits.startsWith('591')) return { operator: 'ENTEL BOLIVIA', country: 'Bolivia' };
  if (digits.startsWith('593')) return { operator: 'CLARO ECUADOR', country: 'Ecuador' };
  if (digits.startsWith('595')) return { operator: 'TIGO PARAGUAY', country: 'Paraguay' };
  if (digits.startsWith('598')) return { operator: 'ANTEL URUGUAY', country: 'Uruguay' };

  // Oceania 3-digits
  if (digits.startsWith('670')) return { operator: 'TELEMOR', country: 'East Timor' };
  if (digits.startsWith('673')) return { operator: 'DST', country: 'Brunei' };
  if (digits.startsWith('675')) return { operator: 'DIGICEL PNG', country: 'Papua New Guinea' };
  if (digits.startsWith('679')) return { operator: 'VODAFONE FIJI', country: 'Fiji' };

  // 2-digit prefixes
  if (digits.startsWith('86')) return { operator: 'CHINA MOBILE / UNICOM', country: 'China' };
  if (digits.startsWith('84')) return { operator: 'VIETTEL / VINAPHONE', country: 'Vietnam' };
  if (digits.startsWith('81')) return { operator: 'NTT DOCOMO / SOFTBANK', country: 'Japan' };
  if (digits.startsWith('82')) return { operator: 'SK TELECOM / KT', country: 'South Korea' };
  if (digits.startsWith('60')) return { operator: 'CELCOM / MAXIS', country: 'Malaysia' };
  if (digits.startsWith('62')) return { operator: 'TELKOMSEL / INDOSAT', country: 'Indonesia' };
  if (digits.startsWith('63')) return { operator: 'SMART / GLOBE', country: 'Philippines' };
  if (digits.startsWith('65')) return { operator: 'SINGTEL / STARHUB', country: 'Singapore' };
  if (digits.startsWith('66')) return { operator: 'AIS / TRUE MOVE', country: 'Thailand' };
  if (digits.startsWith('95')) return { operator: 'MPT Myanmar', country: 'Myanmar' };
  if (digits.startsWith('94')) return { operator: 'DIALOG / MOBITEL', country: 'Sri Lanka' };
  if (digits.startsWith('93')) return { operator: 'AWCC / ROSHAN', country: 'Afghanistan' };
  if (digits.startsWith('92')) return { operator: 'JAZZ / TELENOR', country: 'Pakistan' };
  if (digits.startsWith('91')) return { operator: 'JIO / AIRTEL', country: 'India' };
  if (digits.startsWith('98')) return { operator: 'MCI / IRANCELL', country: 'Iran' };
  if (digits.startsWith('90')) return { operator: 'TURKCELL / VODAFONE', country: 'Turkey' };

  if (digits.startsWith('44')) return { operator: 'EE / VODAFONE UK', country: 'United Kingdom' };
  if (digits.startsWith('49')) return { operator: 'TELEKOM / VODAFONE DE', country: 'Germany' };
  if (digits.startsWith('33')) return { operator: 'ORANGE / SFR', country: 'France' };
  if (digits.startsWith('39')) return { operator: 'TIM / VODAFONE IT', country: 'Italy' };
  if (digits.startsWith('34')) return { operator: 'MOVISTAR / VODAFONE ES', country: 'Spain' };
  if (digits.startsWith('31')) return { operator: 'KPN / VODAFONE NL', country: 'Netherlands' };
  if (digits.startsWith('32')) return { operator: 'PROXIMUS / ORANGE BE', country: 'Belgium' };
  if (digits.startsWith('41')) return { operator: 'SWISSCOM', country: 'Switzerland' };
  if (digits.startsWith('43')) return { operator: 'A1 AUSTRIAN', country: 'Austria' };
  if (digits.startsWith('30')) return { operator: 'COSMOTE GREECE', country: 'Greece' };
  if (digits.startsWith('45')) return { operator: 'TDC DENMARK', country: 'Denmark' };
  if (digits.startsWith('46')) return { operator: 'TELIA SWEDEN', country: 'Sweden' };
  if (digits.startsWith('47')) return { operator: 'TELENOR NORWAY', country: 'Norway' };
  if (digits.startsWith('48')) return { operator: 'ORANGE POLAND', country: 'Poland' };
  if (digits.startsWith('40')) return { operator: 'ORANGE ROMANIA', country: 'Romania' };
  if (digits.startsWith('36')) return { operator: 'YETTEL HUNGARY', country: 'Hungary' };

  if (digits.startsWith('20')) return { operator: 'VODAFONE EGYPT', country: 'Egypt' };
  if (digits.startsWith('27')) return { operator: 'VODACOM SOUTH AFRICA', country: 'South Africa' };

  if (digits.startsWith('52')) return { operator: 'TELCEL MEXICO', country: 'Mexico' };
  if (digits.startsWith('55')) return { operator: 'CLARO / VIVO BRAZIL', country: 'Brazil' };
  if (digits.startsWith('54')) return { operator: 'PERSONAL ARGENTINA', country: 'Argentina' };
  if (digits.startsWith('56')) return { operator: 'ENTEL CHILE', country: 'Chile' };
  if (digits.startsWith('57')) return { operator: 'CLARO COLOMBIA', country: 'Colombia' };
  if (digits.startsWith('58')) return { operator: 'DIGITEL VENEZUELA', country: 'Venezuela' };
  if (digits.startsWith('51')) return { operator: 'CLARO PERU', country: 'Peru' };

  if (digits.startsWith('61')) return { operator: 'TELSTRA AUSTRALIA', country: 'Australia' };
  if (digits.startsWith('64')) return { operator: 'ONE NEW ZEALAND', country: 'New Zealand' };

  // 1-digit prefixes
  if (digits.startsWith('1')) return { operator: 'T-MOBILE / AT&T', country: 'United States' };
  if (digits.startsWith('7')) return { operator: 'MEGAFON / MTS', country: 'Kazakhstan / Russia' };

  return { operator: 'GLOBAL CARRIER', country: 'Global Route' };
}

export function getRealCountryName(rawCountry?: string, rangeStr?: string): string {
  const carrier = resolveCarrierDetails(rangeStr || '');
  if (
    !rawCountry ||
    !rawCountry.trim() ||
    rawCountry.trim().toLowerCase() === 'international' ||
    rawCountry.trim().toLowerCase() === 'global' ||
    rawCountry.trim().toLowerCase() === 'global route'
  ) {
    return carrier.country;
  }
  return rawCountry.trim();
}

export interface FetchConsoleResponse {
  hits: LiveConsoleHit[];
  code: number;
  status: string;
  message?: string;
  rid?: string;
}

/**
 * 2. GET https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/console
 * Real-time global live feed of recent hits & sales across the network
 * Expected schema: { meta: { code: 200, status: "ok" }, data: { cached: false, hits: [...] }, message: "ok", rid: "..." }
 */
export async function fetchLiveConsoleDetailed(apiKey?: string): Promise<FetchConsoleResponse> {
  try {
    const res = await callVoltxApi<{ hits?: any[]; cached?: boolean }>('/console', { apiKey });
    
    const code = res.meta?.code ?? 500;
    const status = res.meta?.status ?? 'error';
    const message = res.message;
    const rid = res.rid;

    let rawHits: any[] = [];
    if (res.data) {
      if (res.data.hits && Array.isArray(res.data.hits)) {
        rawHits = res.data.hits;
      } else if (Array.isArray(res.data)) {
        rawHits = res.data;
      }
    } else if ((res as any).hits && Array.isArray((res as any).hits)) {
      rawHits = (res as any).hits;
    }

    const hits: LiveConsoleHit[] = rawHits.map(hit => {
      const rawRange = hit.range || hit.number || hit.phone || '';
      const carrier = resolveCarrierDetails(rawRange);
      
      // Parse time cleanly (seconds vs milliseconds vs string)
      let parsedTime = Date.now();
      if (typeof hit.time === 'number') {
        parsedTime = hit.time < 10000000000 ? hit.time * 1000 : hit.time;
      } else if (typeof hit.time === 'string') {
        const n = Number(hit.time);
        if (!isNaN(n) && n > 0) {
          parsedTime = n < 10000000000 ? n * 1000 : n;
        } else {
          parsedTime = new Date(hit.time).getTime() || Date.now();
        }
      }

      return {
        range: rawRange,
        sid: hit.sid || hit.service || hit.service_name || 'Service',
        message: hit.message || hit.msg || hit.text || hit.sms || '',
        time: parsedTime,
        operator: hit.operator || carrier.operator,
        country: getRealCountryName(hit.country, rawRange),
      };
    });

    return { hits, code, status, message, rid };
  } catch (err: any) {
    return { hits: [], code: 500, status: 'network_error', message: err?.message || 'Network request failed' };
  }
}

export async function fetchLiveConsole(apiKey?: string): Promise<LiveConsoleHit[]> {
  const result = await fetchLiveConsoleDetailed(apiKey);
  return result.hits;
}

/**
 * 3. GET https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/liveaccess
 * Recently-active services and active ranges cache
 */
export async function fetchLiveAccess(apiKey?: string): Promise<LiveAccessService[]> {
  try {
    const res = await callVoltxApi<{ services: LiveAccessService[]; cached: boolean }>('/liveaccess', { apiKey });
    if (res.meta?.code === 200 && res.data?.services && Array.isArray(res.data.services) && res.data.services.length > 0) {
      return res.data.services;
    }
  } catch {
    // API unreachable or network error
  }

  // Return empty list when no live access data is returned
  return [];
}

/**
 * 4. GET https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/success-otp
 * User's own last 50 successful delivered OTPs
 */
export async function fetchSuccessOtps(apiKey?: string): Promise<LiveSuccessOtp[]> {
  try {
    const res = await callVoltxApi<{ otps: LiveSuccessOtp[]; cached: boolean }>('/success-otp', { apiKey });
    if (res.meta?.code === 200 && res.data?.otps && Array.isArray(res.data.otps) && res.data.otps.length > 0) {
      return res.data.otps;
    }
  } catch {
    // API unreachable or network error
  }

  // Return empty list when no delivered OTPs are returned
  return [];
}

export interface AllocateNumberResult {
  success: boolean;
  data: AllocatedNumber | null;
  message: string;
  code?: number;
}

/**
 * 5. POST https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/getnum
 * Allocate one real number from a range directly through VoltxSMS API
 */
export async function allocateRealNumberDetailed(
  rangeInput: string,
  apiKey?: string
): Promise<AllocateNumberResult> {
  const trimmed = (rangeInput || '').trim();
  const cleanDigits = trimmed.replace(/[^0-9]/g, '');
  const ridToUse = trimmed || cleanDigits || '23274';

  try {
    const res = await callVoltxApi<AllocatedNumber>('/getnum', {
      method: 'POST',
      body: { rid: ridToUse, range: cleanDigits || ridToUse },
      apiKey,
    });

    if (res.meta?.code === 200 && res.data?.full_number) {
      return {
        success: true,
        data: res.data,
        message: res.message || 'Number allocated successfully',
        code: 200,
      };
    }

    return {
      success: false,
      data: null,
      message: res.message || 'No numbers available in this range from carrier.',
      code: res.meta?.code || 400,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      message: err?.message || 'Connection to carrier API failed. Please verify API key.',
      code: 500,
    };
  }
}

export async function allocateRealNumber(rangeIdOrDigits: string, apiKey?: string): Promise<AllocatedNumber | null> {
  const res = await allocateRealNumberDetailed(rangeIdOrDigits, apiKey);
  return res.data;
}
