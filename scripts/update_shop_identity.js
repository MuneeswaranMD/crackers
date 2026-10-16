const { Client } = require('pg');

const connectionString = "postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function updateShop() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('Updating business identity in Supabase shops table to Sree Kalieswari Traders...');
    const res = await client.query(`
      UPDATE shops
      SET 
        name = 'Sree Kalieswari Traders',
        trade_name = 'Sree Kalieswari Traders',
        email = 'sales@sreekalieswaritraders.com',
        upi_id = 'kalieswaritraders@sbi',
        invoice_prefix = 'SKT/2026-27/'
      WHERE id = '11111111-1111-1111-1111-111111111111'
      RETURNING id, name, trade_name, email, upi_id, invoice_prefix;
    `);

    console.log('Updated shop record:', res.rows[0]);
  } catch (err) {
    console.error('Error updating shop in Supabase:', err);
  } finally {
    await client.end();
  }
}

updateShop();
