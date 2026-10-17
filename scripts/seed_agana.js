const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SHOP_UUID = '11111111-1111-1111-1111-111111111111';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.gdgalsaqqajbgufypxib:Dhivya272904@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const TAMIL_CATEGORY_NAMES = {
  'One Sound Crackers': 'ஒற்றை வெடி',
  'Chorsa & Giant Crackers': 'ஜயன்ட் வெடி',
  'Deluxe Crackers': 'டீலக்ஸ் வெடி',
  'Bijili Crackers': 'பிஜிலி வெடி',
  'Classic Garlands Crackers': 'கிளாசிக் சரவெடி',
  'Premium Garlands Crackers': 'பிரீமியம் சரவெடி',
  'Mega Sound Bomb': 'மெகா சவுண்ட் பாம்',
  'Paper Bomb': 'பேப்பர் பாம்',
  'Rocket': 'வான வெடி / ராக்கெட்',
  'Twinkling Star': 'சாட்டை / ஸ்டார்',
  'Flower Pot': 'புஸ்வாணம்',
  'Ground Chakkar': 'தரை சக்கரம்',
  'Peacock Fountain': 'பீகாக் பவுண்டன்',
  'Amazing Night Series Fountain': 'நைட் சீரிஸ் பவுண்டன்',
  'Two Pcs Special Fountain': '2 பீஸ் ஸ்பெஷல் பவுண்டன்',
  'Kids Special Collections': 'குழந்தைகள் ஸ்பெஷல்',
  'Pencil Crackers': 'பென்சில் வெடி',
  '2026 New Arrivals': '2026 புதிய வரவுகள்',
  'Colourful Fancy Single Shots': 'சிங்கிள் ஷாட்ஸ்',
  'Colourful Fancy Multicolour Shots': 'மல்டி கலர் ஷாட்ஸ்',
  'Celebration Fancy Platinum Shot': 'பிளாட்டினம் ஷாட்',
  'Premium Match Box': 'தீப்பெட்டி வகைகள்',
  'Sparklers': 'கம்ப மத்தாப்பு',
  'Gift Boxes (Net Rate)': 'கிப்ட் பாக்ஸ்',
};

function getCategoryImageUrl(cat) {
  const c = cat.toLowerCase();
  if (c.includes('sparkler')) return '/images/products/sparklers.jpg';
  if (c.includes('flower') || c.includes('pot')) return '/images/products/flowerpots.jpg';
  if (c.includes('chakkar')) return '/images/products/chakkars.jpg';
  if (c.includes('bomb') || c.includes('sound') || c.includes('garland') || c.includes('chorsa') || c.includes('bijili') || c.includes('deluxe')) return '/images/products/bombs.jpg';
  if (c.includes('rocket') || c.includes('shot') || c.includes('fancy') || c.includes('fountain') || c.includes('arrivals')) return '/images/products/skyshots.jpg';
  if (c.includes('gift')) return '/images/products/giftbox.jpg';
  return '/images/products/sparklers.jpg';
}

// Deterministic UUID generator for stable IDs (valid hex 0-9a-f)
function generateUUID(prefixHex, id) {
  const hex = id.toString(16).padStart(12, '0');
  return `22222222-${prefixHex.padStart(4, '0')}-0000-0000-${hex}`;
}

