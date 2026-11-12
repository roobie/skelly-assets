// The hand's layout from the arm's measures: where each finger sits across the knuckles, how long each phalanx and
// thumb bone is and what its part and bone are called, so the doll (models/catalogue/sets/avatar.libsonnet), its rig
// (models/poses/rig.libsonnet) and its gloves (packages/thing-authoring-tool/worn-fit.libsonnet) agree on one hand.
local arm = import 'arm.libsonnet';
local halfPalm = arm.palmWidth / 2;
local span = halfPalm * (1 + arm.fingerFrontShare);
local count = std.length(arm.fingers);
local width = (span - (count - 1) * arm.fingerGap) / count;
local phalanges = std.length(arm.phalanxShares);
{
  fingers: arm.fingers,
  phalanges: phalanges,
  width: width,
  // The finger's centre across the palm, the index at the thumb's side.
  centre(i):: halfPalm * arm.fingerFrontShare - i * (width + arm.fingerGap) - width / 2,
  // A finger's knuckle on the palm, from the wrist in the arm's frame (thickness, along, across); and the thumb's root.
  knuckle(i):: [arm.knuckleVolar, -arm.palmLength + arm.knuckleBack[i], self.centre(i)],
  thumbRoot:: [arm.thumbVolar, -arm.palmLength * arm.thumbRootShare, halfPalm - arm.thumbInset],
  length(i, k):: arm.fingerLength * arm.fingerShares[i] * arm.phalanxShares[k],
  // The knuckle phalanx carries the finger's name and the ones beyond count on from 2, a shape the shell id rule
  // (packages/thing-authoring-tool/catalogue.ts's row id) allows; the thumb's bones are `thumb`, `thumb2`, `thumb3`
  // likewise, the metacarpal first.
  part(finger, k):: finger + (if k == 0 then '' else std.toString(k + 1)),
  thumbBones: std.length(arm.thumbShares),
  thumbPart(k):: self.part('thumb', k),
  thumbLength(k):: arm.thumbLength * arm.thumbShares[k],
}
