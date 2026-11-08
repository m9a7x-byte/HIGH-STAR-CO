import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductUnit, isUnitPricedProduct, getCatalogCartCounts, snapshotProductUnits, validateProductQuantities, normalizePaintColor } from '../src/lib/productFamilies.ts';
import { buildProductRow, buildImportPayload, transferFields } from '../src/lib/productTransfer.ts';
const categories=[{id:1,name:'TD',type:'STYROFOAM'}];
const piece={id:10,code:'TD-01',category:'TD',saleMode:'PIECE',dimensions:'80 سم',metersPerCarton:0,prices:{'عادي':{pricePerMeter:0,pricePerCarton:4.95},VIP:{pricePerMeter:0,pricePerCarton:4.95}}};
const carton={...piece,id:11,code:'TD-02',saleMode:'CARTON',metersPerCarton:8,prices:{'عادي':{pricePerMeter:2,pricePerCarton:16},VIP:{pricePerMeter:2,pricePerCarton:16}}};
test('piece sales use pieces without meters or carton conversion',()=>{
  assert.equal(getProductUnit(piece,categories),'قطعة');
  assert.equal(isUnitPricedProduct(piece,categories),true);
  assert.deepEqual(getCatalogCartCounts({10:{c:7,m:0},11:{c:2,m:4}},[piece,carton],categories),{totalCartons:2.5,totalBags:0,totalBuckets:0,totalPieces:7});
});
test('order snapshots preserve the sale mode and carton meters at order time',()=>{
  assert.deepEqual(snapshotProductUnits(piece),{productSaleMode:'PIECE',productMetersPerCarton:0});
  assert.deepEqual(snapshotProductUnits(carton),{productSaleMode:'CARTON',productMetersPerCarton:8});
  assert.equal(getProductUnit(piece,categories,'CARTON'),'كارتون');
  assert.equal(isUnitPricedProduct(piece,categories,'CARTON'),false);
  assert.deepEqual(getCatalogCartCounts({10:{c:2,m:4,productSaleMode:'CARTON',productMetersPerCarton:8}},[piece],categories),{totalCartons:2.5,totalBags:0,totalBuckets:0,totalPieces:0});
});
test('piece orders reject fractional pieces and any meter input',()=>{
  assert.doesNotThrow(()=>validateProductQuantities(piece,categories,7,0));
  for(const count of [-1,0.5,NaN,Infinity]) assert.throws(()=>validateProductQuantities(piece,categories,count,0));
  assert.throws(()=>validateProductQuantities(piece,categories,7,2));
  assert.doesNotThrow(()=>validateProductQuantities(carton,categories,2,4));
});
test('piece export and import keep direct unit prices and no package quantity',()=>{
  const row=buildProductRow(piece,categories);
  assert.equal(row.saleMode,'قطعة'); assert.equal(row.packageUnits,0); assert.equal(row.normalUnit,4.95);
  assert(transferFields('STYROFOAM').includes('saleMode')); assert(transferFields('STYROFOAM').includes('normalUnit'));
  const result=buildImportPayload({saleMode:'قطعة',normalUnit:'5.25',vipUnit:'5.25'},piece,categories,'STYROFOAM');
  assert.equal(result.sale_mode,'PIECE'); assert.equal(result.meters_per_carton,0);
  assert.deepEqual(result.prices['عادي'],{pricePerMeter:0,pricePerCarton:5.25});
  assert.throws(()=>buildImportPayload({saleMode:'PIECE',packageUnits:8},piece,categories,'STYROFOAM'));
});
test('changing carton to piece requires explicit piece prices',()=>{
  assert.throws(()=>buildImportPayload({saleMode:'PIECE'},carton,categories,'STYROFOAM'));
  const result=buildImportPayload({saleMode:'PIECE',normalUnit:'0',vipUnit:'0'},carton,categories,'STYROFOAM');
  assert.equal(result.prices['عادي'].pricePerCarton,0);
  assert.throws(()=>buildImportPayload({saleMode:'unknown'},carton,categories,'STYROFOAM'));
});

test('paint color notes preserve multiple colors without inventing a selection',()=>{
  assert.equal(normalizePaintColor('  أبيض، بيج\nأزرق فاتح  '),'أبيض، بيج\nأزرق فاتح');
  assert.equal(normalizePaintColor('   '),undefined);
  assert.equal(normalizePaintColor(undefined),undefined);
  assert.throws(()=>normalizePaintColor('أ'.repeat(501)));
  assert.throws(()=>normalizePaintColor(7));
});
