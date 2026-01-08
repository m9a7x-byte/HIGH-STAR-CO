-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Note: profiles RLS is already enabled.

-- =========================================================
-- Helper Functions for Role Checking
-- =========================================================

-- 1. Check if user is Staff (Has access to dashboard data)
-- Includes: SUPER_ADMIN, ADMIN, SUPERVISOR, VIEWER
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'VIEWER')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Check if user has Edit permissions (Can change data)
-- Includes: SUPER_ADMIN, ADMIN, SUPERVISOR
CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Check if user is High Level Admin (Sensitive actions like Settings)
-- Includes: SUPER_ADMIN, ADMIN
CREATE OR REPLACE FUNCTION is_admin_level()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- 1. Products & Categories (Catalog)
-- Read: Everyone (Authenticated)
-- Write: Editors (Admin/Supervisor)
-- =========================================================

-- Products
DROP POLICY IF EXISTS "Everyone can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Everyone can view products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff Editors can manage products" ON products FOR ALL TO authenticated USING (is_editor()) WITH CHECK (is_editor());

-- Categories
DROP POLICY IF EXISTS "Everyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

CREATE POLICY "Everyone can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff Editors can manage categories" ON categories FOR ALL TO authenticated USING (is_editor()) WITH CHECK (is_editor());

-- =========================================================
-- 2. Orders
-- Read: Staff (All), Agent (Own)
-- Write: Editors (All), Agent (Insert/Select Own)
-- =========================================================

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Agents can view own orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Agents can create orders" ON orders;

-- Read
CREATE POLICY "Staff can view all orders" ON orders FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Agents can view own orders" ON orders FOR SELECT TO authenticated USING (auth.uid() = agent_id);

-- Write (Update/Delete)
CREATE POLICY "Staff Editors can manage all orders" ON orders FOR ALL TO authenticated USING (is_editor()) WITH CHECK (is_editor());

-- Insert (Agents)
CREATE POLICY "Agents can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

-- =========================================================
-- 3. Wallet Transactions
-- Read: Staff (All), Agent (Own)
-- Write: Editors (All), Agent (Insert Own?)
-- =========================================================
DROP POLICY IF EXISTS "Admins can view all wallet tx" ON wallet_transactions;
DROP POLICY IF EXISTS "Agents can view own wallet tx" ON wallet_transactions;
DROP POLICY IF EXISTS "Agents can insert own wallet tx" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage all wallet tx" ON wallet_transactions;

CREATE POLICY "Staff can view all wallet tx" ON wallet_transactions FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Agents can view own wallet tx" ON wallet_transactions FOR SELECT TO authenticated USING (agent_id = auth.uid());

CREATE POLICY "Staff Editors can manage all wallet tx" ON wallet_transactions FOR ALL TO authenticated USING (is_editor()) WITH CHECK (is_editor());
CREATE POLICY "Agents can insert own wallet tx" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());

-- =========================================================
-- 4. Agent Details
-- Read: Staff (All), Agent (Own)
-- Write: Editors (All)
-- =========================================================
DROP POLICY IF EXISTS "Admins can view all agent details" ON agent_details;
DROP POLICY IF EXISTS "Agents can view own details" ON agent_details;
DROP POLICY IF EXISTS "Admins can manage agent details" ON agent_details;
DROP POLICY IF EXISTS "Agents can update own details" ON agent_details;

CREATE POLICY "Staff can view all agent details" ON agent_details FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Agents can view own details" ON agent_details FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Staff Editors can manage agent details" ON agent_details FOR ALL TO authenticated USING (is_editor()) WITH CHECK (is_editor());
-- Allow agents to update own row (used sometimes for profile updates that touch this table)
CREATE POLICY "Agents can update own details" ON agent_details FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =========================================================
-- 5. Factory Transactions (Sensitive)
-- Read: Staff Only
-- Write: Editors Only
-- =========================================================
DROP POLICY IF EXISTS "Admins manage factory tx" ON factory_transactions;

CREATE POLICY "Staff can view factory tx" ON factory_transactions FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Staff Editors manage factory tx" ON factory_transactions FOR ALL TO authenticated USING (is_editor()) WITH CHECK (is_editor());

-- =========================================================
-- 6. Suppliers
-- Read: Staff (Maybe Agents need to see names? But "Everyone" is safer for UI logic usually)
-- Let's say Everyone VIEW, Editors MANAGE.
-- =========================================================
DROP POLICY IF EXISTS "Everyone view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins manage suppliers" ON suppliers;

CREATE POLICY "Everyone view suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff Editors manage suppliers" ON suppliers FOR ALL TO authenticated USING (is_editor()) WITH CHECK (is_editor());

-- =========================================================
-- 7. System Settings (Highly Sensitive)
-- Read: Everyone (Some settings are global vehicle configs)
-- Write: ADMIN LEVEL ONLY (Not Supervisor)
-- =========================================================
DROP POLICY IF EXISTS "Everyone view settings" ON system_settings;
DROP POLICY IF EXISTS "Admins manage settings" ON system_settings;

CREATE POLICY "Everyone view settings" ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins Only manage settings" ON system_settings FOR ALL TO authenticated USING (is_admin_level()) WITH CHECK (is_admin_level());

-- =========================================================
-- 8. Audit Logs
-- Read: Is Admin? (Maybe Logs are for Admin only, not Supervisor?) Let's say Staff.
-- Insert: Everyone (System logging)
-- =========================================================
DROP POLICY IF EXISTS "Admins view logs" ON audit_logs;
DROP POLICY IF EXISTS "Everyone insert logs" ON audit_logs;

CREATE POLICY "Staff view logs" ON audit_logs FOR SELECT TO authenticated USING (is_staff());
CREATE POLICY "Everyone insert logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id::text);
