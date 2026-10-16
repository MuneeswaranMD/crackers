/**
 * Deterministic Financial and GST Billing Calculations Module
 * Designed for Indian Retail & Fireworks / Crackers POS Compliance
 * All calculations round deterministically to 2 decimal places.
 */
import { Product, CartItem } from '@/types';

export interface CalculationLineInput {
  mrp: number;
  unitPrice: number;
  quantity: number;
  discountPercentage?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  isInclusive?: boolean;
}

export interface CalculatedLineOutput {
  mrp: number;
  unitPrice: number;
  quantity: number;
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

export interface InvoiceTotalsOutput {
  subtotal: number;
  itemDiscounts: number;
  billDiscountAmount: number;
  totalDiscount: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  totalItems: number;
  totalQuantity: number;
}

export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Calculates a single line item totals
 */
export function calculateLineItem(
  input: CalculationLineInput,
  billingMode: 'GST' | 'NON_GST' = 'GST'
): CalculatedLineOutput {
  const quantity = Math.max(0, input.quantity);
  const mrp = Math.max(0, input.mrp);
  const unitPrice = input.unitPrice > 0 ? input.unitPrice : mrp;
  const discountPct = Math.min(100, Math.max(0, input.discountPercentage || 0));

  // Fireworks industry standard: Seasonal discount often computed on MRP or Unit Price
  const grossLineTotal = roundTo2(unitPrice * quantity);
  const discountAmount = roundTo2((grossLineTotal * discountPct) / 100);
  const netLineTotal = Math.max(0, roundTo2(grossLineTotal - discountAmount));

  if (billingMode === 'NON_GST') {
    return {
      mrp,
      unitPrice,
      quantity,
      discountPercentage: discountPct,
      discountAmount,
      taxableValue: netLineTotal,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: netLineTotal,
    };
  }

  // GST Calculation (Default Fireworks HSN 3604: 18% GST -> 9% CGST + 9% SGST)
  const cgstRate = input.cgstRate ?? 9;
  const sgstRate = input.sgstRate ?? 9;
  const igstRate = input.igstRate ?? 0;
  const totalTaxRate = cgstRate + sgstRate + igstRate;

  let taxableValue = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalAmount = 0;

  if (input.isInclusive) {
    // Price includes tax: Taxable = Net / (1 + Rate / 100)
    taxableValue = roundTo2(netLineTotal / (1 + totalTaxRate / 100));
    cgstAmount = roundTo2((taxableValue * cgstRate) / 100);
    sgstAmount = roundTo2((taxableValue * sgstRate) / 100);
    igstAmount = roundTo2((taxableValue * igstRate) / 100);
    totalAmount = netLineTotal;
  } else {
    // Standard Tax exclusive: Tax added on top of taxable value
    taxableValue = netLineTotal;
    cgstAmount = roundTo2((taxableValue * cgstRate) / 100);
    sgstAmount = roundTo2((taxableValue * sgstRate) / 100);
    igstAmount = roundTo2((taxableValue * igstRate) / 100);
    totalAmount = roundTo2(taxableValue + cgstAmount + sgstAmount + igstAmount);
  }

  const totalTax = roundTo2(cgstAmount + sgstAmount + igstAmount);

  return {
    mrp,
    unitPrice,
    quantity,
    discountPercentage: discountPct,
    discountAmount,
    taxableValue,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    totalAmount,
  };
}

/**
 * Calculates complete invoice totals including bill-level discount and round-off
 */
export function calculateInvoiceTotals(
  lines: CalculatedLineOutput[],
  billDiscountPct: number = 0,
  billingMode: 'GST' | 'NON_GST' = 'GST'
): InvoiceTotalsOutput {
  let subtotal = 0;
  let itemDiscounts = 0;
  let taxableValue = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalTax = 0;
  let grossGrand = 0;
  let totalQuantity = 0;

  for (const line of lines) {
    subtotal = roundTo2(subtotal + line.unitPrice * line.quantity);
    itemDiscounts = roundTo2(itemDiscounts + line.discountAmount);
    taxableValue = roundTo2(taxableValue + line.taxableValue);
    cgstAmount = roundTo2(cgstAmount + line.cgstAmount);
    sgstAmount = roundTo2(sgstAmount + line.sgstAmount);
    igstAmount = roundTo2(igstAmount + line.igstAmount);
    totalTax = roundTo2(totalTax + line.totalTax);
    grossGrand = roundTo2(grossGrand + line.totalAmount);
    totalQuantity += line.quantity;
  }

  // Bill-level extra discount (if any)
  const safeBillDiscPct = Math.min(100, Math.max(0, billDiscountPct));
  const billDiscountAmount = roundTo2((grossGrand * safeBillDiscPct) / 100);
  const totalDiscount = roundTo2(itemDiscounts + billDiscountAmount);

  const amountBeforeRound = Math.max(0, roundTo2(grossGrand - billDiscountAmount));
  const roundedGrand = Math.round(amountBeforeRound);
  const roundOff = roundTo2(roundedGrand - amountBeforeRound);

  return {
    subtotal,
    itemDiscounts,
    billDiscountAmount,
    totalDiscount,
    taxableValue,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    roundOff,
    grandTotal: roundedGrand,
    totalItems: lines.length,
    totalQuantity,
  };
}

/**
 * Converts numbers into Indian currency words format (Rupees ... Only)
 */
export function numberToIndianWords(amount: number): string {
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Rupees Zero Only';

  function inWords(n: number): string {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  return 'Rupees ' + inWords(num).trim() + ' Only';
}

/**
 * Convenience helper to map a product and quantity into a fully computed CartItem
 */
export function calculateCartItem(
  product: Product,
  quantity: number,
  unitPrice?: number,
  discountPercentage: number = 0,
  billingMode: 'GST' | 'NON_GST' = 'GST',
  gstRate: number = 18
): CartItem {
  const price = unitPrice !== undefined && unitPrice > 0 ? unitPrice : product.sellingPrice;
  const line = calculateLineItem(
    {
      mrp: product.mrp,
      unitPrice: price,
      quantity,
      discountPercentage,
      cgstRate: gstRate / 2,
      sgstRate: gstRate / 2,
    },
    billingMode
  );

  return {
    product,
    ...line,
  };
}

