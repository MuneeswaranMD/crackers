-- ====================================================================
-- Crackers Shop Invoice Billing POS - Master Database Migration
-- PostgreSQL / Supabase Schema with RLS, Triggers, Indexes & Auditing
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SHOPS & CONFIGURATION
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    gstin VARCHAR(15),
    license_number VARCHAR(100), -- PESO / Explosives License No
    license_valid_upto DATE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Sivakasi',
    state VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
    state_code VARCHAR(2) NOT NULL DEFAULT '33', -- Tamil Nadu GST State code
    pincode VARCHAR(10) NOT NULL,
    bank_name VARCHAR(100),
    bank_account_no VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_branch VARCHAR(100),
    upi_id VARCHAR(100),
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'SMF/',
    invoice_footer_note TEXT DEFAULT 'Subject to Sivakasi Jurisdiction. Green Crackers tested as per CSIR-NEERI & PESO guidelines. Keep away from fire and store in dry place.',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    default_billing_mode VARCHAR(20) NOT NULL DEFAULT 'GST', -- 'GST' or 'NON_GST'
    default_discount_percentage NUMERIC(5,2) DEFAULT 0.00,
    enable_seasonal_discount BOOLEAN DEFAULT TRUE,
    seasonal_discount_percentage NUMERIC(5,2) DEFAULT 70.00, -- Tamil Nadu crackers seasonal discount e.g. 70% off MRP
    allow_negative_stock BOOLEAN DEFAULT FALSE,
    enforce_barcode_scan BOOLEAN DEFAULT FALSE,
    thermal_printer_paper_width VARCHAR(10) DEFAULT '80mm', -- '80mm' or '58mm'
    print_duplicate_receipt BOOLEAN DEFAULT FALSE,
    auto_roundoff_to_rupee BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_settings UNIQUE (shop_id)
);

