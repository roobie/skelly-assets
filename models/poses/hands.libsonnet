// The hand shorthands a pose file asks for by name (`hands: { "hand.R": "fist" }`), as site/fingers.mjs reads them:
// shares of each joint's range rather than degrees, so one preset reads on either hand and keeps its shape when a limit
// moves. A grip's preset is where the digits start before closing on a held item (site/fingers.mjs, `closeHand`), so it
// leaves the fingers open for contact to curl them round the item. The thumb closes last, over the closed fingers, so
// a grip's thumb starts swung a little away from the palm and lifted off it, its knuckle before the fist, and contact
// swings it across and bends it down onto them. A fist's and a pointing hand's thumb lies over the curled fingers with
// nothing held. A supporting hand's swings in and rolls little, so it lies along a handguard.
{
  open: { curl: 0.05, spread: 0.5, thumb: { across: -0.6, lift: 0.1 } },
  fist: { curl: 1, thumb: { across: 0.1, lift: 0.35, curl: 0.8 } },
  point: { curl: { middle: 1, ring: 1, pinky: 1 }, thumb: { across: 0.1, lift: 0.35, curl: 0.8 } },
  pinch: { curl: { index: 0.55, middle: 0.75, ring: 0.85, pinky: 0.95 }, thumb: { across: 0.1, oppose: 0.9, lift: 0.9, curl: 0.3 } },
  grip: { curl: 0.2, thumb: { across: -0.4, lift: 0.77 } },
  support: { curl: 0.2, thumb: { across: 0.3, oppose: 0.2, lift: 0.6 } },
}
