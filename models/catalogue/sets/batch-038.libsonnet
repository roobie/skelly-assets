local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local disc = h.disc;
// A cast ingot as stacked layers `step` thick, tapering from a `l` by `w` base to a top `inset` smaller each side,
// with a flat stamp plate on top. Front on +z.
local ingot(id, massKg, l, w, ht, inset, step, finish) =
  local n = std.floor(ht / step + 0.5);
  h.compound(id, massKg, [
    local k = inset * (i + 0.5) / n;
    box('layer-%d' % i, 'metal', [-l / 2 + k, i * step, -w / 2 + k], [l / 2 - k, (i + 1) * step, w / 2 - k])
    for i in std.range(0, n - 1)
  ] + [
    box('stamp', 'metal', [-l / 4, n * step, -w / 2 + inset + 0.008], [l / 4, n * step + 0.002, w / 2 - inset - 0.008]),
  ], { metal: finish });
// A rough cast lump: irregular convex slabs stacked on y, each [y0, y1, outline] with its outline in [z, x].
local lump(id, massKg, slabs, finish) = h.compound(id, massKg, [
  h.prism('slab-%d' % i, 'metal', 'y', slabs[i][2], slabs[i][0], slabs[i][1])
  for i in std.range(0, std.length(slabs) - 1)
], { metal: finish });
// A flat-bottomed rail section along x, `length` long: worn bright running top, rusty head, web and foot.
// The outline is [y, z], 172 mm tall, a 72 mm head, a 16 mm web and a 150 mm foot.
local rail(id, massKg, length) = h.compound(id, massKg, [
  h.prism('foot', 'rail', 'x', [[0, -0.075], [0.012, -0.075], [0.028, -0.01], [0.028, 0.01], [0.012, 0.075], [0, 0.075]], -length / 2, length / 2),
  box('web', 'rail', [-length / 2, 0.02, -0.008], [length / 2, 0.124, 0.008]),
  h.prism('neck', 'rail', 'x', [[0.116, -0.008], [0.13, -0.036], [0.13, 0.036], [0.116, 0.008]], -length / 2, length / 2),
  box('head', 'rail', [-length / 2, 0.13, -0.036], [length / 2, 0.166, 0.036]),
  box('running-top', 'top', [-length / 2, 0.166, -0.034], [length / 2, 0.172, 0.034]),
  // Two fishplate bolt holes through the web at one end, painted dark.
] + [
  h.turned('hole-%d' % i, 'hole', 'z', [[0, 0], [0, 0.013], [0.018, 0.013], [0.018, 0]], [[-length / 2 + 0.06, -length / 2 + 0.16][i], 0.074, -0.009])
  for i in [0, 1]
], { rail: 'scrap-rusted', top: 'steel-bright', hole: 'plastic-charcoal' });
// A pipe along x, `length` long, with a band of thread at each end.
local pipe(id, massKg, length, r, wall, finish, thread) = h.compound(id, massKg, [
  h.tube('pipe', 'pipe', r - wall, r, -length / 2, length / 2),
] + if thread == null then [] else [
  h.tube('thread-%d' % i, 'thread', r - wall, r + 0.0006, [-length / 2, length / 2 - 0.02][i], [-length / 2 + 0.02, length / 2][i])
  for i in [0, 1]
], { pipe: finish } + if thread == null then {} else { thread: thread });
// One fan blade's [z, x] outline: a flared paddle from the hub at radius r0 out to r1, turned by angle a.
local blade(a, r0, r1) =
  local pts = [[-0.014, r0], [0.014, r0], [0.04, r1 - 0.02], [0.03, r1], [-0.03, r1], [-0.045, r1 - 0.025]];
  [[p[0] * std.cos(a) + p[1] * std.sin(a), -p[0] * std.sin(a) + p[1] * std.cos(a)] for p in pts];