-- 2. USERS, ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'OWNER_ADMIN', 'CASHIER', 'INVENTORY_STAFF'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'CASHIER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PRODUCTS & CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    tamil_name VARCHAR(150), -- e.g. கம்ப மத்தாப்பு, புஸ்வாணம், தரை சக்கரம்
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hsn_code VARCHAR(20) NOT NULL DEFAULT '3604', -- HSN 3604 for Fireworks, signalling flares, rain rockets
    description VARCHAR(255) DEFAULT 'Fireworks and pyrotechnic articles',
    cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 9.00,
    sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 9.00,
    igst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tax_code_id UUID REFERENCES tax_codes(id),
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    tamil_name VARCHAR(255),
    brand VARCHAR(100) DEFAULT 'Standard', -- e.g., Standard, Sony, Vadivel, Coronation, Ayyan
    pack_size VARCHAR(100) NOT NULL DEFAULT '1 Box', -- e.g., 10 Pcs, 1 Box, 5 Pcs
    uom VARCHAR(20) NOT NULL DEFAULT 'BOX', -- BOX, PKT, PCS, CASE
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- Price after standard discount
    discount_allowed BOOLEAN DEFAULT TRUE,
    max_discount_pct NUMERIC(5,2) DEFAULT 80.00,
    current_stock INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 10,
    is_green_cracker BOOLEAN NOT NULL DEFAULT TRUE,
    peso_certified BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_sku UNIQUE (shop_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_search ON products(shop_id, name, barcode, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 4. INVENTORY & STOCK BALANCES
CREATE TABLE IF NOT EXISTS stock_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    damaged_quantity INT NOT NULL DEFAULT 0,
    last_counted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stock_balances_product UNIQUE (shop_id, product_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'OPENING_STOCK', 'SALE_DEDUCTION', 'SALE_RETURN', 'PURCHASE_RECEIPT', 'STOCK_ADJUSTMENT', 'DAMAGE_WRITE_OFF'
    quantity INT NOT NULL, -- positive for in, negative for out
    balance_after INT NOT NULL,
    reference_type VARCHAR(50), -- 'SALE', 'PURCHASE', 'RETURN', 'MANUAL_ADJUSTMENT'
    reference_id UUID,
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id, created_at DESC);

-- 5. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(200),
    gstin VARCHAR(15),
    address_line TEXT,
    city VARCHAR(100) DEFAULT 'Sivakasi',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    state_code VARCHAR(2) DEFAULT '33',
    pincode VARCHAR(10),
    credit_balance NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(shop_id, phone);

-- 6. INVOICE SEQUENCES
CREATE TABLE IF NOT EXISTS invoice_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    financial_year VARCHAR(10) NOT NULL, -- '2026-27'
    series_prefix VARCHAR(20) NOT NULL DEFAULT 'INV/',
    current_number INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_sequences UNIQUE (shop_id, financial_year, series_prefix)
);

-- 7. SALES & BILLING
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id UUID,
    device_id VARCHAR(100) DEFAULT 'POS-1',
    invoice_number VARCHAR(100) NOT NULL,
    financial_year VARCHAR(10) NOT NULL DEFAULT '2026-27',
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'GST_TAX_INVOICE', -- 'GST_TAX_INVOICE', 'RETAIL_BILL', 'BILL_OF_SUPPLY'
    billing_mode VARCHAR(20) NOT NULL DEFAULT 'GST',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    taxable_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PAID', -- 'PAID', 'PARTIALLY_PAID', 'PENDING'
    status VARCHAR(30) NOT NULL DEFAULT 'FINALIZED', -- 'DRAFT', 'FINALIZED', 'CANCELLED', 'RETURNED'
    idempotency_key VARCHAR(150),
    is_synced BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sales_invoice_num UNIQUE (shop_id, invoice_number),
    CONSTRAINT uq_sales_idempotency UNIQUE (shop_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    tamil_name VARCHAR(255),
    sku VARCHAR(100) NOT NULL,
    hsn_code VARCHAR(20) NOT NULL DEFAULT '3604',
    pack_size VARCHAR(100),
    uom VARCHAR(20) NOT NULL DEFAULT 'BOX',
    quantity INT NOT NULL,
    mrp NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_percentage NUMERIC(5,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    taxable_value NUMERIC(12,2) NOT NULL,
    cgst_rate NUMERIC(5,2) DEFAULT 9.00,
    cgst_amount NUMERIC(12,2) DEFAULT 0.00,
    sgst_rate NUMERIC(5,2) DEFAULT 9.00,
    sgst_amount NUMERIC(12,2) DEFAULT 0.00,
    igst_rate NUMERIC(5,2) DEFAULT 0.00,
    igst_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'UPI', 'CARD', 'SPLIT'
    amount NUMERIC(12,2) NOT NULL,
    received_amount NUMERIC(12,2) NOT NULL,
    change_given NUMERIC(12,2) DEFAULT 0.00,
    reference_number VARCHAR(100), -- UPI UTR or card auth code
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RETURNS & CREDIT NOTES
CREATE TABLE IF NOT EXISTS sale_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id),
    credit_note_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    refund_method VARCHAR(50) NOT NULL, -- 'CASH', 'CREDIT_NOTE', 'UPI'
    subtotal_refund NUMERIC(12,2) NOT NULL,
    tax_refund NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_refund NUMERIC(12,2) NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_return_cn_num UNIQUE (shop_id, credit_note_number)
);

CREATE TABLE IF NOT EXISTS sale_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_return_id UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES sale_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_returned INT NOT NULL,
    refund_rate NUMERIC(12,2) NOT NULL,
    refund_amount NUMERIC(12,2) NOT NULL,
    restock_status VARCHAR(50) NOT NULL DEFAULT 'RESTOCKED', -- 'RESTOCKED', 'DAMAGED_SCRAP'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SUPPLIERS & PURCHASES
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(200),
    gstin VARCHAR(15),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Sivakasi',
    state VARCHAR(100) DEFAULT 'Tamil Nadu',
    pincode VARCHAR(10),
    outstanding_payable NUMERIC(12,2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_invoice_no VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    received_date DATE DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'POSTED', -- 'DRAFT', 'POSTED', 'CANCELLED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 18.00,
    total_cost NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. EXPENSES & CASH SESSIONS
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'RENT', 'ELECTRICITY', 'TRANSPORT_LOAD', 'LABOR_DAILY_WAGE', 'PACKAGING', 'TEA_SNACKS', 'POLICE_FIRE_PERMIT'
    amount NUMERIC(12,2) NOT NULL,
    paid_to VARCHAR(150),
    payment_mode VARCHAR(50) DEFAULT 'CASH',
    remarks TEXT,
    created_by UUID,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    cashier_id UUID,
    opening_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closing_time TIMESTAMPTZ,
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(12,2) DEFAULT 0.00,
    closing_cash NUMERIC(12,2) DEFAULT 0.00,
    difference NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    notes TEXT
);

-- 11. AUDIT LOGS & SYNC OPERATIONS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'SALE_SYNC', 'STOCK_SYNC', 'CUSTOMER_SYNC'
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED', 'CONFLICT'
    error_message TEXT,
    idempotency_key VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current user's shop ID
CREATE OR REPLACE FUNCTION get_current_shop_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT shop_id FROM profiles
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master Shop Access Policies (Authenticated user accesses only their shop)
CREATE POLICY shop_isolation_products ON products
    FOR ALL USING (shop_id = get_current_shop_id());

CREATE POLICY shop_isolation_sales ON sales
    FOR ALL USING (shop_id = get_current_shop_id());

CREATE POLICY shop_isolation_customers ON customers
    FOR ALL USING (shop_id = get_current_shop_id());

CREATE POLICY shop_isolation_suppliers ON suppliers
    FOR ALL USING (shop_id = get_current_shop_id());

CREATE POLICY shop_isolation_purchases ON purchases
    FOR ALL USING (shop_id = get_current_shop_id());

CREATE POLICY shop_isolation_expenses ON expenses
    FOR ALL USING (shop_id = get_current_shop_id());

-- TRANSACTIONAL SALE FINALIZATION DATABASE FUNCTION
CREATE OR REPLACE FUNCTION finalize_pos_sale(
    p_shop_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_invoice_number VARCHAR,
    p_billing_mode VARCHAR,
    p_subtotal NUMERIC,
    p_discount_amount NUMERIC,
    p_taxable_value NUMERIC,
    p_cgst_amount NUMERIC,
    p_sgst_amount NUMERIC,
    p_igst_amount NUMERIC,
    p_round_off NUMERIC,
    p_grand_total NUMERIC,
    p_payment_method VARCHAR,
    p_paid_amount NUMERIC,
    p_items JSONB,
    p_idempotency_key VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_prod_id UUID;
    v_qty INT;
    v_current_stock INT;
BEGIN
    -- Check idempotency
    IF EXISTS (SELECT 1 FROM sales WHERE shop_id = p_shop_id AND idempotency_key = p_idempotency_key) THEN
        SELECT id INTO v_sale_id FROM sales WHERE shop_id = p_shop_id AND idempotency_key = p_idempotency_key;
        RETURN v_sale_id;
    END IF;

    -- Create sale record
    INSERT INTO sales (
        shop_id, cashier_id, customer_id, invoice_number, billing_mode,
        subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount,
        igst_amount, total_tax, round_off, grand_total, paid_amount,
        balance_amount, payment_status, status, idempotency_key
    ) VALUES (
        p_shop_id, p_cashier_id, p_customer_id, p_invoice_number, p_billing_mode,
        p_subtotal, p_discount_amount, p_taxable_value, p_cgst_amount, p_sgst_amount,
        p_igst_amount, (p_cgst_amount + p_sgst_amount + p_igst_amount), p_round_off,
        p_grand_total, p_paid_amount, (p_grand_total - p_paid_amount),
        CASE WHEN p_paid_amount >= p_grand_total THEN 'PAID' ELSE 'PARTIALLY_PAID' END,
        'FINALIZED', p_idempotency_key
    ) RETURNING id INTO v_sale_id;

    -- Record Payment
    INSERT INTO payments (
        shop_id, sale_id, payment_method, amount, received_amount, change_given
    ) VALUES (
        p_shop_id, v_sale_id, p_payment_method, p_grand_total, p_paid_amount,
        GREATEST(0.00, p_paid_amount - p_grand_total)
    );

    -- Loop through items and deduct stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        -- Insert sale item
        INSERT INTO sale_items (
            sale_id, product_id, product_name, tamil_name, sku,
            hsn_code, pack_size, uom, quantity, mrp, unit_price,
            discount_percentage, discount_amount, taxable_value,
            cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_amount
        ) VALUES (
            v_sale_id, v_prod_id, v_item->>'product_name', v_item->>'tamil_name', v_item->>'sku',
            COALESCE(v_item->>'hsn_code', '3604'), v_item->>'pack_size', COALESCE(v_item->>'uom', 'BOX'),
            v_qty, (v_item->>'mrp')::NUMERIC, (v_item->>'unit_price')::NUMERIC,
            COALESCE((v_item->>'discount_percentage')::NUMERIC, 0.00), COALESCE((v_item->>'discount_amount')::NUMERIC, 0.00),
            (v_item->>'taxable_value')::NUMERIC,
            COALESCE((v_item->>'cgst_rate')::NUMERIC, 9.00), COALESCE((v_item->>'cgst_amount')::NUMERIC, 0.00),
            COALESCE((v_item->>'sgst_rate')::NUMERIC, 9.00), COALESCE((v_item->>'sgst_amount')::NUMERIC, 0.00),
            COALESCE((v_item->>'igst_rate')::NUMERIC, 0.00), COALESCE((v_item->>'igst_amount')::NUMERIC, 0.00),
            (v_item->>'total_amount')::NUMERIC
        );

        -- Update product stock
        UPDATE products 
        SET current_stock = current_stock - v_qty, updated_at = NOW() 
        WHERE id = v_prod_id 
        RETURNING current_stock INTO v_current_stock;

        -- Record stock movement ledger
        INSERT INTO stock_movements (
            shop_id, product_id, movement_type, quantity, balance_after,
            reference_type, reference_id, remarks
        ) VALUES (
            p_shop_id, v_prod_id, 'SALE_DEDUCTION', -v_qty, v_current_stock,
            'SALE', v_sale_id, 'Invoice: ' || p_invoice_number
        );
    END LOOP;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
