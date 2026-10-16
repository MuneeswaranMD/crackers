import crypto from 'crypto';
import {
  ExternalOrder,
  ExternalOrderItem,
  ExternalProductMapping,
  Product,
  Sale,
  Shop,
  CartItem,
} from '@/types';
import { calculateCartItem, calculateInvoiceTotals } from './calculations';

export interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  webhookSecret?: string;
}

export interface FetchOrdersParams {
  page?: number;
  perPage?: number;
  modifiedAfter?: string; // ISO 8601
  status?: string;
  order?: 'asc' | 'desc';
  orderBy?: 'date' | 'modified' | 'id';
}

export interface WooCommerceFetchResult<T> {
  data: T;
  total: number;
  totalPages: number;
}

/**
 * Timing-safe HMAC-SHA256 signature verification for WooCommerce webhooks
 */
export function verifyWooCommerceWebhookSignature(
  rawBody: string | Buffer,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature || !secret || !rawBody) {
    return false;
  }

  try {
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const computedHmac = crypto
      .createHmac('sha256', secret)
      .update(rawBuffer)
      .digest('base64');

    const expectedBuffer = Buffer.from(computedHmac, 'utf8');
    const actualBuffer = Buffer.from(signature.trim(), 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error('[WooCommerce Webhook] Verification error:', err);
    return false;
  }
}

/**
 * Client for WooCommerce REST API v3
 */
export class WooCommerceClient {
  private storeUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private timeoutMs: number;

  constructor(config: WooCommerceConfig, timeoutMs = 12000) {
    // Sanitize store URL (must be HTTPS in production)
    let url = config.storeUrl.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    this.storeUrl = url;
    this.consumerKey = config.consumerKey.trim();
    this.consumerSecret = config.consumerSecret.trim();
    this.timeoutMs = timeoutMs;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2): Promise<Response> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
            'User-Agent': 'Averqon-Crackers-POS/1.0 (Sree Kalieswari Traders)',
            Accept: 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        // Handle rate-limiting (429) or transient server errors (502, 503, 504)
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    throw lastError || new Error(`Network failure after ${maxRetries} retries connecting to ${url}`);
  }

  /**
   * Validates API credentials and endpoint connectivity
   */
  async testConnection(): Promise<{ success: boolean; message: string; shopName?: string }> {
    try {
      const url = `${this.storeUrl}/wp-json/wc/v3/system_status`;
      const res = await this.fetchWithRetry(url, { method: 'GET' });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: 'Connection to WooCommerce store verified successfully!',
          shopName: data?.environment?.site_title || 'WooCommerce Store',
        };
      }

      // Fallback check to /orders?per_page=1 in case system_status permissions are restricted
      const fallbackUrl = `${this.storeUrl}/wp-json/wc/v3/orders?per_page=1`;
      const fallbackRes = await this.fetchWithRetry(fallbackUrl, { method: 'GET' });

      if (fallbackRes.ok) {
        return {
          success: true,
          message: 'Connection to WooCommerce orders endpoint verified successfully!',
        };
      }

      const errText = await fallbackRes.text();
      return {
        success: false,
        message: `HTTP ${fallbackRes.status}: ${errText.slice(0, 150)}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.name === 'AbortError' ? 'Connection timed out (12s)' : err.message || 'Unknown network error',
      };
    }
  }

  /**
   * Fetches paginated orders with incremental sync support
   */
  async getOrders(params: FetchOrdersParams = {}): Promise<WooCommerceFetchResult<any[]>> {
    const query = new URLSearchParams();
    query.set('page', (params.page || 1).toString());
    query.set('per_page', (params.perPage || 20).toString());
    query.set('orderby', params.orderBy || 'modified');
    query.set('order', params.order || 'desc');

    if (params.modifiedAfter) {
      query.set('modified_after', params.modifiedAfter);
    }
    if (params.status && params.status !== 'all') {
      query.set('status', params.status);
    }

    const url = `${this.storeUrl}/wp-json/wc/v3/orders?${query.toString()}`;
    const res = await this.fetchWithRetry(url, { method: 'GET' });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WooCommerce API Error (HTTP ${res.status}): ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);

    return { data, total, totalPages };
  }

  /**
   * Fetches single order by WooCommerce ID
   */
  async getOrder(orderId: string | number): Promise<any> {
    const url = `${this.storeUrl}/wp-json/wc/v3/orders/${orderId}`;
    const res = await this.fetchWithRetry(url, { method: 'GET' });

    if (!res.ok) {
      throw new Error(`Failed to fetch WooCommerce order ${orderId}: HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Fetches products for catalog mapping
   */
  async getProducts(page = 1, perPage = 50): Promise<WooCommerceFetchResult<any[]>> {
    const url = `${this.storeUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`;
    const res = await this.fetchWithRetry(url, { method: 'GET' });

    if (!res.ok) {
      throw new Error(`Failed to fetch WooCommerce products: HTTP ${res.status}`);
    }

    const data = await res.json();
    const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);

    return { data, total, totalPages };
  }
}

