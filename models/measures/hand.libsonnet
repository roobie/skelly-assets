// The hand's layout from the arm's measures: where each finger sits across the knuckles, how long each phalanx and
// thumb bone is and what its part and bone are called, so the doll (models/catalogue/sets/avatar.libsonnet), its rig
// (models/dolls/player/rig.libsonnet) and its gloves (packages/thing-authoring-tool/worn-fit.libsonnet) agree on one hand.
// The knuckles, the thumb's root, the digit bones' lengths and their names are the UAL doll's
// (models/dolls/ual/joints.libsonnet), so a glove's piece names and fits the same phalanx on both dolls; the player's
// digits hang straight down from their roots, where UAL's run as its skeleton's do.
local arm = import 'arm.libsonnet';
local ual = (import 'models/dolls/ual/joints.libsonnet').hand;
local halfPalm = arm.palmWidth / 2;
local span = halfPalm * (1 + arm.fingerFrontShare);
local count = std.length(ual.fingers);
{
  fingers: ual.fingers,
  phalanges: ual.phalanges,
  // A finger's width across the palm, the fingers and their gaps spanning the palm's knuckle row.
  width: (span - (count - 1) * arm.fingerGap) / count,
  // Each finger's knuckle on the palm, the index first, from the wrist in the arm's frame (thickness, along, across);
  // and the thumb's root.
  knuckles:: ual.knuckles,
  knuckle(i):: ual.knuckle(i),
  thumbRoot:: ual.thumbRoot,
  length(i, k):: ual.length(i, k),
  // Parts and bones are named as UAL's skeleton names them, `<finger>_01` at the knuckle and `thumb_01` at the root.
  part(finger, k):: ual.part(finger, k),
  thumbBones: ual.thumbBones,
  thumbPart(k):: ual.thumbPart(k),
  thumbLength(k):: ual.thumbLength(k),
  // Where a game's fist closes on a held item's grip point, as a share of the palm's length from the wrist: the arm's
  // grip anchor, and the palm seat of the doll's melee hands, so a wield clip baked on the doll seats its weapon where
  // the game's figure holds it. The doll's own power grip (models/dolls/player/rig.libsonnet, the hand's `grip`) seats further from the wrist.
  fistShare: 0.5,
}
