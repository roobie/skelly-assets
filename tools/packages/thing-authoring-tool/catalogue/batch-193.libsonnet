local h = import '../compound.libsonnet';
local box = h.box;
// A ball of radius `r` turned about y, its centre at [x, y, z]; `squash` scales its height.
local ball(id, slot, r, x, y, z, squash=1, steps=8) =
  local pts = [
    local a = std.pi * i / steps;
    [r * squash * (1 - std.cos(a)), r * std.sin(a)]
    for i in std.range(0, steps)
  ];
  h.turned(id, slot, 'y', [[0, 0]] + pts[1:std.length(pts) - 1] + [[2 * r * squash, 0]], [x, y - r * squash, z]);
// A straight strand `w` wide from [x, y] point `a` to `b`, standing from z0 to z1: strings, cables and struts that run
// at a slant across the xy plane.
local strand(id, slot, a, b, w, z0, z1) =
  local dx = b[0] - a[0], dy = b[1] - a[1], len = std.sqrt(dx * dx + dy * dy);
  local nx = -dy / len * w / 2, ny = dx / len * w / 2;
  h.prism(id, slot, 'z', [[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]], z0, z1);
// A toothed wheel facing +z: a disc of radius `r` from z0 to z1 with `n` square teeth round its rim.
local gear(prefix, slot, r, n, x, y, z0, z1) =
  [h.turned(prefix, slot, 'z', [[0, 0], [0, r], [z1 - z0, r], [z1 - z0, 0]], [x, y, z0])] + [
    local a = 2 * std.pi * i / n, t = r * 0.18;
    local cx = x + (r + t / 2) * std.cos(a), cy = y + (r + t / 2) * std.sin(a);
    box('%s-tooth-%d' % [prefix, i], slot, [cx - t / 2, cy - t / 2, z0], [cx + t / 2, cy + t / 2, z1])
    for i in std.range(0, n - 1)
  ];
