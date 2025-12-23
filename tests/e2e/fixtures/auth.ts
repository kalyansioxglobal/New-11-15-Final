import { test as base, expect } from "@playwright/test";

export interface TestUser {
  id: number;
  email: string;
  role: string;
  fullName: string;
}

type AuthFixtures = {
  loginAs: (email: string) => Promise<TestUser>;
  logout: () => Promise<void>;
  currentUser: TestUser | null;
};

export const test = base.extend<AuthFixtures>({
  currentUser: [null, { option: true }],

  loginAs: async ({ page, baseURL }, use) => {
    let currentUser: TestUser | null = null;

    const loginAs = async (email: string): Promise<TestUser> => {
      const response = await page.request.post(`${baseURL}/api/test/login`, {
        data: { email },
      });

      if (!response.ok()) {
        const error = await response.json();
        throw new Error(`Login failed for ${email}: ${error.error || response.status()}`);
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
      }

      currentUser = data.user;
      return data.user;
    };

    await use(loginAs);
  },

  logout: async ({ page, baseURL }, use) => {
    const logout = async () => {
      await page.request.post(`${baseURL}/api/test/logout`);
    };

    await use(logout);
  },
});

export { expect };
