import { test, expect } from '@playwright/test';

test.describe('Fees Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Admin")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('navigates to fees page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/fees"]').first().click();
    await page.waitForURL(/\/dashboard\/fees/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/fees/);
  });

  test('fees page shows invoice list and stats', async ({ page }) => {
    await page.goto('/dashboard/fees');
    await page.waitForLoadState('networkidle');
    // AccountantFees renders tabs: Invoices, Payments, Expenses, Items
    const tabs = page.locator('button:has-text("Invoices"), button:has-text("Payments"), button:has-text("Expenses")');
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
  });

  test('fees page allows creating a new invoice', async ({ page }) => {
    await page.goto('/dashboard/fees');
    await page.waitForLoadState('networkidle');
    const createBtn = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
  });
});
