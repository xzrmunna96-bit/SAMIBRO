// Official VoltxSMS / 2oo9 Live API Integration Layer
// Upstream Source: https://voltxsms.com/m29/#/doc/api

import {
  getActiveApiConfigs,
  getActiveApiForService,
  ApiConfigItem,
} from './apiConfigService';
import { getCountryInfo } from './countryHelper';
import { extractOtpCode, sendOtpToTelegram } from './telegramService';
import { fetchIntsCdrStats } from './intsGatewayService';

export const DEFAULT_VOLTX_ENDPOINT_KEY = 'gIBhSFlycFVcj5lCRVKEgF-Vb4hEcGBGaneFQ0KRgn0=';
export const DEFAULT_MAUTH_API_KEY = 'gIBhSFlycFVcj5lCRVKEgF-Vb4hEcGBGaneFQ0KRgn0=';
export const VOLTX_BACKEND_SLUG = 'MXS47FLFX0U';

export function getVoltxEndpointKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('voltx_endpoint_key');
    if (saved && saved.trim() && saved.trim() !== 'M7ANNWJY6B2') return saved.trim();
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
    if (saved && saved.trim() && saved.trim() !== 'M7ANNWJY6B2') return saved.trim();
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
 * Generic Fetcher executing requests to Voltx / 2oo9 or any custom SMS API endpoints
 */
export async function callVoltxApi<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    body?: any;
    apiKey?: string;
    customEndpoint?: string;
  } = {}
): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const apiKey = options.apiKey || getMauthApiKey();
  const endpointKey = getVoltxEndpointKey();
  const customEndpoint = options.customEndpoint;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'mauthapi': apiKey,
    'x-voltx-endpoint-key': endpointKey,
  };

  if (customEndpoint) {
    headers['x-custom-endpoint'] = customEndpoint;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST' && options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. If custom endpoint is passed, use Universal Proxy
  if (customEndpoint) {
    try {
      const res = await fetch(`/api/universal-proxy${cleanEndpoint}`, fetchOptions);
      const json = await res.json();
      if (json && (json.meta || json.data !== undefined || json.hits !== undefined)) {
        return json;
      }
    } catch {
      // fallback
    }
  }

  // 2. Try local dev proxy route first to avoid CORS
  try {
    const res = await fetch(`${PROXY_BASE_URL}${cleanEndpoint}`, fetchOptions);
    const json = await res.json();
    if (json && (json.meta || json.data !== undefined || json.hits !== undefined)) {
      return json;
    }
  } catch {
    // try direct fetch fallback
  }

  // 3. Direct HTTPS fetch to upstream CDN/API
  try {
    const targetBase = customEndpoint || getUpstreamBaseUrl();
    const directRes = await fetch(`${targetBase}${cleanEndpoint}`, fetchOptions);
    const json = await directRes.json();
    if (json && (json.meta || json.data !== undefined || json.hits !== undefined)) {
      return json;
    }
  } catch {
    // ignore
  }

  return {
    meta: { code: 500, status: 'network_error' },
    data: null,
    message: 'Unable to reach SMS gateway server'
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
  const info = getCountryInfo(range);

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

  // 2-digit & 1-digit
  if (digits.startsWith('91')) return { operator: 'AIRTEL / JIO / VI', country: 'India' };
  if (digits.startsWith('92')) return { operator: 'JAZZ / TELENOR', country: 'Pakistan' };
  if (digits.startsWith('90')) return { operator: 'TURKCELL / VODAFONE', country: 'Turkey' };
  if (digits.startsWith('60')) return { operator: 'MAXIS / CELCOM', country: 'Malaysia' };
  if (digits.startsWith('62')) return { operator: 'TELKOMSEL / INDOSAT', country: 'Indonesia' };
  if (digits.startsWith('63')) return { operator: 'GLOBE / SMART', country: 'Philippines' };
  if (digits.startsWith('66')) return { operator: 'AIS / TRUE', country: 'Thailand' };
  if (digits.startsWith('84')) return { operator: 'VIETTEL / VINAPHONE', country: 'Vietnam' };
  if (digits.startsWith('44')) return { operator: 'EE / VODAFONE / O2', country: 'United Kingdom' };
  if (digits.startsWith('49')) return { operator: 'TELEKOM / VODAFONE', country: 'Germany' };
  if (digits.startsWith('33')) return { operator: 'ORANGE / SFR', country: 'France' };
  if (digits.startsWith('39')) return { operator: 'TIM / VODAFONE', country: 'Italy' };
  if (digits.startsWith('34')) return { operator: 'MOVISTAR / ORANGE', country: 'Spain' };
  if (digits.startsWith('7')) return { operator: 'MTS / BEELINE / MEGAFON', country: 'Russia' };
  if (digits.startsWith('1')) return { operator: 'T-MOBILE / AT&T / VERIZON', country: 'United States' };

  if (info.name) {
    return { operator: 'National Carrier Gateway', country: info.name };
  }

  return { operator: 'Carrier Gateway Route', country: 'Bangladesh' };
}

export function stripFlagFromCountryName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .trim();
}

