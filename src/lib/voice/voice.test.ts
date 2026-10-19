import { describe, it, expect } from 'vitest';
import {
  parseVoiceTranscript,
  parseMultiVoiceTranscript,
  splitMultiProductTranscript,
  detectLanguage,
  parseNumberWord,
  extractQuantityAndClean,
} from './languageParser';
import {
  matchProductForVoiceCommand,
  matchMultiVoiceCommands,
  interpretVoiceBillingTranscript,
  normalizeText,
  levenshteinDistance,
  stringSimilarity,
  stemWord,
} from './productMatcher';
import {
  parseSpokenNumberWord,
  parseSnoQuantityTranscript,
  extractNumbersWithContext,
  normalizeTamilSpeechText,
} from './tamilNumberParser';
import { Product, ProductAlias, CartItem } from '@/types';
import { calculateCartItem, calculateInvoiceTotals } from '@/lib/calculations';

// Mock Fireworks Product Catalogue
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sno: 1,
    shopId: 'shop-01',
    categoryId: 'cat-bijili',
    categoryName: 'Bijili Crackers',
    sku: 'AF-014',
    barcode: '1',
    name: 'Red Bijili',
    tamilName: 'சிவப்பு பிஜிலி',
    brand: 'Agana Fireworks',
    packSize: '1 PKT',
    uom: 'PKT',
    purchasePrice: 25,
    mrp: 175,
    sellingPrice: 35,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 100,
    minStockAlert: 10,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
  },
  {
    id: 'prod-002',
    sno: 2,
    shopId: 'shop-01',
    categoryId: 'cat-flower',
    categoryName: 'Flower Pot',
    sku: 'AF-045',
    barcode: '2',
    name: 'Flower Pot Small',
    tamilName: 'சிறிய புஸ்வாணம்',
    brand: 'Agana Fireworks',
    packSize: '1 BOX',
    uom: 'BOX',
    purchasePrice: 49,
    mrp: 350,
    sellingPrice: 70,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 50,
    minStockAlert: 10,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
  },
  {
    id: 'prod-003',
    sno: 3,
    shopId: 'shop-01',
    categoryId: 'cat-flower',
    categoryName: 'Flower Pot',
    sku: 'AF-046',
    barcode: '3',
    name: 'Flower Pot Big',
    tamilName: 'பெரிய புஸ்வாணம்',
    brand: 'Agana Fireworks',
    packSize: '1 BOX',
    uom: 'BOX',
    purchasePrice: 70,
    mrp: 500,
    sellingPrice: 100,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 40,
    minStockAlert: 10,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
  },
  {
    id: 'prod-004',
    sno: 4,
    shopId: 'shop-01',
    categoryId: 'cat-sparklers',
    categoryName: 'Sparklers',
    sku: 'AF-189',
    barcode: '4',
    name: '15 cm Electric Sparklers',
    tamilName: '15 செமீ எலக்ட்ரிக் மத்தாப்பு',
    brand: 'Agana Fireworks',
    packSize: '1 BOX',
    uom: 'BOX',
    purchasePrice: 29,
    mrp: 210,
    sellingPrice: 42,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 15,
    minStockAlert: 20, // Low stock item
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
  },
  {
    id: 'prod-005',
    sno: 5,
    shopId: 'shop-01',
    categoryId: 'cat-rocket',
    categoryName: 'Rocket',
    sku: 'AF-041',
    barcode: '5',
    name: '2 Sound Rocket',
    tamilName: '2 சவுண்ட் ராக்கெட்',
    brand: 'Agana Fireworks',
    packSize: '1 BOX',
    uom: 'BOX',
    purchasePrice: 98,
    mrp: 700,
    sellingPrice: 140,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 80,
    minStockAlert: 10,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
  },
  {
    id: 'prod-006',
    sno: 6,
    shopId: 'shop-01',
    categoryId: 'cat-garland',
    categoryName: 'Classic Garlands Crackers',
    sku: 'AF-026',
    barcode: '6',
    name: '1000 Wala Festive Garland',
    tamilName: '1000 வாலா சரவெடி',
    brand: 'Agana Fireworks',
    packSize: '1 BOX',
    uom: 'BOX',
    purchasePrice: 448,
    mrp: 3200,
    sellingPrice: 640,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 25,
    minStockAlert: 5,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
  },
  {
    id: 'prod-007',
    sno: 7,
    shopId: 'shop-01',
    categoryId: 'cat-bombs',
    categoryName: 'Sound Bombs',
    sku: 'AF-007',
    barcode: '7',
    name: 'Hydro Bomb (Out of Stock)',
    tamilName: 'ஹைட்ரோ பாம்',
    brand: 'Agana Fireworks',
    packSize: '1 BOX',
    uom: 'BOX',
    purchasePrice: 80,
    mrp: 400,
    sellingPrice: 90,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 0,
    minStockAlert: 5,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
  },
  {
    id: 'prod-008',
    sno: 8,
    shopId: 'shop-01',
    categoryId: 'cat-bombs',
    categoryName: 'Sound Bombs',
    sku: 'AF-008',
    barcode: '8',
    name: 'Classic Cracker (Inactive)',
    tamilName: 'பழைய வெடி',
    brand: 'Agana Fireworks',
    packSize: '1 BOX',
    uom: 'BOX',
    purchasePrice: 50,
    mrp: 200,
    sellingPrice: 50,
    discountAllowed: true,
    maxDiscountPct: 80,
    currentStock: 50,
    minStockAlert: 5,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: false,
  },
];

