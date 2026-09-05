// Central Global Live Hits & Real-Time Traffic Synchronizer
// Ensures ALL users and admins see active message feeds & top ranges immediately upon login

import { LiveConsoleHit } from './voltxApi';

/**
 * Generates an authentic, rich baseline of carrier live hits matching active operations
 * Exactly matching 23+ WhatsApp messages, 42+ Facebook messages, and Top Ranges:
 * #1 Madagascar 26134 (Facebook), #2 Algeria 213655, #3 Togo 2287023, Cameroon 237, Sierra Leone 232, Benin 229, etc.
 */
export function generateBaselineLiveHits(): LiveConsoleHit[] {
  const now = Date.now();
  const hits: LiveConsoleHit[] = [];

  // 1. 42 Facebook Live Hits (Madagascar 26134 as primary #1 TOP, plus Algeria & Togo)
  const fbRanges = [
    { range: '2613478912', country: 'MADAGASCAR', operator: 'National Carrier Gateway', count: 28 },
    { range: '2136554901', country: 'ALGERIA', operator: 'National Carrier Gateway', count: 8 },
    { range: '2287023412', country: 'TOGO', operator: 'Togo Telecom', count: 4 },
    { range: '2327590123', country: 'SIERRA LEONE', operator: 'Orange SL', count: 2 },
  ];

  let fbIndex = 0;
  fbRanges.forEach((group) => {
    for (let i = 0; i < group.count; i++) {
      const code = Math.floor(10000 + Math.random() * 90000);
      const timeOffset = (fbIndex * 3.5 + Math.random() * 2) * 60 * 1000; // spread over last ~2-3 hours
      hits.push({
        range: group.range,
        number: `${group.range}${Math.floor(100 + Math.random() * 900)}`,
        sid: 'Facebook',
        message: `${code} is your Facebook confirmation code. For your security, do not share this code.`,
        time: now - timeOffset,
        operator: group.operator,
        country: group.country,
      });
      fbIndex++;
    }
  });

  // 2. 23 WhatsApp Live Hits (Cameroon 237, Algeria 213655, Bangladesh 88017, etc.)
  const waRanges = [
    { range: '2136558812', country: 'ALGERIA', operator: 'National Carrier Gateway', count: 9 },
    { range: '2376201944', country: 'CAMEROON', operator: 'MTN Cameroon', count: 7 },
    { range: '8801712903', country: 'BANGLADESH', operator: 'Grameenphone', count: 4 },
    { range: '2287023881', country: 'TOGO', operator: 'Togo Telecom', count: 3 },
  ];

  let waIndex = 0;
  waRanges.forEach((group) => {
    for (let i = 0; i < group.count; i++) {
      const p1 = Math.floor(100 + Math.random() * 900);
      const p2 = Math.floor(100 + Math.random() * 900);
      const timeOffset = (waIndex * 5.5 + Math.random() * 3) * 60 * 1000;
      hits.push({
        range: group.range,
        number: `${group.range}${Math.floor(100 + Math.random() * 900)}`,
        sid: 'WhatsApp',
        message: `Your WhatsApp code: ${p1}-${p2}. You can also tap on this link to verify your phone: v.whatsapp.com/${p1}${p2}`,
        time: now - timeOffset,
        operator: group.operator,
        country: group.country,
      });
      waIndex++;
    }
  });

  // 3. Supplemental active carrier hits for other social medias / ranges
  const otherHits = [
    {
      range: '2136551234',
      country: 'ALGERIA',
      operator: 'National Carrier Gateway',
      sid: 'Telegram',
      message: `Telegram code: ${Math.floor(10000 + Math.random() * 90000)}. You can also tap here to log in.`,
      time: now - 18 * 60 * 1000,
    },
    {
      range: '2287023999',
      country: 'TOGO',
      operator: 'Togo Telecom',
      sid: 'Google',
      message: `G-${Math.floor(100000 + Math.random() * 900000)} is your Google verification code.`,
      time: now - 22 * 60 * 1000,
    },
    {
      range: '2299712034',
      country: 'BENIN',
      operator: 'MTN Benin',
      sid: 'IMO',
      message: `Your IMO verification code is: ${Math.floor(1000 + Math.random() * 9000)}.`,
      time: now - 35 * 60 * 1000,
    },
    {
      range: '2613499102',
      country: 'MADAGASCAR',
      operator: 'National Carrier Gateway',
      sid: 'Facebook',
      message: `${Math.floor(10000 + Math.random() * 90000)} is your Facebook security code`,
      time: now - 45 * 1000,
    },
  ];

  hits.push(...otherHits);

  // Sort descending by time (most recent first)
  return hits.sort((a, b) => Number(b.time) - Number(a.time));
}

/**
 * Creates a new real-time simulated hit that matches active streams to keep counters live
 */
export function generateNextLivePacket(): LiveConsoleHit {
  const now = Date.now();
  const pool = [
    {
      range: '26134' + Math.floor(10000 + Math.random() * 90000),
      country: 'MADAGASCAR',
      operator: 'National Carrier Gateway',
      sid: 'Facebook',
      message: `${Math.floor(10000 + Math.random() * 90000)} is your Facebook confirmation code`,
    },
    {
      range: '213655' + Math.floor(1000 + Math.random() * 9000),
      country: 'ALGERIA',
      operator: 'National Carrier Gateway',
      sid: 'WhatsApp',
      message: `Your WhatsApp code: ${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`,
    },
    {
      range: '2287023' + Math.floor(100 + Math.random() * 900),
      country: 'TOGO',
      operator: 'Togo Telecom',
      sid: 'Facebook',
      message: `${Math.floor(10000 + Math.random() * 90000)} is your Facebook verification code`,
    },
    {
      range: '23762' + Math.floor(10000 + Math.random() * 90000),
      country: 'CAMEROON',
      operator: 'Orange CM',
      sid: 'WhatsApp',
      message: `Your WhatsApp code: ${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`,
    },
    {
      range: '213655' + Math.floor(1000 + Math.random() * 9000),
      country: 'ALGERIA',
      operator: 'National Carrier Gateway',
      sid: 'Telegram',
      message: `Telegram code: ${Math.floor(10000 + Math.random() * 90000)}`,
    },
  ];

  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    range: pick.range,
    number: pick.range,
    sid: pick.sid,
    message: pick.message,
    time: now,
    operator: pick.operator,
    country: pick.country,
  };
}
