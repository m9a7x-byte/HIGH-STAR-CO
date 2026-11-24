import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const agent = '00000000-0000-0000-0000-000000000001';
const admin = '00000000-0000-0000-0000-000000000002';
const migration = readFileSync(new URL('../supabase/migrations/20261124125814_safe_order_status_transitions.sql', import.meta.url), 'utf8');
async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${admin}'::uuid $$;
    CREATE TYPE production_status AS ENUM ('PENDING_PAYMENT','PENDING_TRANSFER','WAITING','IN_PROGRESS','COMPLETED');
    CREATE TYPE wallet_transaction_type AS ENUM ('DEPOSIT','PAYMENT','ADJUSTMENT');
    CREATE TABLE profiles(id uuid PRIMARY KEY, full_name text, role text, permissions text[], deleted_at timestamptz, status text);
    CREATE TABLE agent_details(id uuid PRIMARY KEY, current_balance numeric);
    CREATE TABLE orders(id integer PRIMARY KEY, agent_id uuid, production_status production_status, total_amount numeric, paid_amount numeric DEFAULT 0, payment_history jsonb DEFAULT '[]', payment_status text DEFAULT 'PENDING', moved_to_production_at timestamptz, agent_edit_unlocked boolean DEFAULT false);
    CREATE TABLE wallet_transactions(id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, agent_id uuid, amount numeric, type wallet_transaction_type, description text, linked_order_id integer, locked boolean DEFAULT false, payment_details jsonb, created_at timestamptz DEFAULT now());
    CREATE TABLE audit_logs(id bigint GENERATED ALWAYS AS IDENTITY, user_id uuid, user_name text, action text, context text, details text, previous_value text, new_value text);
    INSERT INTO profiles VALUES ('${admin}','محاسب','ADMIN','{EDIT_PRODUCTION,DELETE_ORDERS}',NULL,'active');
    INSERT INTO agent_details VALUES ('${agent}',-49396.54);
    INSERT INTO orders(id,agent_id,production_status,total_amount) VALUES (34,'${agent}','COMPLETED',11376.96),(35,'${agent}','PENDING_TRANSFER',100);
    INSERT INTO wallet_transactions(agent_id,amount,type,description) VALUES ('${agent}',-11376.96,'PAYMENT','شراء طلبية #34');
  `);
  await db.exec(migration);
  return db;
}
async function state(db) {
  return (await db.query(`SELECT jsonb_build_object('balance',(SELECT current_balance FROM agent_details),'orders',(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM orders o),'transactions',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM wallet_transactions t),'logs',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM audit_logs l)) AS state`)).rows[0].state;
}
const change = (db,status,expected='COMPLETED',total=11376.96) => db.query('SELECT public.change_order_production_status($1,$2,$3,$4)',[34,expected,total,status]);
test('completed order reversal cancels its charge exactly once and re-completion bills once', async () => {
  const db=await fixture(); try {
    await db.exec(`UPDATE orders SET paid_amount=100,payment_history='[{"id":77,"amountAdded":100}]',payment_status='PARTIALLY_PAID' WHERE id=34; INSERT INTO wallet_transactions(agent_id,amount,type,description,linked_order_id) VALUES ('${agent}',100,'DEPOSIT','دفعة للطلب #34',34)`);
    await change(db,'PENDING_TRANSFER'); let s=await state(db);
    assert.equal(s.balance,-38019.58); assert.equal(s.orders[0].production_status,'PENDING_TRANSFER');
    assert.equal(s.orders[0].moved_to_production_at,null); assert.equal(s.orders[0].paid_amount,100); assert.equal(s.transactions.length,1); assert.equal(s.transactions[0].type,'DEPOSIT');
    await assert.rejects(change(db,'PENDING_TRANSFER'),/تغيّرت/); assert.deepEqual(await state(db),s);
    await change(db,'WAITING','PENDING_TRANSFER'); assert.equal((await state(db)).balance,-38019.58);
    assert.ok((await state(db)).orders[0].moved_to_production_at);
    await change(db,'COMPLETED','WAITING'); s=await state(db); assert.equal(s.balance,-49396.54); assert.equal(s.transactions.filter(t=>t.type==='PAYMENT').length,1);
    await change(db,'COMPLETED','COMPLETED'); assert.deepEqual(await state(db),s);
    await change(db,'IN_PROGRESS'); assert.equal((await state(db)).balance,-38019.58);
  } finally { await db.close(); }
});
test('reversal includes invoice price adjustments, keeps payment history and never touches another order', async()=>{
  const db=await fixture();try{
    await db.exec(`UPDATE orders SET total_amount=11476.96 WHERE id=34; INSERT INTO wallet_transactions(agent_id,amount,type,description) VALUES ('${agent}',-100,'ADJUSTMENT','تعديل قيمة الطلب #34 (زيادة)'),('${agent}',-9,'ADJUSTMENT','تعديل قيمة الطلب #340 (زيادة)'); UPDATE agent_details SET current_balance=current_balance-109`);
    await change(db,'WAITING','COMPLETED',11476.96); const s=await state(db);
    assert.equal(s.balance,-38028.58); assert.equal(s.transactions.length,1); assert.match(s.transactions[0].description,/#340/);
  }finally{await db.close();}
});
test('stale totals, invalid status, missing permissions and billing inconsistency leave all financial state intact',async()=>{
  const db=await fixture();try{
    let s=await state(db);
    await assert.rejects(change(db,'WAITING','COMPLETED',1),/تغيّرت/); assert.deepEqual(await state(db),s);
    await assert.rejects(change(db,'INVALID'),/الحالة/); assert.deepEqual(await state(db),s);
    await db.exec("UPDATE profiles SET permissions='{}'"); await assert.rejects(change(db,'WAITING'),/صلاحية/); assert.deepEqual(await state(db),s);
    await db.exec("UPDATE profiles SET permissions='{EDIT_PRODUCTION}',status='suspended'"); await assert.rejects(change(db,'WAITING'),/صلاحية/); assert.deepEqual(await state(db),s);
    await db.exec("UPDATE profiles SET status='active'; UPDATE wallet_transactions SET amount=-1");s=await state(db);
    await assert.rejects(change(db,'WAITING'),/حركة احتساب/);assert.deepEqual(await state(db),s);
  }finally{await db.close();}
});
test('a failure in audit writing rolls back status, charge deletion and balance together',async()=>{
  const db=await fixture();try{
    await db.exec("ALTER TABLE audit_logs ADD CONSTRAINT reject_test_log CHECK (false)"); const s=await state(db);
    await assert.rejects(change(db,'WAITING'),/reject_test_log/); assert.deepEqual(await state(db),s);
  }finally{await db.close();}
});
test('database protects completed, production and paid orders from deletion but allows empty drafts',async()=>{
  const db=await fixture();try{
    let s=await state(db);await assert.rejects(db.exec('DELETE FROM orders WHERE id=34'),/لا يمكن حذف/);assert.deepEqual(await state(db),s);
    await db.exec("UPDATE orders SET production_status='WAITING' WHERE id=35");await assert.rejects(db.exec('DELETE FROM orders WHERE id=35'),/لا يمكن حذف/);
    await db.exec("UPDATE orders SET production_status='PENDING_TRANSFER',paid_amount=1 WHERE id=35");await assert.rejects(db.exec('DELETE FROM orders WHERE id=35'),/لا يمكن حذف/);
    await db.exec("UPDATE orders SET paid_amount=0 WHERE id=35; DELETE FROM orders WHERE id=35");assert.equal((await state(db)).orders.length,1);
  }finally{await db.close();}
});

