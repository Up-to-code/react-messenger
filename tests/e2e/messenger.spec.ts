import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("messages-locale", "en"));
});

async function openSandra(page: Page) {
  await page
    .getByRole("button", {
      name: "Open conversation with Sandra Vicente",
      exact: true,
    })
    .click();
}

test("renders without hydration errors; search, sending, and separate histories work", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page).toHaveTitle("Messages | React Messenger");
  await expect(
    page.getByRole("navigation", { name: "Conversations" }).getByRole("button"),
  ).toHaveCount(13);
  const portrait = page.getByRole("navigation").locator("img").first();
  await expect
    .poll(() =>
      portrait.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("searchbox").fill("Amparo");
  await expect(page.getByRole("navigation").getByRole("button")).toHaveCount(1);
  await page.getByRole("searchbox").fill("no-such-contact");
  await expect(page.getByText("No conversations found.")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await openSandra(page);
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("   ");
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Migration browser check");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("log").getByText("Migration browser check", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue("");
  if (testInfo.project.name.startsWith("mobile"))
    await page.getByRole("button", { name: "Back to conversations" }).click();
  await page
    .getByRole("button", { name: "Open conversation with Amparo Arias" })
    .click();
  await expect(
    page.getByRole("log").getByText("Migration browser check"),
  ).toHaveCount(0);
  if (testInfo.project.name.startsWith("mobile"))
    await page.getByRole("button", { name: "Back to conversations" }).click();
  await openSandra(page);
  await expect(
    page.getByRole("log").getByText("Migration browser check", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-messenger.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("new conversation dialog, emoji, information, and image attachment work", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Contact name" })
    .fill("Next.js Friend");
  await page.getByRole("button", { name: "Create conversation" }).click();
  await expect(
    page.getByRole("heading", { name: "Next.js Friend" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose emoji", exact: true }).click();
  await page
    .getByRole("button", { name: "Insert smile emoji", exact: true })
    .click();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log").getByText("😊")).toBeVisible();
  await page.getByLabel("Attach image", { exact: true }).setInputFiles({
    name: "hello.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("hello.png", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("img", { name: "hello.png" })).toBeVisible();
  await page.getByRole("button", { name: "Conversation information" }).click();
  await expect(page.getByRole("dialog")).toContainText("2 messages");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  if (testInfo.project.name.startsWith("mobile"))
    await page.getByRole("button", { name: "Back to conversations" }).click();
  await page.getByRole("searchbox").fill("😊");
  await expect(page.getByRole("navigation").getByRole("button")).toHaveCount(1);
  await expect(page.locator("main")).toHaveAttribute("data-memory", "saved");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open conversation with Next.js Friend" }),
  ).toHaveCount(1);
});
