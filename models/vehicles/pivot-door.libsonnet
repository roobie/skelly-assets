// A swing-out door: one leaf carried on an arm that turns out of the doorway on a column at its jamb end. The arm
// turns out on pins at the column; the leaf rides it on pins at the arm's tip and turns back through the arm's angle, so
// it stays parallel to the doorway all the way and stops standing out from the body beside the doorway, past the jamb.
// The leaf hangs off the arm's line by brackets on its inner face, so the arm lies behind the leaf at rest, inside the
// doorway, and the leaf's inner face keeps clear of the arm whatever angle lies between them.
// Each part is drawn from its pins, its origin on their line, with the faces that bound a swing a whole number of
// grains from it, since the voxels round every face to the lattice anchored at a part's origin. A leaf's outer face is
// toward +z, the near side, and its jamb end is at +x when `jambSign` is 1 or at -x when -1.
local foldDoor = import 'fold-door.libsonnet';
local k = import 'kit.libsonnet';
// Drawn on the folding leaf's grain and as deep as it, so a bus's leaves of either kind close to the same seam.
local grain = foldDoor.grain;
local up(length) = grain * std.ceil(length / grain - 1e-9);
local whole(length) = std.abs(length / grain - std.round(length / grain)) < 1e-9;
// An arm's half depth and its height, and a bracket's half width and height: a stout tube, a few grains across.
local armHalf = 3 * grain;
local armHigh = 6 * grain;
local bracketHalf = 3 * grain;
local bracketHigh = 6 * grain;
// How far the upper arm's bracket stands below the leaf's head.
local headroom = 0.08;
{
  grain:: grain,
  thick:: foldDoor.thick,
  // A leaf in a doorway `room` wide, `height` tall and `thick` deep, on an arm `reach` long that opens `open` degrees.
  // `face` is how far outboard of the leaf's mid-plane the outermost face past its jamb end stands, which the leaf
  // must clear as it leaves the doorway, and `foot` the height above the leaf's foot of the tread the column stands on.
  // `arm` and `leaf` are the two parts: `at` is where a part's origin lies along x from the doorway's jamb end, `out`
  // how far it lies outboard of the leaf's mid-plane, `pieces` its pins and fittings and `motion` its hinge. The leaf's
  // panel spans `span` along x from its origin, its mid-plane `mid` outboard of it.
  door(room, height, thick, jambSign, reach, open, face, foot, slot='door', armSlot='arm')::
    assert jambSign == 1 || jambSign == -1 : 'a leaf has its jamb at one end';
    assert open > 90 && open < 180 : 'an arm opens past square and short of straight, so the leaf ends beside the doorway';
    assert whole(reach) && whole(thick / 2) : 'an arm reaches a whole number of grains and a leaf is a whole number half deep';
    local rad = k.rad(open);
    // The leaf's inner face lies `inner` outboard of the arm's line, and what it must clear `depth` outboard of that face.
    // A leaf turning on the arm's tip keeps its inner face that far from the tip, and the nearest the arm reaches it is
    // its tip's corners, half the arm's diagonal from the tip.
    local inner = up(armHalf * std.sqrt(2) + k.swingGap);
    local depth = face + thick / 2;
    assert reach * std.sin(rad) > depth + k.swingGap : 'an open leaf stands clear outboard of what lies past its jamb';
    // The leaf rides the arm's tip, so it moves toward the jamb by reach(1 - cos) as it moves out by reach sin; its
    // jamb end's inner corner stands off the jamb by that much at the angle its inner face clears `depth`.
    local gap = up(reach - std.sqrt(reach * reach - depth * depth) + k.swingGap);
    local width = grain * std.floor((room - gap - k.swingGap) / grain);
    // At its stop the arm leans toward the jamb's outer corner; the column stands far enough in from the jamb that the
    // arm's outer side passes that corner. The corner lies `inset` along and `inner + depth` out from the column's axis.
    local lean = std.pi - rad;
    local inset = up((armHalf + k.swingGap + (inner + depth) * std.cos(lean)) / std.sin(lean));
    // The leaf's panel, from its pin: toward the jamb to its jamb end, the rest toward the free end.
    local toJamb = inset + reach - gap;
    local toFree = width - toJamb;
    assert toFree > 0 : 'the leaf reaches past its pin toward its free end; a shorter arm or a narrower angle fits it';
    // The leaf's centre lies toward the jamb from its pin, so turning it near carries it back against the arm.
    assert (toJamb - toFree) / 2 >= inner + thick / 2 : 'the leaf centres clearly off its pin toward the jamb';
    local mid = inner + thick / 2;
    local lower = foot + grain + armHigh;
    local upper = height - headroom - bracketHigh;
    // Pins two grains long, standing up from `a` and down from `b`, so each lies wholly in its own part.
    local pins(name, a, b) = k.hingePins(name, 'y', [0, a + grain, 0], [0, b - grain, 0], slot, grain, 2 * grain);
    local arm(name, top) = k.box(name, armSlot, [std.min(0, -jambSign * (reach + armHalf)), top - armHigh, -armHalf], [std.max(0, -jambSign * (reach + armHalf)), top, armHalf]);
    local bracket(name, bottom) = k.box(name, armSlot, [-bracketHalf, bottom, -bracketHalf], [bracketHalf, bottom + bracketHigh, inner]);
    {
      arm: {
        at: -jambSign * inset,
        out: -mid,
        local pivots = pins('pivot_pin', foot, height),
        pieces: [
          k.turned('column', armSlot, 'y', k.disc(armHalf, foot, height)),
          arm('arm_lower', lower),
          arm('arm_upper', upper),
        ] + pivots,
        motion: k.motion.hinge(pivots, 'near', open),
      },
      leaf: {
        at: -jambSign * (inset + reach),
        out: -mid,
        span: std.sort([jambSign * toJamb, -jambSign * toFree]),
        mid: mid,
        // Each pin stands on its arm's top face, in the bracket above it.
        local riders = pins('leaf_pin', lower, upper + bracketHigh),
        pieces: [bracket('bracket_lower', lower), bracket('bracket_upper', upper)] + riders,
        motion: k.motion.hinge(riders, 'near', open),
      },
    },
}
