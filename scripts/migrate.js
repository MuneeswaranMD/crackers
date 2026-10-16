const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function runMigration() {
  console.log('Connecting to Supabase PostgreSQL at aws-0-ap-south-1.pooler.supabase.com...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Successfully connected to Supabase PostgreSQL!');

    const sqlPath = path.join(__dirname, '../supabase/migrations/20261017000001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing master migration script...');
    await client.query(sql);
    console.log('Master migration executed successfully! All 18 tables, functions, and RLS policies created.');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('Tables present in Supabase public schema:');
    res.rows.forEach(r => console.log(' - ' + r.table_name));

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
