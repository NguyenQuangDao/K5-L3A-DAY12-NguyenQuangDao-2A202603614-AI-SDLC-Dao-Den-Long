export const TUNING = {
  playerSpeed: 6.0,
  carryCapacity: 10,
  capacityMax: 20,
  lanternCost: 10,
  lanternCount: 5,
  pickupRadius: 1.0,
  interactRadius: 2.0,
  pulseCost: 3,
  pulseRadius: 5.0,
  pulseStunS: 2,
  pulsePushM: 4,
  pulseCooldownS: 3,
  safeRadius: 6.0,
  shadeSpeed: 4.0,
  shadeSpeedNight3: 4.5,
  shadeHitRadius: 1.0,
  fallEnabled: true,
  jumpVelocity: 7.0,
  gravity: -20.0,
  dashSpeed: 14.0,
  dashDurationS: 0.2,
  dashCooldownS: 1.5,
  nightDurations: [240, 270, 300],
  initialFlames: 3,
  invulnS: 1.5,
  hitDropRatio: 0.5,
  score: { mote: 5, lantern: 100, lanternRelight: 40, stun: 5, stunDrainBonus: 15, flame: 50, dawnLantern: 50, dawnFlame: 50 },
  charmSpeed: 7.2,
  charmDurationTicks: 600,
  charmCooldownTicks: 2700,
  drifters: { speed: 7.0, idleSpeed: 2.0, maxCount: 2, pickupRadius: 1.2, fleeTicks: 300 },
  windCycleTicks: 30 * 60,
  windDurationTicks: 5 * 60,
  windForce: 3.0,
  fuelMax: 100,
  fuelDecayPerS: 1.0,
  fuelPerMote: 10,
  relightCost: 5,
  winRatio: 0.6,
  drainPerS: 5,
  lowFuelThreshold: 30
};

export const NIGHT_1 = {
  lanterns: [
    { id: "L1", pos: [0, 0, 25] },
    { id: "L2", pos: [23.8, 0, 7.7] },
    { id: "L3", pos: [14.7, 0, -20.2] },
    { id: "L4", pos: [-14.7, 0, -20.2] },
    { id: "L5", pos: [-23.8, 0, 7.7] }
  ],
  motes: [],
  moteCount: 20,
  maxMotes: 30,
  moteSpawnTicks: [240, 480],
  moteWaveCount: 8,
  shades: [],
  startingShadeCount: 2,
  shadeCount: 6,
  shadeSpawnTick: 5 * 60,
  shadeSpawnInterval: 8 * 60,
  islandRadius: 40,
  spawnPos: [0, 0, 0]
};

export const NIGHT_2 = {
  lanterns: [
    { id: "L1", pos: [0, 0, 20] },
    { id: "L2", pos: [17, 0, -10] },
    { id: "L3", pos: [-17, 0, -10] },
    { id: "L4", pos: [70, 0, 20] },
    { id: "L5", pos: [87, 0, -10] },
    { id: "L6", pos: [53, 0, -10] }
  ],
  motes: [],
  motesPerIsland: 12,
  maxMotes: 30,
  moteSpawnTicks: [240, 480],
  moteSpawnPerIsland: 8,
  shades: [],
  startingShadeCount: 2,
  shadeCount: 8,
  shadeSpawnTick: 5 * 60,
  shadeSpawnInterval: 7 * 60,
  drifters: [],
  driftersSpawnTick: 1200,
  driftersInterval: 1200,
  jumpPads: [
    { pos: [20, 0, 18], target: [50, 0, -18], dir: [-0.6, 0, -0.8], velocityY: 14, velocityH: 24 },
    { pos: [50, 0, -18], target: [20, 0, 18], dir: [0.6, 0, 0.8], velocityY: 14, velocityH: 24 }
  ],
  islandA: { center: [0, 0, 0], radius: 28 },
  islandB: { center: [70, 0, 0], radius: 28 },
  spawnPos: [0, 0, 0]
};

export const NIGHT_3 = {
  lanterns: [
    { id: "L1", pos: [0, 6, 6] },
    { id: "L2", pos: [18, 3, 10] },
    { id: "L3", pos: [-18, 3, 10] },
    { id: "L4", pos: [35, 0, -10] },
    { id: "L5", pos: [-35, 0, -10] },
    { id: "L6", pos: [20, 0, -35] },
    { id: "L7", pos: [-20, 0, -35] }
  ],
  motes: [],
  motesPerLevel: 30,
  maxMotes: 30,
  moteSpawnTicks: [240, 480],
  shades: [],
  startingShadeCount: 2,
  shadeCount: 10,
  shadeSpawnTick: 5 * 60,
  shadeSpawnInterval: 6 * 60,
  drifters: [],
  driftersSpawnTick: 1200,
  driftersInterval: 1200,
  jumpPad: { pos: [0, 3, 13], velocityY: 12, velocityH: 8 },
  towers: [],
  spawnPos: [0, 0, 0]
};

export function distanceXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dz);
}

