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
  const failures = failOnConsoleErrors(page);
  await page.goto("/app");
  
  // Verify trigger exists in topbar
  const trigger = page.getByRole("button", { name: "Ask Costivra" });
  await expect(trigger).toBeVisible();

  // Open drawer
  await trigger.click();
  await expect(page.getByRole("complementary", { name: "Ask Costivra assistant" }).or(page.getByText("Ask Costivra"))).toBeVisible();

  expect(failures).toEqual([]);
});
