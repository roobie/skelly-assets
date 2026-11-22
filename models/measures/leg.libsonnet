// The player leg's measures; `length` is hip joint to sole, so the shoe stands on the ground.
// Worn shells fit around these, so the leg and its gear share one source.
// The lengths, the joints' places, the ball's too, the girths and the foot's reach are the UAL doll's
// (models/dolls/ual/joints.libsonnet), so one garment fits both dolls.
local ual = (import 'models/dolls/ual/joints.libsonnet').leg;
local origins = ual.origins;
local sub(a, b) = [a[i] - b[i] for i in [0, 1, 2]];
local plan(v) = [v[0] / 2, 0, v[2] / 2];
local thighBone = sub(origins.shin, origins.thigh), shinBone = sub(origins.foot, origins.shin);
{
  // The left hip joint above the hips' foot, the bust's frame; the right one mirrors it across x.
  hip:: ual.hip,
  // The joint lies inside the pelvis, so the thigh's flesh ends just inside the hips' foot rather than at the joint,
  // where it would break out through the pelvis's rounded foot.
  hipsOverlap:: 0.02,
  thighTop: self.hipsOverlap - ual.hip[1],
  length: ual.length, thighLength: ual.thighLength, shoeHeight: ual.shoeHeight,
  origins: origins,
  ballJoint: ual.ballJoint,
  // Each bone from its own joint to the next, in its part's frame: where the part's socket for the next part stands.
  thighBone:: thighBone,
  shinBone:: shinBone,
  footBone:: sub(ual.ballJoint, origins.foot),
  // Where each segment's flesh stands across the plan in its part's frame, as the leg family draws it: halfway along
  // its bone. A piece worn on the segment stands about the same line.
  thighAxis:: plan(thighBone),
  shinAxis:: plan(shinBone),
  thighWidth: ual.thighWidth, thighDepth: ual.thighDepth,
  shinWidth: ual.shinWidth, shinDepth: ual.shinDepth,
  shoeWidth: ual.shoeWidth, toeReach: ual.toeReach, heelReach: ual.heelReach,
  thighChamfer: 0.04, shinChamfer: 0.03, shoeChamfer: 0.04, kneeOverlap: 0.02, ankleOverlap: 0.01,
  upperSideInset: 0.004, upperLengthInset: 0.008, upperBackShift: 0.004,
}
