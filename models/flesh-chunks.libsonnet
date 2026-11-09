// Loose lumps of flesh torn from a body, from a few centimetres to a hand's size, in the finishes the severed
// shambler parts use. Each lump lies on a skin underside with torn gore heaped above it, so either face can land up.
// The outlines are two fixed irregular convex shapes, only scaled and moved, so every piece stays convex.
local params(values) = { [key]: std.toString(values[key]) for key in std.objectFields(values) };
local outlineA = [[1.0, 0.1], [0.6, 0.8], [-0.2, 0.95], [-0.85, 0.5], [-0.95, -0.3], [-0.4, -0.9], [0.5, -0.75]];
local outlineB = [[0.9, -0.2], [0.8, 0.55], [0.1, 0.9], [-0.7, 0.7], [-1.0, 0.0], [-0.6, -0.8], [0.3, -0.9]];
local shape(outline, halfA, halfB, offA, offB) = [[offA + p[0] * halfA, offB + p[1] * halfB] for p in outline];
local prism(id, slot, profile, start, end) = { id: id, kind: 'prism', slot: slot, axis: 'y', profile: profile, start: start, end: end };
local box(id, slot, min, max) = { id: id, kind: 'box', slot: slot, min: min, max: max };
// A lump `length` by `width` across and `height` tall: a skin underside, a gore body and a smaller gore crown set off
// its centre, and a torn nub standing out of one side.
local chunk(id, massKg, length, width, height) =
  local a = length / 2;
  local b = width / 2;
  {
    id: id,
    exportMass: 'parts',
    voxelGrain: 0.004,
    taxonomy: { category: 'body-parts', tags: { material: ['flesh'] } },
    parts: [{
      id: 'lump',
      family: 'compound',
      massKg: massKg,
      params: params({ pieces: [
        prism('skin', 'skin', shape(outlineA, a, b, 0, 0), 0, height * 0.25),
        prism('body', 'gore', shape(outlineA, a * 0.94, b * 0.92, 0, 0), height * 0.2, height * 0.65),
        prism('crown', 'gore', shape(outlineB, a * 0.62, b * 0.58, a * 0.12, -b * 0.08), height * 0.6, height),
        box('nub', 'gore', [-a * 0.98, height * 0.25, -b * 0.3], [-a * 0.7, height * 0.55, b * 0.15]),
      ] }),
      finish: { skin: 'body-skin-sickly', gore: 'body-gore' },
      ports: [],
    }],
    connections: [],
    handling: { part: 'lump', solid: 'body', fraction: [0.5, 0.5, 0.5], turn: [0, 0, 0], hold: 'upright', roll: 0 },
  };
[
  chunk('flesh_chunk_small', 0.03, 0.04, 0.035, 0.022),
  chunk('flesh_chunk_medium', 0.1, 0.065, 0.055, 0.032),
  chunk('flesh_chunk_large', 0.3, 0.1, 0.085, 0.045),
  chunk('flesh_chunk_strip', 0.1, 0.11, 0.04, 0.026),
]
