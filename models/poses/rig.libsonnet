// The doll's rig: one bone per doll part (models/catalogue/sets/avatar.libsonnet), named as mobgen names the same bone,
// so a pose, a clip frame and a game read the doll and a humanoid mob alike. Why the doll shares mobgen's bone model is
// in docs/decisions/0010-pose-tool.md.
//
// A pose file names the rig's `id` and `revision`, and is refused by any other. Raise the revision when a change gives
// a pose already written another meaning: a bone renamed or removed, a pivot, a flex axis or the reference side changed.
// Widening or narrowing a limit keeps it, since a pose file states its angles and a held angle shows in its report.
//
// `pivot` is `origin`, the part's own origin, which the avatar draws at the joint it hangs from, or `{ anchor }`, a
// bust anchor. `along` is the bone's rest direction, used to find its tail when it has no single child bone.
// `flexAxis` is the joint frame's x: positive flex bends the way the joint works most (a limb swings forward, an elbow
// and a knee close, toes point down, the trunk and head bend forward). Twist is about the bone, abduction about the
// remaining axis. Limits are degrees [min, max], written for the `reference` side, the figure's left (+x), where
// positive abduction carries a limb away from the body. The other side mirrors the ranges of the joint axes that lie
// in the mirror plane (a limb's twist and abduction; a finger's flex, which is about the knuckle row) and keeps the
// axis along x, so a pose is mirrored by the `sense` tools/dollRig.mjs gives each bone.
//
// `reach` marks a bone whose joint two-bone IK places by turning its parent and grandparent, the middle joint bending
// toward `pole`, a direction in the reference side's axes, unless a pose file gives its own.
//
// `absorbs` names the bones of the player's mob rig (`clips`, an actor of models/mobs.json) that this bone stands for,
// children folded into it, so the player's clips play on the doll: the doll's one torso part is mobgen's spine and chest.
//
// `clearance.marginMetres` is how far a garment may stand off or pass into the body before the clearance probe
// (site/clearance.mjs) flags it: the doll's parts and the worn shells are blocky, so their corners meet a few
// millimetres proud of each other at rest, and the margin is what keeps a fitting garment clean.
//
// A finger bone names its `digit` and, at the knuckle, its `spread`, the share of a spread of the hand it takes along
// positive abduction, which carries a finger toward the thumb (1 for the index, -1 for the little finger), so a pose
// file's hand shorthand (site/fingers.mjs) can curl and spread a hand without naming bones. A finger flexes about the
// knuckle row, the axis chosen so positive flex curls it toward the palm. The thumb runs along the palm's front edge,
// in line with the knuckle row, so its own frame differs: its flex axis lies the way the fingers hang, so positive
// flex swings it out of the palm plane toward the palm, and negative abduction carries it across the palm toward the
// little finger; flex then abduction brings its pad to oppose the fingers.
local trunk = { model: 'player_bust' };
local arm = { model: 'player_arm', sided: true, parent: 'spine', along: [0, -1, 0], flexAxis: [-1, 0, 0] };
local leg = { model: 'player_leg', sided: true, parent: 'pelvis', along: [0, -1, 0] };
local hand = import 'models/measures/hand.libsonnet';
local digit(name) = arm { pivot: 'origin', flexAxis: [0, 0, -1], digit: name };
local thumbBone = digit('thumb') { along: [0, 0, 1], flexAxis: [0, -1, 0] };
local fingerCount = std.length(hand.fingers);
// The knuckle hyperextends a little and spreads; the joints beyond it only curl, the middle one furthest.
local phalanxLimits = [{ flex: [-20, 90], abduct: [-15, 15] }, { flex: [0, 110], abduct: [0, 0] }, { flex: [0, 80], abduct: [0, 0] }];
local fingerBones = {
  [hand.part(hand.fingers[i], k)]: digit(hand.fingers[i]) {
    part: hand.part(hand.fingers[i], k),
    parent: if k == 0 then 'hand' else hand.part(hand.fingers[i], k - 1),
    limits: phalanxLimits[if hand.phalanges == 1 then 0 else std.min(k, 2)] { twist: [0, 0] },
    [if k == 0 then 'spread']: 1 - 2 * i / (fingerCount - 1),
  }
  for i in std.range(0, fingerCount - 1)
  for k in std.range(0, hand.phalanges - 1)
};
{
  id: 'doll',
  revision: 2,
  root: 'pelvis',
  reference: 'left',
  clips: 'player.1',
  clearance: { marginMetres: 0.006 },
  bones: {
    pelvis: trunk { part: 'pelvis', parent: null, pivot: 'origin', along: [0, 1, 0], flexAxis: [1, 0, 0],
                    limits: { flex: [-20, 20], twist: [-30, 30], abduct: [-15, 15] } },
    spine: trunk { part: 'torso', parent: 'pelvis', pivot: { anchor: 'spine' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                   absorbs: ['chest'], limits: { flex: [-30, 60], twist: [-80, 80], abduct: [-35, 35] } },
    neck: trunk { part: 'neck', parent: 'spine', pivot: { anchor: 'neck' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                  limits: { flex: [-30, 40], twist: [-60, 60], abduct: [-30, 30] } },
    head: trunk { part: 'head', parent: 'neck', pivot: { anchor: 'head' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                  limits: { flex: [-30, 30], twist: [-45, 45], abduct: [-20, 20] } },
    upperArm: arm { part: 'upper', parent: 'spine', pivot: 'origin',
                    limits: { flex: [-50, 170], twist: [-70, 90], abduct: [-30, 170] } },
    forearm: arm { part: 'fore', parent: 'upperArm', pivot: 'origin',
                   limits: { flex: [0, 150], twist: [-80, 80], abduct: [0, 0] } },
    hand: arm { part: 'palm', parent: 'forearm', pivot: 'origin', reach: { pole: [0.3, 0, -1] },
                limits: { flex: [-70, 80], twist: [0, 0], abduct: [-25, 20] } },
    thumb: thumbBone { part: 'thumb', parent: 'hand', limits: { flex: [-20, 60], twist: [0, 0], abduct: [-80, 20] } },
    thumbTip: thumbBone { part: hand.thumbTip, parent: 'thumb', limits: { flex: [0, 80], twist: [0, 0], abduct: [0, 0] } },
    thigh: leg { part: 'thigh', parent: 'pelvis', pivot: 'origin', flexAxis: [-1, 0, 0],
                 limits: { flex: [-20, 120], twist: [-40, 40], abduct: [-20, 50] } },
    shin: leg { part: 'shin', parent: 'thigh', pivot: 'origin', flexAxis: [1, 0, 0],
                limits: { flex: [0, 140], twist: [0, 0], abduct: [0, 0] } },
    foot: leg { part: 'foot', parent: 'shin', pivot: 'origin', along: [0, 0, 1], flexAxis: [1, 0, 0], reach: { pole: [0, 0, 1] },
                limits: { flex: [-30, 45], twist: [-10, 10], abduct: [-20, 20] } },
  } + fingerBones,
}
