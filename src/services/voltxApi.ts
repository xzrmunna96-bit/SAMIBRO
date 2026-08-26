// Official VoltxSMS / 2oo9 Live API Integration Layer
// Upstream Source: https://voltxsms.com/m29/#/doc/api
// Base Upstream URL: https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api

export const UPSTREAM_BASE_URL = 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api';
export const PROXY_BASE_URL = '/api/voltx/@public/api';

// Live public API Endpoints List
export const VOLTX_ENDPOINTS = {
  BASE: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api',
  GET_NUM: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/getnum',
  LIVE_ACCESS: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/liveaccess',
  SUCCESS_OTP: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/success-otp',
  CONSOLE: 'https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/console',
};

// Default active API Key / token for mauthapi header authentication
export const DEFAULT_MAUTH_API_KEY = 'tg_live_8x4f9k2m_AbCdEfGhIjKlMnOp';

export function getMauthApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('voltx_mauthapi_key');
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_MAUTH_API_KEY;
}

export function setMauthApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('voltx_mauthapi_key', key.trim());
  }
}

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'mauthapi': apiKey,
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
    const directRes = await fetch(`${UPSTREAM_BASE_URL}${cleanEndpoint}`, fetchOptions);
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

  if (digits.startsWith('236')) return { operator: 'ORANGE CENTRAFRIQUE', country: 'Central African Republic' };
  if (digits.startsWith('261')) return { operator: 'AIRTEL', country: 'Madagascar' };
  if (digits.startsWith('229')) return { operator: 'MOBILE', country: 'Benin' };
  if (digits.startsWith('228')) return { operator: 'TOGO CELLULAIRE (TOGOCEL)', country: 'Togo' };
  if (digits.startsWith('382')) return { operator: 'TELENOR', country: 'Montenegro' };
  if (digits.startsWith('225')) return { operator: "ORANGE COTE D'IVOIRE", country: 'Ivory Coast' };
  if (digits.startsWith('880')) return { operator: 'GRAMEENPHONE', country: 'Bangladesh' };
  if (digits.startsWith('44')) return { operator: 'EE PHYSICAL', country: 'United Kingdom' };
  if (digits.startsWith('62')) return { operator: 'TELKOMSEL', country: 'Indonesia' };
  if (digits.startsWith('91')) return { operator: 'AIRTEL', country: 'India' };
  if (digits.startsWith('1')) return { operator: 'T-MOBILE', country: 'United States' };
  if (digits.startsWith('237')) return { operator: 'ORANGE CAMEROUN', country: 'Cameroon' };
  if (digits.startsWith('221')) return { operator: 'ORANGE SENEGAL', country: 'Senegal' };
  if (digits.startsWith('234')) return { operator: 'MTN NIGERIA', country: 'Nigeria' };
  if (digits.startsWith('254')) return { operator: 'SAFARICOM', country: 'Kenya' };
  if (digits.startsWith('212')) return { operator: 'MAROC TELECOM', country: 'Morocco' };
  if (digits.startsWith('63')) return { operator: 'SMART / GLOBE', country: 'Philippines' };
  if (digits.startsWith('232')) return { operator: 'ORANGE (AIRTEL)', country: 'Sierra Leone' };
  if (digits.startsWith('233')) return { operator: 'MTN GHANA', country: 'Ghana' };
  if (digits.startsWith('255')) return { operator: 'VODACOM', country: 'Tanzania' };
  if (digits.startsWith('256')) return { operator: 'MTN UGANDA', country: 'Uganda' };
  if (digits.startsWith('92')) return { operator: 'JAZZ / TELENOR', country: 'Pakistan' };
  if (digits.startsWith('971')) return { operator: 'ETISALAT', country: 'UAE' };
  if (digits.startsWith('966')) return { operator: 'STC', country: 'Saudi Arabia' };
  if (digits.startsWith('20')) return { operator: 'VODAFONE', country: 'Egypt' };
  if (digits.startsWith('55')) return { operator: 'CLARO / VIVO', country: 'Brazil' };
  if (digits.startsWith('7')) return { operator: 'MEGAFON / MTS', country: 'Kazakhstan / Russia' };
  if (digits.startsWith('49')) return { operator: 'TELEKOM', country: 'Germany' };
  if (digits.startsWith('33')) return { operator: 'ORANGE', country: 'France' };

  return { operator: 'GLOBAL CARRIER', country: 'International' };
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
        country: hit.country || carrier.country,
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

/**
 * 5. POST https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api/getnum
 * Allocate one real number from a range directly through VoltxSMS API
 */
export async function allocateRealNumber(rangeIdOrDigits: string, apiKey?: string): Promise<AllocatedNumber | null> {
  const cleanDigits = rangeIdOrDigits.replace(/[^0-9]/g, '');
  try {
    const res = await callVoltxApi<AllocatedNumber>('/getnum', {
      method: 'POST',
      body: { rid: cleanDigits || '88017' },
      apiKey,
    });

    if (res.meta?.code === 200 && res.data) {
      return res.data;
    }
  } catch {
    // API unreachable
  }

  return null;
}
