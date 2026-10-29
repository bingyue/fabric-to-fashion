import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
const root = process.cwd();
test("complete demo workflow: upload, analysis edit, six looks, revision, PDF, ZIP, persistence", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "创作，从一块面料开始。" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "output/screenshots/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "开启我的创作" }).click();
  await expect(page).toHaveURL(/\/studio\//);
  const projectId = page.url().split("/").pop()!;
  await page
    .getByLabel("上传图片")
    .setInputFiles(path.join(root, "public/demo/fabric.jpg"));
  await expect(page.getByText("fabric.jpg", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "分析面料", exact: true }).click();
  await expect(page.getByText("DEMO · 预设分析")).toBeVisible();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByLabel("面料名称", { exact: true })
    .fill("燕麦色人字纹 · 客户确认");
  await page.getByRole("button", { name: "保存档案" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "下一步 · 定义设计" }).click();
  await page.getByRole("button", { name: "6", exact: true }).click();
  await page
    .getByLabel("设计要求", { exact: true })
    .fill("保留人字纹面料，用于商务通勤，线条简洁，强调系列一致性。");
  await page.getByRole("button", { name: "生成系列 · 6 款" }).click();
  await expect(page.getByText("6 / 6 LOOKS")).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "查看松弛廓形西装" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/screenshots/workbench-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "查看松弛廓形西装" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("款式名称", { exact: true }).fill("人字纹通勤西装");
  await page.getByRole("button", { name: "保存说明" }).click();
  await expect(page.getByText("款式说明已保存")).toBeVisible();
  await page.getByLabel("款式修改要求").fill("收窄领口，保持面料颜色");
  await page.getByRole("button", { name: "应用修改" }).click();
  await expect(page.getByText("版本记录")).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByText("Demo 仅演示调整流程，预置效果图不会改变。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭窗口" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "查看人字纹通勤西装" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "设计提案" }).click();
  await expect(page).toHaveURL(/\/proposal\//);
  await expect(
    page.getByRole("heading", {
      name: "静序 · 自然之间",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/screenshots/proposal-desktop.png",
    fullPage: true,
  });
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PDF 提案" }).click();
  const pdf = await pdfDownload;
  await pdf.saveAs("output/pdf/fabriq-demo-proposal.pdf");
  const bytes = await fs.readFile("output/pdf/fabriq-demo-proposal.pdf");
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  expect(bytes.length).toBeGreaterThan(30000);
  await page.getByRole("link", { name: "返回设计工作台" }).click();
  const zipDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载图片" }).click();
  await (await zipDownload).saveAs("output/collection.zip");
  await page.getByRole("link", { name: "我的项目" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByRole("heading", { name: "静序 · 自然之间", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "收藏项目" }).first().click();
  await page.getByRole("button", { name: /已收藏/ }).click();
  await expect(
    page.getByRole("heading", { name: "静序 · 自然之间", exact: true }),
  ).toBeVisible();
  const other = await context.browser()!.newContext();
  const res = await other.request.get(
    `http://127.0.0.1:3021/api/projects/${projectId}`,
  );
  expect(res.status()).toBe(404);
  await other.close();
  expect(errors).toEqual([]);
});
test("mobile layout and accessible navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "output/screenshots/home-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("link", { name: "模型与设置" }).click();
  await expect(
    page.getByRole("heading", { name: "模型与设置", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "output/screenshots/settings-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("button", { name: "新建设计项目", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\//);
  await page.getByRole("button", { name: /使用燕麦色人字纹示例/ }).click();
  await page.getByRole("button", { name: "分析面料", exact: true }).click();
  await page.getByRole("button", { name: "下一步 · 定义设计" }).click();
  await page.getByRole("button", { name: "生成系列 · 4 款" }).click();
  await expect(page.getByText("4 / 4 LOOKS")).toBeVisible({ timeout: 20000 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "output/screenshots/workbench-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "查看松弛廓形西装" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "设计提案" }).click();
  await expect(page).toHaveURL(/\/proposal\//);
  await expect(
    page.getByRole("button", { name: "导出 PDF 提案" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
test("validation, encrypted settings and an eight-look demo task", async ({
  request,
}) => {
  const created = await request.post("/api/projects");
  const p = await created.json();
  expect(
    (
      await request.post(`/api/projects/${p.id}/generate`, { data: {} })
    ).status(),
  ).toBe(400);
  const invalid = await request.post(`/api/projects/${p.id}/upload`, {
    multipart: {
      files: {
        name: "bad.png",
        mimeType: "image/png",
        buffer: Buffer.from("not a png"),
      },
    },
  });
  expect(invalid.status()).toBe(400);
  await request.post(`/api/projects/${p.id}/upload`, {
    multipart: { sample: "true" },
  });
  await request.post(`/api/projects/${p.id}/analyze`, { data: {} });
  const now = await (await request.get(`/api/projects/${p.id}`)).json();
  await request.patch(`/api/projects/${p.id}`, {
    data: { config: { ...now.config, count: 8, ratio: "16:9" } },
  });
  expect(
    (
      await request.post(`/api/projects/${p.id}/generate`, { data: {} })
    ).status(),
  ).toBe(202);
  await expect
    .poll(
      async () =>
        (await (await request.get(`/api/projects/${p.id}`)).json()).task
          ?.status,
      { timeout: 20000 },
    )
    .toBe("complete");
  const result = await (await request.get(`/api/projects/${p.id}`)).json();
  expect(result.collection.looks).toHaveLength(8);
  expect(
    new Set(result.collection.looks.map((l: { image: string }) => l.image))
      .size,
  ).toBe(8);
  const settings = await (await request.get("/api/settings")).json();
  const secret = "test-secret-NEVER-RETURN";
  const saved = await request.put("/api/settings", {
    data: {
      ...settings,
      text: { ...settings.text, apiKey: secret },
      image: { ...settings.image, apiKey: secret },
    },
  });
  expect(saved.ok()).toBeTruthy();
  expect(await saved.text()).not.toContain(secret);
  const get = await request.get("/api/settings");
  expect(await get.text()).not.toContain(secret);
  const cookie = (await request.storageState()).cookies.find(
    (x) => x.name === "fabric_workspace",
  )!.value;
  const encrypted = await fs.readFile(
    path.join(root, ".data/e2e", cookie, "settings.secure"),
    "utf8",
  );
  expect(encrypted).not.toContain(secret);
  const badUrl = await request.put("/api/settings", {
    data: {
      ...settings,
      text: {
        ...settings.text,
        baseUrl: "http://127.0.0.1:9000",
        apiKey: secret,
      },
    },
  });
  expect(badUrl.status()).toBe(400);
  const cross = await request.post("/api/projects", {
    headers: { Origin: "https://evil.example" },
  });
  expect(cross.status()).toBe(400);
  await request.delete(`/api/projects/${p.id}`);
  expect((await request.get(`/api/projects/${p.id}`)).status()).toBe(404);
});
