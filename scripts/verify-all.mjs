import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function runStep(label, command, args, { expectedExit = 0 } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.error) {
    throw new Error(`[FAIL] ${label}: ${result.error.message}`);
  }
  if (result.status !== expectedExit) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`[FAIL] ${label}: expected exit ${expectedExit}, got ${result.status}`);
  }
  console.log(`[PASS] ${label}`);
  return result;
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dao-den-long-verify-"));
try {
  // 1. Syntax check all source scripts
  for (const file of [
    "src/game-engine.js",
    "src/headless-cli.js",
    "src/main.js",
    "src/render-bench-cli.js",
    "src/demo-video-cli.js"
  ]) {
    runStep(`syntax ${file}`, "node", ["--check", file]);
  }

  // 2. Unit tests
  runStep("unit tests (vitest)", "npm", ["test"]);

  // 3. Production build
  runStep("production build", "npm", ["run", "build"]);

  // 4. Determinism check (two identical runs must be byte-for-byte identical)
  const detA = path.join(tempDir, "det-a.jsonl");
  const detB = path.join(tempDir, "det-b.jsonl");
  runStep("headless determinism run A", "node", [
    "src/headless-cli.js", "--seed", "123", "--night", "1", "--ticks", "600", "--snapshot-every", "10", "--out", detA
  ]);
  runStep("headless determinism run B", "node", [
    "src/headless-cli.js", "--seed", "123", "--night", "1", "--ticks", "600", "--snapshot-every", "10", "--out", detB
  ]);
  const bufA = fs.readFileSync(detA);
  const bufB = fs.readFileSync(detB);
  if (!bufA.equals(bufB)) {
    throw new Error("[FAIL] determinism check: outputs differed for identical seed/night/ticks");
  }
  console.log("[PASS] determinism byte-for-byte match");

  // 5. Key headless scenarios (Phase 2 + Phase 3)
  const scenarioChecks = [
    {
      label: "phase2 starting shades move on tick 1",
      args: ["--seed", "42", "--night", "1", "--ticks", "5", "--snapshot-every", "1", "--scenario", "docs/proof/scenarios/phase2-starting-shades.json"],
      assert: (text) => text.includes('"type":"snapshot","tick":1') && !text.includes('"name":"player_hit"')
    },
    {
      label: "phase2 dash + cooldown",
      args: ["--seed", "1", "--night", "1", "--ticks", "20", "--snapshot-every", "1", "--scenario", "docs/proof/scenarios/phase2-dash.json", "--inputs", "docs/proof/scenarios/phase2-dash.inputs.json"],
      assert: (text) => text.includes('"name":"dash"')
    },
    {
      label: "phase2 drifter idle -> chase & steal",
      args: ["--seed", "7", "--night", "2", "--ticks", "5", "--snapshot-every", "1", "--scenario", "docs/proof/scenarios/phase2-drifter-chase.json"],
      assert: (text) => text.includes('"state":"chase"') && text.includes('"name":"drifter_steal"')
    },
    {
      label: "phase2 drifter flee & drop on pulse",
      args: ["--seed", "7", "--night", "2", "--ticks", "305", "--snapshot-every", "10", "--scenario", "docs/proof/scenarios/phase2-drifter-pulse.json", "--inputs", "docs/proof/scenarios/phase2-drifter-pulse.inputs.json"],
      assert: (text) => text.includes('"name":"drifter_drop"')
    },
    {
      label: "phase2 wind schedule deterministic",
      args: ["--seed", "42", "--night", "3", "--ticks", "2105", "--snapshot-every", "60", "--scenario", "docs/proof/scenarios/phase2-wind-schedule.json"],
      assert: (text) => text.includes('"active":true')
    },
    {
      label: "phase3 dawn win",
      args: ["--seed", "42", "--night", "1", "--ticks", "1", "--snapshot-every", "1", "--scenario", "docs/proof/scenarios/phase3-dawn-win.json"],
      assert: (text) => text.includes('"state":"won"') && text.includes('"reason":"dawn_survived"')
    },
    {
      label: "phase3 pulse cost & stun",
      args: ["--seed", "1", "--night", "1", "--ticks", "5", "--snapshot-every", "1", "--scenario", "docs/proof/scenarios/phase3-pulse.json", "--inputs", "docs/proof/scenarios/phase3-pulse.inputs.json"],
      assert: (text) => text.includes('"name":"pulse"') && text.includes('"state":"stunned"')
    },
    {
      label: "phase3 hit drop half motes",
      args: ["--seed", "1", "--night", "1", "--ticks", "5", "--snapshot-every", "1", "--scenario", "docs/proof/scenarios/phase3-hit-drop.json"],
      assert: (text) => text.includes('"name":"player_hit"') && text.includes('"dropped":2')
    },
    {
      label: "phase3 pause freezes sim_tick",
      args: ["--seed", "1", "--night", "1", "--ticks", "5", "--snapshot-every", "1", "--inputs", "docs/proof/scenarios/phase3-pause.inputs.json"],
      assert: (text) => text.includes('"state":"paused"') && text.includes('"sim_tick":0')
    }
  ];

  for (const check of scenarioChecks) {
    const outPath = path.join(tempDir, `${check.label.replace(/[^a-z0-9]+/gi, "_")}.jsonl`);
    runStep(check.label, "node", ["src/headless-cli.js", ...check.args, "--out", outPath]);
    const text = fs.readFileSync(outPath, "utf8");
    if (!check.assert(text)) {
      throw new Error(`[FAIL] assertion failed for ${check.label}`);
    }
  }

  // 6. Invalid scenario must exit with code 2
  runStep("invalid scenario exits with code 2", "node", [
    "src/headless-cli.js", "--seed", "1", "--night", "1", "--ticks", "10",
    "--scenario", "docs/proof/invalid-scenario.json",
    "--out", path.join(tempDir, "invalid.jsonl")
  ], { expectedExit: 2 });

  // 7. Soak test (10 nights, 0 crashes, memory stable)
  runStep("soak test 10 nights", "node", [
    "--expose-gc", "src/headless-cli.js", "--soak", "--seed", "7", "--nights", "10",
    "--out", path.join(tempDir, "soak.json")
  ]);

  console.log("\nALL VERIFICATION CHECKS PASSED.");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

