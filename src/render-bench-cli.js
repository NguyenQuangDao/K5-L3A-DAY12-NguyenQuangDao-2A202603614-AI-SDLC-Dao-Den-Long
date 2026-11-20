import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) continue;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new TypeError(`Missing value for ${key}`);
    }
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

function round3(value) {
  return Number(Number(value).toFixed(3));
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const seed = Number(args.seed);
  const duration = Number(args.duration);
  const output = args.out;
  const hasDisplay = process.platform !== "linux" || Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  let headed = args.headed === "true" ? true : args.headed === "false" ? false : hasDisplay;
  if (!Number.isInteger(seed) || !Number.isInteger(duration) || duration <= 0 || !output) {
    throw new TypeError("Usage: npm run bench -- --seed 42 --duration 30 --out bench.json");
  }

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

    const launchBrowser = async (useHeaded) => {
      const browserArgs = ["--enable-webgl", "--ignore-gpu-blocklist"];
      if (!useHeaded) browserArgs.push("--enable-unsafe-swiftshader");
      return chromium.launch({ headless: !useHeaded, args: browserArgs });
    };
    try {
      browser = await launchBrowser(headed);
    } catch (error) {
      if (!headed || args.headed === "true") throw error;
      headed = false;
      browser = await launchBrowser(false);
    }
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    let pageError = null;
    page.on("pageerror", (error) => {
      pageError ??= error;
      console.error(`Browser page error: ${error.message}`);
    });
    page.on("console", (message) => {
      if (message.type() === "error") console.error(`Browser console error: ${message.text()}`);
    });
    await page.goto(
      `http://127.0.0.1:${address.port}/?bench=render&seed=${seed}&duration=${duration}`,
      { waitUntil: "commit" }
    );
    await Promise.race([
      page.waitForFunction(
        () => document.querySelector("#render-benchmark-result")?.dataset.status === "complete",
        null,
        { timeout: (duration + 20) * 1000 }
      ),
      new Promise((resolve, reject) => {
        if (pageError) reject(pageError);
        else page.once("pageerror", reject);
      })
    ]);
    if (pageError) throw new Error(`Browser benchmark failed: ${pageError.message}`);

    const result = JSON.parse(await page.locator("#render-benchmark-result").textContent());
    result.passed = result.passed &&
      result.resolution.width === 1280 &&
      result.resolution.height === 720 &&
      result.scene.shade_count === 200 &&
      result.scene.mote_count === 100 &&
      result.scene.lit_lantern_count === 3;
    result.load_s = round3(result.load_ms / 1000);
    result.browser_mode = headed ? "headed" : "headless";

    const outputPath = path.resolve(output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof TypeError ? 2 : 1;
});