export function distance3D(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
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

function round1(value) {
  return Number(Number(value).toFixed(1));
}

function fuelRound(value) {
  return Math.round(value * 60) / 60;
}

function tieNearest(items, pos, getId) {
  let best = null;
  let bestDist = Infinity;
  for (const item of items) {
    const d = distanceXZ(pos, item.pos);
    if (d < bestDist - 1e-9 || (Math.abs(d - bestDist) < 1e-9 && (!best || getId(item) < getId(best)))) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}

function nextMoteId(state, prefix) {
  let id;
  do {
    state.moteIdSequence = (state.moteIdSequence || 0) + 1;
    id = `${prefix}${state.moteIdSequence}`;
  } while (state.motes.some((mote) => mote.id === id));
  return id;
}

export function createInitialState(seed = 0, night = 1) {
  const random = mulberry32(seed);
  const isNight1 = night === 1;
  const isNight2 = night === 2;
  const isNight3 = night === 3;

  const config = isNight1 ? NIGHT_1 : isNight2 ? NIGHT_2 : NIGHT_3;
  const shades = [];
  const shadeSpawnRadius = (config.islandRadius ?? config.islandA?.radius ?? 40) - 3;

  for (let i = 0; i < config.startingShadeCount; i++) {
    const angle = (i / config.startingShadeCount) * Math.PI * 2;
    shades.push({
      id: `S${i + 1}`,
      pos: [
        config.spawnPos[0] + Math.cos(angle) * shadeSpawnRadius,
        0,
        config.spawnPos[2] + Math.sin(angle) * shadeSpawnRadius
      ],
      state: "wander",
      stateTicks: 300,
      stunTicks: 0,
      hitCooldownTicks: 0,
      targetLanternId: null,
      recoil: { active: false, ticks: 0, nextState: "chase" }
    });
  }

  const motes = [];
  if (config.motes.length === 0) {
    const initialPositions = [];
    if (isNight1) {
      for (let i = 0; i < config.moteCount; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = i < 8 ? 12 : 33;
        initialPositions.push([
          Math.cos(angle) * r,
          0,
          Math.sin(angle) * r
        ]);
      }
    } else if (isNight2) {
      const islands = [config.islandA, config.islandB];
      islands.forEach((island, islandIdx) => {
        for (let i = 0; i < config.motesPerIsland / 2; i++) {
          const angle = i * Math.PI / 2;
          const r = i < 2 ? 10 : 22;
          initialPositions.push([
            island.center[0] + Math.cos(angle) * r,
            0,
            island.center[2] + Math.sin(angle) * r
          ]);
        }
      });
    } else if (isNight3) {
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        initialPositions.push([
          Math.cos(angle) * 34,
          0,
          Math.sin(angle) * 34
        ]);
      }
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        initialPositions.push([
          Math.cos(angle) * 18,
          3,
          Math.sin(angle) * 18
        ]);
      }
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 4) + (i * Math.PI / 2);
        initialPositions.push([
          Math.cos(angle) * 5,
          6,
          Math.sin(angle) * 5
        ]);
      }
    }
    const maxInitialMotes = config.moteCount ?? config.motesPerIsland ?? config.motesPerLevel ?? initialPositions.length;
    initialPositions.forEach((pos, i) => {
      if (i < maxInitialMotes) {
        motes.push({
          id: `M${i + 1}`,
          pos: [...pos],
          kind: "random",
          ttlS: 480 / 60
        });
      }
    });
  }

  const drifters = [];
  if (isNight2 || isNight3) {
    for (let i = 0; i < config.driftersSpawnTick / 1200; i++) {
      drifters.push({
        id: `D${i + 1}`,
        pos: [0, 0, 0],
        state: "idle",
        stateTicks: 1440,
        stolen: []
      });
    }
  }

  const charms = [];
  if (isNight2) {
    charms.push({
      id: "C1",
      available: true,
      respawnS: 0,
      pos: [35, 0, 0]
    });
  } else if (isNight3) {
    charms.push(
      { id: "C1", available: true, respawnS: 0, pos: [30, 0, 25] },
      { id: "C2", available: true, respawnS: 0, pos: [-30, 0, 25] }
    );
  }

  return {
    seed,
    random,
    night,
    tick: 0,
    simTick: 0,
    state: "playing",
    reason: null,
    timeLeftS: TUNING.nightDurations[night - 1],
    scenarioTimeOffsetS: 0,
    score: 0,
    wind: { active: false, dirDeg: 0 },
    windManual: false,
    player: {
      pos: [...config.spawnPos],
      flames: TUNING.initialFlames,
      carried: 0,
      capacity: TUNING.carryCapacity,
      successfulLights: 0,
      invulnTicks: 0,
      vel: [0, 0, 0],
      grounded: true,
      dashCdTicks: 0,
      pulseCdTicks: 0,
      charmS: 0,
      falling: false,
      respawnTicks: 0,
      lastHitTick: -1
    },
    lanterns: config.lanterns.map(({ id, pos }) => ({ id, pos: [...pos], lit: false, deposited: 0, fuel: 0, everLit: false, relitCount: 0 })),
    motes: motes.length > 0 ? motes : [],
    moteIdSequence: motes.length,
    shades,
    drifters,
    charms,
    dashDuration: 0,
    dashTimer: 0,
    pulseCooldownTicks: 0,
    randomMotes: true,
    randomShades: true,
    randomDrifters: isNight2 || isNight3,
    windEnabled: isNight3,
    paused: false
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
    if (scenario.player.invuln_ticks !== undefined) state.player.invulnTicks = scenario.player.invuln_ticks;
    if (scenario.player.dash_cd_ticks !== undefined) state.player.dashCdTicks = scenario.player.dash_cd_ticks;
    if (scenario.player.pulse_cd_ticks !== undefined) state.player.pulseCdTicks = scenario.player.pulse_cd_ticks;
    if (scenario.player.charm_ticks !== undefined) state.player.charmS = scenario.player.charm_ticks / 60;
    if (scenario.player.successful_lights !== undefined) state.player.successfulLights = scenario.player.successful_lights;
    if (scenario.player.capacity !== undefined) state.player.capacity = scenario.player.capacity;
    else if (scenario.player.successful_lights !== undefined) {
      state.player.capacity = Math.min(TUNING.capacityMax, TUNING.carryCapacity + 2 * state.player.successfulLights);
    }
  }
  if (state.player.capacity === undefined) state.player.capacity = Math.min(TUNING.capacityMax, TUNING.carryCapacity + 2 * (state.player.successfulLights || 0));
  if (Object.hasOwn(scenario, "random_motes")) state.randomMotes = Boolean(scenario.random_motes);
  if (Object.hasOwn(scenario, "random_shades")) state.randomShades = Boolean(scenario.random_shades);
  if (Object.hasOwn(scenario, "random_drifters")) state.randomDrifters = Boolean(scenario.random_drifters);
  if (Object.hasOwn(scenario, "wind_enabled")) state.windEnabled = Boolean(scenario.wind_enabled);
  if (Object.hasOwn(scenario, "wind")) {
    state.windManual = true;
    if (scenario.wind.active !== undefined) state.wind.active = Boolean(scenario.wind.active);
    if (scenario.wind.dir_deg !== undefined) state.wind.dirDeg = scenario.wind.dir_deg;
  }
  if (Object.hasOwn(scenario, "motes")) {
    if (!Array.isArray(scenario.motes)) throw new TypeError("motes must be an array");
    state.motes = scenario.motes.map((mote, index) => {
      if (Array.isArray(mote)) {
        if (mote.length !== 3) throw new TypeError("Invalid mote");
        return { id: `M${index + 1}`, pos: [...mote], kind: "random", ttlS: 480 / 60 };
      }
      if (typeof mote === "object" && mote !== null &&
          Array.isArray(mote.pos) && mote.pos.length === 3) {
        return {
          id: mote.id || `M${index + 1}`,
          pos: [...mote.pos],
          kind: mote.kind || "random",
          ttlS: mote.ttl_s !== undefined ? mote.ttl_s : 480 / 60
        };
      }
      throw new TypeError("Invalid mote");
    });
  }
  if (Object.hasOwn(scenario, "shades")) {
    if (!Array.isArray(scenario.shades)) throw new TypeError("shades must be an array");
    state.shades = scenario.shades.map((shade, index) => ({
      id: shade.id || `S${index + 1}`,
      pos: [...shade.pos],
      state: shade.state || "chase",
      stateTicks: shade.state_ticks_left !== undefined ? shade.state_ticks_left : 0,
      stunTicks: shade.stun_ticks !== undefined ? shade.stun_ticks : 0,
      hitCooldownTicks: 0,
      targetLanternId: shade.target_lantern_id !== undefined ? shade.target_lantern_id : null,
      recoil: { active: false, ticks: 0, nextState: "chase" }
    }));
  }
  if (Object.hasOwn(scenario, "drifters")) {
    if (!Array.isArray(scenario.drifters)) throw new TypeError("drifters must be an array");
    state.drifters = scenario.drifters.map((drifter, index) => ({
      id: drifter.id || `D${index + 1}`,
      pos: [...drifter.pos],
      state: drifter.state || "idle",
      stateTicks: drifter.state_ticks_left !== undefined ? drifter.state_ticks_left : 0,
      stolen: drifter.stolen || []
    }));
  }
  if (Object.hasOwn(scenario, "charms")) {
    if (!Array.isArray(scenario.charms)) throw new TypeError("charms must be an array");
    state.charms = scenario.charms.map((charm, index) => ({
      id: charm.id || `C${index + 1}`,
      available: charm.available !== undefined ? Boolean(charm.available) : true,
      respawnS: charm.respawn_s !== undefined ? charm.respawn_s : 0,
      pos: [...charm.pos]
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
      if (lantern.fuel !== undefined) found.fuel = lantern.fuel;
      if (lantern.ever_lit !== undefined) found.everLit = Boolean(lantern.ever_lit);
      if (lantern.relit_count !== undefined) found.relitCount = lantern.relit_count;
      if (found.lit) {
        if (lantern.fuel === undefined) found.fuel = TUNING.fuelMax;
        if (lantern.ever_lit === undefined) found.everLit = true;
      } else {
        if (lantern.fuel === undefined) found.fuel = 0;
      }
    }
  }
  if (scenario.time_left_s !== undefined) {
    if (!Number.isFinite(scenario.time_left_s) || scenario.time_left_s < 0) {
      throw new TypeError("time_left_s must be a non-negative number");
    }
    state.timeLeftS = scenario.time_left_s;
    state.scenarioTimeOffsetS = TUNING.nightDurations[state.night - 1] - scenario.time_left_s;
  }
  state.tick = 0;
  state.simTick = 0;
  if (scenario.time_left_s === undefined) state.scenarioTimeOffsetS = 0;
  state.pulseCooldownTicks = 0;
  state.state = "playing";
  state.reason = null;
  return state;
}

export function parseInputs(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Inputs must be a JSON object");
  }
  if (raw.frames !== undefined && !Array.isArray(raw.frames)) {
    throw new TypeError("frames must be an array");
  }
  const frames = raw.frames || [];
  let previousTick = -1;
  for (const frame of frames) {
    if (!frame || typeof frame !== "object" || Array.isArray(frame) ||
        !Number.isInteger(frame.tick) || frame.tick <= previousTick) {
      throw new TypeError("Input ticks must be integers with strictly increasing values");
    }
    previousTick = frame.tick;
  }
  return frames;
}

