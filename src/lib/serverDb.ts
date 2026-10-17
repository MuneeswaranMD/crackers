import { Pool } from 'pg';
import { Sale, ExternalOrder, Customer, Product, Shop, Category, StockMovement } from '@/types';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export const SHOP_UUID = '11111111-1111-1111-1111-111111111111';
export const INTEGRATION_UUID = '33333333-1111-1111-1111-111111111111';

/**
 * Persist a finalized POS sale to Supabase PostgreSQL
 */
export async function saveSaleToSupabase(sale: Sale): Promise<{ success: boolean; dbSaleId?: string; error?: string }> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Resolve or create Customer record
    let customerId: string | null = null;
    if (sale.customerPhone || (sale.customerName && sale.customerName !== 'Walk-in Retail Customer')) {
      const custRes = await client.query(
        `SELECT id FROM customers WHERE shop_id = $1 AND phone = $2 LIMIT 1`,
        [SHOP_UUID, sale.customerPhone || '']
      );

      if (custRes.rows.length > 0) {
        customerId = custRes.rows[0].id;
      } else if (sale.customerName && sale.customerName !== 'Walk-in Retail Customer') {
        const insertCust = await client.query(
          `INSERT INTO customers (
            shop_id, name, phone, email, address_line, city, state, gstin
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id`,
          [
            SHOP_UUID,
            sale.customerName,
            sale.customerPhone || 'N/A',
            sale.customerEmail || null,
            sale.customerAddress || null,
            sale.customerCity || 'Sivakasi',
            sale.customerState || 'Tamil Nadu',
            sale.customerGstin || null,
          ]
        );
        customerId = insertCust.rows[0].id;
      }
    }

    // 2. Insert Sale
    const saleRes = await client.query(
      `INSERT INTO sales (
        shop_id, customer_id, device_id, invoice_number,
        financial_year, invoice_type, billing_mode, subtotal, discount_amount,
        taxable_value, cgst_amount, sgst_amount, igst_amount, total_tax,
        round_off, grand_total, paid_amount, balance_amount, payment_status,
        status, idempotency_key, is_synced, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24
      )
      ON CONFLICT (shop_id, invoice_number) DO UPDATE SET
        paid_amount = EXCLUDED.paid_amount,
        payment_status = EXCLUDED.payment_status,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id`,
      [
        SHOP_UUID,
        customerId,
        sale.deviceId || 'POS-1',
        sale.invoiceNumber,
        sale.financialYear || '2026-27',
        sale.invoiceType || 'GST_TAX_INVOICE',
        sale.billingMode || 'GST',
        sale.subtotal,
        sale.discountAmount,
        sale.taxableValue,
        sale.cgstAmount,
        sale.sgstAmount,
        sale.igstAmount,
        sale.totalTax,
        sale.roundOff,
        sale.grandTotal,
        sale.paidAmount,
        sale.balanceAmount,
        sale.paymentStatus || 'PAID',
        sale.status || 'FINALIZED',
        sale.idempotencyKey || `idemp-${Date.now()}`,
        true,
        sale.notes || null,
        sale.createdAt || new Date().toISOString(),
      ]
    );

    const dbSaleId = saleRes.rows[0].id;

    // 3. Insert Sale Items
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        // Look up product ID in Supabase
        const prodRes = await client.query(
          `SELECT id FROM products WHERE shop_id = $1 AND (sku = $2 OR name = $3) LIMIT 1`,
          [SHOP_UUID, item.product.sku, item.product.name]
        );
        const dbProdId = prodRes.rows[0]?.id || null;

        if (dbProdId) {
          await client.query(
            `INSERT INTO sale_items (
              sale_id, product_id, product_name, tamil_name, sku,
              hsn_code, pack_size, uom, quantity, mrp,
              unit_price, discount_percentage, discount_amount, taxable_value,
              cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate,
              igst_amount, total_amount
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21
            ) ON CONFLICT DO NOTHING`,
            [
              dbSaleId,
              dbProdId,
              item.product.name,
              item.product.tamilName || null,
              item.product.sku,
              item.product.hsnCode || '3604',
              item.product.packSize || '1 Box',
              item.product.uom || 'BOX',
              item.quantity,
              item.mrp,
              item.unitPrice,
              item.discountPercentage,
              item.discountAmount,
              item.taxableValue,
              item.cgstRate,
              item.cgstAmount,
              item.sgstRate,
              item.sgstAmount,
              item.igstRate,
              item.igstAmount,
              item.totalAmount,
            ]
          );

          // Deduct stock in Supabase products
          await client.query(
            `UPDATE products SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2`,
            [item.quantity, dbProdId]
          );

          // Record stock movement ledger
          await client.query(
            `INSERT INTO stock_movements (
              shop_id, product_id, movement_type, quantity, balance_after,
              reference_type, reference_id, remarks
            ) VALUES (
              $1, $2, 'SALE_DEDUCTION', $3,
              (SELECT current_stock FROM products WHERE id = $2),
              'SALE', $4, $5
            )`,
            [
              SHOP_UUID,
              dbProdId,
              -item.quantity,
              dbSaleId,
              `POS Inv: ${sale.invoiceNumber}`,
            ]
          );
        }
      }
    }

    // 4. Record Payment
    if (sale.payments && sale.payments.length > 0) {
      for (const pay of sale.payments) {
        await client.query(
          `INSERT INTO payments (
            shop_id, sale_id, payment_method, amount, received_amount, change_given,
            reference_number, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            SHOP_UUID,
            dbSaleId,
            pay.paymentMethod,
            pay.amount,
            pay.receivedAmount,
            pay.changeGiven,
            pay.referenceNumber || null,
            pay.createdAt || new Date().toISOString(),
          ]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, dbSaleId };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Supabase Save Error]', err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Persist an External WooCommerce Order to Supabase PostgreSQL
 */
export async function saveExternalOrderToSupabase(
  order: ExternalOrder
): Promise<{ success: boolean; id?: string; error?: string }> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    const res = await client.query(
      `INSERT INTO external_orders (
        integration_id, shop_id, external_order_id, order_number,
        status, currency, total_amount, subtotal_amount, tax_amount,
        shipping_amount, discount_amount, customer_name, customer_email,
        customer_phone, billing_address, shipping_address, payment_method,
        payment_method_title, is_paid, external_created_at, external_updated_at,
        sync_status, raw_data, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24
      )
      ON CONFLICT (integration_id, external_order_id) DO UPDATE SET
        status = EXCLUDED.status,
        total_amount = EXCLUDED.total_amount,
        is_paid = EXCLUDED.is_paid,
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        customer_email = EXCLUDED.customer_email,
        sync_status = EXCLUDED.sync_status,
        updated_at = NOW()
      RETURNING id`,
      [
        INTEGRATION_UUID,
        SHOP_UUID,
        order.externalOrderId,
        order.orderNumber,
        order.status,
        order.currency || 'INR',
        order.totalAmount,
        order.subtotalAmount,
        order.taxAmount,
        order.shippingAmount,
        order.discountAmount,
        order.customerName || null,
        order.customerEmail || null,
        order.customerPhone || null,
        JSON.stringify(order.billingAddress || {}),
        JSON.stringify(order.shippingAddress || {}),
        order.paymentMethod || null,
        order.paymentMethodTitle || null,
        order.isPaid,
        order.externalCreatedAt || new Date().toISOString(),
        order.externalUpdatedAt || new Date().toISOString(),
        order.syncStatus || 'IMPORTED',
        JSON.stringify(order.rawData || {}),
        order.notes || null,
      ]
    );

    const extDbId = res.rows[0].id;

    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await client.query(
          `INSERT INTO external_order_items (
            external_order_id, external_item_id, external_product_id,
            sku, name, quantity, unit_price, subtotal, tax_amount, total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (external_order_id, external_item_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            total = EXCLUDED.total`,
          [
            extDbId,
            item.externalItemId || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            item.externalProductId || '0',
            item.sku || null,
            item.name,
            item.quantity,
            item.unitPrice,
            item.subtotal,
            item.taxAmount,
            item.total,
          ]
        );
      }
    }

    return { success: true, id: extDbId };
  } catch (err: any) {
    console.error('Error saving external order to Supabase:', err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Fetch all sales directly from Supabase
 */
export async function getSalesFromSupabase(): Promise<Sale[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'id', si.id,
              'product', json_build_object(
                'id', p.id,
                'name', si.product_name,
                'tamilName', si.tamil_name,
                'sku', si.sku,
                'packSize', si.pack_size,
                'uom', si.uom,
                'imageUrl', p.image_url
              ),
              'quantity', si.quantity,
              'mrp', si.mrp,
              'unitPrice', si.unit_price,
              'discountPercentage', si.discount_percentage,
              'discountAmount', si.discount_amount,
              'taxableValue', si.taxable_value,
              'cgstRate', si.cgst_rate,
              'cgstAmount', si.cgst_amount,
              'sgstRate', si.sgst_rate,
              'sgstAmount', si.sgst_amount,
              'igstRate', si.igst_rate,
              'igstAmount', si.igst_amount,
              'totalTax', (COALESCE(si.cgst_amount, 0) + COALESCE(si.sgst_amount, 0) + COALESCE(si.igst_amount, 0)),
              'totalAmount', si.total_amount
            )
          ) FILTER (WHERE si.id IS NOT NULL),
          '[]'
        ) as items,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pay.id,
                'paymentMethod', pay.payment_method,
                'amount', pay.amount,
                'receivedAmount', pay.received_amount,
                'changeGiven', pay.change_given,
                'referenceNumber', pay.reference_number,
                'createdAt', pay.created_at
              )
            )
            FROM payments pay
            WHERE pay.sale_id = s.id
          ),
          '[]'
        ) as payments
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN sale_items si ON s.id = si.sale_id
       LEFT JOIN products p ON si.product_id = p.id
       WHERE s.shop_id = $1
       GROUP BY s.id, c.name, c.phone
       ORDER BY s.created_at DESC`,
      [SHOP_UUID]
    );

    return res.rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      customerId: r.customer_id,
      customerName: r.customer_name || 'Walk-in Retail Customer',
      customerPhone: r.customer_phone || '',
      cashierName: r.cashier_id || 'Counter POS 1',
      deviceId: r.device_id,
      invoiceNumber: r.invoice_number,
      financialYear: r.financial_year,
      invoiceType: r.invoice_type,
      billingMode: r.billing_mode,
      subtotal: parseFloat(r.subtotal) || 0,
      discountAmount: parseFloat(r.discount_amount) || 0,
      taxableValue: parseFloat(r.taxable_value) || 0,
      cgstAmount: parseFloat(r.cgst_amount) || 0,
      sgstAmount: parseFloat(r.sgst_amount) || 0,
      igstAmount: parseFloat(r.igst_amount) || 0,
      totalTax: parseFloat(r.total_tax) || 0,
      roundOff: parseFloat(r.round_off) || 0,
      grandTotal: parseFloat(r.grand_total) || 0,
      paidAmount: parseFloat(r.paid_amount) || 0,
      balanceAmount: parseFloat(r.balance_amount) || 0,
      paymentStatus: r.payment_status,
      paymentMethod: r.payments?.[0]?.paymentMethod || 'CASH',
      status: r.status,
      idempotencyKey: r.idempotency_key,
      isSynced: true,
      notes: r.notes,
      items: r.items,
      payments: r.payments,
      createdAt: r.created_at,
    }));
  } finally {
    client.release();
  }
}

