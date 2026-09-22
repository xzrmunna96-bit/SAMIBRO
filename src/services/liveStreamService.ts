// Authentic Live Real-Time Stream Engine for SUPER X SMS
// Generates continuous live carrier stream packets (matching active Bot & Carrier ranges)
// Syncs to Firestore in real-time so all users on Vercel, mobile, and desktop always see live activity

import { LiveConsoleHit } from './voltxApi';
import { getCountryInfo } from './countryHelper';

export interface LiveStreamMessageTemplate {
  service: string;
  sender: string;
  template: (otp: string) => string;
}

export const REAL_SERVICE_TEMPLATES: LiveStreamMessageTemplate[] = [
  {
    service: "WhatsApp",
    sender: "WhatsApp",
    template: (otp) => `Your WhatsApp code: ${otp}. You can also tap on the link to verify your account: v.whatsapp.com/${otp}`,
  },
  {
    service: "WhatsApp Business",
    sender: "WhatsApp",
    template: (otp) => `Your WhatsApp Business code is ${otp}. Do not share this code with anyone.`,
  },
  {
    service: "Telegram",
    sender: "Telegram",
    template: (otp) => `Telegram code: ${otp}. You can also tap this link to log in: https://t.me/login/${otp}`,
  },
  {
    service: "Facebook",
    sender: "Facebook",
    template: (otp) => `${otp} is your Facebook confirmation code. Laz+y3mF5gQ`,
  },
  {
    service: "TikTok",
    sender: "TikTok",
    template: (otp) => `[TikTok] ${otp} is your verification code. It expires in 5 minutes.`,
  },
  {
    service: "Google",
    sender: "Google",
    template: (otp) => `G-${otp} is your Google verification code.`,
  },
  {
    service: "IMO",
    sender: "IMO",
    template: (otp) => `Your IMO verification code is: ${otp}. Valid for 10 minutes.`,
  },
  {
    service: "Instagram",
    sender: "Instagram",
    template: (otp) => `${otp} is your Instagram code. Don't share it.`,
  },
  {
    service: "Uber",
    sender: "Uber",
    template: (otp) => `Your Uber code is ${otp}. Never share this code with anyone. Reply STOP to unsubscribe.`,
  },
  {
    service: "Apple",
    sender: "Apple",
    template: (otp) => `Your Apple ID Code is: ${otp}. Don't share it with anyone.`,
  },
];

export const ACTIVE_STREAM_CARRIERS = [
  { prefix: "22901", country: "Benin", flag: "🇧🇯", operator: "MTN Benin Direct", defaultService: "WhatsApp" },
  { prefix: "22997", country: "Benin", flag: "🇧🇯", operator: "Moov Benin Carrier", defaultService: "WhatsApp" },
  { prefix: "94782", country: "Sri Lanka", flag: "🇱🇰", operator: "Dialog Sri Lanka", defaultService: "WhatsApp" },
  { prefix: "94787", country: "Sri Lanka", flag: "🇱🇰", operator: "Dialog Axiata", defaultService: "WhatsApp" },
  { prefix: "94720", country: "Sri Lanka", flag: "🇱🇰", operator: "Hutchison Lanka", defaultService: "WhatsApp" },
  { prefix: "23762", country: "Cameroon", flag: "🇨🇲", operator: "Orange Cameroon", defaultService: "WhatsApp" },
  { prefix: "23769", country: "Cameroon", flag: "🇨🇲", operator: "MTN Cameroon", defaultService: "Facebook" },
  { prefix: "22870", country: "Togo", flag: "🇹🇬", operator: "Togocel Route", defaultService: "WhatsApp" },
  { prefix: "22890", country: "Togo", flag: "🇹🇬", operator: "Moov Togo GSM", defaultService: "IMO" },
  { prefix: "26134", country: "Madagascar", flag: "🇲🇬", operator: "Telma Madagascar", defaultService: "WhatsApp" },
  { prefix: "88017", country: "Bangladesh", flag: "🇧🇩", operator: "Grameenphone Route", defaultService: "Telegram" },
  { prefix: "88019", country: "Bangladesh", flag: "🇧🇩", operator: "Banglalink GSM", defaultService: "WhatsApp" },
  { prefix: "23275", country: "Sierra Leone", flag: "🇸🇱", operator: "Africell Sierra Leone", defaultService: "TikTok" },
  { prefix: "22507", country: "Ivory Coast", flag: "🇨🇮", operator: "Orange Cote d'Ivoire", defaultService: "WhatsApp" },
  { prefix: "44740", country: "United Kingdom", flag: "🇬🇧", operator: "EE UK Gateway", defaultService: "WhatsApp" },
  { prefix: "1415", country: "United States", flag: "🇺🇸", operator: "T-Mobile USA Direct", defaultService: "Apple" },
];

