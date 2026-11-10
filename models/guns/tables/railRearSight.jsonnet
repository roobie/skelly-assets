// A fixed aperture rear sight clamped to a top rail, in gun units along the part's own axes: x along the bore, y up
// from the rail top, z across. The aperture centre is not authored: it sits on the iron sight line, so it always lines
// up with the front post. Shapes are look estimates, never measurements.
{
  // The clamp across the rail, one notch long so the sight fits the rail's end slots, and the tower that carries the
  // aperture leaf.
  base: { halfLengthU: 1, heightU: 0.5, halfWidthU: 1 },
  tower: { halfLengthU: 0.25, halfWidthU: 0.5 },
  // The leaf round the hole; the hole stays wider than one voxel of the gun grain so it draws open.
  aperture: { halfThicknessU: 0.125, holeHalfU: 0.25, ringU: 0.25 },
  // Where the eye sits behind the aperture for the exported sight line.
  eyeReliefU: 4,
}
