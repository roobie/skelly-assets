---
type: breaking
---
The classic small car's doors and boot lid, the army 4x4's side rails and the school bus's rear exit now export a hinge
motion on drawn round pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays
the swing the build proved clear. The army 4x4's side rails hang just outside the tub's side and swing out. The small car's boot lid is shorter, behind a
fixed deck under the rear screen, and its door mirrors sit a little further aft and ride the doors.

Upgrade:
- Open `classic_small_car_door`, `classic_small_car_boot_lid`, `army_jeep_side_rail` and `school_bus_rear_door` by
  playing their `motion`, not by swinging them on `hinge_a` and `hinge_b`.
- Have the classic small car's `door_mirror` ride `door` and place it where the placements export puts it.
