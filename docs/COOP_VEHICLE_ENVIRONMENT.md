# Vehicles and vegetation

`src/vehicle-environment-core.mjs` contains the original solo palm/rock impact rules, height bands and scaled crushing radii. Both the original game and the authoritative co-op now call these functions. Solo formulas, thresholds, mass penalties and recovery values are preserved.

The co-op spatial world provides living nearby forest colliders without scanning the whole forest. Vehicle contacts sweep translation and rotation at 0.2 m intervals, including the shared palm contact/crushing radii and rock height bands. A fast vehicle cannot skip an obstacle between ticks. Tanc, tanqueta and camio crush palms in their original scaled zones. Light vehicles block at low speed, topple palms above 10 m/s and take original mass-based chassis damage. Rocks remain solid; fast rock impacts damage even a tank. Boats contact emergent rocks; high helicopters clear them.

Tree destruction uses the existing authoritative palm health/checkpoint/snapshot path, and therefore the already implemented shared-geometry fall animation. Recovery suppresses repeated damage, while surviving solid obstacles continue blocking movement. Vehicle destruction continues through the existing non-explosive bicycle and explosion-chain rules.

Validation: coop-vehicle-environment, coop-vehicles, coop-fleet, coop-vehicle-contacts, coop-barrier-ram, coop-palm-damage, coop-vehicle-destruction, coop-palm-view, coop-vegetation-cover, rock-fields, palm-crowns; runtime syntax and reproducible build checks. Tests use Node and Three geometry without GPU. Worker deployment, mobile GPU and two-device verification remain pending.
