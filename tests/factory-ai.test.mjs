import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the web build cannot embed the server Gemini key', () => {
  const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  assert.equal(config.includes('JSON.stringify(env.GEMINI_API_KEY)'), false);
});
