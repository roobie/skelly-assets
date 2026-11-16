---
type: breaking
---
Severed parts are baked from the mobs: `skelly.body` holds, per cut point of each zombie type, its whole part and one part for each set of cut points below it a cut there may find already gone, so an arm cut after its hand weighs only what is left. Each is listed with `kind: severed-part` and a `cut` naming the type, the bone and those gone cut points, and its `severed/index.json` holds every cut point's parts by type and bone. The drawn `shambler_*` parts are gone.

Upgrade:
- Take the item a cut leaves from `severed/index.json`, by the actor's type, the bone it severs and the top-most cut points below it already severed, instead of by hit region.
- Drop `shambler_torso`, which has no successor; apply `renames.json` for the drawn arms and legs.
