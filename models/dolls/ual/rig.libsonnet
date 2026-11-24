// The UAL doll's rig: one bone per doll part (models/catalogue/sets/ual.libsonnet), each named, placed and rest-turned
// as the mannequin's skeleton has it (`skeleton`, which the build checks every bone against), so a UAL clip, which turns
// each node from its rest, plays on the doll as it does on the mannequin. The fields are the player's
// (models/dolls/player/rig.libsonnet), which says what each means; `along` and `flexAxis` are the player's joint for
// joint, and so are the limits (models/dolls/joints.libsonnet) but where UAL's joints are not the player's: the spine,
// split in three, which shares the player's range out, the clavicles, the shoulder, which rests raised to the T-pose,
// and the toes.
local joints = import 'models/dolls/joints.libsonnet';
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
// A digit bone runs as the skeleton's does, toward its next joint; a thumb bone's run is in the thumb's own frame,
// which the doll rests turned along the skeleton's thumb.
local digit(name, parent, digitName) = arm(name, parent) { flexAxis: [0, 0, -1], digit: digitName };
// The spine is three joints here, each taking a third of the whole spine's range.
local spineThird = { [axis]: [end / 3 for end in joints.spine[axis]] for axis in std.objectFields(joints.spine) };
local fingerCount = std.length(hand.fingers);
local fingerBones = {
  [hand.part(hand.fingers[i], k)]: digit(
    hand.part(hand.fingers[i], k),
    if k == 0 then 'hand' else hand.part(hand.fingers[i], k - 1),
    hand.fingers[i],
  ) {
    along: hand.tail(i, k),
    limits: joints.phalanges[k] { twist: [0, 0] },
    [if k == 0 then 'spread']: 1 - 2 * i / (fingerCount - 1),
  }
  for i in std.range(0, fingerCount - 1)
  for k in std.range(0, hand.phalanges - 1)
};
local thumbBones = {
  [hand.thumbPart(k)]: digit(hand.thumbPart(k), if k == 0 then 'hand' else hand.thumbPart(k - 1), 'thumb') {
    along: hand.thumbTail(k),
    limits: joints.thumb[k],
  }
  for k in std.range(0, hand.thumbBones - 1)
};
{
  id: 'ual',
  revision: 2,
  root: 'pelvis',
  reference: 'left',
  skeleton: skeleton.bones,
  bones: {
    pelvis: trunk('pelvis', 'pelvis', null, joints.pelvis),
    spine_01: trunk('spine_01', 'spine_01', 'pelvis', spineThird),
    spine_02: trunk('spine_02', 'spine_02', 'spine_01', spineThird),
    spine_03: trunk('spine_03', 'spine_03', 'spine_02', spineThird),
    // A clavicle runs out to its shoulder and flexes about the axis that lifts it, positive raising the shoulder; it
    // draws the shoulder forward and back a little about the third axis.
    clavicle_l: clavicle('l', 1),
    clavicle_r: clavicle('r', -1),
    neck_01: trunk('neck_01', 'neck_01', 'spine_03', joints.neck),
    Head: trunk('Head', 'head', 'neck_01', joints.head),
    // The arm rests raised level, so it lowers to the side by a right angle and a little across, lifts overhead by
    // less, and swings forward level across the chest and back behind it.
    upperarm: arm('upperarm', { right: 'clavicle_r', left: 'clavicle_l' }) {
      limits: { flex: [-50, 130], twist: [-70, 90], abduct: [-110, 80] },
    },
    lowerarm: arm('lowerarm', 'upperarm') { pronates: true, limits: joints.forearm },
    hand: arm('hand', 'lowerarm') { flexAxis: [0, 0, -1], reach: { pole: joints.poles.hand }, limits: joints.wrist },
    thigh: leg('thigh', 'pelvis') { flexAxis: [-1, 0, 0], limits: joints.thigh },
    calf: leg('calf', 'thigh') { flexAxis: [1, 0, 0], limits: joints.knee },
    foot: leg('foot', 'calf') { along: [0, 0, 1], flexAxis: [1, 0, 0], reach: { pole: joints.poles.foot }, limits: joints.ankle },
    ball: leg('ball', 'foot') { along: [0, 0, 1], flexAxis: [1, 0, 0], limits: joints.ball },
  } + thumbBones + fingerBones,
}
