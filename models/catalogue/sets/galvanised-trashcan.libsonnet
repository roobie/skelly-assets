// A classic US galvanised steel trash can, about 30 gallons, whole and kicked in. Both are drawn by one `can` from one
// set of measures, so the kicked can is the same can deformed rather than a second design. Pieces cannot bend, so the
// kick is a band of the wall rebuilt as a ring of quads pushed in where it was struck, the lean is each band of the wall
// stepped sideways under the rib that hides the step, and the lid is tipped on its port rather than turned.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';

// Metres. The wall tapers from `base` at the floor to `top` under the rolled rim, with pairs of pressed ribs round it.
local measures = {
  height: 0.69,
  base: 0.215,
  top: 0.24,
  wall: 0.006,
  sides: 24,
  foot: { height: 0.045, proud: 0.007 },
  rim: { height: 0.022, proud: 0.012 },
  // Each rib pair's middle height; a rib is `rise` proud over `width`, its flanks `ramp` long, the pair `gap` apart.
  ribs: { at: [0.13, 0.39, 0.57], rise: 0.008, width: 0.014, ramp: 0.006, gap: 0.034 },
  handle: { y: 0.6, reach: 0.034, span: 0.12, bar: 0.007 },
  lid: { skirt: 0.032, clearance: 0.003, crown: 0.07, handle: { y: 0.04, span: 0.15, bar: 0.009 } },
  mass: { body: 5.6, lid: 1.4 },
};

local cosd(a) = std.cos(a * std.pi / 180), sind(a) = std.sin(a * std.pi / 180);
// The wall's outer radius at height y, ribs included: the taper plus each rib as a flat-topped trapezoid.
local ribHalf = measures.ribs.gap / 2 + measures.ribs.width / 2 + measures.ribs.ramp;
local taper(y) = measures.base + (measures.top - measures.base) * y / measures.height;
local outline = std.sort(
  [[0, taper(0)], [measures.height, taper(measures.height)]] + std.flattenArrays([
    local r = measures.ribs, y0 = c + s * r.gap / 2;
    [
      [y0 - r.width / 2 - r.ramp, taper(y0 - r.width / 2 - r.ramp)],
      [y0 - r.width / 2, taper(y0 - r.width / 2) + r.rise],
      [y0 + r.width / 2, taper(y0 + r.width / 2) + r.rise],
      [y0 + r.width / 2 + r.ramp, taper(y0 + r.width / 2 + r.ramp)],
    ]
    for c in measures.ribs.at
    for s in [-1, 1]
  ]),
  function(p) p[0]
);
local outer(y) =
  local i = [k for k in std.range(0, std.length(outline) - 2) if y <= outline[k + 1][0]][0];
  local a = outline[i], b = outline[i + 1];
  a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
local within(y0, y1) = [y0] + [p[0] for p in outline if p[0] > y0 && p[0] < y1] + [y1];

// The wall from y0 to y1 turned whole, shifted by `at` = [x, z].
local turnedWall(id, y0, y1, at) =
  local ys = within(y0, y1);
  h.turned(id, 'wall', 'y', [[y, outer(y)] for y in ys] + [[y, outer(y) - measures.wall] for y in std.reverse(ys)] + [[y0, outer(y0)]], [at[0], 0, at[1]]) + { sides: measures.sides };

// The wall from y0 to y1 as a ring of quads, the radius at each corner pushed in by `push(angle, y)`, in degrees from
// +z towards +x. Corners sit where a sided turned piece puts them, so the ring meets the turned wall above and below.
// Slices run `step` tall, and a column's slices that land on the same millimetre merge into one quad.
local quadWall(prefix, slot, y0, y1, step, push, at) =
  local n = measures.sides, reach = 1 / cosd(180 / n);
  local ys = local k = std.ceil((y1 - y0) / step); [y0 + (y1 - y0) * i / k for i in std.range(0, k)];
  local corner(j) = 360 * (j + 0.5) / n;
  local radius(j, y) = std.round((outer(y) - push(corner(j), y)) * reach * 1000) / 1000;
  local point(j, r) = [at[1] + r * cosd(corner(j)), at[0] + r * sind(corner(j))];
  std.flattenArrays([
    local cells = [
      { from: ys[i], to: ys[i + 1], a: radius(j, (ys[i] + ys[i + 1]) / 2), b: radius(j + 1, (ys[i] + ys[i + 1]) / 2) }
      for i in std.range(0, std.length(ys) - 2)
    ];
    local runs = std.foldl(
      function(acc, c)
        local last = if std.length(acc) == 0 then null else acc[std.length(acc) - 1];
        if last != null && last.a == c.a && last.b == c.b then acc[:std.length(acc) - 1] + [last { to: c.to }] else acc + [c],
      cells,
      []
    );
    local thick = measures.wall * reach;
    [
      h.prism('%s-%d-%d' % [prefix, j, k], slot, 'y', [point(j, runs[k].a - thick), point(j, runs[k].a), point(j + 1, runs[k].b), point(j + 1, runs[k].b - thick)], runs[k].from, runs[k].to)
      for k in std.range(0, std.length(runs) - 1)
    ]
    for j in std.range(0, n - 1)
  ]);

