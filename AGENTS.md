# Hunter: Arxipèlag

## Multiplayer direction

The user requires an adaptation of the existing single-player game, with the same full-viewport interface, original controls and HUD, and the original third-person camera behind each client's own player. The separate orthographic `coop.html` / `coop-play` client is a technical prototype, not the intended multiplayer game.

Before ordinary multiplayer development, read `docs/COOP_REBUILD.md`. It supersedes the direction implied by the older prototype progress documents. Preserve useful authenticated transport, room persistence and shared rules, but develop the multiplayer session inside the original runtime. Do not continue expanding the separate renderer, interface, alternative world generator or relay mission as the product solution. Explicitly requested fixes to the prototype can still be made.

Reuse the original implementation first. Extract renderer-free state and rules with parity checks instead of implementing equivalent-looking systems independently. The same seed must ultimately mean the same complete world in both modes. Keep single-player playable throughout the migration.

The first multiplayer acceptance milestone is two players in the original game viewport, with original input/HUD and each original camera following its own actor from behind. Node tests of networking or shared models do not establish that this visual/gameplay milestone is complete. Report implementation, GPU/two-device testing and deployment status separately and accurately.

Current native integration and outstanding parity work are documented in `docs/COOP_NATIVE_RUNTIME.md`. The original-runtime entry introduced in 0.6.50 is not a claim that the full campaign, enemy AI and optional systems already have multiplayer parity.

## Canonical backlog and optimization discipline

Read `to-do.MD` before changing behavior, architecture, performance or old COOP code. It is the only current backlog; old phase/version notes are historical, not a second list of actionable tasks. Put newly discovered work in `to-do.MD`, with explicit status (implementation, validation or investigation). Do not recreate `PROGRESS.MD` or a per-version TODO list.

For performance work, follow `docs/PERFORMANCE_TESTING.md`. Establish a baseline, make one small extraction at a time, run the appropriate Node/parity tests and verify graphics and two-device behavior separately. Never delete generated runtime bundles, the pinned Three.js dependency or test assets merely because they are large; first prove that production and tests no longer need them.

## Default 3D model testing interface

The vehicle model lab `vehicles-externs-proves.html` is the default reusable interface for testing 3D model changes. Preserve the reusable annotation editor in `src/vehicle-annotation-editor.mjs` and its live surface-hole brush in `src/vehicle-hole-brush.mjs` across vehicle types. Group/join and delete modes remain non-destructive annotations. Hole mode is deliberately different: the cursor follows real mesh surfaces (no virtual painting plane); green means a safely bounded small open edge loop is detected, blue means pending; clicking green triangulates the actual mesh in memory, with undo restoring geometry and material. Export coordinates plus repair status. Avoid making promises about closing large, irregular or non-planar holes, and never save modified meshes to the repo implicitly. Do not restrict this editor to the BTR-82. Keep Alt-drag camera orbit and Alt-wheel zoom available while painting. Record validation gaps in `to-do.MD`, not a parallel backlog.

## Phase 2 tools

Before bumping `GAME_VERSION`, update `src/version.mjs`, run `npm run sync:version`, then `npm run build`. `npm run check:build` must reject stale version stamps and generated bundles. Preserve the only runtime generation workflow at `.github/workflows/rebuild-runtime.yml`; do not reintroduce a second writer. For the reduced set of essential regressions use `npm test` (`npm run test:regression:once` is a compatibility alias), and `node tools/repository-audit.cjs` for a conservative dependency/preview inventory. HTML labs may have external URLs even when no source file links to them; never delete on graph reachability alone.
