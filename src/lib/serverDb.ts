import { Pool } from 'pg';
import { Sale, ExternalOrder, Customer, Product } from '@/types';

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
        $21, $22, $23, $24, $25
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
              igst_amount, total_tax, total_amount
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22
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
              item.totalTax,
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
            sale_id, payment_method, amount, received_amount, change_given,
            reference_number, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
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
export async function getSalesFromSupabase(): Promise<any[]> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.shop_id = $1
       ORDER BY s.created_at DESC`,
      [SHOP_UUID]
    );
    return res.rows;
  } finally {
    client.release();
  }
}
