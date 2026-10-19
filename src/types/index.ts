export type UserRole = 'OWNER_ADMIN' | 'CASHIER' | 'INVENTORY_STAFF';

export type BillingMode = 'GST' | 'NON_GST';
export type InvoiceType = 'GST_TAX_INVOICE' | 'RETAIL_BILL' | 'BILL_OF_SUPPLY';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
export type StockMovementType =
  | 'OPENING_STOCK'
  | 'SALE_DEDUCTION'
  | 'SALE_RETURN'
  | 'PURCHASE_RECEIPT'
  | 'STOCK_ADJUSTMENT'
  | 'DAMAGE_WRITE_OFF';

export interface Shop {
  id: string;
  name: string;
  tradeName?: string;
  gstin: string;
  licenseNumber: string; // PESO License No
  licenseValidUpto?: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  invoicePrefix: string;
  invoiceFooterNote: string;
  isActive: boolean;
}

export interface ShopSetting {
  id: string;
  shopId: string;
  defaultBillingMode: BillingMode;
  defaultDiscountPercentage: number;
  enableSeasonalDiscount: boolean;
  seasonalDiscountPercentage: number; // e.g. 70% or 80% discount off MRP
  allowNegativeStock: boolean;
  enforceBarcodeScan: boolean;
  thermalPrinterPaperWidth: '80mm' | '58mm';
  printDuplicateReceipt: boolean;
  autoRoundoffToRupee: boolean;
}

export interface Category {
  id: string;
  shopId: string;
  name: string;
  tamilName?: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  shopId: string;
  categoryId?: string;
  categoryName?: string;
  sku: string;
  barcode: string;
  name: string;
  tamilName?: string;
  brand: string;
  packSize: string;
  uom: string; // BOX, PKT, PCS, CASE
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  discountAllowed: boolean;
  maxDiscountPct: number;
  currentStock: number;
  minStockAlert: number;
  isGreenCracker: boolean;
  pesoCertified: boolean;
  isActive: boolean;
  hsnCode?: string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  creditBalance: number;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  mrp: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface Sale {
  id: string;
  shopId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerGstin?: string;
  cashierName?: string;
  deviceId: string;
  invoiceNumber: string;
  financialYear: string;
  invoiceType: InvoiceType;
  billingMode: BillingMode;
  subtotal: number;
  discountAmount: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING';
  paymentMethod: PaymentMethod;
  status: 'FINALIZED' | 'RETURNED' | 'CANCELLED';
  idempotencyKey: string;
  isSynced: boolean;
  notes?: string;
  items: CartItem[];
  payments: PaymentRecord[];
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  saleId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  receivedAmount: number;
  changeGiven: number;
  referenceNumber?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantity: number; // + or -
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  remarks?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  shopId: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  outstandingPayable: number;
  isActive: boolean;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
  shopId: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNo: string;
  invoiceDate: string;
  receivedDate: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  items: PurchaseItem[];
  notes?: string;
  createdAt: string;
}

export interface SaleReturn {
  id: string;
  shopId: string;
  saleId: string;
  invoiceNumber: string;
  creditNoteNumber: string;
  customerName?: string;
  reason: string;
  refundMethod: PaymentMethod | 'CREDIT_NOTE';
  totalRefund: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    refundRate: number;
    refundAmount: number;
    restockStatus: 'RESTOCKED' | 'DAMAGED_SCRAP';
  }[];
  createdAt: string;
}

