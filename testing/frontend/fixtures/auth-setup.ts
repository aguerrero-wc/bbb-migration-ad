import { type Page } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export async function loginViaApi(
  page: Page,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const response = await page.request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login API failed: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  const authData = body.data;

  // Set tokens in localStorage (matching frontend's auth store).
  // The Zustand store reads access_token on initialize() and calls getProfileApi(),
  // so we only need the tokens — user data comes from the API call.
  await page.evaluate(
    (tokens: { accessToken: string; refreshToken: string }) => {
      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
    },
    { accessToken: authData.accessToken, refreshToken: authData.refreshToken },
  );

  return {
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken,
    user: authData.user,
  };
}

export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  });
}
