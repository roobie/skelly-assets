// The player bust's measures, hips to crown. Worn shells fit around these, so the bust and its gear share one source.
{
  pelvisWidth: 0.33, pelvisDepth: 0.2, pelvisHeight: 0.17,
  waistWidth: 0.3, waistDepth: 0.19, waistHeight: 0.17,
  ribWidth: 0.35, ribDepth: 0.21, ribHeight: 0.12,
  chestWidth: 0.4, chestDepth: 0.22, chestHeight: 0.15,
  // The hips', waist's and ribs' plan corners are cut at `torsoChamfer`, the chest's at `chestChamfer`.
  torsoChamfer: 0.05, chestChamfer: 0.06,
  shoulderWidth: 0.09, shoulderHeight: 0.12, shoulderDepth: 0.12, deltoidInset: 0.012, deltoidDrop: 0.01,
  neckWidth: 0.1, neckHeight: 0.07, neckOverlap: 0.02,
  headWidth: 0.165, headHeight: 0.235, headDepth: 0.2, jawHeight: 0.08, hairCover: 0.07, hairThickness: 0.005, noseBridge: 0.009,
  // How far the head's attachment frame sits above the top of the neck, about mid-skull. Hidden, as no body part
  // takes it.
  headFrameRise:: 0.0804,
  // The contour a head band's inner face follows, from the head's own plan: its half extents plus, in front, the nose
  // bridge and, behind, the hair. Each face stands a gap off the head's drawn surface, which voxel rounding moves a
  // millimetre or two from the analytic one, so the gap clears the rounding and stays under a strap's wall to be snug.
  // A band fitted from these follows the head when its measures change, instead of keeping an earlier head's size.
  headBand:: {
    sideGap: 0.003,
    noseGap: 0.002,
    hairGap: 0.005,
    halfWidth: $.headWidth / 2 + self.sideGap,
    front: $.headDepth / 2 + $.noseBridge + self.noseGap,
    back: $.headDepth / 2 + $.hairThickness + self.hairGap,
  },
}
