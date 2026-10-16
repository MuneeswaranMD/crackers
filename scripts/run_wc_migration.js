const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function runMigration() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('Reading migration file 20261017000002_woocommerce_integration.sql...');
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261017000002_woocommerce_integration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration on Supabase PostgreSQL...');
    await client.query(sql);
    console.log('WooCommerce integration migration executed successfully!');

    // Verify tables exist
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('integrations', 'external_orders', 'external_order_items', 'external_product_mappings', 'webhook_events', 'integration_sync_logs', 'order_invoice_links');
    `);
    console.log('Verified WooCommerce tables in public schema:', res.rows.map(r => r.table_name));

    // Seed default integration record for Sree Kalieswari Traders
    await client.query(`
      INSERT INTO integrations (
        id, shop_id, type, name, store_url, sync_status, health_status, settings
      ) VALUES (
        '33333333-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        'WOOCOMMERCE',
        'Sree Kalieswari Online Store',
        'https://crackers.sreekalieswaritraders.com',
        'IDLE',
        'HEALTHY',
        '{"auto_invoice": false, "auto_deduct_stock": true, "default_order_status": "processing"}'::jsonb
      ) ON CONFLICT (shop_id, type) DO NOTHING;
    `);
    console.log('Default integration record seeded.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
