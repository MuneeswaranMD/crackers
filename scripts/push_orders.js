const { Client } = require('pg');

const connectionString = "postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function syncInitial() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database...');

  const shopId = '11111111-1111-1111-1111-111111111111';
  const integrationId = '33333333-1111-1111-1111-111111111111';

  // 1. Insert Initial WooCommerce External Orders
  const orders = [
    {
      extId: '8402',
      num: '8402',
      status: 'processing',
      total: 630.0,
      subtotal: 630.0,
      tax: 96.1,
      cust: 'Sundaramurthy P',
      email: 'sundar.tn@gmail.com',
      phone: '+91 98401 55678',
      billing: { address1: 'Plot 4, Anna Nagar 2nd Avenue', city: 'Chennai', state: 'Tamil Nadu' },
      items: [
        { externalItemId: '101', externalProductId: '901', sku: 'SPK-10-ELE', name: '10cm Electric Sparklers', quantity: 5, unitPrice: 54.0, subtotal: 270.0, total: 270.0 },
        { externalItemId: '102', externalProductId: '904', sku: 'FLP-ASH-BIG', name: 'Flower Pots Ashoka Big', quantity: 3, unitPrice: 120.0, subtotal: 360.0, total: 360.0 }
      ]
    },
    {
      extId: '8405',
      num: '8405',
      status: 'processing',
      total: 570.0,
      subtotal: 570.0,
      tax: 86.95,
      cust: 'Kavitha Rajan',
      email: 'kavitha.cbe@yahoo.com',
      phone: '+91 94432 88990',
      billing: { address1: '12, RS Puram West', city: 'Coimbatore', state: 'Tamil Nadu' },
      items: [
        { externalItemId: '201', externalProductId: '908', sku: 'BMB-HYD-GRN', name: 'Hydro Bomb Green Sound Blast', quantity: 5, unitPrice: 96.0, subtotal: 480.0, total: 480.0 }
      ]
    }
  ];

  for (const o of orders) {
    const res = await client.query(`
      INSERT INTO external_orders (
        integration_id, shop_id, external_order_id, order_number,
        status, currency, total_amount, subtotal_amount, tax_amount,
        customer_name, customer_email, customer_phone, billing_address,
        shipping_address, is_paid, external_created_at, external_updated_at, sync_status
      ) VALUES (
        $1, $2, $3, $4, $5, 'INR', $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW(), 'IMPORTED'
      ) ON CONFLICT (integration_id, external_order_id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id;
    `, [
      integrationId, shopId, o.extId, o.num, o.status, o.total, o.subtotal, o.tax,
      o.cust, o.email, o.phone, JSON.stringify(o.billing), JSON.stringify(o.billing)
    ]);

    const orderDbId = res.rows[0].id;

    for (const item of o.items) {
      await client.query(`
        INSERT INTO external_order_items (
          external_order_id, external_item_id, external_product_id,
          sku, name, quantity, unit_price, subtotal, tax_amount, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9)
        ON CONFLICT (external_order_id, external_item_id) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          total = EXCLUDED.total;
      `, [
        orderDbId, item.externalItemId, item.externalProductId,
        item.sku, item.name, item.quantity, item.unitPrice, item.subtotal, item.total
      ]);
    }
  }

  // 2. Insert sample POS Sale into Supabase sales table
  const saleRes = await client.query(`
    INSERT INTO sales (
      shop_id, invoice_number, financial_year, invoice_type, billing_mode,
      subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount,
      igst_amount, total_tax, round_off, grand_total, paid_amount,
      balance_amount, payment_status, status, idempotency_key, is_synced,
      notes, created_at
    ) VALUES (
      $1, 'SKT/2026-27/1001', '2026-27', 'GST_TAX_INVOICE', 'GST',
      2250.00, 1800.00, 381.36, 34.32, 34.32, 0.00, 68.64, 0.00, 450.00, 450.00,
      0.00, 'PAID', 'FINALIZED', 'idemp-init-1001', true,
      'Opening POS Counter Sale - Sree Kalieswari Traders', NOW()
    ) ON CONFLICT (shop_id, invoice_number) DO UPDATE SET
      paid_amount = EXCLUDED.paid_amount,
      updated_at = NOW()
    RETURNING id;
  `, [shopId]);

  console.log('Sample sale recorded in Supabase sales table with ID:', saleRes.rows[0].id);

  // Check counts
  const extCount = await client.query('SELECT COUNT(*) FROM external_orders;');
  const salesCount = await client.query('SELECT COUNT(*) FROM sales;');
  console.log('Total external_orders in Supabase now:', extCount.rows[0].count);
  console.log('Total sales in Supabase now:', salesCount.rows[0].count);

  await client.end();
}

syncInitial().catch(e => {
  console.error('Error syncing:', e);
  process.exit(1);
});
