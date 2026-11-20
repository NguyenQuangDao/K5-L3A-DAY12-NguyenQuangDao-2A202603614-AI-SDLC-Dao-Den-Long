export const TUNING = {
  playerSpeed: 5,
  carryCapacity: 5,
  lanternCost: 5,
  lanternCount: 5,
  pickupRadius: 1,
  interactRadius: 1.5,
  pulseCost: 1,
  pulseRadius: 3.5,
  nightDuration: 300,
  initialFlames: 3,
  invulnS: 1,
  hitDropRatio: 0.5,
  pulseStunS: 3,
  pulsePushM: 2,
  pulseCooldownS: 3,
  safeRadius: 2,
  shadeSpeed: 2.5,
  shadeHitRadius: 0.8,
  fallEnabled: false,
  score: { mote: 10, lantern: 500, stun: 20, second: 1, flame: 100 }
};

export const LANTERN_POSITIONS = [
  { id: "L1", pos: [0, 0, 25] },
  { id: "L2", pos: [21, 0, 13] },
  { id: "L3", pos: [21, 0, -13] },
  { id: "L4", pos: [-21, 0, -13] },
  { id: "L5", pos: [-21, 0, 13] }
];

export const DEFAULT_MOTES = [
  [0, 0, 5], [8, 0, 8], [-8, 0, 8], [12, 0, -5], [-12, 0, -5]
];

export function distanceXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dz);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMove(move) {
  let x = clamp(move[0] || 0, -1, 1);
  let z = clamp(move[1] || 0, -1, 1);
  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  return [x, z];
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createInitialState(seed = 0, night = 1) {
  const random = mulberry32(seed);
  const shades = [
    { id: "S1", pos: [30, 0, 0], state: "chase", stunTicks: 0, hitCooldownTicks: 0 }
  ];
  const motes = DEFAULT_MOTES.map((pos, index) => ({
    id: `M${index + 1}`,
    pos: [...pos]
  }));
  return {
    seed,
    random,
    night,
    tick: 0,
    state: "playing",
    reason: null,
    timeLeftS: TUNING.nightDuration,
    score: 0,
    player: { pos: [0, 0, 0], flames: TUNING.initialFlames, carried: 0, invulnTicks: 0 },
    lanterns: LANTERN_POSITIONS.map(({ id, pos }) => ({ id, pos: [...pos], lit: false, deposited: 0 })),
    motes,
    shades,
    pulseCooldownTicks: 0,
    randomMotes: true,
    randomShades: true
  };
}

export function applyScenario(state, scenario) {
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    throw new TypeError("Scenario must be a JSON object");
  }
  if (Object.hasOwn(scenario, "player")) {
    if (!scenario.player || typeof scenario.player !== "object") throw new TypeError("Invalid player");
    const pos = scenario.player.pos;
    if (pos !== undefined) state.player.pos = [...pos];
    if (scenario.player.carried !== undefined) state.player.carried = scenario.player.carried;
    if (scenario.player.flames !== undefined) state.player.flames = scenario.player.flames;
  }
  if (Object.hasOwn(scenario, "random_motes")) state.randomMotes = Boolean(scenario.random_motes);
  if (Object.hasOwn(scenario, "random_shades")) state.randomShades = Boolean(scenario.random_shades);
  if (Object.hasOwn(scenario, "motes")) {
    if (!Array.isArray(scenario.motes)) throw new TypeError("motes must be an array");
    state.motes = scenario.motes.map((mote, index) => {
      if (Array.isArray(mote)) {
        if (mote.length !== 3) throw new TypeError("Invalid mote");
        return { id: `M${index + 1}`, pos: [...mote] };
      }
      if (typeof mote === "object" && mote !== null &&
          Array.isArray(mote.pos) && mote.pos.length === 3) {
        return { id: mote.id || `M${index + 1}`, pos: [...mote.pos] };
      }
      throw new TypeError("Invalid mote");
    });
  }
  if (Object.hasOwn(scenario, "shades")) {
    if (!Array.isArray(scenario.shades)) throw new TypeError("shades must be an array");
    state.shades = scenario.shades.map((shade, index) => ({
      id: shade.id || `S${index + 1}`,
      pos: [...shade.pos],
      state: "chase",
      stunTicks: 0,
      hitCooldownTicks: 0
    }));
  }
  if (Object.hasOwn(scenario, "lanterns")) {
    if (!Array.isArray(scenario.lanterns)) throw new TypeError("lanterns must be an array");
    for (const lantern of scenario.lanterns) {
      if (!lantern.id) throw new TypeError("Lantern id is required");
      const found = state.lanterns.find((item) => item.id === lantern.id);
      if (!found) throw new TypeError(`Unknown lantern id: ${lantern.id}`);
      if (lantern.pos) found.pos = [...lantern.pos];
      if (lantern.deposited !== undefined) found.deposited = lantern.deposited;
      if (lantern.lit !== undefined) found.lit = Boolean(lantern.lit);
    }
  }
  if (scenario.time_left_s !== undefined) state.timeLeftS = scenario.time_left_s;
  state.player.invulnTicks = 0;
  state.pulseCooldownTicks = 0;
  state.tick = 0;
  state.state = "playing";
  state.reason = null;
  return state;
}

