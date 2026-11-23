// The hand shorthands a pose file asks for by name (`hands: { "hand.R": "fist" }`), as site/fingers.mjs reads them:
// shares of each joint's range rather than degrees, so one preset reads on either hand and keeps its shape when a limit
// moves. A grip's preset is where the digits start before closing on a held item (site/fingers.mjs, `closeHand`), so it
// leaves the fingers open for contact to curl them round the item. The thumb is seated on the item over its root's
// whole range, so a grip's thumb shows its across, roll and lift only with nothing held: swung right across the palm,
// rolled a little into opposition and lifted, as a hand opens before taking a handle; its curl is where the seat starts
// the segments beyond. A supporting hand's swings in and rolls little, so it lies along a handguard.
{
  open: { curl: 0.05, spread: 0.5, thumb: { across: -0.4, oppose: 0.1 } },
  fist: { curl: 1, thumb: { across: 0.6, oppose: 0.7, lift: 0.6, curl: 0.8 } },
  point: { curl: { middle: 1, ring: 1, pinky: 1 }, thumb: { across: 0.5, oppose: 0.6, lift: 0.5, curl: 0.5 } },
  pinch: { curl: { index: 0.55, middle: 0.75, ring: 0.85, pinky: 0.95 }, thumb: { across: 0.1, oppose: 0.9, lift: 0.9, curl: 0.3 } },
  grip: { curl: 0.2, thumb: { across: 1, oppose: 0.3, lift: 1, curl: 0.65 } },
  support: { curl: 0.2, thumb: { across: 0.3, oppose: 0.2, lift: 0.6 } },
}
