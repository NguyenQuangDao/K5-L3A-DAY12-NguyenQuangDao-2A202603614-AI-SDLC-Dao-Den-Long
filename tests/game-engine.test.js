import { describe, expect, it } from "vitest";
import {
    advanceState,
    applyScenario,
    createInitialState,
    distanceXZ,
    makeSnapshot,
    parseInputs,
    validateLeaderboardName,
    addLeaderboardEntry,
    createLeaderboardEntry,
    exportLeaderboard
} from "../src/game-engine.js";

describe("movement and pickup", () => {
  it("moves each initial shade on the first simulation tick", () => {
    for (const night of [1, 2, 3]) {
      const state = createInitialState(42, night);
      applyScenario(state, { motes: [], random_motes: false, random_shades: false });
      const startPositions = state.shades.map((shade) => [...shade.pos]);

      expect(state.shades.every((shade) => distanceXZ(shade.pos, state.player.pos) > 20)).toBe(true);

      const result = advanceState(state, {});

      expect(result.events.some((event) => event.name === "player_hit")).toBe(false);
      expect(state.shades.every((shade, index) =>
        distanceXZ(shade.pos, startPositions[index]) > 0
      )).toBe(true);
    }
  });

  it("does not let the starting shades immediately drain all flames", () => {
    const state = createInitialState(42, 1);
    applyScenario(state, { motes: [], random_motes: false, random_shades: false });

    for (let tick = 0; tick < 1200 && state.state === "playing"; tick += 1) {
      advanceState(state, {});
    }

    expect(state.state).toBe("playing");
    expect(state.player.flames).toBe(3);
  });

  it("normalizes movement and respects camera yaw", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });
    advanceState(state, { move: [1, 1], cam_yaw_deg: 0 });
    expect(distanceXZ(state.player.pos, [-6 / 60 * Math.SQRT1_2, 0, 6 / 60 * Math.SQRT1_2])).toBeLessThan(0.01);
  });

  it("maps A and D to camera-relative left and right", () => {
    const left = createInitialState(1, 1);
    const right = createInitialState(1, 1);
    applyScenario(left, { motes: [], shades: [], random_motes: false, random_shades: false });
    applyScenario(right, { motes: [], shades: [], random_motes: false, random_shades: false });

    advanceState(left, { move: [-1, 0], cam_yaw_deg: 0 });
    advanceState(right, { move: [1, 0], cam_yaw_deg: 0 });

    expect(left.player.pos[0]).toBeGreaterThan(0);
    expect(right.player.pos[0]).toBeLessThan(0);
  });

  it("jumps when the jump input is pressed", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });

    advanceState(state, { jump: true });

    expect(state.player.grounded).toBe(false);
    expect(state.player.pos[1]).toBeGreaterThan(0);
  });

  it("picks a mote only in pickup radius", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [[0, 0, 0]], shades: [], random_motes: false, random_shades: false });
    const result = advanceState(state, {});
    expect(state.player.carried).toBe(1);
    expect(result.events.some((event) => event.name === "mote_picked")).toBe(true);
  });

  it("does not pick beyond pickup radius", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [[0, 0, 2]], shades: [] });
    advanceState(state, {});
    expect(state.player.carried).toBe(0);
  });
});

