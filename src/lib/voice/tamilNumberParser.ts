// Dedicated Tamil, Spoken Tamil, Tanglish & English Number Parser
// Supports high-speed SNO & Quantity pair parsing for fireworks counter billing

import { Product } from '@/types';

/**
 * Normalizes Tamil and spoken Tamil text:
 * - Trims and normalizes whitespace
 * - Strips punctuation while preserving Tamil Unicode characters
 * - Normalizes common speech recognition phonetic variations
 */
export function normalizeTamilSpeechText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"[\]?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Single-word Tamil Script number dictionary (0 to 1000)
export const TAMIL_SCRIPT_NUMBER_MAP: Record<string, number> = {
  பூஜ்ஜியம்: 0,
  பூஜ்யம்: 0,
  சுழியம்: 0,
  ஒன்று: 1,
  ஒன்னு: 1,
  ஒண்ணு: 1,
  ஒரு: 1,
  ஒண்டு: 1,
  ஒன்னாவது: 1,
  ஒன்னா: 1,
  இரண்டு: 2,
  ரெண்டு: 2,
  ரெண்டாவது: 2,
  ரெண்டா: 2,
  இரன்டு: 2,
  மூன்று: 3,
  மூணு: 3,
  முணு: 3,
  மூணாவது: 3,
  மூணா: 3,
  முன்று: 3,
  நான்கு: 4,
  நாலு: 4,
  நாலாவது: 4,
  நாலா: 4,
  ஐந்து: 5,
  அஞ்சு: 5,
  அஞ்சாவது: 5,
  அஞ்சா: 5,
  ஆறு: 6,
  ஆறாவது: 6,
  ஆறா: 6,
  ஏழு: 7,
  யேழு: 7,
  ஏழாவது: 7,
  ஏழா: 7,
  எட்டு: 8,
  யெட்டு: 8,
  எட்டாவது: 8,
  எட்டா: 8,
  ஒன்பது: 9,
  ஒம்பது: 9,
  ஒம்போது: 9,
  ஒன்பதாவது: 9,
  ஒம்பதாவது: 9,
  பத்து: 10,
  பத்தாவது: 10,
  பத்தா: 10,
  பதினொன்று: 11,
  பதினொன்னு: 11,
  பதினோரு: 11,
  பன்னிரண்டு: 12,
  பன்னிரெண்டு: 12,
  பனிரெண்டு: 12,
  பன்னிரண்டுவது: 12,
  பதின்மூன்று: 13,
  பதின்மூணு: 13,
  பதிமூன்று: 13,
  பதிமூணு: 13,
  பதின்நான்கு: 14,
  பதினாங்கு: 14,
  பதினாலு: 14,
  பதினைந்து: 15,
  பதினஞ்சு: 15,
  பாஞ்சு: 15,
  பதினாறு: 16,
  பதினேழு: 17,
  பதினெட்டு: 18,
  பத்தொன்பது: 19,
  பத்தொம்பது: 19,
  இருபது: 20,
  இருவது: 20,
  இருபதாவது: 20,
  இருபத்திஒன்று: 21,
  இருபத்திஒன்னு: 21,
  இருபத்திரண்டு: 22,
  இருபத்திரெண்டு: 22,
  இருபத்திமூன்று: 23,
  இருபத்திமூணு: 23,
  இருபத்திநான்கு: 24,
  இருபத்திநாலு: 24,
  இருபத்தைந்து: 25,
  இருபத்தஞ்சு: 25,
  இருபத்தாறு: 26,
  இருபத்தேழு: 27,
  இருபத்தெட்டு: 28,
  இருபத்தொன்பது: 29,
  இருபத்தொம்பது: 29,
  முப்பது: 30,
  முப்பதா: 30,
  முப்பத்திஒன்று: 31,
  முப்பத்திஒன்னு: 31,
  முப்பத்திரண்டு: 32,
  முப்பத்திரெண்டு: 32,
  முப்பத்தைந்து: 35,
  முப்பத்தஞ்சு: 35,
  நாற்பது: 40,
  நாப்பது: 40,
  நாற்பத்திஒன்று: 41,
  நாப்பத்திஒன்னு: 41,
  நாற்பத்தைந்து: 45,
  நாப்பத்தஞ்சு: 45,
  ஐம்பது: 50,
  அம்பது: 50,
  ஐம்பத்தைந்து: 55,
  அம்பத்தஞ்சு: 55,
  அறுபது: 60,
  அறுபத்தைந்து: 65,
  அறுபத்தஞ்சு: 65,
  எழுபது: 70,
  எழுபத்தைந்து: 75,
  எழுபத்தஞ்சு: 75,
  எண்பது: 80,
  எம்பது: 80,
  எண்பத்தைந்து: 85,
  தொண்ணூறு: 90,
  தொண்ணூத்தைந்து: 95,
  நூறு: 100,
  நூற்றிஒன்று: 101,
  நூத்திஒன்னு: 101,
  நூற்றிஐம்பது: 150,
  நூத்திஅம்பது: 150,
  இருநூறு: 200,
  இருநூற்றிஆறு: 206,
  இருநூத்திஆறு: 206,
  ஜோடி: 2,
};

