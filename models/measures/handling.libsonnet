// How the thing builders in packages/thing-authoring-tool/ hold an item unless its row says otherwise: `fraction` is
// where the hand falls on the held solid, as a share of its bounds; `turn` is in degrees and `hold` and `roll` are as
// packages/thing-core/src/schema.ts describes them. The held part and solid are the builder's, so they are not here.
{
  // A small thing held upright by its top: the turn carries +y onto the held working end. Packaged, tinned and folded
  // things, the small handhelds and compound.libsonnet's `inHand`.
  inHand: { fraction: [0.5, 0.5, 0.5], turn: [0, -90, -90], hold: 'upright', roll: 0 },
  // A tool laid along x with its working end at +x, raised with a quarter roll about it: compound.libsonnet's `gripOn`
  // and handhelds.libsonnet's `held`.
  grip: { fraction: [0.5, 0.5, 0.5], turn: [0, 0, 0], hold: 'upright', roll: 90 },
  // A thing standing with its front on +z, held as `grip` holds a tool but turned to stand it: compound.libsonnet's
  // `gripStanding`.
  gripStanding: { turn: [90, 0, 0] },
  // Equipment, its working end pointed ahead.
  equipment: { fraction: [0.5, 0.5, 0.5], turn: [0, 0, 0], hold: 'forward', roll: 0 },
  // A raw material, held as it lies.
  material: { fraction: [0.5, 0.5, 0.5], turn: [0, 0, 0], hold: 'upright', roll: 0 },
  // A shambler part; its grip names the solid, fraction and hold.
  shamblerPart: { turn: [0, -90, 0], roll: 0 },
}
