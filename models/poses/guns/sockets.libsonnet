// How each hand meets a gun, one row per gun family (models/guns/roster.libsonnet), as tools/wields.mjs reads a hand of
// a held set: each socket is a point the gun's export names (`from`: `grip`, its grip point, or one of its anchors),
// moved by `offset` and pressed along `into` onto the gun as it is drawn, so a reshaped gun carries the palms with it.
// What the export cannot say is written here: the side the palm comes from (`into`, from the palm into the gun, held
// axes: bore +z, up +y, the gun's left +x), the way the thumb points (`axis`), how deep the gun seats in the palm
// (`grip`) and how it slants across it (`slant`), and the hand preset (`hands`, models/poses/hands.libsonnet).
//
// The firing hand closes on the pistol grip in a power grip, so the thumb closes down the grip's left side rather than
// lying across its back. The grip slants across the palm a little less than a handle, since a raked pistol grip already
// bends the wrist toward the thumb and the full slant would ask it past its limit.
// The support hand cradles the fore-end palm up, the thumb along the bore, square across the knuckle crease where the
// fingers' bases carry it, not slanted deep in the palm, since it supports the gun rather than gripping it.
// A stock wrist is held as a pistol grip is: the palm round its right side, the thumb up behind it; pressed onto the
// wrist's surface, the grip's rake is the wrist's slope.
local pistol = { from: 'grip', into: [0.781, 0.188, -0.596], axis: [0, 0.95, 0.3], slant: 15, hands: 'grip' };
local forend = { from: 'support', into: [-0.5, 0.866, 0], axis: [0.557, 0.321, 0.766], grip: 0.95, slant: 0, hands: 'support' };
{
  // The press check's proven hold (models/poses/press-check.libsonnet).
  rifle_assault: {
    grip: pistol { offset: [-0.016, -0.006, -0.005] },
    support: forend { offset: [0.013, 0, -0.078] },
  },
  rifle_pipe: { grip: pistol, support: forend },
  // The support anchor stands on the pump's lower right edge; the palm cradles its middle.
  shotgun_pump: { grip: pistol, support: forend { offset: [0.028, 0, -0.07] } },
}
