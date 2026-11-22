// The player doll, one of the dolls of models/dressing.libsonnet: the doll a game's player is drawn as. What the
// dressing rule needs of a doll is read from here (tools/dress.mjs, `dollDressing`).
local armRest = import 'models/arm-rest.libsonnet';
{
  // Where the doll's rig is released: the pack of its parts, and the file that rig is written to.
  pack: 'skelly.body',
  rigPath: 'motions/doll.rig.json',
  // The bust, with each limb hung on each side by its own anchor from the bust's anchor of the same name and side,
  // `<anchor>_<side>`. The limb models are built as the figure's right limb, so the `mirrored` side is their mirror. A
  // place on one side only takes the first side's copy. The limbs' order is the order of their sites in the doll, which
  // a rig file's bone binds index, so a limb added later goes last. A limb a doll rests turned off the way its model
  // hangs (down -y), as a T-pose arm, adds `turn: { axis, degrees }` for the side that is not `mirrored`; the mirrored
  // side turns as its mirror image, so one turn serves both. The axis is one of the doll's, [±1, 0, 0] or alike, and
  // the degrees any. The player's arm is swung out clear of the trunk (models/arm-rest.libsonnet), the right's swing
  // turning it toward -x. A doll measured off a skeleton stands its bust where the skeleton has it with `bustAt`, its
  // origin in the doll frame; the player's doll frame is its bust's. The clavicle is a limb too, though it hangs
  // nothing: the arm's rig bone hangs from its bone while the arm's model hangs from the bust, at the shoulder the
  // clavicle carries, so either stands the arm on the same joint at rest.
  bust: 'player_bust',
  limbs: [
    { name: 'arm', model: 'player_arm', anchor: 'shoulder', turn: { axis: [0, 0, 1], degrees: -armRest.degrees } },
    { name: 'leg', model: 'player_leg', anchor: 'hip' },
    { name: 'clavicle', model: 'player_clavicle', anchor: 'clavicle' },
  ],
  sides: ['right', 'left'],
  mirrored: 'left',
  // What a sided bone's id takes after its name, by side.
  boneSuffix: { right: '.R', left: '.L' },
  rig: import 'models/dolls/player/rig.libsonnet',
  // What a worn piece's `covers` may name besides the doll part it is drawn on: the regions drawn as a piece of that
  // part (docs/decisions/0012-hidden-body.md), each by the surfaces that make it, a whole part or `<part>#<piece>`, a
  // piece the doll's export keeps of a part cut into regions. A region that holds a part whole is named on it by the
  // part, since a consumer hides by the names a part's primitives carry.
  regions: {
    // Below the armpit, and the girdle above it that a sleeveless garment leaves bare, the clavicles' share of it
    // with it.
    trunk: ['torso#trunk'],
    shoulders: ['torso#shoulders', 'clavicle'],
    // The ankle's cap, which rises above a boot's vamp into the shaft, and the sole below it behind the ball: heel and
    // instep. The toes beyond are the ball part, which a shoe's toe piece covers.
    ankle: ['foot#ankle'],
    sole: ['foot#sole'],
  },
  // The doll part each segment a worn piece's id ends in is drawn in, and the body slot it covers. Pieces are fitted
  // in these parts' frames, so another doll's slot whose part turns about another point gives the `origin` of this
  // part's frame in its own.
  slots: import 'models/worn-slots.libsonnet',
  // Where a wearable with no worn pieces sits, by the first of its slots listed here: on the doll part `part` (every
  // side's copy with `both`, the first side's otherwise), centred across `against`, the direction from the
  // part it rests against, and sunk into the part by `sink`, a share of its own depth along that direction. No
  // direction centres it on the part. A place with `anchor` instead puts the model's own anchor of that name at the
  // bust's, or its origin if it has none: a hat stands on its brim at y = 0, and the brim sits at the brow whatever the
  // hat's height.
  places: [
    { slot: 'torso', part: 'torso', against: [0, 0, 1], sink: 0.5 },
    { slot: 'legs', part: 'thigh', both: true, against: [0, 0, 1], sink: 0.5 },
    { slot: 'head', anchor: 'brow' },
    { slot: 'face', part: 'head', against: [0, 0, 1], sink: 0.3 },
    { slot: 'neck', part: 'neck', against: [0, 0, 1], sink: 0.5 },
    { slot: 'back', part: 'torso', against: [0, 0, -1], sink: 0 },
    { slot: 'waist', part: 'pelvis', against: [0, 0, 1], sink: 0.5 },
    { slot: 'arms', part: 'upper', against: [-1, 0, 0], sink: 0.5 },
    // On the back of the wrist: outside the forearm, straddling its end by the wearable's own height.
    { slot: 'wrist', part: 'fore', against: [-1, -1, 0], sink: 0.5 },
    { slot: 'hands', part: 'palm', against: [0, 0, 0], sink: 0 },
    { slot: 'feet', part: 'foot', both: true, against: [0, -1, 0], sink: 1 },
  ],
}
