import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page loads and shows quick login buttons', async ({ page }) => {
    await page.goto('/');
    // Page uses a card-based layout (no h1/h2); look for the sign-in button text
    await expect(page.locator('button:has-text("Sign In to Dashboard")')).toBeVisible();
    const quickLoginBtn = page.locator('button:has-text("Admin"), button:has-text("Staff"), button:has-text("Teacher")').first();
    await expect(quickLoginBtn).toBeVisible();
  });

  test('quick login as admin redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    // First login triggers auto-provision (creates Auth user + DB row), can be slow
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 45000 }),
      page.locator('button:has-text("Admin")').click(),
    ]);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('quick login as teacher redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 45000 }),
      page.locator('button:has-text("Teacher")').click(),
    ]);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('login with email and password shows error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    // Email input is type="text" with no name attribute; identify by placeholder
    await page.locator('input[placeholder="admin@smartschool.com"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=invalid').first()).toBeVisible({ timeout: 10000 });
  });
});