// Mock Configured Product Aliases
const MOCK_ALIASES: ProductAlias[] = [
  {
    id: 'alias-1',
    shopId: 'shop-01',
    productId: 'prod-001',
    alias: 'bijili',
    language: 'all',
  },
  {
    id: 'alias-2',
    shopId: 'shop-01',
    productId: 'prod-001',
    alias: 'red bijili',
    language: 'all',
  },
  {
    id: 'alias-3',
    shopId: 'shop-01',
    productId: 'prod-006',
    alias: 'saravedi',
    language: 'tanglish',
  },
  {
    id: 'alias-4',
    shopId: 'shop-01',
    productId: 'prod-006',
    alias: 'சரவெடி',
    language: 'ta',
  },
  {
    id: 'alias-5',
    shopId: 'shop-01',
    productId: 'prod-004',
    alias: 'sparklers',
    language: 'en',
  },
  {
    id: 'alias-6',
    shopId: 'shop-01',
    productId: 'prod-004',
    alias: 'மத்தாப்பு',
    language: 'ta',
  },
];

describe('Voice Language Parser', () => {
  it('detects English, Tamil, and Tanglish correctly', () => {
    expect(detectLanguage('Add 10 packets of red bijili')).toBe('en');
    expect(detectLanguage('பத்து பாக்கெட் சரவெடி')).toBe('ta');
    expect(detectLanguage('Pattu packet saravedi add pannu')).toBe('tanglish');
    expect(detectLanguage('Intha item quantity 10 aakku')).toBe('tanglish');
  });

  it('parses number words across English, Tamil script, and Tanglish phonetics', () => {
    expect(parseNumberWord('ten')).toBe(10);
    expect(parseNumberWord('five')).toBe(5);
    expect(parseNumberWord('two')).toBe(2);
    expect(parseNumberWord('12')).toBe(12);

    // Tanglish phonetic numbers
    expect(parseNumberWord('pattu')).toBe(10);
    expect(parseNumberWord('anju')).toBe(5);
    expect(parseNumberWord('rendu')).toBe(2);
    expect(parseNumberWord('moonu')).toBe(3);
    expect(parseNumberWord('naalu')).toBe(4);
    expect(parseNumberWord('iruvadhu')).toBe(20);

    // Tamil Unicode script numbers
    expect(parseNumberWord('பத்து')).toBe(10);
    expect(parseNumberWord('ஐந்து')).toBe(5);
    expect(parseNumberWord('இரண்டு')).toBe(2);
    expect(parseNumberWord('இருபத்தைந்து')).toBe(25);
  });

  it('parses English voice command: "Add 10 packets of red bijili"', () => {
    const cmd = parseVoiceTranscript('Add 10 packets of red bijili');
    expect(cmd.action).toBe('ADD');
    expect(cmd.quantity).toBe(10);
    expect(cmd.unit).toBe('PKT');
    expect(cmd.productNameQuery.toLowerCase()).toContain('red bijili');
    expect(cmd.isQuantityExplicit).toBe(true);
  });

  it('parses English voice command: "Add five flower pots"', () => {
    const cmd = parseVoiceTranscript('Add five flower pots');
    expect(cmd.action).toBe('ADD');
    expect(cmd.quantity).toBe(5);
    expect(cmd.productNameQuery.toLowerCase()).toContain('flower pots');
  });

  it('parses English voice command: "Remove two packets of sparklers"', () => {
    const cmd = parseVoiceTranscript('Remove two packets of sparklers');
    expect(cmd.action).toBe('REMOVE');
    expect(cmd.quantity).toBe(2);
    expect(cmd.unit).toBe('PKT');
    expect(cmd.productNameQuery.toLowerCase()).toContain('sparklers');
    expect(cmd.isQuantityExplicit).toBe(true);
  });

  it('parses English voice command: "Change the quantity of rockets to 12"', () => {
    const cmd = parseVoiceTranscript('Change the quantity of rockets to 12');
    expect(cmd.action).toBe('UPDATE');
    expect(cmd.quantity).toBe(12);
    expect(cmd.productNameQuery.toLowerCase()).toContain('rockets');
  });

  it('parses Tanglish voice command: "Pattu packet saravedi add pannu"', () => {
    const cmd = parseVoiceTranscript('Pattu packet saravedi add pannu');
    expect(cmd.action).toBe('ADD');
    expect(cmd.quantity).toBe(10);
    expect(cmd.unit).toBe('PKT');
    expect(cmd.productNameQuery.toLowerCase()).toContain('saravedi');
    expect(cmd.detectedLanguage).toBe('tanglish');
  });

  it('parses Tanglish voice command: "Anju packet poochatti add pannu"', () => {
    const cmd = parseVoiceTranscript('Anju packet poochatti add pannu');
    expect(cmd.action).toBe('ADD');
    expect(cmd.quantity).toBe(5);
    expect(cmd.unit).toBe('PKT');
    expect(cmd.productNameQuery.toLowerCase()).toContain('poochatti');
  });

  it('parses Tanglish relative reference: "Intha item quantity 10 aakku"', () => {
    const cmd = parseVoiceTranscript('Intha item quantity 10 aakku');
    expect(cmd.action).toBe('UPDATE');
    expect(cmd.quantity).toBe(10);
    expect(cmd.productNameQuery).toBe('CURRENT_ITEM');
  });

  it('parses voice undo command: "undo" or "thappu"', () => {
    const cmd1 = parseVoiceTranscript('undo');
    expect(cmd1.action).toBe('UNDO');

    const cmd2 = parseVoiceTranscript('thappu');
    expect(cmd2.action).toBe('UNDO');
  });
});

