// The FAL Para folding stock in the stock frame, in gun units: x back from the receiver's rear face, y up from the bore,
// z across, to the right of the receiver. The stock is open behind the receiver and folds half a turn about a vertical
// pin on the receiver's right, clear of its side wall. Shapes are look estimates, never measurements.
{
  // Where the pin stands: across from the bore.
  hingeZU: 2.75,
  // The hinge block behind the rear face, flush with it, and the arm that carries it out to the pin and a half unit past.
  block: { depthU: 2.5, yU: [-1.75, 1], halfWidthU: 1.5 },
  arm: { depthU: 1, pastPinU: 0.5 },
  // The two tubes from the block to the buttplate. Folded, the upper one lies under the receiver's ejection volume.
  tube: { halfWidthU: 0.5, upperYU: [-1, 0], lowerYU: [-3.5, -2.5] },
  buttplate: { thicknessU: 1, yU: [-4.5, 1.5], halfWidthU: 1.75 },
}
