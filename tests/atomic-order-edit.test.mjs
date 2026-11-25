import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('order price edits charge completed orders atomically, reject stale status and roll back on failure', async () => {
  const db = new PGlite();
  const admin = '00000000-0000-0000-0000-000000000001', agent = '00000000-0000-0000-0000-000000000002';
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '${admin}'::uuid$$;
      CREATE TABLE profiles(id uuid PRIMARY KEY,role text,full_name text,permissions text[],status text,deleted_at timestamptz);
      CREATE TABLE agent_details(id uuid PRIMARY KEY,current_balance numeric);
      CREATE TABLE orders(id bigint PRIMARY KEY,agent_id uuid,total_amount numeric,paid_amount numeric,production_status text,payment_status text,items jsonb,discount_value numeric,discount_type text,sub_total_amount numeric,total_volume numeric,has_special_request boolean,agent_edit_unlocked boolean,paid_at timestamptz);
      CREATE TABLE wallet_transactions(id bigint GENERATED ALWAYS AS IDENTITY,agent_id uuid,amount numeric,type text,description text,linked_order_id bigint,locked boolean);
      CREATE TABLE audit_logs(user_id uuid,user_name text,action text,context text,details text,previous_value text,new_value text);
      INSERT INTO profiles VALUES('${admin}','ADMIN','محاسب','{EDIT_ORDERS}','active',NULL);
      INSERT INTO agent_details VALUES('${agent}',-80);
      INSERT INTO orders VALUES(34,'${agent}',100,20,'COMPLETED','PARTIALLY_PAID','[]',0,'FIXED',100,0,false,false,NULL);`);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261125081300_atomic_staff_order_edits.sql', import.meta.url), 'utf8'));
    const expected = { total_amount: 100, paid_amount: 20, production_status: 'COMPLETED', items: [], discount_value: 0, discount_type: 'FIXED' };
    const next = { total_amount: 120, sub_total_amount: 120, discount_value: 0, discount_type: 'FIXED', items: [{ totalPrice: 120 }], total_volume: 0, has_special_request: false };
    const save = (before = expected, changes = next) => db.query('SELECT public.save_staff_order_edit($1,$2,$3)', [34, before, changes]);
    await save();
    assert.equal(Number((await db.query('SELECT current_balance FROM agent_details')).rows[0].current_balance), -100);
    assert.equal(Number((await db.query('SELECT amount FROM wallet_transactions')).rows[0].amount), -20);
    await assert.rejects(save(), /تغيّر/);
    const updated = { ...expected, total_amount: 120, items: next.items };
    await db.exec("UPDATE orders SET production_status='WAITING'");
    await assert.rejects(save(updated), /تغيّر/);
    await save({ ...updated, production_status: 'WAITING' }, { ...next, total_amount: 80, sub_total_amount: 80, items: [{ totalPrice: 80 }] });
    assert.equal(Number((await db.query('SELECT current_balance FROM agent_details')).rows[0].current_balance), -100);
    await db.exec("UPDATE profiles SET permissions='{}'");
    await assert.rejects(save(), /صلاحية/);
    await db.exec("UPDATE profiles SET permissions='{EDIT_ORDERS}'; UPDATE orders SET production_status='COMPLETED'; CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'audit failure'; END$$; CREATE TRIGGER reject_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_audit();");
    await assert.rejects(save({ ...expected, total_amount: 80, items: [{ totalPrice: 80 }] }), /audit failure/);
    assert.equal(Number((await db.query('SELECT total_amount FROM orders')).rows[0].total_amount), 80);
    assert.equal(Number((await db.query('SELECT current_balance FROM agent_details')).rows[0].current_balance), -100);
    assert.equal((await db.query('SELECT count(*) AS n FROM wallet_transactions')).rows[0].n, 1);
  } finally { await db.close(); }
});