// The rune-engine's steel case, 400 mm wide, 250 mm tall and 200 mm deep, with a porthole on its front onto the
// rune pebble, coils and cables on top and a geared drum on its right side. `core` is the pebble's slot.
local runeEngine = [
  box('case', 'steel', [-0.2, 0.0, -0.1], [0.2, 0.25, 0.1]),
  box('lid-seam', 'trim', [-0.202, 0.226, -0.102], [0.202, 0.232, 0.102]),
  h.turned('port-rim', 'trim', 'z', [[0, 0.05], [0, 0.068], [0.008, 0.068], [0.008, 0.05], [0, 0.05]], [-0.06, 0.12, 0.1]),
  h.turned('port-glass', 'glass', 'z', [[0, 0], [0, 0.05], [0.004, 0.05], [0.004, 0]], [-0.06, 0.12, 0.1]),
  ball('core', 'core', 0.03, -0.06, 0.12, 0.1, 0.8),
  box('core-mark-a', 'rune', [-0.066, 0.1, 0.13], [-0.054, 0.14, 0.134]),
  box('core-mark-b', 'rune', [-0.08, 0.114, 0.13], [-0.04, 0.126, 0.134]),
  // Runes inscribed round the port and along the case's front.
  box('rune-row-top', 'rune', [-0.18, 0.205, 0.1], [0.18, 0.211, 0.104]),
  box('rune-row-low', 'rune', [-0.18, 0.026, 0.1], [0.18, 0.032, 0.104]),
] + [
  box('glyph-%d' % i, 'rune', [0.04 + 0.04 * i, 0.07 + 0.02 * (i % 2), 0.1], [0.052 + 0.04 * i, 0.17 - 0.02 * (i % 2), 0.104])
  for i in [0, 1, 2]
] + [
  box('glyph-bar-%d' % i, 'rune', [0.03 + 0.04 * i, 0.114, 0.1], [0.062 + 0.04 * i, 0.122, 0.104])
  for i in [0, 1, 2]
] + [
  // Two electromagnet coils standing on the lid, wound in copper on dark cores.
  h.disc('coil-a', 'copper', 0.032, 0.25, 0.31, -0.12, -0.03),
  h.disc('coil-a-cap', 'dark', 0.036, 0.31, 0.318, -0.12, -0.03),
  h.disc('coil-b', 'copper', 0.032, 0.25, 0.31, -0.03, -0.03),
  h.disc('coil-b-cap', 'dark', 0.036, 0.31, 0.318, -0.03, -0.03),
  // A carry handle.
  box('handle-left', 'dark', [0.06, 0.25, -0.012], [0.072, 0.29, 0.012]),
  box('handle-right', 'dark', [0.148, 0.25, -0.012], [0.16, 0.29, 0.012]),
  box('handle-grip', 'dark', [0.06, 0.29, -0.014], [0.16, 0.304, 0.014]),
  // Cables looping from the coils over the case's front edge into the side.
  strand('cable-a', 'cable', [-0.12, 0.318], [-0.075, 0.33], 0.01, 0.03, 0.042),
  strand('cable-b', 'cable', [-0.075, 0.33], [-0.03, 0.318], 0.01, 0.03, 0.042),
  box('cable-c', 'cable', [-0.03, 0.25, 0.06], [0.04, 0.26, 0.072]),
  strand('cable-d', 'cable', [0.04, 0.26], [0.2, 0.2], 0.012, 0.06, 0.072),
] + [
  // A geared drum turning on the right side of the case.
  h.turned('drum', 'trim', 'x', [[0, 0], [0, 0.05], [0.02, 0.05], [0.02, 0]], [0.2, 0.12, -0.02]),
] + [
  local a = 2 * std.pi * i / 12, r = 0.054;
  box('drum-tooth-%d' % i, 'trim', [0.2, 0.12 + r * std.sin(a) - 0.006, -0.02 + r * std.cos(a) - 0.006], [0.218, 0.12 + r * std.sin(a) + 0.006, -0.02 + r * std.cos(a) + 0.006])
  for i in std.range(0, 11)
] + [
  h.turned('drum-hub', 'copper', 'x', [[0, 0], [0, 0.014], [0.03, 0.014], [0.03, 0]], [0.2, 0.12, -0.02]),
  // Feet.
  box('foot-a', 'dark', [-0.19, -0.01, -0.09], [-0.15, 0.0, 0.09]),
  box('foot-b', 'dark', [0.15, -0.01, -0.09], [0.19, 0.0, 0.09]),
];
[

  // A fired clay tablet 160 mm long, 110 mm wide and 26 mm thick, lying flat, with a raised border and a rune of
  // circuit-like lines glazed into its face.
  h.compound('rune_clay_tablet', 0.969, [
    box('slab', 'clay', [-0.08, 0.0, -0.055], [0.08, 0.026, 0.055]),
    box('border-front', 'clay', [-0.074, 0.026, 0.044], [0.074, 0.03, 0.05]),
    box('border-back', 'clay', [-0.074, 0.026, -0.05], [0.074, 0.03, -0.044]),
    box('border-left', 'clay', [-0.074, 0.026, -0.05], [-0.068, 0.03, 0.05]),
    box('border-right', 'clay', [0.068, 0.026, -0.05], [0.074, 0.03, 0.05]),
    // The rune: a ring with a spine through it and three branching traces, each ending in a dot.
    h.turned('rune-ring', 'rune', 'y', [[0, 0.016], [0, 0.022], [0.003, 0.022], [0.003, 0.016], [0, 0.016]], [0, 0.026, 0]),
    box('rune-spine', 'rune', [-0.003, 0.026, -0.036], [0.003, 0.029, 0.036]),
    box('trace-a', 'rune', [0.022, 0.026, -0.003], [0.052, 0.029, 0.003]),
    box('trace-a-up', 'rune', [0.046, 0.026, -0.03], [0.052, 0.029, 0.003]),
    box('trace-b', 'rune', [-0.052, 0.026, 0.012], [-0.022, 0.029, 0.018]),
    box('trace-b-down', 'rune', [-0.052, 0.026, 0.012], [-0.046, 0.029, 0.034]),
    box('trace-c', 'rune', [-0.05, 0.026, -0.026], [-0.018, 0.029, -0.02]),
    h.disc('dot-a', 'rune', 0.005, 0.026, 0.03, 0.049, -0.032),
    h.disc('dot-b', 'rune', 0.005, 0.026, 0.03, -0.049, 0.036),
    h.disc('dot-c', 'rune', 0.005, 0.026, 0.03, -0.052, -0.023),
  ], { clay: 'clay-terracotta', rune: 'gem-aquamarine' }) + h.inHand('rune_clay_tablet', 'slab') + { voxelGrain: 0.002 },
]
