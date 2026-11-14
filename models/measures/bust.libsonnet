// The player bust's measures, hips to crown. Worn shells fit around these, so the bust and its gear share one source.
{
  pelvisWidth: 0.33, pelvisDepth: 0.2, pelvisHeight: 0.17,
  waistWidth: 0.3, waistDepth: 0.19, waistHeight: 0.17,
  ribWidth: 0.35, ribDepth: 0.21, ribHeight: 0.12,
  chestWidth: 0.4, chestDepth: 0.22, chestHeight: 0.15,
  // How far up the chest the armpit lies, as a share of its height: the top of the trunk a sleeveless shell covers.
  armpit: 0.4,
  // The hips', waist's and ribs' plan corners are cut at `torsoChamfer`, the chest's at `chestChamfer`.
  torsoChamfer: 0.05, chestChamfer: 0.06,
  shoulderWidth: 0.09, shoulderHeight: 0.12, shoulderDepth: 0.12, deltoidInset: 0.012, deltoidDrop: 0.01,
  neckWidth: 0.1, neckHeight: 0.07, neckOverlap: 0.02,
  headWidth: 0.165, headHeight: 0.235, headDepth: 0.2, jawHeight: 0.08, hairCover: 0.07,
  // How far up the head the eyes lie, as a share of its height, so a visor's slit can be set over them.
  eyeShare: 0.58,
  // How far the hair lies off the skull, and the exponent of the plan superellipse the face, skull and hair share.
  hairThickness: 0.005, facePower: 2.8,
  // How far back the hair's dome sits on the skull, so the crown's hair lies thicker behind than over the brow.
  hairSweep: 0.004,
  // The hair's dome: how far its top stands above the skull's, and its top layer's plan, as a share of the head's and
  // set back, so the crown's hair lies thicker behind. A rigid head piece clears each of its layers.
  hairRise: 0.006, hairCrownShare: 0.72, hairCrownBack: 0.014, hairLayerCount: 3,
  // How far the head's attachment frame sits above the top of the neck, about mid-skull. Hidden, as no body part
  // takes it.
  headFrameRise:: 0.0804,
  // The grain the doll's models are voxelised at (the player bust and its limbs), which the head's drawn surface
  // inherits. Hidden, as no body part takes it.
  voxelGrain:: 0.006,
}
