import { test, expect } from "@playwright/test";

// Minimal smoke test: the sign-in page renders and routes guard correctly.
test("sign-in page renders", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /sign in to padawan/i })).toBeVisible();
});

test("unauthenticated clients route redirects to sign-in", async ({ page }) => {
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/sign-in/);
});
