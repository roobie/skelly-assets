---
type: breaking
---
The pickups', trucks' and hearse's tailgates and the light truck's dropsides now export a hinge motion on drawn round
pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays the swing the build
proved clear; the bed gates drop level with the deck, and the technical's tail lamps ride its tailgate.

Upgrade:
- Open `crew_pickup_bed_tailgate`, `light_4x4_truck_tailgate`, `light_4x4_truck_dropside`,
  `military_cargo_truck_tailgate`, `technical_tailgate` and `hearse_tailgate` by playing their `motion`, not by swinging
  them on `hinge_a` and `hinge_b`.
- The technical's panel below its tailgate now belongs to `technical_bed`, so the gate is shorter and lighter.
- The hearse's tailgate lifts on pins under a brow on `hearse_coach`, behind the shell roof, and carries the arms that
  reach back to them.
