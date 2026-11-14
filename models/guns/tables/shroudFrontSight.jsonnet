// A fixed front post on an anti-materiel rifle's barrel shroud, in gun units along the part's own axes: x along the
// bore, y up from the shroud top, z across. The post top is not authored: it sits on the iron sight line, so it always
// lines up with the rail rear sight. Shapes are look estimates, never measurements.
{
  // How far back from the shroud's front end the sight sits. The post rides the shroud, not the barrel, because the
  // barrel recoils inside the shroud and a post on it would jump the sight line every shot.
  setbackU: 2,
  // The block the post and its guard ears stand on.
  base: { halfLengthU: 1, heightU: 0.5, halfWidthU: 1.25 },
  post: { halfLengthU: 0.25, halfWidthU: 0.125 },
  // Guard ears either side of the post, as tall as the post so they shield it without crowding the sight picture. The
  // gap stays wide enough that the exported post top is read off the post alone (see `exportGlb.ts`,
  // `frontSightPost`).
  ears: { halfLengthU: 0.5, innerHalfGapU: 0.75, thicknessU: 0.25 },
}
