const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function check() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');
    const res = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_aliases')");
    console.log('product_aliases table exists:', res.rows[0].exists);

    if (!res.rows[0].exists) {
      console.log('Applying product_aliases migration...');
      const sqlPath = path.join(__dirname, '../supabase/migrations/20261019000001_product_aliases.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('product_aliases migration applied successfully!');
    }

    const countRes = await client.query('SELECT count(*) FROM product_aliases');
    console.log('Total aliases in DB:', countRes.rows[0].count);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

check();
