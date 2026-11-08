import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('import does not replace the entered bag price with a stale pallet total', () => {
  const source = readFileSync(new URL('../src/features/admin/catalog/ProductImportExportSubTab.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /normalUnit\s*=\s*roundMoney\(normalPallet\s*\/\s*packageUnits\)/);
});