function pushShadesNearLantern(state, lantern, nextTick) {
  for (const shade of state.shades) {
    if (shade.state === "removed") continue;
    if (distanceXZ(shade.pos, lantern.pos) <= 6) {
      shade.recoil.active = true;
      shade.recoil.ticks = 30;
      shade.recoil.nextState = "wander";
      shade.state = "recoil";
    }
  }
}

function chooseShadeTarget(shade, state) {
  const weak = state.lanterns.filter(l => l.lit && l.fuel < TUNING.lowFuelThreshold);
  if (weak.length > 0) {
    const best = tieNearest(weak, shade.pos, (l) => l.id);
    shade.targetLanternId = best.id;
    return { type: "weak", lantern: best };
  }
  const unlit = state.lanterns.filter(l => !l.lit);
  if (unlit.length > 0) {
    const best = tieNearest(unlit, shade.pos, (l) => l.id);
    shade.targetLanternId = best.id;
    return { type: "unlit", lantern: best };
  }
  shade.targetLanternId = null;
  return null;
}

export function advanceState(state, input = {}) {
  if (state.state !== "playing") return { state, events: [] };

  const events = [];
  const nextTick = state.tick + 1;

  if (input.pause) {
    state.paused = !state.paused;
    events.push({ type: "event", tick: nextTick, name: state.paused ? "paused" : "resumed", data: {} });
  }
  if (state.paused) {
    state.tick = nextTick;
    return { state, events };
  }

  state.tick = nextTick;
  state.simTick = (state.simTick ?? state.tick - 1) + 1;
  const simTick = state.simTick;

  if (state.night === 3 && state.windEnabled && !state.windManual) {
    const cycleTick = simTick % TUNING.windCycleTicks;
    if (cycleTick === 0) {
      state.wind.active = true;
      state.wind.dirDeg = Math.floor(state.random() * 360);
    } else if (cycleTick === TUNING.windDurationTicks) {
      state.wind.active = false;
    }
  }

  // Update night duration
  const nightDuration = TUNING.nightDurations[state.night - 1] || 300;
  state.timeLeftS = Math.max(0, nightDuration - simTick / 60 - state.scenarioTimeOffsetS);

  // Decrement timers
  if (state.player.invulnTicks > 0) state.player.invulnTicks -= 1;
  if (state.player.dashCdTicks > 0) state.player.dashCdTicks -= 1;
  if (state.player.pulseCdTicks > 0) state.player.pulseCdTicks -= 1;
  if (state.player.charmS > 0) state.player.charmS = Math.max(0, state.player.charmS - 1/60);

  state.shades.forEach(s => {
    if (s.stunTicks > 0) s.stunTicks -= 1;
    if (s.hitCooldownTicks > 0) s.hitCooldownTicks -= 1;
    if (s.recoil.active && s.recoil.ticks > 0) s.recoil.ticks -= 1;
    if (s.stateTicks > 0) s.stateTicks -= 1;
  });
  state.drifters.forEach(d => {
    if (d.stateTicks > 0) d.stateTicks -= 1;
  });
  if (state.player.respawnTicks > 0) {
    state.player.respawnTicks -= 1;
    if (state.player.respawnTicks === 0) {
      state.player.pos = [0, 0, 0];
      state.player.vel = [0, 0, 0];
      state.player.invulnTicks = 90;
      state.player.falling = false;
    }
  }

  // Move player
  const move = normalizeMove(input.move || [0, 0]);
  const yaw = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const worldX = -move[0] * cos + move[1] * sin;
  const worldZ = move[0] * sin + move[1] * cos;

  const baseSpeed = state.player.charmS > 0 ? TUNING.charmSpeed : TUNING.playerSpeed;
  let speed = baseSpeed;
  if (state.dashTimer > 0) {
    speed = TUNING.dashSpeed;
    state.dashTimer = Math.max(0, state.dashTimer - 1);
  }
  const step = speed / 60;

  state.player.pos[0] += worldX * step;
  state.player.pos[2] += worldZ * step;
  if (state.windEnabled && state.wind.active) {
    const windRadians = state.wind.dirDeg * Math.PI / 180;
    state.player.pos[0] += Math.cos(windRadians) * TUNING.windForce / 60;
    state.player.pos[2] += Math.sin(windRadians) * TUNING.windForce / 60;
  }

  if (input.jump && state.player.grounded) {
    state.player.vel[1] = TUNING.jumpVelocity;
    state.player.grounded = false;
  }

  state.player.vel[1] += TUNING.gravity / 60;
  state.player.pos[1] += state.player.vel[1] / 60;

  if (state.player.pos[1] < -10) {
    handleFall(state, events);
  }

  state.player.grounded = false;
  if (state.player.pos[1] <= 0) {
    state.player.pos[1] = 0;
    state.player.vel[1] = 0;
    state.player.grounded = true;
  }

  checkJumpPads(state, input);

  // Pick up motes
  for (let i = state.motes.length - 1; i >= 0; i--) {
    const mote = state.motes[i];
    if (distanceXZ(state.player.pos, mote.pos) <= TUNING.pickupRadius &&
        state.player.carried < state.player.capacity) {
      const groundY = getGroundY(state, mote.pos);
      if (Math.abs(state.player.pos[1] - groundY) <= 1.5) {
        state.motes.splice(i, 1);
        state.player.carried += 1;
        events.push({ type: "event", tick: nextTick, name: "mote_picked", data: { carried: state.player.carried } });
      }
    }
  }

  // Pick up charms
  for (let i = 0; i < state.charms.length; i++) {
    const charm = state.charms[i];
    if (charm.available && distanceXZ(state.player.pos, charm.pos) <= TUNING.pickupRadius) {
      state.player.charmS = TUNING.charmDurationTicks / 60;
      charm.available = false;
      charm.respawnS = TUNING.charmCooldownTicks / 60;
      events.push({ type: "event", tick: nextTick, name: "charm_picked", data: { charm_id: charm.id, charm_ticks: TUNING.charmDurationTicks } });
    }
  }

  // Interact with lanterns
  if (input.interact) {
    const candidates = state.lanterns.filter(l => {
      if (distanceXZ(state.player.pos, l.pos) > TUNING.interactRadius) return false;
      if (!l.lit) return true;
      return l.fuel < TUNING.fuelMax;
    });
    const nearest = tieNearest(candidates, state.player.pos, (l) => l.id);
    if (nearest) {
      if (!nearest.lit) {
        const cost = nearest.everLit ? TUNING.relightCost : TUNING.lanternCost;
        if (state.player.carried > 0 && nearest.deposited < cost) {
          const amount = Math.min(state.player.carried, cost - nearest.deposited);
          if (amount > 0) {
            state.player.carried -= amount;
            nearest.deposited += amount;
            state.score += amount * TUNING.score.mote;
            events.push({ type: "event", tick: nextTick, name: "deposit", data: {
              lantern_id: nearest.id, amount, deposited: nearest.deposited
            } });
            if (nearest.deposited >= cost) {
              const wasRelight = nearest.everLit;
              nearest.lit = true;
              nearest.fuel = TUNING.fuelMax;
              nearest.everLit = true;
              if (wasRelight) {
                nearest.relitCount = (nearest.relitCount || 0) + 1;
                state.score += TUNING.score.lanternRelight;
              } else {
                state.score += TUNING.score.lantern;
              }
              state.player.successfulLights += 1;
              state.player.capacity = Math.min(TUNING.capacityMax, TUNING.carryCapacity + 2 * state.player.successfulLights);
              events.push({ type: "event", tick: nextTick, name: "lantern_lit", data: { lantern_id: nearest.id, relight: wasRelight } });
              nearest.deposited = 0;
              pushShadesNearLantern(state, nearest, nextTick);
            }
          }
        }
      } else {
        const used = Math.min(state.player.carried, Math.ceil((TUNING.fuelMax - nearest.fuel) / TUNING.fuelPerMote));
        if (used > 0) {
          const oldFuel = nearest.fuel;
          nearest.fuel = fuelRound(Math.min(TUNING.fuelMax, nearest.fuel + TUNING.fuelPerMote * used));
          state.player.carried -= used;
          state.score += used * TUNING.score.mote;
          events.push({ type: "event", tick: nextTick, name: "refuel", data: {
            lantern_id: nearest.id, amount: used, fuel: round1(nearest.fuel)
          } });
          if (oldFuel < TUNING.lowFuelThreshold && nearest.fuel >= TUNING.lowFuelThreshold) {
            pushShadesNearLantern(state, nearest, nextTick);
          }
        }
      }
    }
  }

  // Pulse
  if (input.pulse && state.player.pulseCdTicks <= 0 && state.player.carried >= TUNING.pulseCost) {
    state.player.carried -= TUNING.pulseCost;
    state.player.pulseCdTicks = TUNING.pulseCooldownS * 60;
    const stunnedIds = [];
    for (const shade of state.shades) {
      const dist = distance3D(state.player.pos, shade.pos);
      if (dist <= TUNING.pulseRadius) {
        const wasDrain = shade.state === "drain";
        shade.state = "stunned";
        shade.stunTicks = TUNING.pulseStunS * 60;
        const dx = shade.pos[0] - state.player.pos[0];
        const dz = shade.pos[2] - state.player.pos[2];
        const horizontalDistance = Math.hypot(dx, dz);
        if (horizontalDistance > 0) {
          shade.pos[0] += (dx / horizontalDistance) * TUNING.pulsePushM;
          shade.pos[2] += (dz / horizontalDistance) * TUNING.pulsePushM;
        }
        stunnedIds.push(shade.id);
        state.score += wasDrain ? TUNING.score.stunDrainBonus : TUNING.score.stun;
      }
    }
    for (const drifter of state.drifters) {
      if (drifter.state === "chase" && distance3D(state.player.pos, drifter.pos) <= TUNING.pulseRadius) {
        drifter.state = "flee";
        drifter.stateTicks = TUNING.drifters.fleeTicks;
      }
    }
    events.push({ type: "event", tick: nextTick, name: "pulse", data: { stunned_ids: stunnedIds } });
  }

  // Dash
  if (input.dash && (state.player.dashCdTicks <= 0 || state.player.charmS > 0) && !input.jump) {
    state.player.dashCdTicks = state.player.charmS > 0 ? 0 : TUNING.dashCooldownS * 60;
    state.dashTimer = Math.round(TUNING.dashDurationS * 60);
    events.push({ type: "event", tick: nextTick, name: "dash", data: {} });
  }

  // Fuel update (decay + drain)
  for (const lantern of state.lanterns) {
    if (lantern.lit) {
      lantern.fuel = Math.max(0, fuelRound(lantern.fuel - TUNING.fuelDecayPerS / 60));
    }
  }
  for (const shade of state.shades) {
    if (shade.state === "drain") {
      const target = state.lanterns.find(l => l.id === shade.targetLanternId);
      if (target && target.lit) {
        target.fuel = Math.max(0, fuelRound(target.fuel - TUNING.drainPerS / 60));
      }
    }
  }
  for (const lantern of state.lanterns) {
    if (lantern.lit && lantern.fuel <= 0) {
      lantern.lit = false;
      lantern.fuel = 0;
      lantern.deposited = 0;
      lantern.everLit = true;
      events.push({ type: "event", tick: nextTick, name: "lantern_out", data: { lantern_id: lantern.id } });
    }
  }
  if (simTick % 60 === 0) {
    for (const shade of state.shades) {
      if (shade.state === "drain") {
        const target = state.lanterns.find(l => l.id === shade.targetLanternId);
        if (target) {
          events.push({ type: "event", tick: nextTick, name: "fuel_drain", data: { lantern_id: target.id, shade_id: shade.id, fuel: round1(target.fuel) } });
        }
      }
    }
  }

  // Update shades
  const safeLanterns = state.lanterns.filter(l => l.lit && l.fuel >= TUNING.lowFuelThreshold);
  for (const shade of state.shades) {
    if (shade.state === "removed") continue;

    if (shade.state === "stunned") {
      if (shade.stunTicks <= 0) {
        shade.state = "wander";
        shade.stunTicks = 0;
      }
      continue;
    }

    if (shade.recoil.active) {
      if (shade.recoil.ticks <= 0) {
        shade.recoil.active = false;
        shade.state = shade.recoil.nextState || "chase";
      }
      continue;
    }

    if (shade.state === "drain") {
      const target = state.lanterns.find(l => l.id === shade.targetLanternId);
      let toWander = false;
      if (!target || !target.lit) toWander = true;
      else if (target.fuel >= TUNING.lowFuelThreshold) toWander = true;
      else if (distanceXZ(shade.pos, target.pos) > 2) toWander = true;

      if (distanceXZ(state.player.pos, shade.pos) <= 6) {
        shade.state = "chase";
        continue;
      }
      if (toWander) {
        shade.state = "wander";
        continue;
      }
      // stand still
      continue;
    }

    if (shade.state === "wander") {
      const t = chooseShadeTarget(shade, state);
      if (t && t.lantern) {
        const l = t.lantern;
        const dx = l.pos[0] - shade.pos[0];
        const dz = l.pos[2] - shade.pos[2];
        const dist = Math.hypot(dx, dz);
        if (dist > 0) {
          const speed = state.night === 3 ? TUNING.shadeSpeedNight3 : TUNING.shadeSpeed;
          const moveStep = speed / 60;
          shade.pos[0] += (dx / dist) * moveStep;
          shade.pos[2] += (dz / dist) * moveStep;
        }
        if (t.type === "weak" && distanceXZ(shade.pos, l.pos) <= 2) {
          shade.state = "drain";
        }
      } else {
        // chase player
        const dx = state.player.pos[0] - shade.pos[0];
        const dz = state.player.pos[2] - shade.pos[2];
        const dist = Math.hypot(dx, dz);
        if (dist > 0) {
          const speed = state.night === 3 ? TUNING.shadeSpeedNight3 : TUNING.shadeSpeed;
          const moveStep = speed / 60;
          shade.pos[0] += (dx / dist) * moveStep;
          shade.pos[2] += (dz / dist) * moveStep;
        }
      }
      continue;
    }

    // chase (default, including spawning)
    let inSafeZone = false;
    for (const lantern of safeLanterns) {
      if (distanceXZ(shade.pos, lantern.pos) <= TUNING.safeRadius) {
        inSafeZone = true;
        break;
      }
    }
    if (inSafeZone) continue;

    const dx = state.player.pos[0] - shade.pos[0];
    const dz = state.player.pos[2] - shade.pos[2];
    const dist = Math.hypot(dx, dz);
    if (dist > 0) {
      const speed = state.night === 3 ? TUNING.shadeSpeedNight3 : TUNING.shadeSpeed;
      const moveStep = speed / 60;
      shade.pos[0] += (dx / dist) * moveStep;
      shade.pos[2] += (dz / dist) * moveStep;
    }
  }

  // Update drifters
  for (const drifter of state.drifters) {
    if (drifter.state === "idle") {
      if (state.player.carried >= 5 && distance3D(state.player.pos, drifter.pos) <= 15) {
        drifter.state = "chase";
        drifter.stateTicks = 1440;
      }
    } else if (drifter.state === "chase") {
      const dx = state.player.pos[0] - drifter.pos[0];
      const dz = state.player.pos[2] - drifter.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 0) {
        const moveStep = TUNING.drifters.speed / 60;
        drifter.pos[0] += (dx / dist) * moveStep;
        drifter.pos[2] += (dz / dist) * moveStep;
      }

      if (distanceXZ(state.player.pos, drifter.pos) <= TUNING.drifters.pickupRadius) {
        if (drifter.stolen.length === 0) {
          const amount = Math.min(3, state.player.carried);
          if (amount > 0) {
            state.player.carried -= amount;
            drifter.stolen.push(...new Array(amount).fill(true));
            events.push({ type: "event", tick: nextTick, name: "drifter_steal", data: {
              drifter_id: drifter.id, amount, carried: state.player.carried
            } });
          }
        }
      }
    } else if (drifter.state === "flee") {
      const dx = drifter.pos[0] - state.player.pos[0];
      const dz = drifter.pos[2] - state.player.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 0) {
        const moveStep = TUNING.drifters.speed / 60;
        drifter.pos[0] += (dx / dist) * moveStep;
        drifter.pos[2] += (dz / dist) * moveStep;
      }
      if (drifter.stateTicks <= 0) {
        const dropPos = [...drifter.pos];
        for (let i = 0; i < drifter.stolen.length; i++) {
          state.motes.push({
            id: nextMoteId(state, "MD"),
            pos: [dropPos[0] + (state.random() - 0.5), 0, dropPos[2] + (state.random() - 0.5)],
            kind: "dropped",
            ttlS: 8
          });
        }
        events.push({ type: "event", tick: nextTick, name: "drifter_drop", data: {
          drifter_id: drifter.id, amount: drifter.stolen.length
        } });
        drifter.stolen = [];
        drifter.state = "removed";
      }
    }
  }

  // Player-shade collision
  for (const shade of state.shades) {
    if (shade.state === "removed") continue;
    if (shade.recoil.active) continue;
    if (shade.state === "stunned" || shade.state === "recoil") continue;
    if (distanceXZ(state.player.pos, shade.pos) <= TUNING.shadeHitRadius &&
        Math.abs(state.player.pos[1] - shade.pos[1]) <= 1.5 &&
        state.player.invulnTicks <= 0 &&
        state.player.lastHitTick !== nextTick) {
      state.player.invulnTicks = TUNING.invulnS * 60;
      const dropped = Math.floor(state.player.carried * TUNING.hitDropRatio);
      const lostFlames = 1;
      state.player.carried -= dropped;
      state.player.lastHitTick = nextTick;
      dropMotesAroundPlayer(state, dropped);
      state.player.flames -= lostFlames;
      events.push({ type: "event", tick: nextTick, name: "player_hit", data: {
        by: "shade", flames: state.player.flames, dropped, lost: lostFlames
      } });

      const dx = shade.pos[0] - state.player.pos[0];
      const dz = shade.pos[2] - state.player.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 0) {
        shade.pos[0] += (dx / dist) * 2;
        shade.pos[2] += (dz / dist) * 2;
      }
      shade.recoil.active = true;
      shade.recoil.ticks = 60;
      shade.recoil.nextState = "chase";
      shade.state = "recoil";
      break;
    }
  }

  // Spawning logic
  spawnMotes(state);
  spawnShades(state);
  spawnDrifters(state);
  respawnCharms(state);

  // Win/loss check
  if (state.player.flames <= 0) {
    state.state = "lost";
    state.reason = "no_flames";
  } else if (state.timeLeftS <= 0) {
    const litCount = state.lanterns.filter(l => l.lit).length;
    const total = state.lanterns.length;
    const threshold = Math.ceil(TUNING.winRatio * total);
    if (litCount >= threshold) {
      state.state = "won";
      state.reason = "dawn_survived";
      for (const l of state.lanterns) {
        if (l.lit) state.score += TUNING.score.dawnLantern + Math.floor(l.fuel);
      }
      state.score += state.player.flames * TUNING.score.dawnFlame;
    } else {
      state.state = "lost";
      state.reason = "dawn";
    }
  }

  if (state.state !== "playing") {
    events.push({ type: "event", tick: nextTick, name: "game_over", data: {
      result: state.state, reason: state.reason
    } });
  }

  return { state, events };
}

