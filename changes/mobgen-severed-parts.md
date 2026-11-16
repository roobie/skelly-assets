---
type: breaking
---
Severed parts are baked from the mobs: `skelly.body` holds one model per cut point of each zombie type, listed with `kind: severed-part` and a `cut` naming the type and the bone, and its `severed/index.json` holds every part's sidecar by type and bone. The drawn `shambler_*` parts are gone.

Upgrade:
- Take the item a cut leaves from `severed/index.json`, by the actor's type and the bone it severs, instead of by hit region.
- Drop `shambler_torso`, which has no successor; apply `renames.json` for the drawn arms and legs.
