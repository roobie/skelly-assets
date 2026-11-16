// The places a fitted garment lets the doll poke through it at rest (tools/restPoke.mjs); why the build checks them is
// in docs/decisions/0019-garment-rest-check.md. Each entry names the garment, the doll bone whose part pokes out, the
// worn piece meant to cover it there and the depth (m) the poke may reach.
// A poke that is intended, with the reason it is.
local poke(garment, bone, piece, depth, why) = { garment: garment, bone: bone, piece: piece, depth: depth, why: why };
// A poke nobody has judged yet, capped at the depth it has now. It does not fail the build and is listed on every run
// until the garment or the doll is fixed or it becomes a `poke` with a reason.
local unjudged(garment, bone, piece, depth, note) = { garment: garment, bone: bone, piece: piece, depth: depth, note: note };
// The same entry on the doll's left and right, which the doll mirrors.
local bothSides(entry, garment, bone, piece, depth, text) = [entry(garment, bone + side, piece, depth, text) for side in ['.L', '.R']];

local cuff = 'the bare forearm swells past the cuff\'s mouth where it enters it at the wrist, a seam on skin that shows above the cuff anyway';

{
  pokes: std.flattenArrays([
    bothSides(poke, 'armor_heavy', 'upperArm', 'armor_heavy_worn_body', 0.002,
              'the arm meets the body plate\'s shoulder opening a hair proud of it, under the pauldron\'s overhang'),
    bothSides(poke, 'gauntlet_plate', 'forearm', 'gauntlet_plate_worn_palm', 0.002, cuff),
    bothSides(poke, 'gloves_heavy', 'forearm', 'gloves_heavy_worn_palm', 0.002, cuff),
    bothSides(poke, 'gloves_power', 'forearm', 'gloves_power_worn_palm', 0.002, cuff),
    bothSides(poke, 'gloves_trooper', 'forearm', 'gloves_trooper_worn_palm', 0.002, cuff),
    bothSides(poke, 'leather_gloves', 'forearm', 'leather_gloves_worn_palm', 0.002, cuff),
  ]),
  unjudged: [],
}
