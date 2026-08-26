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
  await expect(page.getByRole("heading", { level: 1, name: "Find hidden waste in your business bills." })).toBeVisible();
  await expect(page.getByText("Recurring bill review for growing businesses", { exact: true })).toBeVisible();
  await expect(page.getByText("Upload software, internet, or energy bills. Costivra finds price increases, duplicate charges, unused services, and renewal risks—with the exact source attached.", { exact: true })).toBeVisible();
  const walkthrough = page.getByRole("complementary", { name: "Illustrative bill review example" });
  await expect(walkthrough).toBeVisible();
  await expect(walkthrough.getByText("Product walkthrough", { exact: true })).toBeVisible();
  await expect(walkthrough.getByText("Guided demo", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review 3 bills free", exact: true })).toHaveAttribute("href", "/scan");
  await expect(page.getByRole("link", { name: "See a sample review", exact: true })).toHaveAttribute("href", "#evidence");
  await page.getByRole("link", { name: "See a sample review", exact: true }).click();
  await expect(page).toHaveURL(/\/#evidence$/);
  await expect(page.locator("#evidence")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const headerPricing = page.locator("header").getByRole("link", { name: "Pricing", exact: true });
  await expect(headerPricing).toBeVisible();
  await headerPricing.click();
  await expect(page).toHaveURL(/\/pricing$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(failures).toEqual([]);
});

test("sign-in keeps unconfigured workspace providers honest", async ({ page }) => {
  const failures = failOnConsoleErrors(page);
  await page.goto("/login");
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  const googleBtn = page.getByRole("button", { name: /google/i });
  if ((await googleBtn.count()) > 0) {
    await expect(googleBtn).toBeDisabled();
  }
  expect(failures).toEqual([]);
});

test("privacy policy discloses Google user-data controls", async ({ page }) => {
  const failures = failOnConsoleErrors(page);
  await page.goto("/privacy");
  await expect(page.getByText("Effective August 26, 2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Google account and Gmail data" })).toBeVisible();
  await expect(page.getByText("Costivra cannot send, modify, label, move, or delete your Gmail messages.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Google API Services User Data Policy" })).toHaveAttribute("href", "https://developers.google.com/terms/api-services-user-data-policy");
  expect(failures).toEqual([]);
});

test("inbound email worker rejects public requests", async ({ request }) => {
  const response = await request.get("/api/cron/inbound-email");
  expect([401, 404]).toContain(response.status());
});

test("retention worker rejects public requests", async ({ request }) => {
  const response = await request.get("/api/cron/retention");
  expect([401, 404]).toContain(response.status());
});

test("mobile navigation opens without shifting or clipping the page", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only interaction");
  const failures = failOnConsoleErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: /open navigation/i }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await page.getByRole("button", { name: /close navigation/i }).click();
  await expect(navigation).toBeHidden();
  await page.getByRole("button", { name: /open navigation/i }).click();
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: /pricing/i }).click();
  await expect(page).toHaveURL(/\/pricing$/, { timeout: 20_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(failures).toEqual([]);
});

test("mobile scan page stacks the intake story and workspace panel", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only layout");
  const failures = failOnConsoleErrors(page);
  await page.goto("/scan");
  await expect(page.getByRole("heading", { level: 1, name: "Start with three current bills." })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Start your 3-bill review" })).toBeVisible();
  const layout = await page.locator(".scan-layout").evaluate((element) => {
    const hero = element.querySelector(".content-hero")?.getBoundingClientRect();
    const panel = element.querySelector(".scan-panel")?.getBoundingClientRect();
    return {
      columns: getComputedStyle(element).gridTemplateColumns,
      heroBottom: hero?.bottom ?? 0,
      panelTop: panel?.top ?? 0,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(layout.columns.trim().split(/\s+/)).toHaveLength(1);
  expect(layout.panelTop).toBeGreaterThan(layout.heroBottom);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(failures).toEqual([]);
});

test("hero evidence anchor respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "See a sample review", exact: true }).click();
  await expect(page).toHaveURL(/\/#evidence$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("hero review preview keeps source evidence and potential value explicit", async ({ page }) => {
  await page.goto("/");
  const preview = page.getByRole("complementary", { name: "Illustrative bill review example" });
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Selected source files stay linked to their findings.", { exact: true })).toBeVisible();
  await expect(preview.getByText("Private intake · evidence · human decision", { exact: true })).toBeVisible();
  await preview.getByRole("tab", { name: "Review" }).click();
  await expect(preview.getByRole("heading", { name: "Monthly circuit charge increased", exact: true })).toBeVisible();
  await expect(preview.getByText("Not verified · source linked", { exact: true })).toBeVisible();
});

test("interactive hero demo respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Illustrative bill review example" })).toBeVisible();
});

