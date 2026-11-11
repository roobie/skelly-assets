// The player arm's measures; shoulder to fingertip reaches mid-thigh on the standing figure.
// Worn shells fit around these, so the arm and its gear share one source.
{
  upperLength: 0.3, upperWidth: 0.085, upperDepth: 0.09,
  foreLength: 0.25, foreWidth: 0.08, wristWidth: 0.06,
  palmLength: 0.1, palmWidth: 0.085, palmThickness: 0.032, fingerLength: 0.08, thumbLength: 0.085,
  seamOverlap: 0.01, handOverlap: 0.005, armChamfer: 0.03, wristChamfer: 0.02,
  foreDepthExtra: 0.004, wristDepthExtra: 0.006, wristShare: 0.45,
  fingerThicknessShare: 0.8, thumbThicknessShare: 0.7, fingerFrontShare: 0.9, thumbRootShare: 0.3,
  thumbInset: 0.004, thumbProjection: 0.014,
  // How far the thumb's root sits toward the palm's face: the thumb's metacarpal lies on the palm side of the hand, as
  // the ball of the thumb, so the thumb closes round a handle from in front of the fingers rather than beside them.
  thumbVolar: 0.008,
  // The fingers from the thumb's side (+z) with their lengths as shares of `fingerLength`, the gap between them, each
  // finger's phalanges as shares of its length (knuckle first), and the thumb's bones as shares of its length (the
  // metacarpal first, then the two phalanges).
  fingers: ['index', 'middle', 'ring', 'little'], fingerShares: [0.94, 1, 0.92, 0.78], fingerGap: 0.0035,
  phalanxShares: [0.45, 0.3, 0.25], thumbShares: [0.4, 0.33, 0.27],
  // How far each finger's knuckle sits back from the palm's length, toward the wrist: the knuckle row slants back
  // toward the little finger, as a hand's metacarpal heads arc, so a closed hand steps down from index to little.
  knuckleBack: [0, 0.002, 0.006, 0.013],
  // How far the knuckles sit toward the palm's face: the fingers leave the hand flush with the palm and below the
  // knuckles' ridge on the back, so a closed finger reaches round a handle rather than stopping halfway down its side.
  knuckleVolar: 0.006,
}
