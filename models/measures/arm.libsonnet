// The player arm's measures; shoulder to fingertip reaches mid-thigh on the standing figure.
// Worn shells fit around these, so the arm and its gear share one source.
// The lengths, the joints' places, the knuckles, the thumb's root and every digit bone's length are the UAL doll's
// joints, and so are the girths that strayed from UAL's past what the eye can judge (models/dolls/ual/joints.libsonnet),
// so one glove, sleeve or bracer fits both dolls; the chamfers, overlaps and shares that shape the flesh rather than
// size it are the player's own.
local ual = (import 'models/dolls/ual/joints.libsonnet').arm;
local sub(a, b) = [a[i] - b[i] for i in [0, 1, 2]];
local plan(v) = [v[0] / 2, 0, v[2] / 2];
local upperBone = sub(ual.origins.fore, ual.origins.upper), foreBone = sub(ual.origins.palm, ual.origins.fore);
ual {
  // Each bone from its own joint to the next, in its part's frame: where the part's socket for the next part stands.
  upperBone:: upperBone,
  foreBone:: foreBone,
  // Where each segment's flesh stands across the arm in its part's frame, as the arm family draws it: halfway along its
  // bone. A piece worn on the segment stands about the same line.
  upperAxis:: plan(upperBone),
  foreAxis:: plan(foreBone),
  seamOverlap: 0.01, handOverlap: 0.005, armChamfer: 0.03, wristChamfer: 0.02,
  foreDepthExtra: 0.004, wristDepthExtra: 0.006, wristShare: 0.45,
  fingerThicknessShare: 0.8, thumbThicknessShare: 0.7, fingerFrontShare: 0.9, thumbProjection: 0.014,
  // A leaning digit is drawn as upright steps, and a glove's digit as the same steps; this is the most one step stands
  // across from the last, fine enough that the stair reads as a slope.
  digitLeanStep: 0.005,
}
