// A folding door's leaf: two panels of equal width that jack-knife out of the doorway. The jamb panel turns out on pins
// at the jamb; the free panel rides it, turning back on pins at their shared edge through twice the jamb's angle, so its
// far end runs along the doorway's line, and at full fold the two lie flat together.
// Each pin sits on the face its panels close against, the jamb's outer face, which turns away from the pillar, and the
// shared edge's inner face, where the panels meet: a pin on the other face would fold one panel through the other.
// A leaf's outer face is toward +z, the near side, so a mirrored leaf still folds out of its vehicle.
// The voxels draw a part on a lattice anchored at its origin, rounding every face to the nearest lattice plane. A panel
// whose voxels ran past its pins would swing past the room its leaf was fitted to, so each panel is drawn from its pins,
// its origin on their line, a whole number of grains long and as deep as the leaf, which lies about its mid-plane.
local k = import 'kit.libsonnet';
local voxels = import 'models/voxel-grains.libsonnet';
local grain = voxels.classes.vehicle.grain;
local whole(length) = std.abs(length / grain - std.round(length / grain)) < 1e-9;
{
  // A leaf is as thin as a feature that reads as itself at the grain, so its faces lie on its panels' lattice.
  thick:: voxels.featureVoxels * grain,
  // The width of a leaf that folds out of `room` along the doorway, `thick` deep. On its way out the free panel's outer
  // corner swings past the leaf's far end by 2 * (hypot(p, thick) - p), p being a panel's width, so a leaf that fills its
  // room would cut into whatever lies past it; the leaf that fits is the widest whose panel's diagonal is at most half
  // the room, its panels a whole number of grains. A pair of leaves meeting in the middle of a doorway take half its
  // span as the room each.
  fitWidth(room, thick):: 2 * grain * std.floor(std.sqrt(room * room / 4 - thick * thick) / grain),
  // A leaf `width` wide, `height` tall and `thick` deep, its jamb at its +x end when `jambSign` is 1 or its -x end when
  // -1, folding its jamb panel `fold` degrees. Every panel `span`s the same stretch along x from its origin, toward the
  // leaf's free end; each panel's origin lies `at` along the leaf from the leaf's centre; `pins` are its hinge pins, in
  // the slot `slot` names.
  leaf(width, height, thick, jambSign, fold=90, slot='paint')::
    // A free panel turning twice its jamb panel's angle folds flat only on a panel of equal width.
    local panel = width / 2;
    assert fold > 0 && fold <= 90 : 'a leaf folds more than 0 and at most 90 degrees, so its free panel turns at most 180';
    assert jambSign == 1 || jambSign == -1 : 'a leaf has its jamb at one end';
    assert whole(panel) && whole(thick / 2) : 'a leaf panel is a whole number of grains wide and half deep';
    // The pins sit a tenth of the leaf's height in from each end.
    local pins(name, z) = k.hingePins(name, 'y', [0, height * 0.1, z], [0, height * 0.9, z], slot);
    {
      span: std.sort([0, -jambSign * panel]),
      jamb: {
        at: jambSign * panel,
        pins: pins('jamb_pin', thick / 2),
        motion: k.motion.hinge(self.pins, 'near', fold),
      },
      free: {
        at: 0,
        pins: pins('fold_pin', -thick / 2),
        motion: k.motion.hinge(self.pins, 'far', 2 * fold),
      },
    },
}
