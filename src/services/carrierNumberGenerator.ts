// SUPER X SMS — Physical Carrier Number Generator & Dial-Code Routing Engine
import { GLOBAL_COUNTRIES_LIST, getCountryInfo } from "./countryHelper";

export interface CarrierCountryDef {
  dialCode: string;
  country: string;
  operators: string[];
  nationalLength: number;
  leadingZeroInNational?: boolean;
}

export const KNOWN_CARRIER_COUNTRIES: CarrierCountryDef[] = [
  {
    dialCode: "228",
    country: "Togo",
    operators: ["Togocom", "Moov Togo", "Telecel Togo"],
    nationalLength: 8,
  },
  {
    dialCode: "880",
    country: "Bangladesh",
    operators: ["Grameenphone", "Banglalink", "Robi", "Teletalk"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "44",
    country: "United Kingdom",
    operators: ["EE Physical", "Vodafone UK", "O2 UK", "Three UK"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "225",
    country: "Ivory Coast",
    operators: ["Orange CI", "MTN CI", "Moov CI"],
    nationalLength: 10,
  },
  {
    dialCode: "232",
    country: "Sierra Leone",
    operators: ["Orange Sierra Leone", "Africell", "QCell"],
    nationalLength: 8,
  },
  {
    dialCode: "62",
    country: "Indonesia",
    operators: ["Telkomsel", "Indosat Ooredoo", "XL Axiata"],
    nationalLength: 10,
  },
  {
    dialCode: "91",
    country: "India",
    operators: ["Airtel VIP", "Reliance Jio", "Vi India"],
    nationalLength: 10,
  },
  {
    dialCode: "1",
    country: "United States",
    operators: ["T-Mobile", "Verizon Wireless", "AT&T"],
    nationalLength: 10,
  },
  {
    dialCode: "93",
    country: "Afghanistan",
    operators: ["Roshan", "Afghan Wireless", "MTN", "Etisalat"],
    nationalLength: 9,
  },
  {
    dialCode: "234",
    country: "Nigeria",
    operators: ["MTN Nigeria", "Airtel Nigeria", "Glo Mobile"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "233",
    country: "Ghana",
    operators: ["MTN Ghana", "Vodafone Ghana", "AirtelTigo"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "237",
    country: "Cameroon",
    operators: ["Orange Cameroun", "MTN Cameroon", "Nexttel"],
    nationalLength: 9,
  },
  {
    dialCode: "254",
    country: "Kenya",
    operators: ["Safaricom", "Airtel Kenya", "Telkom Kenya"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "255",
    country: "Tanzania",
    operators: ["Vodacom TZ", "Airtel TZ", "Tigo TZ"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "256",
    country: "Uganda",
    operators: ["MTN Uganda", "Airtel Uganda"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "63",
    country: "Philippines",
    operators: ["Globe Telecom", "Smart Communications", "DITO"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "84",
    country: "Vietnam",
    operators: ["Viettel", "Vinaphone", "Mobifone"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "92",
    country: "Pakistan",
    operators: ["Jazz", "Telenor PK", "Zong", "Ufone"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "20",
    country: "Egypt",
    operators: ["Vodafone Egypt", "Orange Egypt", "Etisalat Misr"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "90",
    country: "Turkey",
    operators: ["Turkcell", "Vodafone TR", "Turk Telekom"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "55",
    country: "Brazil",
    operators: ["Vivo", "Claro", "TIM Brasil"],
    nationalLength: 11,
  },
  {
    dialCode: "7",
    country: "Russia",
    operators: ["MTS", "MegaFon", "Beeline", "Tele2"],
    nationalLength: 10,
  },
  {
    dialCode: "33",
    country: "France",
    operators: ["Orange France", "SFR", "Bouygues"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "49",
    country: "Germany",
    operators: ["Telekom DE", "Vodafone DE", "O2 DE"],
    nationalLength: 10,
    leadingZeroInNational: true,
  },
  {
    dialCode: "34",
    country: "Spain",
    operators: ["Movistar", "Vodafone ES", "Orange ES"],
    nationalLength: 9,
  },
  {
    dialCode: "39",
    country: "Italy",
    operators: ["TIM", "Vodafone IT", "WindTre"],
    nationalLength: 10,
  },
  {
    dialCode: "971",
    country: "UAE",
    operators: ["e& (Etisalat)", "du"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "966",
    country: "Saudi Arabia",
    operators: ["stc", "Mobily", "Zain KSA"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "212",
    country: "Morocco",
    operators: ["Maroc Telecom", "Orange Maroc", "inwi"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "213",
    country: "Algeria",
    operators: ["Djezzy", "Mobilis", "Ooredoo"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "261",
    country: "Madagascar",
    operators: ["Orange Madagascar", "Airtel Madagascar", "Telma"],
    nationalLength: 9,
    leadingZeroInNational: true,
  },
  {
    dialCode: "229",
    country: "Benin",
    operators: ["MTN Benin", "Moov Africa", "Celtiis"],
    nationalLength: 8,
  },
  {
    dialCode: "382",
    country: "Montenegro",
    operators: ["Crnogorski Telekom", "One", "M:tel"],
    nationalLength: 8,
    leadingZeroInNational: true,
  },
  {
    dialCode: "236",
    country: "Central African Republic",
    operators: ["Telecel", "Orange", "Moov"],
    nationalLength: 8,
  },
];

export interface GeneratedCarrierNumber {
  full_number: string;
  national_number: string;
  no_plus_number: string;
  country: string;
  operator: string;
}

/**
 * Generate a realistic, authentic carrier number strictly respecting the requested prefix/range
 */
export function generateRealisticCarrierNumber(
  rangeInput: string,
  preferredCountry?: string,
  preferredOperator?: string
): GeneratedCarrierNumber {
  const cleanInput = (rangeInput || "").trim();
  const digitsOnly = cleanInput.replace(/[^0-9]/g, "");

  // Combine KNOWN_CARRIER_COUNTRIES and GLOBAL_COUNTRIES_LIST
  // Ensure every global country in Asia, Europe, Africa, Americas, Oceania is represented
  const allCarrierCountries: CarrierCountryDef[] = [...KNOWN_CARRIER_COUNTRIES];

  for (const gc of GLOBAL_COUNTRIES_LIST) {
    const cleanDial = gc.dialCode.replace(/\D/g, "");
    if (cleanDial && !allCarrierCountries.some((c) => c.dialCode === cleanDial)) {
      allCarrierCountries.push({
        dialCode: cleanDial,
        country: gc.name,
        operators: gc.operators.length > 0 ? gc.operators : ["Direct Carrier"],
        nationalLength: 9,
      });
    }
  }

  // Sort dial codes by length descending (e.g. 880, 228, 225, 971 before 97, 94, 44, 49, 1, 7, etc.)
  const sorted = allCarrierCountries.sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  // 1. Detect using dial prefix match
  let matchedCountryDef: CarrierCountryDef | undefined;
  if (digitsOnly) {
    matchedCountryDef = sorted.find((c) => digitsOnly.startsWith(c.dialCode));
  }

  // 2. Detect using getCountryInfo lookup
  const detectedInfo = getCountryInfo(digitsOnly);
  if (!matchedCountryDef && detectedInfo && detectedInfo.name && !detectedInfo.name.toLowerCase().includes("international")) {
    const cleanDial = detectedInfo.dialCode.replace(/\D/g, "");
    matchedCountryDef = sorted.find(
      (c) => c.country.toLowerCase() === detectedInfo.name.toLowerCase() || c.dialCode === cleanDial
    );
    if (!matchedCountryDef) {
      matchedCountryDef = {
        dialCode: cleanDial || digitsOnly.slice(0, 3) || "94",
        country: detectedInfo.name,
        operators: ["Direct Carrier", "Telecom"],
        nationalLength: 9,
      };
    }
  }

  // 3. Prefer requested country override if provided
  if (preferredCountry && !preferredCountry.toLowerCase().includes("international")) {
    const foundByCountry = sorted.find(
      (c) => c.country.toLowerCase() === preferredCountry.toLowerCase()
    );
    if (foundByCountry) matchedCountryDef = foundByCountry;
  }

  // Fallback if completely unmatched (NEVER "International", fallback to Sri Lanka or first 2 digits)
  const countryDef: CarrierCountryDef = matchedCountryDef || {
    dialCode: digitsOnly.slice(0, 2) || "94",
    country: "Sri Lanka",
    operators: ["Dialog", "Mobitel", "Airtel", "Hutch"],
    nationalLength: 9,
  };

  // Ensure digitsOnly starts with country dial code if available
  let fullDigits = digitsOnly;
  if (fullDigits && !fullDigits.startsWith(countryDef.dialCode)) {
    fullDigits = `${countryDef.dialCode}${digitsOnly}`;
  }
  if (!fullDigits) {
    fullDigits = `${countryDef.dialCode}0171`;
  }

  // Pad remaining digits to reach standard carrier length (min 10 digits total)
  const targetTotalLen = Math.max(10, countryDef.dialCode.length + (countryDef.nationalLength || 7));
  const needed = targetTotalLen - fullDigits.length;
  let randomSuffix = "";
  if (needed > 0) {
    for (let i = 0; i < needed; i++) {
      randomSuffix += Math.floor(Math.random() * 10).toString();
    }
  }

  const finalNoPlus = fullDigits + randomSuffix;
  const finalFull = `+${finalNoPlus}`;

  // Operator selection - authentic carrier operator, never "Physical Carrier Route"
  let operator = preferredOperator || "";
  if (!operator || operator.toLowerCase().includes("physical carrier route") || operator === "Carrier Route") {
    if (countryDef.operators.length > 0) {
      const pick = Math.floor(Math.random() * countryDef.operators.length);
      operator = countryDef.operators[pick];
    } else {
      operator = "Dialog";
    }
  }

  return {
    full_number: finalFull,
    national_number: finalNoPlus, // Preserve exact user prefix without stripping country code
    no_plus_number: finalNoPlus,
    country: countryDef.country,
    operator: operator || "Direct Carrier",
  };
}
