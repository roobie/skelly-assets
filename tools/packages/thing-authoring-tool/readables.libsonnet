local h = import 'compound.libsonnet';
local port(gender, normal) = {
  id: 'binding', mount: 'assembly-joint', gender: gender,
  pos: [0, 0, 0], normal: normal, up: [1, 0, 0], required: true,
};
local part(id, massKg, pieces, finish, binding) = {
  id: id, family: 'compound', massKg: massKg,
  params: { pieces: std.manifestJson(pieces) },
  finish: { paper: finish }, ports: [binding],
};
[
  {
    id: 'notebook', exportMass: 'inventory-atom', voxelGrain: 0.002,
    // Metres, measured from the primitive-paper GLB's cover and pages geometry.
    // Part masses serve the tool's physical report only; each book item owns its weight.
    parts: [
      part('board', 0.04, [
        h.box('lower-cover', 'paper', [-0.105, 0, -0.075], [0.105, 0.003, 0.075]),
        h.box('upper-cover', 'paper', [-0.105, 0.019, -0.075], [0.105, 0.022, 0.075]),
        h.box('spine', 'paper', [-0.105, 0.003, -0.075], [0.105, 0.019, -0.071]),
      ], 'paper-cover-sage', port('female', [0, -1, 0])),
      part('block', 0.12, [
        h.box('pages', 'paper', [-0.098, 0.003, -0.071], [0.098, 0.019, 0.07]),
      ], 'paper-pages-cream', port('male', [0, 1, 0])),
    ],
    connections: [{ from: 'board.binding', to: 'block.binding' }],
  } + { taxonomy: { tags: { material: ['paper'] } } },
]
