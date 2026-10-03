import { test, expect } from "@playwright/test";

test("Arabic generated choices continue a separate poll and persist a named thread", async ({ page }) => {
  await page.goto("/?conversation=agent");
  const composer = page.getByRole("textbox", { name: "الرسالة", exact: true });
  await composer.fill("اعرض اختيارات متعددة");
  await composer.press("Enter");
  const choices = page.getByRole("region", { name: "ما الذي تريد التركيز عليه؟", exact: true });
  await choices.getByRole("checkbox", { name: "تحديد الميزانية", exact: true }).check();
  await choices.getByRole("checkbox", { name: "مقارنة المنتجات", exact: true }).check();
  await choices.getByRole("button", { name: "متابعة", exact: true }).click();
  await expect(page.getByRole("log").getByText("تحديد الميزانية، مقارنة المنتجات", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "إيقاف الرد", exact: true })).toHaveCount(0);
  await composer.fill("أنشئ استطلاع");
  await composer.press("Enter");
  const poll = page.locator(".poll-card").last();
  await expect(poll).toBeVisible();
  await poll.getByRole("button", { name: /السعر/ }).click();
  await expect(page.getByRole("log").getByText("السعر", { exact: true }).last()).toBeVisible();
  await expect.poll(async () => {
    const response = await page.request.get("/api/threads?id=agent");
    return (await response.json()).summary.count;
  }).toBeGreaterThan(3);
  await expect(page.getByRole("button", { name: "إيقاف الرد", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "المحادثات والذاكرة", exact: true }).click();
  await page.getByRole("textbox", { name: "عنوان المحادثة", exact: true }).fill("تجهيز مكتب");
  await page.getByRole("dialog").getByRole("button", { name: "محادثة جديدة", exact: true }).click();
  await expect(page.getByRole("heading", { name: "تجهيز مكتب", exact: true })).toBeVisible();
  await composer.fill("أريد سماعات");
  await composer.press("Enter");
  await expect.poll(async () => {
    const response = await page.request.get("/api/threads");
    return (await response.json()).threads.some((thread) => thread.title === "تجهيز مكتب" && thread.count >= 2);
  }).toBe(true);
  await page.reload();
  const back = page.getByRole("button", { name: "العودة إلى المحادثات", exact: true });
  if (await back.isVisible()) await back.click();
  await page.getByRole("button", { name: "فتح المحادثة مع تجهيز مكتب", exact: true }).click();
  await expect(page.getByRole("log").getByText("أريد سماعات", { exact: true })).toBeVisible();
});

test("SQLite archive is isolated by browser owner and paginates old source IDs", async ({ page, browser }) => {
  await page.goto("/");
  await page.request.get("/api/threads");
  const messages = Array.from({ length: 80 }, (_, i) => ({ id: `archive-${i}`, role: "user", text: `منتج سابق ${i}`, timestamp: i + 1 }));
  const saved = await page.request.post("/api/threads", { data: { id: "agent-test", title: "أرشيف اختبار", messages } });
  expect(saved.ok()).toBe(true);
  const detail = await (await page.request.get("/api/threads?id=agent-test")).json();
  expect(detail.summary.count).toBe(80);
  expect(detail.messages).toHaveLength(50);
  expect((await (await page.request.get("/api/threads?id=agent-test&message=archive-0")).json()).messages[0].text).toBe("منتج سابق 0");
  const other = await browser.newContext();
  const privateDetail = await (await other.request.get("http://127.0.0.1:3127/api/threads?id=agent-test")).json();
  expect(privateDetail.messages).toHaveLength(0);
  await other.close();
});

test("a server-only thread restores readable messages with original source IDs", async ({ page }) => {
  await page.goto("/?conversation=agent");
  await page.request.get("/api/threads");
  await page.request.post("/api/threads", { data: {
    id: "agent-server-only", title: "جلسة من الأرشيف", messages: [
      { id: "original-user", role: "user", text: "سماعات للعمل", timestamp: Date.now() },
      { id: "original-answer", role: "assistant", text: "هل تحتاج عزل ضوضاء؟", timestamp: Date.now() + 1 },
    ],
  } });
  await page.getByRole("button", { name: "المحادثات والذاكرة", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "جلسة من الأرشيف · 2", exact: true }).click();
  await expect(page.getByRole("heading", { name: "جلسة من الأرشيف", exact: true })).toBeVisible();
  await expect(page.locator('article[data-message-id="original-user"]')).toContainText("سماعات للعمل");
  await expect(page.locator('article[data-message-id="original-answer"]')).toContainText("هل تحتاج عزل ضوضاء؟");
});