/**
 * Fetch all products directly from Supabase
 */
export async function getProductsFromSupabase(): Promise<Product[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.shop_id = $1
      ORDER BY p.name ASC
    `, [SHOP_UUID]);

    return res.rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      categoryId: r.category_id,
      categoryName: r.category_name || 'Crackers',
      sku: r.sku,
      barcode: r.barcode || '',
      name: r.name,
      tamilName: r.tamil_name || '',
      brand: r.brand || 'Standard Fireworks',
      packSize: r.pack_size || '1 Box',
      uom: r.uom || 'BOX',
      purchasePrice: parseFloat(r.purchase_price) || 0,
      mrp: parseFloat(r.mrp) || 0,
      sellingPrice: parseFloat(r.selling_price) || 0,
      discountAllowed: r.discount_allowed !== false,
      maxDiscountPct: parseFloat(r.max_discount_pct) || 80,
      currentStock: parseInt(r.current_stock, 10) || 0,
      minStockAlert: parseInt(r.min_stock_alert, 10) || 10,
      isGreenCracker: r.is_green_cracker !== false,
      pesoCertified: r.peso_certified !== false,
      isActive: r.is_active !== false,
      imageUrl: r.image_url || '/images/products/sparklers.jpg',
    }));
  } finally {
    client.release();
  }
}

/**
 * Save / Update a product directly in Supabase
 */
export async function saveProductToSupabase(p: Product): Promise<{ success: boolean; id?: string }> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(`
      INSERT INTO products (
        shop_id, sku, barcode, name, tamil_name, brand, pack_size, uom,
        purchase_price, mrp, selling_price, discount_allowed, max_discount_pct,
        current_stock, min_stock_alert, is_green_cracker, peso_certified,
        is_active, image_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19
      )
      ON CONFLICT (shop_id, sku) DO UPDATE SET
        name = EXCLUDED.name,
        tamil_name = EXCLUDED.tamil_name,
        mrp = EXCLUDED.mrp,
        selling_price = EXCLUDED.selling_price,
        current_stock = EXCLUDED.current_stock,
        image_url = EXCLUDED.image_url,
        updated_at = NOW()
      RETURNING id
    `, [
      SHOP_UUID,
      p.sku,
      p.barcode || null,
      p.name,
      p.tamilName || null,
      p.brand || 'Standard Fireworks',
      p.packSize || '1 Box',
      p.uom || 'BOX',
      p.purchasePrice || 0,
      p.mrp || 0,
      p.sellingPrice || 0,
      p.discountAllowed !== false,
      p.maxDiscountPct || 80,
      p.currentStock || 0,
      p.minStockAlert || 10,
      p.isGreenCracker !== false,
      p.pesoCertified !== false,
      p.isActive !== false,
      p.imageUrl || null,
    ]);
    return { success: true, id: res.rows[0].id };
  } finally {
    client.release();
  }
}

/**
 * Fetch all categories directly from Supabase
 */
export async function getCategoriesFromSupabase(): Promise<Category[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT * FROM categories WHERE shop_id = $1 ORDER BY display_order ASC
    `, [SHOP_UUID]);

    return res.rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      name: r.name,
      tamilName: r.tamil_name || undefined,
      displayOrder: r.display_order,
      isActive: r.is_active,
    }));
  } finally {
    client.release();
  }
}

