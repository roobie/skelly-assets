// How the showcase and the review sheets dress a wearable on the doll (tools/dress.mjs, `wornSites`); why is in
// docs/decisions/0008-dressing.md.
{
  // The doll: the player's bust, with each limb hung on each side by its own anchor from the bust's anchor of the same
  // name and side, `<anchor>_<side>`. The limb models are built as the figure's right limb, so the left is their mirror.
  // A place on one side only takes the first side's copy.
  doll: {
    bust: 'player_bust',
    limbs: [{ model: 'player_arm', anchor: 'shoulder' }, { model: 'player_leg', anchor: 'hip' }],
    sides: ['right', 'left'],
    mirrored: 'left',
  },
  // The doll part a worn piece with no segment in its id, `<item>_worn`, is drawn in. A segment's part is in
  // models/worn-slots.libsonnet.
  piece: 'torso',
  // The states whose models lie on their back with their head end at -z (docs/decisions/0002-model-frame.md), so a
  // wearable in one stands up, head end up and front forward, before it is placed.
  lying: ['folded'],
  // Where a wearable with no worn pieces sits, by the first of its slots listed here: on the doll part `part` (every
  // side's copy with `both`, the first side's otherwise), centred across `against`, the direction from the
  // part it rests against, and sunk into the part by `sink`, a share of its own depth along that direction. No
  // direction centres it on the part. A place with `anchor` instead puts the model's origin at that bust anchor: a hat
  // stands on its brim at y = 0, and the brim sits at the brow whatever the hat's height.
  places: [
    { slot: 'torso', part: 'torso', against: [0, 0, 1], sink: 0.5 },
    { slot: 'legs', part: 'thigh', both: true, against: [0, 0, 1], sink: 0.5 },
    { slot: 'head', anchor: 'brow' },
    { slot: 'face', part: 'head', against: [0, 0, 1], sink: 0.3 },
    { slot: 'neck', part: 'neck', against: [0, 0, 1], sink: 0.5 },
    { slot: 'back', part: 'torso', against: [0, 0, -1], sink: 0 },
    { slot: 'waist', part: 'pelvis', against: [0, 0, 1], sink: 0.5 },
    { slot: 'arms', part: 'upper', against: [-1, 0, 0], sink: 0.5 },
    { slot: 'hands', part: 'palm', against: [0, 0, 0], sink: 0 },
    { slot: 'feet', part: 'foot', both: true, against: [0, -1, 0], sink: 1 },
  ],
  slots: import 'worn-slots.libsonnet',
}