export function parseInputs(raw) {
  if (raw.frames !== undefined && !Array.isArray(raw.frames)) {
    throw new TypeError("frames must be an array");
  }
  const frames = raw.frames || [];
  let previousTick = -1;
  for (const frame of frames) {
    if (!Number.isInteger(frame.tick) || frame.tick <= previousTick) {
      throw new TypeError("Input ticks must be integers with strictly increasing values");
    }
    previousTick = frame.tick;
  }
  return frames;
}

export function advanceState(state, input = {}) {
  if (state.state !== "playing") return { state, events: [] };

  const events = [];
  const nextTick = state.tick + 1;
  state.tick = nextTick;
  state.timeLeftS = Math.max(0, TUNING.nightDuration - nextTick / 60);

  if (state.player.invulnTicks > 0) state.player.invulnTicks -= 1;
  if (state.pulseCooldownTicks > 0) state.pulseCooldownTicks -= 1;

  const move = normalizeMove(input.move || [0, 0]);
  const yaw = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const worldX = move[0] * cos + move[1] * sin;
  const worldZ = -move[0] * sin + move[1] * cos;
  const step = TUNING.playerSpeed / 60;
  state.player.pos[0] += worldX * step;
  state.player.pos[2] += worldZ * step;

  for (let i = state.motes.length - 1; i >= 0; i -= 1) {
    const mote = state.motes[i];
    if (distanceXZ(state.player.pos, mote.pos) <= TUNING.pickupRadius &&
        state.player.carried < TUNING.carryCapacity) {
      state.motes.splice(i, 1);
      state.player.carried += 1;
      state.score += TUNING.score.mote;
      events.push({ type: "event", tick: nextTick, name: "mote_picked", data: { carried: state.player.carried } });
    }
  }

  if (input.interact) {
    for (const lantern of state.lanterns) {
      if (lantern.lit || distanceXZ(state.player.pos, lantern.pos) > TUNING.interactRadius) continue;
      if (state.player.carried <= 0) continue;
      const amount = Math.min(state.player.carried, TUNING.lanternCost - lantern.deposited);
      if (amount <= 0) continue;
      state.player.carried -= amount;
      lantern.deposited += amount;
      state.score += amount * TUNING.score.mote;
      events.push({ type: "event", tick: nextTick, name: "deposit", data: {
        lantern_id: lantern.id, amount, deposited: lantern.deposited
      } });
      if (lantern.deposited >= TUNING.lanternCost) {
        lantern.lit = true;
        state.score += TUNING.score.lantern;
        events.push({ type: "event", tick: nextTick, name: "lantern_lit", data: { lantern_id: lantern.id } });
      }
    }
  }

  if (input.pulse && state.pulseCooldownTicks <= 0 && state.player.flames >= TUNING.pulseCost) {
    state.player.flames -= TUNING.pulseCost;
    state.pulseCooldownTicks = TUNING.pulseCooldownS * 60;
    const stunnedIds = [];
    for (const shade of state.shades) {
      const distance = distanceXZ(state.player.pos, shade.pos);
      if (distance <= TUNING.pulseRadius) {
        shade.state = "stunned";
        shade.stunTicks = TUNING.pulseStunS * 60;
        stunnedIds.push(shade.id);
        if (distance > 0) {
          const dx = shade.pos[0] - state.player.pos[0];
          const dz = shade.pos[2] - state.player.pos[2];
          const scale = TUNING.pulsePushM / distance;
          shade.pos[0] += dx * scale;
          shade.pos[2] += dz * scale;
        }
        state.score += TUNING.score.stun;
      }
    }
    events.push({ type: "event", tick: nextTick, name: "pulse", data: { stunned_ids: stunnedIds } });
  }

  for (const shade of state.shades) {
    if (shade.stunTicks > 0) {
      shade.stunTicks -= 1;
      if (shade.stunTicks === 0) shade.state = "chase";
      continue;
    }
    shade.state = "chase";
    let inLanternSafeZone = false;
    for (const lantern of state.lanterns) {
      if (lantern.lit && distanceXZ(shade.pos, lantern.pos) <= TUNING.safeRadius) {
        inLanternSafeZone = true;
        break;
      }
    }
    if (inLanternSafeZone) continue;
    const dx = state.player.pos[0] - shade.pos[0];
    const dz = state.player.pos[2] - shade.pos[2];
    const distance = Math.hypot(dx, dz);
    if (distance > 0) {
      const moveStep = TUNING.shadeSpeed / 60;
      shade.pos[0] += (dx / distance) * moveStep;
      shade.pos[2] += (dz / distance) * moveStep;
    }
  }

  for (const shade of state.shades) {
    if (shade.state !== "stunned" && distanceXZ(state.player.pos, shade.pos) <= TUNING.shadeHitRadius &&
        state.player.invulnTicks <= 0) {
      state.player.invulnTicks = TUNING.invulnS * 60;
      const dropped = Math.floor(state.player.carried * TUNING.hitDropRatio);
      state.player.carried -= dropped;
      state.player.flames -= 1;
      events.push({ type: "event", tick: nextTick, name: "player_hit", data: {
        by: "shade", flames: state.player.flames, dropped
      } });
      break;
    }
  }

  if (state.lanterns.every((lantern) => lantern.lit)) {
    state.state = "won";
    state.reason = "all_lit";
    state.score += TUNING.score.second * Math.max(0, Math.ceil(state.timeLeftS));
    state.score += TUNING.score.flame * state.player.flames;
  } else if (state.player.flames <= 0) {
    state.state = "lost";
    state.reason = "no_flames";
  } else if (state.timeLeftS <= 0) {
    state.state = "lost";
    state.reason = "dawn";
  }

  if (state.state !== "playing") {
    events.push({ type: "event", tick: nextTick, name: "game_over", data: {
      result: state.state, reason: state.reason
    } });
  }
  return { state, events };
}

export function round3(value) {
  return Number(Number(value).toFixed(3));
}

export function makeSnapshot(state) {
  return {
    type: "snapshot",
    tick: state.tick,
    sim_tick: state.tick,
    state: state.state,
    time_left_s: round3(state.timeLeftS),
    score: state.score,
    player: {
      pos: state.player.pos.map(round3),
      flames: state.player.flames,
      carried: state.player.carried
    },
    lanterns: state.lanterns.map((lantern) => ({
      id: lantern.id,
      pos: lantern.pos.map(round3),
      lit: lantern.lit,
      deposited: lantern.deposited
    })),
    shades: state.shades.map((shade) => ({
      id: shade.id,
      pos: shade.pos.map(round3),
      state: shade.state
    })),
    motes_active: state.motes.length
  };
}