// The can, struck as `damage` says: a `kick` pushing the wall in between two rib pairs, a `lean` in degrees away from the
// kick and a `tip` of the lid in degrees off its seat. Zero leaves it whole.
local can(damage) =
  local m = measures, d = { kick: null, lean: 0, tip: 0 } + damage;
  local away = if d.kick == null then [0, 0] else [-sind(d.kick.angle), -cosd(d.kick.angle)];
  local shift(y) = local s = y * std.tan(d.lean * std.pi / 180); [away[0] * s, away[1] * s];
  // The wall splits at each rib pair, where the rib hides the lean's step, and round the band the kick deforms.
  local splits = [0] + m.ribs.at + [m.height - m.rim.height];
  local band = if d.kick == null then null else { from: m.ribs.at[d.kick.between] + ribHalf, to: m.ribs.at[d.kick.between + 1] - ribHalf };
  local mid(y0, y1) = shift((y0 + y1) / 2);
  local push(angle, y) =
    local k = d.kick, phi = std.mod(angle - k.angle + 540, 360) - 180;
    local v = (2 * y - band.from - band.to) / (band.to - band.from), across = std.max(0, 1 - std.abs(v));
    local fold = across * (1 - k.fold + k.fold * std.abs(std.cos(v * std.pi * 1.5)));
    local u = std.abs(phi) / k.width;
    if u < 1 then k.depth * std.pow(1 - u * u, 0.7) * fold
    else if u < 1.8 then -k.bulge * std.sin(std.pi * (u - 1) / 0.8) * across
    else 0;
  local walls = std.flattenArrays([
    local y0 = splits[i], y1 = splits[i + 1];
    if band != null && band.from > y0 && band.to < y1 then [
      turnedWall('wall-%d-low' % i, y0, band.from, mid(y0, band.from)),
      turnedWall('wall-%d-high' % i, band.to, y1, mid(band.to, y1)),
    ] + quadWall('dent', 'wall', band.from, band.to, 0.012, push, mid(band.from, band.to))
    else [turnedWall('wall-%d' % i, y0, y1, mid(y0, y1))]
    for i in std.range(0, std.length(splits) - 2)
  ]);
  local foot = m.foot, rim = m.rim, hd = m.handle, at0 = shift(foot.height / 2), atTop = shift(m.height);
  local rimTop = m.top + rim.proud;
  local sided(p) = p + { sides: m.sides };
  local body = walls + [
    sided(h.turned('floor', 'wall', 'y', [[0, 0], [0, m.base - m.wall], [m.wall, m.base - m.wall], [m.wall, 0]], [at0[0], 0.012, at0[1]])),
    sided(h.turned('foot', 'rim', 'y', [[0, m.base - 0.004], [0, m.base + foot.proud], [foot.height, outer(foot.height) + foot.proud], [foot.height, m.base - 0.004], [0, m.base - 0.004]], [at0[0], 0, at0[1]])),
    // The rolled rim: a bead round the mouth, its top rounded over.
    sided(h.turned('rim', 'rim', 'y', [[0, m.top - m.wall], [0, rimTop - 0.004], [rim.height * 0.5, rimTop], [rim.height * 0.85, rimTop - 0.002], [rim.height, rimTop - 0.008], [rim.height, m.top - m.wall], [0, m.top - m.wall]], [atTop[0], m.height - rim.height, atTop[1]])),
  ] + std.flattenArrays([
    local at = shift(hd.y), x = s * outer(hd.y) + at[0], out = s * hd.reach;
    [
      h.box('handle-ear-%s-front' % name, 'handle', [std.min(x, x + out), hd.y - 0.01, at[1] + hd.span / 2 - 0.016], [std.max(x, x + out), hd.y + 0.025, at[1] + hd.span / 2]),
      h.box('handle-ear-%s-back' % name, 'handle', [std.min(x, x + out), hd.y - 0.01, at[1] - hd.span / 2], [std.max(x, x + out), hd.y + 0.025, at[1] - hd.span / 2 + 0.016]),
      h.turned('handle-%s' % name, 'handle', 'z', [[0, 0], [0, hd.bar], [hd.span, hd.bar], [hd.span, 0]], [x + out - s * hd.bar, hd.y - 0.01, at[1] - hd.span / 2]),
    ]
    for s in [-1, 1]
    for name in [if s < 0 then 'left' else 'right']
  ]);
  // The lid in its own frame, its seat on the rim's top at the origin: a skirt over the rim and a domed, stepped crown.
  local lid = m.lid, skirtIn = rimTop + lid.clearance, skirtOut = skirtIn + m.wall;
  local lidPieces = [
    h.turned('skirt', 'lid', 'y', [[-lid.skirt, skirtIn], [-lid.skirt, skirtOut], [0.006, skirtOut], [0.006, skirtIn], [-lid.skirt, skirtIn]]) + { sides: m.sides }
  ] + [
    sided(h.turned('crown', 'lid', 'y', [
      [0, 0], [0, skirtOut - 0.002], [0.012, skirtOut - 0.016], [0.022, skirtOut - 0.05], [0.026, skirtOut - 0.06],
      [0.042, skirtOut - 0.1], [0.046, skirtOut - 0.11], [0.06, skirtOut - 0.16], [lid.crown, skirtOut - 0.2], [lid.crown, 0],
    ])),
  ] + [
    local hl = lid.handle, x = s * hl.span / 2;
    h.box('lid-handle-ear-%d' % ((s + 1) / 2), 'handle', [x - 0.012, lid.crown - 0.004, -0.012], [x + 0.012, lid.crown + hl.y + 0.008, 0.012])
    for s in [-1, 1]
  ] + [
    h.turned('lid-handle', 'handle', 'x', [[0, 0], [0, lid.handle.bar], [lid.handle.span + 0.024, lid.handle.bar], [lid.handle.span + 0.024, 0]], [-lid.handle.span / 2 - 0.012, lid.crown + lid.handle.y, 0]),
  ];
  // The lid tips about the point of its seat on the side away from the kick, so the far side lifts off the rim.
  local tipAxis = [away[1], 0, -away[0]];
  local pivot = if d.tip == 0 then [0, 0, 0] else [away[0] * rimTop, 0, away[1] * rimTop];
  local turn(v) = local c = cosd(d.tip), s = sind(d.tip), k = tipAxis, kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    local cross = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    [v[i] * c + cross[i] * s + k[i] * kv * (1 - c) for i in [0, 1, 2]];
  {
    exportMass: 'parts',
    voxelGrain: 0.006,
    parts: [
      h.part('body', 'compound', m.mass.body, { pieces: body }, { wall: 'steel-galvanised', rim: 'steel-galvanised', handle: 'steel-galvanised' }, [
        h.port('lid', 'female', [atTop[0] + pivot[0], m.height, atTop[1] + pivot[2]], turn([0, 1, 0]), turn([1, 0, 0])),
      ]),
      h.part('lid', 'compound', m.mass.lid, { pieces: lidPieces }, { lid: 'steel-galvanised', handle: 'steel-galvanised' }, [
        h.port('body', 'male', pivot, [0, -1, 0]),
      ]),
    ],
    connections: [{ from: 'body.lid', to: 'lid.body' }],
    taxonomy: { category: 'containers', tags: { material: ['metal'], setting: ['modern'] } },
  };

[
  // A 30 gallon galvanised steel trash can, 480 mm across the rim and 760 mm tall to its lid handle: a tapered wall
  // with three pairs of pressed ribs, a rolled rim and foot band, a drop handle each side and a domed lid that lifts off.
  can({}) + { id: 'galvanised_trashcan' },
  // The same can kicked in: the wall caved in between the lower ribs and folded across the blow, pushed out of round
  // and leaning away from it, its lid knocked askew on the rim.
  can({ kick: { angle: 30, between: 0, depth: 0.07, width: 55, bulge: 0.012, fold: 0.35 }, lean: 3, tip: 7 }) + {
    id: 'galvanised_trashcan_dented',
    taxonomy+: { tags+: { state: ['crashed'] } },
  },
]