// Tanglish (Tamil spoken words typed in Roman script)
export const TANGLISH_NUMBER_MAP: Record<string, number> = {
  zero: 0,
  poojiyam: 0,
  onnu: 1,
  ondu: 1,
  oru: 1,
  onnum: 1,
  onnavadhu: 1,
  rendu: 2,
  erandu: 2,
  irandu: 2,
  rendavadhu: 2,
  moonu: 3,
  mundru: 3,
  moonavadhu: 3,
  naalu: 4,
  nangu: 4,
  nalu: 4,
  naalavadhu: 4,
  anju: 5,
  ainthu: 5,
  aindhu: 5,
  aidhu: 5,
  anjavadhu: 5,
  aaru: 6,
  aaravadhu: 6,
  ezhu: 7,
  yezhu: 7,
  ezhavadhu: 7,
  ettu: 8,
  yettu: 8,
  ettavadhu: 8,
  ombadhu: 9,
  onpathu: 9,
  ombodhu: 9,
  onbadhu: 9,
  ombadhavadhu: 9,
  pathu: 10,
  patthu: 10,
  pattu: 10,
  pathavadhu: 10,
  pathinonnu: 11,
  pathinondu: 11,
  pannirendu: 12,
  panirendu: 12,
  panrendu: 12,
  pathimoonu: 13,
  pathinaalu: 14,
  pathinanju: 15,
  padhinanju: 15,
  paanju: 15,
  pathinaaru: 16,
  pathinezhu: 17,
  pathinettu: 18,
  pathombadhu: 19,
  pathembadhu: 19,
  iruvadhu: 20,
  irubadhu: 20,
  irupathi: 20,
  irubathi: 20,
  irupathionnu: 21,
  irupathianju: 25,
  muppadhu: 30,
  muppathi: 30,
  muppathianju: 35,
  naappadhu: 40,
  nalpadhu: 40,
  naappathi: 40,
  naappathianju: 45,
  ambadhu: 50,
  aimbadhu: 50,
  ambathi: 50,
  ambathianju: 55,
  aruvadhu: 60,
  ezhuvadhu: 70,
  enbadhu: 80,
  embadhu: 80,
  thonnooru: 90,
  nooru: 100,
  noothi: 100,
  irunooru: 200,
  aayiram: 1000,
  jodi: 2,
};

// English Number Words
export const ENGLISH_NUMBER_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  first: 1,
  two: 2,
  second: 2,
  three: 3,
  third: 3,
  four: 4,
  fourth: 4,
  five: 5,
  fifth: 5,
  six: 6,
  sixth: 6,
  seven: 7,
  seventh: 7,
  eight: 8,
  eighth: 8,
  nine: 9,
  ninth: 9,
  ten: 10,
  tenth: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  dozen: 12,
  pair: 2,
};

