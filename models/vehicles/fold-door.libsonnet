// A folding door's leaf: two panels of equal width that jack-knife out of the doorway. The jamb panel turns out on pins
// at the jamb; the free panel rides it, turning back on pins at their shared edge through twice the jamb's angle, so its
// far end runs along the doorway's line, and at full fold the two lie flat together.
// Each pin sits on the face its panels close against, the jamb's outer face, which turns away from the pillar, and the
// shared edge's inner face, where the panels meet: a pin on the other face would fold one panel through the other.
// A leaf's outer face is toward +z, the near side, so a mirrored leaf still folds out of its vehicle.
local k = import 'kit.libsonnet';
{
  // The width of a leaf that folds out of `room` along the doorway, `thick` deep. On its way out the free panel's outer
  // corner swings past the leaf's far end by 2 * (hypot(p, thick) - p), p being a panel's width, so a leaf that fills its
  // room would cut into whatever lies past it; the leaf that fits is the one whose panel's diagonal is half the room. A
  // pair of leaves meeting in the middle of a doorway take half its span as the room each.
  fitWidth(room, thick):: 2 * std.sqrt(room * room / 4 - thick * thick),
  // A leaf `width` wide, `height` tall and `thick` deep, its jamb at its +x end when `jambSign` is 1 or its -x end when
  // -1, folding its jamb panel `fold` degrees. Each panel is drawn about its own centre and placed `at` along the leaf
  // from the leaf's centre; `pins` are its hinge pins, in the slot `slot` names.
  leaf(width, height, thick, jambSign, fold=90, slot='paint')::
    // A free panel turning twice its jamb panel's angle folds flat only on a panel of equal width.
    local panels = { jamb: width / 2, free: width / 2 };
    assert fold > 0 && fold <= 90 : 'a leaf folds more than 0 and at most 90 degrees, so its free panel turns at most 180';
    assert jambSign == 1 || jambSign == -1 : 'a leaf has its jamb at one end';
    local edge = jambSign * panels.jamb / 2;
    // The pins sit a tenth of the leaf's height in from each end.
    local pins(name, z) = k.hingePins(name, 'y', [edge, height * 0.1, z], [edge, height * 0.9, z], slot);
    {
      width: panels.jamb,
      jamb: {
        at: edge,
        pins: pins('jamb_pin', thick / 2),
        motion: k.motion.hinge(self.pins, 'near', fold),
      },
      free: {
        at: -edge,
        pins: pins('fold_pin', -thick / 2),
        motion: k.motion.hinge(self.pins, 'far', 2 * fold),
      },
    },
}
