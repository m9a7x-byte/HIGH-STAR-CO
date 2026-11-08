import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLineTotal, calculateOrderTotals } from '../src/lib/orderMoney.ts';

test('custom quantity and price contribute their full amount to the invoice', () => {
    const special = calculateLineTotal(480, 1.5);
    assert.equal(special, 720);
    assert.deepEqual(calculateOrderTotals([{ totalPrice: 42427.30 }, { totalPrice: special }]), {
        subTotal: 43147.30, total: 43147.30
    });
});

test('currency totals sum line cents without floating point tails', () => {
    assert.deepEqual(calculateOrderTotals([{ totalPrice: 0.1 }, { totalPrice: 0.2 }]), {
        subTotal: 0.3, total: 0.3
    });
    assert.equal(calculateLineTotal(10, 0.7919999999999999), 7.92);
    assert.equal(calculateLineTotal(10, 2.475), 24.75);
    assert.equal(calculateLineTotal(3, 38.25, 2, 4.25), 123.25);
});

test('fixed and percentage discounts round the payable amount to cents', () => {
    const items = [{ totalPrice: 10.01 }, { totalPrice: 20.02 }];
    assert.deepEqual(calculateOrderTotals(items, 1.12, 'FIXED'), { subTotal: 30.03, total: 28.91 });
    assert.deepEqual(calculateOrderTotals(items, 12.5, 'PERCENT'), { subTotal: 30.03, total: 26.28 });
    assert.deepEqual(calculateOrderTotals([{ totalPrice: 0 }]), { subTotal: 0, total: 0 });
});
