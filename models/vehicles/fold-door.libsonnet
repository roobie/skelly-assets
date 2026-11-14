// A folding door's leaf: two panels of equal width that jack-knife out of the doorway. The jamb panel turns out on pins
// at the jamb; the free panel rides it, turning back on pins at their shared edge through twice the jamb's angle, so it
// stays square to the doorway and its far end runs along the doorway's line, and at full fold the two lie flat together.
// Each pin sits on the face its panels close against, the jamb's outer face, which turns away from the pillar, and the
// shared edge's inner face, where the panels meet: a pin on the other face would fold one panel through the other.
// A leaf's outer face is toward +z, the near side, so a mirrored leaf still folds out of its vehicle.
local k = import 'kit.libsonnet';
{
  // A leaf `width` wide, `height` tall and `thick` deep, its jamb at its +x end when `jambSign` is 1 or its -x end when
  // -1, folding its jamb panel `fold` degrees. Each panel is drawn about its own centre and placed `at` along the leaf
  // from the leaf's centre; `pins` are its hinge pins, in the slot `slot` names.
  leaf(width, height, thick, jambSign, fold=90, slot='paint')::
    local panels = { jamb: width / 2, free: width / 2 };
    assert panels.jamb == panels.free : 'a free panel turning twice its jamb panel\'s angle folds flat only on a panel of equal width';
    assert fold > 0 && fold <= 90 : 'a leaf folds more than 0 and at most 90 degrees, so its free panel turns at most 180';
    assert jambSign == 1 || jambSign == -1 : 'a leaf has its jamb at one end';
    local edge = jambSign * panels.jamb / 2;
    // A tenth of the way in from each end, where a leaf hung on hinge anchors had them.
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