export function getRealCountryName(rawCountry?: string, rangeStr?: string): string {
  const carrier = resolveCarrierDetails(rangeStr || '');
  let val = '';
  if (
    !rawCountry ||
    !rawCountry.trim() ||
    rawCountry.trim().toLowerCase() === 'international' ||
    rawCountry.trim().toLowerCase() === 'global' ||
    rawCountry.trim().toLowerCase() === 'global route' ||
    rawCountry.trim().toLowerCase().includes('international')
  ) {
    val = carrier.country;
  } else {
    val = rawCountry.trim();
  }
  return stripFlagFromCountryName(val);
}

export interface FetchConsoleResponse {
  hits: LiveConsoleHit[];
  code: number;
  status: string;
  message?: string;
  rid?: string;
}

/**
 * Standardize and clean service ID / social media category
 */
export function normalizeServiceId(rawSid: string, rawMessage: string): string {
  const sid = (rawSid || '').trim();
  const msg = (rawMessage || '').toLowerCase();
  const lowerSid = sid.toLowerCase();

  // 1. First Priority: Explicit content signatures inside the message text
  if (msg.includes('whatsapp') || msg.includes('wa.me') || msg.includes('wa code')) return 'WhatsApp';
  if (msg.includes('facebook') || msg.includes('fb-') || msg.includes('meta')) return 'Facebook';
  if (msg.includes('telegram') || msg.includes('t.me') || msg.includes('tg code')) return 'Telegram';
  if (msg.includes('instagram') || msg.includes('ig code') || msg.includes('ig-')) return 'Instagram';
  if (msg.includes('tiktok')) return 'TikTok';
  if (msg.includes('google') || msg.includes('g-') || msg.includes('gsuite')) return 'Google';
  if (msg.includes('imo code') || msg.includes('imo verification') || msg.includes('imo ')) return 'IMO';
  if (msg.includes('baji') || msg.includes('baji999') || msg.includes('bj999')) return 'Baji';
  if (msg.includes('twitter') || msg.includes('x.com')) return 'Twitter / X';
  if (msg.includes('amazon')) return 'Amazon';
  if (msg.includes('apple')) return 'Apple';
  if (msg.includes('snapchat')) return 'Snapchat';
  if (msg.includes('viber')) return 'Viber';
  if (msg.includes('discord')) return 'Discord';
  if (msg.includes('microsoft')) return 'Microsoft';
  if (msg.includes('huawei')) return 'Huawei';

  // 2. Second Priority: Specific Sender ID (SID) checks (strict matches, avoid false positives like 'insta' matching 'instantsms')
  if (lowerSid.includes('whatsapp') || lowerSid === 'wa') return 'WhatsApp';
  if (lowerSid.includes('facebook') || lowerSid === 'fb' || lowerSid === 'meta') return 'Facebook';
  if (lowerSid.includes('telegram') || lowerSid === 'tg') return 'Telegram';
  if (lowerSid.includes('instagram') || lowerSid === 'insta' || lowerSid === 'ig' || lowerSid.startsWith('insta_')) return 'Instagram';
  if (lowerSid.includes('tiktok')) return 'TikTok';
  if (lowerSid.includes('google') || lowerSid === 'gsuite') return 'Google';
  if (lowerSid.includes('imo')) return 'IMO';
  if (lowerSid.includes('baji')) return 'Baji';
  if (lowerSid.includes('twitter') || lowerSid.includes('x.com')) return 'Twitter / X';
  if (lowerSid.includes('amazon')) return 'Amazon';
  if (lowerSid.includes('apple')) return 'Apple';
  if (lowerSid.includes('snapchat')) return 'Snapchat';
  if (lowerSid.includes('viber')) return 'Viber';
  if (lowerSid.includes('discord')) return 'Discord';
  if (lowerSid.includes('shopee')) return 'Shopee';
  if (lowerSid.includes('melbet')) return 'Melbet';
  if (lowerSid.includes('avabet')) return 'AVABet';
  if (lowerSid.includes('paypal')) return 'PAYPAL';
  if (lowerSid.includes('uber')) return 'Uber';
  if (lowerSid.includes('bolt')) return 'Bolt';
  if (lowerSid.includes('microsoft')) return 'Microsoft';
  if (lowerSid.includes('huawei')) return 'Huawei';
  if (lowerSid.includes('authmsg')) return 'AUTHMSG';
  if (lowerSid.includes('msverify')) return 'msverify';
  if (lowerSid.includes('verify')) return 'Verify';
  if (lowerSid.includes('iatsms')) return 'iATSMS';
  if (lowerSid.includes('linkedin')) return 'LinkedIn';

  return sid || 'Service';
}

