// How a metallic round is drawn where its sourced data stops, in millimetres: the case wall, the primer and the
// projectile's nose. These are modelling assumptions, never measurements, so they live apart from the sourced
// cartridge files (models/guns/cartridges/README.md) and can be tuned without touching a citation.
local smallArms = {
  case: {
    // C.I.P. 7.62×39 base-edge chamfer f, which its data file records only in its notes.
    baseChamfer: 0.25,
    // The open fired case shows its wall at the mouth and is closed by a floor this far above the head face.
    wall: 0.4,
    firedFloor: 3,
  },
  // A large-rifle primer; no cartridge file gives a primer diameter.
  primer: { diameter: 5.4, pocketDepth: 0.4, recess: 0.1, clearance: 0.05, chamfer: 0.2 },
  projectile: {
    // Only used where the source gives no bullet length: how deep the bullet sits in the case, in calibres.
    seatingCalibres: 1.5,
    // A tangent ogive, in calibres, drawn in this many straight segments.
    ogive: { calibres: 1.2, segments: 8 },
  },
};
{
  // Every round without an entry of its own.
  default: smallArms,
  // A round's own shape, by cartridge id, where the default does not fit it.
  cartridges: {},
}
