import { test, expect } from '@playwright/test';

test.describe('Visitor Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Admin")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('navigates to visitors page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/visitors"]').first().click();
    await page.waitForURL(/\/dashboard\/visitors/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/visitors/);
  });

  test('visitors page shows check-in modal', async ({ page }) => {
    await page.goto('/dashboard/visitors');
    await page.waitForLoadState('networkidle');
    const checkInBtn = page.locator('button:has-text("Check In"), button:has-text("+"), button:has-text("New")').first();
    await expect(checkInBtn).toBeVisible({ timeout: 10000 });
    await checkInBtn.click();
    await expect(page.locator('input[placeholder*="Name"], input[name="name"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('visitors page has search', async ({ page }) => {
    await page.goto('/dashboard/visitors');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });
});