export const detectServiceFromHit = normalizeServiceId;

/**
 * 2. Real-time global live feed of recent hits & OTPs across all active configured APIs
 * Aggregates across all active API routes in real-time
 */
export async function fetchLiveConsoleDetailed(apiKey?: string, customEndpoint?: string): Promise<FetchConsoleResponse> {
  // If specific key or endpoint is passed, query single route
  if (apiKey || customEndpoint) {
    try {
      const res = await callVoltxApi<{ hits?: any[]; cached?: boolean }>('/console', {
        apiKey,
        customEndpoint,
      });

      const code = res.meta?.code ?? 200;
      const status = res.meta?.status ?? 'ok';
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

      const hits: LiveConsoleHit[] = rawHits.map((hit) => {
        const rawRange = hit.range || hit.number || hit.phone || '';
        const carrier = resolveCarrierDetails(rawRange);
        const rawMsg = hit.message || hit.msg || hit.text || hit.sms || '';

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
          sid: normalizeServiceId(hit.sid || hit.service || hit.service_name || '', rawMsg),
          message: rawMsg,
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

  // Multi-API Pool Mode: Query all active configured APIs concurrently
  const activeConfigs = getActiveApiConfigs();
  const allHitsMap = new Map<string, LiveConsoleHit>();

  const results = await Promise.allSettled(
    activeConfigs.map((cfg) =>
      callVoltxApi<{ hits?: any[]; cached?: boolean }>('/console', {
        apiKey: cfg.apiKey,
        customEndpoint: cfg.endpoint,
      })
    )
  );

  let successCount = 0;
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      const res = result.value;
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

      if (rawHits.length > 0) {
        successCount++;
        rawHits.forEach((hit) => {
          const rawRange = hit.range || hit.number || hit.phone || '';
          const carrier = resolveCarrierDetails(rawRange);
          const rawMsg = hit.message || hit.msg || hit.text || hit.sms || '';

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

          const sid = normalizeServiceId(hit.sid || hit.service || hit.service_name || '', rawMsg);
          const itemKey = `${rawRange}_${parsedTime}_${sid}_${rawMsg.substring(0, 30)}`;

          if (!allHitsMap.has(itemKey)) {
            const finalHit: LiveConsoleHit = {
              range: rawRange,
              sid,
              message: rawMsg,
              time: parsedTime,
              operator: hit.operator || carrier.operator,
              country: getRealCountryName(hit.country, rawRange),
            };
            allHitsMap.set(itemKey, finalHit);

            // Auto-forward fresh hits to Telegram Channel in background
            if (Date.now() - parsedTime < 300000) {
              sendOtpToTelegram({
                number: finalHit.range,
                service: finalHit.sid,
                message: finalHit.message,
                time: finalHit.time,
                countryName: finalHit.country,
              }).catch(() => {});
            }
          }
        });
      }
    }
  });

  // Also query INTS gateway CDR stream in background
  try {
    const intsResult = await fetchIntsCdrStats();
    if (intsResult.success && intsResult.hits.length > 0) {
      intsResult.hits.forEach((hit) => {
        const itemKey = `${hit.range}_${hit.time}_${hit.sid}_${hit.message.substring(0, 30)}`;
        if (!allHitsMap.has(itemKey)) {
          allHitsMap.set(itemKey, hit);
          if (Date.now() - Number(hit.time) < 300000) {
            sendOtpToTelegram({
              number: hit.range,
              service: hit.sid,
              message: hit.message,
              time: hit.time,
              countryName: hit.country,
            }).catch(() => {});
          }
        }
      });
    }
  } catch {
    // ignore
  }

  const mergedHits = Array.from(allHitsMap.values()).sort(
    (a, b) => Number(b.time) - Number(a.time)
  );

  return {
    hits: mergedHits,
    code: 200,
    status: 'ok',
    message: `${mergedHits.length} live stream packets aggregated across ${successCount || activeConfigs.length} API routes`,
  };
}

export async function fetchLiveConsole(apiKey?: string, customEndpoint?: string): Promise<LiveConsoleHit[]> {
  const result = await fetchLiveConsoleDetailed(apiKey, customEndpoint);
  return result.hits;
}

/**
 * 3. GET liveaccess across all active configured APIs
 * Aggregates recently-active services and active ranges cache
 */
export async function fetchLiveAccess(apiKey?: string): Promise<LiveAccessService[]> {
  if (apiKey) {
    try {
      const res = await callVoltxApi<{ services: LiveAccessService[]; cached: boolean }>('/liveaccess', { apiKey });
      if (res.meta?.code === 200 && res.data?.services && Array.isArray(res.data.services)) {
        return res.data.services;
      }
    } catch {
      // ignore
    }
    return [];
  }

  // Multi-API Pool
  const activeConfigs = getActiveApiConfigs();
  const servicesMap = new Map<string, LiveAccessService>();

  const results = await Promise.allSettled(
    activeConfigs.map((cfg) =>
      callVoltxApi<{ services: LiveAccessService[]; cached: boolean }>('/liveaccess', {
        apiKey: cfg.apiKey,
        customEndpoint: cfg.endpoint,
      })
    )
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value?.data?.services) {
      const services = result.value.data.services;
      if (Array.isArray(services)) {
        services.forEach((s) => {
          if (!s || !s.sid) return;
          const cleanSid = normalizeServiceId(s.sid, '');
          const existing = servicesMap.get(cleanSid);
          if (existing) {
            const mergedRanges = Array.from(new Set([...(existing.ranges || []), ...(s.ranges || [])]));
            servicesMap.set(cleanSid, {
              sid: cleanSid,
              last_at: Math.max(existing.last_at || 0, s.last_at || 0),
              ranges: mergedRanges,
            });
          } else {
            servicesMap.set(cleanSid, {
              sid: cleanSid,
              last_at: s.last_at || Date.now(),
              ranges: s.ranges || [],
            });
          }
        });
      }
    }
  });

  return Array.from(servicesMap.values());
}