describe("lantern and pulse", () => {
  it("deposits with an interact edge and lights the lantern", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { pos: [0, 0, 25], carried: 10 },
      motes: [],
      shades: [],
      lanterns: [{ id: "L1", pos: [0, 0, 25], deposited: 0 }]
    });
    const result = advanceState(state, { interact: true });
    expect(state.lanterns[0].lit).toBe(true);
    expect(result.events.map((event) => event.name)).toContain("lantern_lit");
  });

  it("stuns shades and applies cooldown", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { carried: 3 },
      motes: [],
      shades: [{ id: "S1", pos: [1, 0, 0] }]
    });
    const result = advanceState(state, { pulse: true });
    expect(result.events.map((event) => event.name)).toContain("pulse");
    expect(state.shades[0].state).toBe("stunned");
    expect(distanceXZ(state.player.pos, state.shades[0].pos)).toBeGreaterThanOrEqual(4.9);
    expect(state.player.carried).toBe(0);
    expect(state.player.flames).toBe(3);
    expect(state.score).toBe(5);
    const second = advanceState(state, { pulse: true });
    expect(state.player.flames).toBe(3);
    expect(second.events.some((event) => event.name === "pulse")).toBe(false);
  });

  it("drops half the carried motes around the player on a hit", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { carried: 5 },
      motes: [],
      shades: [
        { id: "S1", pos: [1, 0, 0] },
        { id: "S2", pos: [1, 0, 0] }
      ],
      random_motes: false,
      random_shades: false
    });

    const result = advanceState(state, {});
    const hit = result.events.find((event) => event.name === "player_hit");

    expect(hit.data.dropped).toBe(2);
    expect(hit.data.lost).toBe(1);
    expect(state.player.carried).toBe(3);
    expect(state.player.flames).toBe(2);
    expect(state.motes).toHaveLength(2);
    for (const mote of state.motes) {
      const radius = distanceXZ(state.player.pos, mote.pos);
      expect(radius).toBeGreaterThanOrEqual(1.5);
      expect(radius).toBeLessThanOrEqual(2.5);
    }
  });

  it("uses the drain stun score instead of adding it to the normal score", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { carried: 3 },
      motes: [],
      shades: [{ id: "S1", pos: [1, 0, 0], state: "drain" }],
      random_motes: false,
      random_shades: false
    });

    advanceState(state, { pulse: true });

    expect(state.score).toBe(15);
  });

  it("applies the same half-drop rule to fall hits", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { pos: [0, -11, 0], carried: 5 },
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false
    });

    const result = advanceState(state, {});
    const hit = result.events.find((event) => event.name === "player_hit");

    expect(hit.data.dropped).toBe(2);
    expect(state.player.carried).toBe(3);
    expect(state.motes).toHaveLength(2);
    expect(state.player.flames).toBe(2);
  });
});

describe("dash mechanics", () => {
  it("activates dash when pressed", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });
    const result = advanceState(state, { dash: true });
    expect(result.events.map((event) => event.name)).toContain("dash");
    expect(state.player.dashCdTicks).toBeGreaterThan(0);
  });

  it("uses dash cooldown properly", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });
    advanceState(state, { dash: true });
    const second = advanceState(state, { dash: true });
    expect(second.events.some((event) => event.name === "dash")).toBe(false);
  });

  it("allows charm-boosted dashes without a cooldown", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { charm_ticks: 120, dash_cd_ticks: 60 },
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false
    });

    const result = advanceState(state, { dash: true });

    expect(result.events.some((event) => event.name === "dash")).toBe(true);
    expect(state.player.dashCdTicks).toBe(0);
  });
});

describe("multi-night support", () => {
  it("creates state for night 1", () => {
    const state = createInitialState(42, 1);
    expect(state.night).toBe(1);
    expect(state.lanterns.length).toBe(5);
    expect(state.player.pos).toEqual([0, 0, 0]);
  });

  it("creates state for night 2", () => {
    const state = createInitialState(42, 2);
    expect(state.night).toBe(2);
    expect(state.lanterns.length).toBe(6);
    expect(state.player.pos).toEqual([0, 0, 0]);
    expect(state.drifters.length).toBe(1);
  });

  it("creates state for night 3", () => {
    const state = createInitialState(42, 3);
    expect(state.night).toBe(3);
    expect(state.lanterns.length).toBe(7);
    expect(state.player.pos).toEqual([0, 0, 0]);
    expect(state.windEnabled).toBe(true);
  });

  it("schedules deterministic five-second wind gusts every thirty seconds", () => {
    const state = createInitialState(42, 3);
    const replay = createInitialState(42, 3);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });
    applyScenario(replay, { motes: [], shades: [], random_motes: false, random_shades: false });

    for (let tick = 0; tick < 1799; tick += 1) {
      advanceState(state, {});
      advanceState(replay, {});
    }
    expect(state.wind.active).toBe(false);

    advanceState(state, {});
    advanceState(replay, {});
    expect(state.wind.active).toBe(true);
    expect(state.wind.dirDeg).toBeGreaterThanOrEqual(0);
    expect(state.wind.dirDeg).toBeLessThan(360);
    expect(replay.wind.dirDeg).toBe(state.wind.dirDeg);

    for (let tick = 0; tick < 299; tick += 1) advanceState(state, {});
    expect(state.wind.active).toBe(true);
    advanceState(state, {});
    expect(state.wind.active).toBe(false);
  });

  it("pushes the player at the configured wind speed while a gust is active", () => {
    const state = createInitialState(42, 3);
    applyScenario(state, {
      motes: [],
      shades: [],
      wind_enabled: true,
      wind: { active: true, dir_deg: 0 },
      random_motes: false,
      random_shades: false,
      random_drifters: false
    });

    advanceState(state, {});

    expect(state.player.pos[0]).toBeCloseTo(3 / 60, 6);
    expect(state.player.pos[2]).toBeCloseTo(0, 6);
  });

  it("spawns the configured Night 1 mote waves only at their scheduled ticks", () => {
    const state = createInitialState(42, 1);
    state.randomShades = false;
    state.randomDrifters = false;

    for (let tick = 0; tick < 239; tick += 1) advanceState(state, {});
    expect(state.motes).toHaveLength(20);

    advanceState(state, {});
    expect(state.motes).toHaveLength(28);

    for (let tick = 0; tick < 240; tick += 1) advanceState(state, {});
    expect(state.motes).toHaveLength(30);
  });

  it("adds a scheduled Night 2 shade on one of the islands without exceeding its radius", () => {
    const state = createInitialState(42, 2);
    state.randomMotes = false;
    state.randomDrifters = false;

    for (let tick = 0; tick < 299; tick += 1) advanceState(state, {});
    expect(state.shades).toHaveLength(2);

    advanceState(state, {});

    expect(state.shades).toHaveLength(3);
    const spawnedShade = state.shades[2];
    const islandDistances = [
      distanceXZ(spawnedShade.pos, [0, 0, 0]),
      distanceXZ(spawnedShade.pos, [70, 0, 0])
    ];
    expect(Math.min(...islandDistances)).toBeCloseTo(25, 6);
  });

  it("launches the player from a Night 2 jump pad with its configured impulse", () => {
    const state = createInitialState(42, 2);
    applyScenario(state, {
      player: { pos: [20, 0, 18] },
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
      random_drifters: false
    });

    advanceState(state, {});

    expect(state.player.vel[1]).toBe(14);
    expect(state.player.pos[0]).toBeCloseTo(20 - 0.6 * 24 / 60, 6);
    expect(state.player.pos[2]).toBeCloseTo(18 - 0.8 * 24 / 60, 6);
  });
});