function handleFall(state, events) {
  if (state.player.falling) return;
  state.player.falling = true;
  state.player.flames -= 1;
  const dropped = Math.floor(state.player.carried * TUNING.hitDropRatio);
  state.player.carried -= dropped;
  state.player.lastHitTick = state.tick;
  dropMotesAroundPlayer(state, dropped);
  events.push({ type: "event", tick: state.tick, name: "player_hit", data: {
    by: "fall", flames: state.player.flames, dropped, lost: 1
  } });

  if (state.player.flames <= 0) {
    state.state = "lost";
    state.reason = "no_flames";
  }
  state.player.respawnTicks = 60;
}

function dropMotesAroundPlayer(state, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = state.random() * Math.PI * 2;
    const radius = 1.501 + state.random() * 0.998;
    state.motes.push({
      id: nextMoteId(state, "MD"),
      pos: [
        state.player.pos[0] + Math.cos(angle) * radius,
        0,
        state.player.pos[2] + Math.sin(angle) * radius
      ],
      kind: "dropped",
      ttlS: 8
    });
  }
}

function checkJumpPads(state, input) {
  const isNight2 = state.night === 2;
  if (!isNight2) return;

  for (const pad of NIGHT_2.jumpPads) {
    if (distanceXZ(state.player.pos, pad.pos) <= 1) {
      if (Math.abs(state.player.pos[1] - pad.pos[1]) < 0.5) {
        state.player.vel[1] = pad.velocityY;
        state.player.pos[0] += pad.dir[0] * pad.velocityH / 60;
        state.player.pos[2] += pad.dir[2] * pad.velocityH / 60;
      }
    }
  }
}