export interface Expense {
  id: string;
  shopId: string;
  category: string;
  amount: number;
  paidTo?: string;
  paymentMode: PaymentMethod;
  remarks?: string;
  expenseDate: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  shopId: string;
  user: string;
  action: string;
  entityName: string;
  entityId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface SyncOperation {
  id: string;
  operationType: string;
  payload: any;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  idempotencyKey: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  shopId: string;
  cashierName: string;
  openingTime: string;
  closingTime?: string;
  openingCash: number;
  cashSales: number;
  cashExpenses: number;
  closingCash?: number;
  status: 'OPEN' | 'CLOSED';
}

// WooCommerce & External Integrations
export interface IntegrationSettings {
  autoInvoice: boolean;
  autoDeductStock: boolean;
  defaultOrderStatus: string;
  notifyOnFailedOrder?: boolean;
}

export interface Integration {
  id: string;
  shopId: string;
  type: 'WOOCOMMERCE';
  name: string;
  storeUrl: string;
  consumerKey?: string;
  consumerSecret?: string;
  webhookSecret?: string;
  isActive: boolean;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'FAILED';
  lastSyncAt?: string;
  lastSyncCursor?: string;
  lastErrorMessage?: string;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'ERROR';
  settings: IntegrationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalAddress {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface ExternalOrderItem {
  id: string;
  externalOrderId: string;
  externalItemId: string;
  externalProductId: string;
  externalVariationId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  localProductId?: string;
  localProduct?: Product;
  mappingStatus: 'MATCHED' | 'PENDING' | 'MANUAL_REQUIRED';
  rawData?: any;
  createdAt: string;
}

export interface ExternalOrder {
  id: string;
  integrationId: string;
  shopId: string;
  externalOrderId: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  currency: string;
  totalAmount: number;
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress: ExternalAddress;
  shippingAddress: ExternalAddress;
  paymentMethod?: string;
  paymentMethodTitle?: string;
  isPaid: boolean;
  paidAt?: string;
  externalCreatedAt: string;
  externalUpdatedAt: string;
  syncStatus: 'IMPORTED' | 'MAPPING_PENDING' | 'INVOICED' | 'FAILED';
  localInvoiceId?: string;
  items?: ExternalOrderItem[];
  rawData?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalProductMapping {
  id: string;
  integrationId: string;
  shopId: string;
  externalProductId: string;
  externalVariationId: string;
  externalSku?: string;
  externalName: string;
  localProductId?: string;
  localProduct?: Product;
  mappingStatus: 'MAPPED' | 'UNMAPPED' | 'AMBIGUOUS' | 'IGNORED';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  integrationId?: string;
  deliveryId: string;
  topic: string;
  payload: any;
  signature?: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
}

export interface IntegrationSyncLog {
  id: string;
  integrationId: string;
  syncType: 'MANUAL' | 'WEBHOOK' | 'SCHEDULED_POLL';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  itemsFetched: number;
  itemsSynced: number;
  itemsFailed: number;
  errorDetails?: any;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface OrderInvoiceLink {
  id: string;
  externalOrderId: string;
  saleId: string;
  invoiceNumber: string;
  stockDeducted: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface ProductAlias {
  id: string;
  shopId: string;
  productId: string;
  productName?: string;
  alias: string;
  language: 'en' | 'ta' | 'tanglish' | 'all';
  createdAt?: string;
}

export type VoiceActionType = 'ADD' | 'REMOVE' | 'UPDATE' | 'UNDO' | 'QUERY';

export interface ParsedVoiceCommand {
  rawTranscript: string;
  action: VoiceActionType;
  productNameQuery: string;
  quantity: number;
  unit?: string; // 'PKT' | 'BOX' | 'PCS' | 'CASE'
  confidence: number;
  customerName?: string;
  detectedLanguage?: 'en' | 'ta' | 'tanglish';
  isQuantityExplicit?: boolean;
}

export interface ProductMatchCandidate {
  product: Product;
  score: number; // 0 to 1
  matchedBy: 'EXACT_NAME' | 'EXACT_TAMIL' | 'EXACT_SKU' | 'EXACT_BARCODE' | 'EXACT_ALIAS' | 'FUZZY_NAME' | 'FUZZY_ALIAS' | 'PARTIAL';
  matchedTerm: string;
}

export interface VoiceMatchResult {
  id?: string;
  command: ParsedVoiceCommand;
  status: 'EXACT_MATCH' | 'AMBIGUOUS' | 'NO_MATCH' | 'UNDO_REQUEST' | 'INVALID_COMMAND';
  matchedProduct?: Product;
  candidates?: ProductMatchCandidate[];
  suggestedProducts?: Product[];
  calculatedLineTotal?: number;
  taxableValue?: number;
  totalTax?: number;
  errorMessage?: string;
  selected?: boolean;
}