[
  // A one-litre gold bar, 175 by 80 mm at the base and 85 mm tall, sides tapering 10 mm.
  ingot('gold_ingot', 19, 0.175, 0.08, 0.084, 0.01, 0.004, 'metal-gold') + { title: 'Gold ingot' } + { voxelGrain: 0.004 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },
  // A one-litre lead bar, the same casting shape as the gold bar.
  ingot('lead_ingot', 11, 0.175, 0.08, 0.084, 0.01, 0.004, 'lead') + { title: 'Lead ingot' } + { voxelGrain: 0.004 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },
  // A one-litre platinum bar, the same casting shape as the gold bar.
  ingot('platinum_ingot', 19, 0.175, 0.08, 0.084, 0.01, 0.004, 'metal-platinum') + { title: 'Platinum ingot' } + { voxelGrain: 0.004 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },
  // A one-litre silver bar, the same casting shape as the gold bar.
  ingot('silver_ingot', 10, 0.175, 0.08, 0.084, 0.01, 0.004, 'metal-silver') + { title: 'Silver ingot' } + { voxelGrain: 0.004 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },
  // A one-litre tin bar, the same casting shape as the gold bar.
  ingot('tin_ingot', 7.2, 0.175, 0.08, 0.084, 0.01, 0.004, 'steel-stainless') + { title: 'Tin ingot' } + { voxelGrain: 0.004 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A broken chunk of cast iron about 50 by 35 by 25 mm.
  lump('cast_iron_chunk', 0.19, [
    [0, 0.01, [[-0.012, -0.026], [0.004, -0.022], [0.016, -0.004], [0.012, 0.022], [-0.004, 0.026], [-0.016, 0.006]]],
    [0.01, 0.02, [[-0.014, -0.02], [0.01, -0.024], [0.018, 0.008], [0.006, 0.02], [-0.012, 0.016]]],
    [0.02, 0.028, [[-0.008, -0.014], [0.008, -0.016], [0.012, 0.004], [0.002, 0.012], [-0.01, 0.006]]],
  ], 'iron-cast') + { title: 'Cast iron chunk' } + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A heavy lump of cast iron about 75 by 50 by 45 mm, broken from a larger casting.
  lump('cast_iron_lump', 0.75, [
    [0, 0.016, [[-0.02, -0.036], [0.012, -0.034], [0.026, -0.008], [0.02, 0.03], [-0.006, 0.038], [-0.024, 0.012]]],
    [0.016, 0.032, [[-0.024, -0.03], [0.006, -0.038], [0.024, -0.016], [0.022, 0.022], [0.002, 0.036], [-0.02, 0.024]]],
    [0.032, 0.044, [[-0.016, -0.024], [0.01, -0.022], [0.016, 0.006], [0.004, 0.024], [-0.014, 0.014]]],
  ], 'iron-cast') + { title: 'Cast iron lump' } + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A small cast bar of aluminium, 80 by 35 mm at the base and 34 mm tall.
  ingot('aluminium_ingot', 0.22, 0.08, 0.035, 0.034, 0.004, 0.002, 'alu-bare') + { title: 'Aluminium ingot' } + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A 600 mm length of 22 mm copper water tube with a 1 mm wall.
  pipe('copper_tube', 0.35, 0.6, 0.011, 0.0012, 'copper', null) + { title: 'Copper tube' } + h.gripOn('copper_tube', 'pipe') + {
    voxelGrain: 0.002,
  } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A 600 mm length of half-inch steel pipe, 21 mm across with a 2.6 mm wall, threaded at both ends.
  pipe('pipe', 0.29, 0.6, 0.0107, 0.0026, 'steel-grey', 'steel-bright') + { title: 'Pipe' } + h.gripOn('pipe', 'pipe') + {
    voxelGrain: 0.002,
  } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A five-bladed pressed-steel fan, 300 mm across, lying face up: a domed hub 60 mm across with a bore for the shaft.
  h.compound('metal_fan_blades', 0.45, [
    h.prism('blade-%d' % i, 'blade', 'y', blade(i * 2 * std.pi / 5, 0.022, 0.15), 0.006, 0.008)
    for i in std.range(0, 4)
  ] + [
    h.turned('hub', 'hub', 'y', [[0, 0], [0, 0.03], [0.012, 0.03], [0.02, 0.022], [0.024, 0.008], [0.024, 0]]),
    disc('bore', 'bore', 0.005, 0.024, 0.026),
  ], { blade: 'steel-galvanised', hub: 'steel-grey', bore: 'plastic-charcoal' }) + { title: 'Metal fan blades' } + { voxelGrain: 0.002 } + { taxonomy: { category: 'vehicle-parts', tags: { material: ['metal'] } } },

  // A heavy steel oven or grill rack, 600 by 400 mm: a 6 mm frame round eleven 4 mm cross wires on two
  // 4 mm runners.
  h.compound('heavy_wire_rack', 0.89, [
    h.rod('frame-front', 'frame', 0.003, -0.3, 0.3, 0.007) + { origin: [-0.3, 0.007, 0.197] },
    h.rod('frame-back', 'frame', 0.003, -0.3, 0.3, 0.007) + { origin: [-0.3, 0.007, -0.197] },
  ] + [
    h.turned('frame-side-%d' % i, 'frame', 'z', [[0, 0], [0, 0.003], [0.394, 0.003], [0.394, 0]], [[-0.297, 0.297][i], 0.007, -0.197])
    for i in [0, 1]
  ] + [
    h.turned('wire-%d' % i, 'wire', 'z', [[0, 0], [0, 0.002], [0.394, 0.002], [0.394, 0]], [-0.25 + i * 0.05, 0.006, -0.197])
    for i in std.range(0, 10)
  ] + [
    h.rod('runner-%d' % i, 'frame', 0.002, -0.297, 0.297, 0.002) + { origin: [-0.297, 0.002, [-0.1, 0.1][i]] }
    for i in [0, 1]
  ], { frame: 'steel-stainless', wire: 'steel-stainless' }) + { title: 'Heavy wire rack' } + { voxelGrain: 0.002 } + { taxonomy: { category: 'household', tags: { material: ['metal'], setting: ['modern'] } } },

  // A heavy 100 mm steel butt hinge opened flat: two 3 mm leaves 36 mm wide either side of a 10 mm knuckle,
  // three countersunk screw holes in each leaf.
  h.compound('hinge', 0.23, [
    box('leaf-a', 'leaf', [-0.05, 0, -0.041], [0.05, 0.003, -0.005]),
    box('leaf-b', 'leaf', [-0.05, 0, 0.005], [0.05, 0.003, 0.041]),
    h.turned('knuckle', 'knuckle', 'x', [[0, 0], [0, 0.005], [0.1, 0.005], [0.1, 0]], [-0.05, 0.005, 0]),
  ] + [
    h.turned('pin-%d' % i, 'pin', 'x', [[0, 0], [0, 0.0035], [0.003, 0.0035], [0.003, 0]], [[-0.053, 0.05][i], 0.005, 0])
    for i in [0, 1]
  ] + [
    disc('hole-%d-%d' % [s, j], 'hole', 0.0035, 0, 0.0032, [-0.032, 0, 0.032][j], [-0.024, 0.024][s])
    for s in [0, 1]
    for j in [0, 1, 2]
  ], { leaf: 'steel-bright', knuckle: 'steel-bright', pin: 'steel-grey', hole: 'plastic-charcoal' }) + { title: 'Hinge' } + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A one-metre length of heavy flat-bottomed rail, 172 mm tall on a 150 mm foot.
  rail('length_of_rail', 66, 1) + { title: 'Length of rail' } + { voxelGrain: 0.004 } + { taxonomy: { category: 'structures', tags: { material: ['metal'], setting: ['modern'] } } },

  // A half-metre length of the same rail, sawn from a full length.
  rail('half_length_of_rail', 33, 0.5) + { title: 'Half length of rail' } + { voxelGrain: 0.004 } + { taxonomy: { category: 'structures', tags: { material: ['metal'], setting: ['modern'] } } },
]
