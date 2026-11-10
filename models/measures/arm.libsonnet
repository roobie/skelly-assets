// The player arm's measures; shoulder to fingertip reaches mid-thigh on the standing figure.
// Worn shells fit around these, so the arm and its gear share one source.
{
  upperLength: 0.3, upperWidth: 0.085, upperDepth: 0.09,
  foreLength: 0.25, foreWidth: 0.08, wristWidth: 0.06,
  palmLength: 0.1, palmWidth: 0.085, palmThickness: 0.032, fingerLength: 0.08, thumbLength: 0.06,
  seamOverlap: 0.01, handOverlap: 0.005, armChamfer: 0.03, wristChamfer: 0.02,
  foreDepthExtra: 0.004, wristDepthExtra: 0.006, wristShare: 0.45,
  fingerThicknessShare: 0.8, thumbThicknessShare: 0.7, fingerFrontShare: 0.9, thumbRootShare: 0.3,
  thumbInset: 0.004, thumbProjection: 0.014,
  // The fingers from the thumb's side (+z) with their lengths as shares of `fingerLength`, the gap between them, each
  // finger's phalanges as shares of its length (knuckle first), and the thumb tip's share of the thumb.
  fingers: ['index', 'middle', 'ring', 'little'], fingerShares: [0.94, 1, 0.92, 0.78], fingerGap: 0.0035,
  phalanxShares: [0.45, 0.3, 0.25], thumbTipShare: 0.45,
}
