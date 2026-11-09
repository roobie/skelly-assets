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
// A flat ring facing +z, radii r0 to r1, `t` thick from z0, centred on [x, y].
local ringZ(id, slot, r0, r1, t, x, y, z0) = h.turned(id, slot, 'z', [[0, r0], [0, r1], [t, r1], [t, r0], [0, r0]], [x, y, z0]);
// A flat strip `w` wide lying on y between [x, z] points `a` and `b`, from y0 to y1.
local flatStrand(id, slot, a, b, w, y0, y1) =
  local dx = b[0] - a[0], dz = b[1] - a[1], len = std.sqrt(dx * dx + dz * dz);
  local nx = -dz / len * w / 2, nz = dx / len * w / 2;
  // A y prism's outline is listed as [z, x].
  h.prism(id, slot, 'y', [[a[1] + nz, a[0] + nx], [b[1] + nz, b[0] + nx], [b[1] - nz, b[0] - nx], [a[1] - nz, a[0] - nx]], y0, y1);
// A stag beetle in relief on the front (+z, or −z with `side` −1) of a ball of radius `r` centred at y = r:
// each piece stands from inside the ball to 4 mm proud of its surface.
local beetle(prefix, slot, r, side) =
  local proud(x, y) = std.sqrt(r * r - x * x - (y - r) * (y - r)) + 0.004;
  local piece(name, x0, y0, x1, y1) =
    local cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, far = proud(std.max(std.abs(x0), std.abs(x1)), cy);
    local z1 = proud(cx, cy);
    box('%s-%s' % [prefix, name], slot,
        if side > 0 then [x0, y0, far - 0.012] else [x0, y0, -z1],
        if side > 0 then [x1, y1, z1] else [x1, y1, -(far - 0.012)]);
  [
    piece('wing', -0.014, r - 0.03, 0.014, r + 0.004),
    piece('thorax', -0.011, r + 0.004, 0.011, r + 0.014),
    piece('head', -0.008, r + 0.014, 0.008, r + 0.021),
    piece('jaw-left', -0.012, r + 0.021, -0.008, r + 0.036),
    piece('jaw-right', 0.008, r + 0.021, 0.012, r + 0.036),
    piece('jaw-tip-left', -0.008, r + 0.032, -0.004, r + 0.036),
    piece('jaw-tip-right', 0.004, r + 0.032, 0.008, r + 0.036),
  ] + [
    piece('leg-%d-%s' % [i, s], if s == 'l' then -0.026 else 0.014, r - 0.022 + 0.011 * i, if s == 'l' then -0.014 else 0.026, r - 0.019 + 0.011 * i)
    for i in [0, 1, 2]
    for s in ['l', 'r']
  ];
[

  // An engraved wooden torch 500 mm long lying along x: a fluted grip bound with brass, and a brass cup at the head
  // holding a flame that never goes out.
  h.compound('everburning_torch', 0.831, [
    h.turned('shaft', 'wood', 'x', [[0, 0], [0, 0.015], [0.01, 0.016], [0.36, 0.019], [0.4, 0.024], [0.4, 0]], [-0.2, 0, 0]),
    h.tube('band-butt', 'brass', 0.0, 0.018, -0.196, -0.184),
    h.tube('band-grip', 'brass', 0.0, 0.019, -0.06, -0.05),
    h.tube('band-neck', 'brass', 0.0, 0.023, 0.17, 0.186),
    h.turned('cup', 'brass', 'x', [[0, 0], [0, 0.024], [0.04, 0.034], [0.046, 0.036], [0.046, 0]], [0.2, 0, 0]),
    h.turned('flame', 'flame', 'x', [[0, 0], [0, 0.03], [0.02, 0.028], [0.045, 0.018], [0.065, 0.006], [0.075, 0]], [0.246, 0, 0]),
    h.turned('flame-core', 'core', 'x', [[0, 0], [0, 0.016], [0.02, 0.012], [0.035, 0]], [0.256, 0, 0]),
  ] + [
    // Engraved rings and a spiral of carved bands between the grip and the neck.
    local x = -0.04 + 0.03 * i;
    h.tube('carving-%d' % i, 'carve', 0.0, 0.0175 + 0.003 * (x + 0.19) / 0.35, x, x + 0.006)
    for i in std.range(0, 6)
  ], { wood: 'wood-oak', brass: 'brass-dull', carve: 'wood-walnut', flame: 'glow-flame', core: 'cloth-yellow' }) + {
    handling: { part: 'everburning_torch', solid: 'shaft', fraction: [0.3, 0.5, 0.5], turn: [0, 0, 0], hold: 'upright', rest: 'upright', roll: 0 },
    anchors: { flame: { part: 'everburning_torch', solid: 'flame', fraction: [0.5, 0.5, 0.5] } },
  } + { taxonomy: { tags: { setting: ['fantasy'] } } },

  // A slender wooden wand 380 mm long lying along x, tapering from a carved grip to a fine tip, with a brass socket
  // at its base holding a mana crystal.
  h.compound('crystal_socket_wand', 0.23, [
    h.turned('crystal', 'crystal', 'x', [[0, 0], [0.012, 0.009], [0.03, 0.009], [0.03, 0]], [-0.19, 0, 0]),
    h.turned('socket', 'brass', 'x', [[0, 0], [0, 0.011], [0.008, 0.012], [0.022, 0.009], [0.022, 0]], [-0.162, 0, 0]),
    h.turned('grip', 'wood', 'x', [[0, 0], [0, 0.009], [0.1, 0.0095], [0.11, 0.0075], [0.11, 0]], [-0.14, 0, 0]),
    h.turned('shaft', 'wood', 'x', [[0, 0], [0, 0.0075], [0.22, 0.004], [0.22, 0]], [-0.03, 0, 0]),
    h.tube('collar', 'brass', 0.0, 0.0095, -0.035, -0.027),
  ] + [
    h.tube('grip-ring-%d' % i, 'carve', 0.0, 0.0105, -0.13 + 0.02 * i, -0.124 + 0.02 * i)
    for i in std.range(0, 4)
  ], { wood: 'wood-walnut', carve: 'wood-oak', brass: 'brass-dull', crystal: 'crystal-glow-blue' }) + {
    handling: h.gripOn('crystal_socket_wand', 'grip'),
    voxelGrain: 0.002,
  },
]
