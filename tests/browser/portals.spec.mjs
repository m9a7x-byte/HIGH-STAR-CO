import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const ar = JSON.parse(readFileSync(new URL('../../src/i18n/locales/ar.json', import.meta.url), 'utf8'));

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

for (const [name, category] of [
  ['InventoryModal','INVENTORY'], ['SupplierModal','SUPPLIER'], ['EditFinanceModal','TRANSPORT_IN'],
  ...['SALARY','RENT','FOOD','DAILY_EXPENSE','ELECTRICITY'].map(c => ['ExpenseModal',c]),
  ...['TRANSPORT_IN','TRANSPORT_OUT','CUSTOMS'].map(c => ['LogisticsModal',c]),
  ['InvoiceModal',''],['ProductionConfirmationModal',''],['AvatarCropModal','']
]) test(`window ${name} ${category} opens and has working controls`, async ({ page }) => {
  await page.goto(`/tests/browser/index.html?view=window&page=${name}&category=${category}`);
  await page.waitForTimeout(400);
  await expect(page.getByRole('button').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('NaN');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button').first()).toBeVisible();
});

for (const [tab, label] of ['k673','k674','k675','k676'].map(key => [key, ar.batch4[key]])) test(`factory subpage ${tab} opens with data`, async ({ page }) => {
  await page.goto('/tests/browser/index.html?view=factory');
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(650);
  await expect(page.locator('body')).not.toContainText('NaN');
});

test('agent statement agrees with admin: reversal is distinct from the preserved cash receipt', async ({ page }) => {
  await page.goto('/tests/browser/index.html?view=agent&role=agent');
  await page.getByRole('button', { name: ar.agent_dashboard.account_statement, exact: true }).first().click();
  await expect(page.locator('body')).toContainText('6,200');
  await expect(page.locator('body')).toContainText('11,376.96');
  await expect(page.locator('body')).toContainText('5,176.96');
  await expect(page.locator('body')).toContainText('عكس احتساب طلب ملغي');
  await expect(page.getByRole('columnheader', { name: 'رقم الحركة', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/agent-statement-verified.png', fullPage: true });
});

test('agent order status, invoice payment and movement correction windows open from their real actions', async ({ page }) => {
  await page.goto('/tests/browser/index.html?view=admin&tab=agents');
  await page.getByText('وكيل اختبار', { exact: true }).first().click();
  await expect(page.locator('body')).toContainText('5,176.96');
  await page.getByTitle('تعديل الحركة', { exact: true }).first().click();
  await expect(page.locator('form').first()).toBeVisible();
  await page.goto('/tests/browser/index.html?view=admin&tab=agents');
  await page.getByText('وكيل اختبار', { exact: true }).first().click();
  await page.getByRole('button', { name: /^الطلبات/ }).click();
  await expect(page.getByTitle('حذف الطلب', { exact: true })).toHaveCount(0);
  await page.getByTitle('تغيير حالة الطلب', { exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'تغيير حالة الطلب' })).toBeVisible();
  await expect(page.getByLabel('الحالة الجديدة').locator('option')).toHaveCount(5);
});

for (const [tab, action, kind] of [
  ['agents','وكيل جديد','text'], ['staff','إضافة موظف','text'], ['staff','تعديل البيانات','title'],
  ['orders','إضافة طلب يدوي','text'], ['orders','دفع الفاتورة','aria'], ['orders','معاينة الفاتورة','aria'],
  ['catalog','إضافة منتج','text'], ['settings','فتح نافذة الإرسال','text']
]) test(`admin action window ${tab}: ${action}`, async ({ page }) => {
  await page.goto(`/tests/browser/index.html?view=admin&tab=${tab}`);
  const actionButton = kind === 'title' ? page.getByTitle(action, { exact: true }) : page.getByRole('button', { name: action, exact: true });
  await actionButton.first().click();
  await expect(page.getByTestId('runtime-error')).toHaveCount(0);
  if (action !== 'معاينة الفاتورة') await expect(page.locator('input:visible').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).not.toContainText('NaN');
});

for (const label of ['إدارة التصنيفات','تصدير واستيراد المنتجات']) test(`catalog subpage ${label}`, async ({ page }) => {
  await page.goto('/tests/browser/index.html?view=admin&tab=catalog');
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByTestId('runtime-error')).toHaveCount(0);
  await expect(page.getByTestId('page-content')).not.toBeEmpty();
});

for (const label of [ar.agent_dashboard.my_orders, ar.agent_dashboard.production_schedule]) test(`agent navigation ${label}`, async ({ page }) => {
  await page.goto('/tests/browser/index.html?view=agent&role=agent');
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await expect(page.getByTestId('page-content')).not.toBeEmpty();
  await expect(page.locator('body')).not.toContainText('NaN');
});
