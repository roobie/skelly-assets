// A fixed peep rear sight clamped to a top rail: one disc with a round hole, in gun units along the part's own axes:
// x along the bore, y up from the rail top, z across. The hole's centre is not authored: it sits on the iron sight
// line, so it always lines up with the front post. Shapes are look estimates, never measurements.
{
  // The clamp across the rail, one notch long so the sight fits the rail's end slots, and the stem that carries the
  // disc.
  base: { halfLengthU: 1, heightU: 0.5, halfWidthU: 1 },
  stem: { halfLengthU: 0.125, halfWidthU: 0.25 },
  // The disc round the hole. The eye reads it from a few centimetres, where the gun's usual eight sides show as an
  // octagon, so it takes more.
  disc: { halfThicknessU: 0.25, holeRadiusU: 0.25, outerRadiusU: 0.75, sides: 16 },
  // Where the eye sits behind the hole for the exported sight line.
  eyeReliefU: 4,
}
