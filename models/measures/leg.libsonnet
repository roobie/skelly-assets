// The player leg's measures; `length` is hip joint to sole, so the shoe stands on the ground.
// Worn shells fit around these, so the leg and its gear share one source.
// The lengths, the joints' heights and the hip's place are the UAL doll's joints, and the foot's reach its flesh
// (models/dolls/ual/), so one garment fits both dolls; a girth is its own unless it strays from UAL's past what the eye
// can judge.
local ual = (import 'models/dolls/ual/joints.libsonnet').leg;
{
  // The left hip joint above the hips' foot, the bust's frame; the right one mirrors it across x.
  hip:: ual.hip,
  length: ual.length, thighLength: ual.thighLength, thighWidth: 0.15, thighDepth: 0.19,
  shinWidth: 0.11, shinDepth: 0.12,
  shoeHeight: ual.shoeHeight, shoeWidth: 0.1, toeReach: 0.2408, heelReach: 0.0612,
  thighChamfer: 0.04, shinChamfer: 0.03, shoeChamfer: 0.04, kneeOverlap: 0.02, ankleOverlap: 0.01,
  upperSideInset: 0.004, upperLengthInset: 0.008, upperBackShift: 0.004,
}