describe("contract validation", () => {
  it("requires strictly increasing input ticks", () => {
    expect(() => parseInputs({ frames: [{ tick: 5 }, { tick: 5 }] })).toThrow();
  });

  it("rejects malformed input root and frame values", () => {
    expect(() => parseInputs([])).toThrow(/JSON object/);
    expect(() => parseInputs({ frames: [null] })).toThrow();
  });

  // Phase 3: no early win on all lit; win occurs at dawn with enough lit lanterns.
  it("wins at dawn when enough lanterns are lit", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      motes: [],
      shades: [],
      lanterns: [
        { id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true },
        { id: "L4", lit: true }, { id: "L5", lit: true }
      ]
    });
    state.tick = 240 * 60 - 1;
    state.simTick = 240 * 60 - 1;
    advanceState(state, {});
    expect(state.state).toBe("won");
    expect(state.reason).toBe("dawn_survived");
  });

  it("can reproduce a dawn win from a headless scenario", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      time_left_s: 1 / 60,
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false,
      lanterns: [{ id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true }]
    });

    expect(state.tick).toBe(0);
    advanceState(state, {});

    expect(state.state).toBe("won");
    expect(state.reason).toBe("dawn_survived");
  });

  it("rejects negative scenario time remaining", () => {
    const state = createInitialState(1, 1);
    expect(() => applyScenario(state, { time_left_s: -1 })).toThrow(/time_left_s/);
  });

  it("freezes simulation time while paused and marks paused snapshots", () => {
    const state = createInitialState(1, 1);
    const timeLeft = state.timeLeftS;

    advanceState(state, { pause: true });

    expect(state.tick).toBe(1);
    expect(state.simTick).toBe(0);
    expect(state.timeLeftS).toBe(timeLeft);
    expect(makeSnapshot(state).state).toBe("paused");
    expect(makeSnapshot(state).sim_tick).toBe(0);

    advanceState(state, { pause: false });
    expect(state.paused).toBe(true);
    expect(state.simTick).toBe(0);

    advanceState(state, { pause: true });
    expect(state.simTick).toBe(1);
    expect(state.timeLeftS).toBeLessThan(timeLeft);
  });

  it("loses when no flames remain", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { player: { flames: 1 }, motes: [], shades: [{ id: "S1", pos: [0, 0, 0] }] });
    advanceState(state, {});
    expect(state.state).toBe("lost");
  });
});

describe("snapshot format v1.1", () => {
  it("includes night field", () => {
    const state = createInitialState(42, 2);
    expect(state.night).toBe(2);
  });

  it("includes wind field in snapshot", () => {
    const state = createInitialState(42, 3);
    expect(state.wind.active).toBe(false);
    expect(state.wind.dirDeg).toBe(0);
  });
});

