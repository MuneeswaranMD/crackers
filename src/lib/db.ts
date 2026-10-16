import {
  Shop,
  ShopSetting,
  Category,
  Product,
  Customer,
  Supplier,
  Sale,
  CartItem,
  StockMovement,
  Purchase,
  SaleReturn,
  Expense,
  AuditLog,
  SyncOperation,
  CashSession,
  Integration,
  ExternalOrder,
  ExternalOrderItem,
  ExternalProductMapping,
  WebhookEvent,
  IntegrationSyncLog,
  OrderInvoiceLink,
} from '@/types';
import { roundTo2, calculateCartItem, calculateInvoiceTotals } from './calculations';

const STORAGE_KEYS = {
  SHOP: 'crackers_pos_shop',
  SETTINGS: 'crackers_pos_settings',
  CATEGORIES: 'crackers_pos_categories',
  PRODUCTS: 'crackers_pos_products',
  CUSTOMERS: 'crackers_pos_customers',
  SUPPLIERS: 'crackers_pos_suppliers',
  SALES: 'crackers_pos_sales',
  HELD_BILLS: 'crackers_pos_held_bills',
  STOCK_MOVEMENTS: 'crackers_pos_stock_movements',
  PURCHASES: 'crackers_pos_purchases',
  RETURNS: 'crackers_pos_returns',
  EXPENSES: 'crackers_pos_expenses',
  AUDIT_LOGS: 'crackers_pos_audit_logs',
  SYNC_QUEUE: 'crackers_pos_sync_queue',
  CASH_SESSION: 'crackers_pos_cash_session',
  SEQ_INVOICE: 'crackers_pos_seq_invoice',
  SEQ_CN: 'crackers_pos_seq_cn',
  INTEGRATIONS: 'crackers_pos_integrations',
  EXTERNAL_ORDERS: 'crackers_pos_external_orders',
  PRODUCT_MAPPINGS: 'crackers_pos_product_mappings',
  WEBHOOK_EVENTS: 'crackers_pos_webhook_events',
  SYNC_LOGS: 'crackers_pos_sync_logs',
};

// Initial Seed Data for Sivakasi / Tamil Nadu Crackers Retail Shop
export const INITIAL_SHOP: Shop = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Sree Kalieswari Traders',
  tradeName: 'Sree Kalieswari Traders',
  gstin: '33AABCS1429B1Z8', // 33 is Tamil Nadu
  licenseNumber: 'PESO/E/TN/2024/09842',
  licenseValidUpto: '2028-03-31',
  phone: '9843749750, 94431 23456',
  email: 'sales@sreekalieswaritraders.com',
  addressLine1: 'No. 42, Bypass Road, Near Bus Stand',
  addressLine2: 'Opp. Standard Fire Works Godown',
  city: 'Sivakasi',
  state: 'Tamil Nadu',
  stateCode: '33',
  pincode: '626123',
  bankName: 'State Bank of India',
  bankAccountNo: '30492817492',
  bankIfsc: 'SBIN0000921',
  bankBranch: 'Sivakasi Main Branch',
  upiId: '9843749750',
  invoicePrefix: 'SKT/2026-27/',
  invoiceFooterNote:
    '1. Green Crackers manufactured under PESO & CSIR-NEERI regulations.\n2. Goods once sold will not be returned unless damaged prior to sale.\n3. Keep in dry place away from flame and children without adult supervision.\n4. Subject to Sivakasi Jurisdiction.',
  isActive: true,
};

export const INITIAL_SETTINGS: ShopSetting = {
  id: 'set-01',
  shopId: 'shop-sivakasi-01',
  defaultBillingMode: 'GST',
  defaultDiscountPercentage: 0,
  enableSeasonalDiscount: true,
  seasonalDiscountPercentage: 70, // Standard 70% seasonal festival discount in Sivakasi
  allowNegativeStock: false,
  enforceBarcodeScan: false,
  thermalPrinterPaperWidth: '80mm',
  printDuplicateReceipt: false,
  autoRoundoffToRupee: true,
};