/**
 * Fetch all customers directly from Supabase
 */
export async function getCustomersFromSupabase(): Promise<Customer[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT * FROM customers WHERE shop_id = $1 ORDER BY name ASC
    `, [SHOP_UUID]);

    return res.rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      name: r.name,
      phone: r.phone,
      email: r.email || undefined,
      gstin: r.gstin || undefined,
      addressLine: r.address_line || undefined,
      city: r.city || 'Sivakasi',
      state: r.state || 'Tamil Nadu',
      creditBalance: parseFloat(r.credit_balance) || 0,
      isActive: r.is_active,
    }));
  } finally {
    client.release();
  }
}

/**
 * Save / Update customer directly in Supabase
 */
export async function saveCustomerToSupabase(c: Customer): Promise<{ success: boolean; id?: string }> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(`
      INSERT INTO customers (
        shop_id, name, phone, email, gstin, address_line, city, state, credit_balance, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      SHOP_UUID,
      c.name,
      c.phone,
      c.email || null,
      c.gstin || null,
      c.addressLine || null,
      c.city || 'Sivakasi',
      c.state || 'Tamil Nadu',
      c.creditBalance || 0,
      c.isActive !== false,
    ]);
    return { success: true, id: res.rows[0].id };
  } finally {
    client.release();
  }
}

