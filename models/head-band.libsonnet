// The band a strap makes round the player bust's hair, derived from the bust's measures so it follows the head when they
// change. Worn gear straps (models/catalogue/sets/head-gear.libsonnet, equipment.libsonnet) take their outline and
// height from here. Plans are in the worn frame, as (z, x) corners for a y prism: the face toward +z, the wearer's left
// at +x, counterclockwise.
local bust = import 'models/measures/bust.libsonnet';

local sides = 24;
local step = 360 / sides;
local rad(degrees) = degrees * std.pi / 180;
local shape(t) = (if t < 0 then -1 else 1) * std.pow(std.abs(t), 2 / bust.facePower);
// Corners sit half a step off the axes, so an edge is centred on each axis and an anchor on that edge reads the
// axis's extent; the chord there stands a little inside the curve, which this undoes.
local chord = shape(std.cos(rad(step / 2)));

// The hair's plan where the fringe, the dome and the back hair make the surface at strap height: the skull's half
// extents and the hair on them, a superellipse of the bust's own exponent.
local hairX = bust.headWidth / 2 + bust.hairThickness;
local hairZ = bust.headDepth / 2 + bust.hairThickness;

local crown = bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight + bust.neckHeight;
local hairLine = crown + bust.headHeight - bust.hairCover;
local frame = crown + bust.neckOverlap + bust.headFrameRise;
local backHairStart = 0.003;
local sideFullTop = 0.013;

{
  // What a check of the built straps (tools/strap-fit.mjs) needs: the head frame's height in the bust model, and how far
  // above it the game wears each band-fitted gear model, by model id.
  frame: frame,
  wornAt: { night_vision_goggles: 0.04, headlamp: 0.055 },

  // The hair's plan swelled by `out`, as corners in the worn frame.
  swelled(out):: [
    [(hairZ + out) / chord * shape(std.cos(rad((i + 0.5) * step))), (hairX + out) / chord * shape(std.sin(rad((i + 0.5) * step)))]
    for i in std.range(0, sides - 1)
  ],

  // The band's inner and outer outlines for a strap of thickness `wall`. The head is voxelised at `bust.voxelGrain`, so
  // where the plan meets an axis its drawn surface lies up to half a grain outside the plan. The strap is voxelised too,
  // so each of its faces snaps by up to a voxel. The inner face stands a grain and a wall off the plan, halved: clear of
  // the drawn surface with the snap to spare, and within a wall of it. That is the one gap every face shares.
  outlines(wall):: {
    local gap = (bust.voxelGrain + wall) / 2,
    inner: $.swelled(gap),
    outer: $.swelled(gap + wall),
  },

  // The band's edge nearest each direction round it: edges are numbered from the face toward the wearer's left, so
  // the face is edge `sides - 1`, the left `sides / 4 - 1`, the back `sides / 2 - 1` and the right `3 * sides / 4 - 1`.
  edges:: { front: sides - 1, left: sides / 4 - 1, back: sides / 2 - 1, right: 3 * sides / 4 - 1 },

  // A plan turned half round about y, as gear authored facing -z needs it.
  turnedAround(plan):: [[-point[0], -point[1]] for point in plan],

  // The strap's lowest and highest points in a gear model whose origin the game wears `at` above the head frame. The
  // back hair starts a little over the hairline and the sides keep their full width a little further up, so a strap
  // between the two rests on the hair all round.
  height(at):: { bottom: hairLine + backHairStart - frame - at, top: hairLine + sideFullTop - frame - at },
}
