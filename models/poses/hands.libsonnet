// The hand shorthands a pose file asks for by name (`hands: { "hand.R": "fist" }`), as site/fingers.mjs reads them:
// shares of each joint's range rather than degrees, so one preset reads on either hand and keeps its shape when a limit
// moves. A grip's preset is where the digits start before contact closes them on the item (site/fingers.mjs,
// `closeHand`), so it leaves the fingers open and sets the thumb's across and roll, which contact cannot find, with the
// thumb lifted wide, as a hand opens before taking a handle, so contact brings it down over the item and the fingers.
{
  open: { curl: 0.05, spread: 0.5, thumb: { across: -0.4, oppose: 0.1 } },
  fist: { curl: 1, thumb: { across: 0.6, oppose: 0.7, lift: 0.6, curl: 0.8 } },
  point: { curl: { middle: 1, ring: 1, little: 1 }, thumb: { across: 0.5, oppose: 0.6, lift: 0.5, curl: 0.5 } },
  pinch: { curl: { index: 0.55, middle: 0.75, ring: 0.85, little: 0.95 }, thumb: { across: 0.1, oppose: 0.9, lift: 0.9, curl: 0.3 } },
  grip: { curl: 0.2, thumb: { across: -0.25, oppose: 0.4, lift: 1 } },
}
