import { type Locator, type Page } from '@playwright/test';

export class LayoutPage {
  readonly page: Page;
  readonly layout: Locator;
  readonly header: Locator;
  readonly userName: Locator;
  readonly logoutButton: Locator;
  readonly navRooms: Locator;
  readonly navReservations: Locator;
  readonly navRecordings: Locator;

  constructor(page: Page) {
    this.page = page;
    this.layout = page.getByTestId('main-layout');
    this.header = page.getByTestId('main-header');
    this.userName = page.getByTestId('user-name');
    this.logoutButton = page.getByTestId('logout-button');
    this.navRooms = page.getByTestId('nav-link-rooms');
    this.navReservations = page.getByTestId('nav-link-reservations');
    this.navRecordings = page.getByTestId('nav-link-recordings');
  }
}
