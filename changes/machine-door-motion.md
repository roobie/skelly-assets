---
type: breaking
---
The tractor's and combine harvester's cab doors and the skid-steer loader's tail door now export a hinge motion on
drawn pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays the same swing
the build proved clear. The tractor door's lower edge follows the rear fender, with a fixed skirt on the cab beneath
it; the skid-steer's tail lamps ride its tail door. The skid-steer's front door and the small tractor's footboard stay
shut and no longer carry hinge anchors.

Upgrade:
- Open `tractor_cab_door`, `combine_harvester_cab_door` and `skid_steer_tail_door` by playing their `motion`, not by
  swinging them on `hinge_a` and `hinge_b`.
- Treat `skid_steer_door` and `small_tractor_footboard` as fixed parts.
- Have the skid-steer's tail lamps ride `tail_door`, as its placements do.