describe('Product Matcher & Verification', () => {
  it('matches exact product name from speech ("Red Bijili")', () => {
    const cmd = parseVoiceTranscript('Add 10 packets of red bijili');
    const result = matchProductForVoiceCommand(cmd, MOCK_PRODUCTS, MOCK_ALIASES);
    expect(result.status).toBe('EXACT_MATCH');
    expect(result.matchedProduct?.sku).toBe('AF-014');
    expect(result.matchedProduct?.name).toBe('Red Bijili');
    expect(result.command.quantity).toBe(10);
    // 10 * 35 = 350 taxable + 18% GST (63) = 413
    expect(result.calculatedLineTotal).toBe(413);
    expect(result.taxableValue).toBe(350);
    expect(result.totalTax).toBe(63);
  });

  it('matches product via configured alias ("saravedi" -> "1000 Wala Festive Garland")', () => {
    const cmd = parseVoiceTranscript('Pattu packet saravedi add pannu');
    const result = matchProductForVoiceCommand(cmd, MOCK_PRODUCTS, MOCK_ALIASES);
    expect(result.status).toBe('EXACT_MATCH');
    expect(result.matchedProduct?.sku).toBe('AF-026');
    expect(result.matchedProduct?.name).toBe('1000 Wala Festive Garland');
    expect(result.command.quantity).toBe(10);
  });

  it('matches product via Tamil script ("பத்து பாக்கெட் சரவெடி")', () => {
    const cmd = parseVoiceTranscript('பத்து பாக்கெட் சரவெடி');
    const result = matchProductForVoiceCommand(cmd, MOCK_PRODUCTS, MOCK_ALIASES);
    expect(result.status).toBe('EXACT_MATCH');
    expect(result.matchedProduct?.sku).toBe('AF-026');
  });

  it('identifies ambiguous match when generic name is spoken ("flower pots")', () => {
    const cmd = parseVoiceTranscript('Add five flower pots');
    const result = matchProductForVoiceCommand(cmd, MOCK_PRODUCTS, []); // without biased single alias
    expect(result.status).toBe('AMBIGUOUS');
    expect(result.candidates && result.candidates.length >= 2).toBe(true);
    // Candidates should include Flower Pot Small and Flower Pot Big
    const names = result.candidates?.map((c) => c.product.name);
    expect(names).toContain('Flower Pot Small');
    expect(names).toContain('Flower Pot Big');
  });

  it('handles unknown products safely without silently substituting', () => {
    const cmd = parseVoiceTranscript('Add 10 packets of imaginary alien fireworks');
    const result = matchProductForVoiceCommand(cmd, MOCK_PRODUCTS, MOCK_ALIASES);
    expect(result.status).toBe('NO_MATCH');
    expect(result.matchedProduct).toBeUndefined();
    expect(result.errorMessage).toBeDefined();
    expect(result.suggestedProducts).toBeDefined();
  });

  it('handles relative reference ("Intha item quantity 10 aakku") with current cart', () => {
    const cart: CartItem[] = [
      calculateCartItem(MOCK_PRODUCTS[0], 2, MOCK_PRODUCTS[0].sellingPrice, 0, 'GST', 18),
      calculateCartItem(MOCK_PRODUCTS[3], 1, MOCK_PRODUCTS[3].sellingPrice, 0, 'GST', 18),
    ];
    const cmd = parseVoiceTranscript('Intha item quantity 10 aakku');
    const result = matchProductForVoiceCommand(cmd, MOCK_PRODUCTS, MOCK_ALIASES, cart);
    expect(result.status).toBe('EXACT_MATCH');
    // Most recent item in cart is product 3 (15 cm Electric Sparklers)
    expect(result.matchedProduct?.sku).toBe('AF-189');
    expect(result.command.quantity).toBe(10);
    // 10 * 42 = 420 taxable + 18% GST (75.60) = 495.60
    expect(result.calculatedLineTotal).toBe(495.6);
  });

  it('rejects relative reference when cart is empty', () => {
    const cmd = parseVoiceTranscript('Intha item quantity 10 aakku');
    const result = matchProductForVoiceCommand(cmd, MOCK_PRODUCTS, MOCK_ALIASES, []);
    expect(result.status).toBe('INVALID_COMMAND');
    expect(result.errorMessage).toContain('cart is empty');
  });
});

