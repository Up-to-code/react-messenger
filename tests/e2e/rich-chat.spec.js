import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("messages-locale", "en"));
});

async function contact(page) {
  await page
    .getByRole("button", {
      name: "Open conversation with Sandra Vicente",
      exact: true,
    })
    .click();
}
async function assistant(page) {
  await page
    .getByRole("button", {
      name: "Open conversation with Noor",
      exact: true,
    })
    .click();
}
const image = {
  name: "test.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=",
    "base64",
  ),
};

test("offline messages queue once and resume with typing and local delivery states", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await contact(page);
  await context.setOffline(true);
  await expect(
    page.getByText(
      "You’re offline. New messages will wait here until you reconnect.",
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Queued hello");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Queued", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByRole("status", { name: "Sandra Vicente is typing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Read", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("log").getByText("Queued hello", { exact: true }),
  ).toHaveCount(1);
});

test("polls, reactions, and quoted replies are interactive", async ({
  page,
}) => {
  await page.goto("/");
  await contact(page);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Create poll", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Question", exact: true })
    .fill("Coffee or tea?");
  await page.getByRole("textbox", { name: "Option 1" }).fill("Coffee");
  await page.getByRole("textbox", { name: "Option 2" }).fill("Tea");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create poll", exact: true })
    .click();
  const poll = page.getByRole("region", { name: "Poll: Coffee or tea?" });
  await poll.getByRole("button", { name: "Vote for Coffee" }).click();
  await expect(
    poll.getByRole("button", { name: "Vote for Coffee" }),
  ).toHaveAttribute("aria-pressed", "true");
  await poll.getByRole("button", { name: "Vote for Tea" }).click();
  await expect(
    poll.getByRole("button", { name: "Vote for Coffee" }),
  ).toHaveAttribute("aria-pressed", "false");
  await poll.getByRole("button", { name: "Vote for Tea" }).click();
  await expect(poll).toContainText("0 votes");
  const message = page.locator("article").last();
  await message
    .getByRole("button", { name: "React to message", exact: true })
    .click();
  await message
    .getByRole("button", { name: "React to message ❤️", exact: true })
    .click();
  await expect(
    message.getByRole("button", { name: "Remove reaction ❤️" }),
  ).toBeVisible();
  await message.getByRole("button", { name: "Reply to message" }).click();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Let’s pick coffee");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.locator("article").last().locator(".quoted-message"),
  ).toContainText("Coffee or tea?");
});

