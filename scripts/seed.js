const { Client } = require('pg');

const connectionString = "postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

async function seed() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('Altering invoice_prefix column size...');
    await client.query(`ALTER TABLE shops ALTER COLUMN invoice_prefix TYPE VARCHAR(50);`);

    console.log('Seeding Supabase database with Sivakasi Fireworks catalog...');

    // 1. Seed Shop
    await client.query(`
      INSERT INTO shops (
        id, name, trade_name, gstin, license_number, phone, email,
        address_line1, city, state, state_code, pincode, bank_name,
        bank_account_no, bank_ifsc, bank_branch, upi_id, invoice_prefix
      ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        'Sree Kalieswari Traders',
        'Sree Kalieswari Traders',
        '33AABCS1429B1Z8',
        'PESO/E/TN/2024/09842',
        '+91 94431 23456',
        'sales@sreekalieswaritraders.com',
        'No. 42, Bypass Road, Near Bus Stand',
        'Sivakasi',
        'Tamil Nadu',
        '33',
        '626123',
        'State Bank of India',
        '30492817492',
        'SBIN0000921',
        'Sivakasi Main Branch',
        'kalieswaritraders@sbi',
        'SKT/2026-27/'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Seed Categories
    const categories = [
      ['22222222-1111-1111-1111-111111111101', 'Sparklers (கம்ப மத்தாப்பு)', 'கம்ப மத்தாப்பு', 1],
      ['22222222-1111-1111-1111-111111111102', 'Flower Pots (புஸ்வாணம்)', 'புஸ்வாணம்', 2],
      ['22222222-1111-1111-1111-111111111103', 'Ground Chakkars (தரை சக்கரம்)', 'தரை சக்கரம்', 3],
      ['22222222-1111-1111-1111-111111111104', 'Sound Crackers & Bombs (வெடி & பாம்)', 'வெடி & பாம்', 4],
      ['22222222-1111-1111-1111-111111111105', 'Aerial Skyshots (மல்டி ஷாட்)', 'மல்டி ஷாட்', 5],
      ['22222222-1111-1111-1111-111111111106', 'Repeating Garlands (சரவெடி / வாலா)', 'சரவெடி / வாலா', 6],
      ['22222222-1111-1111-1111-111111111107', 'Gift Boxes & Assorted Packs', 'கிப்ட் பாக்ஸ்', 7],
    ];

    for (const [catId, name, tamilName, order] of categories) {
      await client.query(`
        INSERT INTO categories (id, shop_id, name, tamil_name, display_order)
        VALUES ($1, '11111111-1111-1111-1111-111111111111', $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `, [catId, name, tamilName, order]);
    }

    // 3. Seed Products
    const products = [
      ['SPK-10-ELE', '8901001001', '10cm Electric Sparklers', '10 செ.மீ எலக்ட்ரிக் மத்தாப்பு', '22222222-1111-1111-1111-111111111101', 'Standard Fireworks', '1 Box (10 Pcs)', 'BOX', 22, 120, 36, 450],
      ['SPK-15-GRN', '8901001002', '15cm Green Sparklers', '15 செ.மீ பச்சை மத்தாப்பு', '22222222-1111-1111-1111-111111111101', 'Standard Fireworks', '1 Box (10 Pcs)', 'BOX', 38, 190, 57, 320],
      ['FLP-ASH-BIG', '8901002001', 'Flower Pots Ashoka Big', 'அசோகா புஸ்வாணம் பெரியது', '22222222-1111-1111-1111-111111111102', 'Standard Fireworks', '1 Box (10 Pcs)', 'BOX', 75, 380, 114, 240],
      ['CHK-BIG-10', '8901003001', 'Ground Chakkar Big', 'தரை சக்கரம் பெரியது', '22222222-1111-1111-1111-111111111103', 'Standard Fireworks', '1 Box (10 Pcs)', 'BOX', 48, 240, 72, 390],
      ['BMB-HYD-GRN', '8901004001', 'Hydro Bomb Green Sound Blast', 'ஹைட்ரோ பாம் பச்சை சத்த வெடி', '22222222-1111-1111-1111-111111111104', 'Standard Fireworks', '1 Box (10 Pcs)', 'BOX', 65, 320, 96, 190],
      ['GAR-28-CHR', '8901007001', '28 Chorsa Crackers', '28 சோர்சா சரவெடி', '22222222-1111-1111-1111-111111111106', 'Standard Fireworks', '1 Box (10 Pcs)', 'BOX', 32, 160, 48, 420],
      ['GAR-1000-WALA', '8901007002', '1000 Wala Festive Garland', '1000 வாலா பண்டிகை சரவெடி', '22222222-1111-1111-1111-111111111106', 'Standard Fireworks', '1 Roll', 'ROLL', 180, 850, 255, 75],
      ['SHT-12-RIDER', '8901006001', '12 Shots Sky Rider Aerial Cake', '12 ஷாட்ஸ் ஸ்கை ரைடர் வான வேடிக்கை', '22222222-1111-1111-1111-111111111105', 'Sony Fireworks', '1 Cake', 'PCS', 160, 750, 225, 65],
      ['SHT-30-COLOR', '8901006002', '30 Shots Multi-Colour Celebration Cake', '30 ஷாட்ஸ் கலர் செலிபிரேஷன் கேக்', '22222222-1111-1111-1111-111111111105', 'Coronation Pyrotech', '1 Cake', 'PCS', 380, 1800, 540, 40],
      ['GFT-ROYAL-32', '8901008001', 'Sivakasi Royal Family Pack (32 Items)', 'சிவகாசி ராயல் குடும்ப கிப்ட் பாக்ஸ்', '22222222-1111-1111-1111-111111111107', 'Standard Fireworks', '1 Large Box', 'BOX', 650, 3200, 960, 35],
    ];

    for (const [sku, barcode, name, tamil, catId, brand, pack, uom, cost, mrp, sp, stock] of products) {
      await client.query(`
        INSERT INTO products (
          shop_id, sku, barcode, name, tamil_name, category_id,
          brand, pack_size, uom, purchase_price, mrp, selling_price,
          current_stock, min_stock_alert, is_green_cracker, peso_certified
        ) VALUES (
          '11111111-1111-1111-1111-111111111111', $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12, 20, true, true
        ) ON CONFLICT (shop_id, sku) DO NOTHING;
      `, [sku, barcode, name, tamil, catId, brand, pack, uom, cost, mrp, sp, stock]);
    }

    // 4. Seed Suppliers
    await client.query(`
      INSERT INTO suppliers (
        shop_id, company_name, contact_person, phone, gstin, city, outstanding_payable
      ) VALUES (
        '11111111-1111-1111-1111-111111111111',
        'Standard Fireworks Pvt Ltd',
        'K. Rajasekaran',
        '04562-220144',
        '33AAACS1234A1Z1',
        'Sivakasi',
        18500
      ) ON CONFLICT DO NOTHING;
    `);

    console.log('Seeding finished successfully! Products, categories, and suppliers are live in Supabase PostgreSQL.');
  } catch (err) {
    console.error('Seeding error:', err.message);
  } finally {
    await client.end();
  }
}

seed();