function getGroundY(state, pos) {
  return 0;
}

function spawnMotes(state) {
  if (!state.randomMotes) return;

  const isNight1 = state.night === 1;
  const isNight2 = state.night === 2;
  const config = isNight1 ? NIGHT_1 : isNight2 ? NIGHT_2 : NIGHT_3;
  if (!config.moteSpawnTicks.includes(state.simTick)) return;

  if (isNight1) {
    for (let i = 0; i < config.moteWaveCount && state.motes.length < config.maxMotes; i++) {
      const angle = (state.simTick / 240 + i) % 16 * (Math.PI / 8);
      const r = 33;
      state.motes.push({
        id: nextMoteId(state, "M"),
        pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
        kind: "random",
        ttlS: 8
      });
    }
  } else if (isNight2) {
    const islands = [NIGHT_2.islandA.center, NIGHT_2.islandB.center];
    islands.forEach(center => {
      for (let i = 0; i < config.moteSpawnPerIsland && state.motes.length < config.maxMotes; i++) {
          const angle = i * Math.PI / 4;
          const r = 22;
          state.motes.push({
            id: nextMoteId(state, "M"),
            pos: [center[0] + Math.cos(angle) * r, 0, center[2] + Math.sin(angle) * r],
            kind: "random",
            ttlS: 8
          });
      }
    });
  }
}

