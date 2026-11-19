// Box magazines in gun units: the well they seat in, the STANAG body the modular AR's frame tables size their wells
// by, and straight box magazines traced from photos. Each traced one is a photo estimate that needs visual review: the
// depth (front to back) and the floor's height are read from a side photo registered and scaled as its `scale`
// names, and each rounds to the grid the magazine builds on. A side photo cannot show width, so `widthU` states its
// own basis. The body runs from the seat the lower gives it down to the traced floor.
{
  // The well a box magazine seats in stands `heightU` over the magazine's seat and leaves `clearanceU` round it, so a
  // magazine's top stands the height less the clearance over its seat.
  well: { heightU: 1, clearanceU: 0.25 },
  // The body of the 30-round STANAG magazine (the stanag-curved profile at L length), rounded to the grid: 65 mm deep,
  // and as wide as the 20-round's sourced 24.8 mm.
  stanag30: { depthU: 5.5, widthU: 2.25 },
  // The magazine profiles each modular AR frame's well takes, by frame: the well is cut for one family of magazines,
  // so a magazine that fits it by size alone is still refused.
  frameWells: {
    ar15: ['stanag-curved', 'stanag-straight'],
  },
  profiles: {
    // The 20-round 7.62×51 SR-25 magazine for the large AR frame, traced from the same photo as that frame's
    // receiver (see arFrames.jsonnet): its front at -1.47u and rear at -8.49u (7.02u deep), its floor at -13.5u in
    // front and -14.7u behind.
    'sr25-straight': {
      photo: 'https://viranomainen.fi/tiedostot/1/kuva/tuote/1200/12757212.jpg',
      scale: 'the 43.5 in extended overall length listed for the SR-25 E2 20 in, https://operationparts.com/?p=175806',
      depthU: 7,
      // From the seat 1.5u below the bore down to the floor's mean, -14.1u.
      bodyLengthU: 12.5,
      // Not visible in a side photo: the widest the receiver's 2.7u feed slot over the well admits on the grid.
      widthU: 2.5,
      // The listing's "Knight's Armament 20 round magazine".
      capacity: 20,
    },
  },
}
