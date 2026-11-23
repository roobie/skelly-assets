// The doll's rig: one bone per doll part (models/catalogue/sets/avatar.libsonnet), named as mobgen names the same bone,
// so a pose, a clip frame and a game read the doll and a humanoid mob alike. Why the doll shares mobgen's bone model is
// in docs/decisions/0010-pose-tool.md.
//
// A pose file names the rig's `id` and `revision`, and is refused by any other. Raise the revision when a change gives
// a pose already written another meaning: a bone renamed or removed, a pivot, a flex axis, the order a joint's turns
// compose in or the reference side changed. Widening or narrowing a limit keeps it, since a pose file states its
// angles and a held angle shows in its report.
//
// A sided bone's `parent` takes the side's suffix when the parent is sided too; a limb hanging from a paired bust part,
// a bone of its own on each side, names one per side instead, `{ right, left }`.
//
// `pivot` is `origin`, the part's own origin, which the avatar draws at the joint it hangs from, or `{ anchor }`, a
// bust anchor. `along` is the bone's rest direction, used to find its tail when it has no single child bone. Both
// `along` and `flexAxis` are written in the part's own frame, as its model hangs, so a limb that its doll record
// turns at rest (`turn`, models/dolls/player/doll.libsonnet) is written once, for both sides.
// `flexAxis` is the joint frame's x: positive flex bends the way the joint works most (a limb swings forward, an elbow
// and a knee close, toes point down, the trunk and head bend forward). Twist is about the bone, abduction about the
// remaining axis. Limits are degrees [min, max], written for the `reference` side, the figure's left (+x), where
// positive abduction carries a limb away from the body. The other side mirrors the ranges of the joint axes a mirror
// reverses (a limb's twist and abduction; a finger's flex, which is about the knuckle row, and its twist) and keeps
// the rest, so a pose is mirrored by the `sense` tools/dollRig.mjs gives each bone; a flex axis must lie in the mirror
// plane or along x, while `along` may run any way.
//
// A joint's three turns compose in the joint's own order, each about the axis the earlier turns carried
// (site/kinematics.mjs, `jointRotation`): abduction, then twist, then flex, so a ball joint's twist chooses which way
// its hinge lies, as the shoulder's humeral rotation does. `pronates` puts a bone's twist last, about the bone its flex
// has carried: the forearm's twist is pronation and supination, a roll of the hand distal to the elbow hinge, so a bent
// arm's twist turns the hand where it is instead of swinging the wrist round a cone about the arm's rest line.
//
// `reach` marks a bone whose joint two-bone IK places by turning its parent and grandparent, the middle joint bending
// toward `pole`, a direction in the reference side's axes, unless a pose file gives its own. A pole is in the doll's
// frame, which a limb's site turn does not turn, and the other side's is mirrored across x.
//
// `absorbs` names the bones of the player's mob rig (`clips`, an actor of models/mobs.json) that this bone stands for,
// children folded into it, so the player's clips play on the doll: the doll's one torso part is mobgen's spine and chest.
//
// A finger bone names its `digit` and, at the knuckle, its `spread`, the share of a spread of the hand it takes along
// positive abduction, which carries a finger toward the thumb (1 for the index, -1 for the pinky), so a pose
// file's hand shorthand (site/fingers.mjs) can curl and spread a hand without naming bones. A finger flexes about the
// knuckle row, the axis chosen so positive flex curls it toward the palm.
//
// The thumb hangs beside the palm's front edge, leaning out from the palm and forward as UAL's does
// (models/measures/hand.libsonnet), and its bones flex about the fingers' axis; what sets it apart is its root, the
// only digit joint with all three freedoms, which read as one motion in the joint's order above: abduction swings the
// thumb in the palm's plane, negative across the palm toward the little finger; twist rolls it about its own length,
// positive turning its pad from facing the way the palm faces toward facing the fingers, which is opposition; flex
// then lifts it out of the palm's plane toward the palm side about the hinge the roll has turned, so a lifted thumb
// leans the way its pad faces. Across, roll and lift together bring the pad against a fingertip or over a gripped
// handle; the two joints beyond only bend toward the pad. `presets` names hand shorthands (site/fingers.mjs,
// `handAngles`) a pose file can ask for by name.
//
// `nodeRotation` is the rest rotation of a bone's glTF node, a quaternion [x, y, z, w] of the node's axes in the model's,
// or one per side for a sided bone. The player's joints are nodes at their heads turned by nothing, and a clip's
// quaternion turns that node about its head. A doll whose nodes are rest-turned states each bone's own, and its clips
// must then be baked as each node's local rotation, since today's bakes turn every bone on the model's axes, which only
// an unturned node shares.
local joints = import 'models/dolls/joints.libsonnet';
local bust = import 'models/measures/bust.libsonnet';
local armRest = import 'models/arm-rest.libsonnet';
local clavicle = import 'models/dolls/player/clavicle.libsonnet';
local unturned = [0, 0, 0, 1];
local trunk = { nodeRotation: unturned };
local arm = { nodeRotation: unturned, sided: true, parent: 'spine', along: [0, -1, 0], flexAxis: [-1, 0, 0] };
local leg = { nodeRotation: unturned, sided: true, parent: 'pelvis', along: [0, -1, 0] };
local hand = import 'models/measures/hand.libsonnet';
local digit(name) = arm { pivot: 'origin', flexAxis: [0, 0, -1], digit: name };
local fingerCount = std.length(hand.fingers);
local fingerBones = {
  [hand.part(hand.fingers[i], k)]: digit(hand.fingers[i]) {
    part: hand.part(hand.fingers[i], k),
    parent: if k == 0 then 'hand' else hand.part(hand.fingers[i], k - 1),
    limits: joints.phalanges[if hand.phalanges == 1 then 0 else std.min(k, 2)] { twist: [0, 0] },
    [if k == 0 then 'spread']: 1 - 2 * i / (fingerCount - 1),
  }
  for i in std.range(0, fingerCount - 1)
  for k in std.range(0, hand.phalanges - 1)
};
local thumbBones = {
  [hand.thumbPart(k)]: digit('thumb') {
    part: hand.thumbPart(k),
    parent: if k == 0 then 'hand' else hand.thumbPart(k - 1),
    along: hand.thumbTail(k),
    limits: joints.thumb[std.min(k, 2)],
  }
  for k in std.range(0, hand.thumbBones - 1)
};
{
  id: 'doll',
  revision: 13,
  root: 'pelvis',
  reference: 'left',
  clips: 'player.1',
  // The eyes, from the head's joint in the head's frame, which a generated frame turns the head to look from.
  eye: bust.eye,
  bones: {
    pelvis: trunk { part: 'pelvis', parent: null, pivot: 'origin', along: [0, 1, 0], flexAxis: [1, 0, 0],
                    limits: joints.pelvis },
    spine: trunk { part: 'torso', parent: 'pelvis', pivot: { anchor: 'spine' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                   absorbs: ['chest'], limits: joints.spine },
    neck: trunk { part: 'neck', parent: 'spine', pivot: { anchor: 'neck' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                  limits: joints.neck },
    head: trunk { part: 'head', parent: 'neck', pivot: { anchor: 'head' }, along: [0, 1, 0], flexAxis: [1, 0, 0],
                  limits: joints.head },
    // The clavicle carries the shoulder forward about the vertical through its joint by the breastbone, so a long gun's
    // stock comes into the shoulder without the chest turning to it (models/dolls/player/clavicle.libsonnet). Its part
    // is drawn as the right girdle, running out along -x.
    clavicle: arm { part: 'clavicle', parent: 'spine', pivot: 'origin', along: [-1, 0, 0], flexAxis: [0, -1, 0],
                    limits: clavicle.limits },
    // The arm rests swung out from the trunk (models/arm-rest.libsonnet), and abduction is measured from that rest, so
    // its range is the arm's from hanging straight, less the swing.
    upperArm: arm { part: 'upper', parent: 'clavicle', pivot: 'origin',
                    limits: { flex: [-50, 170], twist: [-70, 90], abduct: [-30 - armRest.degrees, 170 - armRest.degrees] } },
    forearm: arm { part: 'fore', parent: 'upperArm', pivot: 'origin', pronates: true, limits: joints.forearm },
    // The palm faces the body with the thumb forward, so the wrist flexes about the knuckle row, as the fingers do;
    // about the arm's flex axis a turn would move the hand in the palm's plane.
    // `grip`: where a handle held in a power grip crosses the palm's middle, as a share of its length from the wrist
    // (site/fingers.mjs, `palmSocket`); a hold may seat its item elsewhere. A power grip seats the handle across the
    // palm short of the knuckle crease, where the fingers wrap right round it into a fist and the thumb's first segment
    // comes down onto it (the grip preset's thumb, models/poses/hands.libsonnet); further toward the wrist, where the
    // thumb's root sits, the fingers cannot reach round, and at the crease they only hook it and the palm stands beside
    // it like a paddle. `gripSlant`: how far in degrees the handle turns from square
    // across the palm, its thumb end toward the fingers, so it runs from the index finger's root to the heel of the
    // palm under the little finger. Each finger then reaches the same way round it; held square, as a bar is, the
    // little finger, whose knuckle sits furthest back, stands off a handle the others wrap. Much past a quarter turn
    // the index finger's root comes onto the handle and opens the fist from the other end.
    hand: arm { part: 'palm', parent: 'forearm', pivot: 'origin', flexAxis: [0, 0, -1], reach: { pole: joints.poles.hand }, grip: 0.72, gripSlant: 20,
                limits: joints.wrist },
    thigh: leg { part: 'thigh', parent: 'pelvis', pivot: 'origin', flexAxis: [-1, 0, 0], limits: joints.thigh },
    shin: leg { part: 'shin', parent: 'thigh', pivot: 'origin', flexAxis: [1, 0, 0], limits: joints.knee },
    foot: leg { part: 'foot', parent: 'shin', pivot: 'origin', along: [0, 0, 1], flexAxis: [1, 0, 0], reach: { pole: joints.poles.foot },
                limits: joints.ankle },
    ball: leg { part: 'ball', parent: 'foot', pivot: 'origin', along: [0, 0, 1], flexAxis: [1, 0, 0], limits: joints.ball },
  } + thumbBones + fingerBones,
  presets: import 'models/poses/hands.libsonnet',
}
