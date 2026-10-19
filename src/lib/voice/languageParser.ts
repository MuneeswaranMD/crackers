// Language Parser for Voice-Enabled Billing
// Supports English, Tamil, and Tanglish (Tamil spoken using English words)
// Extracts Action, Quantity (from digits or words), Unit/Pack, and Product Query

import { ParsedVoiceCommand, VoiceActionType } from '@/types';

// English number word dictionary
const ENGLISH_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
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

// Tanglish (Tamil written phonetically in English) number words
const TANGLISH_NUMBERS: Record<string, number> = {
  onnu: 1,
  ondu: 1,
  oru: 1,
  ooru: 1,
  rendu: 2,
  erandu: 2,
  irandu: 2,
  renndu: 2,
  moonu: 3,
  mundru: 3,
  moono: 3,
  naalu: 4,
  nangu: 4,
  nalu: 4,
  anju: 5,
  ainthu: 5,
  aindhu: 5,
  aidhu: 5,
  aaru: 6,
  aaruu: 6,
  ezhu: 7,
  yezhu: 7,
  yeazhu: 7,
  ettu: 8,
  yettu: 8,
  ombadhu: 9,
  onpathu: 9,
  ombodhu: 9,
  onbadhu: 9,
  pathu: 10,
  patthu: 10,
  pattu: 10,
  pathinonnu: 11,
  pathinondu: 11,
  pannirendu: 12,
  panirendu: 12,
  panrendu: 12,
  pathimoonu: 13,
  pathinaalu: 14,
  pathinanju: 15,
  padhinanju: 15,
  padhinaaru: 16,
  pathinaaru: 16,
  pathinezhu: 17,
  pathinettu: 18,
  pathembadhu: 19,
  pathombadhu: 19,
  iruvadhu: 20,
  irubadhu: 20,
  muppadhu: 30,
  naappadhu: 40,
  nalpadhu: 40,
  ambadhu: 50,
  aimbadhu: 50,
  aruvadhu: 60,
  ezhuvadhu: 70,
  enbadhu: 80,
  thonnooru: 90,
  nooru: 100,
  aayiram: 1000,
  jodi: 2,
};

// Tamil Script number words
const TAMIL_SCRIPT_NUMBERS: Record<string, number> = {
  பூஜ்ஜியம்: 0,
  ஒன்று: 1,
  ஒரு: 1,
  இரண்டு: 2,
  ரெண்டு: 2,
  மூன்று: 3,
  மூணு: 3,
  நான்கு: 4,
  நாலு: 4,
  ஐந்து: 5,
  அஞ்சு: 5,
  ஆறு: 6,
  ஏழு: 7,
  எட்டு: 8,
  ஒன்பது: 9,
  பத்து: 10,
  பதினொன்று: 11,
  பன்னிரண்டு: 12,
  பதின்மூன்று: 13,
  பதின்நான்கு: 14,
  பதினைந்து: 15,
  பதினாறு: 16,
  பதினேழு: 17,
  பதினெட்டு: 18,
  பத்தொன்பது: 19,
  இருபது: 20,
  இருபத்தைந்து: 25,
  முப்பது: 30,
  நாற்பது: 40,
  ஐம்பது: 50,
  அறுபது: 60,
  எழுபது: 70,
  எண்பது: 80,
  தொண்ணூறு: 90,
  நூறு: 100,
  ஆயிரம்: 1000,
  ஜோடி: 2,
};

// Unit / Pack Size detection
const UNIT_KEYWORDS: Record<string, string> = {
  packet: 'PKT',
  packets: 'PKT',
  pkt: 'PKT',
  pkts: 'PKT',
  pack: 'PKT',
  packs: 'PKT',
  பாக்கெட்: 'PKT',
  பாக்கெட்டுகள்: 'PKT',
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
  bundles: 'CASE',
  கேஸ்: 'CASE',
  கட்டு: 'CASE',
};

// Action keywords mapped to VoiceActionType
const ACTION_PATTERNS: { type: VoiceActionType; patterns: RegExp[] }[] = [
  {
    type: 'UNDO',
    patterns: [
      /\b(undo|revert|cancel\s+last|thappu|thappu\s+aayiduchu|thappu\s+aayiruchu|palayadha\s+maathu|ரத்து\s+செய்|முந்தையதை\s+நீக்கு)\b/i,
    ],
  },
  {
    type: 'REMOVE',
    patterns: [
      /\b(remove|delete|minus|clear|drop|cancel|vendaam|eduthudu|eduthuvidu|thooku|thookidu|kazhithu|azhi|kazhi|நீக்கு|நீக்கவும்|வேண்டாம்|அழி)\b/i,
      /\bremove\s+pannu\b/i,
      /\bdelete\s+pannu\b/i,
    ],
  },
  {
    type: 'UPDATE',
    patterns: [
      /\b(change|update|set|modify|make|quantity\s+to|maathu|mathu|aakku|aakidu|maathidu|மாற்று|ஆக்கு|அளவை\s+மாற்று)\b/i,
      /\bupdate\s+pannu\b/i,
      /\bchange\s+pannu\b/i,
    ],
  },
  {
    type: 'ADD',
    patterns: [
      /\b(add|include|put|plus|insert|give|take|ser|serka|podu|poodu|vai|kudu|edungka|vaangu|சேர்|சேர்க்கவும்|போடு|கொடு|எடு|கூட்டு)\b/i,
      /\badd\s+pannu\b/i,
      /\bpodu\s+pannu\b/i,
    ],
  },
];