/**
 * 4. GET success-otp across active APIs
 */
export async function fetchSuccessOtps(apiKey?: string): Promise<LiveSuccessOtp[]> {
  if (apiKey) {
    try {
      const res = await callVoltxApi<{ otps: LiveSuccessOtp[]; cached: boolean }>('/success-otp', { apiKey });
      if (res.meta?.code === 200 && res.data?.otps && Array.isArray(res.data.otps)) {
        return res.data.otps;
      }
    } catch {
      // ignore
    }
    return [];
  }

  const activeConfigs = getActiveApiConfigs();
  const otpsMap = new Map<string, LiveSuccessOtp>();

  const results = await Promise.allSettled(
    activeConfigs.map((cfg) =>
      callVoltxApi<{ otps: LiveSuccessOtp[]; cached: boolean }>('/success-otp', {
        apiKey: cfg.apiKey,
        customEndpoint: cfg.endpoint,
      })
    )
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value?.data?.otps) {
      const otps = result.value.data.otps;
      if (Array.isArray(otps)) {
        otps.forEach((item) => {
          if (item && (item.otp_id || item.number)) {
            const key = item.otp_id || `${item.number}_${item.time}`;
            if (!otpsMap.has(key)) {
              otpsMap.set(key, item);
            }
          }
        });
      }
    }
  });

  return Array.from(otpsMap.values()).sort((a, b) => Number(b.time) - Number(a.time));
}

