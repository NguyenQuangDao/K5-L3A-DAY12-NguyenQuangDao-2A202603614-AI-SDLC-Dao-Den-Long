import fs from "node:fs";
import path from "node:path";
import { advanceState, applyScenario, createInitialState, exportLeaderboard, makeSnapshot, parseInputs, NIGHT_1, TUNING } from "./game-engine.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key?.startsWith("--")) continue;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = value;
      i += 1;
    }
  }
  return args;
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new TypeError(`Invalid ${label} file "${file}": ${error.message}`);
  }
}

function runLeaderboardExport(args) {
  const source = path.resolve(args.leaderboard || "leaderboard.json");
  const out = path.resolve(args.out || "leaderboard-export.json");
  const raw = readJson(source, "leaderboard");
  const entries = Array.isArray(raw) ? raw : raw?.entries;
  if (!Array.isArray(entries)) throw new TypeError("Invalid leaderboard: expected an entries array");
  const outDir = path.dirname(out);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(exportLeaderboard(entries), null, 2) + "\n", "utf8");
  console.log(`Leaderboard exported: ${out}`);
}

function getRssMb() {
  return process.memoryUsage().rss / (1024 * 1024);
}

function getRetainedHeapMb() {
  if (typeof global.gc === "function") global.gc();
  return process.memoryUsage().heapUsed / (1024 * 1024);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function round3(value) {
  return Number(Number(value).toFixed(3));
}

function setupBenchState(seed) {
  const state = createInitialState(seed, 1);
  state.randomMotes = false;
  state.randomShades = false;
  state.randomDrifters = false;
  state.shades = [];
  state.motes = [];
  const shadeCount = 200;
  const islandRadius = 40;
  for (let i = 0; i < shadeCount; i++) {
    const angle = (i / shadeCount) * Math.PI * 2;
    const r = islandRadius * 0.85;
    state.shades.push({
      id: `S${i + 1}`,
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      state: "wander", stateTicks: 300, stunTicks: 0,
      hitCooldownTicks: 0, targetLanternId: null,
      recoil: { active: false, ticks: 0, nextState: "chase" }
    });
  }
  const moteCount = 100;
  for (let i = 0; i < moteCount; i++) {
    const angle = (i / moteCount) * Math.PI * 2;
    const r = 12 + (i % 2) * 21;
    state.motes.push({ id: `M${i + 1}`, pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r], kind: "random", ttlS: 8 });
  }
  const litLanterns = ["L1", "L2", "L3"];
  state.lanterns.forEach((l) => {
    if (litLanterns.includes(l.id)) { l.lit = true; l.fuel = 100; l.everLit = true; }
  });
  state.benchMode = true;
  state.player.pos = [0, 0, 0];
  state.player.vel = [0, 0, 0];
  return state;
}

