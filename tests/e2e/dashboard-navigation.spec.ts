import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Admin")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('dashboard loads with sidebar navigation', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    const sidebarLinks = page.locator('a[href*="/dashboard/"]');
    const count = await sidebarLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('navigates to students page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/students"]').first().click();
    await page.waitForURL(/\/dashboard\/students/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/students/);
  });

  test('navigates to inventory page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/inventory"]').first().click();
    await page.waitForURL(/\/dashboard\/inventory/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/inventory/);
  });

  test('navigates to visitors page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/visitors"]').first().click();
    await page.waitForURL(/\/dashboard\/visitors/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/visitors/);
  });

  test('navigates to settings page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/settings"]').first().click();
    await page.waitForURL(/\/dashboard\/settings/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });
});
