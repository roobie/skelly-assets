// How the player's arm hangs at rest: swung out from its shoulder joint, about the figure's z, by the least angle that
// stands it `clearance` off every tier of the trunk below the armpit. The trunk's joints are the UAL doll's, whose
// shoulders sit nearer the centre line than the trunk's girth lets an arm hang straight past; the swing follows any
// change to the trunk's or the arm's measures, so the arm never sinks into the hips or ribs it hangs beside. The doll
// rests its arm at this angle (models/dolls/player/doll.libsonnet), and what is built of the player's figure hangs its
// arms the same way.
local bust = import 'models/measures/bust.libsonnet';
local arm = import 'models/measures/arm.libsonnet';
local girdle = (import 'models/girdle.libsonnet')(bust);

// How far the arm's inner face stands off the trunk: more than a voxel, so their skins never meet in one, and room for
// a sleeveless shell of the under layer between them (worn-fit.libsonnet asserts it), while the arm still hangs as near
// the body as a resting arm does.
local clearance = 0.01;
// The arm's half-width across x `depth` below the shoulder joint along it, the hand's palm facing the thigh.
local halfWidthAt(depth) =
  if depth <= arm.upperLength then arm.upperWidth / 2
  else if depth <= arm.upperLength + arm.foreLength then arm.foreWidth / 2
  else arm.palmThickness / 2;
// Each tier's outer top corner, [x, y] above the hips' foot: an arm swung out leaves the tier's side further below
// it, so the corner is where the tier comes nearest.
local chestFoot = bust.pelvisHeight + bust.waistHeight + bust.ribHeight;
local corners = [
  [bust.pelvisWidth / 2, bust.pelvisHeight],
  [bust.waistWidth / 2, bust.pelvisHeight + bust.waistHeight],
  [bust.ribWidth / 2, chestFoot],
  [bust.chestWidth / 2 * bust.chestLowShare, chestFoot + bust.chestHeight * bust.armpit],
];
// The least swing, in radians, that stands the arm's axis its half-width and the clearance off `corner`: swung by θ,
// the axis lies a cos θ + b sin θ from a corner `a` inside the joint and `b` below it.
local least(corner) =
  local a = girdle.deltoid.x - corner[0], b = girdle.deltoid.y - corner[1];
  assert a > 0 : 'the trunk at %g is wider than the shoulder joints' % corner[1];
  local r = std.sqrt(a * a + b * b);
  std.max(0, std.atan(b / a) - std.acos((halfWidthAt(b) + clearance) / r));
local swing = std.foldl(std.max, [least(corner) for corner in corners], 0);
{
  clearance: clearance,
  // The swing in degrees, out from the trunk on either side.
  degrees: swing * 180 / std.pi,
  // The direction the arm hangs in from the shoulder joint on the figure's `side`, 1 its left.
  down(side): [side * std.sin(swing), -std.cos(swing), 0],
  // How far out from the centre line the hanging hand's inner face stands at the wrist, where the swung arm brings the
  // hand nearest the thigh.
  handInner: girdle.deltoid.x + std.sin(swing) * (arm.upperLength + arm.foreLength) - arm.palmThickness / 2,
}