async function run() {
  const jsonPath = path.join(__dirname, '..', 'data', 'agana_catalog_2026.json');
  const catalogData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Upserting Business Profile for AGANA FIREWORKS...');
    await client.query(`
      ALTER TABLE shops ALTER COLUMN phone TYPE VARCHAR(100);
      ALTER TABLE shops ALTER COLUMN invoice_prefix TYPE VARCHAR(50);
    `);
    await client.query(`
      INSERT INTO shops (
        id, name, trade_name, gstin, license_number, license_valid_upto,
        phone, email, address_line1, address_line2, city, state, state_code,
        pincode, bank_name, bank_account_no, bank_ifsc, bank_branch,
        upi_id, invoice_prefix, invoice_footer_note, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, true
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        trade_name = EXCLUDED.trade_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address_line1 = EXCLUDED.address_line1,
        address_line2 = EXCLUDED.address_line2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        invoice_prefix = EXCLUDED.invoice_prefix,
        invoice_footer_note = EXCLUDED.invoice_footer_note,
        updated_at = NOW()
    `, [
      SHOP_UUID,
      'AGANA FIREWORKS',
      'SRI KALIESWARI TRADERS',
      '33AABCS1429B1Z8',
      'PESO/E/TN/2026/09842',
      '2029-03-31',
      '98437 49750, 63827 71327',
      'sales@aganafireworks.com',
      'Thayilpatti (Via)',
      'Proprietors: P. Arjun & P. Deepak',
      'Sivakasi',
      'Tamil Nadu',
      '33',
      '626128',
      'State Bank of India',
      '30492817492',
      'SBIN0000921',
      'Sivakasi Main Branch',
      '9843749750',
      'AF/2026-27/',
      '1. Green Crackers certified by CSIR-NEERI & PESO regulations.\n2. Minimum Order Value: Rs.3000/- | Packing charge @ 3% extra.\n3. F.O.R Lorry freight extra, paid by customer at transport office.\n4. Subject to Sivakasi Jurisdiction.'
    ]);

    console.log('2. Upserting 24 Agana Fireworks Categories...');
    const rawCategories = [...new Set(catalogData.products.map(p => p.category))];
    const categoryMap = new Map();

    for (let idx = 0; idx < rawCategories.length; idx++) {
      const catName = rawCategories[idx];
      const catId = generateUUID('ca01', idx + 1);
      const tamilName = TAMIL_CATEGORY_NAMES[catName] || catName;

      await client.query(`
        INSERT INTO categories (id, shop_id, name, tamil_name, display_order, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          tamil_name = EXCLUDED.tamil_name,
          display_order = EXCLUDED.display_order
      `, [catId, SHOP_UUID, catName, tamilName, idx + 1]);

      categoryMap.set(catName, { id: catId, name: catName, tamilName });
    }

    console.log('3. Deactivating any old dummy products and upserting 206 Agana Fireworks Products...');
    await client.query(`UPDATE products SET is_active = false WHERE shop_id = $1 AND sku NOT LIKE 'AF-%'`, [SHOP_UUID]);
    const allProductsForExport = [];

    for (const p of catalogData.products) {
      const catObj = categoryMap.get(p.category);
      const prodUuid = generateUUID('ba01', p.id);
      const sku = `AF-${String(p.id).padStart(3, '0')}`;
      const barcode = String(p.id);
      const discountAllowed = p.discountPercent > 0;
      const imageUrl = getCategoryImageUrl(p.category);
      const purchasePrice = Math.round(p.price * 0.70); // 30% margin on net
      const brand = p.name.toLowerCase().includes('ayyan') ? 'Ayyan Fireworks' : 'Agana Fireworks';

      await client.query(`
        INSERT INTO products (
          id, shop_id, category_id, sku, barcode, name,
          brand, pack_size, uom, purchase_price, mrp,
          selling_price, discount_allowed, max_discount_pct,
          current_stock, min_stock_alert, is_green_cracker,
          peso_certified, is_active, image_url, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, true,
          true, true, $17, NOW()
        ) ON CONFLICT (shop_id, sku) DO UPDATE SET
          id = EXCLUDED.id,
          category_id = EXCLUDED.category_id,
          barcode = EXCLUDED.barcode,
          name = EXCLUDED.name,
          brand = EXCLUDED.brand,
          pack_size = EXCLUDED.pack_size,
          uom = EXCLUDED.uom,
          purchase_price = EXCLUDED.purchase_price,
          mrp = EXCLUDED.mrp,
          selling_price = EXCLUDED.selling_price,
          discount_allowed = EXCLUDED.discount_allowed,
          max_discount_pct = EXCLUDED.max_discount_pct,
          current_stock = EXCLUDED.current_stock,
          image_url = EXCLUDED.image_url,
          updated_at = NOW()
      `, [
        prodUuid,
        SHOP_UUID,
        catObj ? catObj.id : null,
        sku,
        barcode,
        p.name,
        brand,
        `1 ${p.unit}`,
        p.unit,
        purchasePrice,
        p.mrp,
        p.price,
        discountAllowed,
        p.discountPercent || 80,
        100, // opening stock
        10,  // min alert
        imageUrl
      ]);

      // 4. Upsert stock_balances
      await client.query(`
        INSERT INTO stock_balances (shop_id, product_id, quantity, last_counted_at, updated_at)
        VALUES ($1, $2, 100, NOW(), NOW())
        ON CONFLICT (shop_id, product_id) DO UPDATE SET
          quantity = 100,
          updated_at = NOW()
      `, [SHOP_UUID, prodUuid]);

      allProductsForExport.push({
        id: prodUuid,
        shopId: SHOP_UUID,
        categoryId: catObj ? catObj.id : '',
        categoryName: p.category,
        sku,
        barcode,
        name: p.name,
        brand,
        packSize: `1 ${p.unit}`,
        uom: p.unit,
        purchasePrice,
        mrp: p.mrp,
        sellingPrice: p.price,
        discountAllowed,
        maxDiscountPct: p.discountPercent || 80,
        currentStock: 100,
        minStockAlert: 10,
        isGreenCracker: true,
        pesoCertified: true,
        isActive: true,
        imageUrl,
      });
    }

    await client.query('COMMIT');
    console.log('Successfully seeded database with 206 products and 24 categories in PostgreSQL!');

    // 5. Generate TypeScript file for client side db.ts
    const exportCategories = Array.from(categoryMap.values()).map((c, i) => ({
      id: c.id,
      shopId: SHOP_UUID,
      name: c.name,
      tamilName: c.tamilName,
      displayOrder: i + 1,
      isActive: true,
    }));

    const fileContent = `// Auto-generated Agana Fireworks 2026 Catalog Data
import { Shop, Category, Product } from '@/types';

export const AGANA_SHOP: Shop = {
  id: '${SHOP_UUID}',
  name: 'AGANA FIREWORKS',
  tradeName: 'SRI KALIESWARI TRADERS',
  gstin: '33AABCS1429B1Z8',
  licenseNumber: 'PESO/E/TN/2026/09842',
  licenseValidUpto: '2029-03-31',
  phone: '98437 49750, 63827 71327',
  email: 'sales@aganafireworks.com',
  addressLine1: 'Thayilpatti (Via)',
  addressLine2: 'Proprietors: P. Arjun & P. Deepak',
  city: 'Sivakasi',
  state: 'Tamil Nadu',
  stateCode: '33',
  pincode: '626128',
  bankName: 'State Bank of India',
  bankAccountNo: '30492817492',
  bankIfsc: 'SBIN0000921',
  bankBranch: 'Sivakasi Main Branch',
  upiId: '9843749750',
  invoicePrefix: 'AF/2026-27/',
  invoiceFooterNote:
    '1. Green Crackers certified by CSIR-NEERI & PESO regulations.\\n2. Minimum Order Value: Rs.3000/- | Packing charge @ 3% extra.\\n3. F.O.R Lorry freight extra, paid by customer at transport office.\\n4. Subject to Sivakasi Jurisdiction.',
  isActive: true,
};

export const AGANA_CATEGORIES: Category[] = ${JSON.stringify(exportCategories, null, 2)};

export const AGANA_PRODUCTS: Product[] = ${JSON.stringify(allProductsForExport, null, 2)};
`;

    fs.writeFileSync(
      path.join(__dirname, '..', 'src', 'lib', 'aganaCatalog.ts'),
      fileContent,
      'utf8'
    );
    console.log('Successfully wrote src/lib/aganaCatalog.ts with 206 products!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
