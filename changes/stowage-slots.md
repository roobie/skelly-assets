---
type: breaking
---
A fire engine's locker kit is catalogue items in stowage slots, so a game can loot it or stow more: a placements
site's new `stowed` names the item in each slot of its part, and its new `behind` names the closure that hides it.

Upgrade:
- Load the packs `skelly.ground-vehicles` now depends on with it.
- For each fire engine site with `stowed`, place each named item in its slot, its seat mated to the slot as ports
  mate, and never mirror an item on a mirrored site; see `docs/decisions/0016-stowage-slots.md`.
- Read `behind` on a site, or ignore it to draw stowed kit whatever the shutter.
