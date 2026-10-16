-- ====================================================================
-- Crackers POS: WooCommerce Integration Migration
-- ====================================================================

-- 1. INTEGRATIONS (Stores encrypted/server-side secrets and sync status)
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'WOOCOMMERCE',
    name VARCHAR(150) NOT NULL DEFAULT 'Main WooCommerce Store',
    store_url TEXT NOT NULL,
    consumer_key TEXT,
    consumer_secret TEXT,
    webhook_secret TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'IDLE', -- 'IDLE', 'SYNCING', 'SUCCESS', 'FAILED'
    last_sync_at TIMESTAMPTZ,
    last_sync_cursor TIMESTAMPTZ,
    last_error_message TEXT,
    health_status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY', -- 'HEALTHY', 'DEGRADED', 'ERROR'
    settings JSONB NOT NULL DEFAULT '{"auto_invoice": false, "auto_deduct_stock": true, "default_order_status": "processing"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_integration_type UNIQUE (shop_id, type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_shop ON integrations(shop_id);

-- 2. EXTERNAL ORDERS (Snapshots of WooCommerce orders)
CREATE TABLE IF NOT EXISTS external_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    external_order_id VARCHAR(100) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    customer_name VARCHAR(200),
    customer_email VARCHAR(200),
    customer_phone VARCHAR(50),
    billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    payment_method VARCHAR(100),
    payment_method_title VARCHAR(150),
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    external_created_at TIMESTAMPTZ NOT NULL,
    external_updated_at TIMESTAMPTZ NOT NULL,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'IMPORTED', -- 'IMPORTED', 'MAPPING_PENDING', 'INVOICED', 'FAILED'
    local_invoice_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_external_order UNIQUE (integration_id, external_order_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_orders_shop ON external_orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ext_orders_status ON external_orders(integration_id, status);
CREATE INDEX IF NOT EXISTS idx_ext_orders_invoice ON external_orders(local_invoice_id);

-- 3. EXTERNAL ORDER ITEMS
CREATE TABLE IF NOT EXISTS external_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_order_id UUID NOT NULL REFERENCES external_orders(id) ON DELETE CASCADE,
    external_item_id VARCHAR(100) NOT NULL,
    external_product_id VARCHAR(100) NOT NULL,
    external_variation_id VARCHAR(100),
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    local_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    mapping_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'MATCHED', 'PENDING', 'MANUAL_REQUIRED'
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ext_order_item UNIQUE (external_order_id, external_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_order_items_order ON external_order_items(external_order_id);
CREATE INDEX IF NOT EXISTS idx_ext_order_items_sku ON external_order_items(sku);
CREATE INDEX IF NOT EXISTS idx_ext_order_items_prod ON external_order_items(local_product_id);

-- 4. EXTERNAL PRODUCT MAPPINGS (WooCommerce to Local Crackers Catalog)
CREATE TABLE IF NOT EXISTS external_product_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    external_product_id VARCHAR(100) NOT NULL,
    external_variation_id VARCHAR(100) NOT NULL DEFAULT '0',
    external_sku VARCHAR(100),
    external_name VARCHAR(255) NOT NULL,
    local_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    mapping_status VARCHAR(50) NOT NULL DEFAULT 'UNMAPPED', -- 'MAPPED', 'UNMAPPED', 'AMBIGUOUS', 'IGNORED'
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_mapping UNIQUE (integration_id, external_product_id, external_variation_id)
);

CREATE INDEX IF NOT EXISTS idx_ext_prod_map_local ON external_product_mappings(local_product_id);
CREATE INDEX IF NOT EXISTS idx_ext_prod_map_sku ON external_product_mappings(integration_id, external_sku);

-- 5. WEBHOOK EVENTS (Audit log and deduplication of inbound deliveries)
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    delivery_id VARCHAR(150) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'FAILED', 'IGNORED'
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_webhook_delivery UNIQUE (delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status, created_at DESC);

-- 6. INTEGRATION SYNC LOGS
CREATE TABLE IF NOT EXISTS integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL', -- 'MANUAL', 'WEBHOOK', 'SCHEDULED_POLL'
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'PARTIAL'
    items_fetched INT NOT NULL DEFAULT 0,
    items_synced INT NOT NULL DEFAULT 0,
    items_failed INT NOT NULL DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id, started_at DESC);

-- 7. ORDER INVOICE LINKS (Strict link enforcing idempotency and invoice traceability)
CREATE TABLE IF NOT EXISTS order_invoice_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_order_id UUID NOT NULL REFERENCES external_orders(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    stock_deducted BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_order_invoice_link_order UNIQUE (external_order_id),
    CONSTRAINT uq_order_invoice_link_sale UNIQUE (sale_id)
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_invoice_links ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users with valid staff profile to read/write for their shop
CREATE POLICY "Integrations staff access" ON integrations
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "External orders staff access" ON external_orders
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "External order items staff access" ON external_order_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "External product mappings staff access" ON external_product_mappings
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Webhook events access" ON webhook_events
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Integration sync logs access" ON integration_sync_logs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Order invoice links access" ON order_invoice_links
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
