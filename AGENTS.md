# Harness rules

- Keep pure gameplay in `src/game-engine.js`; renderers and CLI must not change rules.
- Every gameplay change needs focused Vitest coverage and a headless scenario.
- Run `npm test` and at least one win/loss/determinism headless run before finishing.
- Invalid scenario or inputs must exit 2 with stderr; runtime success exits 0.
- Keep JSONL fields and event names aligned with `game.contract.json`.
- Record assumptions, AI mistakes, token estimates, and evidence in `docs/`.
- Do not edit generated output to make tests pass.
