import { test, expect } from '@playwright/test';

import { loginViaApi } from '../../../fixtures/auth-setup';
import { RoomsPage } from '../../../fixtures/rooms.fixture';

const VIEWER_EMAIL = 'viewer@bbb.local';
const VIEWER_PASSWORD = 'Viewer1234!';
const ADMIN_EMAIL = 'admin@bbb.local';
const ADMIN_PASSWORD = 'Admin1234!';

test.describe('Room Permissions', () => {
  test('viewer should NOT see "New Room" button', async ({ page }) => {
    await page.goto('/');
    await loginViaApi(page, VIEWER_EMAIL, VIEWER_PASSWORD);

    const roomsPage = new RoomsPage(page);
    await roomsPage.goto();

    // RoomsPage only shows create button for admin/moderator, not viewer
    await expect(roomsPage.container).toBeVisible({ timeout: 10000 });
    await expect(roomsPage.createButton).not.toBeVisible();
  });

  test('admin should see all action buttons on room cards', async ({ page }) => {
    await page.goto('/');
    await loginViaApi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const roomsPage = new RoomsPage(page);
    await roomsPage.goto();
    await expect(roomsPage.container).toBeVisible({ timeout: 10000 });

    // Wait for rooms to load
    await page.waitForTimeout(2000);

    // Check if there are any room cards
    const firstCard = page.locator('[data-testid^="room-card-"]').first();
    const hasCards = await firstCard.isVisible().catch(() => false);

    if (hasCards) {
      // Extract room ID from the card's test ID
      const testId = await firstCard.getAttribute('data-testid');
      const roomId = testId?.replace('room-card-', '');

      if (roomId) {
        // Admin sees join (always), edit (admin/moderator), delete (admin only)
        await expect(roomsPage.joinButton(roomId)).toBeVisible();
        await expect(roomsPage.editButton(roomId)).toBeVisible();
        await expect(roomsPage.deleteButton(roomId)).toBeVisible();
      }
    }
  });

  test('viewer should see join button but NOT edit/delete', async ({ page }) => {
    await page.goto('/');
    await loginViaApi(page, VIEWER_EMAIL, VIEWER_PASSWORD);

    const roomsPage = new RoomsPage(page);
    await roomsPage.goto();
    await expect(roomsPage.container).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(2000);

    const firstCard = page.locator('[data-testid^="room-card-"]').first();
    const hasCards = await firstCard.isVisible().catch(() => false);

    if (hasCards) {
      const testId = await firstCard.getAttribute('data-testid');
      const roomId = testId?.replace('room-card-', '');

      if (roomId) {
        // Viewer sees join but NOT edit/delete (RoomCard checks userRole)
        await expect(roomsPage.joinButton(roomId)).toBeVisible();
        await expect(roomsPage.editButton(roomId)).not.toBeVisible();
        await expect(roomsPage.deleteButton(roomId)).not.toBeVisible();
      }
    }
  });
});