export interface AllocateNumberResult {
  success: boolean;
  data: AllocatedNumber | null;
  message: string;
  code?: number;
}

/**
 * 5. Allocate one real number from a range with Multi-API dynamic routing & failover
 */
export async function allocateRealNumberDetailed(
  rangeInput: string,
  apiKey?: string,
  serviceType?: string
): Promise<AllocateNumberResult> {
  const trimmed = (rangeInput || '').trim();
  const cleanDigits = trimmed.replace(/[^0-9]/g, '');
  const ridToUse = trimmed || cleanDigits || '23274';

  // If specific key provided, call directly
  if (apiKey) {
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
        message: err?.message || 'Connection to carrier API failed.',
        code: 500,
      };
    }
  }

  // Multi-API dynamic route selection with automatic failover
  const preferredApi = getActiveApiForService(serviceType || 'ALL');
  const allActiveApis = getActiveApiConfigs();
  const apisToTry = [
    preferredApi,
    ...allActiveApis.filter((c) => c.id !== preferredApi.id),
  ];

  let lastErrorMessage = 'No numbers available in this range.';

  for (const targetApi of apisToTry) {
    try {
      const res = await callVoltxApi<AllocatedNumber>('/getnum', {
        method: 'POST',
        body: { rid: ridToUse, range: cleanDigits || ridToUse },
        apiKey: targetApi.apiKey,
        customEndpoint: targetApi.endpoint,
      });

      if (res.meta?.code === 200 && res.data?.full_number) {
        return {
          success: true,
          data: res.data,
          message: res.message || `Number allocated via ${targetApi.serviceType} API`,
          code: 200,
        };
      }

      if (res.message) {
        lastErrorMessage = res.message;
      }
    } catch (err: any) {
      lastErrorMessage = err?.message || lastErrorMessage;
    }
  }

  return {
    success: false,
    data: null,
    message: lastErrorMessage,
    code: 400,
  };
}

export async function allocateRealNumber(
  rangeIdOrDigits: string,
  apiKey?: string,
  serviceType?: string
): Promise<AllocatedNumber | null> {
  const res = await allocateRealNumberDetailed(rangeIdOrDigits, apiKey, serviceType);
  return res.data;
}
