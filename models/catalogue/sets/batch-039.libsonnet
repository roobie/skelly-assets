local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;
local prism = h.prism;
local turned = h.turned;
// A flat offcut `t` thick lying on the floor at height `y`, its outline given as [z, x] points.
local plate(id, slot, outline, t, y=0) = prism(id, slot, 'y', outline, y, y + t);
[
  // A handful of aluminium offcuts on about 90 by 60 mm: two torn sheet pieces 2 mm thick, a bent strip of
  // angle and a 15 mm ring sawn from tube.
  h.compound('scrap_aluminum', 0.03, [
    plate('sheet-a', 'alu', [[-0.03, -0.04], [-0.008, -0.046], [0.004, -0.02], [-0.002, 0.01], [-0.024, 0.004]], 0.0015),
    plate('sheet-b', 'alu', [[0.004, 0.006], [0.026, 0.002], [0.03, 0.03], [0.016, 0.044], [0.008, 0.026]], 0.0015),
    box('angle-floor', 'alu', [0.008, 0, -0.03], [0.046, 0.0015, -0.018]),
    box('angle-wall', 'alu', [0.008, 0.0015, -0.0195], [0.046, 0.012, -0.018]),
    h.tube('ring', 'alu', 0.0062, 0.0075, -0.006, 0.009, 0.0075, 0.022),
  ], { alu: 'alu-bare' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A few brass chunks on about 90 by 70 mm: a 25 mm stub of hex bar, a short threaded pipe nipple and a
  // squashed lump of sheet.
  h.compound('scrap_brass', 0.18, [
    turned('hex-bar', 'brass', 'x', [[0, 0], [0, 0.0125], [0.028, 0.0125], [0.028, 0]], [-0.04, 0.011, -0.016]),
    prism('hex-face', 'brass', 'x', [
      [0.011 + 0.0125 * std.sin(std.pi * k / 3), -0.016 + 0.0125 * std.cos(std.pi * k / 3)]
      for k in std.range(0, 5)
    ], -0.041, -0.04),
    h.tube('nipple', 'brass', 0.0085, 0.0105, 0.0, 0.034, 0.0105, 0.014),
    h.tube('nipple-thread', 'brass', 0.0085, 0.0113, 0.0, 0.009, 0.0105, 0.014),
    plate('lump', 'brass', [[-0.03, -0.012], [-0.018, 0.02], [-0.034, 0.03], [-0.04, 0.0]], 0.006),
    plate('lump-fold', 'brass', [[-0.032, -0.006], [-0.022, 0.014], [-0.034, 0.02]], 0.004, 0.006),
  ], { brass: 'brass' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A handful of broken cast-iron shards on about 60 by 50 mm, the largest a 35 mm curved piece of a pan rim.
  h.compound('scrap_cast_iron', 0.037, [
    plate('rim-a', 'iron', [[-0.022, -0.03], [-0.016, -0.03], [-0.012, -0.012], [-0.018, -0.012]], 0.012),
    plate('rim-c', 'iron', [[-0.018, -0.012], [-0.012, -0.012], [-0.004, 0.004], [-0.01, 0.006]], 0.012),
    plate('rim-b', 'iron', [[-0.016, -0.03], [-0.006, -0.03], [-0.002, -0.012], [-0.012, -0.012]], 0.004),
    plate('shard-a', 'iron', [[0.004, -0.012], [0.018, -0.006], [0.012, 0.01], [0.0, 0.004]], 0.004),
    plate('shard-b', 'iron', [[0.012, 0.014], [0.024, 0.018], [0.02, 0.03], [0.008, 0.026]], 0.003),
    plate('shard-c', 'iron', [[-0.004, 0.012], [0.004, 0.02], [-0.006, 0.026]], 0.005),
  ], { iron: 'iron-cast' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A chunk of copper bus bar 25 by 10 mm, sheared off at about 75 mm long and bent once at a slant.
  h.compound('scrap_copper', 0.17, [
    box('bar', 'copper', [-0.036, 0, -0.0125], [0.012, 0.01, 0.0125]),
    prism('bend', 'copper', 'z', [[0.012, 0], [0.04, 0.012], [0.036, 0.021], [0.012, 0.01]], -0.0125, 0.0125),
    prism('shear', 'copper', 'z', [[-0.036, 0], [-0.036, 0.01], [-0.04, 0.006]], -0.0125, 0.0125),
  ], { copper: 'copper' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // Strips and torn pieces of tin-plate can wall 0.3 mm thick on about 80 by 50 mm, one curled and one
  // still ribbed.
  h.compound('scrap_tin', 0.019, [
    plate('sheet-a', 'tin', [[-0.024, -0.04], [-0.006, -0.036], [-0.002, -0.006], [-0.02, -0.002]], 0.0006),
  ] + [
    box('rib-%d' % i, 'tin', [-0.036 + i * 0.006, 0, 0.004], [-0.034 + i * 0.006, 0.002, 0.026])
    for i in std.range(0, 5)
  ] + [
    plate('ribbed', 'tin', [[0.004, -0.038], [0.026, -0.038], [0.026, -0.002], [0.004, -0.002]], 0.0006, 0.0006),
    h.tube('curl', 'tin', 0.009, 0.0096, 0.0, 0.03, 0.0096, 0.008),
    plate('strip', 'tin', [[0.022, 0.006], [0.028, 0.006], [0.022, 0.04], [0.016, 0.04]], 0.0006),
  ], { tin: 'steel-bright' }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A crudely forged steel spike 280 mm long, 30 mm square at the root and drawn straight to a point, with a
  // 60 by 60 mm mounting plate pierced by two bolt holes.
  h.compound('spike', 1, [
    box('plate', 'steel', [-0.14, 0, -0.03], [-0.13, 0.06, 0.03]),
    box('hole-a', 'hole', [-0.1305, 0.026, 0.018], [-0.1295, 0.034, 0.026]),
    box('hole-b', 'hole', [-0.1305, 0.026, -0.026], [-0.1295, 0.034, -0.018]),
  ] + [
    // Square sections narrowing toward the point.
    local w = 0.015 * (1 - i / 9);
    box('shank-%d' % i, 'steel', [-0.13 + i * 0.03, 0.03 - w, -w], [-0.1 + i * 0.03, 0.03 + w, w])
    for i in std.range(0, 8)
  ], { steel: 'scrap-rusted', hole: 'void-black' })
  + h.gripOn('spike', 'shank-2') + { voxelGrain: 0.004 } + { taxonomy: { category: 'materials', tags: { material: ['metal'] } } },

  // A giant insect's stinger 150 mm long, a barbed dark shaft 14 mm thick at the root, still joined by a
  // short neck to a lumpy, flattened sac of pale flesh.
  h.compound('bee_stinger', 0.038, [
    h.ball('sac-a', 'flesh', 0.016, -0.056, 0.016, 0, 0.6),
    h.ball('sac-b', 'flesh', 0.011, -0.064, 0.02, 0.009, 0.7),
    h.ball('sac-c', 'flesh', 0.011, -0.051, 0.014, -0.010, 0.6),
    h.ball('sac-d', 'flesh', 0.008, -0.067, 0.017, -0.007, 0.8),
    turned('neck', 'flesh', 'x', [[0, 0], [0, 0.005], [0.014, 0.0045], [0.014, 0]], [-0.044, 0.02, 0]),
    turned('shaft', 'chitin', 'x', [[0, 0], [0, 0.009], [0.04, 0.007], [0.1, 0.003], [0.13, 0.0], ], [-0.03, 0.022, 0]),
  ] + [
    prism('barb-%d-%d' % [i, s], 'chitin', 'z', [[0.03 + 0.02 * i, 0.022 + s * (0.006 - 0.0012 * i)], [0.044 + 0.02 * i, 0.022 + s * (0.004 - 0.001 * i)], [0.026 + 0.02 * i, 0.022 + s * (0.011 - 0.0014 * i)]], -0.003, 0.003)
    for i in std.range(0, 3)
    for s in [-1, 1]
  ] + [
    turned('root', 'root', 'x', [[0, 0], [0, 0.011], [0.008, 0.01], [0.008, 0]], [-0.032, 0.022, 0]),
  ], { flesh: 'flesh-membrane', chitin: 'chitin-black', root: 'chitin-brown' })
  + h.gripOn('bee_stinger', 'shaft') + { voxelGrain: 0.002 } + { taxonomy: { category: 'materials', tags: { material: ['bone'] } } },
]
