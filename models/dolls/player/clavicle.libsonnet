// How far the player's clavicle carries the shoulder. A long gun's stock sits in the pocket inside the shoulder, and a
// body that cannot bring that shoulder forward has to turn the whole chest to put it behind the gun, so the range is
// set by how far forward the shoulder joint travels, `reach`, and the protraction that takes it there follows from where
// the shoulder lies off the clavicle's joint. The turn is about the vertical through that joint, so the shoulder sweeps
// round it: it comes forward and out at once, and no turn brings it further forward than straight ahead of the joint.
local bust = import 'models/measures/bust.libsonnet';
local girdle = (import 'models/girdle.libsonnet')(bust);

local reach = 0.10;
// The left shoulder joint in plan from the left clavicle's joint: `out` along x, and `back` behind it along -z.
local clavicle = bust.joints.clavicle;
local out = girdle.deltoid.x - clavicle[0], back = clavicle[2] - girdle.deltoid.z;
local r = std.sqrt(out * out + back * back);
local behind = std.atan2(back, out);
assert reach <= r * (1 + std.sin(behind)) : 'no turn of the clavicle brings the shoulder %g forward' % reach;
local protraction = (behind + std.asin(reach / r - std.sin(behind))) * 180 / std.pi;
{
  reach: reach,
  // The joint's limits for the rig (models/dolls/player/rig.libsonnet): flex brings the shoulder forward and abduction
  // lifts it. Retraction and the shrug are small: no pose asks for them yet, and the clavicle turns its girdle about a
  // joint by the neck, so lifting the shoulder opens a seam under the clavicle at its cut off the chest, and pulling it
  // back drives the girdle's inner end into the chest's.
  limits: { flex: [-10, protraction], twist: [0, 0], abduct: [-5, 5] },
}
