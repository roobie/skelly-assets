---
type: breaking
---
A fire engine's locker kit is loose catalogue items, so a game can loot it or stow more: each
`fire_engine_locker_stowage_<locker>` part holds only its shelves, board and strap, and offers stowage slots, ports
of mount `stowage` with the words they accept and the envelope their kit must stay inside. A placements site's new
`stowed` maps those slots to the items it carries, each item seated by its own `stowage` port, and its new `behind`
names the shutter that hides it. New items: `breathing_air_cylinder`, `fire_hose_roll`, `standpipe`, `hydrant_key`,
`branch_nozzle`, `traffic_cone`, `portable_fire_pump` and `ventilation_fan`. `skelly.ground-vehicles` now depends on
the containers, hand tools, household, machinery, medicine and structures packs.

Upgrade:
- Load the packs `skelly.ground-vehicles` now depends on with it.
- For each fire engine site with `stowed`, place each named item in its slot, its seat mated to the slot as ports
  mate, and never mirror an item on a mirrored site; see `docs/decisions/0016-stowage-slots.md`.
- Read `behind` on a site, or ignore it to draw stowed kit whatever the shutter.
