---
type: breaking
---
Severed parts are baked from the mobs: `skelly.body` holds one model per cut point of each zombie type, listed with `kind: severed-part` and a `cut` naming the type, the bone and the type's cut map `severed/<type>.json`, which gives each cut bone's sidecar. The drawn `shambler_*` parts are gone; `shambler_torso` has no successor.

Upgrade:
- Take the item a cut leaves from the cut map of the actor's type, by the bone it severs, instead of by hit region.
- Drop `shambler_torso`; apply `renames.json` for the drawn arms and legs.
