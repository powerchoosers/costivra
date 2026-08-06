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
  await expect(page.getByRole("heading", { level: 1, name: "Put every recurring business cost under command." })).toBeVisible();
  await expect(page.getByText("Recurring cost intelligence for finance and operations", { exact: true })).toBeVisible();
  await expect(page.getByText("For owners, CFOs, controllers, and operations leaders managing recurring business spend.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Scan 3 bills free", exact: true }).first()).toHaveAttribute("href", "/scan");
  await expect(page.getByRole("link", { name: "See a finding from source to result", exact: true })).toHaveAttribute("href", "#evidence");
  await page.getByRole("link", { name: "See a finding from source to result", exact: true }).click();
  await expect(page).toHaveURL(/\/#evidence$/);
  await expect(page.locator("#evidence")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("link", { name: "Pricing", exact: true }).first().click();
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

test("hero evidence anchor respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "See a finding from source to result", exact: true }).click();
  await expect(page).toHaveURL(/\/#evidence$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("interactive hero demo supports stages, source evidence, approval, and result states", async ({ page }) => {
  await page.goto("/");
  const sourceStage = page.getByRole("button", { name: "Stage 01: Source received" });
  const changeStage = page.getByRole("button", { name: "Stage 02: Change detected" });
  const evidenceStage = page.getByRole("button", { name: "Stage 03: Evidence linked" });
  const approvalStage = page.getByRole("button", { name: "Stage 04: Approval required" });
  const resultStage = page.getByRole("button", { name: "Stage 05: Later result checked" });

  await expect(sourceStage).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(5000);
  await expect(changeStage).toHaveAttribute("aria-pressed", "true");

  await evidenceStage.focus();
  await page.keyboard.press("Enter");
  await expect(evidenceStage).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(4400);
  await expect(evidenceStage).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "View source" }).click();
  const dialog = page.getByRole("dialog", { name: "Why this finding exists" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Synthetic demonstration data", { exact: false })).toBeVisible();
  await expect(dialog.getByText("EV-ILL-003", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close source evidence" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "View source" })).toBeFocused();

  await approvalStage.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Costivra has not acted yet." })).toBeVisible();
  await page.getByRole("button", { name: "Approve example" }).click();
  await expect(page.getByRole("status")).toContainText("Example action approved");

  await resultStage.click();
  await expect(page.getByRole("heading", { name: "The example result is checked against a later bill." })).toBeVisible();
  await expect(page.getByText("Example later invoice confirms the changed charge.", { exact: false })).toBeVisible();
});

test("interactive hero demo respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const sourceStage = page.getByRole("button", { name: "Stage 01: Source received" });
  await expect(sourceStage).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(5000);
  await expect(sourceStage).toHaveAttribute("aria-pressed", "true");
});

test("homepage uses the honest methodology proof fallback", async ({ page }) => {
  await page.goto("/");
  const proof = page.locator('[data-proof-mode="methodology"]');
  await expect(proof).toBeVisible();
  await expect(proof.getByRole("heading", { name: "Value is not verified until later evidence proves it." })).toBeVisible();
  await expect(proof.getByText("Costivra keeps potential value separate from confirmed results.", { exact: false })).toBeVisible();
  const sequence = proof.getByRole("list");
  await expect(sequence.getByText("Finding identified", { exact: true })).toBeVisible();
  await expect(sequence.getByText("Customer approves the method", { exact: true })).toBeVisible();
  await expect(sequence.getByText("Later evidence arrives", { exact: true })).toBeVisible();
  await expect(sequence.getByText("Result is confirmed or rejected", { exact: true })).toBeVisible();
  await expect(proof.getByText("No approved public case yet", { exact: false })).toBeVisible();
  await expect(proof.getByText("trusted by leading companies", { exact: false })).toHaveCount(0);
});

test("evidence categories synchronize the source-linked viewer", async ({ page }) => {
  await page.goto("/");
  const sectionOrder = await page.locator("main > section").evaluateAll((sections) => sections.slice(0, 4).map((section) => section.className));
  expect(sectionOrder).toEqual(["hero", "public-proof-section", "evidence-section", "workflow"]);

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

test("workflow keeps five stages concrete and compact", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const workflow = page.locator("#how-it-works");
  const stages = workflow.locator(".step");
  await expect(stages).toHaveCount(5);
  await expect(stages.locator("h3")).toHaveText(["Connect", "Extract", "Detect", "Approve", "Verify"]);
  for (const copy of [
    "Add selected bills, contracts, and vendor records.",
    "Costivra reads the terms and keeps the source attached.",
    "Rules flag price changes, duplicate costs, unused services, and deadline risk.",
    "The right person decides whether Costivra should help take the next step.",
    "A later bill, credit, or contract confirms whether the result occurred.",
  ]) {
    await expect(workflow.getByText(copy, { exact: true })).toBeVisible();
  }
  await expect(workflow.locator(".workflow-artifact")).toHaveCount(5);
  await expect(workflow.getByText("3 files ready · 1 vendor", { exact: true })).toBeVisible();
  await expect(workflow.getByText("Annual adjustment · page 3", { exact: true })).toBeVisible();
  await expect(workflow.getByText("Potential change · $1,040 / mo", { exact: true })).toBeVisible();
  await expect(workflow.getByText("Finance owner · pending", { exact: true })).toBeVisible();
  await expect(workflow.getByText("Later bill · awaiting", { exact: true })).toBeVisible();
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
  expect(scanLabels.every((label) => label === "Scan 3 bills free")).toBe(true);
  await expect(page.getByRole("heading", { name: "Start with three bills. Keep the evidence." })).toBeVisible();
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

  const internalHrefs = await page.locator("header a, footer a").evaluateAll((links) => Array.from(new Set(links.map((link) => link.getAttribute("href") || "").filter((href) => href.startsWith("/")))));
  for (const href of internalHrefs) {
    const response = await request.get(href);
    expect(response.status(), `${href} returned ${response.status()}`).not.toBe(404);
  }

  const mobileNav = await page.locator("#mobile-navigation a").evaluateAll((links) => links.slice(0, 5).map((link) => ({ label: link.textContent?.replace(/^0\d/, "").replace(/\s+/g, " ").trim(), href: link.getAttribute("href") })));
  expect(mobileNav).toEqual(desktopNav);
  if (testInfo.project.name.startsWith("mobile")) {
    await page.getByRole("button", { name: /open navigation/i }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Scan 3 bills free", exact: true })).toHaveAttribute("href", "/scan");
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
