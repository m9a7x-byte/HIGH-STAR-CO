import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { isVisibleStaffAccount } from '../src/lib/staffAccounts.ts';

const ar = JSON.parse(readFileSync(new URL('../src/i18n/locales/ar.json', import.meta.url), 'utf8'));
const translate = key => key.split('.').reduce((value, part) => value?.[part], ar) ?? key;

// Exercise the component's rendered controls and handlers without a live account.
function componentHarness(file, overrides = {}) {
  let cursor = 0;
  const state = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    },
    useMemo: callback => callback(),
    useEffect: () => {},
    useRef(initial) { return react.useState({ current: initial })[0]; }
  };
  const components = new Proxy({}, { get: (_, key) => key });
  const dependencies = {
    react: { ...react, default: react },
    i18next: { default: { t: translate } },
    'react-i18next': { useTranslation: () => ({ t: translate }) },
    ...overrides
  };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }
  });
  const exports = {};
  new Function('require', 'exports', outputText)(name => dependencies[name] ?? components, exports);
  return props => {
    cursor = 0;
    return Object.values(exports)[0](props);
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...(tree.props?.children ?? []).flatMap(nodes)];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  return (tree?.props?.children ?? []).map(text).join('');
}
function button(tree, label) {
  const found = nodes(tree).find(node => typeof node.props.onClick === 'function' && text(node).trim() === label);
  assert.ok(found, `Missing button: ${label}`);
  return found;
}

function staffHarness({ fail = false, legacyFrozen = false } = {}) {
  const employee = { id: 'employee', fullName: 'موظف الاختبار', email: 'staff@example.test', role: 'VIEWER', status: legacyFrozen ? 'suspended' : 'active', deleted_at: legacyFrozen ? '2026-11-08T23:00:00Z' : null };
  const calls = [];
  const errors = [];
  const db = {
    users: [employee],
    getLogs: () => [],
    async setAgentStatus(actor, id, status) {
      calls.push({ actor, id, status });
      if (fail) throw new Error('Status update failed');
      db.users = db.users.map(user => user.id === id ? { ...user, status } : user);
    },
    async restoreAgent(actor, id) {
      calls.push({ actor, id, action: 'restore' });
      if (fail) throw new Error('Restore failed');
      db.users = db.users.map(user => user.id === id ? { ...user, status: 'active', deleted_at: null } : user);
    }
  };
  const props = {
    employees: db.users, selectedEmployee: employee, isSuperAdmin: true,
    onSelectEmployee: selected => { props.selectedEmployee = selected; props.employees = db.users; }
  };
  const render = componentHarness('../src/features/admin/tabs/StaffTab.tsx', {
    '../../../lib/db': { db },
    '../../../types': { UserRole: new Proxy({}, { get: (_, key) => key }), UserRoleLabels: {} },
    '../../../lib/permissions': { ROLE_PERMISSIONS: {}, PERMISSION_GROUPS: [], PERMISSION_LABELS: {} },
    '../../../context/AuthContext': { useAuth: () => ({ user: { id: 'admin' } }) },
    '../../../context/ToastContext': { useToast: () => ({ success: () => {}, error: (...args) => errors.push(args) }) }
  });
  return { render: () => render(props), props, db, calls, errors };
}

test('freeze dialog has a cancel button that dismisses without changing the account', async () => {
  const app = staffHarness();
  await button(app.render(), translate('batch4.k583')).props.onClick();
  const dialog = app.render();
  assert.ok(!text(dialog).includes(translate('batch4.k287')));
  button(dialog, translate('common.cancel')).props.onClick();
  assert.ok(!text(app.render()).includes(translate('batch4.confirm_freeze_account')));
  assert.deepEqual(app.calls, []);
});

test('freezing keeps the employee visible and can be reversed from the employee profile', async () => {
  const app = staffHarness();
  await button(app.render(), translate('batch4.k583')).props.onClick();
  await button(app.render(), translate('batch4.confirm_freeze_account')).props.onClick();
  assert.equal(app.props.selectedEmployee.status, 'suspended');
  assert.equal(app.props.selectedEmployee.deleted_at, null);
  assert.equal(app.db.users.length, 1);
  const unfreeze = button(app.render(), translate('batch4.unfreeze_account'));
  app.props.selectedEmployee = null;
  assert.ok(text(app.render()).includes('موظف الاختبار'));
  app.props.selectedEmployee = app.db.users[0];
  await unfreeze.props.onClick();
  assert.equal(app.props.selectedEmployee.status, 'active');
  assert.deepEqual(app.calls.map(call => call.status), ['suspended', 'active']);
});

