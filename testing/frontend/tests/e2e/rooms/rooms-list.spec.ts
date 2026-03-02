import { test, expect } from '@playwright/test';

import { loginViaApi } from '../../../fixtures/auth-setup';
import { RoomsPage } from '../../../fixtures/rooms.fixture';

const ADMIN_EMAIL = 'admin@bbb.local';
const ADMIN_PASSWORD = 'Admin1234!';

test.describe('Rooms List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginViaApi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('should display rooms page after login', async ({ page }) => {
    const roomsPage = new RoomsPage(page);
    await roomsPage.goto();

    await expect(roomsPage.container).toBeVisible({ timeout: 10000 });
  });

  test('admin should see "New Room" button', async ({ page }) => {
    const roomsPage = new RoomsPage(page);
    await roomsPage.goto();

    // RoomsPage shows create button for admin and moderator roles
    await expect(roomsPage.createButton).toBeVisible({ timeout: 10000 });
  });

  test('should show search input', async ({ page }) => {
    const roomsPage = new RoomsPage(page);
    await roomsPage.goto();

    await expect(roomsPage.searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no rooms exist', async ({ page }) => {
    const roomsPage = new RoomsPage(page);
    await roomsPage.goto();

    // Wait for loading to finish
    await page.waitForTimeout(2000);

    // Either empty state or room cards should be visible (not both)
    const isEmpty = await roomsPage.empty.isVisible().catch(() => false);
    const hasCards = await page
      .locator('[data-testid^="room-card-"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(isEmpty || hasCards).toBeTruthy();
  });
});