/**
 * Fetch all external WooCommerce orders directly from Supabase
 */
export async function getExternalOrdersFromSupabase(): Promise<ExternalOrder[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'externalOrderId', o.id,
              'externalItemId', i.external_item_id,
              'externalProductId', i.external_product_id,
              'sku', i.sku,
              'name', i.name,
              'quantity', i.quantity,
              'unitPrice', i.unit_price,
              'subtotal', i.subtotal,
              'total', i.total,
              'localProductId', COALESCE(i.local_product_id, p.id),
              'mappingStatus', CASE WHEN (i.local_product_id IS NOT NULL OR p.id IS NOT NULL) THEN 'MATCHED' ELSE 'PENDING' END,
              'localProduct', CASE WHEN p.id IS NOT NULL THEN json_build_object(
                'id', p.id,
                'name', p.name,
                'sku', p.sku,
                'sellingPrice', p.selling_price,
                'imageUrl', p.image_url
              ) ELSE NULL END
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) as items
      FROM external_orders o
      LEFT JOIN external_order_items i ON o.id = i.external_order_id
      LEFT JOIN products p ON (i.local_product_id = p.id OR (i.sku IS NOT NULL AND i.sku <> '' AND i.sku = p.sku))
      WHERE o.shop_id = $1
      GROUP BY o.id
      ORDER BY o.external_created_at DESC
    `, [SHOP_UUID]);

    return res.rows.map((r) => ({
      id: r.id,
      integrationId: r.integration_id,
      shopId: r.shop_id,
      externalOrderId: r.external_order_id,
      orderNumber: r.order_number,
      status: r.status,
      currency: r.currency || 'INR',
      totalAmount: parseFloat(r.total_amount) || 0,
      subtotalAmount: parseFloat(r.subtotal_amount) || 0,
      taxAmount: parseFloat(r.tax_amount) || 0,
      shippingAmount: parseFloat(r.shipping_amount) || 0,
      discountAmount: parseFloat(r.discount_amount) || 0,
      customerName: r.customer_name,
      customerEmail: r.customer_email,
      customerPhone: r.customer_phone,
      billingAddress: r.billing_address || {},
      shippingAddress: r.shipping_address || {},
      paymentMethod: r.payment_method,
      paymentMethodTitle: r.payment_method_title,
      isPaid: r.is_paid,
      externalCreatedAt: r.external_created_at,
      externalUpdatedAt: r.external_updated_at,
      syncStatus: r.sync_status,
      localInvoiceId: r.local_invoice_id,
      notes: r.notes,
      items: r.items,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } finally {
    client.release();
  }
}

/**
 * Fetch Shop profile from Supabase
 */
export async function getShopFromSupabase(): Promise<Shop> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT * FROM shops WHERE id = $1 LIMIT 1`, [SHOP_UUID]);
    if (res.rows.length === 0) {
      return {
        id: SHOP_UUID,
        name: 'Sree Kalieswari Traders',
        tradeName: 'Sree Kalieswari Traders',
        gstin: '33AABCS1429B1Z8',
        licenseNumber: 'PESO/E/TN/2024/09842',
        licenseValidUpto: '2028-03-31',
        phone: '9843749750, 94431 23456',
        email: 'sales@sreekalieswaritraders.com',
        addressLine1: 'No. 42, Bypass Road, Near Bus Stand',
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
        invoiceFooterNote: 'Subject to Sivakasi Jurisdiction. Green Crackers tested as per CSIR-NEERI & PESO guidelines.',
        isActive: true,
      };
    }
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      tradeName: r.trade_name || r.name,
      gstin: r.gstin || '',
      licenseNumber: r.license_number || '',
      licenseValidUpto: r.license_valid_upto || '',
      phone: r.phone || '',
      email: r.email || '',
      addressLine1: r.address_line1 || '',
      addressLine2: r.address_line2 || '',
      city: r.city || 'Sivakasi',
      state: r.state || 'Tamil Nadu',
      stateCode: r.state_code || '33',
      pincode: r.pincode || '',
      bankName: r.bank_name || '',
      bankAccountNo: r.bank_account_no || '',
      bankIfsc: r.bank_ifsc || '',
      bankBranch: r.bank_branch || '',
      upiId: r.upi_id || '9843749750',
      invoicePrefix: r.invoice_prefix || 'SKT/2026-27/',
      invoiceFooterNote: r.invoice_footer_note || '',
      isActive: r.is_active,
    };
  } finally {
    client.release();
  }
}

