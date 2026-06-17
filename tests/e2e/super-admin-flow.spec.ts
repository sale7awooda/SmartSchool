import { test, expect } from '@playwright/test';

test.describe('Super Admin Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('input[name="email"]').fill('sale7awooda@gmail.com');
    await page.locator('input[name="password"]').fill('Sale7k0cash^*');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });
  });

  test('redirects super admin to dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/super-admin/);
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 5000 });
  });

  test('sidebar has all navigation items', async ({ page }) => {
    const navItems = ['Dashboard', 'Schools', 'Subscription Plans', 'Backups', 'System Health', 'Users', 'Announcements', 'Audit Log'];
    for (const item of navItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('navigates to schools page', async ({ page }) => {
    await page.locator('a[href*="/super-admin/schools"]').first().click();
    await page.waitForURL(/\/super-admin\/schools/, { timeout: 10000 });
    await expect(page.locator('text=Schools').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to subscriptions page', async ({ page }) => {
    await page.locator('a[href*="/super-admin/subscriptions"]').first().click();
    await page.waitForURL(/\/super-admin\/subscriptions/, { timeout: 10000 });
    await expect(page.locator('text=Subscription Plans').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to backups page', async ({ page }) => {
    await page.locator('a[href*="/super-admin/backups"]').first().click();
    await page.waitForURL(/\/super-admin\/backups/, { timeout: 10000 });
    await expect(page.locator('text=Backups').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to health page', async ({ page }) => {
    await page.locator('a[href*="/super-admin/health"]').first().click();
    await page.waitForURL(/\/super-admin\/health/, { timeout: 10000 });
    await expect(page.locator('text=System Health').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to users page', async ({ page }) => {
    await page.locator('a[href*="/super-admin/users"]').first().click();
    await page.waitForURL(/\/super-admin\/users/, { timeout: 10000 });
    await expect(page.locator('text=Users').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to announcements page', async ({ page }) => {
    await page.locator('a[href*="/super-admin/announcements"]').first().click();
    await page.waitForURL(/\/super-admin\/announcements/, { timeout: 10000 });
    await expect(page.locator('text=Announcements').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to audit page', async ({ page }) => {
    await page.locator('a[href*="/super-admin/audit"]').first().click();
    await page.waitForURL(/\/super-admin\/audit/, { timeout: 10000 });
    await expect(page.locator('text=Audit Log').first()).toBeVisible({ timeout: 5000 });
  });

  test('theme toggle works in sidebar', async ({ page }) => {
    const themeBtn = page.locator('button[class*="theme"]').first();
    await expect(themeBtn).toBeVisible({ timeout: 5000 });
    await themeBtn.click();
  });

  test('sidebar collapse toggle works', async ({ page }) => {
    const collapseBtn = page.locator('button:has-text("Collapse")').first();
    await expect(collapseBtn).toBeVisible({ timeout: 5000 });
    await collapseBtn.click();
    await expect(collapseBtn).not.toBeVisible({ timeout: 3000 });
  });

  test('add school modal opens and closes', async ({ page }) => {
    await page.locator('a[href*="/super-admin/schools"]').first().click();
    await page.waitForURL(/\/super-admin\/schools/, { timeout: 10000 });
    await page.locator('button:has-text("Add School")').first().click();
    await expect(page.locator('text=Add School').first()).toBeVisible({ timeout: 3000 });
    await page.locator('button:has-text("Cancel")').first().click();
  });

  test('school search works', async ({ page }) => {
    await page.locator('a[href*="/super-admin/schools"]').first().click();
    await page.waitForURL(/\/super-admin\/schools/, { timeout: 10000 });
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('Test');
  });

  test('users page search works', async ({ page }) => {
    await page.locator('a[href*="/super-admin/users"]').first().click();
    await page.waitForURL(/\/super-admin\/users/, { timeout: 10000 });
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('admin');
  });

  test('announcements page loads with list', async ({ page }) => {
    await page.locator('a[href*="/super-admin/announcements"]').first().click();
    await page.waitForURL(/\/super-admin\/announcements/, { timeout: 10000 });
    await expect(page.locator('text=Add Announcement').first()).toBeVisible({ timeout: 5000 });
  });

  test('audit page loads with table', async ({ page }) => {
    await page.locator('a[href*="/super-admin/audit"]').first().click();
    await page.waitForURL(/\/super-admin\/audit/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    const tableHeaders = ['Time', 'Admin', 'Action', 'Resource'];
    for (const header of tableHeaders) {
      await expect(page.locator(`th:has-text("${header}")`).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('health page loads KPI cards', async ({ page }) => {
    await page.locator('a[href*="/super-admin/health"]').first().click();
    await page.waitForURL(/\/super-admin\/health/, { timeout: 10000 });
    await expect(page.locator('text=Total Schools').first()).toBeVisible({ timeout: 5000 });
  });

  test('subscriptions page loads plans', async ({ page }) => {
    await page.locator('a[href*="/super-admin/subscriptions"]').first().click();
    await page.waitForURL(/\/super-admin\/subscriptions/, { timeout: 10000 });
    await expect(page.locator('text=Add Plan').first()).toBeVisible({ timeout: 5000 });
  });
});
