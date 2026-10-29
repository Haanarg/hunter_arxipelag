# Cooperative vegetation cover

The authoritative world adapter now exposes an indexed vegetationAt lookup over the same generated palm and rock colliders already used for player movement. Combat traces use this lookup for projectile obstruction, guard visibility, aiming, grenades and blast occlusion.

The lookup follows the original solo treeAt footprint: radius plus 0.5 m projectile margin, palm height 6.5 m and rock height 1.5 m above local terrain. Exterior vegetation is excluded inside the bunker basement. Bushes remain decorative. This does not add palm damage, falling trunks or vehicle crushing; those still need authoritative state and visual replication.

Two existing regressions found during integration were corrected: window axes are validated as x/z strings rather than numeric coordinates, and wall/roof contact exactly at a projectile step endpoint is retained.

Validation: coop-vegetation-cover, coop-projectiles, vegetation-shared, coop-combat, coop-guard-perception and window-combat. No GPU, two-device or deployed Worker validation performed.
