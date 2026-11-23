import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatTime, formatDateTime } from '../src/lib/dateUtils.ts';
import { planAgentMovement, getMovementMode, getMovementNote, canCorrectMovement } from '../src/lib/agentMovements.ts';

const now = '2026-11-23T10:00:00.000Z';
const user = { id: 'admin', fullName: 'محاسب' };
const payment = (id, amount) => ({ id, amountAdded: amount, date: now, addedById: user.id });
const order = (id, total, paid = 0, payments = []) => ({ id, agentId: 'agent', totalAmount: total, paidAmount: paid, paymentHistory: payments, paymentStatus: paid >= total ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'PENDING', createdAt: `2026-11-${id}T00:00:00Z`, paidAt: null });
const tx = (amount, description, extra = {}) => ({ id: 100, agentId: 'agent', amount, description, type: 'DEPOSIT', createdAt: now, ...extra });
function plan(extra) {
  let id = 1000;
  return planAgentMovement({ agentId: 'agent', user, now, paymentId: () => ++id, orders: [], ...extra });
}

test('dates and times use English digits and keep Baghdad time', () => {
  const instant = '2026-11-23T21:05:00Z';
  for (const format of [formatDate, formatTime, formatDateTime]) {
    const value = format(instant);
    assert.doesNotMatch(value, /[٠-٩۰-۹]/);
    assert.match(value, /[0-9]/);
  }
  assert.match(formatTime(instant, { hour12: false }), /00:05/);
  assert.match(formatDate(instant), /24/);
});

test('old deposits with invoice numbers in a note remain editable and change balance once', () => {
  const transaction = tx(100, 'إيداع رصيد - مراجعة #123');
  const result = plan({ transaction, amount: 70, note: 'تصحيح' });
  assert.equal(canCorrectMovement(transaction), true);
  assert.equal(result.balanceDelta, -30);
  assert.deepEqual(result.orderChanges, []);
  assert.equal(plan({ transaction, remove: true }).balanceDelta, -100);
});

test('new unified payment pays oldest open invoices with exact cents and keeps advance credit', () => {
  const result = plan({ mode: 'settlement', amount: 30.31, orders: [order(2, 20.1), order(1, 10.01), { ...order(3, 500), paymentStatus: 'CANCELLED' }, { ...order(4, 500), agentId: 'other' }] });
  assert.deepEqual(result.next.payment_details.allocations.map(a => a.amount), [10.01, 20.1]);
  assert.match(result.next.description, /رصيد مقدم: \$0.2/);
  assert.equal(result.balanceDelta, 30.31);
});

test('decreasing a legacy distributed payment reverses its allocations before redistribution', () => {
  const transaction = tx(150, 'تسديد موحد $150 - توزعت على 2 فاتورة: #1 ($100)، #2 ($50) | ملاحظة: تصحيح | بواسطة: محاسب');
  const result = plan({ transaction, amount: 80, orders: [order(1, 100, 100, [payment(11, 100)]), order(2, 100, 70, [payment(22, 50), payment(23, 20)])], note: 'المبلغ الصحيح' });
  assert.equal(result.balanceDelta, -70);
  assert.deepEqual(result.orderChanges.map(o => o.paid_amount), [80, 20]);
  assert.equal(result.orderChanges[1].payment_history[0].id, 23);
  assert.equal(getMovementNote(transaction), 'تصحيح');
});

test('deleting a structured payment removes its invoice portions and advance credit exactly once', () => {
  const transaction = tx(200, '', { paymentDetails: { mode: 'settlement', note: '', allocations: [{ orderId: 1, paymentId: 11, amount: 100 }] } });
  const result = plan({ transaction, remove: true, orders: [order(1, 100, 100, [payment(11, 100)])] });
  assert.equal(result.balanceDelta, -200);
  assert.equal(result.next, null);
  assert.equal(result.orderChanges[0].paid_amount, 0);
  assert.deepEqual(result.orderChanges[0].payment_history, []);
});

test('increasing a payment adds allocations and preserves existing payment identity and opening balance', () => {
  const transaction = tx(30, '', { paymentDetails: { mode: 'settlement', note: '', allocations: [{ orderId: 1, paymentId: 11, amount: 30 }] } });
  const result = plan({ transaction, amount: 150, orders: [order(1, 100, 50, [payment(11, 30)]), order(2, 100)] });
  assert.deepEqual(result.orderChanges.map(o => o.paid_amount), [100, 70]);
  assert.equal(result.orderChanges[0].payment_history[0].id, 11);
  assert.equal(result.orderChanges[0].payment_history[0].previousPaid, 20);
  assert.equal(result.balanceDelta, 120);
});

test('direct invoice payments support correction and deletion without changing another payment', () => {
  const transaction = tx(30, 'دفعة إضافية للطلب #1 | بواسطة: محاسب');
  const orders = [order(1, 100, 50, [payment(11, 30), payment(12, 20)])];
  assert.equal(getMovementMode(transaction), 'invoice');
  assert.equal(plan({ transaction, orders, amount: 60 }).orderChanges[0].paid_amount, 80);
  assert.equal(plan({ transaction, orders, remove: true }).orderChanges[0].paid_amount, 20);
  assert.throws(() => plan({ transaction, orders, amount: 90 }), /أكبر/);
});

test('ambiguous old payments and altered allocations fail before any writes', () => {
  const transaction = tx(30, 'دفعة إضافية للطلب #1');
  assert.throws(() => plan({ transaction, orders: [order(1, 100, 60, [payment(11, 30), payment(12, 30)])], remove: true }), /مؤكد/);
  const structured = { ...transaction, paymentDetails: { mode: 'invoice', note: '', allocations: [{ orderId: 1, paymentId: 11, amount: 30 }] } };
  assert.throws(() => plan({ transaction: structured, orders: [order(1, 100, 20, [payment(11, 20)])], remove: true }), /تغيّرت/);
});

test('locked entries, invoice charges, wrong agents and nonfinite amounts cannot be corrected', () => {
  for (const transaction of [tx(30, '', { locked: true }), tx(-30, 'شراء طلبية #1'), tx(30, 'تعديل قيمة الطلب #1 (نقصان)'), tx(30, 'تعديل دفعات الطلب #1'), tx(30, '', { agentId: 'other' })]) {
    assert.throws(() => plan({ transaction, amount: 10 }));
  }
  for (const amount of [NaN, Infinity, -Infinity, 0, -10]) assert.throws(() => plan({ amount }));
  assert.equal(plan({ mode: 'withdraw', amount: -10 }).balanceDelta, -10);
});

test('editing only the note preserves the original distribution despite newly unpaid invoices', () => {
  const transaction = tx(30, '', { paymentDetails: { mode: 'settlement', note: '', allocations: [{ orderId: 2, paymentId: 22, amount: 30 }] } });
  const result = plan({ transaction, amount: 30, note: 'تصحيح الملاحظة فقط', orders: [order(1, 100), order(2, 100, 30, [payment(22, 30)])] });
  assert.deepEqual(result.orderChanges, []);
  assert.deepEqual(result.next.payment_details.allocations, transaction.paymentDetails.allocations);
});
