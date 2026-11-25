import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('permitted agents see the shared production queue while full orders stay scoped', async () => {
  const db = new PGlite();
  const viewer = '00000000-0000-0000-0000-000000000001';
  const otherAgent = '00000000-0000-0000-0000-000000000002';
  const queue = async () => (await db.query('SELECT id, is_own_order, has_special_request FROM public.get_agent_production_queue()')).rows;

  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE SCHEMA private;
      GRANT USAGE ON SCHEMA auth, private TO authenticated;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT current_setting('request.jwt.claim.sub', true)::uuid
      $$;
      CREATE TYPE production_status AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'PENDING_TRANSFER');
      CREATE TABLE profiles (id uuid PRIMARY KEY, role text, status text, deleted_at timestamptz);
      CREATE TABLE agent_details (id uuid PRIMARY KEY, permissions jsonb, is_frozen boolean);
      CREATE TABLE system_settings (key text PRIMARY KEY, value jsonb);
      CREATE TABLE orders (
        id integer PRIMARY KEY, agent_id uuid, agent_name text, has_special_request boolean,
        created_at timestamptz, moved_to_production_at timestamptz, paid_at timestamptz,
        production_status production_status, total_amount numeric
      );
      ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
      CREATE POLICY own_orders ON orders FOR SELECT TO authenticated USING (agent_id = auth.uid());
      GRANT SELECT ON orders TO authenticated;
      INSERT INTO profiles VALUES ('${viewer}', 'AGENT', 'active', NULL), ('${otherAgent}', 'AGENT', 'active', NULL);
      INSERT INTO agent_details VALUES ('${viewer}', '{"showProductionQueue":true}', false),
        ('${otherAgent}', '{"showProductionQueue":false}', false);
      INSERT INTO system_settings VALUES ('vehicle_config', '{"showProductionQueueToAgents":true}');
      INSERT INTO orders VALUES
        (101, '${otherAgent}', 'Other agent', true, '2026-11-01', NULL, '2026-11-02', 'IN_PROGRESS', 123),
        (102, '${otherAgent}', 'Other agent', false, '2026-11-02', NULL, NULL, 'COMPLETED', 200),
        (103, '${otherAgent}', 'Other agent', false, '2026-11-02', NULL, NULL, 'PENDING_TRANSFER', 300);
    `);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261125124407_agent_production_queue.sql', import.meta.url), 'utf8'));
    await db.exec(`SELECT set_config('request.jwt.claim.sub', '${viewer}', false); SET ROLE authenticated;`);
    assert.deepEqual((await db.query('SELECT id FROM orders')).rows, []);
    assert.deepEqual(await queue(), [{ id: 101, is_own_order: false, has_special_request: false }]);
    await assert.rejects(db.query('SELECT total_amount FROM public.get_agent_production_queue()'), /does not exist/);
    await db.exec(`RESET ROLE;
      INSERT INTO orders VALUES (104, '${viewer}', 'Viewer', true, '2026-11-01', '2026-11-03', '2026-11-02', 'WAITING', 400);
      SET ROLE authenticated;`);
    assert.deepEqual(await queue(), [
      { id: 101, is_own_order: false, has_special_request: false },
      { id: 104, is_own_order: true, has_special_request: true },
    ]);
    assert.deepEqual((await db.query('SELECT production_at::date::text AS date FROM public.get_agent_production_queue() ORDER BY id')).rows,
      [{ date: '2026-11-02' }, { date: '2026-11-03' }]);

    await db.exec(`SELECT set_config('request.jwt.claim.sub', '${otherAgent}', false);`);
    assert.deepEqual(await queue(), []);
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${viewer}', false);
      UPDATE system_settings SET value = '{"showProductionQueueToAgents":false}'; SET ROLE authenticated;`);
    assert.deepEqual(await queue(), []);
    await db.exec(`RESET ROLE; UPDATE system_settings SET value = '{"showProductionQueueToAgents":true}';
      UPDATE profiles SET status = 'suspended' WHERE id = '${viewer}'; SET ROLE authenticated;`);
    assert.deepEqual(await queue(), []);
    await db.exec(`RESET ROLE; UPDATE profiles SET status = 'active' WHERE id = '${viewer}';
      UPDATE agent_details SET is_frozen = true WHERE id = '${viewer}'; SET ROLE authenticated;`);
    assert.deepEqual(await queue(), []);
    await db.exec('RESET ROLE; SET ROLE anon;');
    await assert.rejects(queue(), /permission denied/);
  } finally {
    await db.close();
  }
});