// Tamil Tens prefixes for compound numbers (e.g., "இருபத்தி" + "ஒன்று" = 21)
const COMPOUND_TENS_PREFIXES: Record<string, number> = {
  இருபத்தி: 20,
  இருவத்தி: 20,
  முப்பத்தி: 30,
  நாற்பத்தி: 40,
  நாப்பத்தி: 40,
  ஐம்பத்தி: 50,
  அம்பத்தி: 50,
  அறுபத்தி: 60,
  எழுபத்தி: 70,
  எண்பத்தி: 80,
  எம்பத்தி: 80,
  தொண்ணூத்தி: 90,
  நூற்றி: 100,
  நூத்தி: 100,
  இருநூற்றி: 200,
  இருநூத்தி: 200,
  irupathi: 20,
  irubathi: 20,
  muppathi: 30,
  naappathi: 40,
  ambathi: 50,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

// Unit keywords
export const SPOKEN_UNITS: Record<string, string> = {
  packet: 'PKT',
  packets: 'PKT',
  pkt: 'PKT',
  pack: 'PKT',
  packs: 'PKT',
  பாக்கெட்: 'PKT',
  பாக்கெட்டுகள்: 'PKT',
  பாக்கெட்டு: 'PKT',
  box: 'BOX',
  boxes: 'BOX',
  பெட்டி: 'BOX',
  பாக்ஸ்: 'BOX',
  dabba: 'BOX',
  piece: 'PCS',
  pieces: 'PCS',
  pcs: 'PCS',
  pc: 'PCS',
  பீஸ்: 'PCS',
  case: 'CASE',
  cases: 'CASE',
  bundle: 'CASE',
  கேஸ்: 'CASE',
  கட்டு: 'CASE',
};

// Keywords indicating explicit SNO reference
const SNO_MARKERS = new Set([
  'sno',
  's.no',
  's.no.',
  'sno.',
  'serial',
  'number',
  'no',
  'no.',
  'item',
  'code',
  'வரிசை',
  'வரிசை எண்',
  'வரிசைஎண்',
  'எண்',
  'நம்பர்',
  'நம்பரு',
  'ஐட்டம்',
]);

// Keywords indicating explicit Quantity reference
const QTY_MARKERS = new Set([
  'qty',
  'quantity',
  'count',
  'pieces',
  'packs',
  'packets',
  'boxes',
  'அளவு',
  'எண்ணிக்கை',
  'குவாண்டிட்டி',
]);

/**
 * Parses a single token or compound into a numeric value
 */
export function parseSpokenNumberWord(word: string): number | null {
  if (!word) return null;
  const clean = word.toLowerCase().trim();

  // 1. Direct digits (e.g. "1", "10", "206")
  if (/^\d+$/.test(clean)) {
    const val = parseInt(clean, 10);
    return isNaN(val) ? null : val;
  }

  // 2. Tamil script numerals (௧=1, ௨=2, ...)
  if (/^[\u0BE6-\u0BEF]+$/.test(clean)) {
    const tamilDigits = ['௦', '௧', '௨', '௩', '௪', '௫', '௬', '௭', '௮', '௯'];
    let arabic = '';
    for (const char of clean) {
      const idx = tamilDigits.indexOf(char);
      if (idx >= 0) arabic += idx;
    }
    const val = parseInt(arabic, 10);
    if (!isNaN(val)) return val;
  }

  // 3. Tamil Script Number Map
  if (clean in TAMIL_SCRIPT_NUMBER_MAP) {
    return TAMIL_SCRIPT_NUMBER_MAP[clean];
  }

  // 4. Tanglish Number Map
  if (clean in TANGLISH_NUMBER_MAP) {
    return TANGLISH_NUMBER_MAP[clean];
  }

  // 5. English Number Map
  if (clean in ENGLISH_NUMBER_MAP) {
    return ENGLISH_NUMBER_MAP[clean];
  }

  // 6. Suffix stripping (e.g. "1st", "2nd", "1வது", "10-வது", "ஒன்னாவது")
  const strippedOrdinal = clean.replace(/(\d+)(st|nd|rd|th|வது|ஆவது)/, '$1');
  if (/^\d+$/.test(strippedOrdinal)) {
    return parseInt(strippedOrdinal, 10);
  }

  return null;
}

export interface ExtractedNumberToken {
  value: number;
  rawText: string;
  isExplicitSno: boolean;
  isExplicitQty: boolean;
  unit?: string;
}

/**
 * Extracts all numeric values from spoken transcript tokens, resolving two-word compound numbers
 * (e.g. "இருபத்தி" + "ஐந்து" = 25, "நூற்றி" + "பத்து" = 110, "twenty" + "five" = 25)
 * and respecting explicit markers like "SNO 1", "நம்பர் 2", "10 பாக்கெட்".
 */
export function extractNumbersWithContext(tokens: string[]): ExtractedNumberToken[] {
  const result: ExtractedNumberToken[] = [];
  let pendingExplicitSno = false;
  let pendingExplicitQty = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase().trim();
    if (!token) continue;

    // Check if token is an explicit SNO marker
    if (SNO_MARKERS.has(token) || token.startsWith('#') || token.startsWith('sno:')) {
      pendingExplicitSno = true;
      // Handle "#1" or "sno:1"
      const directNum = token.replace(/^[#]|^(sno:?)/i, '');
      if (/^\d+$/.test(directNum)) {
        result.push({
          value: parseInt(directNum, 10),
          rawText: token,
          isExplicitSno: true,
          isExplicitQty: false,
        });
        pendingExplicitSno = false;
      }
      continue;
    }

    // Check if token is an explicit QTY marker
    if (QTY_MARKERS.has(token)) {
      pendingExplicitQty = true;
      continue;
    }

    // Check for two-word compound number (e.g. "இருபத்தி" + "ஒன்று" = 21, "twenty" + "five" = 25)
    if (i + 1 < tokens.length) {
      const nextToken = tokens[i + 1].toLowerCase().trim();
      const tensVal = COMPOUND_TENS_PREFIXES[token];
      const unitsVal = parseSpokenNumberWord(nextToken);

      if (tensVal !== undefined && unitsVal !== null && unitsVal >= 0 && unitsVal < 10) {
        const combined = tensVal + unitsVal;
        result.push({
          value: combined,
          rawText: `${token} ${nextToken}`,
          isExplicitSno: pendingExplicitSno,
          isExplicitQty: pendingExplicitQty,
        });
        pendingExplicitSno = false;
        pendingExplicitQty = false;
        i++; // skip nextToken
        continue;
      }
    }

    // Single number token check
    const num = parseSpokenNumberWord(token);
    if (num !== null) {
      // Check if subsequent token is a unit (e.g. "10 பாக்கெட்", "5 box")
      let unit: string | undefined = undefined;
      if (i + 1 < tokens.length) {
        const nextToken = tokens[i + 1].toLowerCase().trim();
        if (nextToken in SPOKEN_UNITS) {
          unit = SPOKEN_UNITS[nextToken];
          i++; // skip unit token
        }
      }

      result.push({
        value: num,
        rawText: token,
        isExplicitSno: pendingExplicitSno,
        isExplicitQty: pendingExplicitQty,
        unit,
      });

      pendingExplicitSno = false;
      pendingExplicitQty = false;
      continue;
    }

    // Check if token has attached unit (e.g. "10pkt", "5box")
    const matchUnit = token.match(/^(\d+)(pkt|box|pcs|case|பாக்கெட்|பாக்ஸ்)$/i);
    if (matchUnit) {
      const val = parseInt(matchUnit[1], 10);
      const unitKey = matchUnit[2].toLowerCase();
      result.push({
        value: val,
        rawText: token,
        isExplicitSno: pendingExplicitSno,
        isExplicitQty: pendingExplicitQty,
        unit: SPOKEN_UNITS[unitKey] || 'BOX',
      });
      pendingExplicitSno = false;
      pendingExplicitQty = false;
      continue;
    }
  }

  return result;
}

export interface ParsedSnoQuantityPair {
  sno: number;
  quantity: number;
  unit?: string;
  rawSnoText: string;
  rawQtyText: string;
  isExplicitSno: boolean;
  isExplicitQty: boolean;
  confidence: number;
}

export interface SnoParseResult {
  pairs: ParsedSnoQuantityPair[];
  isIncomplete: boolean;
  isAmbiguous: boolean;
  errorMessage?: string;
  unpairedNumbers?: number[];
  rawTranscript: string;
  detectedLanguage: 'ta' | 'en' | 'tanglish';
  action?: 'ADD' | 'REMOVE' | 'UPDATE' | 'UNDO';
}

/**
 * Core SNO & Quantity Parser for Tamil / Tanglish / English speech:
 * Parses utterances like:
 * - "ஒன்னு பத்து" -> SNO 1, Quantity 10
 * - "ரெண்டு அஞ்சு" -> SNO 2, Quantity 5
 * - "மூணு இருபது" -> SNO 3, Quantity 20
 * - "ஒன்னு பத்து ரெண்டு அஞ்சு" -> SNO 1 Qty 10 & SNO 2 Qty 5
 * - "1 10 2 5" -> SNO 1 Qty 10 & SNO 2 Qty 5
 * - "SNO 1 quantity 10" -> SNO 1 Qty 10
 */
export function parseSnoQuantityTranscript(
  rawTranscript: string,
  maxCatalogSno: number = 206
): SnoParseResult {
  const normalized = normalizeTamilSpeechText(rawTranscript);

  // Check language
  const isTamil = /[\u0B80-\u0BFF]/.test(rawTranscript);
  const detectedLanguage: 'ta' | 'en' | 'tanglish' = isTamil
    ? 'ta'
    : /\b(onnu|rendu|moonu|naalu|anju|pathu|saravedi|poochatti)\b/i.test(normalized)
    ? 'tanglish'
    : 'en';

  // Check for immediate undo command
  if (/^(undo|revert|thappu|ரத்து\s*செய்|முந்தையதை\s*நீக்கு)$/i.test(normalized)) {
    return {
      pairs: [],
      isIncomplete: false,
      isAmbiguous: false,
      rawTranscript,
      detectedLanguage,
      action: 'UNDO',
    };
  }

  // Action detection (avoiding \b for Tamil Unicode words)
  let action: 'ADD' | 'REMOVE' | 'UPDATE' | 'UNDO' = 'ADD';
  if (/(?:^|\s)(remove|delete|minus|நீக்கு|நீக்குங்க|வேண்டாம்|அழி|thooku|eduthudu|எடுத்துடு)(?:$|\s)/i.test(normalized)) {
    action = 'REMOVE';
  } else if (/(?:^|\s)(change|update|modify|மாற்று|மாத்து|மாத்துங்க|மாற்றுங்க|ஆக்கு|அளவை\s*மாற்று|maathu|mathu|aakku)(?:$|\s)/i.test(normalized)) {
    action = 'UPDATE';
  }

  // Tokenize
  const rawTokens = normalized.split(/\s+/).filter(Boolean);

  // Check for descriptive product words (words that are not numbers, units, markers, or fillers)
  const fillerAndNoiseWords = new Set([
    'and', 'plus', 'add', 'please', 'for', 'to', 'the', 'of', 'in', 'with', 'also',
    'appram', 'apram', 'mattrum', 'kooda', 'aduthu', 'மற்றும்', 'அப்புறம்',
    'packet', 'packets', 'pkt', 'pack', 'packs', 'box', 'boxes', 'piece', 'pieces', 'pcs',
    'dabba', 'பாக்கெட்', 'பாக்கெட்டுகள்', 'பெட்டி', 'பாக்ஸ்', 'பீஸ்', 'கேஸ்',
    'sno', 's.no', 'number', 'no', 'item', 'code', 'qty', 'quantity', 'எண்', 'நம்பர்', 'அளவு',
    'remove', 'delete', 'change', 'update', 'modify', 'நீக்கு', 'மாற்று', 'போடு', 'சேர்',
    'pannu', 'podu', 'thooku', 'eduthudu', 'maathu', 'சார்', 'sir',
  ]);

  const nonNoiseProductTokens = rawTokens.filter(
    (t) => !fillerAndNoiseWords.has(t) && parseSpokenNumberWord(t) === null
  );
  const hasDescriptiveProductWords = nonNoiseProductTokens.length > 0;

  const numberTokens = extractNumbersWithContext(rawTokens);

  if (numberTokens.length === 0) {
    return {
      pairs: [],
      isIncomplete: false,
      isAmbiguous: false,
      rawTranscript,
      detectedLanguage,
      action,
    };
  }

  // If there's only 1 number and the utterance has descriptive product words (e.g. "10 red bijili"),
  // treat the number as product quantity rather than an incomplete S.No.!
  if (numberTokens.length === 1 && !numberTokens[0].isExplicitSno && hasDescriptiveProductWords) {
    return {
      pairs: [],
      isIncomplete: false,
      isAmbiguous: false,
      rawTranscript,
      detectedLanguage,
      action,
    };
  }

  const pairs: ParsedSnoQuantityPair[] = [];
  const unpaired: number[] = [];

  // Group number tokens into (SNO, Quantity) pairs
  let idx = 0;
  while (idx < numberTokens.length) {
    const current = numberTokens[idx];

    // Case 1: If current is explicitly marked as QTY without preceding SNO, incomplete
    if (current.isExplicitQty && !current.isExplicitSno) {
      unpaired.push(current.value);
      idx++;
      continue;
    }

    // Check if next token exists to form a pair
    if (idx + 1 < numberTokens.length) {
      const next = numberTokens[idx + 1];

      // Current is SNO, Next is Quantity
      const snoVal = current.value;
      const qtyVal = next.value;

      // Basic sanity checks: SNO must be > 0, Quantity must be > 0
      if (snoVal > 0 && qtyVal > 0) {
        pairs.push({
          sno: snoVal,
          quantity: qtyVal,
          unit: next.unit || current.unit,
          rawSnoText: current.rawText,
          rawQtyText: next.rawText,
          isExplicitSno: current.isExplicitSno,
          isExplicitQty: next.isExplicitQty,
          confidence: current.isExplicitSno || next.isExplicitQty ? 0.98 : 0.95,
        });
        idx += 2;
        continue;
      }
    }

    // Odd or unmatched number left
    unpaired.push(current.value);
    idx++;
  }

  const isIncomplete = unpaired.length > 0;
  const isAmbiguous = pairs.some((p) => p.sno > maxCatalogSno || p.quantity <= 0);

  let errorMessage: string | undefined = undefined;
  if (isIncomplete) {
    errorMessage = `Incomplete command: S.No. ${unpaired.join(', ')} is missing a quantity. Cashier can confirm or edit.`;
  } else if (isAmbiguous) {
    const invalidSno = pairs.find((p) => p.sno > maxCatalogSno)?.sno;
    errorMessage = `Invalid S.No. #${invalidSno} (Valid catalogue range is 1 to ${maxCatalogSno}).`;
  }

  return {
    pairs,
    isIncomplete,
    isAmbiguous,
    errorMessage,
    unpairedNumbers: unpaired.length > 0 ? unpaired : undefined,
    rawTranscript,
    detectedLanguage,
    action,
  };
}