async function runBenchMode(args) {
  const seed = Number(args.seed) || 42;
  const duration = Number(args.duration) || 30;
  const out = args.out || "bench.json";
  if (!Number.isInteger(seed) || !Number.isInteger(duration) || duration <= 0) {
    throw new TypeError("Invalid bench arguments: --seed and --duration required");
  }
  const startTime = process.hrtime.bigint();
  const state = setupBenchState(seed);
  const firstFrameTime = process.hrtime.bigint();
  const loadMs = Number(firstFrameTime - startTime) / 1_000_000;
  const tickIntervalNs = 1_000_000_000n / 60n; // nanoseconds per tick at 60fps
  const warmupTicks = 3 * 60;
  const measureTicks = duration * 60;
  const dtSamples = [];
  const measuredStarts = [];
  let peakMem = 0;
  let measuredEnd = firstFrameTime;
  let nextTickTime = firstFrameTime;
  for (let tick = 0; tick < warmupTicks + measureTicks; tick += 1) {
    const tickStart = process.hrtime.bigint();
    if (tick >= warmupTicks) measuredStarts.push(tickStart);
    const risingInput = { move: [0, 0], cam_yaw_deg: 0, pulse: false, interact: false, jump: false, dash: false, pause: false };
    advanceState(state, risingInput);
    const tickEnd = process.hrtime.bigint();
    if (tick >= warmupTicks) measuredEnd = tickEnd;
    const memMb = getRssMb();
    if (memMb > peakMem) peakMem = memMb;
    nextTickTime += tickIntervalNs;
    const now = process.hrtime.bigint();
    const waitNs = nextTickTime - now;
    if (waitNs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Number(waitNs) / 1_000_000));
    }
    if (tick >= warmupTicks && measuredStarts.length > 1) {
      dtSamples.push(Number(tickStart - measuredStarts[measuredStarts.length - 2]) / 1_000_000);
    }
  }
  const N = dtSamples.length;
  const totalMeasuredMs = measuredStarts.length > 0
    ? Number(measuredEnd - measuredStarts[0]) / 1_000_000
    : 0;
  const avgFps = totalMeasuredMs > 0 ? 1000 * measuredStarts.length / totalMeasuredMs : 0;
  const sortedDt = [...dtSamples].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const topKDt = sortedDt.slice(0, k);
  const avgTopKDt = topKDt.reduce((a, b) => a + b, 0) / k;
  const p1LowFps = avgTopKDt > 0 ? 1000 / avgTopKDt : 0;
  const frameMsP95 = percentile([...dtSamples].sort((a, b) => a - b), 95);
  const result = {
    contract_version: "1.3",
    avg_fps: round3(avgFps),
    p1_low_fps: round3(p1LowFps),
    frame_ms_p95: round3(frameMsP95),
    frames: measuredStarts.length,
    load_ms: round3(loadMs),
    peak_mem_mb: round3(peakMem),
    scene: { shade_count: state.shades.length, mote_count: state.motes.length, lit_lantern_count: state.lanterns.filter((l) => l.lit).length },
    resolution: null,
    vsync_off: true,
    renderer: "headless game-engine tick loop (no renderer)",
    os: process.platform
  };
  const passed = result.avg_fps >= 60 && result.p1_low_fps >= 30 && result.load_ms <= 10_000;
  result.passed = passed;
  const outDir = path.dirname(path.resolve(out));
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.resolve(out), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`Bench complete: avg_fps=${result.avg_fps}, p1_low_fps=${result.p1_low_fps}, frame_ms_p95=${result.frame_ms_p95}, frames=${measuredStarts.length}, load_ms=${result.load_ms}, peak_mem_mb=${result.peak_mem_mb}`);
  process.exit(passed ? 0 : 1);
}

