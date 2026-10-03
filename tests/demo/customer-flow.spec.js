import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("real application customer walkthrough", async ({ page }, info) => {
  const began = Date.now();
  const chapters = [];
  async function mark(title) {
    chapters.push({
      seconds: Math.round((Date.now() - began) / 100) / 10,
      title,
    });
    await page.waitForTimeout(1700);
  }
  let providerCalls = 0;
  await page.route("**/api/agent", async (route) => {
    if (route.request().method() === "POST") providerCalls++;
    await route.continue();
  });
  await page.goto("/");
  await mark("تصفح الإلكترونيات");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await page
    .getByRole("button", { name: "فتح المحادثة مع نور", exact: true })
    .click();
  await page
    .getByRole("button", { name: "خيارات إضافية", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تصفح المنتجات", exact: true })
    .click();
  await page
    .getByRole("region", { name: "المنتجات", exact: true })
    .getByRole("button", { name: "اختيار هاتف أوربت", exact: true })
    .click();
  await page
    .getByRole("region", { name: "اختيار المساحة أو الحجم", exact: true })
    .getByRole("radio", { name: "٢٥٦ جيجابايت", exact: true })
    .check();
  await mark("اختيار السعة والألوان");
  const colors = page.getByRole("region", { name: "اختر لونًا", exact: true });
  await colors.getByRole("checkbox", { name: "بنفسجي", exact: true }).check();
  await colors.getByRole("checkbox", { name: "أزرق", exact: true }).check();
  await colors
    .getByRole("button", { name: "استخدام الاختيارات", exact: true })
    .click();
  const choice = () =>
    page.getByRole("region", { name: "اختيارك", exact: true }).last();
  await choice().getByRole("button", { name: "التوصيل", exact: true }).click();
  await mark("خيارات التوصيل");
  const delivery = page.getByRole("region", { name: "التوصيل", exact: true });
  await delivery
    .getByRole("radio", { name: "توصيل سريع", exact: true })
    .check();
  await delivery.getByRole("button", { name: "متابعة", exact: true }).click();
  await choice().getByRole("button", { name: "الإضافات", exact: true }).click();
  await mark("اختيار الإضافات");
  const extras = page.getByRole("region", { name: "الإضافات", exact: true });
  await extras
    .getByRole("checkbox", { name: "جراب حماية", exact: true })
    .check();
  await extras
    .getByRole("checkbox", { name: "شاحن USB-C", exact: true })
    .check();
  await extras.getByRole("button", { name: "متابعة", exact: true }).click();
  await choice()
    .getByRole("button", { name: "حفظ الاختيار", exact: true })
    .click();
  await page
    .getByRole("region", { name: "اختيار محفوظ", exact: true })
    .getByRole("button", { name: "إكمال الطلب", exact: true })
    .click();
  await mark("بيانات العميل وموعد الاستلام");
  const details = page.getByRole("region", {
    name: "بيانات العميل",
    exact: true,
  });
  await details
    .getByRole("textbox", { name: "الاسم", exact: true })
    .fill("عميل تجريبي");
  await details
    .getByRole("textbox", { name: "رقم الهاتف", exact: true })
    .fill("01000000000");
  await details
    .getByRole("textbox", { name: "المدينة", exact: true })
    .fill("القاهرة");
  await details
    .getByRole("textbox", { name: "العنوان", exact: true })
    .fill("عنوان تجريبي فقط");
  await details.getByText("اختيار موعد آخر (اختياري)", { exact: true }).click();
  await page.screenshot({ path: info.outputPath("calendar.png") });
  await details.locator(".calendar-days button:not(:disabled)").first().click();
  await details
    .getByRole("combobox", { name: "الوقت المناسب", exact: true })
    .selectOption("evening");
  await details
    .getByRole("button", { name: "مراجعة الطلب", exact: true })
    .click();
  await mark("مراجعة الطلب داخل المحادثة");
  const summary = page.getByRole("region", {
    name: "مراجعة الطلب",
    exact: true,
  });
  await expect(summary).toBeVisible();
  expect(providerCalls).toBe(0);
  const href = await summary
    .getByRole("link", { name: "فتح صفحة الطلب" })
    .getAttribute("href");
  const saved = await page.evaluate(
    (path) =>
      JSON.parse(
        localStorage.getItem("messages-order-" + path.split("/").pop()),
      ),
    href,
  );
  expect(saved.quote.total).toBe(1363);
  await summary.getByRole("link", { name: "فتح صفحة الطلب" }).click();
  await expect(
    page.getByRole("heading", { name: "مراجعة الطلب", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "تأكيد الطلب التجريبي", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "تم تأكيد الطلب التجريبي", exact: true }),
  ).toBeVisible();
  await mark("تأكيد الطلب في صفحة مستقلة");
  await page.getByRole("link", { name: "متابعة إلى الدفع", exact: true }).click();
  await page.getByRole("button", { name: "محاكاة الدفع", exact: true }).click();
  await expect(page.getByRole("heading", { name: "تم الدفع التجريبي", exact: true })).toBeVisible();
  await mark("الدفع التجريبي والإيصال");
  await page.screenshot({ path: info.outputPath("payment.png") });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "تم الدفع التجريبي", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-arabic-order.png`,
  });
  await page
    .getByRole("link", { name: "العودة إلى المحادثة", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "نور", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(`article[data-message-id="${saved.sourceId}"]`),
  ).toHaveClass(/focused-message/);
  await page.waitForTimeout(2200);
  await writeFile(
    info.outputPath("chapters.json"),
    JSON.stringify(
      { recording: "تسجيل فعلي للتطبيق بمنتجات وطلب تجريبي", chapters },
      null,
      2,
    ),
  );
  await page.screenshot({ path: info.outputPath("final.png") });
});
