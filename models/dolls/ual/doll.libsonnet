// The UAL doll, one of the dolls of models/dressing.libsonnet: the player's body plan measured off the UAL mannequin's
// skeleton (models/dolls/ual/measures.libsonnet), so a game playing UAL's clips moves its parts. The fields are the
// player's (models/dolls/player/doll.libsonnet), which says what each means.
local skeleton = import 'models/dolls/ual/skeleton.libsonnet';
local playerSlots = import 'models/worn-slots.libsonnet';
// A worn piece's segment names the player's part; here it is drawn in the UAL part that stands for it. The digits'
// parts are named alike on both dolls, so a phalanx segment is drawn in the part of its own name.
local part = {
  body: 'spine_03', upper: 'upperarm', fore: 'lowerarm', palm: 'hand', pelvis: 'pelvis', thigh: 'thigh', shin: 'calf',
  foot: 'foot', toe: 'ball', shaft: 'calf',
};
{
  pack: 'skelly.body',
  rigPath: 'dolls/ual.rig.json',
  // The skeleton's frame is the doll's, so the bust stands at its root part's joint, the pelvis bone's head.
  bust: 'ual_bust',
  bustAt: skeleton.head('pelvis'),
  // The skeleton stands in a T-pose: the arm, built hanging, rests turned a quarter about z out to the side.
  limbs: [
    { name: 'arm', model: 'ual_arm', anchor: 'shoulder', turn: { axis: [0, 0, 1], degrees: -90 } },
    { name: 'leg', model: 'ual_leg', anchor: 'hip' },
  ],
  sides: ['right', 'left'],
  mirrored: 'left',
  boneSuffix: { right: '_r', left: '_l' },
  rig: import 'models/dolls/ual/rig.libsonnet',
  // The spine's cut at the armpit is spine_03's joint, so each region is whole parts but for the foot's.
  regions: {
    trunk: ['spine_01', 'spine_02'],
    shoulders: ['spine_03', 'clavicle_l', 'clavicle_r'],
    ankle: ['foot#ankle'],
    sole: ['foot#sole', 'ball'],
  },
  slots: { [segment]: playerSlots[segment] { part: std.get(part, segment, super.part) } for segment in std.objectFields(playerSlots) },
  places: [
    { slot: 'torso', part: 'spine_03', against: [0, 0, 1], sink: 0.5 },
    { slot: 'legs', part: 'thigh', both: true, against: [0, 0, 1], sink: 0.5 },
    { slot: 'head', anchor: 'brow' },
    { slot: 'face', part: 'head', against: [0, 0, 1], sink: 0.3 },
    { slot: 'neck', part: 'neck_01', against: [0, 0, 1], sink: 0.5 },
    { slot: 'back', part: 'spine_03', against: [0, 0, -1], sink: 0 },
    { slot: 'waist', part: 'pelvis', against: [0, 0, 1], sink: 0.5 },
    { slot: 'arms', part: 'upperarm', against: [-1, 0, 0], sink: 0.5 },
    { slot: 'wrist', part: 'lowerarm', against: [-1, -1, 0], sink: 0.5 },
    { slot: 'hands', part: 'hand', against: [0, 0, 0], sink: 0 },
    { slot: 'feet', part: 'foot', both: true, against: [0, -1, 0], sink: 1 },
  ],
}