/**
 * Detect language of transcript
 */
export function detectLanguage(text: string): 'en' | 'ta' | 'tanglish' {
  // Check for Tamil Unicode range (\u0B80-\u0BFF)
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta';
  }

  const lower = text.toLowerCase();
  const tanglishMarkers = [
    'pannu', 'add pannu', 'podu', 'aakku', 'mathu', 'maathu', 'thooku',
    'eduthudu', 'intha', 'andha', 'pattu', 'anju', 'rendu', 'moonu',
    'naalu', 'saravedi', 'poochatti', 'mathappu', 'kambi', 'dabba',
  ];

  const hasTanglishMarker = tanglishMarkers.some((marker) => lower.includes(marker));
  if (hasTanglishMarker) {
    return 'tanglish';
  }

  return 'en';
}

/**
 * Parses numeric value from a token (supporting digits, English, Tamil, and Tanglish numbers)
 */
export function parseNumberWord(word: string): number | null {
  const clean = word.toLowerCase().trim();
  if (!clean) return null;

  // Check if it's already a numeric string
  if (/^\d+(\.\d+)?$/.test(clean)) {
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  }

  if (clean in ENGLISH_NUMBERS) {
    return ENGLISH_NUMBERS[clean];
  }
  if (clean in TANGLISH_NUMBERS) {
    return TANGLISH_NUMBERS[clean];
  }
  if (clean in TAMIL_SCRIPT_NUMBERS) {
    return TAMIL_SCRIPT_NUMBERS[clean];
  }

  return null;
}

/**
 * Extract number from transcript words, handling compound numbers like "twenty five" or "irupathi anju"
 */
export function extractQuantityAndClean(tokens: string[]): {
  quantity: number | null;
  unit: string | undefined;
  remainingTokens: string[];
} {
  let quantity: number | null = null;
  let unit: string | undefined = undefined;
  const remaining: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase().trim();
    if (!token) continue;

    // Check if this token is a unit
    if (token in UNIT_KEYWORDS) {
      if (!unit) unit = UNIT_KEYWORDS[token];
      continue;
    }

    // Check for two-word numbers (e.g. "twenty five", "irupathi anju")
    if (i + 1 < tokens.length) {
      const nextToken = tokens[i + 1].toLowerCase().trim();
      const combo = `${token} ${nextToken}`;
      if (combo === 'twenty five' || combo === 'irupathi anju' || combo === 'இருபத்தைந்து') {
        if (quantity === null) {
          quantity = 25;
          i++; // skip next
          continue;
        }
      }
    }

    // Try parsing single number
    const num = parseNumberWord(token);
    if (num !== null && quantity === null) {
      quantity = num;
      continue;
    }

    remaining.push(tokens[i]);
  }

  return { quantity, unit, remainingTokens: remaining };
}

/**
 * Main parser function: Converts a raw spoken transcript into a structured ParsedVoiceCommand
 */
