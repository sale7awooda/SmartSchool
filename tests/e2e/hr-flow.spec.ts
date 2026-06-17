import { test, expect } from '@playwright/test';

test.describe('HR Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Admin")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('navigates to HR page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/hr"]').first().click();
    await page.waitForURL(/\/dashboard\/hr/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/hr/);
  });

  test('HR page loads with all tabs', async ({ page }) => {
    await page.goto('/dashboard/hr');
    await page.waitForLoadState('networkidle');
    const tabNames = ['Directory', 'Attendance', 'Leave', 'Payroll', 'Financials'];
    for (const name of tabNames) {
      await expect(page.locator(`button:has-text("${name}")`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('switches between HR tabs', async ({ page }) => {
    await page.goto('/dashboard/hr');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Payroll")').first().click();
    await expect(page.locator('text=Payroll').first()).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Leave")').first().click();
    await expect(page.locator('text=Leave').first()).toBeVisible({ timeout: 5000 });
  });

  test('opens staff profile modal', async ({ page }) => {
    await page.goto('/dashboard/hr');
    await page.waitForLoadState('networkidle');
    const staffEntry = page.locator('text=Edna Krabappel').first();
    await expect(staffEntry).toBeVisible({ timeout: 10000 });
    await staffEntry.click();
    // Profile modal should appear
    await expect(page.locator('[role="dialog"], .modal, .fixed').first()).toBeVisible({ timeout: 5000 });
  });
});
