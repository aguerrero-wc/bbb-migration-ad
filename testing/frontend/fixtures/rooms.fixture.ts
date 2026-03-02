import { type Locator, type Page } from '@playwright/test';

export class RoomsPage {
  readonly page: Page;
  readonly container: Locator;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly empty: Locator;
  readonly formDialog: Locator;
  readonly formNameInput: Locator;
  readonly formDescriptionInput: Locator;
  readonly formSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId('rooms-page');
    this.createButton = page.getByTestId('create-room-button');
    this.searchInput = page.getByTestId('rooms-search');
    this.loading = page.getByTestId('rooms-loading');
    this.error = page.getByTestId('rooms-error');
    this.empty = page.getByTestId('rooms-empty');
    this.formDialog = page.getByTestId('room-form-dialog');
    this.formNameInput = page.getByTestId('room-form-name');
    this.formDescriptionInput = page.getByTestId('room-form-description');
    this.formSubmitButton = page.getByTestId('room-form-submit');
  }

  async goto(): Promise<void> {
    await this.page.goto('/rooms');
  }

  roomCard(id: string): Locator {
    return this.page.getByTestId(`room-card-${id}`);
  }

  joinButton(id: string): Locator {
    return this.page.getByTestId(`join-room-${id}`);
  }

  editButton(id: string): Locator {
    return this.page.getByTestId(`edit-room-${id}`);
  }

  deleteButton(id: string): Locator {
    return this.page.getByTestId(`delete-room-${id}`);
  }
}