test("image previews decode, zoom, and offer download", async ({ page }) => {
  await page.goto("/");
  await contact(page);
  await page.getByLabel("Attach image", { exact: true }).setInputFiles(image);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const photo = page.getByRole("log").getByRole("img", { name: "test.png" });
  await expect
    .poll(() => photo.evaluate((img) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Preview test.png", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Image preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByRole("dialog")).toContainText("150%");
  await expect(
    page.getByRole("link", { name: "Download image" }),
  ).toHaveAttribute("download", "test.png");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Arabic and mixed-language messages, polls, and emoji search use RTL", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to Arabic" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "محادثة جديدة", exact: true }).click();
  await page
    .getByRole("textbox", { name: "اسم جهة الاتصال" })
    .fill("سارة أحمد");
  await page.getByRole("button", { name: "إنشاء محادثة", exact: true }).click();
  const input = page.getByRole("textbox", { name: "الرسالة", exact: true });
  await expect(input).toHaveAttribute("dir", "auto");
  await input.fill("مرحبًا Sarah! كيف حالك؟");
  await input.press("Enter");
  await expect(
    page.getByRole("log").getByText("مرحبًا Sarah! كيف حالك؟", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "اختيار رمز تعبيري", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "البحث عن رموز تعبيرية" })
    .fill("قهوة");
  await expect(page.locator(".emoji-grid button")).toHaveCount(1);
  await page.locator(".emoji-grid button").click();
  await expect(input).toHaveValue("☕");
  await page.getByRole("button", { name: "إرسال الرسالة" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("assistant streams demo replies, can be stopped, and supports retry after failure", async ({
  page,
}) => {
  await page.goto("/");
  await assistant(page);
  await expect(
    page.locator(".agent-orb, .ai-badge, .prompt-cards, .action-card"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Conversation information" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Noor is an automated contact. Demo mode uses scripted replies",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Help me draft a message");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop generating" }),
  ).toBeVisible();
  await expect(page.locator(".agent-message .message-text")).toContainText(
    "Sure.",
  );
  await page.getByRole("button", { name: "Stop generating" }).click();
  await expect(page.locator(".stopped-label")).toContainText("Stopped");
  const stoppedText = await page
    .locator(".agent-message .message-text")
    .innerText();
  await expect
    .poll(() => page.locator(".agent-message .message-text").innerText(), {
      timeout: 1000,
    })
    .toBe(stoppedText);
  await page.route("**/api/agent", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.continue(),
  );
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Try another message");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.locator(".message-error").getByRole("button", { name: "Retry reply" }),
  ).toBeVisible();
  await page.unroute("**/api/agent");
  await page
    .locator(".message-error")
    .getByRole("button", { name: "Retry reply" })
    .click();
  await expect(page.locator(".agent-message").last()).toContainText(
    "Who’s it for",
    { timeout: 15000 },
  );
  await expect(
    page.getByRole("button", { name: "Stop generating" }),
  ).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator(".action-card")).toHaveCount(0);
});

test("composer stays visible with a focused mobile input and keyboard-sized viewport", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("mobile"),
    "Keyboard layout applies to mobile.",
  );
  await page.goto("/");
  await contact(page);
  await page.getByRole("textbox", { name: "Message", exact: true }).focus();
  await page.setViewportSize({ width: 390, height: 420 });
  const compose = page.locator(".compose");
  await expect
    .poll(
      async () =>
        (await compose.boundingBox()).y + (await compose.boundingBox()).height,
    )
    .toBeLessThanOrEqual(421);
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("textbox", { name: "Message", exact: true })
      .evaluate((node) => getComputedStyle(node).fontSize),
  ).toBe("16px");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Keyboard-safe رسالة");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("log").getByText("Keyboard-safe رسالة", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-keyboard.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(
      async () =>
        (await compose.boundingBox()).y + (await compose.boundingBox()).height,
    )
    .toBeGreaterThan(800);
  // Simulate iOS: the layout viewport stays tall while the visual viewport shrinks and pans.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(window.visualViewport, "offsetTop", {
      configurable: true,
      value: 110,
    });
    window.visualViewport.dispatchEvent(new Event("resize"));
    window.visualViewport.dispatchEvent(new Event("scroll"));
  });
  await expect
    .poll(async () => (await page.locator("main").boundingBox()).y)
    .toBe(110);
  await expect
    .poll(
      async () =>
        (await compose.boundingBox()).y + (await compose.boundingBox()).height,
    )
    .toBeLessThanOrEqual(511);
  await page.evaluate(() => {
    delete window.visualViewport.height;
    delete window.visualViewport.offsetTop;
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => (await page.locator("main").boundingBox()).y)
    .toBe(0);
});

test("IME composition does not send early and reduced motion keeps controls usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await contact(page);
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("مرحبا");
  await input.evaluate((node) =>
    node.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
        isComposing: true,
      }),
    ),
  );
  await expect(input).toHaveValue("مرحبا");
  await input.press("Shift+Enter");
  await input.press("a");
  await expect(input).toHaveValue("مرحبا\na");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("log").getByText("مرحبا\na", { exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".sending-message .bubble")
      .evaluate((node) => parseFloat(getComputedStyle(node).animationDuration)),
  ).toBeLessThan(0.01);
});

test("Noor uses the same poll menu and keeps local votes during a reply", async ({
  page,
}) => {
  await page.goto("/");
  await assistant(page);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Create poll", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Question", exact: true })
    .fill("Coffee or tea?");
  await page.getByRole("textbox", { name: "Option 1" }).fill("Coffee");
  await page.getByRole("textbox", { name: "Option 2" }).fill("Tea");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create poll", exact: true })
    .click();
  const poll = page.getByRole("region", { name: "Poll: Coffee or tea?" });
  await poll.getByRole("button", { name: "Vote for Tea" }).click();
  await expect(page.locator(".agent-message").last()).toContainText(
    "I’d pick coffee",
  );
  await expect(
    page.getByRole("button", { name: "Stop generating" }),
  ).toHaveCount(0);
  await expect(
    poll.getByRole("button", { name: "Vote for Tea" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(poll).toContainText("1 vote");
});
