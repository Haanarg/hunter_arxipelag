# Shared palm damage in co-op

Palms now have the same eight health points and rounded whole damage as solo, using the shared damageHealth rule. Authoritative projectiles damage the palm that actually intercepted their flight; grenades, C4 and other explosions apply the original explosionDamage falloff, with wall/terrain occlusion. Rocks remain indestructible.

Only changed palm health is sent in snapshots and saved in checkpoints. Stable generated palm indices reconnect the state to the procedural forest. Dead palms stop blocking projectiles, sight and players. Rebuilding geometry after doors or structural damage preserves palm health. Shared cached forest generation is never mutated.

The view reuses the original instanced trunk and crown geometry, colors and LOD removal API, with the solo quadratic fall curve over 0.9 seconds. A reconnect removes previously destroyed trees without replaying their fall. Dust and debris effects, vehicle crushing and real two-device/GPU validation remain pending.

Tests: coop-palm-damage, coop-palm-view, coop-vegetation-cover, vegetation-shared, coop-projectiles, coop-structural-destruction, coop-doors, coop-combat and coop-play-ui.
