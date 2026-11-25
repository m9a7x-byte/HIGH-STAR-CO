import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', testMatch: '**/*.spec.mjs', workers: 2, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:3016', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-report.json' }]],
  webServer: { command: 'npx vite --config tests/browser/vite.config.mjs', url: 'http://127.0.0.1:3016/tests/browser/index.html', reuseExistingServer: false, timeout: 60000 }
});
