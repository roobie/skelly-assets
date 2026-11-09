local h = import '../compound.libsonnet';
local box = h.box;
local rad(deg) = deg * std.pi / 180;

// A closed ring turned about y from y0 to y1 between radii r0 and r1, centred on (x, z).
local ring(id, slot, r0, r1, y0, y1, x=0, z=0) = h.turned(id, slot, 'y', [[0, r0], [0, r1], [y1 - y0, r1], [y1 - y0, r0], [0, r0]], [x, y0, z]);

// A torus about y: a tube of radius `r` bent round a circle of radius `R` at height y. Off-axis, so the outline closes.
local torus(id, slot, R, r, y, n=10) =
  local pts = [[r * std.sin(2 * std.pi * i / n), R + r * std.cos(2 * std.pi * i / n)] for i in std.range(0, n - 1)];
  h.turned(id, slot, 'y', pts + [pts[0]], [0, y, 0]);

// A flat convex outline [[x, z]...] standing on y from y0 to y1.
local flat(id, slot, outline, y0, y1) = h.prism(id, slot, 'y', [[p[1], p[0]] for p in outline], y0, y1);

// A half-oval bill reaching forward from radius `r` on the crown to `reach` at the front, `half` wide, for caps.
local bill(id, slot, r, reach, half, y0, y1, n=8) =
  flat(id, slot, [[r * 0.2, 0]] + [
    [half * std.cos(rad(180 * i / n)), r * 0.2 + (reach - r * 0.2) * std.sin(rad(180 * i / n))]
    for i in std.range(0, n)
  ], y0, y1);

// An arc band in the y-z plane about centre (cy, cz), radii r0..r1, from a0 to a1 degrees off straight up (+z
// forward), `w` wide across x: ridges over a crown and straps over the top of the head.
local arcX(prefix, slot, r0, r1, a0, a1, steps, w, cy=0, cz=0, cx=0) = [
  local t0 = rad(a0 + (a1 - a0) * i / steps), t1 = rad(a0 + (a1 - a0) * (i + 1) / steps);
  local p(r, t) = [cy + r * std.cos(t), cz + r * std.sin(t)];
  h.prism('%s-%d' % [prefix, i], slot, 'x', [p(r0, t0), p(r1, t0), p(r1, t1), p(r0, t1)], cx - w / 2, cx + w / 2)
  for i in std.range(0, steps - 1)
];

// The same arc in the x-y plane, across the head from side to side.
local arcZ(prefix, slot, r0, r1, a0, a1, steps, w, cy=0, cz=0) = [
  local t0 = rad(a0 + (a1 - a0) * i / steps), t1 = rad(a0 + (a1 - a0) * (i + 1) / steps);
  local p(r, t) = [r * std.sin(t), cy + r * std.cos(t)];
  h.prism('%s-%d' % [prefix, i], slot, 'z', [p(r0, t0), p(r1, t0), p(r1, t1), p(r0, t1)], cz - w / 2, cz + w / 2)
  for i in std.range(0, steps - 1)
];

// Vertical ribs of radius `r` round a circle of radius `R` from y0 to y1: pleats, knit ribbing, fur tufts.
local ribs(prefix, slot, n, R, r, y0, y1) = [
  h.disc('%s-%d' % [prefix, i], slot, r, y0, y1, R * std.sin(2 * std.pi * i / n), R * std.cos(2 * std.pi * i / n))
  for i in std.range(0, n - 1)
];

// A hard hat standing on its rim, peak on +z: a domed shell 200 mm across, a narrow rim, a peak and a raised ridge
// front to back with a lower rib either side. Slot: shell. Rises `y0` off the floor.
local hardHat(y0) =
  local a = 0.1, ht = 0.12, R = (a * a + ht * ht) / (2 * ht), c = ht - R;
  [
    h.dome('crown', 'shell', a, ht, 0.004, 'y', [0, y0, 0], 10),
    ring('rim', 'shell', 0.096, 0.11, y0, y0 + 0.01),
    bill('peak', 'shell', 0.1, 0.175, 0.095, y0 + 0.004, y0 + 0.012),
  ]
  + arcX('ridge', 'shell', R - 0.004, R + 0.01, -62, 62, 10, 0.018, y0 + c)
  + arcX('rib-l', 'shell', R - 0.004, R + 0.005, -55, 55, 10, 0.008, y0 + c, 0, -0.045)
  + arcX('rib-r', 'shell', R - 0.004, R + 0.005, -55, 55, 10, 0.008, y0 + c, 0, 0.045);

// A dried-plant leaf lying flat on the wreath at angle `t` round it, turned `tilt` off the ring's tangent.
local leaf(id, slot, R, t, tilt, l, w, y0) =
  local cx = R * std.sin(t), cz = R * std.cos(t), along = t + rad(90 + tilt);
  local ux = std.sin(along), uz = std.cos(along), vx = std.sin(along + std.pi / 2), vz = std.cos(along + std.pi / 2);
  flat(id, slot, [
    [cx - ux * l / 2, cz - uz * l / 2],
    [cx + vx * w / 2, cz + vz * w / 2],
    [cx + ux * l / 2, cz + uz * l / 2],
    [cx - vx * w / 2, cz - vz * w / 2],
  ], y0, y0 + 0.004);

// Fur hat crown, for the fur hat and its faux-fur variant: a tall round drum of pile 210 mm across with tufted sides and
// a cloth top set in. Slots: fur, top.
local furHat = [
  h.turned('pile', 'fur', 'y', [[0, 0], [0, 0.098], [0.008, 0.104], [0.12, 0.11], [0.132, 0.104], [0.138, 0.09], [0.128, 0.084], [0.128, 0]]),
  h.turned('top', 'top', 'y', [[0, 0], [0, 0.09], [0.008, 0.088], [0.014, 0.06], [0.016, 0]], [0, 0.126, 0]),
] + ribs('tuft', 'fur', 22, 0.104, 0.008, 0.01, 0.128);

[

  // A snug cotton knit hat standing upright, 180 mm tall: a rounded crown over a ribbed cuff turned up at the brow.
  h.compound('hat_cotton', 0.078, [
    h.turned('crown', 'knit', 'y', [[0, 0], [0, 0.085], [0.1, 0.085], [0.148, 0.066], [0.172, 0.036], [0.18, 0]]),
    ring('cuff', 'cuff', 0.084, 0.092, 0, 0.05),
  ] + ribs('rib', 'cuff', 30, 0.092, 0.0035, 0, 0.05), { knit: 'cloth-red', cuff: 'cloth-red' })
  + { voxelGrain: 0.004, taxonomy: { category: 'clothing', tags: { slot: ['head'], material: ['fabric'] } } },
]
