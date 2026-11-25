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

test('agent can see and paginate the shared production queue without any personal orders', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/browser/index.html?view=agent&role=agent&noPersonalOrders');
  await page.getByRole('button', { name: 'الإنتاج', exact: true }).click();
  await expect(page.getByRole('cell', { name: /#500/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: /وكيل آخر/ })).toHaveCount(10);
  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(page.getByRole('cell', { name: /#510/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: /#500/ })).toHaveCount(0);
});

test('mobile agent tabs open at the top, count distinct products and keep the profile in My account', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'تنقّل الوكيل' });
  const profile = page.getByText('كركوك تجريبي', { exact: true });
  const checkWidth = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));
  };
  const navigateFromBottom = async (label) => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const button = nav.getByRole('button', { name: label });
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await checkWidth();
  };

  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/tests/browser/index.html?view=agent&role=agent&mobilePreview');
  await expect(profile).toBeHidden();
  await expect(nav.getByRole('button', { name: /عدد الأصناف: 0/ })).toBeVisible();
  const amount = code => page.getByRole('spinbutton', { name: `كرتون ${code}`, exact: true });
  await amount('TEST-1').fill('20');
  await amount('TEST-4').fill('1');
  await amount('TEST-5').fill('6');
  await expect(nav.getByRole('button', { name: /عدد الأصناف: 3/ })).toBeVisible();
  await amount('TEST-1').fill('25');
  await expect(nav.getByRole('button', { name: /عدد الأصناف: 3/ })).toBeVisible();
  await amount('TEST-5').fill('0');
  await expect(nav.getByRole('button', { name: /عدد الأصناف: 2/ })).toBeVisible();
  await amount('TEST-5').fill('6');

  await navigateFromBottom(/عدد الأصناف: 3/);
  await expect(page.getByText('25 كارتون', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'قسم المنتجات' })).toBeHidden();
  await expect(profile).toBeHidden();
  await page.screenshot({ path: 'test-results/mobile-agent-cart.png', animations: 'disabled' });

  await navigateFromBottom('طلباتي');
  const orders = page.getByRole('table', { name: 'طلباتي' });
  await expect(orders.getByRole('button', { name: 'معاينة الطلب #34', exact: true })).toBeVisible();
  await expect(profile).toBeHidden();
  await page.screenshot({ path: 'test-results/mobile-agent-orders.png', animations: 'disabled' });

  await navigateFromBottom('الإنتاج');
  const queue = page.getByRole('table', { name: 'جدول الإنتاج' });
  await expect(queue.getByRole('cell', { name: /#500/ })).toBeVisible();
  await expect(profile).toBeHidden();
  await page.screenshot({ path: 'test-results/mobile-agent-production.png', animations: 'disabled' });

  await navigateFromBottom('حسابي');
  const account = page.getByRole('region', { name: 'حسابي' });
  await expect(account.getByText('كركوك تجريبي', { exact: true })).toBeVisible();
  await expect(account.getByText('$5,176.96', { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'كشف الحساب' }).getByText('#79', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-agent-account.png', animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 700 });
  await navigateFromBottom('المنتجات');
  await expect(page.getByRole('group', { name: 'قسم المنتجات' })).toBeInViewport();
  await expect(profile).toBeHidden();

  await page.setViewportSize({ width: 320, height: 640 });
  for (const [label, table] of [['طلباتي', 'طلباتي'], ['الإنتاج', 'جدول الإنتاج'], ['حسابي', 'كشف الحساب']]) {
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('table', { name: table })).toBeVisible();
    await checkWidth();
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(nav).toBeHidden();
  await expect(page.getByRole('button', { name: 'طلباتي السابقة', exact: true })).toBeVisible();
  await expect(profile.filter({ visible: true })).toHaveCount(1);
});

test('mobile order editing has its own aligned column and a compact button', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/tests/browser/index.html?view=agent&role=agent&mobilePreview');
  await page.getByRole('navigation', { name: 'تنقّل الوكيل' }).getByRole('button', { name: 'طلباتي' }).click();
  const orders = page.getByRole('table', { name: 'طلباتي' });
  const row = orders.getByRole('row').filter({ has: page.getByRole('button', { name: 'معاينة الطلب #34' }) });
  const edit = row.getByRole('button', { name: 'تعديل الطلب #34' });
  await expect(orders.getByRole('columnheader', { name: 'تعديل', exact: true })).toBeVisible();
  await expect(edit).toBeVisible();
  expect(await edit.locator('svg').evaluate(svg => svg.getBoundingClientRect().width)).toBe(14);
  expect((await edit.boundingBox()).height).toBeGreaterThanOrEqual(44);
  const amount = row.getByRole('cell', { name: '$100', exact: true });
  const amountHeader = orders.getByRole('columnheader', { name: 'المبلغ' });
  expect(await amount.evaluate(cell => getComputedStyle(cell).textAlign)).toBe(await amountHeader.evaluate(cell => getComputedStyle(cell).textAlign));
  expect(await amount.evaluate(cell => getComputedStyle(cell).direction)).toBe('rtl');
  await edit.click();
  await expect(page.getByText('أنت حالياً تعدل الطلب #34', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('agent can edit their mobile profile from My account and return with their cart', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/tests/browser/index.html?view=agent&role=agent&mobilePreview');
  await page.getByRole('spinbutton', { name: 'كرتون TEST-1' }).fill('20');
  const nav = page.getByRole('navigation', { name: 'تنقّل الوكيل' });
  await nav.getByRole('button', { name: 'حسابي', exact: true }).click();
  await page.getByRole('button', { name: 'تعديل الحساب', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'تعديل الحساب', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'إشعارات هذا الجهاز', exact: true })).toBeAttached();
  await expect(page.getByRole('table', { name: 'كشف الحساب' })).toBeHidden();
  const fullName = page.getByLabel(ar.batch4.k563, { exact: true });
  await expect(fullName).toHaveValue('كركوك تجريبي');
  await page.screenshot({ path: 'test-results/mobile-agent-profile-edit.png', animations: 'disabled' });
  await fullName.fill('كركوك تجريبي محدّث');
  await page.getByRole('button', { name: ar.batch4.k788, exact: true }).click();
  const saved = page.getByRole('alert').filter({ hasText: ar.profile_tab.updated });
  await expect(saved).toBeVisible();
  expect((await saved.boundingBox()).y + (await saved.boundingBox()).height).toBeLessThan((await nav.boundingBox()).y);
  await page.getByRole('button', { name: 'رجوع', exact: true }).click();
  await expect(page.getByRole('region', { name: 'حسابي' }).getByText('كركوك تجريبي محدّث')).toBeVisible();
  await expect(nav.getByRole('button', { name: /عدد الأصناف: 1/ })).toBeVisible();
});

test('mobile notifications fit the viewport, scroll inside and return focus when closed', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/tests/browser/index.html?view=agent&role=agent&mobilePreview');
  const bell = page.getByRole('button', { name: 'الإشعارات', exact: true });
  await bell.click();
  const notifications = page.getByRole('region', { name: 'الإشعارات' });
  const close = notifications.getByRole('button', { name: 'إغلاق', exact: true });
  await expect(close).toBeFocused();
  const box = await notifications.boundingBox();
  expect(box.x).toBeGreaterThan(0);
  expect(box.x + box.width).toBeLessThan(320);
  expect(box.y + box.height).toBeLessThan(640);
  const list = notifications.locator('.overflow-y-auto');
  expect(await list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-agent-notifications.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(notifications).toBeHidden();
  await expect(bell).toBeFocused();
  await bell.click();
  await close.click();
  await expect(bell).toHaveAttribute('aria-expanded', 'false');
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