describe("scenarios with new features", () => {
  it("keeps disabled random spawns disabled throughout the scenario", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      motes: [],
      shades: [],
      random_motes: false,
      random_shades: false
    });

    for (let tick = 0; tick < 1200 && state.state === "playing"; tick += 1) {
      advanceState(state, {});
    }

    expect(state.motes).toHaveLength(0);
    expect(state.shades).toHaveLength(0);
  });

  it("uses the seed for random shade spawns", () => {
    const first = createInitialState(23, 1);
    const second = createInitialState(23, 1);
    const scenario = {
      motes: [],
      shades: [],
      random_motes: true,
      random_shades: true
    };
    applyScenario(first, scenario);
    applyScenario(second, scenario);

    for (let tick = 0; tick < 700; tick += 1) {
      advanceState(first, {});
      advanceState(second, {});
    }

    expect(first.shades).toEqual(second.shades);
  });

  it("applies scenario with dash cooldown", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { dash_cd_ticks: 30, pulse_cd_ticks: 60 }
    });
    expect(state.player.dashCdTicks).toBe(30);
    expect(state.player.pulseCdTicks).toBe(60);
  });

  it("applies scenario with drifters", () => {
    const state = createInitialState(1, 2);
    applyScenario(state, {
      drifters: [
        { id: "D1", pos: [10, 0, 10], state: "chase", stolen: [] }
      ],
      random_drifters: false
    });
    expect(state.drifters.length).toBe(1);
    expect(state.drifters[0].id).toBe("D1");
    expect(state.drifters[0].state).toBe("chase");
  });

  it("makes a nearby chasing drifter flee after pulse and drop stolen motes", () => {
    const state = createInitialState(7, 2);
    applyScenario(state, {
      player: { carried: 3 },
      motes: [],
      shades: [],
      drifters: [{
        id: "D1",
        pos: [1, 0, 0],
        state: "chase",
        state_ticks_left: 120,
        stolen: [true, true]
      }],
      random_motes: false,
      random_shades: false,
      random_drifters: false
    });

    advanceState(state, { pulse: true });
    expect(state.drifters[0].state).toBe("flee");

    let result = { events: [] };
    for (let tick = 0; tick < 300; tick += 1) {
      result = advanceState(state, {});
    }

    expect(state.drifters[0].state).toBe("removed");
    expect(state.motes).toHaveLength(2);
    expect(result.events.some((event) =>
      event.name === "drifter_drop" && event.data.amount === 2
    )).toBe(true);
  });

  it("applies scenario with charms", () => {
    const state = createInitialState(1, 3);
    applyScenario(state, {
      charms: [
        { id: "C1", available: true, respawn_s: 0, pos: [30, 0, 25] }
      ]
    });
    expect(state.charms.length).toBe(1);
    expect(state.charms[0].id).toBe("C1");
  });

  it("does not award unlisted bonus points for collecting a charm", () => {
    const state = createInitialState(1, 2);
    applyScenario(state, {
      player: { pos: [0, 0, 0] },
      motes: [],
      shades: [],
      charms: [{ id: "C1", pos: [0, 0, 0] }],
      random_motes: false,
      random_shades: false,
      random_drifters: false
    });

    advanceState(state, {});

    expect(state.score).toBe(0);
  });

  it("applies scenario with wind enabled", () => {
    const state = createInitialState(1, 3);
    applyScenario(state, {
      wind_enabled: true,
      wind: { active: false, dir_deg: 0 }
    });
    expect(state.windEnabled).toBe(true);
    expect(state.wind.active).toBe(false);
  });
});

describe("scoring", () => {
  it("scores motes correctly", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { 
      motes: [[0, 0, 0], [1, 0, 0]], 
      shades: [], 
      random_motes: false, 
      random_shades: false 
    });

    advanceState(state, {});
    advanceState(state, {});
    expect(state.player.carried).toBe(2);
    // Phase 3: picking up motes no longer scores; score comes from depositing.
    expect(state.score).toBe(0);
  });

  it("scores lantern lit correctly", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { pos: [0, 0, 25], carried: 10 },
      motes: [],
      shades: [],
      lanterns: [{ id: "L1", pos: [0, 0, 25], deposited: 0 }]
    });
    advanceState(state, { interact: true });
    // Phase 3: 10 motes deposited @5 + first light 100 = 150
    expect(state.score).toBe(150);
  });
});