export const INITIAL_INTEGRATION: Integration = {
  id: '33333333-1111-1111-1111-111111111111',
  shopId: 'shop-sivakasi-01',
  type: 'WOOCOMMERCE',
  name: 'Sree Kalieswari Online Store',
  storeUrl: 'https://crackers.sreekalieswaritraders.com',
  consumerKey: '',
  consumerSecret: '',
  webhookSecret: '',
  isActive: true,
  syncStatus: 'IDLE',
  healthStatus: 'HEALTHY',
  settings: {
    autoInvoice: false,
    autoDeductStock: true,
    defaultOrderStatus: 'processing',
    notifyOnFailedOrder: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const INITIAL_EXTERNAL_ORDERS: ExternalOrder[] = [
  {
    id: 'ext-ord-8402',
    integrationId: '33333333-1111-1111-1111-111111111111',
    shopId: '11111111-1111-1111-1111-111111111111',
    externalOrderId: '8402',
    orderNumber: '8402',
    status: 'processing',
    currency: 'INR',
    totalAmount: 630.0,
    subtotalAmount: 630.0,
    taxAmount: 96.1,
    shippingAmount: 0.0,
    discountAmount: 0.0,
    customerName: 'Sundaramurthy P',
    customerEmail: 'sundar.tn@gmail.com',
    customerPhone: '+91 98401 55678',
    billingAddress: {
      firstName: 'Sundaramurthy',
      lastName: 'P',
      address1: 'Plot 4, Anna Nagar 2nd Avenue',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postcode: '600040',
      country: 'IN',
      phone: '+91 98401 55678',
      email: 'sundar.tn@gmail.com',
    },
    shippingAddress: {
      firstName: 'Sundaramurthy',
      lastName: 'P',
      address1: 'Plot 4, Anna Nagar 2nd Avenue',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postcode: '600040',
      country: 'IN',
      phone: '+91 98401 55678',
    },
    paymentMethod: 'razorpay',
    paymentMethodTitle: 'Razorpay UPI Online',
    isPaid: true,
    paidAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    externalCreatedAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    externalUpdatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    syncStatus: 'IMPORTED',
    items: [
      {
        id: 'ext-item-8402-1',
        externalOrderId: 'ext-ord-8402',
        externalItemId: '101',
        externalProductId: '901',
        sku: 'SPK-10-ELE',
        name: '10cm Electric Sparklers',
        quantity: 5,
        unitPrice: 54.0,
        subtotal: 270.0,
        taxAmount: 41.18,
        total: 270.0,
        localProductId: 'prod-01',
        mappingStatus: 'MATCHED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ext-item-8402-2',
        externalOrderId: 'ext-ord-8402',
        externalItemId: '102',
        externalProductId: '904',
        sku: 'FP-ASO-SPL',
        name: 'Asoka Flower Pots Special',
        quantity: 3,
        unitPrice: 120.0,
        subtotal: 360.0,
        taxAmount: 54.91,
        total: 360.0,
        localProductId: 'prod-04',
        mappingStatus: 'MATCHED',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ext-ord-8405',
    integrationId: '33333333-1111-1111-1111-111111111111',
    shopId: '11111111-1111-1111-1111-111111111111',
    externalOrderId: '8405',
    orderNumber: '8405',
    status: 'processing',
    currency: 'INR',
    totalAmount: 570.0,
    subtotalAmount: 570.0,
    taxAmount: 86.95,
    shippingAmount: 0.0,
    discountAmount: 0.0,
    customerName: 'Kavitha Rajan',
    customerEmail: 'kavitha.cbe@yahoo.com',
    customerPhone: '+91 94432 88990',
    billingAddress: {
      firstName: 'Kavitha',
      lastName: 'Rajan',
      address1: '12, RS Puram West',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      postcode: '641002',
      country: 'IN',
      phone: '+91 94432 88990',
      email: 'kavitha.cbe@yahoo.com',
    },
    shippingAddress: {
      firstName: 'Kavitha',
      lastName: 'Rajan',
      address1: '12, RS Puram West',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      postcode: '641002',
      country: 'IN',
      phone: '+91 94432 88990',
    },
    paymentMethod: 'phonepe',
    paymentMethodTitle: 'PhonePe Direct UPI',
    isPaid: true,
    paidAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    externalCreatedAt: new Date(Date.now() - 3600000 * 5.2).toISOString(),
    externalUpdatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    syncStatus: 'IMPORTED',
    items: [
      {
        id: 'ext-item-8405-1',
        externalOrderId: 'ext-ord-8405',
        externalItemId: '201',
        externalProductId: '908',
        sku: 'BMB-HYD-GRN',
        name: 'Hydro Bomb Green Sound Blast',
        quantity: 5,
        unitPrice: 96.0,
        subtotal: 480.0,
        taxAmount: 73.22,
        total: 480.0,
        localProductId: 'prod-08',
        mappingStatus: 'MATCHED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ext-item-8405-2',
        externalOrderId: 'ext-ord-8405',
        externalItemId: '202',
        externalProductId: '907',
        sku: 'GC-ASH-SPL',
        name: 'Ground Chakkar Special Ashoka',
        quantity: 1,
        unitPrice: 90.0,
        subtotal: 90.0,
        taxAmount: 13.73,
        total: 90.0,
        localProductId: 'prod-07',
        mappingStatus: 'MATCHED',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', shopId: 'shop-sivakasi-01', name: 'Sparklers (கம்ப மத்தாப்பு)', displayOrder: 1, isActive: true },
  { id: 'cat-2', shopId: 'shop-sivakasi-01', name: 'Flower Pots (புஸ்வாணம்)', displayOrder: 2, isActive: true },
  { id: 'cat-3', shopId: 'shop-sivakasi-01', name: 'Ground Chakkars (தரை சக்கரம்)', displayOrder: 3, isActive: true },
  { id: 'cat-4', shopId: 'shop-sivakasi-01', name: 'Sound Crackers & Bombs (வெடி & பாம்)', displayOrder: 4, isActive: true },
  { id: 'cat-5', shopId: 'shop-sivakasi-01', name: 'Rockets (வான வெடி / ராக்கெட்)', displayOrder: 5, isActive: true },
  { id: 'cat-6', shopId: 'shop-sivakasi-01', name: 'Aerial Skyshots (மல்டி ஷாட்)', displayOrder: 6, isActive: true },
  { id: 'cat-7', shopId: 'shop-sivakasi-01', name: 'Repeating Garlands (சரவெடி / வாலா)', displayOrder: 7, isActive: true },
  { id: 'cat-8', shopId: 'shop-sivakasi-01', name: 'Gift Boxes & Assorted Packs', displayOrder: 8, isActive: true },
  { id: 'cat-9', shopId: 'shop-sivakasi-01', name: 'Kids Novelties & Roll Caps', displayOrder: 9, isActive: true },
];

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'cat-1': '/images/products/sparklers.jpg',
  'cat-2': '/images/products/flowerpots.jpg',
  'cat-3': '/images/products/chakkars.jpg',
  'cat-4': '/images/products/bombs.jpg',
  'cat-5': '/images/products/skyshots.jpg',
  'cat-6': '/images/products/skyshots.jpg',
  'cat-7': '/images/products/bombs.jpg',
  'cat-8': '/images/products/giftbox.jpg',
  'cat-9': '/images/products/sparklers.jpg',
};

export function getProductImageUrl(prod: Partial<Product>): string {
  if (prod.imageUrl) return prod.imageUrl;
  if (prod.categoryId && CATEGORY_IMAGE_MAP[prod.categoryId]) {
    return CATEGORY_IMAGE_MAP[prod.categoryId];
  }
  const text = ((prod.name || '') + ' ' + (prod.categoryName || '') + ' ' + (prod.tamilName || '')).toLowerCase();
  if (text.includes('sparkler') || text.includes('மத்தாப்பு')) return '/images/products/sparklers.jpg';
  if (text.includes('flower') || text.includes('pot') || text.includes('புஸ்வாணம்') || text.includes('ashoka') || text.includes('koti')) return '/images/products/flowerpots.jpg';
  if (text.includes('chakkar') || text.includes('சக்கரம்') || text.includes('spinner') || text.includes('zamin')) return '/images/products/chakkars.jpg';
  if (text.includes('bomb') || text.includes('sound') || text.includes('வெடி') || text.includes('பாம்') || text.includes('garland') || text.includes('wala') || text.includes('சரவெடி')) return '/images/products/bombs.jpg';
  if (text.includes('rocket') || text.includes('shot') || text.includes('வான') || text.includes('aerial') || text.includes('cake')) return '/images/products/skyshots.jpg';
  if (text.includes('gift') || text.includes('box') || text.includes('family') || text.includes('hamper')) return '/images/products/giftbox.jpg';
  return '/images/products/sparklers.jpg';
}

export const INITIAL_PRODUCTS: Product[] = [
  // Sparklers
  {
    id: 'prod-01',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-1',
    categoryName: 'Sparklers (கம்ப மத்தாப்பு)',
    sku: 'SPK-10-ELE',
    barcode: '8901001001',
    name: '10cm Electric Sparklers',
    tamilName: '10 செ.மீ எலக்ட்ரிக் மத்தாப்பு',
    brand: 'Standard Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 22,
    mrp: 120,
    sellingPrice: 36, // 70% off MRP
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 450,
    minStockAlert: 50,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/sparklers.jpg',
  },
  {
    id: 'prod-02',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-1',
    categoryName: 'Sparklers (கம்ப மத்தாப்பு)',
    sku: 'SPK-15-GRN',
    barcode: '8901001002',
    name: '15cm Green Sparklers',
    tamilName: '15 செ.மீ பச்சை மத்தாப்பு',
    brand: 'Standard Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 38,
    mrp: 190,
    sellingPrice: 57,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 320,
    minStockAlert: 40,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/sparklers.jpg',
  },
  {
    id: 'prod-03',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-1',
    categoryName: 'Sparklers (கம்ப மத்தாப்பு)',
    sku: 'SPK-30-RED',
    barcode: '8901001003',
    name: '30cm Red Sparklers',
    tamilName: '30 செ.மீ சிவப்பு மத்தாப்பு',
    brand: 'Coronation Pyrotech',
    packSize: '1 Box (5 Pcs)',
    uom: 'BOX',
    purchasePrice: 65,
    mrp: 320,
    sellingPrice: 96,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 180,
    minStockAlert: 30,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/sparklers.jpg',
  },
  // Flower Pots
  {
    id: 'prod-04',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-2',
    categoryName: 'Flower Pots (புஸ்வாணம்)',
    sku: 'FLP-ASH-BIG',
    barcode: '8901002001',
    name: 'Flower Pots Ashoka Big',
    tamilName: 'அசோகா புஸ்வாணம் பெரியது',
    brand: 'Standard Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 75,
    mrp: 380,
    sellingPrice: 114,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 240,
    minStockAlert: 25,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/flowerpots.jpg',
  },
  {
    id: 'prod-05',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-2',
    categoryName: 'Flower Pots (புஸ்வாணம்)',
    sku: 'FLP-COL-KOTI',
    barcode: '8901002002',
    name: 'Colour Koti Deluxe Flower Pots',
    tamilName: 'கலர் கோட்டி டீலக்ஸ் புஸ்வாணம்',
    brand: 'Sony Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 110,
    mrp: 550,
    sellingPrice: 165,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 160,
    minStockAlert: 20,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/flowerpots.jpg',
  },
  // Ground Chakkars
  {
    id: 'prod-06',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-3',
    categoryName: 'Ground Chakkars (தரை சக்கரம்)',
    sku: 'CHK-BIG-10',
    barcode: '8901003001',
    name: 'Ground Chakkar Big',
    tamilName: 'தரை சக்கரம் பெரியது',
    brand: 'Standard Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 48,
    mrp: 240,
    sellingPrice: 72,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 390,
    minStockAlert: 40,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/chakkars.jpg',
  },
  {
    id: 'prod-07',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-3',
    categoryName: 'Ground Chakkars (தரை சக்கரம்)',
    sku: 'CHK-DLX-ZAM',
    barcode: '8901003002',
    name: 'Zamin Chakkar Deluxe Spinner',
    tamilName: 'ஜமீன் சக்கரம் டீலக்ஸ் சுழலி',
    brand: 'Vadivel Pyrotech',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 90,
    mrp: 450,
    sellingPrice: 135,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 110,
    minStockAlert: 15,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/chakkars.jpg',
  },
  // Bombs & Sound
  {
    id: 'prod-08',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-4',
    categoryName: 'Sound Crackers & Bombs (வெடி & பாம்)',
    sku: 'BMB-HYD-GRN',
    barcode: '8901004001',
    name: 'Hydro Bomb Green Sound Blast',
    tamilName: 'ஹைட்ரோ பாம் பச்சை சத்த வெடி',
    brand: 'Standard Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 65,
    mrp: 320,
    sellingPrice: 96,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 190,
    minStockAlert: 30,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/bombs.jpg',
  },
  {
    id: 'prod-09',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-4',
    categoryName: 'Sound Crackers & Bombs (வெடி & பாம்)',
    sku: 'BMB-KOK-70',
    barcode: '8901004002',
    name: 'King of Kings Giant Atom Bomb',
    tamilName: 'கிங் ஆப் கிங்ஸ் ஜெயண்ட் ஆட்டம் பாம்',
    brand: 'Ayyan Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 110,
    mrp: 540,
    sellingPrice: 162,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 85,
    minStockAlert: 15,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/bombs.jpg',
  },
  // Repeating Garlands
  {
    id: 'prod-10',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-7',
    categoryName: 'Repeating Garlands (சரவெடி / வாலா)',
    sku: 'GAR-28-CHR',
    barcode: '8901007001',
    name: '28 Chorsa Crackers',
    tamilName: '28 சோர்சா சரவெடி',
    brand: 'Standard Fireworks',
    packSize: '1 Box (10 Pcs)',
    uom: 'BOX',
    purchasePrice: 32,
    mrp: 160,
    sellingPrice: 48,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 420,
    minStockAlert: 40,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/bombs.jpg',
  },
  {
    id: 'prod-11',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-7',
    categoryName: 'Repeating Garlands (சரவெடி / வாலா)',
    sku: 'GAR-1000-WALA',
    barcode: '8901007002',
    name: '1000 Wala Festive Garland',
    tamilName: '1000 வாலா பண்டிகை சரவெடி',
    brand: 'Standard Fireworks',
    packSize: '1 Roll',
    uom: 'ROLL',
    purchasePrice: 180,
    mrp: 850,
    sellingPrice: 255,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 75,
    minStockAlert: 10,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/bombs.jpg',
  },
  // Aerial Skyshots
  {
    id: 'prod-12',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-6',
    categoryName: 'Aerial Skyshots (மல்டி ஷாட்)',
    sku: 'SHT-12-RIDER',
    barcode: '8901006001',
    name: '12 Shots Sky Rider Aerial Cake',
    tamilName: '12 ஷாட்ஸ் ஸ்கை ரைடர் வான வேடிக்கை',
    brand: 'Sony Fireworks',
    packSize: '1 Cake',
    uom: 'PCS',
    purchasePrice: 160,
    mrp: 750,
    sellingPrice: 225,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 65,
    minStockAlert: 10,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/skyshots.jpg',
  },
  {
    id: 'prod-13',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-6',
    categoryName: 'Aerial Skyshots (மல்டி ஷாட்)',
    sku: 'SHT-30-COLOR',
    barcode: '8901006002',
    name: '30 Shots Multi-Colour Celebration Cake',
    tamilName: '30 ஷாட்ஸ் கலர் செலிபிரேஷன் கேக்',
    brand: 'Coronation Pyrotech',
    packSize: '1 Cake',
    uom: 'PCS',
    purchasePrice: 380,
    mrp: 1800,
    sellingPrice: 540,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 40,
    minStockAlert: 8,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/skyshots.jpg',
  },
  // Gift Boxes
  {
    id: 'prod-14',
    shopId: 'shop-sivakasi-01',
    categoryId: 'cat-8',
    categoryName: 'Gift Boxes & Assorted Packs',
    sku: 'GFT-ROYAL-32',
    barcode: '8901008001',
    name: 'Sivakasi Royal Family Pack (32 Items)',
    tamilName: 'சிவகாசி ராயல் குடும்ப கிப்ட் பாக்ஸ் (32 ரகங்கள்)',
    brand: 'Standard Fireworks',
    packSize: '1 Large Box',
    uom: 'BOX',
    purchasePrice: 650,
    mrp: 3200,
    sellingPrice: 960,
    discountAllowed: true,
    maxDiscountPct: 75,
    currentStock: 35,
    minStockAlert: 5,
    isGreenCracker: true,
    pesoCertified: true,
    isActive: true,
    hsnCode: '3604',
    imageUrl: '/images/products/giftbox.jpg',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    shopId: 'shop-sivakasi-01',
    name: 'R. Senthil Nathan',
    phone: '9842155667',
    email: 'senthil.nathan@gmail.com',
    addressLine: '12/4 East Veli Street',
    city: 'Madurai',
    state: 'Tamil Nadu',
    creditBalance: 0,
    isActive: true,
  },
  {
    id: 'cust-2',
    shopId: 'shop-sivakasi-01',
    name: 'M. Anand Kumar (Wholesale)',
    phone: '9789422331',
    email: 'anand.crackers@yahoo.com',
    addressLine: '88 Cross Cut Road, Gandhipuram',
    gstin: '33AABCA8891C1ZT',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    creditBalance: 4500,
    isActive: true,
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    shopId: 'shop-sivakasi-01',
    companyName: 'Standard Fireworks Pvt Ltd',
    contactPerson: 'K. Rajasekaran',
    phone: '04562-220144',
    email: 'dispatch@standardfireworks.com',
    gstin: '33AAACS1234A1Z1',
    city: 'Sivakasi',
    state: 'Tamil Nadu',
    outstandingPayable: 18500,
    isActive: true,
  },
  {
    id: 'sup-2',
    shopId: 'shop-sivakasi-01',
    companyName: 'Coronation Fireworks Co.',
    contactPerson: 'S. Ramanathan',
    phone: '04562-224455',
    gstin: '33AAACC5678B1Z2',
    city: 'Sivakasi',
    state: 'Tamil Nadu',
    outstandingPayable: 0,
    isActive: true,
  },
];

// Helper to access LocalStorage safely
class StorageManager {
  private cache = new Map<string, unknown>();
  private listenerInstalled = false;

  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private ensureListener(): void {
    if (!this.isClient() || this.listenerInstalled) return;
    window.addEventListener('storage', (event) => {
      if (event.key) this.cache.delete(event.key);
    });
    this.listenerInstalled = true;
  }

  get<T>(key: string, defaultValue: T): T {
    if (!this.isClient()) return defaultValue;
    this.ensureListener();
    if (this.cache.has(key)) return this.cache.get(key) as T;
    try {
      const item = localStorage.getItem(key);
      const value = item ? JSON.parse(item) : defaultValue;
      this.cache.set(key, value);
      return value;
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    if (!this.isClient()) return;
    this.ensureListener();
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.cache.set(key, value);
    } catch (e) {
      console.error('Storage quota exceeded or error writing to localStorage', e);
    }
  }
}

const storage = new StorageManager();

export const db = {
  // Initialization
  initDefaults: () => {
    const existingShop = storage.get<Shop | null>(STORAGE_KEYS.SHOP, null);
    if (!existingShop) {
      storage.set(STORAGE_KEYS.SHOP, INITIAL_SHOP);
    } else if (
      existingShop.name?.includes('Sri Sree kalieswari traders') ||
      existingShop.name?.includes('Sree kalieswari traders')
    ) {
      const migratedShop: Shop = {
        ...existingShop,
        name: 'Sree Kalieswari Traders',
        tradeName: 'Sree Kalieswari Traders',
        email: existingShop.email?.includes('Sree kalieswari traders')
          ? 'sales@sreekalieswaritraders.com'
          : existingShop.email,
        upiId: existingShop.upiId?.includes('Sree kalieswari traders')
          ? 'kalieswaritraders@sbi'
          : existingShop.upiId,
        invoicePrefix: existingShop.invoicePrefix?.startsWith('SMF')
          ? 'SKT/2026-27/'
          : existingShop.invoicePrefix,
      };
      storage.set(STORAGE_KEYS.SHOP, migratedShop);
    }
    if (!storage.get<ShopSetting | null>(STORAGE_KEYS.SETTINGS, null)) {
      storage.set(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
    if (!storage.get<Category[] | null>(STORAGE_KEYS.CATEGORIES, null)) {
      storage.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    const existingProds = storage.get<Product[] | null>(STORAGE_KEYS.PRODUCTS, null);
    if (!existingProds) {
      storage.set(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    } else {
      let needsUpdate = false;
      const updatedProds = existingProds.map((p) => {
        if (!p.imageUrl) {
          needsUpdate = true;
          return { ...p, imageUrl: getProductImageUrl(p) };
        }
        return p;
      });
      if (needsUpdate) {
        storage.set(STORAGE_KEYS.PRODUCTS, updatedProds);
      }
    }
    if (!storage.get<Customer[] | null>(STORAGE_KEYS.CUSTOMERS, null)) {
      storage.set(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    }
    if (!storage.get<Supplier[] | null>(STORAGE_KEYS.SUPPLIERS, null)) {
      storage.set(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    }
    if (!storage.get<Sale[] | null>(STORAGE_KEYS.SALES, null)) {
      storage.set(STORAGE_KEYS.SALES, []);
    }
    if (!storage.get<StockMovement[] | null>(STORAGE_KEYS.STOCK_MOVEMENTS, null)) {
      storage.set(STORAGE_KEYS.STOCK_MOVEMENTS, []);
    }
    if (!storage.get<Expense[] | null>(STORAGE_KEYS.EXPENSES, null)) {
      storage.set(STORAGE_KEYS.EXPENSES, []);
    }
    if (!storage.get<AuditLog[] | null>(STORAGE_KEYS.AUDIT_LOGS, null)) {
      storage.set(STORAGE_KEYS.AUDIT_LOGS, []);
    }
    if (!storage.get<Integration[] | null>(STORAGE_KEYS.INTEGRATIONS, null)) {
      storage.set(STORAGE_KEYS.INTEGRATIONS, [INITIAL_INTEGRATION]);
    }
    if (!storage.get<ExternalOrder[] | null>(STORAGE_KEYS.EXTERNAL_ORDERS, null)) {
      storage.set(STORAGE_KEYS.EXTERNAL_ORDERS, INITIAL_EXTERNAL_ORDERS);
    }
    if (!storage.get<ExternalProductMapping[] | null>(STORAGE_KEYS.PRODUCT_MAPPINGS, null)) {
      storage.set(STORAGE_KEYS.PRODUCT_MAPPINGS, []);
    }
    if (!storage.get<WebhookEvent[] | null>(STORAGE_KEYS.WEBHOOK_EVENTS, null)) {
      storage.set(STORAGE_KEYS.WEBHOOK_EVENTS, []);
    }
    if (!storage.get<IntegrationSyncLog[] | null>(STORAGE_KEYS.SYNC_LOGS, null)) {
      storage.set(STORAGE_KEYS.SYNC_LOGS, []);
    }
  },

  // Shop & Settings
  getShop: (): Shop => storage.get<Shop>(STORAGE_KEYS.SHOP, INITIAL_SHOP),
  updateShop: (shop: Shop): void => {
    storage.set(STORAGE_KEYS.SHOP, shop);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shop-updated', { detail: shop }));
    }
    db.logAudit('Shop Settings Updated', 'Shop', shop.id);
  },
  onShopChange: (cb: (shop: Shop) => void): (() => void) => {
    if (typeof window === 'undefined') return () => { };
    const handleCustom = (e: Event) => {
      const custom = e as CustomEvent<Shop>;
      cb(custom.detail || db.getShop());
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SHOP) {
        cb(db.getShop());
      }
    };
    window.addEventListener('shop-updated', handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('shop-updated', handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  },

  getSettings: (): ShopSetting => storage.get<ShopSetting>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
  updateSettings: (settings: ShopSetting): void => {
    storage.set(STORAGE_KEYS.SETTINGS, settings);
    db.logAudit('Billing Settings Updated', 'ShopSetting', settings.id);
  },

  // Categories
  getCategories: (): Category[] => storage.get<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES),
  saveCategory: (category: Category): void => {
    const list = db.getCategories();
    const idx = list.findIndex((c) => c.id === category.id);
    if (idx >= 0) list[idx] = category;
    else list.push(category);
    storage.set(STORAGE_KEYS.CATEGORIES, list);
  },
  deleteCategory: (id: string): void => {
    const list = db.getCategories().filter((c) => c.id !== id);
    storage.set(STORAGE_KEYS.CATEGORIES, list);
  },

  // Products
  getProducts: (): Product[] => storage.get<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS),
  getProductById: (id: string): Product | undefined => db.getProducts().find((p) => p.id === id),
  saveProduct: (product: Product): void => {
    const list = db.getProducts();
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx >= 0) list[idx] = product;
    else list.push(product);
    storage.set(STORAGE_KEYS.PRODUCTS, list);
    db.logAudit(`Product ${idx >= 0 ? 'Updated' : 'Created'}: ${product.name}`, 'Product', product.id);
  },
  deleteProduct: (id: string): void => {
    const list = db.getProducts().filter((p) => p.id !== id);
    storage.set(STORAGE_KEYS.PRODUCTS, list);
    db.logAudit(`Product Deleted`, 'Product', id);
  },

  // Customers
  getCustomers: (): Customer[] => storage.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
  getCustomerById: (id: string): Customer | undefined =>
    db.getCustomers().find((c) => c.id === id),
  saveCustomer: (customer: Customer): void => {
    const list = db.getCustomers();
    const idx = list.findIndex((c) => c.id === customer.id);
    if (idx >= 0) list[idx] = customer;
    else list.push(customer);
    storage.set(STORAGE_KEYS.CUSTOMERS, list);
  },

  // Suppliers
  getSuppliers: (): Supplier[] => storage.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS),
  saveSupplier: (supplier: Supplier): void => {
    const list = db.getSuppliers();
    const idx = list.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) list[idx] = supplier;
    else list.push(supplier);
    storage.set(STORAGE_KEYS.SUPPLIERS, list);
  },

  // Next Sequential Numbers
  getNextInvoiceNumber: (): string => {
    const current = storage.get<number>(STORAGE_KEYS.SEQ_INVOICE, 1001);
    const next = current + 1;
    storage.set(STORAGE_KEYS.SEQ_INVOICE, next);
    const shop = db.getShop();
    const prefix = shop.invoicePrefix || 'SKT/2026-27/';
    return `${prefix}${current}`;
  },

  getNextCreditNoteNumber: (): string => {
    const current = storage.get<number>(STORAGE_KEYS.SEQ_CN, 101);
    const next = current + 1;
    storage.set(STORAGE_KEYS.SEQ_CN, next);
    return `CN/2026-27/${current}`;
  },

  // Sales and Finalization
  getSales: (): Sale[] => storage.get<Sale[]>(STORAGE_KEYS.SALES, []),
  getSaleById: (id: string): Sale | undefined => db.getSales().find((s) => s.id === id),

  finalizeSale: (sale: Sale): { success: boolean; saleId: string; error?: string } => {
    // 1. Idempotency Check
    const existing = db.getSales().find((s) => s.idempotencyKey && s.idempotencyKey === sale.idempotencyKey);
    if (existing) {
      return { success: true, saleId: existing.id };
    }

    // 2. Validate Stock if not allowing negative
    const settings = db.getSettings();
    const products = db.getProducts();

    if (!settings.allowNegativeStock) {
      for (const item of sale.items) {
        const prod = products.find((p) => p.id === item.product.id);
        if (prod && prod.currentStock < item.quantity) {
          return {
            success: false,
            saleId: '',
            error: `Insufficient stock for "${prod.name}". Available: ${prod.currentStock}, Requested: ${item.quantity}`,
          };
        }
      }
    }

    // 3. Deduct Stock & Write Ledger
    const movements: StockMovement[] = [];
    for (const item of sale.items) {
      const prodIdx = products.findIndex((p) => p.id === item.product.id);
      if (prodIdx >= 0) {
        const prod = products[prodIdx];
        prod.currentStock -= item.quantity;
        movements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          shopId: sale.shopId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'SALE_DEDUCTION',
          quantity: -item.quantity,
          balanceAfter: prod.currentStock,
          referenceType: 'SALE',
          referenceId: sale.id,
          remarks: `Sale Inv: ${sale.invoiceNumber}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Save Updated Products
    storage.set(STORAGE_KEYS.PRODUCTS, products);

    // Append Stock Movements
    const currentMovements = db.getStockMovements();
    storage.set(STORAGE_KEYS.STOCK_MOVEMENTS, [...movements, ...currentMovements]);

    // Append Sale
    const sales = db.getSales();
    sales.unshift(sale);
    storage.set(STORAGE_KEYS.SALES, sales);

    // Queue Sync Operation
    db.queueSync('SALE_SYNC', sale, sale.idempotencyKey);

    // Audit Log
    db.logAudit(`Finalized Invoice: ${sale.invoiceNumber} for ₹${sale.grandTotal}`, 'Sale', sale.id);

    return { success: true, saleId: sale.id };
  },

  // Stock Movements & Adjustments
  getStockMovements: (): StockMovement[] => storage.get<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []),
  recordStockAdjustment: (
    productId: string,
    adjustedQty: number, // new total stock
    reason: string
  ): void => {
    const products = db.getProducts();
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const diff = adjustedQty - prod.currentStock;
    prod.currentStock = adjustedQty;
    storage.set(STORAGE_KEYS.PRODUCTS, products);

    const movements = db.getStockMovements();
    movements.unshift({
      id: `adj-${Date.now()}`,
      shopId: prod.shopId,
      productId: prod.id,
      productName: prod.name,
      movementType: 'STOCK_ADJUSTMENT',
      quantity: diff,
      balanceAfter: adjustedQty,
      referenceType: 'MANUAL_ADJUSTMENT',
      remarks: reason,
      createdAt: new Date().toISOString(),
    });
    storage.set(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
    db.logAudit(`Stock Adjusted for ${prod.name} to ${adjustedQty} (${reason})`, 'Product', prod.id);
  },

  // Returns & Credit Notes
  getReturns: (): SaleReturn[] => storage.get<SaleReturn[]>(STORAGE_KEYS.RETURNS, []),
  processReturn: (ret: SaleReturn): boolean => {
    const products = db.getProducts();
    const movements = db.getStockMovements();

    // Restock items if eligible
    for (const item of ret.items) {
      if (item.restockStatus === 'RESTOCKED') {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.currentStock += item.quantity;
          movements.unshift({
            id: `ret-mov-${Date.now()}`,
            shopId: ret.shopId,
            productId: prod.id,
            productName: prod.name,
            movementType: 'SALE_RETURN',
            quantity: item.quantity,
            balanceAfter: prod.currentStock,
            referenceType: 'CREDIT_NOTE',
            referenceId: ret.id,
            remarks: `CN: ${ret.creditNoteNumber} - ${ret.reason}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    storage.set(STORAGE_KEYS.PRODUCTS, products);
    storage.set(STORAGE_KEYS.STOCK_MOVEMENTS, movements);

    const returns = db.getReturns();
    returns.unshift(ret);
    storage.set(STORAGE_KEYS.RETURNS, returns);

    db.logAudit(`Credit Note Created: ${ret.creditNoteNumber} for ₹${ret.totalRefund}`, 'SaleReturn', ret.id);
    return true;
  },

  // Purchases
  getPurchases: (): Purchase[] => storage.get<Purchase[]>(STORAGE_KEYS.PURCHASES, []),
  postPurchase: (purchase: Purchase): void => {
    const products = db.getProducts();
    const movements = db.getStockMovements();

    for (const item of purchase.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.currentStock += item.quantity;
        prod.purchasePrice = item.unitCost;
        movements.unshift({
          id: `pur-mov-${Date.now()}`,
          shopId: purchase.shopId,
          productId: prod.id,
          productName: prod.name,
          movementType: 'PURCHASE_RECEIPT',
          quantity: item.quantity,
          balanceAfter: prod.currentStock,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          remarks: `Supplier Inv: ${purchase.supplierInvoiceNo}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    storage.set(STORAGE_KEYS.PRODUCTS, products);
    storage.set(STORAGE_KEYS.STOCK_MOVEMENTS, movements);

    const purchases = db.getPurchases();
    purchases.unshift(purchase);
    storage.set(STORAGE_KEYS.PURCHASES, purchases);

    // Update supplier balance if balance due
    const suppliers = db.getSuppliers();
    const sup = suppliers.find((s) => s.id === purchase.supplierId);
    if (sup) {
      const balance = purchase.grandTotal - purchase.paidAmount;
      sup.outstandingPayable += balance;
      storage.set(STORAGE_KEYS.SUPPLIERS, suppliers);
    }

    db.logAudit(`Purchase Posted: ${purchase.supplierInvoiceNo} from ${purchase.supplierName}`, 'Purchase', purchase.id);
  },

  // Expenses
  getExpenses: (): Expense[] => storage.get<Expense[]>(STORAGE_KEYS.EXPENSES, []),
  saveExpense: (expense: Expense): void => {
    const expenses = db.getExpenses();
    expenses.unshift(expense);
    storage.set(STORAGE_KEYS.EXPENSES, expenses);
    db.logAudit(`Expense Added: ${expense.category} ₹${expense.amount}`, 'Expense', expense.id);
  },

  // Held Bills
  getHeldBills: (): { id: string; name: string; timestamp: string; cart: CartItem[] }[] =>
    storage.get(STORAGE_KEYS.HELD_BILLS, []),
  saveHeldBill: (name: string, cart: CartItem[]): void => {
    const held = db.getHeldBills();
    held.push({
      id: `hold-${Date.now()}`,
      name: name || `Bill #${held.length + 1}`,
      timestamp: new Date().toLocaleTimeString(),
      cart,
    });
    storage.set(STORAGE_KEYS.HELD_BILLS, held);
  },
  removeHeldBill: (id: string): void => {
    const held = db.getHeldBills().filter((h) => h.id !== id);
    storage.set(STORAGE_KEYS.HELD_BILLS, held);
  },

  // Audit Logs
  getAuditLogs: (): AuditLog[] => storage.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []),
  logAudit: (action: string, entityName: string, entityId?: string, details?: any): void => {
    const logs = db.getAuditLogs();
    logs.unshift({
      id: `log-${Date.now()}`,
      shopId: 'shop-sivakasi-01',
      user: 'Cashier / Admin',
      action,
      entityName,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    });
    if (logs.length > 500) logs.pop();
    storage.set(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  // Sync Queue
  getSyncQueue: (): SyncOperation[] => storage.get<SyncOperation[]>(STORAGE_KEYS.SYNC_QUEUE, []),
  queueSync: (operationType: string, payload: any, idempotencyKey: string): void => {
    const queue = db.getSyncQueue();
    queue.push({
      id: `sync-${Date.now()}`,
      operationType,
      payload,
      status: 'PENDING',
      idempotencyKey,
      createdAt: new Date().toISOString(),
    });
    storage.set(STORAGE_KEYS.SYNC_QUEUE, queue);
  },
  clearSyncQueue: (): void => {
    storage.set(STORAGE_KEYS.SYNC_QUEUE, []);
  },

  // Export & Import Backup
  exportCompleteDatabaseJSON: (): string => {
    const dump = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      shop: db.getShop(),
      settings: db.getSettings(),
      categories: db.getCategories(),
      products: db.getProducts(),
      customers: db.getCustomers(),
      suppliers: db.getSuppliers(),
      sales: db.getSales(),
      stockMovements: db.getStockMovements(),
      purchases: db.getPurchases(),
      returns: db.getReturns(),
      expenses: db.getExpenses(),
      auditLogs: db.getAuditLogs(),
    };
    return JSON.stringify(dump, null, 2);
  },

  importDatabaseJSON: (jsonStr: string): boolean => {
    try {
      const dump = JSON.parse(jsonStr);
      if (dump.shop) storage.set(STORAGE_KEYS.SHOP, dump.shop);
      if (dump.settings) storage.set(STORAGE_KEYS.SETTINGS, dump.settings);
      if (dump.categories) storage.set(STORAGE_KEYS.CATEGORIES, dump.categories);
      if (dump.products) storage.set(STORAGE_KEYS.PRODUCTS, dump.products);
      if (dump.customers) storage.set(STORAGE_KEYS.CUSTOMERS, dump.customers);
      if (dump.suppliers) storage.set(STORAGE_KEYS.SUPPLIERS, dump.suppliers);
      if (dump.sales) storage.set(STORAGE_KEYS.SALES, dump.sales);
      if (dump.stockMovements) storage.set(STORAGE_KEYS.STOCK_MOVEMENTS, dump.stockMovements);
      if (dump.purchases) storage.set(STORAGE_KEYS.PURCHASES, dump.purchases);
      if (dump.returns) storage.set(STORAGE_KEYS.RETURNS, dump.returns);
      if (dump.expenses) storage.set(STORAGE_KEYS.EXPENSES, dump.expenses);
      if (dump.auditLogs) storage.set(STORAGE_KEYS.AUDIT_LOGS, dump.auditLogs);
      return true;
    } catch (e) {
      console.error('Failed to import JSON backup', e);
      return false;
    }
  },

  // WooCommerce Integrations & Orders
  getIntegrations: (): Integration[] => storage.get<Integration[]>(STORAGE_KEYS.INTEGRATIONS, [INITIAL_INTEGRATION]),
  getIntegration: (): Integration => {
    const list = db.getIntegrations();
    return list[0] || INITIAL_INTEGRATION;
  },
  updateIntegration: (integration: Integration): void => {
    const list = db.getIntegrations();
    const idx = list.findIndex((i) => i.id === integration.id || i.type === integration.type);
    if (idx >= 0) list[idx] = integration;
    else list.push(integration);
    storage.set(STORAGE_KEYS.INTEGRATIONS, list);
    db.logAudit(`WooCommerce Integration Settings Updated`, 'Integration', integration.id);
  },

  getExternalOrders: (filters?: { status?: string; search?: string }): ExternalOrder[] => {
    let orders = storage.get<ExternalOrder[]>(STORAGE_KEYS.EXTERNAL_ORDERS, []);
    if (filters?.status && filters.status !== 'all') {
      orders = orders.filter((o) => o.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerPhone && o.customerPhone.includes(q))
      );
    }
    return orders.sort((a, b) => new Date(b.externalCreatedAt).getTime() - new Date(a.externalCreatedAt).getTime());
  },

  getExternalOrderById: (id: string): ExternalOrder | undefined => {
    return storage.get<ExternalOrder[]>(STORAGE_KEYS.EXTERNAL_ORDERS, []).find(
      (o) => o.id === id || o.externalOrderId === id
    );
  },

  saveExternalOrder: (order: ExternalOrder): void => {
    const orders = storage.get<ExternalOrder[]>(STORAGE_KEYS.EXTERNAL_ORDERS, []);
    const idx = orders.findIndex(
      (o) => o.id === order.id || o.externalOrderId === order.externalOrderId
    );
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }
    storage.set(STORAGE_KEYS.EXTERNAL_ORDERS, orders);
  },

  updateExternalOrderStatus: (orderId: string, status: ExternalOrder['status']): void => {
    const orders = storage.get<ExternalOrder[]>(STORAGE_KEYS.EXTERNAL_ORDERS, []);
    const order = orders.find((o) => o.id === orderId || o.externalOrderId === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      storage.set(STORAGE_KEYS.EXTERNAL_ORDERS, orders);
      db.logAudit(`External Order #${order.orderNumber} Status -> ${status}`, 'ExternalOrder', order.id);
    }
  },

  getProductMappings: (): ExternalProductMapping[] =>
    storage.get<ExternalProductMapping[]>(STORAGE_KEYS.PRODUCT_MAPPINGS, []),

  saveProductMapping: (mapping: ExternalProductMapping): void => {
    const mappings = db.getProductMappings();
    const idx = mappings.findIndex(
      (m) =>
        m.externalProductId === mapping.externalProductId &&
        m.externalVariationId === mapping.externalVariationId
    );
    if (idx >= 0) mappings[idx] = mapping;
    else mappings.push(mapping);
    storage.set(STORAGE_KEYS.PRODUCT_MAPPINGS, mappings);
    db.logAudit(`Product Mapping Saved: ${mapping.externalName} -> Local ID ${mapping.localProductId || 'NONE'}`, 'ExternalProductMapping', mapping.id);
  },

  getWebhookEvents: (): WebhookEvent[] =>
    storage.get<WebhookEvent[]>(STORAGE_KEYS.WEBHOOK_EVENTS, []),

  saveWebhookEvent: (event: WebhookEvent): void => {
    const events = db.getWebhookEvents();
    const idx = events.findIndex((e) => e.deliveryId === event.deliveryId);
    if (idx >= 0) events[idx] = event;
    else events.unshift(event);
    storage.set(STORAGE_KEYS.WEBHOOK_EVENTS, events.slice(0, 100));
  },

  getSyncLogs: (): IntegrationSyncLog[] =>
    storage.get<IntegrationSyncLog[]>(STORAGE_KEYS.SYNC_LOGS, []),

  saveSyncLog: (log: IntegrationSyncLog): void => {
    const logs = db.getSyncLogs();
    logs.unshift(log);
    storage.set(STORAGE_KEYS.SYNC_LOGS, logs.slice(0, 50));
  },

  convertAndInvoiceExternalOrder: (
    externalOrderId: string,
    cashierName = 'Counter Staff'
  ): { success: boolean; saleId?: string; invoiceNumber?: string; error?: string } => {
    const order = db.getExternalOrderById(externalOrderId);
    if (!order) {
      return { success: false, error: 'External order not found.' };
    }
    if (order.localInvoiceId) {
      const existingSale = db.getSaleById(order.localInvoiceId);
      return {
        success: true,
        saleId: order.localInvoiceId,
        invoiceNumber: existingSale?.invoiceNumber,
      };
    }

    const items = order.items || [];
    const localProducts = db.getProducts();

    // Verify all items are mapped to active local products
    for (const item of items) {
      const local = localProducts.find((p) => p.id === item.localProductId);
      if (!local) {
        return {
          success: false,
          error: `Item "${item.name}" (SKU: ${item.sku || 'N/A'}) is not mapped to any local cracker product. Please map this product in Online Orders > Mappings first.`,
        };
      }
      item.localProduct = local;
    }

    const shop = db.getShop();
    const invoiceNumber = db.getNextInvoiceNumber();

    // Calculate cart items with compliant 18% GST for Green Crackers
    const cartItems = items.map((item) => {
      const prod = item.localProduct!;
      return calculateCartItem(prod, item.quantity, item.unitPrice, 0, 'GST', 18);
    });

    const totals = calculateInvoiceTotals(cartItems, 0, 'GST');

    const addr = order.billingAddress || order.shippingAddress;
    const addressLine = [addr?.address1, addr?.address2].filter(Boolean).join(', ');

    const sale: Sale = {
      id: `sale-wc-${order.externalOrderId}`,
      shopId: shop.id,
      deviceId: 'POS-1',
      invoiceNumber,
      financialYear: '2026-27',
      invoiceType: 'GST_TAX_INVOICE',
      billingMode: 'GST',
      customerName: order.customerName || 'Online Store Customer',
      customerPhone: order.customerPhone || addr?.phone || '',
      customerEmail: order.customerEmail || addr?.email || '',
      customerAddress: addressLine || '',
      customerCity: addr?.city || '',
      customerState: addr?.state || 'Tamil Nadu',
      subtotal: totals.subtotal,
      discountAmount: totals.totalDiscount,
      taxableValue: totals.taxableValue,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: 0,
      totalTax: totals.totalTax,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: totals.grandTotal,
      balanceAmount: 0,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      status: 'FINALIZED',
      cashierName: `${cashierName} (WooCommerce)`,
      idempotencyKey: `wc-order-${order.externalOrderId}`,
      isSynced: true,
      notes: `Online Order #${order.orderNumber} via WooCommerce (${order.paymentMethodTitle || order.paymentMethod})`,
      items: cartItems,
      payments: [
        {
          id: `pay-wc-${order.externalOrderId}`,
          saleId: `sale-wc-${order.externalOrderId}`,
          paymentMethod: 'UPI',
          amount: totals.grandTotal,
          receivedAmount: totals.grandTotal,
          changeGiven: 0,
          referenceNumber: `WC-${order.orderNumber}`,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const finResult = db.finalizeSale(sale);
    if (!finResult.success) {
      return { success: false, error: finResult.error || 'Failed to finalize sale' };
    }

    // Link external order
    order.localInvoiceId = sale.id;
    order.syncStatus = 'INVOICED';
    order.updatedAt = new Date().toISOString();
    db.saveExternalOrder(order);

    return { success: true, saleId: sale.id, invoiceNumber };
  },
};
