---
type: breaking
---
The doors of the military trucks, the military ambulance, the light tactical vehicle, the cab-over 4x4 and the SWAT
truck's rear doors now export a hinge motion in place of their hinge anchors, so the showcase's Open view swings them
and a game plays the swing the build proved clear. Each door turns on round pins at the outer end of its hinge leaves.
The military trucks' A-posts reach back to the door, whose window frame no longer wraps forward past its hinge. The
cab-over 4x4's tail lamps are narrower and sit further outboard, clear of the rear door, and its spare wheel rides the
rear door.

Upgrade:
- Open `military_truck_door`, `military_ambulance_rear_door`, `light_tactical_vehicle_front_door`,
  `light_tactical_vehicle_rear_door`, `cab_over_field_car_cab_door`, `cab_over_field_car_side_door`,
  `cab_over_field_car_rear_door` and `swat_truck_rear_door` by playing their `motion`, not by swinging them on
  `hinge_a` and `hinge_b`.
- Have the cab-over 4x4's `spare_wheel` ride `rear_door` and place its tail lamps where the placements export puts
  them.