describe('Cart State & Billing Engine Verification', () => {
  it('calculates correct GST line items and totals for voice additions', () => {
    const product = MOCK_PRODUCTS[0]; // Red Bijili @ 35 INR unit price + 18% GST
    const cartItem = calculateCartItem(product, 10, product.sellingPrice, 0, 'GST', 18);

    expect(cartItem.quantity).toBe(10);
    expect(cartItem.taxableValue).toBe(350);
    expect(cartItem.cgstAmount).toBe(31.5);
    expect(cartItem.sgstAmount).toBe(31.5);
    expect(cartItem.totalTax).toBe(63);
    expect(cartItem.totalAmount).toBe(413);

    const invoiceTotals = calculateInvoiceTotals([cartItem], 0, 'GST');
    expect(invoiceTotals.grandTotal).toBe(413);
  });

  it('preserves cart undo functionality', () => {
    let cart: CartItem[] = [
      calculateCartItem(MOCK_PRODUCTS[0], 2, MOCK_PRODUCTS[0].sellingPrice, 0, 'GST', 18),
    ];
    const snapshot = [...cart];

    // Simulate voice operation: Adding 10 Red Bijili
    cart = [
      calculateCartItem(MOCK_PRODUCTS[0], 12, MOCK_PRODUCTS[0].sellingPrice, 0, 'GST', 18),
    ];
    expect(cart[0].quantity).toBe(12);

    // Revert/Undo
    cart = snapshot;
    expect(cart[0].quantity).toBe(2);
  });
});

