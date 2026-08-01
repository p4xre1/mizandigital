import { expect, test } from "@playwright/test";

const hasDevAdminCreds = Boolean(process.env.VITE_ADMIN_USER && process.env.VITE_ADMIN_PASS);

test.describe("auth flow", () => {
  test("login screen stays reachable and admin login can persist across refresh", async ({ page }) => {
    await page.goto("/en/login");

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/name@example.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/••••••••/i)).toBeVisible();

    if (!hasDevAdminCreds) {
      await expect(page.getByRole("tab", { name: /sign in/i })).toBeVisible();
      return;
    }

    await page.goto("/en/admin/login");
    await page.getByPlaceholder(/operator_id|email|username/i).fill(process.env.VITE_ADMIN_USER as string);
    await page.getByPlaceholder(/access_key|password/i).fill(process.env.VITE_ADMIN_PASS as string);
    await page.getByRole("button", { name: /secure login/i }).click();

    await expect(page).toHaveURL(/\/en\/admin/);
    await page.goto("/en/admin/security");
    await page.reload();
    await expect(page.getByText(/multi-factor authentication \(2fa\)/i)).toBeVisible();
  });
});