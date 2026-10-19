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
  normalizeText,
  levenshteinDistance,
  stringSimilarity,
  stemWord,
} from './productMatcher';
import { Product, ProductAlias, CartItem } from '@/types';
import { calculateCartItem, calculateInvoiceTotals } from '@/lib/calculations';

// Mock Fireworks Product Catalogue
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    shopId: 'shop-01',
    categoryId: 'cat-bijili',
    categoryName: 'Bijili Crackers',
    sku: 'AF-014',
    barcode: '14',
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
    shopId: 'shop-01',
    categoryId: 'cat-flower',
    categoryName: 'Flower Pot',
    sku: 'AF-045',
    barcode: '45',
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
    shopId: 'shop-01',
    categoryId: 'cat-flower',
    categoryName: 'Flower Pot',
    sku: 'AF-046',
    barcode: '46',
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
    shopId: 'shop-01',
    categoryId: 'cat-sparklers',
    categoryName: 'Sparklers',
    sku: 'AF-189',
    barcode: '189',
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
    shopId: 'shop-01',
    categoryId: 'cat-rocket',
    categoryName: 'Rocket',
    sku: 'AF-041',
    barcode: '41',
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
    shopId: 'shop-01',
    categoryId: 'cat-garland',
    categoryName: 'Classic Garlands Crackers',
    sku: 'AF-026',
    barcode: '26',
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
