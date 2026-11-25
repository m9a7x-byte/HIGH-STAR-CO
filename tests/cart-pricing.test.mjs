import test from 'node:test';
import assert from 'node:assert/strict';
import { getCartProductPrices } from '../src/lib/pricing.ts';

test('agent edits retain approved custom prices and zero prices while new lines use the current catalog', () => {
  const product = { saleMode: 'CARTON', prices: { NORMAL: { pricePerCarton: 20, pricePerMeter: 2 } } };
  const agent = { type: 'NORMAL', priceIncreasePercent: 15 };
  assert.equal(getCartProductPrices(product, agent, { unitPriceCarton: 52, unitPriceMeter: 5.2 }, true).pricePerCarton, 52);
  assert.equal(getCartProductPrices(product, agent, {}, true).pricePerCarton, 23);
  assert.equal(getCartProductPrices(product, agent, { unitPriceCarton: 0, unitPriceMeter: 0 }, true).pricePerCarton, 0);
  assert.equal(getCartProductPrices({ ...product, saleMode: 'PIECE' }, agent, { productSaleMode: 'CARTON', unitPriceCarton: 52, unitPriceMeter: 5.2 }, false).pricePerCarton, 52);
});
