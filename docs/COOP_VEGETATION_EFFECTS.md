# Shared vegetation destruction effects

`src/debris-core.mjs` extracts the original single-player debris spawning, gravity, collision bounce, spin damping, fade, dust expansion and palm fall/impact placement. Both modes now use these functions. The solo random-call order and visual constants are preserved, including normal, vehicle and truck fragment behavior.

The cooperative fall ends with eight green leaf fragments, four brown trunk fragments and a dust puff, at the original scaled/yaw-rotated impact positions. Fragments land on the physical terrain and water baseline. These are local cosmetic objects: they do not change authoritative health, motion or network traffic.

The view limits active fragments to 160, dust puffs to 100 and falling palms to 48. Expired objects are removed; exiting or changing the rendering path disposes owned geometry and materials without disposing shared palm geometry. Repeated snapshots cannot replay a destroyed palm, and reconnecting removes old trees without replaying effects.

Validation: the debris-shared fixture was captured by executing the pre-extraction source from commit c33e6367269f627a4908e3c83652e6f1b403ebba. Its SHA-256 covers seeded spawn state and 90 frames of original normal/vehicle/truck debris. Both classic source loading and the production runtime match that fixture. Additional tests cover native impact placement, bounded bursts, expiry, leaving mid-fall, resource disposal, reconnection, solo palm/rock generation, building debris, authoritative palm damage, vehicle environment contacts and the co-op UI. GPU, mobile/two-device and deployed Worker checks remain pending.
