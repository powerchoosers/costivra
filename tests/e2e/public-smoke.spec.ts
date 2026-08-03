import { expect, test, type Page } from "@playwright/test";

function failOnConsoleErrors(page: Page) {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  return failures;
}

test("public site navigates without runtime errors", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Desktop navigation has its own interaction model");
  const failures = failOnConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "costs hiding in your operating margin",
  );
  await page.getByRole("link", { name: "Pricing", exact: true }).first().click();
  await expect(page).toHaveURL(/\/pricing$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(failures).toEqual([]);
});

test("sign-in keeps unconfigured workspace providers honest", async ({ page }) => {
  const failures = failOnConsoleErrors(page);
  await page.goto("/login");
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /google/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /microsoft/i })).toBeDisabled();
  await expect(page.getByText("Setup required")).toHaveCount(2);
  expect(failures).toEqual([]);
});

test("inbound email worker rejects public requests", async ({ request }) => {
  const response = await request.get("/api/cron/inbound-email");
  expect(response.status()).toBe(401);
});

test("retention worker rejects public requests", async ({ request }) => {
  const response = await request.get("/api/cron/retention");
  expect(response.status()).toBe(401);
});

test("mobile navigation opens without shifting or clipping the page", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only interaction");
  const failures = failOnConsoleErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: /open navigation/i }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: /pricing/i }).click();
  await expect(page).toHaveURL(/\/pricing$/, { timeout: 20_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(failures).toEqual([]);
});

test("status page renders sanitized live production state", async ({ page }) => {
  const failures = failOnConsoleErrors(page);
  await page.route("**/api/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        checkedAt: "2026-08-02T22:00:00.000Z",
        overall: "limited",
        headline: "Core systems are available with limited document processing.",
        services: [
          { id: "website", name: "Public website", state: "operational", message: "Website is responding." },
          { id: "workspace", name: "Customer workspace", state: "operational", message: "Workspace is available." },
          { id: "intake", name: "Document intake", state: "limited", message: "Files remain privately quarantined." },
          { id: "extraction", name: "Document intelligence", state: "limited", message: "Processing awaits scanning." },
        ],
      }),
    });
  });

  await page.goto("/status");
  await expect(page.getByRole("heading", { level: 1, name: "System status." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Core systems are available with limited document processing." })).toBeVisible();
  await expect(page.getByText("Document intake", { exact: true })).toBeVisible();
  await expect(page.getByText("Files remain privately quarantined.")).toBeVisible();
  await expect(page.getByText(/preview systems operational/i)).toHaveCount(0);
  expect(failures).toEqual([]);
});
