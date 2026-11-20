// The generic fixed post front sight clamped to a top rail, in gun units along the part's own axes: x along the bore,
// y up from the rail top, z across. The post's top is not authored: it stands on the iron sight line of the frame it
// is fitted to. Shapes are look estimates, never measurements; the modular AR's own post is measured in its frame
// table (ar15.jsonnet, railFrontSight).
{
  // The clamp across the rail, one notch long so the sight fits the rail's end slots.
  base: { halfLengthU: 1, heightU: 0.5, halfWidthU: 1 },
  post: { halfLengthU: 0.25, halfWidthU: 0.125 },
  // The reference distance on the post's sight axis, which the attachment metadata reports as its eye relief.
  referenceU: 4,
}
