import { expect, test, type Page } from "@playwright/test";

function failOnConsoleErrors(page: Page) {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  return failures;
}

test("Ask Costivra top-bar trigger exists and operates assistant surface", async ({ page }) => {
  if (process.env.RUN_AUTHENTICATED_E2E !== "1") {
    test.skip(true, "Requires authenticated E2E environment (RUN_AUTHENTICATED_E2E=1)");
    return;
  }

  const failures = failOnConsoleErrors(page);
  await page.goto("/app");
  
  // Verify trigger exists in topbar
  const trigger = page.getByRole("button", { name: /Ask Costivra/i });
  await expect(trigger).toBeVisible();

  // Open drawer
  await trigger.click();
  await expect(page.getByRole("region", { name: "Ask Costivra" }).or(page.getByText("Ask Costivra"))).toBeVisible();

  expect(failures).toEqual([]);
});
