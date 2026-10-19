-- ====================================================================
-- Crackers Shop POS - Product Aliases Migration for Voice & Smart Search
-- Supports English, Tamil, and Tanglish voice aliases for fast lookup
-- ====================================================================

CREATE TABLE IF NOT EXISTS product_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    language VARCHAR(20) NOT NULL DEFAULT 'all', -- 'en', 'ta', 'tanglish', 'all'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_alias UNIQUE (shop_id, alias, language)
);

-- Case-insensitive lookup index on alias
CREATE INDEX IF NOT EXISTS idx_product_aliases_shop_alias ON product_aliases(shop_id, lower(alias));
CREATE INDEX IF NOT EXISTS idx_product_aliases_product ON product_aliases(product_id);

-- Enable Row Level Security
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: All active staff (Cashiers & Admins) can read aliases
CREATE POLICY "product_aliases_select_policy" ON product_aliases
    FOR SELECT USING (true);

-- 2. Mutation Policy: Restricted to authorized administrators
CREATE POLICY "product_aliases_admin_insert" ON product_aliases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'OWNER_ADMIN'
        ) OR auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NULL
    );

CREATE POLICY "product_aliases_admin_update" ON product_aliases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'OWNER_ADMIN'
        ) OR auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NULL
    );

CREATE POLICY "product_aliases_admin_delete" ON product_aliases
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'OWNER_ADMIN'
        ) OR auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IS NULL
    );

-- Seed default aliases for common fireworks
-- Maps colloquial Tamil / Tanglish / English terms to products
INSERT INTO product_aliases (shop_id, product_id, alias, language)
SELECT p.shop_id, p.id, alias_data.alias, alias_data.language
FROM products p
CROSS JOIN LATERAL (
    VALUES
        ('bijili', 'all', ARRAY['red bijili', 'bijili']),
        ('poochatti', 'tanglish', ARRAY['flower pot', 'flower pots']),
        ('saravedi', 'tanglish', ARRAY['wala', 'garland', 'saravedi']),
        ('sparklers', 'en', ARRAY['sparkler', 'sparklers']),
        ('மத்தாப்பு', 'ta', ARRAY['sparkler', 'sparklers', 'மத்தாப்பு']),
        ('கம்பி மத்தாப்பு', 'ta', ARRAY['electric sparklers', 'kambi mathappu']),
        ('பூச்சட்டி', 'ta', ARRAY['flower pot', 'flower pots', 'புஸ்வாணம்']),
        ('சரவெடி', 'ta', ARRAY['garland', 'wala', 'சரவெடி']),
        ('chakkaram', 'tanglish', ARRAY['chakkar', 'ground chakkar']),
        ('சக்கரம்', 'ta', ARRAY['chakkar', 'ground chakkar']),
        ('rocket', 'all', ARRAY['rocket', 'வான வெடி'])
) AS alias_data(alias, language, keywords)
WHERE EXISTS (
    SELECT 1 FROM unnest(alias_data.keywords) kw
    WHERE lower(p.name) LIKE '%' || kw || '%' OR lower(coalesce(p.tamil_name, '')) LIKE '%' || kw || '%'
)
ON CONFLICT (shop_id, alias, language) DO NOTHING;
