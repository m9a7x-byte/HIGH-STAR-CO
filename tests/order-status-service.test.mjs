import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function service({ fail = false } = {}) {
  const calls=[]; const errors = new Error('رفض تغيير الحالة');
  const supabase={rpc:async(name,args)=>{calls.push({name,args});return {error:fail?errors:null};},from:()=>{throw Error('status must use atomic RPC');}};
  const types=new Proxy({}, {get:(_,key)=>key==='ProductionStatus'?{PENDING_TRANSFER:'PENDING_TRANSFER',PENDING_PAYMENT:'PENDING_PAYMENT'}:{}});
  let source=readFileSync(new URL('../src/lib/db.ts',import.meta.url),'utf8').replace('this.init();','').replaceAll('import.meta.env','({})');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const exports={};new Function('require','exports',outputText)(name=>name==='./supabase'?{supabase}:name==='../types'?types:{},exports);
  const db=exports.db;db.orders=[{id:34,productionStatus:'COMPLETED',totalAmount:11376.96,paidAmount:0,paymentHistory:[]}];
  for(const method of ['fetchOrders','fetchUsers','fetchWalletTransactions'])db[method]=async()=>{calls.push(method);};
  db.logActivity=()=>{};
  return {db,calls,errors};
}
test('service waits for one atomic status RPC and refreshes the order, balance and statement afterwards',async()=>{
  const {db,calls}=service();await db.updateOrderStatus('admin',34,'production','WAITING');
  assert.deepEqual(calls[0],{name:'change_order_production_status',args:{p_order_id:34,p_expected_status:'COMPLETED',p_expected_total:11376.96,p_new_status:'WAITING'}});
  assert.deepEqual(calls.slice(1).sort(),['fetchOrders','fetchUsers','fetchWalletTransactions'].sort());
});
test('service propagates errors and leaves cached orders intact until the server confirms success',async()=>{
  const {db,calls,errors}=service({fail:true});const before=structuredClone(db.orders);
  await assert.rejects(db.updateOrderStatus('admin',34,'production','WAITING'),errors);
  assert.deepEqual(db.orders,before);assert.equal(calls.length,1);
});
test('service sends the status and total originally shown by the confirmation dialog',async()=>{
  const {db,calls}=service();await db.updateOrderStatus('admin',34,'production','WAITING',{productionStatus:'IN_PROGRESS',totalAmount:1});
  assert.equal(calls[0].args.p_expected_total,1);assert.equal(calls[0].args.p_expected_status,'IN_PROGRESS');
});
test('service refuses to delete completed or paid orders without removing cached records',async()=>{
  const {db}=service();await assert.rejects(db.deleteOrder('admin',34,false),/لا يمكن حذف/);assert.equal(db.orders.length,1);
  db.orders[0].productionStatus='PENDING_TRANSFER';db.orders[0].paidAmount=1;
  await assert.rejects(db.deleteOrder('admin',34,false),/لا يمكن حذف/);assert.equal(db.orders.length,1);
});
