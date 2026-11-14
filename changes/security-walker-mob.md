---
type: breaking
---
The boss mob is exported as `mech_walker_mob_1` in the new pack `skelly.bestiary.mech`, with `standing.idle`, `standing.walk` (its stomp) and `standing.attack` (its twin-pod fire), and no far-LOD or limping sets. The security walker vehicle's id changes from `security_walker` to `mech_walker_vehicle_1`.

Upgrade:
- Place `mech_walker_vehicle_1` wherever you placed the vehicle `security_walker`, and update any reference to it, such as an item-materials entry. Its parts keep their ids.
- Name the mob `mech_walker_mob_1`.
