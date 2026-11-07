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
// A straight strand `w` wide from [x, y] point `a` to `b`, standing from z0 to z1.
local strand(id, slot, a, b, w, z0, z1) =
  local dx = b[0] - a[0], dy = b[1] - a[1], len = std.sqrt(dx * dx + dy * dy);
  local nx = -dy / len * w / 2, ny = dx / len * w / 2;
  h.prism(id, slot, 'z', [[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]], z0, z1);
// The same strand slanting across the zy plane, standing from x0 to x1.
local strandZ(id, slot, a, b, w, x0, x1) =
  local dz = b[0] - a[0], dy = b[1] - a[1], len = std.sqrt(dz * dz + dy * dy);
  local nz = -dy / len * w / 2, ny = dz / len * w / 2;
  h.prism(id, slot, 'x', [[a[1] + ny, a[0] + nz], [a[1] - ny, a[0] - nz], [b[1] - ny, b[0] - nz], [b[1] + ny, b[0] + nz]], x0, x1);
// A carved wooden torch standing on y from y0, `len` long, with a bound head and a flame on top. Slots: wood, band,
// head, flame.
local torch(prefix, x, y0, z, len, r=0.016) = [
  h.turned(prefix + '-shaft', 'wood', 'y', [[0, 0], [0, r * 0.75], [len * 0.6, r * 0.9], [len, r]], [x, y0, z]),
  h.turned(prefix + '-ring-a', 'band', 'y', [[0, 0], [0, r * 0.95], [0.006, r * 0.95], [0.006, 0]], [x, y0 + len * 0.3, z]),
  h.turned(prefix + '-ring-b', 'band', 'y', [[0, 0], [0, r * 1.0], [0.006, r * 1.0], [0.006, 0]], [x, y0 + len * 0.55, z]),
  h.turned(prefix + '-head', 'head', 'y', [[0, 0], [0, r * 1.3], [r * 3, r * 1.45], [r * 3.2, r * 1.2], [r * 3.2, 0]], [x, y0 + len, z]),
  h.turned(prefix + '-flame', 'flame', 'y', [[0, 0], [0, r * 1.15], [r * 1.5, r * 1.3], [r * 3.5, r * 0.8], [r * 5, r * 0.3], [r * 5.6, 0]], [x, y0 + len + r * 3.2, z]),
];
// A flat bar `w` wide and `t` deep lying at height y, from the column at [0, 0] out to radius `len` at angle `a`
// (radians from +x towards +z); a y prism's outline lists [z, x].
local spoke(id, slot, len, a, w, y, t) =
  local c = std.cos(a), s = std.sin(a), nx = -s * w / 2, nz = c * w / 2;
  h.prism(id, slot, 'y', [[nz, nx], [-nz, -nx], [len * s - nz, len * c - nx], [len * s + nz, len * c + nx]], y, y + t);
// One planet on its arm: a bar out from a collar on the column at height y, a short upright pin at its end and a ball
// of radius r on the pin.
local planet(prefix, slot, len, a, y, r) =
  local px = len * std.cos(a), pz = len * std.sin(a);
  [
    h.disc(prefix + '-collar', 'steel', 0.018, y - 0.004, y + 0.01),
    spoke(prefix + '-arm', 'steel', len, a, 0.008, y, 0.006),
    h.disc(prefix + '-pin', 'steel', 0.003, y + 0.006, y + 0.03, px, pz),
    ball(prefix, slot, r, px, y + 0.03 + r, pz),
  ];
[
  // A slender carved wooden wand 380 mm long, 16 mm across at its butt, tapering to a 6 mm tip, with a pale crystal
  // set into a brass collar at its butt end.
  h.compound('crystal_butt_wand', 0.23, [
    h.turned('shaft', 'wood', 'x', [[0, 0], [0, 0.008], [0.12, 0.0075], [0.34, 0.003], [0.35, 0]], [-0.16, 0.012, 0]),
    h.turned('grip', 'grip', 'x', [[0, 0], [0, 0.0088], [0.09, 0.0084], [0.09, 0]], [-0.15, 0.012, 0]),
    h.turned('collar', 'brass', 'x', [[0, 0], [0, 0.0095], [0.014, 0.0095], [0.014, 0]], [-0.17, 0.012, 0]),
    h.turned('crystal', 'crystal', 'x', [[0, 0], [0.006, 0.008], [0.02, 0.008], [0.02, 0]], [-0.19, 0.012, 0]),
    h.turned('band-a', 'brass', 'x', [[0, 0], [0, 0.0072], [0.004, 0.0072], [0.004, 0]], [-0.05, 0.012, 0]),
    h.turned('band-b', 'brass', 'x', [[0, 0], [0, 0.0058], [0.004, 0.0058], [0.004, 0]], [0.04, 0.012, 0]),
  ], { wood: 'wood-walnut', grip: 'leather-brown', brass: 'brass-dull', crystal: 'crystal-glow-blue' }) + { handling: h.gripOn('crystal_butt_wand', 'grip') } + { voxelGrain: 0.002 },
]
