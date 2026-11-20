// The places a fitted garment lets the doll poke through it at rest (tools/restPoke.mjs); why the build checks them is
// in docs/decisions/0019-garment-rest-check.md. Each entry names the doll it was judged on (an id under the dolls of
// models/dressing.libsonnet; a garment's pieces are fitted to one doll, so the same garment on another doll is another
// entry), the garment, the doll bone whose part pokes out, the worn piece meant to cover it there and the depth (m) the
// poke may reach.
// A poke that is intended, with the reason it is.
local poke(doll, garment, bone, piece, depth, why) = { doll: doll, garment: garment, bone: bone, piece: piece, depth: depth, why: why };
// A poke nobody has judged yet, capped at the depth it has now. It does not fail the build and is listed on every run
// until the garment or the doll is fixed or it becomes a `poke` with a reason.
local unjudged(doll, garment, bone, piece, depth, note) = { doll: doll, garment: garment, bone: bone, piece: piece, depth: depth, note: note };
// The same entry on the doll's left and right, which the doll mirrors.
local bothSides(entry, doll, garment, bone, piece, depth, text) = [entry(doll, garment, bone + side, piece, depth, text) for side in ['.L', '.R']];
local player = 'player';

local cuff = 'the bare forearm swells past the cuff\'s mouth where it enters it at the wrist, a seam on skin that shows above the cuff anyway';

{
  pokes: std.flattenArrays([
    bothSides(poke, player, 'gauntlet_plate', 'forearm', 'gauntlet_plate_worn_palm', 0.002, cuff),
    bothSides(poke, player, 'gloves_heavy', 'forearm', 'gloves_heavy_worn_palm', 0.002, cuff),
    bothSides(poke, player, 'gloves_power', 'forearm', 'gloves_power_worn_palm', 0.002, cuff),
    bothSides(poke, player, 'gloves_trooper', 'forearm', 'gloves_trooper_worn_palm', 0.002, cuff),
    bothSides(poke, player, 'leather_gloves', 'forearm', 'leather_gloves_worn_palm', 0.002, cuff),
  ]),
  unjudged: [],
}
