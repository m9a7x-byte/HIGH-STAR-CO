import test from 'node:test';
import assert from 'node:assert/strict';
import { transferFields, buildProductRow, buildImportPayload, rowsFromCells, parseDelimitedRows, findImportTarget } from '../src/lib/productTransfer.ts';

const categories = [{ id: 1, name: 'PAN', type: 'STYROFOAM' }, { id: 2, name: 'لاصقة', type: 'ADHESIVE' }];
const product = { id: 1, code: 'PAN-1', category: 'PAN', dimensions: '10x20', metersPerCarton: 12, volumePerCarton: 1, imageUrl: '', isActive: true, prices: { 'عادي': { pricePerMeter: 2, pricePerCarton: 24 }, VIP: { pricePerMeter: 1.5, pricePerCarton: 18 } } };
const bag = { ...product, id: 2, code: 'GLUE', category: 'لاصقة', metersPerCarton: 80, prices: { 'عادي': { pricePerMeter: 0, pricePerCarton: 5 }, VIP: { pricePerMeter: 0, pricePerCarton: 4 } } };

test('each export contains only its independent prices', () => {
  assert(transferFields('STYROFOAM').includes('normalMeter'));
  assert(!transferFields('STYROFOAM').includes('normalUnit'));
  assert(!transferFields('ADHESIVE').includes('normalMeter'));
  assert(transferFields('ADHESIVE').includes('normalUnit'));
  assert(!transferFields('ADHESIVE').includes('normalPallet'));
});
test('foam carton totals follow edited meter prices and quantity, ignoring stale totals', () => {
  const payload = buildImportPayload({ normalMeter: '3.25', vipMeter: '2', packageUnits: '10', normalUnit: '24' }, product, categories, 'STYROFOAM');
  assert.equal(payload.prices['عادي'].pricePerCarton, 32.5);
  assert.equal(payload.prices.VIP.pricePerCarton, 20);
});
test('bag unit prices are never overwritten by old pallet totals', () => {
  const payload = buildImportPayload({ normalUnit: '6', vipUnit: '0', normalPallet: '400', packageUnits: '100' }, bag, categories, 'ADHESIVE');
  assert.equal(payload.prices['عادي'].pricePerCarton, 6);
  assert.equal(payload.prices.VIP.pricePerCarton, 0);
  assert.equal(payload.prices['عادي'].pricePerMeter, 0);
  assert.equal(payload.meters_per_carton, 100);
});
test('blank cells preserve prices; zero is an intentional value', () => {
  const payload = buildImportPayload({ normalMeter: '', vipMeter: '0' }, product, categories, 'STYROFOAM');
  assert.equal(payload.prices['عادي'].pricePerCarton, 24);
  assert.equal(payload.prices.VIP.pricePerCarton, 0);
});
test('rejects invalid, negative or zero package quantities before writes', () => {
  for (const value of ['bad', '-1', '0']) assert.throws(() => buildImportPayload({ packageUnits: value }, product, categories, 'STYROFOAM'));
  for (const value of ['bad', '-1', 'Infinity']) assert.throws(() => buildImportPayload({ normalMeter: value }, product, categories, 'STYROFOAM'));
  assert.equal(buildImportPayload({ normalMeter: '٣٫٥' }, product, categories, 'STYROFOAM').prices['عادي'].pricePerMeter, 3.5);
});
test('rejects importing a different product family or changing it', () => {
  assert.throws(() => buildImportPayload({}, bag, categories, 'STYROFOAM'));
  assert.throws(() => buildImportPayload({ category: 'لاصقة' }, product, categories, 'STYROFOAM'));
});
test('header mapping supports reordered and legacy columns, refuses missing price headers', () => {
  const rows = rowsFromCells([['VIP - سعر المتر', 'كود المنتج', 'عادي - سعر المتر'], ['1', 'PAN-1', '2']], 'STYROFOAM');
  assert.equal(rows[0].normalMeter, '2');
  assert.equal(rows[0].code, 'PAN-1');
  assert.throws(() => rowsFromCells([['كود المنتج', 'عادي - سعر الباليت'], ['PAN-1', '100']], 'STYROFOAM'));
});
test('CSV preserves quoted commas, newlines and escaped quotes', () => {
  assert.deepEqual(parseDelimitedRows('code,dimensions\n"A,1","10\n20"\nB,"a""b"'), [['code', 'dimensions'], ['A,1', '10\n20'], ['B', 'a"b']]);
});
test('duplicate codes require dimensions or an ID, and mismatched IDs cannot update another product', () => {
  const other = { ...product, id: 3, dimensions: '20x30' };
  assert.throws(() => findImportTarget({ code: 'PAN-1' }, [product, other], categories, 'STYROFOAM'));
  assert.equal(findImportTarget({ code: 'PAN-1', dimensions: '20x30' }, [product, other], categories, 'STYROFOAM').id, 3);
  assert.equal(findImportTarget({ id: '999', code: 'PAN-1' }, [product], categories, 'STYROFOAM'), undefined);
});
test('export preserves original unit prices for each family', () => {
  assert.equal(buildProductRow(product, categories).normalMeter, 2);
  assert.equal(buildProductRow(bag, categories).normalUnit, 5);
});
