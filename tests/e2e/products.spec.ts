import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("messages-locale", "en"));
});
async function openNoor(page: Page) {
  await page
    .getByRole("button", { name: "Open conversation with Noor", exact: true })
    .click();
  await expect(page.locator("main")).not.toHaveAttribute(
    "data-memory",
    "loading",
  );
}
async function browse(page: Page) {
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Browse products" }).click();
  await expect(
    page.getByRole("region", { name: "Products", exact: true }),
  ).toBeVisible();
}
const choice = (page: Page) =>
  page.getByRole("region", { name: "Your choice", exact: true }).last();
test("electronics choices use separate size/color, radio and checkbox dialogs; saved context survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await openNoor(page);
  await browse(page);
  const products = page.getByRole("region", { name: "Products", exact: true });
  await expect(
    products.getByRole("progressbar", { name: "Product position" }),
  ).toHaveAttribute("value", "1");
  await products.getByRole("button", { name: "Next product" }).click();
  await expect(
    products.getByRole("progressbar", { name: "Product position" }),
  ).toHaveAttribute("value", "2");
  await products
    .getByRole("button", { name: "Choose Orbit Phone", exact: true })
    .click();
  const options = page
    .getByRole("region", { name: "Choose a color", exact: true })
    .last();
  const storage = page
    .getByRole("region", { name: "Choose storage or size", exact: true })
    .last();
  await expect(options).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Create poll" })).toHaveCount(
    0,
  );
  await storage.getByRole("radio", { name: "256 GB", exact: true }).check();
  await options.getByRole("checkbox", { name: "Blue", exact: true }).check();
  await options
    .getByRole("button", { name: "Use selection", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Product options" }),
  ).toHaveCount(0);
  await expect(choice(page)).toContainText("256 GB");
  await expect(choice(page)).toContainText("Blue");
  await choice(page)
    .getByRole("button", { name: "Delivery", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Delivery", exact: true })
    .getByRole("radio", { name: "Express delivery" })
    .check();
  await page
    .getByRole("region", { name: "Delivery", exact: true })
    .getByRole("button", { name: "Continue", exact: true })
    .click();
  await expect(choice(page)).toContainText("Express delivery");
  await choice(page)
    .getByRole("button", { name: "Extras", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Extras", exact: true })
    .getByRole("checkbox", { name: "Protective case" })
    .check();
  await page
    .getByRole("region", { name: "Extras", exact: true })
    .getByRole("checkbox", { name: "USB-C charger" })
    .check();
  await page
    .getByRole("region", { name: "Extras", exact: true })
    .getByRole("button", { name: "Continue", exact: true })
    .click();
  await expect(choice(page)).toContainText("USB-C charger");
  await choice(page)
    .getByRole("button", { name: "Save choice", exact: true })
    .click();
  const saved = page
    .getByRole("region", { name: "Saved choice", exact: true })
    .last();
  await expect(saved).toContainText("100%");
  const id = await saved
    .locator("xpath=ancestor::article")
    .getAttribute("data-message-id");
  await expect(page.locator("main")).toHaveAttribute("data-memory", "saved");
  await page.reload();
  await openNoor(page);
  await expect(page.locator(`article[data-message-id="${id}"]`)).toContainText(
    "Express delivery",
  );
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("What did I choose?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".agent-message").last()).toContainText(
    "You chose Orbit Phone",
    { timeout: 15000 },
  );
  await expect(
    page.getByRole("button", { name: "View referenced message" }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "View referenced message" }).click();
  await expect(page.locator(`article[data-message-id="${id}"]`)).toHaveClass(
    /focused-message/,
  );
  await page.screenshot({
    path: `test-results/${test.info().project.name}-electronics-selection.png`,
  });
});

test("comparison and forwarding keep independent message IDs and point back to their source", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await openNoor(page);
  await browse(page);
  const products = page.getByRole("region", { name: "Products", exact: true });
  await products
    .getByRole("button", { name: "Select multiple products", exact: true })
    .click();
  await products
    .getByRole("checkbox", { name: "Select Orbit Phone", exact: true })
    .check();
  await products
    .getByRole("checkbox", { name: "Select Slate Tablet", exact: true })
    .check();
  await products.getByRole("button", { name: "Compare selected (2)" }).click();
  const comparison = page.getByRole("region", {
    name: "Compare products",
    exact: true,
  });
  await expect(comparison).toContainText("Orbit Phone");
  await expect(comparison).toContainText("Slate Tablet");
  const source = comparison.locator("xpath=ancestor::article");
  const sourceId = await source.getAttribute("data-message-id");
  await source
    .getByRole("button", { name: "Forward message", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Forward message" })
    .getByRole("radio", { name: "Amparo Arias", exact: true })
    .check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Forward message", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Amparo Arias", exact: true }),
  ).toBeVisible();
  const forwarded = page.locator("article").last();
  const forwardedId = await forwarded.getAttribute("data-message-id");
  expect(forwardedId).not.toBe(sourceId);
  await expect(forwarded).toContainText("Forwarded from Noor");
  await forwarded
    .getByRole("button", { name: "Message details", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Message details" }),
  ).toContainText(forwardedId!);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "View source message" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Noor", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(`article[data-message-id="${sourceId}"]`),
  ).toHaveClass(/focused-message/);
  if (testInfo.project.name.startsWith("mobile"))
    await page.getByRole("button", { name: "Back to conversations" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("radio", { name: "Slow", exact: true })
    .check();
  await expect(page.locator("main")).toHaveAttribute("data-motion", "slow");
});

test("Arabic product selection preserves RTL and keeps choice dialogs distinct from polls", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to Arabic" }).click();
  await page
    .getByRole("button", { name: "فتح المحادثة مع نور", exact: true })
    .click();
  await page.getByRole("button", { name: "خيارات إضافية" }).click();
  await page.getByRole("button", { name: "تصفح المنتجات" }).click();
  const products = page.getByRole("region", { name: "المنتجات", exact: true });
  await products.getByRole("button", { name: "المنتج التالي" }).click();
  await expect(
    products.getByRole("progressbar", { name: "موضع المنتج" }),
  ).toHaveAttribute("value", "2");
  await products
    .getByRole("button", { name: "اختيار هاتف أوربت", exact: true })
    .click();
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await page
    .getByRole("region", { name: "اختر لونًا", exact: true })
    .last()
    .getByRole("checkbox", { name: "أزرق", exact: true })
    .click();

  await page
    .getByRole("region", { name: "اختر لونًا", exact: true })
    .last()
    .getByRole("button", { name: "استخدام الاختيارات", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "اختيارك", exact: true }).last(),
  ).toContainText("أزرق");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".stream-cursor")).toHaveCount(0);
});

