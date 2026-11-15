---
type: breaking
---
The armoured vehicles' ramps, doors and hatches now export a hinge motion on drawn round pins in place of their hinge
anchors, so the showcase's Open view swings them and a game plays the swing the build proved clear; the ramps lower
until their lips rest on the ground. The APC hatch and the turret hatches, which had no hinge before, open too. The
CV9040's and the main battle tank's driver's hatches are rows of their own that swing aside level, as a tank's does,
since the gun and the turret's front leave a raised lid no room, their lids a little thinner than the turret ring is
high so the turret clears them; the APC's tow hitch sits lower, under the sill, so the lowered ramp clears it. The
hull's frame facing each door's free edge stands a few millimetres off it, so the door's inner corner clears it as
the door starts to swing, and the sci-fi APC's side doorway is 1 cm longer.

Upgrade:
- Open `apc_ramp`, `apc_hatch`, `apc_scifi_wheeled_ramp`, `apc_scifi_wheeled_side_door`, `cv9040_rear_door`,
  `half_track_windscreen_armour`, `half_track_cab_door` and `half_track_rear_door` by playing their `motion`, not by
  swinging them on `hinge_a` and `hinge_b`.
- Open `turret_hatch`, `ifv_turret_hatch`, `mbt_turret_hatch`, `cv9040_driver_hatch` and `mbt_driver_hatch` by
  playing their `motion`.
- Fit `cv9040_driver_hatch` and `mbt_driver_hatch` at those vehicles' `driver_hatch` sites in place of `apc_hatch`,
  as the vehicles' placements do.