test('a failed freeze keeps the employee active and the confirmation available for retry', async () => {
  const app = staffHarness({ fail: true });
  await button(app.render(), translate('batch4.k583')).props.onClick();
  await button(app.render(), translate('batch4.confirm_freeze_account')).props.onClick();
  assert.equal(app.props.selectedEmployee.status, 'active');
  assert.equal(app.errors.length, 1);
  assert.equal(button(app.render(), translate('batch4.confirm_freeze_account')).props.disabled, false);
});

test('legacy frozen staff remain visible without changing their suspension or deletion metadata', () => {
  const employee = { role: 'VIEWER', status: 'suspended', deleted_at: '2026-11-08T23:00:00Z', email: 'staff@example.test' };
  const original = { ...employee };
  assert.equal(isVisibleStaffAccount(employee), true);
  assert.deepEqual(employee, original);
  assert.equal(isVisibleStaffAccount({ ...employee, deleted_at: null }), true);
});

test('archived accounts and agents stay excluded from the staff list', () => {
  const employee = { role: 'VIEWER', status: 'suspended', deleted_at: '2026-11-08T23:00:00Z', email: 'staff@example.test' };
  for (const changes of [
    { role: 'AGENT', deleted_at: null },
    { role: 'AGENT' },
    { status: 'active' },
    { email: 'deleted_123@voga.deleted' },
    { email: 'DELETED_123@VOGA.DELETED' },
    { email: '' }
  ]) assert.equal(isVisibleStaffAccount({ ...employee, ...changes }), false);
});

test('unfreezing legacy staff clears the old deletion marker as well as the suspension', async () => {
  const app = staffHarness({ legacyFrozen: true });
  await button(app.render(), translate('batch4.unfreeze_account')).props.onClick();
  assert.equal(app.props.selectedEmployee.status, 'active');
  assert.equal(app.props.selectedEmployee.deleted_at, null);
  assert.deepEqual(app.calls, [{ actor: 'admin', id: 'employee', action: 'restore' }]);
});

test('failed legacy restoration keeps the account suspended and available for retry', async () => {
  const app = staffHarness({ legacyFrozen: true, fail: true });
  await button(app.render(), translate('batch4.unfreeze_account')).props.onClick();
  assert.equal(app.props.selectedEmployee.status, 'suspended');
  assert.ok(app.props.selectedEmployee.deleted_at);
  assert.equal(app.errors.length, 1);
});

test('pagination renders its options outside the clipped footer and changes page size', () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const body = {};
  globalThis.document = { body };
  globalThis.window = { innerWidth: 1024, innerHeight: 768 };
  try {
    for (const top of [50, 600]) {
      const changes = [];
      const props = {
        page: 2, rowsPerPage: 10, totalItems: 150,
        setPage: value => changes.push(['page', value]),
        setRowsPerPage: value => changes.push(['rows', value])
      };
      const render = componentHarness('../src/components/shared/PaginationControl.tsx', {
        'react-dom': {
          createPortal: (child, target) => ({ type: 'portal', props: { target, children: [child] } })
        }
      });
      const initial = render(props);
      const trigger = nodes(initial).find(node => node.props['aria-expanded'] === false);
      trigger.props.ref.current = {
        getBoundingClientRect: () => ({ left: 200, width: 120, top, bottom: top + 40 })
      };
      trigger.props.onClick();
      const open = render(props);
      const portal = nodes(open).find(node => node.type === 'portal');
      assert.equal(portal.props.target, body);
      const menu = nodes(portal).find(node => node.props.style);
      assert.ok(menu.props.style.maxHeight > 0);
      assert.equal(menu.props.style.width, 120);
      assert.ok(top === 50 ? menu.props.style.top >= 90 : menu.props.style.bottom >= 168);
      for (const size of [10, 25, 50, 100]) button(portal, `${size} ${translate('pagination.rows')}`);
      button(portal, `25 ${translate('pagination.rows')}`).props.onClick();
      assert.deepEqual(changes, [['rows', 25], ['page', 0]]);
      assert.ok(!nodes(render(props)).some(node => node.type === 'portal'));
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
