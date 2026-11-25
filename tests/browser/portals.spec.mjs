import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.__errors = [];
  page.on('pageerror', error => page.__errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
});
test.afterEach(async ({ page }) => {
  await expect(page.getByTestId('runtime-error')).toHaveCount(0);
  expect(page.__errors).toEqual([]);
});

const adminTabs = ['overview','production','orders','invoice_merge','sales','reports','profit_calculator','catalog','agents','staff','activity_log','settings','presence','factory','safe'];
for (const tab of adminTabs) test(`admin page ${tab} renders with populated records`, async ({ page }) => {
  await page.goto(`/tests/browser/index.html?view=admin&tab=${tab}`);
  await expect(page.getByTestId('page-content')).not.toBeEmpty();
  await page.waitForTimeout(850);
  await expect(page.getByTestId('page-content')).not.toContainText('NaN');
});
for (const name of ['StaffLoginPage','AgentLoginPage','ForgotPasswordPage','ResetPasswordPage','ConfirmEmailPage','ConfirmEmailChangePage','AcceptInvitePage','MagicLinkPage','OperationSuccessPage','OperationFailedPage','LandingPage','AgentPortalPage']) test(`public/auth page ${name}`, async ({ page }) => {
  await page.goto(`/tests/browser/index.html?view=public&page=${name}`);
  await expect(page.getByTestId('page-content')).not.toBeEmpty();
  await page.waitForTimeout(250);
});
for (const view of ['profile','notifications','agent','factory']) test(`${view} page renders on mobile and desktop`, async ({ page }) => {
  await page.goto(`/tests/browser/index.html?view=${view}&role=${view === 'agent' ? 'agent' : 'admin'}`);
  await page.waitForTimeout(850);
  if (view === 'notifications') await page.getByRole('button').first().click();
  await expect(page.getByTestId('page-content')).not.toBeEmpty();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
});
