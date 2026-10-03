import { test, expect } from "@playwright/test";

test("Arabic commerce cards collect details locally and confirm a persistent demo order", async ({
  page,
}, info) => {
  let providerCalls = 0;
  await page.route("**/api/agent", async (route) => {
    if (route.request().method() === "POST") providerCalls++;
    await route.continue();
  });
  await page.goto("/");
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
  const colors = page.getByRole("region", { name: "اختر لونًا", exact: true });
  await colors.getByRole("checkbox", { name: "بنفسجي", exact: true }).check();
  await colors.getByRole("checkbox", { name: "أزرق", exact: true }).check();
  await colors
    .getByRole("button", { name: "استخدام الاختيارات", exact: true })
    .click();
  const choice = () =>
    page.getByRole("region", { name: "اختيارك", exact: true }).last();
  await choice().getByRole("button", { name: "التوصيل", exact: true }).click();
  const delivery = page.getByRole("region", { name: "التوصيل", exact: true });
  await delivery
    .getByRole("radio", { name: "توصيل سريع", exact: true })
    .check();
  await delivery.getByRole("button", { name: "متابعة", exact: true }).click();
  await choice().getByRole("button", { name: "الإضافات", exact: true }).click();
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
  await expect(details.locator("time")).toHaveAttribute(
    "datetime",
    /^20\d{2}-\d{2}-\d{2}$/,
  );
  await details.getByText("اختيار موعد آخر (اختياري)", { exact: true }).click();
  await details.locator(".calendar-days button:not(:disabled)").first().click();
  await details
    .getByRole("combobox", { name: "الوقت المناسب", exact: true })
    .selectOption("evening");
  await details
    .getByRole("button", { name: "مراجعة الطلب", exact: true })
    .click();
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
        localStorage.getItem("messages-order-" + path!.split("/").pop())!,
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
  await page
    .getByRole("link", { name: "متابعة إلى الدفع", exact: true })
    .click();
  await page.getByRole("button", { name: "محاكاة الدفع", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "تم الدفع التجريبي", exact: true }),
  ).toBeVisible();
  const receipt = await page.locator("code").textContent();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "تم الدفع التجريبي", exact: true }),
  ).toBeVisible();
  await expect(page.locator("code")).toHaveText(receipt!);
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
});
test("orders are unavailable without local data and language preference persists", async ({
  page,
}) => {
  await page.goto("/orders/missing-order");
  await expect(
    page.getByRole("heading", { name: "الطلب غير متاح", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Switch to English", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("dir", "ltr");
});