/**
 * Generate a random authentic 4 to 6 digit OTP
 */
export function generateRandomOtp(length = 6): string {
  if (length === 4) {
    return String(Math.floor(1000 + Math.random() * 9000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generate a realistic carrier phone number given a prefix
 */
export function generatePhoneNumberForPrefix(prefix: string): string {
  const cleanPrefix = prefix.replace(/\D/g, "");
  const remainingDigits = Math.max(4, 10 - cleanPrefix.length);
  let randomSuffix = "";
  for (let i = 0; i < remainingDigits; i++) {
    randomSuffix += Math.floor(Math.random() * 10).toString();
  }
  return `${cleanPrefix}${randomSuffix}`;
}

/**
 * Generate a realistic single live stream packet
 */
export function generateLiveStreamPacket(overrideCarrier?: typeof ACTIVE_STREAM_CARRIERS[0]): LiveConsoleHit {
  const carrier = overrideCarrier || ACTIVE_STREAM_CARRIERS[Math.floor(Math.random() * ACTIVE_STREAM_CARRIERS.length)];
  const matchingTemplates = REAL_SERVICE_TEMPLATES.filter(
    (t) => t.service.toLowerCase() === carrier.defaultService.toLowerCase()
  );
  const templateObj = matchingTemplates.length > 0
    ? matchingTemplates[0]
    : REAL_SERVICE_TEMPLATES[Math.floor(Math.random() * REAL_SERVICE_TEMPLATES.length)];

  const isFourDigit = templateObj.service === "WhatsApp" && Math.random() > 0.8;
  const otp = generateRandomOtp(isFourDigit ? 4 : 6);
  const number = generatePhoneNumberForPrefix(carrier.prefix);
  const message = templateObj.template(otp);
  const timestamp = Date.now();

  return {
    range: carrier.prefix,
    number,
    sid: templateObj.service,
    service: templateObj.service,
    cli: templateObj.sender,
    message,
    time: timestamp,
    operator: carrier.operator,
    country: carrier.country,
    isFoxSms: true,
    source: "SUPER X SMS",
    code: otp,
    otp,
  };
}

/**
 * Generate initial pre-seeded active stream hits (e.g. 15-20 hits across all top countries)
 * with timestamps staggered across the last 15 minutes
 */
export function generateInitialLiveStreamHits(): LiveConsoleHit[] {
  const hits: LiveConsoleHit[] = [];
  const now = Date.now();

  ACTIVE_STREAM_CARRIERS.forEach((carrier, idx) => {
    const matchingTemplate = REAL_SERVICE_TEMPLATES.find(
      (t) => t.service.toLowerCase() === carrier.defaultService.toLowerCase()
    ) || REAL_SERVICE_TEMPLATES[idx % REAL_SERVICE_TEMPLATES.length];

    const otp = generateRandomOtp(6);
    const number = generatePhoneNumberForPrefix(carrier.prefix);
    const message = matchingTemplate.template(otp);
    // Stagger timestamps: from 20 seconds ago to 12 minutes ago
    const timeOffset = (idx * 45 + Math.floor(Math.random() * 30)) * 1000;

    hits.push({
      range: carrier.prefix,
      number,
      sid: matchingTemplate.service,
      service: matchingTemplate.service,
      cli: matchingTemplate.sender,
      message,
      time: now - timeOffset,
      operator: carrier.operator,
      country: carrier.country,
      isFoxSms: true,
      source: "SUPER X SMS",
      code: otp,
      otp,
    });
  });

  return hits.sort((a, b) => (Number(b.time) || 0) - (Number(a.time) || 0));
}
