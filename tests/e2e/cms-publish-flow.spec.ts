import { expect, test } from "@playwright/test";

const hasStorageState = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE);

test.describe("cms publish flow", () => {
  test("writer editor is reachable and can save a draft when authenticated", async ({ page }) => {
    await page.goto("/en/writer/editor");

    if (!hasStorageState) {
      await expect(page).toHaveURL(/\/en\/login/);
      return;
    }

    await expect(page.getByRole("heading", { name: /article editor/i })).toBeVisible();

    const stamp = Date.now();
    await page.getByLabel(/article title/i).fill(`E2E Draft ${stamp}`);
    await page.getByLabel(/^slug$/i).fill(`e2e-draft-${stamp}`);
    await page.getByLabel(/^category$/i).fill("Testing");
    await page.getByLabel(/content \(markdown supported\)/i).fill("Draft body for automated testing.");

    await page.getByRole("button", { name: /save article/i }).click();
    await expect(page.getByText(/article saved successfully!/i)).toBeVisible();
  });
});