import fs from "node:fs";
import path from "node:path";
import { advanceState, applyScenario, createInitialState, makeSnapshot, parseInputs } from "./game-engine.js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || value === undefined) throw new TypeError(`Invalid argument: ${key || ""}`);
    args[key.slice(2)] = value;
  }
  return args;
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new TypeError(`Invalid ${label}: ${error.message}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.seed === undefined || args.night === undefined || args.ticks === undefined || args.out === undefined) {
    throw new TypeError("Required arguments: --seed --night --ticks --out");
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
