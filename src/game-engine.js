export const TUNING = {
  playerSpeed: 6.0,
  carryCapacity: 10,
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
  shadeHitRadius: 1.0,
  fallEnabled: true,
  dashSpeed: 14.0,
  dashDurationS: 0.2,
  dashCooldownS: 1.5,
  nightDurations: [300, 330, 360],
  initialFlames: 3,
  invulnS: 1.5,
  hitDropRatio: 0.5,
  score: { mote: 10, lantern: 100, stun: 5, second: 2, flame: 50 },
  drifters: { speed: 7.0, idleSpeed: 2.0, maxCount: 2, pickupRadius: 1.2 }
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
  shades: [],
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
  shades: [],
  shadeCount: 8,
  shadeSpawnTick: 5 * 60,
  shadeSpawnInterval: 7 * 60,
  drifters: [],
  driftersSpawnTick: 1200,
  driftersInterval: 1200,
  jumpPads: [
    { pos: [20, 0, 18], target: [50, 0, -18] },
    { pos: [50, 0, -18], target: [20, 0, 18] }
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

export function createInitialState(seed = 0, night = 1) {
  const random = mulberry32(seed);
  const isNight1 = night === 1;
  const isNight2 = night === 2;
  const isNight3 = night === 3;
  
  const config = isNight1 ? NIGHT_1 : isNight2 ? NIGHT_2 : NIGHT_3;
  const shades = [];
  
  for (let i = 0; i < config.shadeCount; i++) {
    shades.push({
      id: `S${i + 1}`,
      pos: [0, 0, 0],
      state: "spawning",
      stateTicks: 30,
      stunTicks: 0,
      hitCooldownTicks: 0,
      recoil: { active: false, ticks: 0 }
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
      // Level 0: 18 points on radius 34
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        initialPositions.push([
          Math.cos(angle) * 34,
          0,
          Math.sin(angle) * 34
        ]);
      }
      // Level 1: 8 points on radius 18
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        initialPositions.push([
          Math.cos(angle) * 18,
          3,
          Math.sin(angle) * 18
        ]);
      }
      // Level 2: 4 points on radius 5
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 4) + (i * Math.PI / 2);
        initialPositions.push([
          Math.cos(angle) * 5,
          6,
          Math.sin(angle) * 5
        ]);
      }
    }
    initialPositions.forEach((pos, i) => {
      if (i < config.moteCount) {
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
    state: "playing",
    reason: null,
    timeLeftS: config.nightDuration,
    score: 0,
    wind: { active: false, dirDeg: 0 },
    player: {
      pos: [...config.spawnPos],
      flames: TUNING.initialFlames,
      carried: 0,
      invulnTicks: 0,
      vel: [0, 0, 0],
      grounded: true,
      dashCdTicks: 0,
      pulseCdTicks: 0,
      charmS: 0
    },
    lanterns: config.lanterns.map(({ id, pos }) => ({ id, pos: [...pos], lit: false, deposited: 0 })),
    motes: motes.length > 0 ? motes : [],
    shades,
    drifters,
    charms,
    dashDuration: 0,
    dashTimer: 0,
    pulseCooldownTicks: 0,
    randomMotes: true,
    randomShades: true,
    randomDrifters: isNight2 || isNight3,
    windEnabled: isNight3
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
  }
  if (Object.hasOwn(scenario, "random_motes")) state.randomMotes = Boolean(scenario.random_motes);
  if (Object.hasOwn(scenario, "random_shades")) state.randomShades = Boolean(scenario.random_shades);
  if (Object.hasOwn(scenario, "random_drifters")) state.randomDrifters = Boolean(scenario.random_drifters);
  if (Object.hasOwn(scenario, "wind_enabled")) state.windEnabled = Boolean(scenario.wind_enabled);
  if (Object.hasOwn(scenario, "wind")) {
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
      stunTicks: 0,
      hitCooldownTicks: 0,
      recoil: { active: false, ticks: 0 }
    }));
  }
  if (Object.hasOwn(scenario, "drifters")) {
    if (!Array.isArray(scenario.drifters)) throw new TypeError("drifters must be an array");
    state.drifters = scenario.drifters.map((drifter, index) => ({
      id: drifter.id || `D${index + 1}`,
      pos: [...drifter.pos],
      state: drifter.state || "idle",
      stateTicks: 0,
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
    }
  }
  if (scenario.time_left_s !== undefined) state.timeLeftS = scenario.time_left_s;
  state.player.invulnTicks = 0;
  state.player.charmS = 0;
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
  
  // Handle pause
  if (input.pause && !state.paused) {
    state.paused = true;
    state.pauseTime = state.timeLeftS;
    events.push({ type: "event", tick: nextTick, name: "paused", data: {} });
  } else if (!input.pause && state.paused) {
    state.paused = false;
    state.timeLeftS = state.pauseTime;
    events.push({ type: "event", tick: nextTick, name: "resumed", data: {} });
  }
  if (state.paused) {
    state.tick = nextTick;
    return { state, events };
  }
  
  state.tick = nextTick;
  
  // Update night duration
  const nightDuration = TUNING.nightDurations[state.night - 1] || 300;
  state.timeLeftS = Math.max(0, nightDuration - nextTick / 60);

  // Decrement timers
  if (state.player.invulnTicks > 0) state.player.invulnTicks -= 1;
  if (state.player.dashCdTicks > 0) state.player.dashCdTicks -= 1;
  if (state.player.pulseCdTicks > 0) state.player.pulseCdTicks -= 1;
  if (state.player.charmS > 0) state.player.charmS = Math.max(0, state.player.charmS - 1/60);
  
  // Update dashes and drifters
  state.shades.forEach(s => {
    if (s.stunTicks > 0) s.stunTicks -= 1;
    if (s.hitCooldownTicks > 0) s.hitCooldownTicks -= 1;
    if (s.recoil.active && s.recoil.ticks > 0) s.recoil.ticks -= 1;
    if (s.stateTicks > 0) s.stateTicks -= 1;
  });
  state.drifters.forEach(d => {
    if (d.stateTicks > 0) d.stateTicks -= 1;
  });
  
  // Move player
  const move = normalizeMove(input.move || [0, 0]);
  const yaw = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const worldX = move[0] * cos + move[1] * sin;
  const worldZ = -move[0] * sin + move[1] * cos;
  
  // Speed calculation (charm bonus)
  const baseSpeed = state.player.charmS > 0 ? 7.2 : TUNING.playerSpeed;
  let speed = baseSpeed;
  if (state.dashTimer > 0) {
    speed = TUNING.dashSpeed;
    state.dashTimer -= 1/60;
    if (state.dashTimer <= 0) state.dashTimer = 0;
  }
  const step = speed / 60;
  
  state.player.pos[0] += worldX * step;
  state.player.pos[2] += worldZ * step;
  
  // Gravity and jumping
  if (input.jump && state.player.grounded) {
    state.player.vel[1] = 7.0;
    state.player.grounded = false;
  }
  
  // Apply gravity
  state.player.vel[1] -= 20 / 60;
  state.player.pos[1] += state.player.vel[1] / 60;
  
  // Check ground
  state.player.grounded = false;
  if (state.player.pos[1] <= 0) {
    state.player.pos[1] = 0;
    state.player.vel[1] = 0;
    state.player.grounded = true;
  }
  
  // Check fall
  if (state.player.pos[1] < -10) {
    handleFall(state, events);
  }
  
  // Jump pad check
  checkJumpPads(state, input);
  
  // Pick up motes
  for (let i = state.motes.length - 1; i >= 0; i--) {
    const mote = state.motes[i];
    if (distanceXZ(state.player.pos, mote.pos) <= TUNING.pickupRadius &&
        state.player.carried < TUNING.carryCapacity) {
      // Check height difference for pickup
      const groundY = getGroundY(state, mote.pos);
      if (Math.abs(state.player.pos[1] - groundY) <= 1.5) {
        state.motes.splice(i, 1);
        state.player.carried += 1;
        state.score += TUNING.score.mote;
        events.push({ type: "event", tick: nextTick, name: "mote_picked", data: { carried: state.player.carried } });
      }
    }
  }
  
  // Pick up charms
  for (let i = 0; i < state.charms.length; i++) {
    const charm = state.charms[i];
    if (charm.available && distanceXZ(state.player.pos, charm.pos) <= TUNING.pickupRadius) {
      state.player.charmS = 10;
      charm.available = false;
      charm.respawnS = 45;
      state.score += 10;
      events.push({ type: "event", tick: nextTick, name: "charm_picked", data: { charm_id: charm.id, charm_ticks: 600 } });
    }
  }
  
  // Interact with lanterns
  if (input.interact) {
    let nearestLantern = null;
    let nearestDist = Infinity;
    for (const lantern of state.lanterns) {
      if (lantern.lit) continue;
      const dist = distanceXZ(state.player.pos, lantern.pos);
      if (dist <= TUNING.interactRadius && dist < nearestDist) {
        nearestDist = dist;
        nearestLantern = lantern;
      }
    }
    if (nearestLantern) {
      if (state.player.carried > 0) {
        const amount = Math.min(state.player.carried, TUNING.lanternCost - nearestLantern.deposited);
        if (amount > 0) {
          state.player.carried -= amount;
          nearestLantern.deposited += amount;
          state.score += amount * TUNING.score.mote;
          events.push({ type: "event", tick: nextTick, name: "deposit", data: {
            lantern_id: nearestLantern.id, amount, deposited: nearestLantern.deposited
          } });
          if (nearestLantern.deposited >= TUNING.lanternCost) {
            nearestLantern.lit = true;
            state.score += TUNING.score.lantern;
            events.push({ type: "event", tick: nextTick, name: "lantern_lit", data: { lantern_id: nearestLantern.id } });
          }
        }
      }
    }
  }
  
  // Pulse
  if (input.pulse && state.player.pulseCdTicks <= 0 && state.player.flames >= TUNING.pulseCost) {
    state.player.flames -= TUNING.pulseCost;
    state.player.pulseCdTicks = TUNING.pulseCooldownS * 60;
    const stunnedIds = [];
    for (const shade of state.shades) {
      const dist = distance3D(state.player.pos, shade.pos);
      if (dist <= TUNING.pulseRadius) {
        shade.state = "stunned";
        shade.stunTicks = TUNING.pulseStunS * 60;
        stunnedIds.push(shade.id);
        state.score += TUNING.score.stun;
      }
    }
    events.push({ type: "event", tick: nextTick, name: "pulse", data: { stunned_ids: stunnedIds } });
  }
  
  // Dash
  if (input.dash && state.player.dashCdTicks <= 0 && !input.jump) {
    state.player.dashCdTicks = TUNING.dashCooldownS * 60;
    state.dashTimer = TUNING.dashDurationS * 60;
    events.push({ type: "event", tick: nextTick, name: "dash", data: {} });
  }
  
  // Update shades
  const safeLanterns = state.lanterns.filter(l => l.lit);
  for (const shade of state.shades) {
    if (shade.state === "stunned") {
      if (shade.stunTicks <= 0) {
        shade.state = "chase";
        shade.stunTicks = 0;
      }
      continue;
    }
    
    // Move shade
    if (shade.state === "recoil") {
      if (shade.recoil.ticks <= 0) {
        shade.state = "chase";
        shade.recoil.active = false;
      }
      continue;
    }
    
    // In safe zone?
    let inSafeZone = false;
    for (const lantern of safeLanterns) {
      if (distanceXZ(shade.pos, lantern.pos) <= TUNING.safeRadius) {
        inSafeZone = true;
        break;
      }
    }
    if (inSafeZone) continue;
    
    // Chase player
    if (shade.state !== "chase") shade.state = "chase";
    const dx = state.player.pos[0] - shade.pos[0];
    const dz = state.player.pos[2] - shade.pos[2];
    const dist = Math.hypot(dx, dz);
    if (dist > 0) {
      const speed = state.night === 3 ? 4.5 : 4.0;
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
      
      // Check collision
      if (distanceXZ(state.player.pos, drifter.pos) <= TUNING.drifters.pickupRadius) {
        if (drifter.stolen.length === 0) {
          const amount = Math.min(3, state.player.carried);
          if (amount > 0) {
            state.player.carried -= amount;
            drifter.stolen.push(...new Array(amount).fill(true));
            state.score += amount * TUNING.score.mote;
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
        // Drop stolen motes
        const dropPos = [...drifter.pos];
        for (let i = 0; i < drifter.stolen.length; i++) {
          state.motes.push({
            id: `MD${i + 1}`,
            pos: [dropPos[0] + (Math.random() - 0.5), 0, dropPos[2] + (Math.random() - 0.5)],
            kind: "dropped",
            ttlS: 8
          });
        }
        drifter.stolen = [];
        drifter.state = "removed";
      }
    }
  }
  
  // Drifter pulse interaction
  if (input.pulse && state.player.pulseCdTicks <= 0 && state.player.flames >= TUNING.pulseCost) {
    for (const drifter of state.drifters) {
      if (drifter.state === "chase" && distance3D(state.player.pos, drifter.pos) <= TUNING.pulseRadius) {
        drifter.state = "flee";
        drifter.stateTicks = 1440;
      } else if (drifter.state === "flee" && distance3D(state.player.pos, drifter.pos) <= TUNING.pulseRadius) {
        // Drop motes
        const dropPos = [...drifter.pos];
        for (let i = 0; i < drifter.stolen.length; i++) {
          state.motes.push({
            id: `MD${i + 1}`,
            pos: [dropPos[0] + (Math.random() - 0.5), 0, dropPos[2] + (Math.random() - 0.5)],
            kind: "dropped",
            ttlS: 8
          });
        }
        drifter.stolen = [];
        drifter.state = "removed";
      }
    }
  }
  
  // Player-shade collision
  for (const shade of state.shades) {
    if (shade.state !== "stunned" && shade.state !== "recoil" && 
        distanceXZ(state.player.pos, shade.pos) <= TUNING.shadeHitRadius &&
        Math.abs(state.player.pos[1] - shade.pos[1]) <= 1.5 &&
        state.player.invulnTicks <= 0) {
      state.player.invulnTicks = TUNING.invulnS * 60;
      const dropped = Math.floor(state.player.carried * TUNING.hitDropRatio);
      const lostFlames = 1;
      state.player.carried -= dropped;
      state.player.flames -= lostFlames;
      events.push({ type: "event", tick: nextTick, name: "player_hit", data: {
        by: "shade", flames: state.player.flames, dropped, lost: lostFlames
      } });
      
      // Apply recoil to shade
      const dx = shade.pos[0] - state.player.pos[0];
      const dz = shade.pos[2] - state.player.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 0) {
        shade.pos[0] += (dx / dist) * 2;
        shade.pos[2] += (dz / dist) * 2;
      }
      shade.recoil.active = true;
      shade.recoil.ticks = 60;
      break;
    }
  }
  
  // Spawning logic
  spawnMotes(state);
  spawnShades(state);
  spawnDrifters(state);
  respawnCharms(state);
  
  // Win/loss check
  if (state.lanterns.every(l => l.lit)) {
    state.state = "won";
    state.reason = "all_lit";
    state.score += Math.floor(state.timeLeftS) * TUNING.score.second;
    state.score += state.player.flames * TUNING.score.flame;
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

function handleFall(state, events) {
  if (state.player.falling) return;
  state.player.falling = true;
  state.player.flames -= 1;
  const dropped = state.player.carried;
  state.player.carried = 0;
  events.push({ type: "event", tick: state.tick, name: "player_hit", data: {
    by: "fall", flames: state.player.flames, dropped, lost: 1
  } });
  
  // Spawn dropped motes
  for (let i = 0; i < dropped; i++) {
    const angle = (i / dropped) * Math.PI * 2;
    state.motes.push({
      id: `MD${i + 1}`,
      pos: [
        state.player.pos[0] + Math.cos(angle) * 2,
        0,
        state.player.pos[2] + Math.sin(angle) * 2
      ],
      kind: "dropped",
      ttlS: 8
    });
  }
  
  // Check if player should die
  if (state.player.flames <= 0) {
    state.state = "lost";
    state.reason = "no_flames";
  }
  
  // Respawn after delay
  setTimeout(() => {
    if (state.player.flames > 0) {
      state.player.pos = [0, 0, 0];
      state.player.vel = [0, 0, 0];
      state.player.invulnTicks = 90;
      state.player.falling = false;
    }
  }, 60000 / 60);
}

function checkJumpPads(state, input) {
  const isNight2 = state.night === 2;
  if (!isNight2) return;
  
  const jumpPads = [
    { pos: [20, 0, 18], target: [50, 0, -18], dir: [-0.6, 0, -0.8] },
    { pos: [50, 0, -18], target: [20, 0, 18], dir: [0.6, 0, 0.8] }
  ];
  
  for (const pad of jumpPads) {
    if (distanceXZ(state.player.pos, pad.pos) <= 1) {
      if (Math.abs(state.player.pos[1] - 0) < 0.5) {
        state.player.vel[1] = 14;
        const targetDir = pad.dir;
        state.player.pos[0] += targetDir[0] * 24 / 60;
        state.player.pos[2] += targetDir[2] * 24 / 60;
      }
    }
  }
}

function getGroundY(state, pos) {
  // Simplified ground check
  return 0;
}

function spawnMotes(state) {
  const isNight1 = state.night === 1;
  const isNight2 = state.night === 2;
  
  if (state.motes.length < state.lanterns.length * 4 && state.tick % 240 === 0) {
    // Generate positions based on night
    if (isNight1) {
      for (let i = 0; i < 16; i++) {
        const angle = (state.tick / 240 + i) % 16 * (Math.PI / 8);
        const r = 33;
        state.motes.push({
          id: `M${state.motes.length + 1}`,
          pos: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
          kind: "random",
          ttlS: 8
        });
        if (state.motes.length >= 30) break;
      }
    } else if (isNight2) {
      const islands = [[0, 0, 0], [70, 0, 0]];
      islands.forEach(center => {
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          const r = 22;
          state.motes.push({
            id: `M${state.motes.length + 1}`,
            pos: [center[0] + Math.cos(angle) * r, 0, center[2] + Math.sin(angle) * r],
            kind: "random",
            ttlS: 8
          });
          if (state.motes.length >= 30) break;
        }
      });
    }
  }
}

function spawnShades(state) {
  const config = state.night === 1 ? NIGHT_1 : state.night === 2 ? NIGHT_2 : NIGHT_3;
  const interval = config.shadeSpawnInterval;
  
  if (state.tick >= config.shadeSpawnTick && (state.tick - config.shadeSpawnTick) % interval === 0) {
    for (let i = 0; i < 1; i++) {
      if (state.shades.filter(s => s.state !== "removed").length >= config.shadeCount) continue;
      
      const angle = Math.random() * Math.PI * 2;
      const r = 37;
      const pos = [
        Math.cos(angle) * r,
        0,
        Math.sin(angle) * r
      ];
      
      state.shades.push({
        id: `S${state.shades.length + 1}`,
        pos,
        state: "wander",
        stateTicks: 300,
        stunTicks: 0,
        hitCooldownTicks: 0,
        recoil: { active: false, ticks: 0 }
      });
    }
  }
}

function spawnDrifters(state) {
  if (!state.randomDrifters) return;
  
  const config = state.night === 2 ? NIGHT_2 : NIGHT_3;
  
  if (state.tick >= config.driftersSpawnTick && (state.tick - config.driftersSpawnTick) % config.driftersInterval === 0) {
    if (state.drifters.filter(d => d.state !== "removed").length >= TUNING.drifters.maxCount) return;
    
    const angle = Math.random() * Math.PI * 2;
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
    sim_tick: state.tick,
    state: state.state,
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
      deposited: lantern.deposited
    })),
    shades: state.shades.map((shade) => ({
      id: shade.id,
      pos: shade.pos.map(round3),
      state: shade.state,
      state_ticks_left: shade.stateTicks,
      stun_ticks: shade.stunTicks,
      recoil_ticks: shade.recoil.active ? shade.recoil.ticks : 0
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
