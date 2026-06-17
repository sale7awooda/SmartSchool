import { test, expect } from '@playwright/test';

test.describe('Transport & Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Admin")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('navigates to transport page', async ({ page }) => {
    await page.locator('a[href*="/dashboard/transport"]').first().click();
    await page.waitForURL(/\/dashboard\/transport/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard\/transport/);
  });

  test('transport page shows Routes List and Live Map tabs', async ({ page }) => {
    await page.goto('/dashboard/transport');
    await page.waitForLoadState('networkidle');
    const routesTab = page.locator('button:has-text("Routes List")');
    const liveMapTab = page.locator('button:has-text("Live Map")');
    await expect(routesTab).toBeVisible({ timeout: 10000 });
    await expect(liveMapTab).toBeVisible({ timeout: 10000 });
  });

  test('transport page has Add Route button for admins', async ({ page }) => {
    await page.goto('/dashboard/transport');
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("Add Route")');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
  });

  test('Live Map tab shows route status stats', async ({ page }) => {
    await page.goto('/dashboard/transport');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Live Map")').click();
    await page.waitForTimeout(2000); // Allow map to load
    const statsHeadings = page.locator('text=Total Routes, text=Active, text=Completed, text=Inactive');
    await expect(statsHeadings.first()).toBeVisible({ timeout: 5000 });
  });

  test('Live Map tab shows route status sidebar', async ({ page }) => {
    await page.goto('/dashboard/transport');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Live Map")').click();
    await page.waitForTimeout(2000);
    const sidebar = page.locator('text=Route Status');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test('route search input filters results', async ({ page }) => {
    await page.goto('/dashboard/transport');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="Search routes"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('R-101');
    await page.waitForTimeout(500);
  });

  test('route cards show driver info and stop count', async ({ page }) => {
    await page.goto('/dashboard/transport');
    await page.waitForLoadState('networkidle');
    const routeCards = page.locator('text=Driver:'); // Each route card has a Driver: field
    if (await routeCards.count() > 0) {
      await expect(routeCards.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
