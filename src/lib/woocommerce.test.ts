import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  verifyWooCommerceWebhookSignature,
  normalizeWooCommerceOrder,
  convertExternalOrderToSale,
} from './woocommerce';
import { Product, ExternalProductMapping, Shop, ExternalOrder } from '@/types';

describe('WooCommerce Integration Tests', () => {
  const sampleSecret = 'test_webhook_secret_key_12345';
  const sampleShop: Shop = {
    id: 'shop-sivakasi-01',
    name: 'Sree Kalieswari Traders',
    gstin: '33AABCS1429B1Z8',
    licenseNumber: 'PESO/E/TN/2024/09842',
    phone: '+91 94431 23456',
    addressLine1: 'No. 42, Bypass Road',
    city: 'Sivakasi',
    state: 'Tamil Nadu',
    stateCode: '33',
    pincode: '626123',
    invoicePrefix: 'SKT/2026-27/',
    invoiceFooterNote: 'PESO green crackers tested.',
    isActive: true,
  };

  const sampleProducts: Product[] = [
    {
      id: 'prod-01',
      shopId: 'shop-sivakasi-01',
      categoryId: 'cat-1',
      categoryName: 'Sparklers',
      sku: 'SPK-10-ELE',
      barcode: '8901001001',
      name: '10cm Electric Sparklers',
      brand: 'Standard Fireworks',
      packSize: '1 Box',
      uom: 'BOX',
      purchasePrice: 20,
      mrp: 100,
      sellingPrice: 50,
      discountAllowed: true,
      maxDiscountPct: 70,
      currentStock: 100,
      minStockAlert: 10,
      isGreenCracker: true,
      pesoCertified: true,
      isActive: true,
      hsnCode: '3604',
    },
    {
      id: 'prod-04',
      shopId: 'shop-sivakasi-01',
      categoryId: 'cat-2',
      categoryName: 'Flower Pots',
      sku: 'FP-ASO-SPL',
      barcode: '8901002001',
      name: 'Asoka Flower Pots Special',
      brand: 'Standard Fireworks',
      packSize: '1 Box',
      uom: 'BOX',
      purchasePrice: 45,
      mrp: 200,
      sellingPrice: 120,
      discountAllowed: true,
      maxDiscountPct: 70,
      currentStock: 50,
      minStockAlert: 10,
      isGreenCracker: true,
      pesoCertified: true,
      isActive: true,
      hsnCode: '3604',
    },
  ];

  describe('HMAC-SHA256 Webhook Signature Verification', () => {
    it('successfully validates authentic signature computed with correct secret', () => {
      const payload = JSON.stringify({ id: 9942, status: 'processing', total: '750.00' });
      const validSignature = crypto
        .createHmac('sha256', sampleSecret)
        .update(payload, 'utf8')
        .digest('base64');

      const isValid = verifyWooCommerceWebhookSignature(payload, validSignature, sampleSecret);
      expect(isValid).toBe(true);
    });

    it('rejects tampered payload with mismatched signature', () => {
      const originalPayload = JSON.stringify({ id: 9942, status: 'processing', total: '750.00' });
      const tamperedPayload = JSON.stringify({ id: 9942, status: 'processing', total: '1.00' }); // Tampered!

      const signature = crypto
        .createHmac('sha256', sampleSecret)
        .update(originalPayload, 'utf8')
        .digest('base64');

      const isValid = verifyWooCommerceWebhookSignature(tamperedPayload, signature, sampleSecret);
      expect(isValid).toBe(false);
    });

    it('rejects signature computed with incorrect secret', () => {
      const payload = JSON.stringify({ id: 9942, status: 'processing' });
      const signature = crypto
        .createHmac('sha256', 'wrong_secret_key')
        .update(payload, 'utf8')
        .digest('base64');

      const isValid = verifyWooCommerceWebhookSignature(payload, signature, sampleSecret);
      expect(isValid).toBe(false);
    });

    it('handles empty or null signatures gracefully without crashing', () => {
      expect(verifyWooCommerceWebhookSignature('{}', null, sampleSecret)).toBe(false);
      expect(verifyWooCommerceWebhookSignature('{}', '', sampleSecret)).toBe(false);
      expect(verifyWooCommerceWebhookSignature('', 'some-sig', sampleSecret)).toBe(false);
    });
  });

  describe('WooCommerce Order Normalization & SKU Mapping', () => {
    const rawWcOrder = {
      id: 9981,
      number: '9981',
      status: 'processing',
      currency: 'INR',
      total: '450.00',
      subtotal: '450.00',
      total_tax: '68.64',
      shipping_total: '0.00',
      discount_total: '0.00',
      date_created: '2026-10-17T01:00:00Z',
      date_modified: '2026-10-17T01:10:00Z',
      date_paid: '2026-10-17T01:05:00Z',
      payment_method: 'razorpay',
      payment_method_title: 'Razorpay NetBanking',
      billing: {
        first_name: 'Muneeswaran',
        last_name: 'S',
        phone: '+91 94431 11223',
        email: 'munees@example.com',
        city: 'Sivakasi',
        state: 'Tamil Nadu',
        postcode: '626123',
      },
      shipping: {
        first_name: 'Muneeswaran',
        last_name: 'S',
        address_1: 'No 15, Gandhi Road',
        city: 'Sivakasi',
        state: 'Tamil Nadu',
        postcode: '626123',
      },
      line_items: [
        {
          id: 501,
          name: '10cm Electric Sparklers',
          product_id: 101,
          variation_id: 0,
          quantity: 5,
          subtotal: '250.00',
          total: '250.00',
          total_tax: '38.14',
          sku: 'SPK-10-ELE', // Exact candidate match
        },
        {
          id: 502,
          name: 'Asoka Flower Pots Special',
          product_id: 102,
          variation_id: 0,
          quantity: 1,
          subtotal: '120.00',
          total: '120.00',
          total_tax: '18.30',
          sku: 'FP-ASO-SPL', // Exact candidate match
        },
      ],
    };

    it('normalizes customer details, totals, and candidate matches by SKU', () => {
      const { order, items } = normalizeWooCommerceOrder(
        rawWcOrder,
        'int-01',
        'shop-sivakasi-01',
        sampleProducts
      );

      expect(order.orderNumber).toBe('9981');
      expect(order.customerName).toBe('Muneeswaran S');
      expect(order.customerPhone).toBe('+91 94431 11223');
      expect(order.totalAmount).toBe(450);
      expect(order.isPaid).toBe(true);
      expect(order.syncStatus).toBe('IMPORTED');

      expect(items.length).toBe(2);
      expect(items[0].sku).toBe('SPK-10-ELE');
      expect(items[0].mappingStatus).toBe('MATCHED');
      expect(items[0].localProductId).toBe('prod-01');

      expect(items[1].sku).toBe('FP-ASO-SPL');
      expect(items[1].mappingStatus).toBe('MATCHED');
      expect(items[1].localProductId).toBe('prod-04');
    });

    it('flags unmapped products requiring staff review', () => {
      const unmappedRawOrder = {
        ...rawWcOrder,
        id: 9982,
        line_items: [
          {
            id: 601,
            name: 'Special New Multi Color Aerial Shot',
            product_id: 888,
            variation_id: 0,
            quantity: 2,
            subtotal: '500.00',
            total: '500.00',
            sku: 'UNKNOWN-SKU-999',
          },
        ],
      };

      const { order, items } = normalizeWooCommerceOrder(
        unmappedRawOrder,
        'int-01',
        'shop-sivakasi-01',
        sampleProducts
      );

      expect(items[0].mappingStatus).toBe('MANUAL_REQUIRED');
      expect(items[0].localProductId).toBeUndefined();
      expect(order.syncStatus).toBe('MAPPING_PENDING');
    });

    it('prioritizes explicit verified mapping over SKU candidates', () => {
      const explicitMapping: ExternalProductMapping = {
        id: 'map-custom-1',
        integrationId: 'int-01',
        shopId: 'shop-sivakasi-01',
        externalProductId: '777',
        externalVariationId: '0',
        externalName: 'Sparkler Custom Pack',
        localProductId: 'prod-01',
        mappingStatus: 'MAPPED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const customOrder = {
        ...rawWcOrder,
        id: 9983,
        line_items: [
          {
            id: 701,
            name: 'Sparkler Custom Pack',
            product_id: 777,
            variation_id: 0,
            quantity: 2,
            subtotal: '100.00',
            total: '100.00',
            sku: 'DIFFERENT-SKU',
          },
        ],
      };

      const { items } = normalizeWooCommerceOrder(
        customOrder,
        'int-01',
        'shop-sivakasi-01',
        sampleProducts,
        [explicitMapping]
      );

      expect(items[0].mappingStatus).toBe('MATCHED');
      expect(items[0].localProductId).toBe('prod-01');
    });
  });

  describe('Invoice Conversion & Tax Calculation', () => {
    it('creates compliant POS invoice with Tamil Nadu 18% GST (9% CGST + 9% SGST)', () => {
      const mappedOrder: ExternalOrder = {
        id: 'ext-ord-9981',
        integrationId: 'int-01',
        shopId: 'shop-sivakasi-01',
        externalOrderId: '9981',
        orderNumber: '9981',
        status: 'processing',
        currency: 'INR',
        totalAmount: 118,
        subtotalAmount: 100,
        taxAmount: 18,
        shippingAmount: 0,
        discountAmount: 0,
        customerName: 'Sundar',
        billingAddress: {},
        shippingAddress: {},
        isPaid: true,
        externalCreatedAt: new Date().toISOString(),
        externalUpdatedAt: new Date().toISOString(),
        syncStatus: 'IMPORTED',
        items: [
          {
            id: 'item-1',
            externalOrderId: 'ext-ord-9981',
            externalItemId: '1',
            externalProductId: '101',
            sku: 'SPK-10-ELE',
            name: '10cm Electric Sparklers',
            quantity: 2,
            unitPrice: 50,
            subtotal: 100,
            taxAmount: 18,
            total: 118,
            localProductId: 'prod-01',
            localProduct: sampleProducts[0],
            mappingStatus: 'MATCHED',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { sale, cartItems } = convertExternalOrderToSale(mappedOrder, sampleShop, 'Web Test');

      expect(sale.invoiceNumber).toContain('SKT/2026-27/');
      expect(sale.invoiceNumber).toContain('WC-9981');
      expect(sale.billingMode).toBe('GST');
      expect(sale.taxableValue).toBe(100);
      expect(sale.cgstAmount).toBe(9);
      expect(sale.sgstAmount).toBe(9);
      expect(sale.totalTax).toBe(18);
      expect(sale.grandTotal).toBe(118);
      expect(sale.paymentMethod).toBe('UPI');
      expect(cartItems[0].cgstRate).toBe(9);
      expect(cartItems[0].sgstRate).toBe(9);
    });

    it('rejects invoice generation if order already has an associated invoice (idempotency)', () => {
      const alreadyInvoicedOrder: ExternalOrder = {
        id: 'ext-ord-9999',
        integrationId: 'int-01',
        shopId: 'shop-sivakasi-01',
        externalOrderId: '9999',
        orderNumber: '9999',
        status: 'completed',
        currency: 'INR',
        totalAmount: 100,
        subtotalAmount: 100,
        taxAmount: 0,
        shippingAmount: 0,
        discountAmount: 0,
        billingAddress: {},
        shippingAddress: {},
        isPaid: true,
        externalCreatedAt: new Date().toISOString(),
        externalUpdatedAt: new Date().toISOString(),
        syncStatus: 'INVOICED',
        localInvoiceId: 'existing-invoice-id-1234',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() =>
        convertExternalOrderToSale(alreadyInvoicedOrder, sampleShop)
      ).toThrowError(/already has an associated invoice/);
    });

    it('prevents invoice generation if line items are unmapped', () => {
      const unmappedOrder: ExternalOrder = {
        id: 'ext-ord-8888',
        integrationId: 'int-01',
        shopId: 'shop-sivakasi-01',
        externalOrderId: '8888',
        orderNumber: '8888',
        status: 'processing',
        currency: 'INR',
        totalAmount: 100,
        subtotalAmount: 100,
        taxAmount: 0,
        shippingAmount: 0,
        discountAmount: 0,
        billingAddress: {},
        shippingAddress: {},
        isPaid: true,
        externalCreatedAt: new Date().toISOString(),
        externalUpdatedAt: new Date().toISOString(),
        syncStatus: 'MAPPING_PENDING',
        items: [
          {
            id: 'item-unmapped',
            externalOrderId: 'ext-ord-8888',
            externalItemId: '1',
            externalProductId: '888',
            name: 'Mystery Bomb',
            quantity: 1,
            unitPrice: 100,
            subtotal: 100,
            taxAmount: 0,
            total: 100,
            mappingStatus: 'MANUAL_REQUIRED',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() =>
        convertExternalOrderToSale(unmappedOrder, sampleShop)
      ).toThrowError(/Unmapped items/);
    });
  });
});