/**
 * Record a physical stock adjustment directly in Supabase
 */
export async function recordStockAdjustmentInSupabase(params: {
  productId?: string;
  sku?: string;
  productName?: string;
  adjustedQty: number;
  reason: string;
}): Promise<{ success: boolean; movementId?: string; balanceAfter?: number; error?: string }> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const isUuid = params.productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.productId);
    
    // Find the product in Supabase
    let prodRes;
    if (isUuid) {
      prodRes = await client.query(
        `SELECT id, name, sku, current_stock FROM products WHERE shop_id = $1 AND id = $2 LIMIT 1`,
        [SHOP_UUID, params.productId]
      );
    } else {
      prodRes = await client.query(
        `SELECT id, name, sku, current_stock FROM products WHERE shop_id = $1 AND (sku = $2 OR name = $3) LIMIT 1`,
        [SHOP_UUID, params.sku || '', params.productName || '']
      );
    }

    if (!prodRes || prodRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Product not found in Supabase database' };
    }

    const prod = prodRes.rows[0];
    const prevStock = parseInt(prod.current_stock, 10) || 0;
    const diff = params.adjustedQty - prevStock;

    // 1. Update products table
    await client.query(
      `UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
      [params.adjustedQty, prod.id]
    );

    // 2. Upsert stock_balances
    await client.query(
      `INSERT INTO stock_balances (shop_id, product_id, quantity, last_counted_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (shop_id, product_id) DO UPDATE SET
         quantity = EXCLUDED.quantity,
         last_counted_at = NOW(),
         updated_at = NOW()`,
      [SHOP_UUID, prod.id, params.adjustedQty]
    );

    // 3. Record stock_movements ledger
    const movRes = await client.query(
      `INSERT INTO stock_movements (
        shop_id, product_id, movement_type, quantity, balance_after,
        reference_type, remarks
      ) VALUES (
        $1, $2, 'STOCK_ADJUSTMENT', $3, $4,
        'MANUAL_ADJUSTMENT', $5
      ) RETURNING id`,
      [SHOP_UUID, prod.id, diff, params.adjustedQty, params.reason]
    );

    await client.query('COMMIT');
    return {
      success: true,
      movementId: movRes.rows[0]?.id,
      balanceAfter: params.adjustedQty,
    };
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error in recordStockAdjustmentInSupabase:', err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

/**
 * Fetch stock movements from Supabase
 */
export async function getStockMovementsFromSupabase(limit = 100): Promise<StockMovement[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT sm.*, p.name as product_name
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       WHERE sm.shop_id = $1
       ORDER BY sm.created_at DESC
       LIMIT $2`,
      [SHOP_UUID, limit]
    );

    return res.rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      productId: r.product_id,
      productName: r.product_name || 'Fireworks Item',
      movementType: r.movement_type,
      quantity: parseInt(r.quantity, 10) || 0,
      balanceAfter: parseInt(r.balance_after, 10) || 0,
      referenceType: r.reference_type || 'MANUAL_ADJUSTMENT',
      referenceId: r.reference_id,
      remarks: r.remarks || '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  } finally {
    client.release();
  }
}

