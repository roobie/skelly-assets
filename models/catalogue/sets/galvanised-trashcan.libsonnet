// A classic US galvanised steel trash can, about 30 gallons, whole and kicked in. Both are drawn by one `can` from one
// set of measures, so the kicked can is the same can deformed rather than a second design. Pieces cannot bend, so the
// kick is a band of the wall rebuilt as a ring of quads pushed in where it was struck, the lean is each section of the
// wall stepped sideways at a rib's crest, where the rib carries the step, and the lid is tipped on its port rather than
// turned.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';

// Metres. The wall tapers from `base` at the floor to `top` under the rolled rim, with pairs of pressed ribs round it.
local measures = {
  height: 0.69,
  base: 0.215,
  top: 0.24,
  wall: 0.006,
  sides: 24,
  // `inset` is how far the foot band reaches in under the wall.
  foot: { height: 0.045, proud: 0.007, inset: 0.004 },
  floor: { lift: 0.012 },
  // The bead's profile as [share of the rim's height, drop from its outer radius].
  rim: { height: 0.022, proud: 0.012, bead: [[0, 0.004], [0.5, 0], [0.85, 0.002], [1, 0.008]] },
  // Each rib pair's middle height; a rib is `rise` proud over `width`, its flanks `ramp` long, the pair `gap` apart.
  ribs: { at: [0.13, 0.39, 0.57], rise: 0.008, width: 0.014, ramp: 0.006, gap: 0.034 },
  // Each ear reaches `below` and `above` the handle's height and is `depth` deep along the bar.
  handle: { y: 0.6, reach: 0.034, span: 0.12, bar: 0.007, ear: { below: 0.01, above: 0.025, depth: 0.016 } },
  // The skirt hangs `skirt` below the seat and rises `overlap` above it. The crown's profile is [height above the seat,
  // inset from the skirt's outside], up to its top. A handle ear is `half` either side of the bar, sinks `sink` into
  // the crown and stands `over` above the bar.
  lid: {
    skirt: 0.032,
    clearance: 0.003,
    overlap: 0.006,
    crown: [[0, 0.002], [0.012, 0.016], [0.022, 0.05], [0.026, 0.06], [0.042, 0.1], [0.046, 0.11], [0.06, 0.16], [0.07, 0.2]],
    handle: { y: 0.04, span: 0.15, bar: 0.009, ear: { half: 0.012, sink: 0.004, over: 0.008 } },
  },
  // How tall each slice of a kicked band runs.
  slice: 0.012,
  mass: { body: 5.6, lid: 1.4 },
};

local galvanised = 'steel-galvanised';
local cosd(a) = std.cos(a * std.pi / 180), sind(a) = std.sin(a * std.pi / 180);
local sided(p) = p + { sides: measures.sides };
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
  sided(h.turned(id, 'wall', 'y', [[y, outer(y)] for y in ys] + [[y, outer(y) - measures.wall] for y in std.reverse(ys)] + [[y0, outer(y0)]], [at[0], 0, at[1]]));

