local h = import '../compound.libsonnet';
local box = h.box;
local turned = h.turned;
local prism = h.prism;
// A prism on y from an [x, z] outline (the y axis takes [z, x]).
local flat(id, slot, outline, y0, y1) = prism(id, slot, 'y', [[p[1], p[0]] for p in outline], y0, y1);
// A straight strip in the xz plane from a to b, w wide and lying from y0 to y1.
local bar(id, slot, a, b, w, y0, y1) =
  local dx = b[0] - a[0], dz = b[1] - a[1], l = std.sqrt(dx * dx + dz * dz);
  local nx = -dz / l * w / 2, nz = dx / l * w / 2;
  flat(id, slot, [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], y0, y1);
// A wrap of lashing round a haft along x at x, radius r, w wide.
local wrap(id, x, r, w) = turned(id, 'lashing', 'x', [[0, 0], [0, r], [w, r], [w, 0]], [x - w / 2, 0, 0]);
// A turned haft along x, L long and r thick, swelling to a knob at the butt; split into grip and haft so the hand
// takes the lower third.
local haft(L, r) = [
  turned('grip', 'haft', 'x', [[0, 0], [0, r * 1.3], [0.02, r * 1.2], [0.04, r], [L * 0.35, r * 0.9], [L * 0.35, 0]]),
  turned('haft', 'haft', 'x', [[0, 0], [0, r * 0.9], [L * 0.45, r * 0.85], [L * 0.65, r * 0.95], [L * 0.65, 0]], [L * 0.35, 0, 0]),
];
// A forged axe head lying flat at the top of a haft L long, blade on +z: an eye e long and t half-thick, cheeks
// running out to an edge `edge` long at `reach`, and a poll behind the eye. A bearded edge drops toward the hand.
// Slots: head, edge, poll.
local axeHead(L, e, t, reach, edge, poll) =
  local hx = L - e / 2 - 0.008, x0 = hx - edge * 0.62, x1 = hx + edge * 0.38;
  [
    box('eye', 'head', [hx - e / 2, -t, -0.004], [hx + e / 2, t, 0.026]),
    box('poll', 'poll', [hx - e / 2, -t * 1.05, -poll], [hx + e / 2, t * 1.05, -0.004]),
    flat('cheek', 'head', [[hx - e / 2, 0.026], [hx + e / 2, 0.026], [x1, reach - 0.014], [x0, reach - 0.014]], -t * 0.6, t * 0.6),
    flat('edge', 'edge', [[x0, reach - 0.014], [x1, reach - 0.014], [x1 + 0.004, reach], [x0 - 0.004, reach]], -t * 0.25, t * 0.25),
  ];
// A ground stone celt lying flat at x, butt at -z and edge at +z: a thick core, thinner faces and a bevelled edge.
// Slot: stone.
local celt(prefix, x, z0, z1, wb, we, t) =
  local zm = z0 + (z1 - z0) * 0.55;
  [
    flat(prefix + '-face', 'stone', [[x - wb / 2, z0], [x + wb / 2, z0], [x + we * 0.5, zm], [x + we * 0.5, z1 - 0.012], [x - we * 0.5, z1 - 0.012], [x - we * 0.5, zm]], -t * 0.6, t * 0.6),
    flat(prefix + '-core', 'stone', [[x - wb * 0.3, z0 + 0.004], [x + wb * 0.3, z0 + 0.004], [x + we * 0.3, zm], [x + we * 0.26, z1 - 0.02], [x - we * 0.26, z1 - 0.02], [x - we * 0.3, zm]], -t, t),
    flat(prefix + '-butt', 'stone', [[x - wb * 0.35, z0 - 0.008], [x + wb * 0.35, z0 - 0.008], [x + wb / 2, z0], [x - wb / 2, z0]], -t * 0.6, t * 0.6),
    flat(prefix + '-bevel', 'stone', [[x - we * 0.5, z1 - 0.012], [x + we * 0.5, z1 - 0.012], [x + we * 0.47, z1], [x - we * 0.47, z1]], -t * 0.35, t * 0.35),
  ];
// An arc of convex quads in the xy plane round (cx, cy), radii r0 to r1, from angle a0 to a1 degrees, spanning z0
// to z1; for blade guards. Points are [x, y].
local arc(prefix, slot, r0, r1, a0, a1, steps, cx, cy, z0, z1) =
  local ang(i) = (a0 + (a1 - a0) * i / steps) * std.pi / 180;
  local pt(r, i) = [cx + r * std.cos(ang(i)), cy + r * std.sin(ang(i))];
  [
    prism('%s-%d' % [prefix, i], slot, 'z', [pt(r0, i), pt(r1, i), pt(r1, i + 1), pt(r0, i + 1)], z0, z1)
    for i in std.range(0, steps - 1)
  ];
