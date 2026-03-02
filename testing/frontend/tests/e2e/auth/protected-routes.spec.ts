import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure no auth state — navigate first so we have a page context for localStorage
    await page.goto('/auth/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('/rooms without auth redirects to /auth/login', async ({ page }) => {
    // ProtectedRoute calls initialize() → no access_token → navigate to /auth/login
    await page.goto('/rooms');
    await page.waitForURL('**/auth/login', { timeout: 10000 });
  });

  test('/reservations without auth redirects to /auth/login', async ({ page }) => {
    await page.goto('/reservations');
    await page.waitForURL('**/auth/login', { timeout: 10000 });
  });

  test('/recordings without auth redirects to /auth/login', async ({ page }) => {
    await page.goto('/recordings');
    await page.waitForURL('**/auth/login', { timeout: 10000 });
  });
});