/**
 * Normalizes raw WooCommerce order into Averqon POS external order model
 */
export function normalizeWooCommerceOrder(
  raw: any,
  integrationId: string,
  shopId: string,
  localProducts: Product[],
  savedMappings: ExternalProductMapping[] = []
): { order: ExternalOrder; items: ExternalOrderItem[] } {
  const orderIdStr = String(raw.id);
  const billing = raw.billing || {};
  const shipping = raw.shipping || {};

  const customerName =
    [billing.first_name, billing.last_name].filter(Boolean).join(' ') ||
    [shipping.first_name, shipping.last_name].filter(Boolean).join(' ') ||
    'Online Guest Customer';

  const order: ExternalOrder = {
    id: `ext-ord-${orderIdStr}`,
    integrationId,
    shopId,
    externalOrderId: orderIdStr,
    orderNumber: String(raw.number || raw.id),
    status: raw.status || 'pending',
    currency: raw.currency || 'INR',
    totalAmount: parseFloat(raw.total) || 0,
    subtotalAmount: parseFloat(raw.subtotal || raw.total) || 0,
    taxAmount: parseFloat(raw.total_tax) || 0,
    shippingAmount: parseFloat(raw.shipping_total) || 0,
    discountAmount: parseFloat(raw.discount_total) || 0,
    customerName,
    customerEmail: billing.email || undefined,
    customerPhone: billing.phone || shipping.phone || undefined,
    billingAddress: {
      firstName: billing.first_name,
      lastName: billing.last_name,
      company: billing.company,
      address1: billing.address_1,
      address2: billing.address_2,
      city: billing.city || 'Sivakasi',
      state: billing.state || 'Tamil Nadu',
      postcode: billing.postcode,
      country: billing.country || 'IN',
      email: billing.email,
      phone: billing.phone,
    },
    shippingAddress: {
      firstName: shipping.first_name,
      lastName: shipping.last_name,
      company: shipping.company,
      address1: shipping.address_1,
      address2: shipping.address_2,
      city: shipping.city || 'Sivakasi',
      state: shipping.state || 'Tamil Nadu',
      postcode: shipping.postcode,
      country: shipping.country || 'IN',
      phone: shipping.phone || billing.phone,
    },
    paymentMethod: raw.payment_method || 'online',
    paymentMethodTitle: raw.payment_method_title || 'Online Payment Gateway',
    isPaid: Boolean(raw.date_paid) || ['processing', 'completed'].includes(raw.status),
    paidAt: raw.date_paid || undefined,
    externalCreatedAt: raw.date_created || new Date().toISOString(),
    externalUpdatedAt: raw.date_modified || new Date().toISOString(),
    syncStatus: 'IMPORTED',
    rawData: raw,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rawLineItems = Array.isArray(raw.line_items) ? raw.line_items : [];
  let allMatched = true;

  const items: ExternalOrderItem[] = rawLineItems.map((li: any) => {
    const rawProdId = String(li.product_id);
    const rawVarId = String(li.variation_id || '0');
    const rawSku = (li.sku || '').trim().toUpperCase();

    // 1. Check existing verified mapping
    const existingMapping = savedMappings.find(
      (m) =>
        m.externalProductId === rawProdId &&
        (m.externalVariationId === rawVarId || m.externalVariationId === '0') &&
        m.mappingStatus === 'MAPPED' &&
        m.localProductId
    );

    let localProduct: Product | undefined = undefined;
    let mappingStatus: 'MATCHED' | 'PENDING' | 'MANUAL_REQUIRED' = 'MANUAL_REQUIRED';

    if (existingMapping && existingMapping.localProductId) {
      localProduct = localProducts.find((p) => p.id === existingMapping.localProductId);
      if (localProduct) {
        mappingStatus = 'MATCHED';
      }
    }

    // 2. Candidate match by SKU if not explicitly mapped
    if (!localProduct && rawSku) {
      localProduct = localProducts.find(
        (p) => p.sku.trim().toUpperCase() === rawSku || (p.barcode && p.barcode.trim() === rawSku)
      );
      if (localProduct) {
        mappingStatus = 'MATCHED';
      }
    }

    // 3. Candidate match by exact name as fallback
    if (!localProduct && li.name) {
      const normName = li.name.trim().toLowerCase();
      localProduct = localProducts.find((p) => p.name.trim().toLowerCase() === normName);
      if (localProduct) {
        mappingStatus = 'MATCHED';
      }
    }

    if (!localProduct) {
      allMatched = false;
    }

    const qty = parseInt(li.quantity, 10) || 1;
    const total = parseFloat(li.total) || 0;
    const subtotal = parseFloat(li.subtotal) || total;
    const unitPrice = qty > 0 ? subtotal / qty : 0;
    const taxAmount = parseFloat(li.total_tax) || 0;

    return {
      id: `ext-item-${orderIdStr}-${li.id}`,
      externalOrderId: order.id,
      externalItemId: String(li.id),
      externalProductId: rawProdId,
      externalVariationId: rawVarId !== '0' ? rawVarId : undefined,
      sku: rawSku || undefined,
      name: li.name || 'Cracker Item',
      quantity: qty,
      unitPrice,
      subtotal,
      taxAmount,
      total,
      localProductId: localProduct?.id,
      localProduct,
      mappingStatus,
      rawData: li,
      createdAt: new Date().toISOString(),
    };
  });

  order.items = items;
  order.syncStatus = allMatched ? 'IMPORTED' : 'MAPPING_PENDING';

  return { order, items };
}

/**
 * Idempotently transforms an imported external order into an authentic Averqon POS Invoice
 */
export function convertExternalOrderToSale(
  order: ExternalOrder,
  shop: Shop,
  cashierName = 'WooCommerce Webhook Engine'
): { sale: Sale; cartItems: CartItem[] } {
  if (order.localInvoiceId) {
    throw new Error(`Order #${order.orderNumber} already has an associated invoice: ${order.localInvoiceId}`);
  }

  const items = order.items || [];
  const unmapped = items.filter((i) => !i.localProduct);
  if (unmapped.length > 0) {
    const unmappedNames = unmapped.map((u) => u.name).join(', ');
    throw new Error(`Cannot invoice order #${order.orderNumber}. Unmapped items: ${unmappedNames}`);
  }

  // Convert external items to POS CartItems with Tamil Nadu fireworks tax calculations
  const cartItems: CartItem[] = items.map((item, idx) => {
    const prod = item.localProduct!;
    // Standard Tamil Nadu Fireworks GST rate: 18% (9% CGST + 9% SGST)
    const gstRate = 18;

    return calculateCartItem(
      prod,
      item.quantity,
      item.unitPrice,
      0, // discount percentage
      'GST',
      gstRate
    );
  });

  const totals = calculateInvoiceTotals(cartItems, 0, 'GST');
  const now = new Date();
  const yearSuffix = `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`;
  const prefix = shop.invoicePrefix || `SKT/${yearSuffix}/`;
  const invoiceNumber = `${prefix}WC-${order.orderNumber}`;

  const sale: Sale = {
    id: `sale-wc-${order.externalOrderId}`,
    shopId: shop.id,
    deviceId: 'POS-1',
    invoiceNumber,
    financialYear: yearSuffix,
    invoiceType: 'GST_TAX_INVOICE',
    billingMode: 'GST',
    customerName: order.customerName,
    customerPhone: order.customerPhone,
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
    cashierName: `${cashierName} (Online)`,
    idempotencyKey: `wc-order-${order.externalOrderId}`,
    isSynced: true,
    notes: `Online Order #${order.orderNumber} via WooCommerce. Payment: ${order.paymentMethodTitle || order.paymentMethod}. Customer: ${order.customerName}`,
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
        createdAt: now.toISOString(),
      },
    ],
    createdAt: order.externalCreatedAt || now.toISOString(),
  };

  return { sale, cartItems };
}