export function parseVoiceTranscript(rawTranscript: string): ParsedVoiceCommand {
  const trimmed = rawTranscript.trim();
  const lang = detectLanguage(trimmed);

  // Check for immediate undo
  if (/^(undo|revert|thappu|ரத்து\s+செய்)$/i.test(trimmed)) {
    return {
      rawTranscript: trimmed,
      action: 'UNDO',
      productNameQuery: '',
      quantity: 0,
      confidence: 1.0,
      detectedLanguage: lang,
    };
  }

  // Detect Action
  let detectedAction: VoiceActionType = 'ADD'; // Default action when phrasing is e.g. "10 packets red bijili"
  for (const { type, patterns } of ACTION_PATTERNS) {
    if (patterns.some((p) => p.test(trimmed))) {
      detectedAction = type;
      break;
    }
  }

  // Tokenize
  const rawTokens = trimmed
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  // Extract Quantity & Unit
  const { quantity, unit, remainingTokens } = extractQuantityAndClean(rawTokens);

  // Filter out action verbs, syntax fillers, and auxiliary words
  const noiseWords = new Set([
    // English
    'add', 'please', 'to', 'the', 'of', 'for', 'cart', 'bill', 'remove',
    'delete', 'change', 'update', 'set', 'make', 'quantity', 'item', 'items',
    'from', 'my', 'into', 'and', 'with', 'packet', 'packets', 'box', 'boxes',
    'piece', 'pieces', 'pcs',
    // Tanglish / Tamil
    'pannu', 'pannunga', 'podu', 'podunga', 'aakku', 'aakidu', 'mathu',
    'maathu', 'maathidu', 'ser', 'seru', 'kudu', 'eduthudu', 'thooku',
    'intha', 'andha', 'indha', 'oru', 'paaket', 'dabba', 'petty',
    'சேர்', 'போடு', 'நீக்கு', 'மாற்று', 'அளவை', 'பண்ணு'
  ]);

  const productTokens = remainingTokens.filter(
    (t) => !noiseWords.has(t.toLowerCase().trim())
  );

  let productNameQuery = productTokens.join(' ').trim();

  // If query refers to "intha item" or "this item", preserve reference
  const isCurrentItemReference = /\b(intha\s+item|this\s+item|current\s+item|intha|andha|indha|இந்த\s+பொருள்|இந்த\s+ஐட்டம்)\b/i.test(trimmed);
  if (!productNameQuery && isCurrentItemReference) {
    productNameQuery = 'CURRENT_ITEM';
  } else if (/^(intha\s+item|this\s+item|current\s+item|this|item)$/i.test(productNameQuery)) {
    productNameQuery = 'CURRENT_ITEM';
  }

  // Default quantity logic:
  // If action is ADD or REMOVE and no quantity was spoken, assume 1
  const finalQuantity = quantity !== null && quantity > 0 ? quantity : (detectedAction === 'ADD' || detectedAction === 'REMOVE' ? 1 : 1);

  return {
    rawTranscript: trimmed,
    action: detectedAction,
    productNameQuery,
    quantity: finalQuantity,
    unit,
    confidence: quantity !== null ? 0.95 : 0.85,
    detectedLanguage: lang,
    isQuantityExplicit: quantity !== null,
  };
}

/**
 * Splits a compound multi-product transcript into individual product command clauses
 * Supports conjunctions ("and", "plus", "appram", "mattrum"), punctuation (",", ";"),
 * and transition points where a new quantity appears.
 */
export function splitMultiProductTranscript(transcript: string): string[] {
  const trimmed = transcript.trim();
  if (!trimmed) return [];

  // Check for immediate undo
  if (/^(undo|revert|thappu|ரத்து\s+செய்)$/i.test(trimmed)) {
    return [trimmed];
  }

  // 1. Split by explicit conjunctions or delimiters
  const conjunctionRegex = /\b(?:and|plus|also|appram|apram|aprom|kooda|aduthu|mattrum|மற்றும்|அப்புறம்|அப்புறமா|மேலும்|பின்பு)\b|[,;\n]+/i;
  const rawSegments = trimmed
    .split(conjunctionRegex)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSegments.length > 1) {
    return rawSegments;
  }

  // 2. If no explicit conjunction was spoken, detect transition points where a new number begins
  // e.g. "10 red bijili 5 flower pot 2 sparklers"
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const segments: string[] = [];
  let currentSegmentTokens: string[] = [];
  let currentHasProductWords = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isNum = parseNumberWord(token) !== null;

    if (isNum && currentHasProductWords) {
      // Encountered a new number after we already had product words in current segment
      segments.push(currentSegmentTokens.join(' '));
      currentSegmentTokens = [token];
      currentHasProductWords = false;
    } else {
      currentSegmentTokens.push(token);
      const cleanToken = token.toLowerCase();
      const isNoise = [
        'packet', 'packets', 'box', 'boxes', 'pcs', 'piece', 'pieces',
        'dabba', 'paaket', 'of', 'the', 'for', 'in', 'to', 'add', 'please',
      ].includes(cleanToken);
      if (!isNum && !isNoise) {
        currentHasProductWords = true;
      }
    }
  }

  if (currentSegmentTokens.length > 0) {
    segments.push(currentSegmentTokens.join(' '));
  }

  return segments.length > 0 ? segments : [trimmed];
}

/**
 * Parses multiple product commands from a spoken sentence.
 * Returns an array of ParsedVoiceCommand objects.
 */
export function parseMultiVoiceTranscript(rawTranscript: string): ParsedVoiceCommand[] {
  const segments = splitMultiProductTranscript(rawTranscript);
  if (segments.length <= 1) {
    return [parseVoiceTranscript(rawTranscript)];
  }

  // Inherit action across compound segments if explicitly spoken (e.g. "pattu saravedi, anju poochatti add pannu")
  let inheritedAction: VoiceActionType = 'ADD';
  for (const seg of segments) {
    for (const { type, patterns } of ACTION_PATTERNS) {
      if (patterns.some((p) => p.test(seg))) {
        inheritedAction = type;
        break;
      }
    }
  }

  const results: ParsedVoiceCommand[] = [];
  for (const seg of segments) {
    const parsed = parseVoiceTranscript(seg);
    if (parsed.action === 'ADD' && inheritedAction !== 'ADD') {
      parsed.action = inheritedAction;
    }
    if (parsed.productNameQuery || parsed.action === 'UNDO') {
      results.push(parsed);
    }
  }

  return results.length > 0 ? results : [parseVoiceTranscript(rawTranscript)];
}
