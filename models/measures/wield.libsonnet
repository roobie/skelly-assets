// How the wield classes space the hands along a handle. A pose reads it to place the hands and a weapon reads it to
// put its grip point where every hand lands on the handle. Both read it here because a weapon that took it from a pose
// would have its exported grip moved by a retuned animation, with nothing in the weapon's own row to show it.
{
  twoHand: {
    // The leading hand's seat toward the working end from the grip point, where the trailing hand closes: a hand's
    // width, so the two sit together without overlapping.
    leadSeat: 0.09,
  },
}
