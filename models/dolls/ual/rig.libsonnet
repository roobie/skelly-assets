// The UAL doll's rig: one bone per doll part (models/catalogue/sets/ual.libsonnet), each named, placed and rest-turned
// as the mannequin's skeleton has it (`skeleton`, which the build checks every bone against), so a UAL clip, which turns
// each node from its rest, plays on the doll as it does on the mannequin. The fields are the player's
// (models/dolls/player/rig.libsonnet), which says what each means; `along`, `flexAxis` and the limits are the player's
// joint for joint, but for the shoulder, which rests raised to the T-pose.
local skeleton = import 'models/dolls/ual/skeleton.libsonnet';
local hand = (import 'models/dolls/ual/measures.libsonnet').hand;
// A node's rest turn, the skeleton's, in the model's axes; a sided bone's per side, as UAL's right side is no mirror
// image of its left in its node's turns.
local node(name) = { nodeRotation: skeleton.rotation(name) };
local sidedNode(name) = { sided: true, nodeRotation: { right: skeleton.rotation(name + '_r'), left: skeleton.rotation(name + '_l') } };
local trunk(name, part, parent, limits) = node(name) {
  part: part, parent: parent, pivot: 'origin', along: [0, 1, 0], flexAxis: [1, 0, 0], limits: limits,
};
local clavicle(suffix, out) = trunk('clavicle_' + suffix, 'clavicle_' + suffix, 'spine_03', {
  flex: [-10, 30], twist: [0, 0], abduct: [-15, 15],
}) { along: [out, 0, 0], flexAxis: [0, 0, out] };
local arm(name, parent) = sidedNode(name) { part: name, parent: parent, pivot: 'origin', along: [0, -1, 0], flexAxis: [-1, 0, 0] };
local leg(name, parent) = sidedNode(name) { part: name, parent: parent, pivot: 'origin', along: [0, -1, 0] };
local digit(name, parent, digitName) = arm(name, parent) { flexAxis: [0, 0, -1], digit: digitName };
local fingerCount = std.length(hand.fingers);
local phalanxLimits = [{ flex: [-20, 90], abduct: [-15, 15] }, { flex: [0, 110], abduct: [0, 0] }, { flex: [0, 80], abduct: [0, 0] }];
local fingerBones = {
  [hand.part(hand.fingers[i], k)]: digit(
    hand.part(hand.fingers[i], k),
    if k == 0 then 'hand' else hand.part(hand.fingers[i], k - 1),
    hand.fingers[i],
  ) {
    limits: phalanxLimits[k] { twist: [0, 0] },
    [if k == 0 then 'spread']: 1 - 2 * i / (fingerCount - 1),
  }
  for i in std.range(0, fingerCount - 1)
  for k in std.range(0, hand.phalanges - 1)
};
local thumbLimits = [{ flex: [-10, 60], twist: [0, 70], abduct: [-60, 25] }, { flex: [-10, 60], twist: [0, 0], abduct: [0, 0] }, { flex: [0, 80], twist: [0, 0], abduct: [0, 0] }];
local thumbBones = {
  [hand.thumbPart(k)]: digit(hand.thumbPart(k), if k == 0 then 'hand' else hand.thumbPart(k - 1), 'thumb') {
    limits: thumbLimits[k],
  }
  for k in std.range(0, hand.thumbBones - 1)
};
{
  id: 'ual',
  revision: 1,
  root: 'pelvis',
  reference: 'left',
  skeleton: skeleton.bones,
  bones: {
    pelvis: trunk('pelvis', 'pelvis', null, { flex: [-90, 90], twist: [-30, 30], abduct: [-15, 15] }),
    // The player's one spine joint is three here, each taking a third of its range.
    spine_01: trunk('spine_01', 'spine_01', 'pelvis', { flex: [-10, 20], twist: [-25, 25], abduct: [-12, 12] }),
    spine_02: trunk('spine_02', 'spine_02', 'spine_01', { flex: [-10, 20], twist: [-25, 25], abduct: [-12, 12] }),
    spine_03: trunk('spine_03', 'spine_03', 'spine_02', { flex: [-10, 20], twist: [-30, 30], abduct: [-11, 11] }),
    // A clavicle runs out to its shoulder and flexes about the axis that lifts it, positive raising the shoulder; it
    // draws the shoulder forward and back a little about the third axis.
    clavicle_l: clavicle('l', 1),
    clavicle_r: clavicle('r', -1),
    neck_01: trunk('neck_01', 'neck_01', 'spine_03', { flex: [-30, 40], twist: [-60, 60], abduct: [-30, 30] }),
    Head: trunk('Head', 'head', 'neck_01', { flex: [-30, 30], twist: [-45, 45], abduct: [-20, 20] }),
    // The arm rests raised level, so it lowers to the side by a right angle and a little across, lifts overhead by
    // less, and swings forward level across the chest and back behind it.
    upperarm: arm('upperarm', { right: 'clavicle_r', left: 'clavicle_l' }) {
      limits: { flex: [-50, 130], twist: [-70, 90], abduct: [-110, 80] },
    },
    lowerarm: arm('lowerarm', 'upperarm') { pronates: true, limits: { flex: [0, 150], twist: [-90, 90], abduct: [0, 0] } },
    // The pole is in the doll's frame, which the arm's rest turn does not turn: the elbow down and out, as an arm
    // reaching in front of the body carries it.
    hand: arm('hand', 'lowerarm') {
      flexAxis: [0, 0, -1],
      reach: { pole: [0.5, -1, -0.3] },
      limits: { flex: [-80, 85], twist: [0, 0], abduct: [-45, 25] },
    },
    thigh: leg('thigh', 'pelvis') { flexAxis: [-1, 0, 0], limits: { flex: [-20, 120], twist: [-40, 40], abduct: [-20, 50] } },
    calf: leg('calf', 'thigh') { flexAxis: [1, 0, 0], limits: { flex: [0, 140], twist: [0, 0], abduct: [0, 0] } },
    foot: leg('foot', 'calf') {
      along: [0, 0, 1],
      flexAxis: [1, 0, 0],
      reach: { pole: [0, 0, 1] },
      limits: { flex: [-30, 45], twist: [-10, 10], abduct: [-20, 20] },
    },
    // The toes bend up off the ground further than down.
    ball: leg('ball', 'foot') { along: [0, 0, 1], flexAxis: [1, 0, 0], limits: { flex: [-60, 30], twist: [0, 0], abduct: [0, 0] } },
  } + thumbBones + fingerBones,
}