function spawnShades(state) {
  if (!state.randomShades) return;

  const config = state.night === 1 ? NIGHT_1 : state.night === 2 ? NIGHT_2 : NIGHT_3;
  const interval = config.shadeSpawnInterval;

  if (state.simTick >= config.shadeSpawnTick && (state.simTick - config.shadeSpawnTick) % interval === 0) {
    for (let i = 0; i < 1; i++) {
      if (state.shades.filter(s => s.state !== "removed").length >= config.shadeCount) continue;

      const angle = state.random() * Math.PI * 2;
      const island = state.night === 2
        ? (state.random() < 0.5 ? NIGHT_2.islandA : NIGHT_2.islandB)
        : { center: config.spawnPos, radius: config.islandRadius ?? 40 };
      const r = island.radius - 3;
      const pos = [
        island.center[0] + Math.cos(angle) * r,
        0,
        island.center[2] + Math.sin(angle) * r
      ];

      state.shades.push({
        id: `S${state.shades.length + 1}`,
        pos,
        state: "wander",
        stateTicks: 300,
        stunTicks: 0,
        hitCooldownTicks: 0,
        targetLanternId: null,
        recoil: { active: false, ticks: 0, nextState: "chase" }
      });
    }
  }
}

function spawnDrifters(state) {
  if (!state.randomDrifters) return;

  const config = state.night === 2 ? NIGHT_2 : NIGHT_3;

  if (state.simTick >= config.driftersSpawnTick && (state.simTick - config.driftersSpawnTick) % config.driftersInterval === 0) {
    if (state.drifters.filter(d => d.state !== "removed").length >= TUNING.drifters.maxCount) return;

    const angle = state.random() * Math.PI * 2;
    const r = 30;
    state.drifters.push({
      id: `D${state.drifters.filter(d => d.state !== "removed").length + 1}`,
      pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      state: "idle",
      stateTicks: 1440,
      stolen: []
    });
  }
}