// A flat ring turned about `axis`, `t` thick from radius r0 to r1.
local ring(id, slot, axis, r0, r1, t, origin) = turned(id, slot, axis, [[0, r0], [0, r1], [t, r1], [t, r0], [0, r0]], origin);
// A chainsaw standing on its base with the bar to +x on the +z side: a powerhead, a closed rear handle with its
// trigger, a wrap handle over the top, the chain brake guard in front of it, and a bar and chain 0.48 m long.
// `engine` adds a pull starter and fuel cap; otherwise a battery sits in the top. Slots: body, cover, handle, grip,
// guard, bar, chain, sprocket, starter, battery.
local chainsaw(engine) =
  local by = 0.10, bz = 0.098;
  local barOutline(grow) = [
    [0.06, by - 0.036 - grow], [0.55, by - 0.024 - grow], [0.568 + grow * 0.7, by - 0.016 - grow * 0.7], [0.578 + grow, by],
    [0.568 + grow * 0.7, by + 0.016 + grow * 0.7], [0.55, by + 0.024 + grow], [0.06, by + 0.036 + grow],
  ];
  [
    box('body', 'body', [-0.14, 0.012, -0.085], [0.10, 0.20, 0.080]),
    box('base', 'handle', [-0.14, 0, -0.080], [0.10, 0.012, 0.075]),
    box('cover', 'cover', [-0.10, 0.20, -0.075], [0.08, 0.235, 0.070]),
    box('sprocket-cover', 'sprocket', [0.0, 0.035, 0.080], [0.13, 0.165, 0.092]),
    prism('bar', 'bar', 'z', barOutline(0), bz - 0.0045, bz + 0.0045),
    prism('chain', 'chain', 'z', barOutline(0.010), bz - 0.0032, bz + 0.0032),
    box('spike', 'handle', [0.10, 0.03, 0.070], [0.112, 0.17, 0.094]),
    // Closed rear handle.
    turned('rear-grip', 'grip', 'x', [[0, 0], [0, 0.016], [0.10, 0.016], [0.10, 0]], [-0.24, 0.165, 0]),
    box('rear-post', 'handle', [-0.245, 0, -0.016], [-0.222, 0.180, 0.016]),
    box('rear-foot', 'handle', [-0.245, 0, -0.018], [-0.14, 0.024, 0.018]),
    box('trigger', 'handle', [-0.20, 0.128, -0.007], [-0.165, 0.150, 0.007]),
    // Wrap handle over the top and down the left side.
    turned('loop-top', 'handle', 'z', [[0, 0], [0, 0.014], [0.20, 0.014], [0.20, 0]], [0.045, 0.285, -0.12]),
    box('loop-right', 'handle', [0.033, 0.20, 0.068], [0.057, 0.297, 0.082]),
    box('loop-left', 'handle', [0.033, 0.03, -0.132], [0.057, 0.297, -0.110]),
    box('loop-foot', 'handle', [0.033, 0.03, -0.12], [0.057, 0.05, -0.085]),
    box('brake', 'guard', [0.085, 0.215, -0.10], [0.095, 0.31, 0.075]),
  ] + (if engine then [
         box('starter-cover', 'cover', [-0.11, 0.04, -0.105], [0.0, 0.18, -0.085]),
         turned('starter-grip', 'starter', 'x', [[0, 0], [0, 0.009], [0.06, 0.009], [0.06, 0]], [-0.085, 0.20, -0.112]),
         h.disc('fuel-cap', 'starter', 0.018, 0.235, 0.248, -0.06, -0.03),
         box('muffler', 'chain', [0.06, 0.05, -0.084], [0.10, 0.12, -0.03]),
       ] else [
         box('battery', 'battery', [-0.11, 0.17, -0.055], [0.0, 0.25, 0.050]),
         box('battery-latch', 'cover', [-0.115, 0.20, -0.03], [-0.105, 0.24, 0.03]),
       ]);
[

  // A 15 inch carpenter's hatchet: a 380 mm haft and a head with a 95 mm edge and a square hammer poll.
  h.compound('hatchet', 0.907, haft(0.38, 0.014) + axeHead(0.38, 0.075, 0.016, 0.11, 0.095, 0.030), {
    haft: 'wood-walnut', head: 'steel-blued', poll: 'steel-grey', edge: 'steel-bright',
  }) + { handling: h.gripOn('hatchet', 'grip'), voxelGrain: 0.004 },

  // A 560 mm stone axe lying flat: a ground stone celt through a split stick, bound above and below with rawhide.
  h.compound('primitive_axe', 0.822, haft(0.56, 0.016) + celt('celt', 0.50, -0.045, 0.11, 0.040, 0.070, 0.015) + [
    wrap('lash-a', 0.462, 0.0185, 0.022),
    wrap('lash-b', 0.538, 0.0185, 0.018),
  ], { haft: 'wood-birch', stone: 'stone-grey', lashing: 'skin-rawhide' })
  + { handling: h.gripOn('primitive_axe', 'grip'), voxelGrain: 0.004 },
]