describe('Multi-Product Continuous Voice Billing', () => {
  it('splits compound multi-product sentences joined by "and"', () => {
    const raw = 'Add 10 packets of red bijili and 5 boxes of flower pots and 2 packets of sparklers';
    const segments = splitMultiProductTranscript(raw);
    expect(segments.length).toBe(3);
    expect(segments[0]).toBe('Add 10 packets of red bijili');
    expect(segments[1]).toBe('5 boxes of flower pots');
    expect(segments[2]).toBe('2 packets of sparklers');
  });

  it('splits compound Tanglish multi-product sentences separated by commas or "appram"', () => {
    const raw1 = 'Pattu packet saravedi, anju packet poochatti, rendu box rocket add pannu';
    const segments1 = splitMultiProductTranscript(raw1);
    expect(segments1.length).toBe(3);

    const raw2 = 'pattu packet bijili appram anju packet poochatti';
    const segments2 = splitMultiProductTranscript(raw2);
    expect(segments2.length).toBe(2);
  });

  it('splits sentences where multiple quantities appear without conjunctions', () => {
    const raw = '10 red bijili 5 flower pot 2 sparklers';
    const segments = splitMultiProductTranscript(raw);
    expect(segments.length).toBe(3);
    expect(segments[0]).toBe('10 red bijili');
    expect(segments[1]).toBe('5 flower pot');
    expect(segments[2]).toBe('2 sparklers');
  });

  it('parses multiple commands from one compound utterance with inherited action', () => {
    const raw = 'Add 10 packets of red bijili and 2 packets of sparklers';
    const commands = parseMultiVoiceTranscript(raw);
    expect(commands.length).toBe(2);

    expect(commands[0].action).toBe('ADD');
    expect(commands[0].quantity).toBe(10);
    expect(commands[0].productNameQuery).toContain('red bijili');

    expect(commands[1].action).toBe('ADD');
    expect(commands[1].quantity).toBe(2);
    expect(commands[1].productNameQuery).toContain('sparklers');
  });

  it('matches multiple products simultaneously using matchMultiVoiceCommands', () => {
    const raw = '10 packets red bijili and 2 packets sparklers';
    const commands = parseMultiVoiceTranscript(raw);
    const results = matchMultiVoiceCommands(commands, MOCK_PRODUCTS, MOCK_ALIASES);

    expect(results.length).toBe(2);
    expect(results[0].status).toBe('EXACT_MATCH');
    expect(results[0].matchedProduct?.name).toBe('Red Bijili');
    expect(results[0].command.quantity).toBe(10);
    expect(results[0].selected).toBe(true);
    expect(results[0].id).toBeDefined();

    expect(results[1].status).toBe('EXACT_MATCH');
    expect(results[1].matchedProduct?.sku).toBe('AF-189');
    expect(results[1].command.quantity).toBe(2);
    expect(results[1].selected).toBe(true);

    // Sum of line totals: (10 * 35 * 1.18 = 413) + (2 * 42 * 1.18 = 99.12) = 512.12
    const total = results.reduce((sum, r) => sum + (r.calculatedLineTotal || 0), 0);
    expect(total).toBeCloseTo(512.12, 1);
  });
});

