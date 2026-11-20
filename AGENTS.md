# Harness rules

- Keep pure gameplay in `src/game-engine.js`; renderers and CLI must not change rules.
- Every gameplay change needs focused Vitest coverage and a headless scenario.
- Run `npm test` and at least one win/loss/determinism headless run before finishing.
- Invalid scenario or inputs must exit 2 with stderr; runtime success exits 0.
- Keep JSONL fields and event names aligned with `game.contract.json`.
- Record assumptions, AI mistakes, token estimates, and evidence in `docs/`.
- Do not edit generated output to make tests pass.

# Phase 2 - Standardized Metrics & Features

## Requirements

- **Contract version**: v1.1
- **Supported nights**: 1, 2, 3 (300s, 330s, 360s respectively)
- **Frame rate**: 60 ticks/second
- **Unit system**: meters, seconds, Y-axis up

## Standardized Metrics

| Category | Parameter | Value |
|----------|-----------|-------|
| Movement | Player speed | 6.0 m/s |
| Movement | Dash speed | 14.0 m/s |
| Movement | Dash duration | 0.2 s |
| Movement | Dash cooldown | 1.5 s |
| Jump | Velocity | 7.0 m/s |
| Jump | Gravity | -20 m/s² |
| Pulse | Cost | 3 motes |
| Pulse | Radius | 5.0 m |
| Pulse | Cooldown | 3 s |
| Lantern | Cost | 10 motes |
| Pickup | Radius | 1.0 m |
| Interact | Radius | 2.0 m |
| Safe zone | Radius | 6.0 m |
| Shade | Speed | 4.0 m/s (Night 3: 4.5 m/s) |
| Shade | Hit radius | 1.0 m |
| Drifters | Speed | 7.0 m/s |
| Charms | Duration | 600 ticks (10 s) |
| Charms | Cooldown | 2700 ticks (45 s) |

## New Features (Phase 2)

### Mechanics
- Dash (Space/Shift): 14 m/s for 0.2 s, 1.5 s cooldown
- Jump: 7.0 m/s upward, gravity -20 m/s²
- Drifters (D1, D2): Steal motes, flee after pulse
- Charms (C1, C2): Speed boost 7.2 m/s, no dash cooldown
- Wind (Night 3): Random direction every 30 s, 5 s duration
- Jump pads (Night 2): Launch to opposite island

### Nights
- **Night 1 - Đảo Bến**: 40 m island, 5 lanterns, 6 shades max
- **Night 2 - Đảo Cau**: Two 28 m islands + bridge, 6 lanterns, 8 shades max, 2 drifters max
- **Night 3 - Đảo Chuông**: 45 m island with 3 levels, 7 lanterns, 10 shades max, wind

### Events
- `dash {}`: Dash activated
- `charm_picked {charm_id, charm_ticks}`: Charm collected
- `drifter_steal {drifter_id, amount, carried}`: Drifter stole motes
- `drifter_drop {drifter_id, amount}`: Drifter dropped motes
- `night_start {night}`: New night started
- `paused {}`: Game paused
- `resumed {}`: Game resumed
- `player_hit {by, flames, dropped, lost}`: Player hit (added `lost` field)

## Scoring

- +10 per mote deposited
- +100 per lantern lit
- +5 per shade stunned
- +2 × seconds remaining on win
- +50 × flames remaining on win

## Test Contract

Run headless tests with: `npm run headless -- --seed <n> --night <1-3> --ticks <max 21600> --out <output.jsonl>`

### Acceptance criteria per Phase 2 feature

| Feature | Test scenario | Expected outcome |
|---------|--------------|------------------|
| Dash | Dash input, no cooldown | Dash event generated |
| Dash | Dash input, cooldown active | No dash event |
| Night 1 | All 5 lanterns lit | Win, reason "all_lit" |
| Night 2 | 6 lanterns lit | Win, reason "all_lit" |
| Night 3 | 7 lanterns lit | Win, reason "all_lit" |
| Drifter | Carry 5+ motes, within 15 m | Drifter enters chase state |
| Drifter | Pulse while chasing | Drifter flees, drops motes |
| Charm | Pickup charm | Speed boost active |
| Wind | Night 3, active | Wind warning audio |
| Pause | Escape/P pressed | Game paused, timers frozen |

## File Structure

```
src/
├── game-engine.js      # Core rules (unchanged by renderers/CLI)
├── main.js             # 3D renderer (no gameplay logic)
└── headless-cli.js     # CLI testing (no gameplay logic)
```

## Color Palette

| Element | Hex |
|---------|-----|
| Sky night | #0E1430 |
| Grass/sand | #2F5D50 / #C9B48A |
| Wood | #6B4A2F |
| Mây biển | #12384A |
| Lantern on | #FFB347 |
| Lantern off | #5B5F6E |
| Mote core | #FFF6C2 |
| Mote glow | #FFE58A |
| Shade body | #120A1A |
| Shade outline | #7A3CFF |
| Shade stunned | #3A3450 |
| Mây áo | #E8E2D0 |
| Mây khăn | #C8102E |
| Charm border | #F2C14E |
| Drifter | #8FA3B8 |
| UI danger | #FF5A5F |
| UI text | #F5F1E6 |

## Night-Specific Config

- **Night 1**: `NIGHT_1` - single island, motes at radii 12 and 33
- **Night 2**: `NIGHT_2` - two islands + bridge, jump pads at (20,0,18) and (50,0,-18)
- **Night 3**: `NIGHT_3` - three levels, bell tower at center, jump pad at (0,3,13)