test("homepage uses the honest methodology proof fallback", async ({ page }) => {
  await page.goto("/");
  const proof = page.locator('[data-proof-mode="methodology"]');
  await expect(proof).toBeVisible();
  await expect(proof.getByRole("heading", { name: "We only count savings after they happen." })).toBeVisible();
  await expect(proof.getByText("A saving becomes real only when a lower bill, credit, or vendor record proves the result.", { exact: false })).toBeVisible();
  await expect(proof.getByText("Something looks worth checking.", { exact: true })).toBeVisible();
  await expect(proof.getByText("A lower bill or credit proves it.", { exact: true })).toBeVisible();
  await expect(proof.locator(".public-proof-sequence")).toHaveCount(0);
  await expect(proof.getByText("trusted by leading companies", { exact: false })).toHaveCount(0);
});

test("evidence categories synchronize the source-linked viewer", async ({ page }) => {
  await page.goto("/");
  const sectionOrder = await page.locator("main > section").evaluateAll((sections) => sections.slice(0, 4).map((section) => section.className));
  expect(sectionOrder).toEqual(["hero", "evidence-section", "workflow", "public-proof-section"]);

  const evidence = page.locator("#evidence");
  await evidence.scrollIntoViewIfNeeded();
  const software = evidence.getByRole("button", { name: "Software subscriptions" });
  const telecom = evidence.getByRole("button", { name: "Telecom and internet" });
  const energy = evidence.getByRole("button", { name: "Commercial energy review" });
  await expect(software).toHaveAttribute("aria-pressed", "true");
  await expect(evidence.locator("[data-evidence-category='software']")).toContainText("Acme Software LLC");
  await expect(evidence.locator("[data-evidence-category='software']")).toContainText("Unused licenses detected");

  await telecom.focus();
  await page.keyboard.press("Enter");
  await expect(telecom).toHaveAttribute("aria-pressed", "true");
  await expect(software).toHaveAttribute("aria-pressed", "false");
  await expect(evidence.locator("[data-evidence-category='telecom']")).toContainText("Verizon Business");
  await expect(evidence.locator("[data-evidence-category='telecom']")).toContainText("Unapproved surcharge detected");
  await expect(evidence.locator("[data-evidence-category='telecom']")).toContainText("$18,750 / year");
  await expect(page).toHaveURL(/\/$/);

  await energy.focus();
  await page.keyboard.press("Space");
  await expect(energy).toHaveAttribute("aria-pressed", "true");
  await expect(evidence.locator("[data-evidence-category='energy']")).toContainText("Direct Energy Commercial");
  await expect(evidence.locator("[data-evidence-category='energy']")).toContainText("Peak factor exceeds the stated cap");
  await expect(evidence.locator("[data-evidence-category='energy']")).toContainText("$9,680 / year");

  await expect(evidence.getByRole("link", { name: "Explore" }).nth(0)).toHaveAttribute("href", "/solutions/software");
  await expect(evidence.getByRole("link", { name: "Explore" }).nth(1)).toHaveAttribute("href", "/solutions/telecom");
  await expect(evidence.getByRole("link", { name: "Explore" }).nth(2)).toHaveAttribute("href", "/solutions/energy");
});

test("workflow keeps three review steps concrete and compact", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const workflow = page.locator("#how-it-works");
  const stages = workflow.locator(".step");
  await expect(stages).toHaveCount(3);
  await expect(stages.locator("h3")).toHaveText(["Choose current bills", "Review what changed", "Decide the next step"]);
  for (const copy of [
    "Start with the software, internet, or energy documents you want reviewed.",
    "See possible price increases, duplicate charges, unused services, or renewal deadlines with the source attached.",
    "Your team can save, investigate, assign, or approve a bounded action. Later evidence determines what is verified.",
  ]) {
    await expect(workflow.getByText(copy, { exact: true })).toBeVisible();
  }
  await expect(workflow.locator(".workflow-artifact")).toHaveCount(3);
  await expect(workflow.getByText("Selected documents", { exact: true })).toBeVisible();
  await expect(workflow.getByText("Source linked · review needed", { exact: true })).toBeVisible();
  await expect(workflow.getByText("Your approval required", { exact: true })).toBeVisible();
  await expect(workflow.locator(".doctrine-line")).toHaveCount(0);

  if (testInfo.project.name.startsWith("mobile")) {
    const positions = await stages.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  }
});

