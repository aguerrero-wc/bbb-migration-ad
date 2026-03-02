import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

import { RegisterPage } from '../../../fixtures/register.fixture';

test.describe('Register', () => {
  test('should register new user and redirect to /rooms', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    const uniqueEmail = `test-${randomUUID().slice(0, 8)}@test.local`;
    await registerPage.register('Test', 'User', uniqueEmail, 'TestPass1!', 'TestPass1!');

    // RegisterForm navigates to /rooms on success via react-router navigate
    await page.waitForURL('**/rooms', { timeout: 10000 });
  });

  test('should show error on duplicate email', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Use the seeded admin email — backend returns 409 Conflict
    await registerPage.register('Admin', 'Dup', 'admin@bbb.local', 'Admin1234!', 'Admin1234!');

    // RegisterForm shows API error in data-testid="register-error" div
    await expect(registerPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show password validation error for weak password', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    const uniqueEmail = `test-${randomUUID().slice(0, 8)}@test.local`;
    await registerPage.register('Test', 'User', uniqueEmail, 'weak', 'weak');

    // Zod registerSchema requires: min 8 chars, uppercase, lowercase, number, special char
    const passwordError = page.getByTestId('register-password-error');
    await expect(passwordError).toBeVisible();
  });

  test('should navigate to login page via link', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.loginLink.click();

    await page.waitForURL('**/auth/login');
  });
});
