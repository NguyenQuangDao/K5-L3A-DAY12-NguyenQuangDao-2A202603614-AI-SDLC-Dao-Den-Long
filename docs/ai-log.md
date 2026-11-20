# AI usage log

| Phase | Estimated tokens | Savings |
|---|---:|---|
| 1 | ~12,000 context-equivalent tokens | Implemented pure engine/headless first, then renderer; reused one scenario format for tests and release |

## Phase 1 AI errors and corrections

- An initial headless implementation did not yet enforce rising-edge actions. It was corrected in the CLI by comparing against previous button state.
- Scenario assembly was kept separate from event generation so loading a lit lantern does not create fake events or score.
- A reviewer pass required moving all gameplay state changes out of the Three.js renderer.
