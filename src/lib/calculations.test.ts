import { describe, it, expect } from 'vitest';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  roundTo2,
  formatINR,
  numberToIndianWords,
} from './calculations';

describe('Calculations Module Tests', () => {
  it('correctly rounds decimal numbers to 2 places', () => {
    expect(roundTo2(10.555)).toBe(10.56);
    expect(roundTo2(10.554)).toBe(10.55);
    expect(roundTo2(0.0001)).toBe(0);
  });

  it('calculates single line item with GST 18% (9% CGST + 9% SGST)', () => {
    const item = calculateLineItem({
      mrp: 500,
      unitPrice: 500,
      quantity: 2,
      discountPercentage: 10, // 10% discount -> 100 off -> 900 net taxable
      cgstRate: 9,
      sgstRate: 9,
    });

    expect(item.discountAmount).toBe(100);
    expect(item.taxableValue).toBe(900);
    expect(item.cgstAmount).toBe(81);
    expect(item.sgstAmount).toBe(81);
    expect(item.totalTax).toBe(162);
    expect(item.totalAmount).toBe(1062);
  });

  it('calculates non-GST line item without adding taxes', () => {
    const item = calculateLineItem(
      {
        mrp: 1000,
        unitPrice: 1000,
        quantity: 1,
        discountPercentage: 20,
      },
      'NON_GST'
    );

    expect(item.discountAmount).toBe(200);
    expect(item.taxableValue).toBe(800);
    expect(item.totalTax).toBe(0);
    expect(item.totalAmount).toBe(800);
  });

  it('calculates invoice totals with round off to nearest Rupee', () => {
    const line1 = calculateLineItem({
      mrp: 299,
      unitPrice: 299,
      quantity: 1,
      cgstRate: 9,
      sgstRate: 9,
    });

    const totals = calculateInvoiceTotals([line1]);
    expect(totals.totalQuantity).toBe(1);
    expect(typeof totals.grandTotal).toBe('number');
    expect(totals.grandTotal % 1).toBe(0); // Rounded to whole rupee
  });

  it('converts numbers to Indian currency words', () => {
    expect(numberToIndianWords(1500)).toBe('Rupees One Thousand Five Hundred Only');
    expect(numberToIndianWords(25450)).toBe('Rupees Twenty Five Thousand Four Hundred Fifty Only');
  });
});
