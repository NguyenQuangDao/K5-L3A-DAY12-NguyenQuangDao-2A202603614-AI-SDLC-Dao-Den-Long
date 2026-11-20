import { describe, expect, it } from "vitest";
import {
    advanceState,
    applyScenario,
    createInitialState,
    distanceXZ,
    parseInputs
} from "../src/game-engine.js";

describe("movement and pickup", () => {
  it("normalizes movement and respects camera yaw", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });
    advanceState(state, { move: [1, 1], cam_yaw_deg: 0 });
    expect(distanceXZ(state.player.pos, [6 / 60 * Math.SQRT1_2, 0, 6 / 60 * Math.SQRT1_2])).toBeLessThan(0.01);
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
    applyScenario(state, { motes: [], shades: [{ id: "S1", pos: [1, 0, 0] }] });
    const result = advanceState(state, { pulse: true });
    expect(result.events.map((event) => event.name)).toContain("pulse");
    expect(state.shades[0].state).toBe("stunned");
    const second = advanceState(state, { pulse: true });
    expect(state.player.flames).toBe(0);
    expect(second.events.some((event) => event.name === "pulse")).toBe(false);
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
});

describe("contract validation", () => {
  it("requires strictly increasing input ticks", () => {
    expect(() => parseInputs({ frames: [{ tick: 5 }, { tick: 5 }] })).toThrow();
  });

  it("wins after all lanterns are lit", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, {
      motes: [],
      shades: [],
      lanterns: [
        { id: "L1", lit: true }, { id: "L2", lit: true }, { id: "L3", lit: true },
        { id: "L4", lit: true }, { id: "L5", lit: true }
      ]
    });
    advanceState(state, {});
    expect(state.state).toBe("won");
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
    expect(state.score).toBe(20);
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
    expect(state.score).toBe(200);
  });
});
