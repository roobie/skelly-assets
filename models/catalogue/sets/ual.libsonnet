// The UAL doll's parts (models/dolls/ual/doll.libsonnet), one per bone of the mannequin's skeleton it moves with, named
// as the skeleton names it, so a UAL clip turns each part by its own bone. Each part is drawn about its bone's head, and
// each joint's socket is that head in the part above, so the assembled doll stands on the skeleton's joints exactly.
local measures = import 'models/dolls/ual/measures.libsonnet';
local bust = measures.bust;
local arm = measures.arm;
local leg = measures.leg;
local hand = measures.hand;
local skeleton = import 'models/dolls/ual/skeleton.libsonnet';
local girdle = (import 'models/girdle.libsonnet')(bust);
local band = import 'models/head-band.libsonnet';
local playerBust = import 'models/measures/bust.libsonnet';
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local sub = (import 'packages/thing-authoring-tool/compound.libsonnet').vec.sub;
// The two dolls are drawn at one grain and in one skin, so they stand side by side alike.
local grain = playerBust.voxelGrain;
local skin = 'body-skin-player';
local underwear = 'cloth-pants-player';
local taxonomy = { category: 'body-parts', tags: { material: ['flesh'] } };
// A joint: the socket on the part above, at the joint, faces down and the pin at the part's own origin faces up, so the
// part below meets it unturned whichever way the bone runs.
local jointSocket(id, pos) = { id: id, mount: 'assembly-joint', gender: 'female', pos: pos, normal: [0, -1, 0], up: [0, 0, 1], required: true };
local jointPin(id) = { id: id, mount: 'assembly-joint', gender: 'male', pos: [0, 0, 0], normal: [0, 1, 0], up: [0, 0, 1], required: true };
// A part's sockets for the parts hanging from it, each at the child's joint in the part's frame.
local sockets(origins, of, children) = [jointSocket(child, sub(origins[child], origins[of])) for child in children];
local connection(from, to) = { from: from + '.' + to, to: to + '.' + to };

// ---- the bust ----

// The bust's parts by the skeleton's bone each moves with, and the family segment that draws it.
local bustSegments = {
  pelvis: 'pelvis', spine_01: 'waist', spine_02: 'ribs', spine_03: 'chest',
  clavicle_l: 'clavicle_l', clavicle_r: 'clavicle_r', neck_01: 'neck', head: 'head',
};
local bustOrigins = { [part]: bust.origins[bustSegments[part]] for part in std.objectFields(bustSegments) };
local bustChildren = {
  pelvis: ['spine_01'], spine_01: ['spine_02'], spine_02: ['spine_03'],
  spine_03: ['clavicle_l', 'clavicle_r', 'neck_01'], clavicle_l: [], clavicle_r: [], neck_01: ['head'], head: [],
};
local bustPart(id, massKg, finish) = {
  id: id,
  family: 'bust',
  massKg: massKg,
  params: params(girdle.bustParams { segment: bustSegments[id], hairRing: band.hairRingOf(bust, grain) }),
  finish: finish,
  ports: (if id == 'pelvis' then [] else [jointPin(id)]) + sockets(bustOrigins, id, bustChildren[id]),
};
local skinned = { skin: skin };
// A point of the skeleton's in a bust part's frame.
local onBust(part, bone) = { part: part, at: sub(sub(skeleton.head(bone), bust.base), bustOrigins[part]) };

// ---- the arm ----

local fingerCount = std.length(hand.fingers);
local armOrigins = arm.origins;
local armPart(id, massKg, segment, ports) = {
  id: id,
  family: 'avatarArm',
  massKg: massKg,
  params: params(arm + segment),
  finish: skinned,
  ports: ports,
};
// Each digit bone hangs from the one before it, the first from the hand, its socket the skeleton's next joint.
local phalanx(i, k) = local finger = hand.fingers[i]; armPart(
  hand.part(finger, k), 0.15 / (fingerCount * hand.phalanges),
  { segment: 'finger', finger: finger, phalanx: k, tail: hand.tail(i, k) },
  [jointPin(hand.part(finger, k))]
  + (if k + 1 < hand.phalanges then [jointSocket(hand.part(finger, k + 1), hand.tail(i, k))] else []),
);
local thumbBone(k) = armPart(
  hand.thumbPart(k), 0.05 / hand.thumbBones,
  { segment: 'thumb', phalanx: k, tail: hand.thumbTail(k) },
  [jointPin(hand.thumbPart(k))]
  + (if k + 1 < hand.thumbBones then [jointSocket(hand.thumbPart(k + 1), hand.thumbTail(k))] else []),
);
local digitConnection(parts) = [
  connection(if k == 0 then 'hand' else parts[k - 1], parts[k])
  for k in std.range(0, std.length(parts) - 1)
];

// ---- the leg ----

