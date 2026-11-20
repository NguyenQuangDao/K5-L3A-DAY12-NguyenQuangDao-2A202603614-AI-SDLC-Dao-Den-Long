import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function readProofSummary() {
  const verifyRun = spawnSync("npm", ["run", "verify"], { encoding: "utf8" });
  const gitLog = spawnSync("git", ["log", "-n", "6", "--oneline", "--decorate"], { encoding: "utf8" });
  const gitTags = spawnSync("git", ["tag", "--list"], { encoding: "utf8" });
  const bench = fs.existsSync("bench.json") ? JSON.parse(fs.readFileSync("bench.json", "utf8")) : null;
  const soak = fs.existsSync("soak.json") ? JSON.parse(fs.readFileSync("soak.json", "utf8")) : null;
  return {
    verifyExit: verifyRun.status,
    verifyTail: (verifyRun.stdout || "").trim().split("\n").slice(-16).join("\n"),
    gitLog: (gitLog.stdout || "").trim(),
    gitTags: (gitTags.stdout || "").trim(),
    bench,
    soak
  };
}

function buildEvidenceHtml(summary) {
  const benchLines = summary.bench
    ? `avg_fps: ${summary.bench.avg_fps} | p1_low_fps: ${summary.bench.p1_low_fps} | p95: ${summary.bench.frame_ms_p95} ms | load: ${summary.bench.load_s}s\nscene: ${summary.bench.scene.shade_count} shades, ${summary.bench.scene.mote_count} motes, ${summary.bench.scene.lit_lantern_count} lit lanterns @ ${summary.bench.resolution.width}x${summary.bench.resolution.height} | passed: ${summary.bench.passed}`
    : "bench.json not found";
  const soakLines = summary.soak
    ? `nights: ${summary.soak.nights} | crashes: ${summary.soak.crashes} | heap after GC: ${summary.soak.mem_start_mb} MB -> ${summary.soak.mem_end_mb} MB (${summary.soak.duration_s}s)`
    : "soak.json not found";
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<style>
  body { margin: 0; background: #0e1430; color: #f5f1e6; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 28px 36px; box-sizing: border-box; }
  h1 { margin: 0 0 8px; color: #ffb347; font-size: 28px; }
  p.sub { margin: 0 0 18px; color: #c9b48a; font-size: 14px; }
  .grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 18px; }
  .card { background: rgba(18, 26, 62, 0.92); border: 1px solid #3a467a; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
  .card h2 { margin: 0 0 8px; color: #ffe58a; font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; }
  pre { margin: 0; font-size: 12.5px; line-height: 1.45; white-space: pre-wrap; color: #e8e2d0; }
  .pass { color: #6ee7b7; font-weight: bold; }
</style>
</head>
<body>
  <h1>Đảo Đèn Lồng — Bằng Chứng Kiểm Chứng & Harness AI (v1.0.0)</h1>
  <p class="sub">Day 12 AI SDLC · Contract v1.3 · Three.js + Headless Determinism + Playwright Render Benchmark</p>
  <div class="grid">
    <div>
      <div class="card">
        <h2>1. Cổng kiểm chứng một lệnh (npm run verify) — Exit ${summary.verifyExit}</h2>
        <pre>${escapeHtml(summary.verifyTail)}</pre>
      </div>
    </div>
    <div>
      <div class="card">
        <h2>2. Benchmark Render 1280×720 (bench.json)</h2>
        <pre class="pass">${escapeHtml(benchLines)}</pre>
      </div>
      <div class="card">
        <h2>3. Soak Test 10 Đêm (soak.json)</h2>
        <pre class="pass">${escapeHtml(soakLines)}</pre>
      </div>
      <div class="card">
        <h2>4. AI Harness & Git History</h2>
        <pre>Harness: AGENTS.md | .agents/skills/verify-game/SKILL.md | .githooks/pre-commit | scripts/verify-all.mjs | .github/workflows/ci.yml
Tags: ${escapeHtml(summary.gitTags || "phase-1")}
${escapeHtml(summary.gitLog)}</pre>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const output = path.resolve(args.out || "docs/demo/demo.mp4");
  const screenshot = path.resolve(args.screenshot || "docs/proof/gameplay.png");
  const summary = readProofSummary();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-den-long-demo-"));
  const server = await createServer({
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0 }
  });
  let browser;
  let context;
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

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      recordVideo: { dir: tempDir, size: { width: 1280, height: 720 } }
    });
    const page = await context.newPage();
    let pageError = null;
    page.on("pageerror", (error) => { pageError ??= error; });

    await page.addInitScript(() => {
      const sample = [
        { name: "May_Lantern", score: 1420, nights_won: 3, achieved_at: "2026-11-20T14:00:00.000Z", seed: 42 },
        { name: "Dao_SDLC", score: 1185, nights_won: 2, achieved_at: "2026-11-20T14:15:00.000Z", seed: 123 }
      ];
      localStorage.setItem("dao-den-long-leaderboard", JSON.stringify(sample));
    });

    // Part 1: Live 3D gameplay
    await page.goto(`http://127.0.0.1:${address.port}/?demo=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#carried")?.textContent === "10", null, { timeout: 15_000 });
    await page.waitForTimeout(800);

    // Light first lantern (E) -> shows warm glow creativity
    await page.keyboard.down("e");
    await page.waitForTimeout(250);
    await page.keyboard.up("e");
    await page.waitForFunction(() => document.querySelector("#lanterns")?.textContent === "1/5", null, { timeout: 5_000 });
    await page.waitForTimeout(800);

    // Pulse (F) -> stuns and pushes nearby shade
    await page.keyboard.down("f");
    await page.waitForTimeout(250);
    await page.keyboard.up("f");
    await page.waitForFunction(() => document.querySelector("#event-indicator")?.textContent === "Tỏa Sáng", null, { timeout: 5_000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: screenshot });

    // Move, Jump, Dash
    await page.keyboard.down("w");
    await page.keyboard.down("a");
    await page.waitForTimeout(900);
    await page.keyboard.up("a");
    await page.keyboard.up("w");
    await page.keyboard.down("Space");
    await page.waitForTimeout(250);
    await page.keyboard.up("Space");
    await page.waitForTimeout(450);
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(450);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    await page.waitForTimeout(900);

    // Show Accessibility + Colorblind mode
    await page.click("#open-accessibility");
    await page.waitForSelector("#setting-colorblind", { timeout: 5_000 });
    await page.waitForTimeout(800);
    await page.check("#setting-colorblind");
    await page.selectOption("#setting-font-size", "1.25");
    await page.waitForTimeout(1200);
    await page.click("#close-accessibility");
    await page.waitForTimeout(1200);

    // Show Leaderboard UI
    await page.click("#open-leaderboard");
    await page.waitForSelector("#export-leaderboard", { timeout: 5_000 });
    await page.waitForTimeout(1800);
    await page.click("#close-leaderboard");
    await page.waitForTimeout(600);

    // Part 2: Verification evidence, Benchmark, Soak, Harness & Git History
    await page.setContent(buildEvidenceHtml(summary), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6500);

    if (pageError) throw new Error(`Demo browser error: ${pageError.message}`);

    const video = page.video();
    await context.close();
    context = null;
    await browser.close();
    browser = null;
    const videoPath = await video.path();

    fs.mkdirSync(path.dirname(output), { recursive: true });
    const conversion = spawnSync("ffmpeg", [
      "-y", "-i", videoPath, "-an", "-c:v", "libx264", "-preset", "medium",
      "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output
    ], { encoding: "utf8" });
    if (conversion.error) throw conversion.error;
    if (conversion.status !== 0) {
      throw new Error(`FFmpeg could not create the MP4: ${conversion.stderr}`);
    }

    const probe = spawnSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", output
    ], { encoding: "utf8" });
    if (probe.error) throw probe.error;
    if (probe.status !== 0) throw new Error(`Could not verify MP4 duration: ${probe.stderr}`);
    const durationS = Number(probe.stdout.trim());
    if (!Number.isFinite(durationS) || durationS <= 0 || durationS >= 300) {
      throw new Error(`Demo duration must be between 0 and 300 seconds; got ${probe.stdout.trim()}`);
    }
    console.log(JSON.stringify({
      output,
      screenshot,
      duration_s: Number(durationS.toFixed(3)),
      size_bytes: fs.statSync(output).size,
      format: "MP4/H.264",
      scenario: "Live 3D gameplay (lantern lighting, warm glow, pulse, jump, dash, accessibility/colorblind, leaderboard) + verification/benchmark/soak/harness evidence"
    }, null, 2));
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    await server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = error instanceof TypeError ? 2 : 1;
});
