// How a round is drawn where its sourced data stops, in millimetres: the case wall, the primer and the projectile's
// nose. These are modelling assumptions, never measurements, so they live apart from the sourced cartridge files
// (models/guns/cartridges/README.md) and can be tuned without touching a citation.

// The roster-wide switch for the cupped primer, still on trial: false draws every primer as a plain disc.
local cupped = true;
// A primer `diameter` across whose cup, `cup` across and `cupDepth` deep, sinks into its face and leaves a ring
// round it. The pocket is only as deep as the face needs; nothing behind the head is ever seen.
local primer(diameter, cup, cupDepth, pocketDepth=0.4, recess=0.1, clearance=0.05, chamfer=0.2) = {
  diameter: diameter, pocketDepth: pocketDepth, recess: recess, clearance: clearance, chamfer: chamfer,
  cup: if cupped then { diameter: cup, depth: cupDepth } else null,
};
// Trade primer sizes; no cartridge file gives one, so each round takes the size its class is usually loaded with.
local smallPrimer = primer(4.45, 3.1, 0.12);
local largePrimer = primer(5.33, 3.8, 0.12);
// The .50 BMG's own large primer.
local bmgPrimer = primer(8.03, 5.8, 0.15, pocketDepth=0.5);
local smallArms(primer) = {
  case: {
    // C.I.P. 7.62×39 base-edge chamfer f, which its data file records only in its notes.
    baseChamfer: 0.25,
    // The open fired case shows its wall at the mouth and is closed by a floor this far above the head face.
    wall: 0.4,
    firedFloor: 3,
  },
  primer: primer,
  projectile: {
    // Only used where the source gives no bullet length: how deep the bullet sits in the case, in calibres.
    seatingCalibres: 1.5,
    // A tangent ogive, in calibres, drawn in this many straight segments, closed by a flat nose (the meplat) this
    // many calibres across; a pointed bullet has none.
    ogive: { calibres: 1.2, meplatCalibres: 0, segments: 8 },
    // A ring standing proud of the body, `fromMouth` ahead of the case mouth; a bullet has none.
    band: null,
  },
};
// A vehicle gun's shell at its own scale: a small-arms primer on a 160 mm head would vanish. Its projectile carries a
// fuze, so its nose is long and blunt, and a driving band, so the bore grips the band and not the body. The wall stays
// under a millimetre, as the sourced mouth and projectile diameters leave no more at the mouth.
local shell(case, primer, ogive, band) = smallArms(primer) {
  case: case,
  projectile+: { ogive+: ogive, band: band },
};
{
  // Every metallic round without an entry of its own.
  default: smallArms(largePrimer),
  // A metallic round's own shape, by cartridge id, where the default does not fit it.
  cartridges: {
    '5.56x45': smallArms(smallPrimer),
    '9x19': smallArms(smallPrimer),
    '357-magnum': smallArms(smallPrimer),
    '50-bmg': smallArms(bmgPrimer),
    // A screw-in percussion primer about a third of the head across; the band rides just ahead of the case mouth.
    '40x365r': shell(
      case={ baseChamfer: 1, wall: 0.7, firedFloor: 14 },
      primer=primer(18, 7, 0.8, pocketDepth=6, recess=0.3, clearance=0.3, chamfer=0.8),
      ogive={ calibres: 2, meplatCalibres: 0.3 },
      band={ diameter: 41.2, width: 9, fromMouth: 4 },
    ),
    // An electric primer boss; the smoothbore round's band stands for the obturator that seals its bore.
    '120x570': shell(
      case={ baseChamfer: 1.5, wall: 0.9, firedFloor: 24 },
      primer=primer(26, 10, 1, pocketDepth=8, recess=0.5, clearance=0.5, chamfer=1.2),
      ogive={ calibres: 2.4, meplatCalibres: 0.25 },
      band={ diameter: 121.2, width: 16, fromMouth: 8 },
    ),
  },
  // A 209 shotshell primer, its battery cup the ring round its cup. Null draws the head without a primer.
  shotshellPrimer: primer(6.15, 4.45, 0.12, pocketDepth=0.5),
}