test("situational color UI is outside bubbles and Purple immediately updates the choice and caret", async ({
  page,
}) => {
  await page.goto("/");
  await openNoor(page);
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Show me phone colors");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const chooser = page.getByRole("region", {
    name: "Choose a color",
    exact: true,
  });
  await expect(chooser).toBeVisible({ timeout: 15000 });
  await expect(
    chooser.locator(
      "xpath=ancestor::*[contains(concat(' ',normalize-space(@class),' '),' bubble ')]",
    ),
  ).toHaveCount(0);
  await expect(
    chooser.getByRole("button", { name: "Continue", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("region", { name: "Choose storage or size", exact: true })
    .last()
    .getByRole("radio", { name: "256 GB", exact: true })
    .check();
  await chooser.getByRole("checkbox", { name: "Purple", exact: true }).check();
  await chooser
    .getByRole("button", { name: "Use selection", exact: true })
    .click();
  await expect(choice(page)).toContainText("Purple");
  await expect(choice(page)).toContainText("256 GB");
  await expect(page.locator("main")).toHaveAttribute(
    "data-selected-color",
    "purple",
  );
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveCSS("caret-color", "rgb(137, 102, 188)");
  await expect(
    choice(page).getByRole("button", { name: "Extras", exact: true }),
  ).toHaveCount(0);
  await expect(
    choice(page).getByRole("button", { name: "Delivery", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-memory", "saved");
  await page.reload();
  await openNoor(page);
  await expect(page.locator("main")).toHaveAttribute(
    "data-selected-color",
    "purple",
  );
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Show me tablet colors");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const nextChooser = page
    .getByRole("region", { name: "Choose a color", exact: true })
    .last();
  await expect(
    page.getByRole("region", { name: "Slate Tablet", exact: true }).last(),
  ).toBeVisible({ timeout: 15000 });
  await expect(nextChooser).toBeVisible();
  await page
    .getByRole("region", { name: "Choose storage or size", exact: true })
    .last()
    .getByRole("radio", { name: "12 inch", exact: true })
    .check();
  await expect(
    page
      .getByRole("region", { name: "Choose storage or size", exact: true })
      .first()
      .getByRole("radio", { name: "256 GB", exact: true }),
  ).toBeChecked();
  await nextChooser
    .getByRole("checkbox", { name: "Silver", exact: true })
    .check();
  await nextChooser
    .getByRole("button", { name: "Use selection", exact: true })
    .click();
  await expect(choice(page)).toContainText("Slate Tablet");
  await expect(choice(page)).toContainText("12 inch");
  await expect(choice(page)).toContainText("Silver");
  await browse(page);
  const catalog = page
    .getByRole("region", { name: "Products", exact: true })
    .last();
  await expect(catalog.getByRole("checkbox")).toHaveCount(0);
  await expect(
    catalog.getByRole("button", { name: "Compare selected (0)" }),
  ).toHaveCount(0);
  await expect(
    catalog.getByRole("button", { name: "Choose Orbit Phone", exact: true }),
  ).toContainText("Choose");
});

test("one agent turn sends multiple independently addressable messages and persists them", async ({
  page,
}) => {
  await page.route("**/api/agent", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      contentType: "application/x-ndjson",
      body:
        [
          { type: "mode", mode: "live" },
          { type: "delta", text: "Let’s choose your phone." },
          { type: "message_start" },
          { type: "delta", text: "Which size works for you?" },
          { type: "done" },
        ]
          .map((event) => JSON.stringify(event))
          .join("\n") + "\n",
    });
  });
  await page.goto("/");
  await openNoor(page);
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Help me choose");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const first = page
    .locator("article.agent-message")
    .filter({ hasText: "Let’s choose your phone." });
  const second = page
    .locator("article.agent-message")
    .filter({ hasText: "Which size works for you?" });
  await expect(first).toHaveCount(1);
  await expect(second).toHaveCount(1);
  const ids = [
    await first.getAttribute("data-message-id"),
    await second.getAttribute("data-message-id"),
  ];
  expect(ids[0]).not.toBe(ids[1]);
  await expect(page.locator("main")).toHaveAttribute("data-memory", "saved");
  await page.reload();
  await openNoor(page);
  for (const id of ids)
    await expect(
      page.locator(`article[data-message-id="${id}"]`),
    ).toBeVisible();
});

test("Stop cancels a sequence of option messages and Retry resumes the local selection method", async ({
  page,
}) => {
  let providerCalls = 0;
  await page.route("**/api/agent", async (route) => {
    if (route.request().method() === "POST") providerCalls++;
    await route.continue();
  });
  await page.goto("/");
  await openNoor(page);
  await browse(page);
  await page
    .getByRole("region", { name: "Products", exact: true })
    .getByRole("button", { name: "Choose Orbit Phone", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Stop generating", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Choose a color", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Retry reply", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Choose a color", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Choose storage or size", exact: true }),
  ).toBeVisible();
  expect(providerCalls).toBe(0);
});

test("bare option messages support multiple color checks and neutral actions", async ({
  page,
}) => {
  await page.goto("/");
  await openNoor(page);
  await browse(page);
  await page
    .getByRole("region", { name: "Products", exact: true })
    .getByRole("button", { name: "Choose Orbit Phone", exact: true })
    .click();
  const colors = page.getByRole("region", {
    name: "Choose a color",
    exact: true,
  });
  await expect(colors).toBeVisible();
  await expect(page.locator(".color-orb")).toHaveCount(0);
  await expect(colors).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const storage = page.getByRole("region", {
    name: "Choose storage or size",
    exact: true,
  });
  await expect(storage).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await storage.getByRole("radio", { name: "256 GB", exact: true }).check();
  await colors.getByRole("checkbox", { name: "Purple", exact: true }).check();
  await colors.getByRole("checkbox", { name: "Blue", exact: true }).check();
  const apply = colors.getByRole("button", {
    name: "Use selection",
    exact: true,
  });
  await expect(apply).toHaveCSS("color", "rgb(17, 17, 17)");
  await apply.click();
  await expect(choice(page)).toContainText("Purple, Blue");
  await expect(choice(page)).toContainText("256 GB");
  await expect(page.locator("main")).toHaveAttribute("data-memory", "saved");
  await page.reload();
  await openNoor(page);
  await expect(choice(page)).toContainText("Purple, Blue");
});

test("separate preference messages filter by budget and multiple collections, preserve context and report no matches", async ({
  page,
}) => {
  await page.goto("/");
  await openNoor(page);
  await page.getByRole("button", { name: "More options", exact: true }).click();
  await page
    .getByRole("button", { name: "Product preferences", exact: true })
    .click();
  const find = page.getByRole("region", { name: "Find products", exact: true });
  await expect(find).toBeVisible({ timeout: 15000 });
  const price = page.getByRole("region", { name: "Price", exact: true });
  await price
    .getByRole("spinbutton", { name: "Maximum price", exact: true })
    .fill("500");
  const collections = page.getByRole("region", {
    name: "Collections",
    exact: true,
  });
  await collections
    .getByRole("checkbox", { name: "Work", exact: true })
    .check();
  await collections
    .getByRole("checkbox", { name: "Travel", exact: true })
    .check();
  const types = page.getByRole("region", { name: "Type", exact: true });
  await types.getByRole("checkbox", { name: "Tablets", exact: true }).check();
  await find
    .getByRole("button", { name: "Find products", exact: true })
    .click();
  const results = page
    .getByRole("region", { name: "Products", exact: true })
    .last();
  await expect(results).toContainText("Slate Tablet");
  await expect(results).not.toContainText("Orbit Phone");
  await expect(results).not.toContainText("Studio Headphones");
  await expect(page.locator("main")).toHaveAttribute("data-memory", "saved");
  await page.reload();
  await openNoor(page);
  await expect(
    page
      .getByRole("region", { name: "Collections", exact: true })
      .getByRole("checkbox", { name: "Work", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("region", { name: "Price", exact: true })
    .getByRole("spinbutton", { name: "Maximum price", exact: true })
    .fill("100");
  await page
    .getByRole("region", { name: "Find products", exact: true })
    .getByRole("button", { name: "Find products", exact: true })
    .click();
  await expect(page.locator("article.agent-message").last()).toContainText(
    "No products match",
  );
});

test("multiple product checks create an independent selected list rather than a comparison", async ({
  page,
}) => {
  await page.goto("/");
  await openNoor(page);
  await browse(page);
  const products = page.getByRole("region", { name: "Products", exact: true });
  await products
    .getByRole("button", { name: "Select multiple products", exact: true })
    .click();
  await products
    .getByRole("checkbox", { name: "Select Orbit Phone", exact: true })
    .check();
  await products
    .getByRole("checkbox", { name: "Select Slate Tablet", exact: true })
    .check();
  await products
    .getByRole("button", { name: "Use products (2)", exact: true })
    .click();
  const list = page.getByRole("region", {
    name: "Selected products",
    exact: true,
  });
  await expect(list).toContainText("Orbit Phone");
  await expect(list).toContainText("Slate Tablet");
  await expect(
    page.getByRole("region", { name: "Compare products", exact: true }),
  ).toHaveCount(0);
  await list
    .getByRole("button", { name: "Choose Slate Tablet", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Choose storage or size", exact: true })
      .getByRole("radio", { name: "12 inch", exact: true }),
  ).toBeVisible();
});
