// Where the game wears each rigid shell it seats round the head, in its head frame (models/head-band.libsonnet,
// `frame`): how far above the frame the shell's origin sits and its turn about y. A shell is hollow, so none of it may
// lie inside the head; a solid hat, which the head's crown fills from below, is not one. Copied from the consumer,
// roobie/skelly: `packages/mods/skelly.wearables/wearables-items.libsonnet`, `figureModels`.
{
  riot_helmet: { at: 0, turn: 180 },
}