local legOrigins = leg.origins { ball: leg.ballJoint };
local legSegments = { thigh: 'thigh', calf: 'shin', foot: 'foot', ball: 'ball' };
local legOrigin(id) = legOrigins[legSegments[id]];
local legPart(id, massKg, ports) = {
  id: id,
  family: 'avatarLeg',
  massKg: massKg,
  params: params(leg { segment: legSegments[id] }),
  finish: skinned,
  ports: ports,
};
local legSocket(of, child) = jointSocket(child, sub(legOrigin(child), legOrigin(of)));

[
  {
    id: 'ual_bust',
    title: 'UAL bust',
    exportMass: 'parts',
    taxonomy: taxonomy,
    voxelGrain: grain,
    // The pelvis is the root, so the bust's frame is the pelvis bone's, at its head.
    parts: [
      bustPart('pelvis', 7, { underwear: underwear }),
      bustPart('spine_01', 8, skinned),
      bustPart('spine_02', 8, skinned),
      bustPart('spine_03', 7, skinned),
      bustPart('clavicle_l', 1, skinned),
      bustPart('clavicle_r', 1, skinned),
      bustPart('neck_01', 1, skinned),
      bustPart('head', 5, { skin: skin, hair: 'body-hair', eye: 'body-eye', white: 'body-eye-white', mouth: 'body-mouth' }),
    ],
    connections: [
      connection(part, child)
      for part in std.objectFields(bustChildren)
      for child in bustChildren[part]
    ],
    // Each limb hangs at its bone's head, on the part it moves with; the brow, where the hair meets the face, is where
    // a hat's brim sits (models/dolls/ual/doll.libsonnet).
    anchors: {
      brow: { part: 'head', solid: 'hair-0', fraction: [0.5, 0, 0.5] },
      eye_left: { part: 'head', solid: 'left-eye', fraction: [0.5, 0.5, 1] },
      eye_right: { part: 'head', solid: 'right-eye', fraction: [0.5, 0.5, 1] },
      shoulder_left: onBust('clavicle_l', 'upperarm_l'),
      shoulder_right: onBust('clavicle_r', 'upperarm_r'),
      hip_left: onBust('pelvis', 'thigh_l'),
      hip_right: onBust('pelvis', 'thigh_r'),
    },
  },
  {
    id: 'ual_arm',
    title: 'UAL arm',
    exportMass: 'parts',
    taxonomy: taxonomy,
    voxelGrain: grain,
    // The figure's right arm hanging, the palm's face toward +x and the thumb forward; the doll rests it turned into
    // the T-pose the skeleton stands in.
    parts: [
      armPart('upperarm', 1.9, { segment: 'upper' }, [jointSocket('lowerarm', armOrigins.fore)]),
      armPart('lowerarm', 1.1, { segment: 'fore' }, [
        jointPin('lowerarm'),
        jointSocket('hand', sub(armOrigins.palm, armOrigins.fore)),
      ]),
      armPart('hand', 0.3, { segment: 'palm' }, [jointPin('hand'), jointSocket(hand.thumbPart(0), hand.thumbRoot)] + [
        jointSocket(hand.part(hand.fingers[i], 0), hand.knuckle(i))
        for i in std.range(0, fingerCount - 1)
      ]),
    ] + [thumbBone(k) for k in std.range(0, hand.thumbBones - 1)]
      + [phalanx(i, k) for i in std.range(0, fingerCount - 1) for k in std.range(0, hand.phalanges - 1)],
    connections: [connection('upperarm', 'lowerarm'), connection('lowerarm', 'hand')]
      + digitConnection([hand.thumbPart(k) for k in std.range(0, hand.thumbBones - 1)])
      + std.flattenArrays([
        digitConnection([hand.part(hand.fingers[i], k) for k in std.range(0, hand.phalanges - 1)])
        for i in std.range(0, fingerCount - 1)
      ]),
    anchors: {
      shoulder: { part: 'upperarm', at: [0, 0, 0] },
    },
  },
  {
    id: 'ual_leg',
    title: 'UAL leg',
    exportMass: 'parts',
    taxonomy: taxonomy,
    voxelGrain: grain,
    // The figure's right leg; the ball, the toes, bends off the foot at the ball's joint.
    parts: [
      legPart('thigh', 7, [legSocket('thigh', 'calf')]),
      legPart('calf', 3, [jointPin('calf'), legSocket('calf', 'foot')]),
      legPart('foot', 0.8, [jointPin('foot'), legSocket('foot', 'ball')]),
      legPart('ball', 0.2, [jointPin('ball')]),
    ],
    connections: [connection('thigh', 'calf'), connection('calf', 'foot'), connection('foot', 'ball')],
    anchors: {
      hip: { part: 'thigh', at: [0, 0, 0] },
    },
  },
]
