import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as movements from '../src/lib/agentMovements.ts';
import * as dates from '../src/lib/dateUtils.ts';

function harness({ canEdit = true, fail = false } = {}) {
  let cursor = 0;
  const state = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useMemo: fn => fn(), useEffect: () => {}, useRef: initial => ({ current: initial })
  };
  const agent = { id: 'agent', fullName: 'وكيل', email: 'agent@example.test', agentDetails: { currentBalance: -50, permissions: {} } };
  const calls = [];
  const errors = [];
  const db = { users: [agent], orders: [], async saveAgentMovement(...args) { calls.push(args); if (fail) throw new Error('تعذر الحفظ'); }, getLogs: () => [] };
  const enums = new Proxy({}, { get: (_, key) => key });
  const dependencies = {
    react: { ...react, default: react },
    'react-i18next': { useTranslation: () => ({ t: (key, fallback) => fallback || key }) },
    '../../../lib/db': { db }, '../../../lib/agentMovements': movements, '../../../lib/dateUtils': dates,
    '../../../context/AuthContext': { useAuth: () => ({ user: { id: 'admin', fullName: 'محاسب', role: 'ADMIN' } }) },
    '../../../context/ToastContext': { useToast: () => ({ success: () => {}, error: message => errors.push(message), info: () => {} }) },
    '../../../types': { AgentType: enums, UserRole: enums, ProductionStatus: enums, PaymentStatus: enums, UserRoleLabels: enums, ProductionStatusLabels: enums }
  };
  const fallback = new Proxy({}, { get: (_, key) => key });
  const { outputText } = ts.transpileModule(readFileSync(new URL('../src/features/admin/tabs/AgentsTab.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }
  });
  const exports = {};
  new Function('require', 'exports', outputText)(name => dependencies[name] || fallback, exports);
  const props = {
    agents: [agent], selectedAgent: agent, canEdit, isSuperAdmin: false, onSelectAgent: () => {}, onViewOrder: () => {},
    agentTransactions: [
      { id: 101, agentId: 'agent', amount: 150, type: 'DEPOSIT', description: 'تسديد موحد $150 - توزعت على 2 فاتورة: #1 ($100)، #2 ($50)', createdAt: '2026-11-23T10:00:00Z' },
      { id: 102, agentId: 'agent', amount: 50, type: 'DEPOSIT', description: 'إيداع سابق', createdAt: '2026-11-23T11:00:00Z' },
      { id: 103, agentId: 'agent', amount: -250, type: 'PAYMENT', description: 'شراء طلبية #1', linkedOrderId: 1, createdAt: '2026-11-23T12:00:00Z' }
    ]
  };
  return { props, calls, errors, render() { cursor = 0; return exports.AgentsTab(props); } };
}
const nodes = tree => tree && typeof tree === 'object' ? [tree, ...(tree.props?.children || []).flatMap(nodes)] : [];
const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) : (tree?.props?.children || []).map(text).join('');
const control = (tree, title) => nodes(tree).find(node => node.props.title === title);

test('statement shows movement numbers before dates and controls for old and distributed deposits', () => {
  const app = harness();
  const tree = app.render();
  const headings = nodes(tree).filter(node => node.type === 'th').map(text);
  assert.equal(headings[0], 'رقم الحركة');
  assert.equal(headings[1], 'batch4.k273');
  for (const id of [101, 102, 103]) assert.ok(text(tree).includes(`#${id}`));
  assert.equal(nodes(tree).filter(node => node.props.title === 'تعديل الحركة').length, 2);
  const dateCells = nodes(tree).filter(node => node.type === 'td' && text(node).includes(':'));
  for (const cell of dateCells) assert.doesNotMatch(text(cell), /[٠-٩۰-۹]/);
});

test('editing previews only the balance difference and submits the original movement id', async () => {
  const app = harness();
  control(app.render(), 'تعديل الحركة').props.onClick(); // newest deposit, #102
  let tree = app.render();
  const amount = nodes(tree).find(node => node.type === 'input' && node.props.type === 'number');
  amount.props.onChange({ target: { value: '30' } });
  tree = app.render();
  assert.ok(text(tree).includes('$-70'));
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(app.calls, [['admin', 'agent', { transactionId: 102, amount: 30, notes: 'إيداع سابق', mode: 'deposit' }]]);
});

test('delete failure keeps the confirmation open and shows an error for retry', async () => {
  const app = harness({ fail: true });
  control(app.render(), 'حذف الحركة').props.onClick();
  const button = nodes(app.render()).find(node => node.type === 'Button' && text(node).trim() === 'حذف الحركة');
  await button.props.onClick();
  assert.equal(app.errors[0], 'تعذر الحفظ');
  assert.ok(text(app.render()).includes('تأكيد حذف الحركة'));
  assert.equal(app.calls[0][2].remove, true);
});

test('a viewer cannot see edit and delete controls', () => {
  const tree = harness({ canEdit: false }).render();
  assert.equal(control(tree, 'تعديل الحركة'), undefined);
  assert.equal(control(tree, 'حذف الحركة'), undefined);
});
