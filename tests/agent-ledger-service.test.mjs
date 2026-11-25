import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function service(pages, { balance = 0, orders = [], adminError } = {}) {
  const ranges = [], actions = [];
  const supabase = { from(table) {
    const query = { select: () => query, eq: () => query, order: () => query,
      single: async () => ({ data: { current_balance: balance } }),
      range: async (start, end) => { ranges.push([start, end]); return pages.shift(); },
      then(resolve) { return Promise.resolve({ data: orders }).then(resolve); }
    };
    return query;
  } };
  const source = readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8').replace('this.init();', '').replaceAll('import.meta.env', '({})');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function('require', 'exports', outputText)(name => name === './supabase' ? { supabase } : name === './edgeFunctions' ? { invokeAdminAction: async (...args) => { actions.push(args); return { success: !adminError, error: adminError }; } } : {}, exports);
  exports.db.notify = () => {};
  exports.db.fetchUsers = async () => {};
  return { db: exports.db, ranges, actions };
}

test('statement loads all pages, converts numeric amounts and never replaces cache on an error', async () => {
  const rows = Array.from({ length: 500 }, (_, id) => ({ id, agent_id: 'agent', amount: '1.25' }));
  const { db, ranges } = service([{ data: rows }, { data: [{ id: 501, amount: '-2.50' }] }]);
  await db.fetchWalletTransactions();
  assert.equal(db.walletTransactions.length, 501);
  assert.equal(db.walletTransactions[0].amount, 1.25);
  assert.deepEqual(ranges, [[0, 499], [500, 999]]);
  const broken = service([{ data: rows }, { error: new Error('network') }]);
  broken.db.walletTransactions = [{ id: 'preserved' }];
  await assert.rejects(broken.db.fetchWalletTransactions(), /network/);
  assert.deepEqual(broken.db.walletTransactions, [{ id: 'preserved' }]);
});

test('agent removal never deletes financial data and rejects balances or active UUID orders', async () => {
  for (const options of [{ balance: 1 }, { orders: [{ id: 21, production_status: 'WAITING', payment_status: 'PENDING' }] }]) {
    const { db, actions } = service([], options);
    await assert.rejects(db.deleteAgent('admin', 'uuid-agent'), /لا يمكن حذف/);
    assert.deepEqual(actions, []);
  }
  const { db, actions } = service([]);
  await db.deleteAgent('admin', 'uuid-agent');
  assert.deepEqual(actions, [['delete_user', { userId: 'uuid-agent' }]]);
});
