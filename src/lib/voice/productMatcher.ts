// Product Matcher for Voice Billing
// Matches spoken terms against active Supabase product catalogue & admin-configured aliases
// Never silently substitutes different products

import {
  Product,
  ProductAlias,
  CartItem,
  BillingMode,
  ParsedVoiceCommand,
  VoiceMatchResult,
  ProductMatchCandidate,
} from '@/types';
import { calculateLineItem } from '@/lib/calculations';
import {
  parseSnoQuantityTranscript,
  parseSpokenNumberWord,
} from './tamilNumberParser';
import { parseMultiVoiceTranscript } from './languageParser';

/**
 * Standard string normalization: removes punctuation, lowers case, trims extra spaces
 */
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deletion
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[bn][an];
}

/**
 * Basic English suffix stemmer for plurals
 */
export function stemWord(word: string): string {
  const w = word.toLowerCase().trim();
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && !w.endsWith('tes') && !w.endsWith('ses')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/**
 * Computes fuzzy similarity score between 0 and 1
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  // Stemmed equality check
  const s1Stem = s1.split(' ').map(stemWord).join(' ');
  const s2Stem = s2.split(' ').map(stemWord).join(' ');
  if (s1Stem === s2Stem) return 0.98;

  // Exact substring check
  if (s1.includes(s2) || s2.includes(s1) || s1Stem.includes(s2Stem) || s2Stem.includes(s1Stem)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return Math.max(0.85, shorter / longer);
  }

  // Token Jaccard check
  const tokens1 = new Set(s1.split(' '));
  const tokens2 = new Set(s2.split(' '));
  let intersection = 0;
  for (const t of Array.from(tokens1)) {
    if (tokens2.has(t)) intersection++;
  }
  const union = new Set(Array.from(tokens1).concat(Array.from(tokens2))).size;
  const jaccard = union > 0 ? intersection / union : 0;
  if (jaccard > 0.6) return Math.min(0.95, jaccard);

  // Levenshtein normalized score
  const maxLen = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  const levScore = 1 - dist / maxLen;

  return Math.max(levScore, jaccard);
}

/**
 * Phonetic / Tanglish synonym expansions
 * E.g. "poochatti" -> "flower pot", "saravedi" -> "garland"
 */
const TANG_TO_KEYWORDS: Record<string, string[]> = {
  bijili: ['red bijili', 'bijili'],
  poochatti: ['flower pot', 'flower pots', 'புஸ்வாணம்'],
  puchatti: ['flower pot', 'flower pots'],
  saravedi: ['garland', 'wala', 'சரவெடி'],
  mathappu: ['sparkler', 'sparklers', 'மத்தாப்பு'],
  kambi: ['sparkler', 'electric sparklers'],
  chakkaram: ['ground chakkar', 'chakkar', 'சக்கரம்'],
  sakkaram: ['ground chakkar', 'chakkar'],
  kuruvi: ['lakshmi', '3 1/2'],
  aanai: ['sound bomb', 'bomb'],
  bomb: ['sound bomb', 'mega sound bomb', 'paper bomb'],
  rocket: ['rocket', 'lunik rocket', 'baby rocket'],
};

/**
 * Matches a parsed voice command against active catalogue & aliases
 */
export function matchProductForVoiceCommand(
  command: ParsedVoiceCommand,
  products: Product[],
  aliases: ProductAlias[] = [],
  currentCart: CartItem[] = [],
  billingMode: BillingMode = 'GST'
): VoiceMatchResult {
  // Check for UNDO action
  if (command.action === 'UNDO') {
    return {
      command,
      status: 'UNDO_REQUEST',
    };
  }

  // Special handling: "Intha item" / "This item"
  if (command.productNameQuery === 'CURRENT_ITEM') {
    if (currentCart.length === 0) {
      return {
        command,
        status: 'INVALID_COMMAND',
        errorMessage: 'Cannot update "this item" because the cart is empty.',
      };
    }
    // Target the most recently added item in cart
    const targetItem = currentCart[currentCart.length - 1];
    const line = calculateLineItem(
      {
        mrp: targetItem.product.mrp,
        unitPrice: targetItem.product.sellingPrice,
        quantity: command.quantity,
        discountPercentage: targetItem.discountPercentage,
        cgstRate: 9,
        sgstRate: 9,
      },
      billingMode
    );

    return {
      command,
      status: 'EXACT_MATCH',
      matchedProduct: targetItem.product,
      calculatedLineTotal: line.totalAmount,
      taxableValue: line.taxableValue,
      totalTax: line.totalTax,
    };
  }

  const query = normalizeText(command.productNameQuery);
  if (!query) {
    return {
      command,
      status: 'INVALID_COMMAND',
      errorMessage: 'No product name or description could be recognized from speech.',
    };
  }

  const candidates: ProductMatchCandidate[] = [];

  const recordCandidate = (
    prod: Product,
    score: number,
    matchedBy: ProductMatchCandidate['matchedBy'],
    term: string
  ) => {
    let finalScore = score;
    if (
      (command.action === 'UPDATE' || command.action === 'REMOVE') &&
      currentCart.some((item) => item.product.id === prod.id)
    ) {
      finalScore = Math.min(1.0, score + 0.1);
    }
    const existingIdx = candidates.findIndex((c) => c.product.id === prod.id);
    if (existingIdx >= 0) {
      if (finalScore > candidates[existingIdx].score) {
        candidates[existingIdx].score = finalScore;
        candidates[existingIdx].matchedBy = matchedBy;
        candidates[existingIdx].matchedTerm = term;
      }
    } else {
      candidates.push({ product: prod, score: finalScore, matchedBy, matchedTerm: term });
    }
  };

  // 1. Direct S.No., SKU or Barcode exact match
  for (const prod of products) {
    if (prod.sno != null) {
      const snoStr = String(prod.sno);
      if (
        query === snoStr ||
        query === `#${snoStr}` ||
        query === `sno ${snoStr}` ||
        query === `s.no ${snoStr}` ||
        query === `s.no. ${snoStr}` ||
        query === `நம்பர் ${snoStr}` ||
        query === `no ${snoStr}`
      ) {
        recordCandidate(prod, 1.0, 'EXACT_SKU', `S.No. #${prod.sno}`);
        continue;
      }
    }

    const cleanSku = normalizeText(prod.sku).replace(/^af\s*/, '');
    const cleanBarcode = normalizeText(prod.barcode);

    if (query === cleanBarcode || query === normalizeText(prod.sku) || query === cleanSku) {
      recordCandidate(prod, 1.0, 'EXACT_BARCODE', prod.barcode || prod.sku);
    }
  }

  // 2. Configured Aliases match
  for (const a of aliases) {
    const normAlias = normalizeText(a.alias);
    if (query === normAlias) {
      const prod = products.find((p) => p.id === a.productId);
      if (prod) {
        recordCandidate(prod, 0.98, 'EXACT_ALIAS', a.alias);
      }
    } else {
      const sim = stringSimilarity(query, normAlias);
      if (sim >= 0.70) {
        const prod = products.find((p) => p.id === a.productId);
        if (prod) {
          recordCandidate(prod, sim * 0.95, 'FUZZY_ALIAS', a.alias);
        }
      }
    }
  }

  // 3. Known Tanglish keyword mappings
  for (const [key, equivalents] of Object.entries(TANG_TO_KEYWORDS)) {
    if (query.includes(key) || key.includes(query)) {
      for (const prod of products) {
        const prodNameNorm = normalizeText(prod.name);
        const prodTamilNorm = normalizeText(prod.tamilName || '');
        const matchesEquivalent = equivalents.some(
          (eq) => prodNameNorm.includes(eq) || prodTamilNorm.includes(eq)
        );
        if (matchesEquivalent) {
          recordCandidate(prod, 0.90, 'FUZZY_ALIAS', key);
        }
      }
    }
  }

  // 4. Match against Product Name & Tamil Name
  for (const prod of products) {
    const prodName = normalizeText(prod.name);
    const prodTamil = normalizeText(prod.tamilName || '');

    // Exact matches
    if (prodName === query) {
      recordCandidate(prod, 1.0, 'EXACT_NAME', prod.name);
      continue;
    }
    if (prodTamil && prodTamil === query) {
      recordCandidate(prod, 1.0, 'EXACT_TAMIL', prod.tamilName || '');
      continue;
    }

    // Substring contains
    if (prodName.includes(query) || (prodTamil && prodTamil.includes(query))) {
      const shorter = Math.min(prodName.length, query.length);
      const longer = Math.max(prodName.length, query.length);
      const subScore = Math.max(0.80, shorter / longer);
      recordCandidate(prod, subScore, 'PARTIAL', prod.name);
      continue;
    }

    // Fuzzy similarity
    const simName = stringSimilarity(query, prodName);
    const simTamil = prodTamil ? stringSimilarity(query, prodTamil) : 0;
    const maxSim = Math.max(simName, simTamil);

    if (maxSim >= 0.55) {
      recordCandidate(prod, maxSim, 'FUZZY_NAME', maxSim === simTamil ? prod.tamilName! : prod.name);
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // If no candidates reached threshold
  if (candidates.length === 0 || candidates[0].score < 0.45) {
    // Provide top 3 closest items as suggestions
    const suggestions = products.slice(0, 3);
    return {
      command,
      status: 'NO_MATCH',
      suggestedProducts: suggestions,
      errorMessage: `Could not find any product matching "${command.productNameQuery}". Please select from suggestions or search manually.`,
    };
  }

  const topCandidate = candidates[0];

  // Ambiguity check:
  // If top 2 candidates have high and close scores (within 0.08 of each other), or if user provided a generic category name like "flower pots" and multiple variants exist
  const closeCandidates = candidates.filter((c) => c.score >= 0.70 && topCandidate.score - c.score <= 0.12);

  if (closeCandidates.length > 1 && topCandidate.score < 0.98) {
    return {
      command,
      status: 'AMBIGUOUS',
      matchedProduct: topCandidate.product,
      candidates: closeCandidates.slice(0, 5),
    };
  }

  // Exact or single high-confidence match
  const matchedProd = topCandidate.product;
  const line = calculateLineItem(
    {
      mrp: matchedProd.mrp,
      unitPrice: matchedProd.sellingPrice,
      quantity: command.quantity,
      discountPercentage: 0,
      cgstRate: 9,
      sgstRate: 9,
    },
    billingMode
  );

  return {
    command,
    status: 'EXACT_MATCH',
    matchedProduct: matchedProd,
    candidates: candidates.slice(0, 3),
    calculatedLineTotal: line.totalAmount,
    taxableValue: line.taxableValue,
    totalTax: line.totalTax,
  };
}

/**
 * Matches multiple parsed voice commands against active catalogue & aliases.
 * Generates unique IDs and selection flags for UI review and confirmation.
 */
export function matchMultiVoiceCommands(
  commands: ParsedVoiceCommand[],
  products: Product[],
  aliases: ProductAlias[] = [],
  currentCart: CartItem[] = [],
  billingMode: BillingMode = 'GST'
): VoiceMatchResult[] {
  return commands.map((cmd, idx) => {
    const res = matchProductForVoiceCommand(cmd, products, aliases, currentCart, billingMode);
    return {
      ...res,
      id: `match-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      selected: res.status === 'EXACT_MATCH' || res.status === 'AMBIGUOUS',
    };
  });
}

/**
 * Primary Voice Billing Interpreter:
 * Evaluates spoken Tamil / Tanglish / English utterances for SNO & Quantity pairs
 * (e.g., "ஒன்னு பத்து", "ரெண்டு அஞ்சு", "மூணு இருபது", "ஒன்னு பத்து ரெண்டு அஞ்சு").
 * Validates against active product catalogue, ensures stock limits, and calculates
 * line totals using POS billing engine.
 * Falls back to fuzzy product name matching if no numbers or SNO pairs were detected.
 */
export function interpretVoiceBillingTranscript(
  rawTranscript: string,
  products: Product[],
  aliases: ProductAlias[] = [],
  currentCart: CartItem[] = [],
  billingMode: BillingMode = 'GST'
): VoiceMatchResult[] {
  const trimmed = rawTranscript.trim();
  if (!trimmed) return [];

  // Check for immediate undo
  if (/^(undo|revert|thappu|ரத்து\s*செய்|முந்தையதை\s*நீக்கு)$/i.test(trimmed)) {
    return [
      {
        id: `undo-${Date.now()}`,
        command: {
          rawTranscript: trimmed,
          action: 'UNDO',
          productNameQuery: '',
          quantity: 0,
          confidence: 1.0,
        },
        status: 'UNDO_REQUEST',
        selected: true,
      },
    ];
  }

  // 1. Try SNO & Quantity pair parsing
  const maxCatalogSno = products.reduce((m, p) => Math.max(m, p.sno || 0), 206);
  const snoResult = parseSnoQuantityTranscript(trimmed, maxCatalogSno);

  if (snoResult.pairs.length > 0) {
    const results: VoiceMatchResult[] = [];

    for (let i = 0; i < snoResult.pairs.length; i++) {
      const pair = snoResult.pairs[i];
      // Resolve product where sno matches (or barcode matches serial number)
      const matched = products.find(
        (p) =>
          p.sno === pair.sno ||
          Number(p.barcode) === pair.sno ||
          p.sku.toLowerCase() === `af-${String(pair.sno).padStart(3, '0')}`
      );

      const uniqueId = `voice-sno-${Date.now()}-${i}-${pair.sno}`;

      if (!matched) {
        results.push({
          id: uniqueId,
          command: {
            rawTranscript: `${pair.rawSnoText} ${pair.rawQtyText}`,
            action: snoResult.action || 'ADD',
            productNameQuery: `S.No. #${pair.sno}`,
            quantity: pair.quantity,
            unit: pair.unit,
            confidence: pair.confidence,
            detectedLanguage: snoResult.detectedLanguage,
            isQuantityExplicit: true,
          },
          status: 'NO_MATCH',
          errorMessage: `Product with S.No. #${pair.sno} was not found in catalogue (Range: 1 to ${maxCatalogSno}).`,
          selected: false,
        });
        continue;
      }

      if (matched.isActive === false) {
        results.push({
          id: uniqueId,
          command: {
            rawTranscript: `${pair.rawSnoText} ${pair.rawQtyText}`,
            action: snoResult.action || 'ADD',
            productNameQuery: `[S.No. #${matched.sno}] ${matched.name}`,
            quantity: pair.quantity,
            unit: pair.unit || matched.uom,
            confidence: pair.confidence,
            detectedLanguage: snoResult.detectedLanguage,
            isQuantityExplicit: true,
          },
          status: 'NO_MATCH',
          matchedProduct: matched,
          errorMessage: `Product [S.No. #${matched.sno}] "${matched.name}" is currently disabled/inactive.`,
          selected: false,
        });
        continue;
      }

      const isOutOfStock = matched.currentStock <= 0;
      const isExceedingStock = pair.quantity > matched.currentStock;

      const line = calculateLineItem(
        {
          mrp: matched.mrp,
          unitPrice: matched.sellingPrice,
          quantity: pair.quantity,
          discountPercentage: 0,
          cgstRate: 9,
          sgstRate: 9,
        },
        billingMode
      );

      results.push({
        id: uniqueId,
        command: {
          rawTranscript: `${pair.rawSnoText} ${pair.rawQtyText}`,
          action: snoResult.action || 'ADD',
          productNameQuery: `[S.No. #${matched.sno}] ${matched.name}`,
          quantity: pair.quantity,
          unit: pair.unit || matched.uom,
          confidence: pair.confidence,
          detectedLanguage: snoResult.detectedLanguage,
          isQuantityExplicit: true,
        },
        status: isOutOfStock ? 'NO_MATCH' : 'EXACT_MATCH',
        matchedProduct: matched,
        calculatedLineTotal: line.totalAmount,
        taxableValue: line.taxableValue,
        totalTax: line.totalTax,
        errorMessage: isOutOfStock
          ? `Product [S.No. #${matched.sno}] "${matched.name}" is out of stock (0 ${matched.uom}).`
          : isExceedingStock
            ? `Requested ${pair.quantity} ${matched.uom}, but only ${matched.currentStock} currently in stock.`
            : undefined,
        selected: !isOutOfStock,
      });
    }

    // If there were unpaired numbers (e.g. "ஒன்னு பத்து இருபது" - 20 has no quantity)
    if (snoResult.isIncomplete && snoResult.unpairedNumbers) {
      results.push({
        id: `voice-incomplete-${Date.now()}`,
        command: {
          rawTranscript: trimmed,
          action: snoResult.action || 'ADD',
          productNameQuery: `Incomplete S.No: ${snoResult.unpairedNumbers.join(', ')}`,
          quantity: 0,
          confidence: 0.5,
          detectedLanguage: snoResult.detectedLanguage,
        },
        status: 'AMBIGUOUS',
        errorMessage: snoResult.errorMessage || `Incomplete command: S.No. ${snoResult.unpairedNumbers.join(', ')} is missing a quantity.`,
        selected: false,
      });
    }

    return results;
  }

  // 2. If no SNO pairs detected, but there were incomplete standalone numbers
  if (snoResult.isIncomplete && snoResult.unpairedNumbers && snoResult.unpairedNumbers.length > 0) {
    return [
      {
        id: `voice-incomplete-${Date.now()}`,
        command: {
          rawTranscript: trimmed,
          action: snoResult.action || 'ADD',
          productNameQuery: `S.No: ${snoResult.unpairedNumbers.join(', ')}`,
          quantity: 0,
          confidence: 0.5,
          detectedLanguage: snoResult.detectedLanguage,
        },
        status: 'AMBIGUOUS',
        errorMessage: snoResult.errorMessage || `Incomplete command: S.No. ${snoResult.unpairedNumbers.join(', ')} is missing a quantity. Please speak both S.No. and quantity (e.g., "ஒன்னு பத்து").`,
        selected: false,
      },
    ];
  }

  // 3. Fallback to product name / keyword fuzzy matching
  const parsedCommands = parseMultiVoiceTranscript(trimmed);
  return matchMultiVoiceCommands(parsedCommands, products, aliases, currentCart, billingMode);
}
