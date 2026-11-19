// One small loose heap per form of solid contents, drawn where contents lie out of their holder, so a pack on the
// ground always means a pack. Every content of a form shares its heap; a content may repaint the heap's own slot
// through its draft's `finishes`.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local turned = h.turned;
local loose(category, materials=[]) = { voxelGrain: 0.002, taxonomy: { category: category } + (if materials == [] then {} else { tags: { material: materials } }) };
// A low cone of loose stuff, `radius` across its foot and `height` tall.
local cone(id, slot, radius, height) = turned(id, slot, 'y', [[0, 0], [0, radius], [height * 0.3, radius * 0.7], [height * 0.7, radius * 0.35], [height, 0]]);
// Pieces rounded all over keep their authored mesh; see `tools/packages/thing-export/README.md`, "Voxelized export".
local smooth = { parts: [part + { smooth: true } for part in super.parts] };
// Quarter ellipses for round outlines: one rising `rise` from height `at` out to `radius`, one falling `fall` from
// `radius` at height `at` back to the axis, leaving out its first point, which the outline before it ends on.
local quarter = [std.pi / 12 * step for step in std.range(0, 6)];
local rising(radius, rise, at) = [[at + rise * (1 - std.cos(angle)), radius * std.sin(angle)] for angle in quarter];
local falling(radius, fall, at) = [[at + fall * std.sin(angle), radius * std.cos(angle)] for angle in quarter[1:]];
// A round piece standing on its face, `radius` across, its faces domed `dome` high about a straight band `band` tall.
local lens(id, slot, radius, dome, band, x, z, y0) =
  turned(id, slot, 'y', rising(radius, dome, 0) + (if band > 0 then [[dome + band, radius]] else []) + falling(radius, dome, dome + band), [x, y0, z])
  + { sides: null };
// A two-tone capsule lying along z, `length` long with round ends, slots capsule-a and capsule-b.
local capsule(id, length, radius, x, z) = [
  turned(id + '-a', 'capsule-a', 'z', rising(radius, radius, 0) + [[length / 2, radius], [length / 2, 0]], [x, radius, z - length / 2]) + { sides: null },
  turned(id + '-b', 'capsule-b', 'z', [[0, 0], [0, radius], [length / 2 - radius, radius]] + falling(radius, radius, length / 2 - radius), [x, radius, z]) + { sides: null },
];
[
  // Five round tablets, 10 mm across and 3.6 mm thick, one lying over two others.
  local tablet(id, x, z, y0=0) = lens(id, 'tablet', 0.005, 0.0012, 0.0012, x, z, y0);
  h.compound('tablet_heap', 0.0012, [tablet('tablet-a', 0, 0), tablet('tablet-b', 0.011, 0.003), tablet('tablet-c', -0.006, 0.009),
                                     tablet('tablet-d', 0.004, -0.011), tablet('tablet-e', 0.005, 0.002, 0.0036)],
             { tablet: 'plastic-white' }) + { title: 'Loose tablets' } + loose('medical') + smooth,

  // Three two-tone capsules, 18 mm long and 7 mm thick, side by side and staggered.
  h.compound('capsule_heap', 0.0015, capsule('capsule-a', 0.018, 0.0035, -0.009, 0) + capsule('capsule-b', 0.018, 0.0035, 0, 0.004)
                                     + capsule('capsule-c', 0.018, 0.0035, 0.009, -0.003),
             { 'capsule-a': 'plastic-red', 'capsule-b': 'plastic-white' }) + { title: 'Loose capsules' } + loose('medical') + smooth,

  // Three pellets of coated gum, 12 mm across and 6 mm thick, rounded all over.
  h.compound('gum_heap', 0.0045, [
    lens('pellet-a', 'gum', 0.006, 0.003, 0, -0.008, -0.002, 0),
    lens('pellet-b', 'gum', 0.006, 0.003, 0, 0.005, 0.004, 0),
    lens('pellet-c', 'gum', 0.006, 0.003, 0, 0, -0.011, 0),
  ], { gum: 'plastic-white' }) + { title: 'Loose gum' } + loose('medical') + smooth,

  // A pinch of fine powder, 40 mm across and 8 mm tall.
  h.compound('powder_heap', 0.002, [cone('powder', 'powder', 0.02, 0.008)], { powder: 'chalk-white' })
  + { title: 'Powder heap' } + loose('medical'),

  // A few frosted shards, the largest 12 mm long.
  h.compound('crystal_heap', 0.002, [
    h.taperedBlock('shard-a', 'crystal', [-0.008, 0, -0.005], [0.004, 0.007, 0.004], 0.002, [0.002, 0.002, 0.002], 0.001),
    h.taperedBlock('shard-b', 'crystal', [0.004, 0, -0.002], [0.012, 0.005, 0.006], 0.002, [0.0015, 0.0015, 0.0015], 0.001),
    h.taperedBlock('shard-c', 'crystal', [-0.004, 0, 0.004], [0.002, 0.004, 0.01], 0.001, [0.001, 0.001, 0.001], 0.001),
  ], { crystal: 'plastic-frosted' }) + { title: 'Crystal heap' } + loose('medical'),

  // A tuft of dried leaf and buds, 40 mm across and 14 mm tall, with two woody stalks poking out of it.
  h.compound('leaf_heap', 0.003, [
    cone('tuft', 'leaf', 0.016, 0.01),
    h.taperedBlock('bud-a', 'leaf', [0.006, 0, -0.012], [0.018, 0.012, 0], 0.003, [0.003, 0.003, 0.003], 0.002),
    h.taperedBlock('bud-b', 'leaf', [-0.02, 0, 0.002], [-0.008, 0.009, 0.014], 0.003, [0.003, 0.003, 0.003], 0.002),
    h.rod('stalk-a', 'stem', 0.0015, -0.026, -0.006, 0.003),
    turned('stalk-b', 'stem', 'z', [[0, 0], [0, 0.0015], [0.012, 0.0015], [0.012, 0]], [0.002, 0.003, 0.012]),
  ], { leaf: 'plant-dried', stem: 'wood-walnut' }) + { title: 'Leaf heap' } + loose('medical', ['plant']),

  // A spill of dry grit, 60 mm across and 18 mm tall, with a few coarse grains beside it.
  h.compound('granular_heap', 0.04, [
    cone('grit', 'grit', 0.03, 0.018),
    box('grain-a', 'grain', [0.032, 0, -0.004], [0.036, 0.004, 0]),
    box('grain-b', 'grain', [-0.036, 0, 0.006], [-0.032, 0.004, 0.01]),
    box('grain-c', 'grain', [0.004, 0, 0.032], [0.008, 0.004, 0.036]),
  ], { grit: 'stone-grey', grain: 'stone-whet' }) + { title: 'Grit heap' } + loose('materials', ['stone']),

  // Three squares of blotter paper, 10 mm a side, one lying over the others.
  h.compound('blotter_heap', 0.0003, [
    box('tab-a', 'tab', [-0.012, 0, -0.005], [-0.002, 0.002, 0.005]),
    box('tab-b', 'tab', [0.002, 0, -0.008], [0.012, 0.002, 0.002]),
    box('tab-c', 'tab', [-0.005, 0.002, -0.002], [0.005, 0.004, 0.008]),
  ], { tab: 'plastic-pink' }) + { title: 'Loose blotter tabs' } + loose('medical', ['paper']),
]
