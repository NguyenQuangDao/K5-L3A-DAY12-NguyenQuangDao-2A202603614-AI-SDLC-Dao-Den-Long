import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

async function run() {
  const server = await createServer({
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0 }
  });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Vite did not provide a local HTTP address");
    }

    const hasDisplay = process.platform !== "linux" || Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
    const launch = async (headed) => chromium.launch({
      headless: !headed,
      args: ["--window-size=1280,720", "--enable-webgl", "--ignore-gpu-blocklist", ...(headed ? [] : ["--enable-unsafe-swiftshader"])]
    });
    try {
      browser = await launch(hasDisplay);
    } catch {
      browser = await launch(false);
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      acceptDownloads: true
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Seed sample leaderboard entries in localStorage before loading
    await page.addInitScript(() => {
      const sample = [
        { name: "May_Lantern", score: 1420, nights_won: 3, achieved_at: "2026-11-20T14:00:00.000Z", seed: 42 },
        { name: "Dao_SDLC", score: 1185, nights_won: 2, achieved_at: "2026-11-20T14:15:00.000Z", seed: 123 }
      ];
      localStorage.setItem("dao-den-long-leaderboard", JSON.stringify(sample));
    });

    await page.goto(`http://127.0.0.1:${address.port}/?demo=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#carried")?.textContent === "10", null, { timeout: 15_000 });

    // 1. Light first lantern (E) and Pulse (F), capture gameplay screenshot with warm lantern glow
    await page.keyboard.down("e");
    await page.waitForTimeout(200);
    await page.keyboard.up("e");
    await page.waitForFunction(() => document.querySelector("#lanterns")?.textContent === "1/5", null, { timeout: 5_000 });
    await page.keyboard.down("f");
    await page.waitForTimeout(200);
    await page.keyboard.up("f");
    await page.waitForTimeout(400);
    fs.mkdirSync("docs/proof", { recursive: true });
    await page.screenshot({ path: "docs/proof/gameplay.png" });

    // 2. Open Accessibility panel, verify settings + colorblind + font size + reset, capture screenshot
    await page.click("#open-accessibility");
    await page.waitForSelector("#setting-colorblind", { timeout: 5_000 });
    await page.check("#setting-colorblind");
    await page.check("#setting-reduced-motion");
    await page.selectOption("#setting-font-size", "1.25");
    await page.click("#reset-key-bindings");
    const a11yState = await page.evaluate(() => ({
      colorblindClass: document.documentElement.classList.contains("colorblind"),
      reducedMotionClass: document.documentElement.classList.contains("reduced-motion"),
      saved: JSON.parse(localStorage.getItem("dao-den-long-a11y") || "{}")
    }));
    if (!a11yState.colorblindClass || !a11yState.reducedMotionClass || a11yState.saved.fontSizeMultiplier !== 1.25) {
      throw new Error(`Accessibility state mismatch: ${JSON.stringify(a11yState)}`);
    }
    await page.waitForTimeout(250);
    await page.screenshot({ path: "docs/proof/a11y-colorblind.png" });
    await page.click("#close-accessibility");

    // 3. Open Leaderboard panel, verify Top entries, click Download JSON, save downloaded file
    await page.click("#open-leaderboard");
    await page.waitForSelector("#export-leaderboard", { timeout: 5_000 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: "docs/proof/leaderboard-ui.png" });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#export-leaderboard")
    ]);
    const exportPath = path.resolve("docs/proof/leaderboard-browser-export.json");
    await download.saveAs(exportPath);
    const exportedJson = JSON.parse(fs.readFileSync(exportPath, "utf8"));
    if (!Array.isArray(exportedJson.entries) || exportedJson.entries.length !== 2) {
      throw new Error(`Unexpected leaderboard export: ${JSON.stringify(exportedJson)}`);
    }

    if (errors.length > 0) {
      throw new Error(`Browser page errors: ${errors.join("; ")}`);
    }

    console.log(JSON.stringify({
      status: "passed",
      screenshots: [
        "docs/proof/gameplay.png",
        "docs/proof/a11y-colorblind.png",
        "docs/proof/leaderboard-ui.png"
      ],
      leaderboard_export: "docs/proof/leaderboard-browser-export.json",
      leaderboard_entries: exportedJson.entries.length,
      accessibility_verified: a11yState
    }, null, 2));
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
