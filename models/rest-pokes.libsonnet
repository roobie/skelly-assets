// The places a fitted garment lets the doll poke through it at rest (tools/restPoke.mjs); why the build checks them is
// in docs/decisions/0019-garment-rest-check.md. Each entry names the doll it was judged on (an id under the dolls of
// models/dressing.libsonnet; a garment's pieces are fitted to the player and checked on every doll, and each doll pokes
// differently, so the same garment on another doll is another entry), the garment, the doll bone whose part pokes out,
// the worn piece meant to cover it there and the depth (m) the poke may reach.
// A poke that is intended, with the reason it is.
local poke(doll, garment, bone, piece, depth, why) = { doll: doll, garment: garment, bone: bone, piece: piece, depth: depth, why: why };
// A poke nobody has judged yet, capped at the depth it has now. It does not fail the build and is listed on every run
// until the garment or the doll is fixed or it becomes a `poke` with a reason.
local unjudged(doll, garment, bone, piece, depth, note) = { doll: doll, garment: garment, bone: bone, piece: piece, depth: depth, note: note };
// The same entry on the doll's left and right, which the doll mirrors.
local bothSides(entry, doll, garment, bone, piece, depth, text) = [entry(doll, garment, bone + side, piece, depth, text) for side in ['.L', '.R']];
local player = 'player';

{
  pokes: [],
  unjudged: [],
}