describe("night initial motes and dash duration", () => {
  it("spawns initial motes on Night 2 and Night 3", () => {
    const night2 = createInitialState(42, 2);
    const night3 = createInitialState(42, 3);
    expect(night2.motes).toHaveLength(12);
    expect(night3.motes).toHaveLength(30);
  });

  it("runs dash at 14 m/s for exactly 12 ticks (0.2s) then returns to 6 m/s", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });

    advanceState(state, { dash: true });
    expect(state.dashTimer).toBe(12);

    for (let i = 0; i < 12; i += 1) {
      const beforeZ = state.player.pos[2];
      advanceState(state, { move: [0, 1], cam_yaw_deg: 0 });
      expect(state.player.pos[2] - beforeZ).toBeCloseTo(14 / 60, 5);
    }

    expect(state.dashTimer).toBe(0);
    const beforeNormalZ = state.player.pos[2];
    advanceState(state, { move: [0, 1], cam_yaw_deg: 0 });
    expect(state.player.pos[2] - beforeNormalZ).toBeCloseTo(6 / 60, 5);
  });
});

describe("phase 3 fuel, relight, drain, and capacity", () => {
  it("decays lit lantern fuel, emits lantern_out at 0, and relights for 5 motes with +40 bonus", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { pos: [0, 0, 25], carried: 5 },
      motes: [],
      shades: [],
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 1 / 60, ever_lit: true }],
      random_motes: false,
      random_shades: false
    });

    const outResult = advanceState(state, {});
    expect(state.lanterns[0].lit).toBe(false);
    expect(outResult.events.some((e) => e.name === "lantern_out" && e.data.lantern_id === "L1")).toBe(true);

    const relightResult = advanceState(state, { interact: true });
    expect(state.lanterns[0].lit).toBe(true);
    expect(state.lanterns[0].relitCount).toBe(1);
    expect(state.player.capacity).toBe(12);
    expect(state.score).toBe(5 * 5 + 40);
    expect(relightResult.events.some((e) => e.name === "lantern_lit" && e.data.relight === true)).toBe(true);
  });

  it("refuels a lit lantern and disables safe zone when fuel is below 30", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      player: { pos: [0, 0, 25], carried: 2 },
      motes: [],
      shades: [{ id: "S1", pos: [3, 0, 25], state: "chase" }],
      lanterns: [{ id: "L1", pos: [0, 0, 25], lit: true, fuel: 20, ever_lit: true }],
      random_motes: false,
      random_shades: false
    });

    const startX = state.shades[0].pos[0];
    advanceState(state, {});
    // Fuel < 30 disables safe zone, so chasing shade moves toward player
    expect(state.shades[0].pos[0]).toBeLessThan(startX);

    const refuelRes = advanceState(state, { interact: true });
    expect(refuelRes.events.some((e) => e.name === "refuel" && e.data.amount === 2)).toBe(true);
    expect(state.lanterns[0].fuel).toBeGreaterThan(35);
  });

  it("switches idle drifter to chase when player carries >= 5 within 15m and steals motes", () => {
    const state = createInitialState(7, 2);
    applyScenario(state, {
      player: { pos: [0, 0, 0], carried: 5 },
      motes: [],
      shades: [],
      drifters: [{ id: "D1", pos: [1, 0, 0], state: "idle", stolen: [] }],
      random_motes: false,
      random_shades: false,
      random_drifters: false
    });

    advanceState(state, {});
    expect(state.drifters[0].state).toBe("chase");

    const stealRes = advanceState(state, {});
    expect(stealRes.events.some((e) => e.name === "drifter_steal" && e.data.amount === 3)).toBe(true);
    expect(state.player.carried).toBe(2);
  });
});

describe("leaderboard", () => {
  it("accepts only 3-12 ASCII letters, digits, or underscores", () => {
    expect(validateLeaderboardName("Dao_123")).toBe(true);
    expect(validateLeaderboardName("Đạo123")).toBe(false);
    expect(validateLeaderboardName("ab")).toBe(false);
    expect(validateLeaderboardName("a".repeat(13))).toBe(false);
  });

  it("sorts entries by score descending, ties by earlier timestamp, and caps at top 10", () => {
    let entries = [];
    for (let i = 1; i <= 12; i += 1) {
      entries = addLeaderboardEntry(entries, {
        name: `User_${i}`,
        score: i * 100,
        nights_won: 1,
        achieved_at: new Date(1700000000000 + i * 1000).toISOString(),
        seed: i
      });
    }
    expect(entries).toHaveLength(10);
    expect(entries[0].score).toBe(1200);
    expect(entries[9].score).toBe(300);

    const exported = exportLeaderboard(entries);
    expect(exported.entries).toHaveLength(10);
    const created = createLeaderboardEntry("May_01", 999, 3, 42);
    expect(created).toMatchObject({ name: "May_01", score: 999, nights_won: 3, seed: 42 });
  });
});
