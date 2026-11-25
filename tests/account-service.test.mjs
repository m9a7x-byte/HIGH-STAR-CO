import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as money from '../src/lib/orderMoney.ts';
import * as movements from '../src/lib/agentMovements.ts';

function service({ status = 'active', deleted_at = null, failSave = false } = {}) {
  const calls = []; let written = false;
  const user = { id: 'user', fullName: 'Test', email: 'test@example.invalid', role: 'ADMIN', status, deleted_at, agentDetails: { currentBalance: 50 } };
  const supabase = { auth: {
    getSession: async () => ({ data: { session: { user: { id: 'user' } } } }),
    getUser: async () => ({ data: { user: { id: 'user' } } }),
    signInWithPassword: async () => ({ data: { user: { id: 'user' } } }),
    signOut: async () => { calls.push('signOut'); return {}; }
  }, from(table) {
    const query = { select: () => query, eq: () => query, neq: () => query, order: () => query,
      update: payload => { written = true; calls.push({ table, payload }); return query; },
      insert: payload => { written = true; calls.push({ table, payload }); return query; },
      single: async () => ({ data: written && table === 'orders' ? { id: 50, agent_id: 'user' } : user, error: failSave && written ? new Error('save failed') : null }),
      maybeSingle: async () => ({ data: { id: 'user' }, error: failSave ? new Error('save failed') : null }),
      then: resolve => Promise.resolve({ data: [], error: failSave && written ? new Error('save failed') : null }).then(resolve)
    }; return query;
  }, rpc: async (name, args) => { calls.push({ rpc: name, args }); return { error: failSave ? new Error('save failed') : null }; } };
  const source = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8').replace('this.init();', '').replaceAll('import.meta.env', '({})');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const enums = new Proxy({}, { get: (_, key) => key });
  const deps = { './supabase': { supabase }, '../types': { UserRole: enums, ProductionStatus: enums, PaymentStatus: enums }, './orderMoney': money, './agentMovements': movements,
    './factoryMaterials': { legacyFactoryMaterials: [] }, './productFamilies': { snapshotProductUnits: () => ({}), normalizePaintColor: s => s, isPieceProduct: () => false } };
  const exports = {}; new Function('require', 'exports', outputText)(name => deps[name] || {}, exports);
  const db = exports.db; db.users = [user]; db.notify = () => {}; db.init = async () => {}; db.logActivity = async () => {}; db.generateUUID = () => 'session'; db.mapOrder = o => ({ ...o });
  db.fetchUsers = async () => { calls.push('fetchUsers'); db.users = [user]; };
  db.fetchOrders = async () => {}; db.fetchWalletTransactions = async () => {};
  return { db, calls, user };
}

test('inactive profiles cannot log in or restore a cached session', async () => {
  for (const options of [{ status: 'suspended' }, { deleted_at: '2026-01-01' }]) {
    const { db, calls } = service(options);
    await assert.rejects(db.login('test@example.invalid', 'password'), /موقوف|محذوف|متاح/);
    assert.ok(calls.includes('signOut'));
    assert.equal(await db.restoreSession(), null);
  }
});

test('restoration always refreshes profile and logout clears notifications across accounts', async () => {
  const { db, calls } = service();
  await db.restoreSession(); assert.ok(calls.includes('fetchUsers'));
  db.notifications = [{ id: 'private' }]; db.shownNotifications.add('private');
  await db.logout(); assert.deepEqual(db.notifications, []); assert.equal(db.shownNotifications.size, 0);
});

test('profile and notification failures propagate without showing false local success', async () => {
  const { db } = service({ failSave: true });
  await assert.rejects(db.updateProfile('user', { fullName: 'New' }), /save failed/);
  db.notifications = [{ id: '1', isRead: false }];
  await assert.rejects(db.markNotificationAsRead('1'), /save failed/);
  assert.equal(db.notifications[0].isRead, false);
});

test('a new unpaid request never writes the wallet or overwrites a cached balance', async () => {
  const { db, calls } = service();
  await db.createOrder('user', [{ productId: -1, isSpecial: true, qCartons: 1, qMeters: 0 }], 0);
  assert.equal(calls.filter(c => c?.table && c.table !== 'orders').length, 0);
  assert.equal(db.users[0].agentDetails.currentBalance, 50);
});

test('completed order edits use the atomic RPC and never perform separate wallet writes', async () => {
  const { db, calls } = service();
  db.orders = [{ id: 34, agentId: 'user', totalAmount: 100, paidAmount: 0, productionStatus: 'COMPLETED', items: [], paymentHistory: [] }];
  await db.updateOrder('user', 34, [{ productId: -1, isSpecialRequest: true, qCartons: 1, qMeters: 0, unitPriceCarton: 120, unitPriceMeter: 0 }], 0, 0, 'FIXED');
  assert.equal(calls[0].rpc, 'save_staff_order_edit');
  assert.equal(calls[0].args.p_changes.total_amount, 120);
  assert.equal(calls.some(c => c?.table), false);
});