// The wall from y0 to y1 as a ring of quads, the radius at each corner pushed in by `push(angle, y)`, in degrees from
// +z towards +x. Corners sit where a sided turned piece puts them, so the ring meets the turned wall above and below.
// Slices run `measures.slice` tall, and a column's slices that land on the same millimetre merge into one quad.
local quadWall(prefix, slot, y0, y1, push, at) =
  local n = measures.sides, reach = 1 / cosd(180 / n);
  local ys = local k = std.ceil((y1 - y0) / measures.slice); [y0 + (y1 - y0) * i / k for i in std.range(0, k)];
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
// kick and a `tip` of the lid in degrees off its seat. Zero leaves it whole. A kick is `depth` deep across `width`
// degrees, its section `cup` (below 1 flattens its floor), creased `folds` times up the band by `fold`, and bulges the
// wall out by `bulge` beside it, out to `bulgeTo` widths.
local can(damage) =
  local m = measures, d = { kick: null, lean: 0, tip: 0 } + damage;
  assert d.kick != null || (d.lean == 0 && d.tip == 0) : 'a lean or tip falls away from a kick, so it needs one';
  local away = if d.kick == null then [0, 0] else [-sind(d.kick.angle), -cosd(d.kick.angle)];
  local shift(y) = local s = y * std.tan(d.lean * std.pi / 180); [away[0] * s, away[1] * s];
  // The wall splits at every rib's crest, so each step of the lean is shorter than the rib that carries it.
  local splits = [0] + [c + s * m.ribs.gap / 2 for c in m.ribs.at for s in [-1, 1]] + [m.height - m.rim.height];
  local band = if d.kick == null then null else { from: m.ribs.at[d.kick.between] + ribHalf, to: m.ribs.at[d.kick.between + 1] - ribHalf };
  local mid(y0, y1) = shift((y0 + y1) / 2);
  local push(angle, y) =
    local k = d.kick, phi = std.mod(angle - k.angle + 540, 360) - 180;
    local v = (2 * y - band.from - band.to) / (band.to - band.from), across = std.max(0, 1 - std.abs(v));
    local fold = across * (1 - k.fold + k.fold * std.abs(std.cos(v * std.pi * k.folds)));
    local u = std.abs(phi) / k.width;
    if u < 1 then k.depth * std.pow(1 - u * u, k.cup) * fold
    else if u < k.bulgeTo then -k.bulge * std.sin(std.pi * (u - 1) / (k.bulgeTo - 1)) * across
    else 0;
  // A kicked section's three pieces share the section's shift, so the kick adds no lean steps of its own.
  local walls = std.flattenArrays([
    local y0 = splits[i], y1 = splits[i + 1], at = mid(y0, y1);
    if band != null && band.from > y0 && band.to < y1 then [
      turnedWall('wall-%d-low' % i, y0, band.from, at),
      turnedWall('wall-%d-high' % i, band.to, y1, at),
    ] + quadWall('dent', 'wall', band.from, band.to, push, at)
    else [turnedWall('wall-%d' % i, y0, y1, at)]
    for i in std.range(0, std.length(splits) - 2)
  ]);
  local foot = m.foot, rim = m.rim, hd = m.handle, ear = hd.ear, at0 = shift(foot.height / 2), atTop = shift(m.height);
  local rimTop = m.top + rim.proud, footIn = m.base - foot.inset;
  local body = walls + [
    sided(h.turned('floor', 'wall', 'y', [[0, 0], [0, m.base - m.wall], [m.wall, m.base - m.wall], [m.wall, 0]], [at0[0], m.floor.lift, at0[1]])),
    sided(h.turned('foot', 'rim', 'y', [[0, footIn], [0, m.base + foot.proud], [foot.height, outer(foot.height) + foot.proud], [foot.height, footIn], [0, footIn]], [at0[0], 0, at0[1]])),
    // The rolled rim: a bead round the mouth, its top rounded over.
    local inside = m.top - m.wall;
    sided(h.turned('rim', 'rim', 'y', [[0, inside]] + [[p[0] * rim.height, rimTop - p[1]] for p in rim.bead] + [[rim.height, inside], [0, inside]], [atTop[0], m.height - rim.height, atTop[1]])),
  ] + std.flattenArrays([
    local at = shift(hd.y), x = s * outer(hd.y) + at[0], out = s * hd.reach;
    local x0 = std.min(x, x + out), x1 = std.max(x, x + out), y0 = hd.y - ear.below, y1 = hd.y + ear.above;
    [
      h.box('handle-ear-%s-front' % name, 'handle', [x0, y0, at[1] + hd.span / 2 - ear.depth], [x1, y1, at[1] + hd.span / 2]),
      h.box('handle-ear-%s-back' % name, 'handle', [x0, y0, at[1] - hd.span / 2], [x1, y1, at[1] - hd.span / 2 + ear.depth]),
      h.turned('handle-%s' % name, 'handle', 'z', [[0, 0], [0, hd.bar], [hd.span, hd.bar], [hd.span, 0]], [x + out - s * hd.bar, y0, at[1] - hd.span / 2]),
    ]
    for s in [-1, 1]
    for name in [if s < 0 then 'left' else 'right']
  ]);
  // The lid in its own frame, its seat on the rim's top at the origin: a skirt over the rim and a domed, stepped crown.
  local lid = m.lid, hl = lid.handle, skirtIn = rimTop + lid.clearance, skirtOut = skirtIn + m.wall;
  local crownTop = lid.crown[std.length(lid.crown) - 1][0], barY = crownTop + hl.y, barEnd = hl.span / 2 + hl.ear.half;
  local lidPieces = [
    sided(h.turned('skirt', 'lid', 'y', [[-lid.skirt, skirtIn], [-lid.skirt, skirtOut], [lid.overlap, skirtOut], [lid.overlap, skirtIn], [-lid.skirt, skirtIn]])),
    sided(h.turned('crown', 'lid', 'y', [[0, 0]] + [[p[0], skirtOut - p[1]] for p in lid.crown] + [[crownTop, 0]])),
  ] + [
    local x = s * hl.span / 2;
    h.box('lid-handle-ear-%s' % name, 'handle', [x - hl.ear.half, crownTop - hl.ear.sink, -hl.ear.half], [x + hl.ear.half, barY + hl.ear.over, hl.ear.half])
    for s in [-1, 1]
    for name in [if s < 0 then 'left' else 'right']
  ] + [
    h.turned('lid-handle', 'handle', 'x', [[0, 0], [0, hl.bar], [2 * barEnd, hl.bar], [2 * barEnd, 0]], [-barEnd, barY, 0]),
  ];
  // The lid tips about the foot of its skirt's inside on the side away from the kick, so the far side lifts off the rim
  // and the near side of the skirt swings out from the rim rather than into it.
  local tipAxis = [away[1], 0, -away[0]];
  local pivot = if d.tip == 0 then [0, 0, 0] else [away[0] * skirtIn, -lid.skirt, away[1] * skirtIn];
  local turn(v) = local c = cosd(d.tip), s = sind(d.tip), k = tipAxis, kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    local cross = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    [v[i] * c + cross[i] * s + k[i] * kv * (1 - c) for i in [0, 1, 2]];
  {
    exportMass: 'parts',
    voxelGrain: 0.006,
    parts: [
      h.part('body', 'compound', m.mass.body, { pieces: body }, { wall: galvanised, rim: galvanised, handle: galvanised }, [
        h.port('lid', 'female', [atTop[0] + pivot[0], m.height + pivot[1], atTop[1] + pivot[2]], turn([0, 1, 0]), turn([1, 0, 0])),
      ]),
      h.part('lid', 'compound', m.mass.lid, { pieces: lidPieces }, { lid: galvanised, handle: galvanised }, [
        h.port('body', 'male', pivot, [0, -1, 0]),
      ]),
    ],
    connections: [{ from: 'body.lid', to: 'lid.body' }],
    taxonomy: { category: 'containers', tags: { material: ['metal'], setting: ['modern'] } },
  };

[
  // A galvanised steel trash can: a tapered wall with three pairs of pressed ribs, a rolled rim and foot band, a drop
  // handle each side and a domed lid that lifts off.
  can({}) + { id: 'galvanised_trashcan' },
  // The same can kicked in: the wall caved in between the lower ribs and folded across the blow, pushed out of round
  // and leaning away from it, its lid knocked askew on the rim.
  can({
    kick: { angle: 30, between: 0, depth: 0.07, width: 55, cup: 0.7, folds: 1.5, fold: 0.35, bulge: 0.012, bulgeTo: 1.8 },
    lean: 3,
    tip: 7,
  }) + {
    id: 'galvanised_trashcan_dented',
    taxonomy+: { tags+: { state: ['crashed'] } },
  },
]
