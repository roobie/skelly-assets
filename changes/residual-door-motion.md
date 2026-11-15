---
type: breaking
---
The bulldozer's and excavator's cab doors, the technical's doors and the utility 4x4's front and rear doors now export
a hinge motion on drawn pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays
the same swing the build proved clear. Each door's free edge, the one away from its pins, stands off the body by the gap
its swing needs, closed by a jamb on the body. The excavator's door now closes above the cab floor rather than over its
edge. The technical's quarter light straddles its door's pin line, so the part ahead of the pins would swing into the
windscreen; it is fixed glass on its windows. The utility 4x4's front doors hang on leaves out to the wing's face. The
machine steps and the quad bike's footboard stay put and no longer carry hinge anchors.

Upgrade:
- Open `bulldozer_cab_door`, `excavator_cab_door`, `technical_door`, `utility_4x4_front_door` and
  `utility_4x4_rear_door` by playing their `motion`, not by swinging them on `hinge_a` and `hinge_b`.
- Treat `beach_buggy_step`, `forklift_step`, `golf_cart_step`, `quad_bike_footboard`, `road_roller_step` and
  `trencher_step` as fixed parts.
- Have the technical's mirrors ride `door`, as its placements do.
- Draw the technical's quarter light from `technical_windows`, not `technical_door`.
