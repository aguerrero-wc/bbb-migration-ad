import { test, expect } from '@playwright/test';

import { LoginPage } from '../../../fixtures/login.fixture';
import { LayoutPage } from '../../../fixtures/layout.fixture';

const ADMIN_EMAIL = 'admin@bbb.local';
const ADMIN_PASSWORD = 'Admin1234!';

test.describe('Login', () => {
  test('should login admin and redirect to /rooms', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    // LoginForm navigates to /rooms on success via react-router navigate
    await page.waitForURL('**/rooms', { timeout: 10000 });

    const layout = new LayoutPage(page);
    await expect(layout.userName).toBeVisible();
  });

  test('should show error on wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, 'WrongPassword1!');

    // LoginForm shows API error in data-testid="login-error" div
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.submitButton.click();

    // Zod loginSchema: email requires valid email, password requires min 8 chars
    const emailError = page.getByTestId('login-email-error');
    await expect(emailError).toBeVisible();
  });

  test('should navigate to register page via link', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.registerLink.click();

    await page.waitForURL('**/auth/register');
  });
});