describe('Tamil SNO & Quantity Voice Billing (ஒன்னு பத்து)', () => {
  describe('Tamil Number Word Parser', () => {
    it('parses basic Tamil number words', () => {
      expect(parseSpokenNumberWord('ஒன்று')).toBe(1);
      expect(parseSpokenNumberWord('ஒன்னு')).toBe(1);
      expect(parseSpokenNumberWord('ஒரு')).toBe(1);
      expect(parseSpokenNumberWord('இரண்டு')).toBe(2);
      expect(parseSpokenNumberWord('ரெண்டு')).toBe(2);
      expect(parseSpokenNumberWord('மூன்று')).toBe(3);
      expect(parseSpokenNumberWord('மூணு')).toBe(3);
      expect(parseSpokenNumberWord('நான்கு')).toBe(4);
      expect(parseSpokenNumberWord('நாலு')).toBe(4);
      expect(parseSpokenNumberWord('ஐந்து')).toBe(5);
      expect(parseSpokenNumberWord('அஞ்சு')).toBe(5);
      expect(parseSpokenNumberWord('ஆறு')).toBe(6);
      expect(parseSpokenNumberWord('ஏழு')).toBe(7);
      expect(parseSpokenNumberWord('எட்டு')).toBe(8);
      expect(parseSpokenNumberWord('ஒன்பது')).toBe(9);
      expect(parseSpokenNumberWord('ஒம்பது')).toBe(9);
      expect(parseSpokenNumberWord('பத்து')).toBe(10);
    });

    it('parses teen numbers and tens in Tamil', () => {
      expect(parseSpokenNumberWord('பதினொன்று')).toBe(11);
      expect(parseSpokenNumberWord('பதினொன்னு')).toBe(11);
      expect(parseSpokenNumberWord('பன்னிரண்டு')).toBe(12);
      expect(parseSpokenNumberWord('பன்னிரெண்டு')).toBe(12);
      expect(parseSpokenNumberWord('பதினைந்து')).toBe(15);
      expect(parseSpokenNumberWord('பதினஞ்சு')).toBe(15);
      expect(parseSpokenNumberWord('இருபது')).toBe(20);
      expect(parseSpokenNumberWord('இருவது')).toBe(20);
      expect(parseSpokenNumberWord('முப்பது')).toBe(30);
      expect(parseSpokenNumberWord('நாற்பது')).toBe(40);
      expect(parseSpokenNumberWord('நாப்பது')).toBe(40);
      expect(parseSpokenNumberWord('ஐம்பது')).toBe(50);
      expect(parseSpokenNumberWord('அம்பது')).toBe(50);
      expect(parseSpokenNumberWord('அறுபது')).toBe(60);
      expect(parseSpokenNumberWord('எழுபது')).toBe(70);
      expect(parseSpokenNumberWord('எண்பது')).toBe(80);
      expect(parseSpokenNumberWord('தொண்ணூறு')).toBe(90);
      expect(parseSpokenNumberWord('நூறு')).toBe(100);
      expect(parseSpokenNumberWord('இருநூறு')).toBe(200);
    });

    it('parses compound Tamil spoken numbers', () => {
      expect(parseSpokenNumberWord('இருபத்தைந்து')).toBe(25);
      expect(parseSpokenNumberWord('இருபத்தஞ்சு')).toBe(25);
      expect(parseSpokenNumberWord('முப்பத்தைந்து')).toBe(35);
      expect(parseSpokenNumberWord('முப்பத்தஞ்சு')).toBe(35);
      expect(parseSpokenNumberWord('நாற்பத்தைந்து')).toBe(45);
      expect(parseSpokenNumberWord('நாப்பத்தஞ்சு')).toBe(45);
      expect(parseSpokenNumberWord('நூற்றிஒன்று')).toBe(101);
      expect(parseSpokenNumberWord('இருநூற்றிஆறு')).toBe(206);
    });

    it('parses Tanglish, English and digits', () => {
      expect(parseSpokenNumberWord('onnu')).toBe(1);
      expect(parseSpokenNumberWord('rendu')).toBe(2);
      expect(parseSpokenNumberWord('moonu')).toBe(3);
      expect(parseSpokenNumberWord('naalu')).toBe(4);
      expect(parseSpokenNumberWord('anju')).toBe(5);
      expect(parseSpokenNumberWord('pathu')).toBe(10);
      expect(parseSpokenNumberWord('irubadhu')).toBe(20);
      expect(parseSpokenNumberWord('twenty')).toBe(20);
      expect(parseSpokenNumberWord('five')).toBe(5);
      expect(parseSpokenNumberWord('1')).toBe(1);
      expect(parseSpokenNumberWord('10')).toBe(10);
      expect(parseSpokenNumberWord('206')).toBe(206);
    });

    it('extracts two-word compound numbers from token list', () => {
      const tokens = ['இருபத்தி', 'ஐந்து'];
      const extracted = extractNumbersWithContext(tokens);
      expect(extracted.length).toBe(1);
      expect(extracted[0].value).toBe(25);
    });
  });

  describe('SNO & Quantity Pair Extraction', () => {
    it('parses "ஒன்னு பத்து" -> SNO 1, quantity 10', () => {
      const res = parseSnoQuantityTranscript('ஒன்னு பத்து');
      expect(res.pairs.length).toBe(1);
      expect(res.pairs[0].sno).toBe(1);
      expect(res.pairs[0].quantity).toBe(10);
      expect(res.isIncomplete).toBe(false);
      expect(res.isAmbiguous).toBe(false);
    });

    it('parses "ரெண்டு அஞ்சு" -> SNO 2, quantity 5', () => {
      const res = parseSnoQuantityTranscript('ரெண்டு அஞ்சு');
      expect(res.pairs.length).toBe(1);
      expect(res.pairs[0].sno).toBe(2);
      expect(res.pairs[0].quantity).toBe(5);
      expect(res.isIncomplete).toBe(false);
    });

    it('parses "மூணு இருபது" -> SNO 3, quantity 20', () => {
      const res = parseSnoQuantityTranscript('மூணு இருபது');
      expect(res.pairs.length).toBe(1);
      expect(res.pairs[0].sno).toBe(3);
      expect(res.pairs[0].quantity).toBe(20);
    });

    it('parses multiple pairs in one utterance: "ஒன்னு பத்து ரெண்டு அஞ்சு"', () => {
      const res = parseSnoQuantityTranscript('ஒன்னு பத்து ரெண்டு அஞ்சு');
      expect(res.pairs.length).toBe(2);
      expect(res.pairs[0].sno).toBe(1);
      expect(res.pairs[0].quantity).toBe(10);
      expect(res.pairs[1].sno).toBe(2);
      expect(res.pairs[1].quantity).toBe(5);
      expect(res.isIncomplete).toBe(false);
    });

    it('parses three consecutive pairs: "ஒன்னு பத்து ரெண்டு அஞ்சு மூணு இருபது"', () => {
      const res = parseSnoQuantityTranscript('ஒன்னு பத்து ரெண்டு அஞ்சு மூணு இருபது');
      expect(res.pairs.length).toBe(3);
      expect(res.pairs[0]).toMatchObject({ sno: 1, quantity: 10 });
      expect(res.pairs[1]).toMatchObject({ sno: 2, quantity: 5 });
      expect(res.pairs[2]).toMatchObject({ sno: 3, quantity: 20 });
    });

    it('parses Arabic numerals: "1 10 2 5"', () => {
      const res = parseSnoQuantityTranscript('1 10 2 5');
      expect(res.pairs.length).toBe(2);
      expect(res.pairs[0].sno).toBe(1);
      expect(res.pairs[0].quantity).toBe(10);
      expect(res.pairs[1].sno).toBe(2);
      expect(res.pairs[1].quantity).toBe(5);
    });

    it('parses explicit keywords: "SNO 1 quantity 10" and "நம்பர் 2 அஞ்சு பாக்கெட்"', () => {
      const res1 = parseSnoQuantityTranscript('SNO 1 quantity 10');
      expect(res1.pairs.length).toBe(1);
      expect(res1.pairs[0].sno).toBe(1);
      expect(res1.pairs[0].quantity).toBe(10);

      const res2 = parseSnoQuantityTranscript('நம்பர் 2 அஞ்சு பாக்கெட்');
      expect(res2.pairs.length).toBe(1);
      expect(res2.pairs[0].sno).toBe(2);
      expect(res2.pairs[0].quantity).toBe(5);
      expect(res2.pairs[0].unit).toBe('PKT');
    });

    it('flags incomplete commands with an odd number of tokens', () => {
      // Just "ஒன்னு" (1) without quantity
      const res1 = parseSnoQuantityTranscript('ஒன்னு');
      expect(res1.pairs.length).toBe(0);
      expect(res1.isIncomplete).toBe(true);
      expect(res1.errorMessage).toContain('missing a quantity');

      // "ஒன்னு பத்து இருபது" (Pair 1 valid, 20 is missing quantity)
      const res2 = parseSnoQuantityTranscript('ஒன்னு பத்து இருபது');
      expect(res2.pairs.length).toBe(1);
      expect(res2.pairs[0].sno).toBe(1);
      expect(res2.pairs[0].quantity).toBe(10);
      expect(res2.isIncomplete).toBe(true);
      expect(res2.unpairedNumbers).toEqual([20]);
    });

    it('flags invalid SNO exceeding catalog max as ambiguous', () => {
      const res = parseSnoQuantityTranscript('999 10', 206);
      expect(res.isAmbiguous).toBe(true);
      expect(res.errorMessage).toContain('Invalid S.No. #999');
    });

    it('handles speech with filler words and conjunctions', () => {
      const raw = 'சார் ஒன்னு பத்து போடுங்க அப்புறம் ரெண்டு அஞ்சு';
      const res = parseSnoQuantityTranscript(raw);
      expect(res.pairs.length).toBe(2);
      expect(res.pairs[0].sno).toBe(1);
      expect(res.pairs[0].quantity).toBe(10);
      expect(res.pairs[1].sno).toBe(2);
      expect(res.pairs[1].quantity).toBe(5);
    });

    it('detects action keywords like remove, update, and undo', () => {
      const resRemove = parseSnoQuantityTranscript('ஒன்னு பத்து நீக்கு');
      expect(resRemove.action).toBe('REMOVE');
      expect(resRemove.pairs[0]).toMatchObject({ sno: 1, quantity: 10 });

      const resUpdate = parseSnoQuantityTranscript('ரெண்டு இருபது மாத்து');
      expect(resUpdate.action).toBe('UPDATE');
      expect(resUpdate.pairs[0]).toMatchObject({ sno: 2, quantity: 20 });

      const resUndo = parseSnoQuantityTranscript('ரத்து செய்');
      expect(resUndo.action).toBe('UNDO');
    });
  });

  describe('Cart Processing & Product Matching via interpretVoiceBillingTranscript', () => {
    it('resolves product by SNO and calculates correct line amounts', () => {
      const results = interpretVoiceBillingTranscript('ஒன்னு பத்து', MOCK_PRODUCTS, MOCK_ALIASES);
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('EXACT_MATCH');
      expect(results[0].matchedProduct?.name).toBe('Red Bijili');
      expect(results[0].matchedProduct?.sno).toBe(1);
      expect(results[0].command.quantity).toBe(10);
      // Unit price 35 * 10 = 350 taxable, with 18% GST = 413
      expect(results[0].calculatedLineTotal).toBeCloseTo(413, 1);
    });

    it('resolves multiple SNO pairs into cart items', () => {
      const results = interpretVoiceBillingTranscript(
        'ஒன்னு பத்து ரெண்டு அஞ்சு',
        MOCK_PRODUCTS,
        MOCK_ALIASES
      );
      expect(results.length).toBe(2);
      expect(results[0].matchedProduct?.sno).toBe(1);
      expect(results[0].command.quantity).toBe(10);

      expect(results[1].matchedProduct?.sno).toBe(2);
      expect(results[1].command.quantity).toBe(5);
    });

    it('flags out of stock items and prevents auto-selection', () => {
      // SNO 7 is out of stock (currentStock: 0)
      const results = interpretVoiceBillingTranscript('ஏழு பத்து', MOCK_PRODUCTS, MOCK_ALIASES);
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('NO_MATCH');
      expect(results[0].errorMessage).toContain('out of stock');
      expect(results[0].selected).toBe(false);
    });

    it('flags quantities exceeding available stock with warning', () => {
      // SNO 4 has stock 15, request 30
      const results = interpretVoiceBillingTranscript('நாலு முப்பது', MOCK_PRODUCTS, MOCK_ALIASES);
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('EXACT_MATCH');
      expect(results[0].errorMessage).toContain('only 15 currently in stock');
    });

    it('rejects disabled/inactive products', () => {
      // SNO 8 is inactive
      const results = interpretVoiceBillingTranscript('எட்டு பத்து', MOCK_PRODUCTS, MOCK_ALIASES);
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('NO_MATCH');
      expect(results[0].errorMessage).toContain('disabled/inactive');
    });

    it('flags incomplete commands for cashier confirmation instead of guessing', () => {
      const results = interpretVoiceBillingTranscript('ஒன்னு', MOCK_PRODUCTS, MOCK_ALIASES);
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('AMBIGUOUS');
      expect(results[0].errorMessage).toContain('missing a quantity');
    });

    it('gracefully handles non-numeric product name queries (fallback)', () => {
      const results = interpretVoiceBillingTranscript('10 red bijili', MOCK_PRODUCTS, MOCK_ALIASES);
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('EXACT_MATCH');
      expect(results[0].matchedProduct?.name).toBe('Red Bijili');
    });
  });
});
