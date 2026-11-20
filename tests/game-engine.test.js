import { describe, expect, it } from "vitest";
import {
  applyScenario,
  advanceState,
  createInitialState,
  distanceXZ,
  parseInputs
} from "../src/game-engine.js";

describe("movement and pickup", () => {
  it("normalizes movement and respects camera yaw", () => {
    const state = createInitialState(1, 1);
    applyScenario(state, { motes: [], shades: [], random_motes: false, random_shades: false });
    advanceState(state, { move: [1, 1], cam_yaw_deg: 0 });
    expect(distanceXZ(state.player.pos, [5 / 60 * Math.SQRT1_2, 0, 5 / 60 * Math.SQRT1_2])).toBeLessThan(0.01);
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
      player: { pos: [0, 0, 25], carried: 5 },
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
    expect(state.player.flames).toBe(2);
    expect(second.events.some((event) => event.name === "pulse")).toBe(false);
  });
});

describe("contract validation", () => {
  it("requires strictly increasing input ticks", () => {
    expect(() => parseInputs({ frames: [{ tick: 5 }, { tick: 5 }] })).toThrow();
  });

  it("wins after all five lanterns are lit", () => {
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