function respawnCharms(state) {
  state.charms.forEach(charm => {
    if (charm.respawnS > 0) {
      charm.respawnS = Math.max(0, charm.respawnS - 1/60);
      if (charm.respawnS <= 0) {
        charm.available = true;
      }
    }
  });
}

export function round3(value) {
  return Number(Number(value).toFixed(3));
}

export function makeSnapshot(state) {
  return {
    type: "snapshot",
    tick: state.tick,
    sim_tick: state.simTick ?? state.tick,
    state: state.paused ? "paused" : state.state,
    time_left_s: round3(state.timeLeftS),
    score: state.score,
    night: state.night,
    wind: {
      active: state.wind.active,
      dir_deg: state.wind.dirDeg
    },
    player: {
      pos: state.player.pos.map(round3),
      flames: state.player.flames,
      carried: state.player.carried,
      capacity: state.player.capacity,
      vel: state.player.vel.map(round3),
      grounded: state.player.grounded,
      invuln: state.player.invulnTicks > 0,
      dash_cd_s: state.player.dashCdTicks / 60,
      pulse_cd_s: state.player.pulseCdTicks / 60,
      charm_s: state.player.charmS
    },
    lanterns: state.lanterns.map((lantern) => ({
      id: lantern.id,
      pos: lantern.pos.map(round3),
      lit: lantern.lit,
      deposited: lantern.deposited,
      fuel: round1(lantern.lit ? lantern.fuel : 0),
      ever_lit: lantern.everLit,
      relit_count: lantern.relitCount || 0
    })),
    shades: state.shades.map((shade) => ({
      id: shade.id,
      pos: shade.pos.map(round3),
      state: shade.state,
      state_ticks_left: shade.stateTicks,
      stun_ticks: shade.stunTicks,
      recoil_ticks: shade.recoil.active ? shade.recoil.ticks : 0,
      target_lantern_id: shade.targetLanternId
    })),
    motes: state.motes.map((mote) => ({
      id: mote.id,
      pos: mote.pos.map(round3),
      kind: mote.kind,
      ttl_s: mote.ttlS
    })),
    drifters: state.drifters.map((drifter) => ({
      id: drifter.id,
      pos: drifter.pos.map(round3),
      state: drifter.state,
      state_ticks_left: drifter.stateTicks,
      stolen: drifter.stolen.length
    })),
    charms: state.charms.map((charm) => ({
      id: charm.id,
      available: charm.available,
      respawn_s: charm.respawnS
    })),
    motes_active: state.motes.length
  };
}

export function validateLeaderboardName(name) {
  if (typeof name !== "string") return false;
  if (name.length < 3 || name.length > 12) return false;
  return /^[A-Za-z0-9_]+$/.test(name);
}

export function addLeaderboardEntry(entries, entry) {
  const all = [...entries, entry];
  all.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.achieved_at) - new Date(b.achieved_at);
  });
  return all.slice(0, 10);
}

export function createLeaderboardEntry(name, score, nightsWon, seed) {
  return {
    name,
    score,
    nights_won: nightsWon,
    achieved_at: new Date().toISOString(),
    seed
  };
}

export function exportLeaderboard(entries) {
  return { entries: [...entries] };
}
