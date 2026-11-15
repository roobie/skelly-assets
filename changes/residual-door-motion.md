---
type: breaking
---
The bulldozer's and excavator's cab doors, the technical's doors and the utility 4x4's front and rear doors now export
a hinge motion on drawn pins in place of their hinge anchors, so the showcase's Open view swings them and a game plays
the same swing the build proved clear. Each door's trailing edge stands off the post behind it, closed by a jamb on the
body. The excavator's door stands on a sill above the cab floor; the technical's quarter light, which lies ahead of its
door's pins, is fixed glass on its windows; the utility 4x4's front doors hang on leaves out to the wing's face. The
machine steps and the quad bike's footboard stay put and no longer carry hinge anchors.

Upgrade:
- Open `bulldozer_cab_door`, `excavator_cab_door`, `technical_door`, `utility_4x4_front_door` and
  `utility_4x4_rear_door` by playing their `motion`, not by swinging them on `hinge_a` and `hinge_b`.
- Treat `beach_buggy_step`, `forklift_step`, `golf_cart_step`, `quad_bike_footboard`, `road_roller_step` and
  `trencher_step` as fixed parts.
- Have the technical's mirrors ride `door`, as its placements do.
- Draw the technical's quarter light from `technical_windows`, not `technical_door`.
