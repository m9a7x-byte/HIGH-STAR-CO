import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInsightsHandler } from '../supabase/functions/factory-insights/handler.ts';

test('the web build cannot embed the server Gemini key', () => {
  const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  assert.equal(config.includes('JSON.stringify(env.GEMINI_API_KEY)'), false);
});

const metrics = { month: 10, inventoryInvestment: 100, totalExpenses: 20, savings: 10, hourly: 1 };
const request = (body = metrics, authorization = 'Bearer test') => new Request('https://example.test', { method: 'POST', headers: { authorization, origin: 'https://v.high-star.iq' }, body: JSON.stringify(body) });
const insights = Array.from({ length: 3 }, () => ({ title: 'title', text: 'text' }));
const dependencies = { authenticate: async () => ({ id: 'id', role: 'ADMIN' }), reserve: async () => true, generate: async () => insights };

test('insights reject missing sessions, agents and suspended staff', async () => {
  assert.equal((await createInsightsHandler(dependencies)(request(metrics, ''))).status, 401);
  for (const actor of [null, { id: 'id', role: 'AGENT' }, { id: 'id', role: 'ADMIN', status: 'suspended' }]) {
    const handler = createInsightsHandler({ ...dependencies, authenticate: async () => actor, generate: async () => { throw new Error('must not run'); } });
    assert.equal((await handler(request())).status, actor ? 403 : 401);
  }
});
test('insights validate metrics and enforce server rate limits', async () => {
  assert.equal((await createInsightsHandler(dependencies)(request({ ...metrics, month: 12 }))).status, 400);
  assert.equal((await createInsightsHandler(dependencies)(request({ ...metrics, hourly: -1 }))).status, 400);
  assert.equal((await createInsightsHandler({ ...dependencies, reserve: async () => false })(request())).status, 429);
});
test('authorized staff receive insights without credentials, including on upstream failure', async () => {
  const response = await createInsightsHandler(dependencies)(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { insights });
  const failed = await createInsightsHandler({ ...dependencies, generate: async () => { throw new Error('secret-key'); } })(request());
  assert.equal(failed.status, 502);
  assert(!((await failed.text()).includes('secret-key')));
});
