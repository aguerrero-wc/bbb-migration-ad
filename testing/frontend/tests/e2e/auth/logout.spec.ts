import { test, expect } from '@playwright/test';

import { LayoutPage } from '../../../fixtures/layout.fixture';
import { loginViaApi } from '../../../fixtures/auth-setup';

const ADMIN_EMAIL = 'admin@bbb.local';
const ADMIN_PASSWORD = 'Admin1234!';

test.describe('Logout', () => {
  test('should logout and redirect to login page', async ({ page }) => {
    // Login via API for speed — sets access_token and refresh_token in localStorage
    await page.goto('/');
    await loginViaApi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/rooms');

    const layout = new LayoutPage(page);
    await expect(layout.logoutButton).toBeVisible({ timeout: 10000 });
    await layout.logoutButton.click();

    // Auth store logout() uses window.location.href = '/auth/login' (full page reload)
    await page.waitForURL('**/auth/login', { timeout: 10000 });
  });

  test('should clear localStorage after logout', async ({ page }) => {
    await page.goto('/');
    await loginViaApi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/rooms');

    const layout = new LayoutPage(page);
    await expect(layout.logoutButton).toBeVisible({ timeout: 10000 });
    await layout.logoutButton.click();

    await page.waitForURL('**/auth/login', { timeout: 10000 });

    // Auth store removes both token keys on logout
    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(accessToken).toBeNull();

    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
    expect(refreshToken).toBeNull();
  });
});
