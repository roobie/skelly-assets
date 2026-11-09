local h = import '../compound.libsonnet';
local box = h.box;
local turned = h.turned;
local disc = h.disc;
// A ring of radii r0 to r1 and `t` long about `axis`, starting at `origin`; it closes on its first point so the
// hole stays open.
local ring(id, slot, axis, r0, r1, t, origin) = turned(id, slot, axis, [[0, r0], [0, r1], [t, r1], [t, r0], [0, r0]], origin);
// A loop handle on a cup's +x side: a ring about z, `w` wide, centred at (cx, cy).
local loop(id, slot, cx, cy, r0, r1, w) = ring(id, slot, 'z', r0, r1, w, [cx, cy, -w / 2]);
// A wire bail of `n` small blocks arched over a pot in the xy plane, radius `r` about (0, cy), `s` thick.
local bail(prefix, slot, r, cy, s, n=14) = [
  local a = std.pi * i / n;
  box('%s-%d' % [prefix, i], slot, [r * std.cos(a) - s / 2, cy + r * std.sin(a) - s / 2, -s / 2], [r * std.cos(a) + s / 2, cy + r * std.sin(a) + s / 2, s / 2])
  for i in std.range(0, n)
];
// A flat fork 210 mm long lying along x, head at +x: a handle tapering into a neck, a head and four tines.
local forkPieces(t) = [
  h.prism('handle', 'fork', 'y', [[-0.0095, 0], [0.0095, 0], [0.0095, 0.012], [0.006, 0.11], [-0.006, 0.11], [-0.0095, 0.012]], 0, t),
  h.prism('neck', 'fork', 'y', [[-0.006, 0.11], [0.006, 0.11], [0.012, 0.15], [-0.012, 0.15]], 0, t),
  box('head', 'fork', [0.15, 0, -0.012], [0.165, t, 0.012]),
] + [
  box('tine-%d' % i, 'fork', [0.165, 0, -0.012 + i * 0.007], [0.21, t, -0.009 + i * 0.007])
  for i in std.range(0, 3)
];
[

  // A wooden chopping board 410 by 250 mm and 20 mm thick lying flat, with a hanging slot at its +x end.
  h.compound('cutting_board', 0.455, [
    box('board', 'wood', [-0.205, 0, -0.125], [0.155, 0.02, 0.125]),
    box('end', 'wood', [0.185, 0, -0.125], [0.205, 0.02, 0.125]),
    box('side-a', 'wood', [0.155, 0, -0.125], [0.185, 0.02, -0.03]),
    box('side-b', 'wood', [0.155, 0, 0.03], [0.185, 0.02, 0.125]),
  ], { wood: 'wood-birch' })
  + { voxelGrain: 0.004 } + { taxonomy: { category: 'household', tags: { material: ['wood'] } } },

  // An enamelled cast-iron pot 210 mm across and 120 mm tall with a lug handle at each side, black outside and
  // cream enamel inside; 250 mm over the lugs.
  h.compound('iron_pot', 2.49, [
    turned('shell', 'iron', 'y', [[0, 0], [0, 0.1], [0.008, 0.105], [0.12, 0.105], [0.12, 0.1], [0.012, 0.1], [0.012, 0]]),
    turned('enamel', 'enamel', 'y', [[0.012, 0], [0.012, 0.1], [0.12, 0.1], [0.12, 0.096], [0.016, 0.096], [0.016, 0]]),
    box('lug-a', 'iron', [-0.125, 0.09, -0.03], [-0.1, 0.106, 0.03]),
    box('lug-b', 'iron', [0.1, 0.09, -0.03], [0.125, 0.106, 0.03]),
  ], { iron: 'iron-cast', enamel: 'paint-cream' })
  + { voxelGrain: 0.004 } + { taxonomy: { category: 'household', tags: { material: ['metal'] } } },
]
