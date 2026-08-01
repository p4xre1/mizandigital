import { expect, test } from "@playwright/test";

const hasStorageState = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE);

test.describe("member interactions", () => {
  test("article interactions and profile deletion entry point are visible", async ({ page }) => {
    await page.goto("/en/article/family-law-s1-2026");

    await expect(page.getByRole("heading", { name: /أسئلة وأجوبة امتحان قانون الأسرة/i })).toBeVisible();

    await page.getByRole("button", { name: /save article/i }).click();
    await page.getByRole("button", { name: /like article/i }).click();

    await page.getByPlaceholder(/name or title/i).fill("E2E Reader");
    await page.getByPlaceholder(/write your comment or analysis/i).fill("This is an automated comment for the e2e suite.");
    await page.getByRole("button", { name: /post comment/i }).click();

    await expect(page.getByText(/automated comment for the e2e suite/i)).toBeVisible();

    if (!hasStorageState) {
      return;
    }

    await page.goto("/en/profile");
    await expect(page.getByRole("button", { name: /delete account/i })).toBeVisible();
  });
});