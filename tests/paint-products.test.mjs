import test from 'node:test';
import assert from 'node:assert/strict';
import { transferFields, transferLabels, buildProductRow, buildImportPayload } from '../src/lib/productTransfer.ts';
import { getProductUnit, getProductName, isUnitPricedProduct, getCatalogCartCounts } from '../src/lib/productFamilies.ts';

const categories = [{ id: 1, name: 'أصباغ', type: 'PAINT' }];
const product = { id: 10, code: 'PAINT-001', name: 'ستار برايمر', paintType: 'مائي', category: 'أصباغ', dimensions: '18 لتر', metersPerCarton: 1, volumePerCarton: 1, imageUrl: '', isActive: true, prices: { 'عادي': { pricePerMeter: 0, pricePerCarton: 32.74 }, VIP: { pricePerMeter: 0, pricePerCarton: 32.74 } } };

test('paint exports show material name, paint type and bucket prices without meter or pallet inputs', () => {
  const fields = transferFields('PAINT');
  assert(fields.includes('name'));
  assert(fields.includes('paintType'));
  assert(fields.includes('normalUnit'));
  assert(!fields.includes('normalMeter'));
  assert(!fields.includes('packageUnits'));
  assert.equal(transferLabels('PAINT').normalUnit, 'عادي - سعر السطلة');
});

test('paint quantities use buckets and cannot be counted as foam cartons or adhesive bags', () => {
  assert.equal(getProductName(product), 'ستار برايمر');
  assert.equal(getProductUnit(product, categories), 'سطلة');
  assert.equal(isUnitPricedProduct(product, categories), true);
  assert.deepEqual(getCatalogCartCounts({ 10: { c: 3, m: 0 } }, [product], categories), { totalCartons: 0, totalBags: 0, totalBuckets: 3, totalPieces: 0 });
});
test('paint imports preserve names and weights and store bucket prices directly', () => {
  const row = buildProductRow(product, categories);
  assert.equal(row.name, 'ستار برايمر');
  assert.equal(row.paintType, 'مائي');
  const payload = buildImportPayload({ name: 'بيورا برايمر', paintType: 'مائي', normalUnit: '35.71', vipUnit: '33', packageUnits: '80' }, product, categories, 'PAINT');
  assert.equal(payload.name, 'بيورا برايمر');
  assert.equal(payload.paint_type, 'مائي');
  assert.equal(payload.meters_per_carton, 1);
  assert.deepEqual(payload.prices['عادي'], { pricePerMeter: 0, pricePerCarton: 35.71 });
});
