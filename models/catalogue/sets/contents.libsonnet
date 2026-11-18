// One small loose heap per form of solid contents, drawn where contents lie out of their holder, so a pack on the
// ground always means a pack. Every content of a form shares its heap; a content may repaint the heap's own slot
// through its draft's `finishes`.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local turned = h.turned;
local loose(category, materials=[]) = { voxelGrain: 0.002, taxonomy: { category: category } + (if materials == [] then {} else { tags: { material: materials } }) };
// A low cone of loose stuff, `radius` across its foot and `height` tall.
local cone(id, slot, radius, height) = turned(id, slot, 'y', [[0, 0], [0, radius], [height * 0.3, radius * 0.7], [height * 0.7, radius * 0.35], [height, 0]]);
[
  // Four round tablets, 10 mm across, one leaning on another.
  local tablet = h.tablet(0.005);
  h.compound('tablet_heap', 0.0012, tablet('tablet-a', 0, 0, 0) + tablet('tablet-b', 0.011, 0.003, 0) + tablet('tablet-c', -0.006, 0.009, 0)
                                     + tablet('tablet-d', 0.004, -0.011, 0) + tablet('tablet-e', 0.005, 0.002, 0.003),
             { tablet: 'plastic-white' }) + { title: 'Loose tablets' } + loose('medical'),

  // Three two-tone capsules, 18 mm long, side by side and askew.
  local capsule = h.capsule(0.018, 0.0035);
  h.compound('capsule_heap', 0.0015, capsule('capsule-a', -0.009, 0, 0) + capsule('capsule-b', 0, 0.004, 0) + capsule('capsule-c', 0.009, -0.003, 0),
             { 'capsule-a': 'plastic-red', 'capsule-b': 'plastic-white' }) + { title: 'Loose capsules' } + loose('medical'),

  // Three pellets of coated gum, 15 by 10 mm and 6 mm thick.
  h.compound('gum_heap', 0.0045, [
    box('pellet-a', 'gum', [-0.016, 0, -0.005], [-0.001, 0.006, 0.005]),
    box('pellet-b', 'gum', [0.001, 0, -0.008], [0.011, 0.006, 0.007]),
    box('pellet-c', 'gum', [-0.009, 0.006, -0.004], [0.006, 0.012, 0.006]),
  ], { gum: 'plastic-white' }) + { title: 'Loose gum' } + loose('medical'),

  // A pinch of fine powder, 40 mm across and 8 mm tall.
  h.compound('powder_heap', 0.002, [cone('powder', 'powder', 0.02, 0.008)], { powder: 'chalk-white' })
  + { title: 'Powder heap' } + loose('medical'),

  // A few frosted shards, the largest 12 mm long.
  h.compound('crystal_heap', 0.002, [
    h.taperedBlock('shard-a', 'crystal', [-0.008, 0, -0.005], [0.004, 0.007, 0.004], 0.002, [0.002, 0.002, 0.002], 0.001),
    h.taperedBlock('shard-b', 'crystal', [0.004, 0, -0.002], [0.012, 0.005, 0.006], 0.002, [0.0015, 0.0015, 0.0015], 0.001),
    h.taperedBlock('shard-c', 'crystal', [-0.004, 0, 0.004], [0.002, 0.004, 0.01], 0.001, [0.001, 0.001, 0.001], 0.001),
  ], { crystal: 'plastic-frosted' }) + { title: 'Crystal heap' } + loose('medical'),

  // A tuft of dried leaf and buds, 40 mm across and 14 mm tall.
  h.compound('leaf_heap', 0.003, [
    cone('tuft', 'leaf', 0.016, 0.01),
    h.taperedBlock('bud-a', 'leaf', [0.006, 0, -0.012], [0.018, 0.012, 0], 0.003, [0.003, 0.003, 0.003], 0.002),
    h.taperedBlock('bud-b', 'leaf', [-0.02, 0, 0.002], [-0.008, 0.009, 0.014], 0.003, [0.003, 0.003, 0.003], 0.002),
    box('stem', 'stem', [-0.006, 0.008, -0.001], [0.012, 0.01, 0.001]),
  ], { leaf: 'plant-dried', stem: 'paperboard-tan' }) + { title: 'Leaf heap' } + loose('medical', ['plant']),

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
