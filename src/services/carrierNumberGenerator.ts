// SUPER X SMS — Physical Carrier Number Generator & Dial-Code Routing Engine

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

  // Sort dial codes by length descending (e.g. 880 before 88, 228 before 22)
  const sorted = [...KNOWN_CARRIER_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  let countryDef: CarrierCountryDef = {
    dialCode: digitsOnly.slice(0, 3) || "880",
    country: "International",
    operators: ["Physical Carrier Route", "Tier-1 Gateway"],
    nationalLength: 8,
  };

  // 1. Try to match preferred country if given
  if (preferredCountry) {
    const found = sorted.find(
      (c) => c.country.toLowerCase() === preferredCountry.toLowerCase()
    );
    if (found) countryDef = found;
  }

  // 2. Try prefix match on digitsOnly
  if (countryDef.country === "International" && digitsOnly) {
    const found = sorted.find((c) => digitsOnly.startsWith(c.dialCode));
    if (found) countryDef = found;
  }

  // 3. Fallback default
  if (countryDef.country === "International") {
    if (digitsOnly.startsWith("880")) {
      countryDef = KNOWN_CARRIER_COUNTRIES.find((c) => c.dialCode === "880") || countryDef;
    } else if (digitsOnly.startsWith("44")) {
      countryDef = KNOWN_CARRIER_COUNTRIES.find((c) => c.dialCode === "44") || countryDef;
    } else if (digitsOnly.startsWith("228")) {
      countryDef = KNOWN_CARRIER_COUNTRIES.find((c) => c.dialCode === "228") || countryDef;
    }
  }

  const dialCode = countryDef.dialCode;
  let nationalPart = "";

  if (digitsOnly.startsWith(dialCode)) {
    nationalPart = digitsOnly.slice(dialCode.length);
  } else {
    nationalPart = digitsOnly;
  }

  // Determine needed remaining length
  const targetNatLen = Math.max(countryDef.nationalLength, nationalPart.length + 3);
  let randomSuffix = "";
  const neededDigits = targetNatLen - nationalPart.length;

  if (neededDigits > 0) {
    for (let i = 0; i < neededDigits; i++) {
      randomSuffix += Math.floor(Math.random() * 10).toString();
    }
  }

  let finalNational = nationalPart + randomSuffix;
  if (!finalNational) {
    finalNational = String(Math.floor(10000000 + Math.random() * 90000000));
  }

  // Format full international number
  const noPlus = `${dialCode}${finalNational}`;
  const full = `+${noPlus}`;

  // Operator selection
  let operator = preferredOperator || "";
  if (!operator && countryDef.operators.length > 0) {
    const pick = Math.floor(Math.random() * countryDef.operators.length);
    operator = countryDef.operators[pick];
  }

  return {
    full_number: full,
    national_number: finalNational,
    no_plus_number: noPlus,
    country: countryDef.country,
    operator: operator || "Tier-1 Carrier",
  };
}