test("trust section states supported controls and links to security", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const trust = page.locator("section.doctrine");
  await expect(trust.getByRole("heading", { level: 2, name: "Built for decisions that affect real money." })).toBeVisible();
  await expect(trust.getByText("AI can read and explain the documents. Deterministic code calculates the amounts. Policies define what is allowed. Your team approves consequential actions. The source and audit history remain attached.", { exact: true })).toBeVisible();

  for (const statement of [
    "Private documents",
    "Tenant-isolated records",
    "Human approval",
    "Source-linked findings",
    "Audit history",
    "No broad inbox access required",
    "Files remain private and use controlled access.",
    "Customer records are separated by organization boundaries and database policies.",
    "Consequential outside actions require the configured approval.",
    "Material claims remain connected to evidence and calculation details.",
    "Decisions, corrections, approvals, and outside effects are recorded.",
    "Begin with selected uploads and controlled forwarding.",
  ]) {
    await expect(trust.getByText(statement, { exact: true })).toBeVisible();
  }

  await expect(trust.getByText("Costivra does not automatically cancel services, sign contracts, change payment instructions, or send customer records to an outside advisor.", { exact: true })).toBeVisible();
  await expect(trust.getByText(/SOC 2|ISO 27001|HIPAA|GDPR-compliant|bank-grade|enterprise-grade/i)).toHaveCount(0);
  await expect(trust.getByRole("link", { name: "Review Costivra security", exact: true })).toHaveAttribute("href", "/security");

  const contrast = await trust.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, heading: getComputedStyle(element.querySelector("h2")!).color }));
  expect(contrast).toEqual({ background: "rgb(8, 11, 20)", heading: "rgb(244, 246, 250)" });

  if (testInfo.project.name.startsWith("mobile")) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(trust.getByRole("link", { name: "Review Costivra security", exact: true })).toBeVisible();
  }

  await trust.getByRole("link", { name: "Review Costivra security", exact: true }).click();
  await expect(page).toHaveURL(/\/security$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Protect the data behind every cost decision." })).toBeVisible();
});

test("homepage CTA and public navigation route matrix stays consistent", async ({ page, request }, testInfo) => {
  await page.goto("/");
  const scanLinks = page.locator('a[href="/scan"]');
  const scanLabels = (await scanLinks.allTextContents()).map((label) => label.replace(/\s+/g, " ").trim());
  expect(scanLabels.length).toBeGreaterThanOrEqual(4);
  expect(scanLabels.every((label) => ["Review 3 bills free", "Start with 3 bills"].includes(label))).toBe(true);
  await expect(page.getByRole("heading", { name: "Start with three bills.", exact: true })).toBeVisible();
  await expect(page.getByText("Pilot pricing shown for product evaluation.", { exact: true })).toHaveCount(0);

  const desktopNav = await page.locator('header nav[aria-label="Primary navigation"] a').evaluateAll((links) => links.map((link) => ({ label: link.textContent?.trim(), href: link.getAttribute("href") })));
  expect(desktopNav).toEqual([
    { label: "Product", href: "/product" },
    { label: "What we review", href: "/solutions" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Security", href: "/security" },
    { label: "Pricing", href: "/pricing" },
  ]);
  await expect(page.locator('header a.sign-in')).toHaveAttribute("href", "/login");
  await expect(page.locator('footer a[href="/ucep-disclosure"]')).toBeVisible();

  const marketingHeader = page.locator("header.marketing-header");
  await page.evaluate(() => window.scrollTo(0, 360));
  await expect(marketingHeader).toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 180));
  await expect(marketingHeader).not.toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 0));

  const internalHrefs = await page.locator("header a, footer a").evaluateAll((links) => Array.from(new Set(links.map((link) => link.getAttribute("href") || "").filter((href) => href.startsWith("/")))));
  for (const href of internalHrefs) {
    const response = await request.get(href);
    expect(response.status(), `${href} returned ${response.status()}`).not.toBe(404);
  }

  const mobileNav = await page.locator("#mobile-navigation a").evaluateAll((links) => links.slice(0, 5).map((link) => ({ label: link.textContent?.replace(/^0\d/, "").replace(/\s+/g, " ").trim(), href: link.getAttribute("href") })));
  expect(mobileNav).toEqual(desktopNav);
  if (testInfo.project.name.startsWith("mobile")) {
    await page.getByRole("button", { name: /open navigation/i }).click();
    const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(mobileNavigation).toBeVisible();
    await expect(page.locator(".mobile-backdrop.is-open")).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await expect(mobileNavigation.getByRole("link", { name: "Product", exact: true })).toBeFocused();
    await expect(mobileNavigation.getByRole("link", { name: "Start with 3 bills", exact: true })).toHaveAttribute("href", "/scan");
    await page.keyboard.press("Escape");
    await expect(mobileNavigation).toBeHidden();
    await expect(page.getByRole("button", { name: /open navigation/i })).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  }
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
