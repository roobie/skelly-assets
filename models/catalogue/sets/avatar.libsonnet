local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local shoulder(side) = { part: 'torso', solid: 'shoulder-' + side, fraction: [0.5, 0.5, 0.5] };
local hip(x) = { part: 'pelvis', solid: 'pelvis', fraction: [x, 0.12, 0.5] };
// Shared finishes keep exposed skin continuous across separately posed parts.
local skin = 'body-skin-player';
local underwear = 'cloth-pants-player';
local arm = import 'models/measures/arm.libsonnet';
local leg = import 'models/measures/leg.libsonnet';
// A limb joint: the socket on the segment above, at the joint, faces down; the pin at the segment's own origin faces
// up, so mated the lower segment hangs straight from the joint.
local jointSocket(id, pos) = { id: id, mount: 'assembly-joint', gender: 'female', pos: pos, normal: [0, -1, 0], up: [0, 0, 1], required: true };
local jointPin(id) = { id: id, mount: 'assembly-joint', gender: 'male', pos: [0, 0, 0], normal: [0, 1, 0], up: [0, 0, 1], required: true };
local armSegment(id, massKg, finish, ports, segment={ segment: id }) = {
  id: id,
  family: 'avatarArm',
  massKg: massKg,
  params: params(arm + segment),
  finish: finish,
  ports: ports,
};
local hand = import 'models/measures/hand.libsonnet';
local fingerCount = std.length(hand.fingers);
// Each phalanx hangs from the one above it, the knuckle phalanx from the palm; the thumb's bones hang likewise from its
// root on the palm's edge.
local phalanx(i, k) = armSegment(
  hand.part(hand.fingers[i], k), 0.15 / (fingerCount * hand.phalanges), { skin: skin },
  [jointPin(hand.part(hand.fingers[i], k))] + (if k + 1 < hand.phalanges then [jointSocket(hand.part(hand.fingers[i], k + 1), [0, -hand.length(i, k), 0])] else []),
  { segment: 'finger', finger: hand.fingers[i], phalanx: k },
);
local phalanxConnection(i, k) = {
  from: (if k == 0 then 'palm' else hand.part(hand.fingers[i], k - 1)) + '.' + hand.part(hand.fingers[i], k),
  to: hand.part(hand.fingers[i], k) + '.' + hand.part(hand.fingers[i], k),
};
local thumbBone(k) = armSegment(
  hand.thumbPart(k), 0.05 / hand.thumbBones, { skin: skin },
  [jointPin(hand.thumbPart(k))] + (if k + 1 < hand.thumbBones then [jointSocket(hand.thumbPart(k + 1), [0, -hand.thumbLength(k), 0])] else []),
  { segment: 'thumb', phalanx: k },
);
local thumbConnection(k) = {
  from: (if k == 0 then 'palm' else hand.thumbPart(k - 1)) + '.' + hand.thumbPart(k),
  to: hand.thumbPart(k) + '.' + hand.thumbPart(k),
};
local legSegment(id, massKg, finish, ports) = {
  id: id,
  family: 'avatarLeg',
  massKg: massKg,
  params: params(leg { segment: id }),
  finish: finish,
  ports: ports,
};
local foot = { skin: skin };
local bust = import 'models/measures/bust.libsonnet';
local bustSegment(id, massKg, finish, ports) = {
  id: id,
  family: 'bust',
  massKg: massKg,
  params: params(bust { segment: id }),
  finish: finish,
  ports: ports,
};
// The head stands on the neck: the socket on the torso faces up and the pin at the head's origin faces down.
local neckSocket(pos) = jointSocket('head', pos) { normal: [0, 1, 0] };
local neckPin = jointPin('head') { normal: [0, -1, 0] };
[
  {
    id: 'player_bust',
    exportMass: 'parts',
    taxonomy: { category: 'body-parts', tags: { material: ['flesh'] } },
    voxelGrain: 0.006,
    // The head is its own part so a stance lifts it about the neck's top while the torso leans; the head mates to
    // the torso there, so the whole stands exactly as one piece would.
    parts: [
      bustSegment('torso', 25, { skin: skin }, [jointSocket('pelvis', [0, 0, 0]), jointSocket('neck', [0, 0, 0])]),
      bustSegment('pelvis', 7, { underwear: underwear }, [jointPin('pelvis')]),
      bustSegment('neck', 1, { skin: skin }, [jointPin('neck'), neckSocket(
        [0, bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight + bust.neckHeight + bust.neckOverlap, 0],
      )]),
      bustSegment('head', 5, { skin: skin, hair: 'body-hair', eye: 'body-eye', white: 'body-eye-white', mouth: 'body-mouth' }, [neckPin]),
    ],
    connections: [
      { from: 'neck.head', to: 'head.head' },
      { from: 'torso.pelvis', to: 'pelvis.pelvis' },
      { from: 'torso.neck', to: 'neck.neck' },
    ],
    // The pivots code poses from: the neck where the torso meets the head, the head's own pivot above it, a
    // shoulder at each deltoid cap's centre and a hip under each side of the pelvis. Left is the figure's left, +x.
    anchors: {
      spine: { part: 'torso', solid: 'waist', fraction: [0.5, (0.2 - bust.pelvisHeight) / bust.waistHeight, 0.5] },
      neck: { part: 'neck', solid: 'neck', fraction: [0.5, 0, 0.5] },
      head: { part: 'neck', solid: 'neck', fraction: [0.5, 1, 0.5] },
      eye_left: { part: 'head', solid: 'left-eye', fraction: [0.5, 0.5, 1] },
      eye_right: { part: 'head', solid: 'right-eye', fraction: [0.5, 0.5, 1] },
      shoulder_left: shoulder('left'),
      shoulder_right: shoulder('right'),
      hip_left: hip(0.75),
      hip_right: hip(0.25),
    },
  },
  {
    id: 'player_arm',
    exportMass: 'parts',
    taxonomy: { category: 'body-parts', tags: { material: ['flesh'] } },
    voxelGrain: 0.006,
    // One segment per part so the first-person view bends the arm at its joints; each segment is drawn about its
    // own joint and mates to the segment above it there, so the whole hangs exactly as one piece would.
    parts: [
      armSegment('upper', 1.9, { skin: skin }, [jointSocket('elbow', [0, -arm.upperLength, 0])]),
      armSegment('fore', 1.1, { skin: skin }, [jointPin('elbow'), jointSocket('wrist', [0, -arm.foreLength, 0])]),
      armSegment('palm', 0.3, { skin: skin }, [
        jointPin('wrist'),
        jointSocket('thumb', [0, -arm.palmLength * arm.thumbRootShare, arm.palmWidth / 2 - arm.thumbInset]),
      ] + [jointSocket(hand.fingers[i], [0, -arm.palmLength, hand.centre(i)]) for i in std.range(0, fingerCount - 1)]),
    ] + [thumbBone(k) for k in std.range(0, hand.thumbBones - 1)]
      + [phalanx(i, k) for i in std.range(0, fingerCount - 1) for k in std.range(0, hand.phalanges - 1)],
    connections: [
      { from: 'upper.elbow', to: 'fore.elbow' },
      { from: 'fore.wrist', to: 'palm.wrist' },
    ] + [thumbConnection(k) for k in std.range(0, hand.thumbBones - 1)]
      + [phalanxConnection(i, k) for i in std.range(0, fingerCount - 1) for k in std.range(0, hand.phalanges - 1)],
    // The pivots code poses from: the shoulder the arm hangs from, sitting at the bust's shoulder anchor, each joint
    // below it, and the grip a held item sits at in the palm.
    anchors: {
      shoulder: { part: 'upper', solid: 'upper-arm', fraction: [0.5, 1, 0.5] },
      elbow: { part: 'upper', solid: 'upper-arm', fraction: [0.5, 0, 0.5] },
      wrist: { part: 'fore', solid: 'wrist', fraction: [0.5, 0, 0.5] },
      knuckles: { part: 'palm', solid: 'palm', fraction: [0.5, 0, 0.5] },
      thumb_root: { part: 'thumb', solid: 'thumb', fraction: [0.5, 1, 0] },
      grip: { part: 'palm', solid: 'palm', fraction: [0.5, 0.5, 0.5] },
    },
  },
  {
    id: 'player_leg',
    exportMass: 'parts',
    taxonomy: { category: 'body-parts', tags: { material: ['flesh'] } },
    voxelGrain: 0.006,
    // One segment per part so a stance bends the leg at the knee and ankle; each segment is drawn about its own joint
    // and mates to the segment above it there, so the whole stands exactly as one piece would.
    parts: [
      legSegment('thigh', 7, { skin: skin }, [jointSocket('knee', [0, -leg.thighLength, 0])]),
      legSegment('shin', 3, { skin: skin }, [
        jointPin('knee'),
        jointSocket('ankle', [0, leg.shoeHeight - leg.length + leg.thighLength, 0]),
      ]),
      legSegment('foot', 1, foot, [jointPin('ankle')]),
    ],
    connections: [
      { from: 'thigh.knee', to: 'shin.knee' },
      { from: 'shin.ankle', to: 'foot.ankle' },
    ],
    // The pivots code poses from: the hip the leg hangs from and strides about, sitting at the bust's hip anchor, and
    // each joint below it. The shin overlaps the foot so the joint stays closed when it bends.
    anchors: {
      hip: { part: 'thigh', solid: 'thigh', fraction: [0.5, 1, 0.5] },
      knee: { part: 'thigh', solid: 'thigh', fraction: [0.5, 0, 0.5] },
      ankle: { part: 'shin', solid: 'shin', fraction: [0.5, leg.ankleOverlap / (leg.length - leg.shoeHeight - leg.thighLength + leg.kneeOverlap + leg.ankleOverlap), 0.5] },
    },
  },
]