function runSoakMode(args) {
  const seed = Number(args.seed) || 7;
  const nights = Number(args.nights) || 10;
  const out = args.out || "soak.json";
  if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights <= 0) {
    throw new TypeError("Invalid soak arguments: --seed and --nights required");
  }
  const startTime = process.hrtime.bigint();
  const results = [];
  let crashes = 0;
  let memStartMb = null;
  let memEndMb = null;
  const mulberry32 = (s) => {
    let v = s >>> 0;
    return () => {
      v += 0x6D2B79F5;
      let t = v;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rand = mulberry32(seed);
  for (let nightIndex = 1; nightIndex <= nights; nightIndex += 1) {
    const nightSeed = seed + nightIndex;
    let nightState;
    try {
      nightState = createInitialState(nightSeed, (nightIndex - 1) % 3 + 1);
      nightState.randomMotes = false;
      nightState.randomShades = false;
      nightState.randomDrifters = false;
    } catch (e) {
      crashes += 1;
      results.push({ night: nightIndex, error: e.message });
      continue;
    }
    if (memStartMb === null) { memStartMb = getRetainedHeapMb(); }
    let lastDirectionChange = 0;
    let moveDir = [0, 0];
    let ticksRun = 0;
    const maxTicks = 21600;
    try {
      while (nightState.state === "playing" && ticksRun < maxTicks) {
        ticksRun += 1;
        if (ticksRun - lastDirectionChange >= 30) {
          const angle = rand() * Math.PI * 2;
          moveDir = [Math.cos(angle), Math.sin(angle)];
          lastDirectionChange = ticksRun;
        }
        const risingInput = {
          move: moveDir, cam_yaw_deg: 0,
          jump: rand() < 0.05, interact: rand() < 0.10,
          pulse: rand() < 0.02, dash: rand() < 0.03, pause: false
        };
        advanceState(nightState, risingInput);
        if (nightState.state !== "playing") {
          results.push({ night: nightIndex, result: nightState.state, score: nightState.score, ticks: ticksRun });
        }
      }
      if (nightState.state === "playing") {
        results.push({ night: nightIndex, result: "timeout", score: nightState.score, ticks: ticksRun });
      }
    } catch (e) {
      crashes += 1;
      results.push({ night: nightIndex, error: e.message, crashed: true });
    }
  }
  const endTime = process.hrtime.bigint();
  memEndMb = getRetainedHeapMb();
  const durationS = Number(endTime - startTime) / 1_000_000_000;
  const soakResult = {
    nights: nights,
    crashes: crashes,
    results: results.map(r => r.result || "crashed"),
    mem_start_mb: memStartMb !== null ? round3(memStartMb) : null,
    mem_end_mb: memEndMb !== null ? round3(memEndMb) : null,
    memory_metric: "heap_used_after_gc",
    duration_s: round3(durationS)
  };
  const outDir = path.dirname(path.resolve(out));
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.resolve(out), JSON.stringify(soakResult, null, 2) + "\n", "utf8");
  const memOk = memEndMb !== null && memStartMb !== null && memEndMb <= 1.2 * memStartMb;
  const passed = crashes === 0 && memOk;
  console.log(`Soak complete: crashes=${crashes}, mem_start=${soakResult.mem_start_mb}MB, mem_end=${soakResult.mem_end_mb}MB, mem_ok=${memOk}, duration=${durationS}s`);
  process.exit(passed ? 0 : 1);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args["export-leaderboard"] !== undefined) {
    runLeaderboardExport(args);
    process.exit(0);
  }
  if (args.bench !== undefined) {
    await runBenchMode(args);
  }
  if (args.soak !== undefined) {
    runSoakMode(args);
  }
  if (args.seed === undefined || args.night === undefined || args.ticks === undefined || args.out === undefined) {
    throw new TypeError("Missing required arguments: --seed, --night, --ticks, --out");
  }
  const seed = Number(args.seed);
  const night = Number(args.night);
  const ticks = Number(args.ticks);
  const snapshotEvery = args["snapshot-every"] === undefined ? 10 : Number(args["snapshot-every"]);
  if (!Number.isInteger(seed) || !Number.isInteger(night) || night < 1 || night > 3 ||
      !Number.isInteger(ticks) || ticks < 0 || !Number.isInteger(snapshotEvery) || snapshotEvery < 1) {
    throw new TypeError("Invalid numeric arguments");
  }

  const state = createInitialState(seed, night);
  if (args.scenario) applyScenario(state, readJson(path.resolve(args.scenario), "scenario"));
  else {
    state.randomMotes = false;
    state.randomShades = false;
    state.randomDrifters = false;
  }
  const inputs = args.inputs ? parseInputs(readJson(path.resolve(args.inputs), "inputs")) : [];
  let frameIndex = 0;
  let activeInput = { 
    move: [0, 0], 
    cam_yaw_deg: 0, 
    jump: false, 
    interact: false, 
    pulse: false, 
    dash: false,
    pause: false
  };
  let previousPulse = false;
  let previousInteract = false;
  let previousJump = false;
  let previousDash = false;
  let previousPause = false;
  const lines = [JSON.stringify(makeSnapshot(state))];

  for (let tick = 0; tick < ticks && state.state === "playing"; tick += 1) {
    while (frameIndex < inputs.length && inputs[frameIndex].tick <= tick) {
      const frame = inputs[frameIndex];
      for (const key of Object.keys(frame)) {
        if (key !== "tick") activeInput[key] = frame[key];
      }
      frameIndex += 1;
    }
    const risingInput = {
      move: activeInput.move,
      cam_yaw_deg: activeInput.cam_yaw_deg,
      pulse: Boolean(activeInput.pulse) && !previousPulse,
      interact: Boolean(activeInput.interact) && !previousInteract,
      jump: Boolean(activeInput.jump) && !previousJump,
      dash: Boolean(activeInput.dash) && !previousDash,
      pause: Boolean(activeInput.pause) && !previousPause
    };
    previousPulse = Boolean(activeInput.pulse);
    previousInteract = Boolean(activeInput.interact);
    previousJump = Boolean(activeInput.jump);
    previousDash = Boolean(activeInput.dash);
    previousPause = Boolean(activeInput.pause);
    const result = advanceState(state, risingInput);
    lines.push(...result.events.map((event) => JSON.stringify(event)));
    if ((tick + 1) % snapshotEvery === 0 || state.state !== "playing") {
      lines.push(JSON.stringify(makeSnapshot(state)));
    }
  }

  lines.push(JSON.stringify({
    type: "end",
    ticks: state.tick,
    state: state.state,
    score: state.score
  }));
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(path.resolve(args.out), `${lines.join("\n")}\n`, "utf8");
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(error instanceof TypeError ? 2 : 1);
}
