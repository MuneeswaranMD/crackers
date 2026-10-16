const { Client } = require('pg');

const connectionString = 'postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function updateImages() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  await client.query("UPDATE products SET image_url = '/images/products/flowerpots.jpg' WHERE sku LIKE 'FLP%' OR sku LIKE 'FP%'");
  await client.query("UPDATE products SET image_url = '/images/products/chakkars.jpg' WHERE sku LIKE 'CHK%' OR sku LIKE 'GC%'");
  await client.query("UPDATE products SET image_url = '/images/products/bombs.jpg' WHERE sku LIKE 'BMB%' OR sku LIKE 'GAR%'");
  await client.query("UPDATE products SET image_url = '/images/products/skyshots.jpg' WHERE sku LIKE 'SHT%' OR sku LIKE 'RCK%'");
  await client.query("UPDATE products SET image_url = '/images/products/giftbox.jpg' WHERE sku LIKE 'GFT%'");
  await client.query("UPDATE products SET image_url = '/images/products/sparklers.jpg' WHERE sku LIKE 'SPK%'");

  console.log('Product images updated in Supabase successfully!');
  await client.end();
}

updateImages().catch(console.error);
