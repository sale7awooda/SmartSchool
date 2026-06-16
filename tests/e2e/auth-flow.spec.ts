import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page loads and shows quick login buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    const quickLoginBtn = page.locator('button:has-text("Admin"), button:has-text("Staff"), button:has-text("Teacher")').first();
    await expect(quickLoginBtn).toBeVisible();
  });

  test('quick login as admin redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Admin")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('quick login as teacher redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Teacher")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('login with email and password shows error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"], input[name="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"], input[name="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=error, text=Failed, text=invalid').first()).toBeVisible({ timeout: 10000 });
  });
});
