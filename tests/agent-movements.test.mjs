import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatTime, formatDateTime } from '../src/lib/dateUtils.ts';
import { planAgentMovement, getMovementMode, getMovementNote, canCorrectMovement, summarizeAgentLedger, statementWithBalances, getMovementOrderIds, movementOwnsPayment, ledgerFinancialTotals, isAgentCashMovement, isRecognizedOrder } from '../src/lib/agentMovements.ts';

test('sales, safe and reports distinguish cash from order reversals and only recognize completed sales', () => {
  const receipt = tx(6200, 'تسديد', { id: 79 });
  const purchase = tx(-44219.58, 'شراء طلبية #21', { id: 93, type: 'PAYMENT' });
  const correction = tx(44219.58, 'عكس', { id: 100, type: 'ADJUSTMENT', paymentDetails: { reversal: { kind: 'order_charge_reversal', transactionId: 93, orderId: 21 } } });
  assert.deepEqual(ledgerFinancialTotals([receipt, purchase, correction, tx(-11376.96, 'شراء طلبية #34', { type: 'PAYMENT' })]), { received: 6200, billed: 11376.96, net: -5176.96 });
  assert.equal(isAgentCashMovement(correction), false);
  assert.equal(isAgentCashMovement({ ...correction, type: 'DEPOSIT' }), false);
  assert.equal(isAgentCashMovement(receipt), true);
  for (const productionStatus of ['WAITING', 'IN_PROGRESS', 'PENDING_TRANSFER']) assert.equal(isRecognizedOrder({ productionStatus }), false);
  assert.equal(isRecognizedOrder({ productionStatus: 'COMPLETED', paymentStatus: 'PENDING' }), true);
  assert.equal(isRecognizedOrder({ productionStatus: 'COMPLETED', paymentStatus: 'CANCELLED' }), false);
});

test('cancelled purchase reversal reduces purchases and never becomes a customer payment', () => {
  const entries = [tx(6200, 'تسديد موحد $6,200', { id: 79 }), tx(-11376.96, 'شراء طلبية #34', { id: 92 }), tx(-44219.58, 'شراء طلبية #21', { id: 93 }), tx(44219.58, 'عكس', { id: 100, paymentDetails: { reversal: { kind: 'order_charge_reversal', transactionId: 93, orderId: 21 } } })];
  assert.deepEqual(summarizeAgentLedger(entries, -5176.96), { debt: 11376.96, paid: 6200, net: -5176.96, debtCount: 1, paidCount: 1, totalCount: 4 });
  assert.equal(canCorrectMovement(entries[3]), false);
  assert.equal(summarizeAgentLedger([...entries.slice(0, 3), { ...entries[3], amount: 100 }], -49296.54).debt, 55596.54);
});

test('positive price corrections reduce purchase totals, statement uses cents and preserves opening balance', () => {
  const entries = [tx('-100', 'شراء طلبية #34', { id: 1 }), tx('20.10', 'تعديل قيمة الطلب #34', { id: 2 }), tx('10.01', 'إيداع', { id: 3 })];
  assert.equal(summarizeAgentLedger(entries, -64.89).debt, 79.9);
  assert.deepEqual(statementWithBalances(entries, -64.89).map(t => t.balanceAfter), [-64.89, -74.9, -95]);
});

test('order relationships use exact invoice ids and ignore arbitrary numbers in notes', () => {
  assert.deepEqual(getMovementOrderIds(tx(-10, 'شراء طلبية #21')), ['21']);
  assert.deepEqual(getMovementOrderIds(tx(10, 'مراجعة #21')), []);
  assert.deepEqual(getMovementOrderIds(tx(10, 'تسديد موحد $10 - توزعت على 2 فاتورة: #21 ($5)، #34 ($5)')), ['21', '34']);
});

test('new invoice receipt targets its invoice atomically without repricing it', () => {
  const result = plan({ mode: 'invoice', orderId: 2, amount: 30, orders: [order(1, 100), order(2, 100)] });
  assert.equal(result.orderChanges.length, 1);
  assert.equal(result.orderChanges[0].id, 2);
  assert.equal(result.orderChanges[0].paid_amount, 30);
  assert.throws(() => plan({ mode: 'invoice', orderId: 3, amount: 30, orders: [order(1, 100)] }));
});

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
  const originalOrders = [order(1, 100, 100, [payment(11, 100)]), order(2, 100, 70, [payment(22, 50), payment(23, 20)])];
  assert.equal(movementOwnsPayment(transaction, originalOrders[1], 22, originalOrders), true);
  assert.equal(movementOwnsPayment(transaction, originalOrders[1], 23, originalOrders), false);
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

test('successive legacy payments of the same amount match their own nearby timestamps', () => {
  const first = tx(30, 'تسديد موحد $30 - توزعت على 1 فاتورة: #1 ($30)');
  const second = { ...first, id: 101, createdAt: '2026-11-23T10:00:52.000Z' };
  const orders = [order(1, 100, 60, [
    { ...payment(11, 30), date: '2026-11-23T09:59:59.000Z' },
    { ...payment(12, 30), date: '2026-11-23T10:00:50.000Z' }
  ])];
  assert.equal(plan({ transaction: first, orders, remove: true }).orderChanges[0].payment_history[0].id, 12);
  assert.equal(plan({ transaction: second, orders, remove: true }).orderChanges[0].payment_history[0].id, 11);
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
