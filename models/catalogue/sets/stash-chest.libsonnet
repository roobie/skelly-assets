// A big plank chest bound in iron, the kind supplies are hidden in: shut under a padlock, and open and empty. Both are
// drawn by one `chest` from one set of measures, so the open chest is the same chest with its lid swung up on its
// hinges rather than a second design. The lid is its own part, hung from the body at the hinge line, so a game can
// swing it about that port as the open row does.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';

// Metres. The body is `length` along x and `depth` along z, its carcass standing on two runners; the lid sits on it.
// Every wall is a backing `wall` thick faced with boards `face` thick, with a `groove` between boards, so the boards
// read apart. Iron is `iron` thick: a strap over the lid and down the front and back at each `straps` x, which is
// also a hinge, an angle iron `reach` along each face at every corner, a bail handle at each end and a hasp and staple
// at the front.
local measures = {
  length: 1.1,
  depth: 0.56,
  height: 0.46,
  wall: 0.018,
  face: 0.012,
  groove: 0.012,
  boards: 4,
  floor: 0.02,
  // Runners `width` wide, `inset` in from each end, `height` tall.
  runner: { height: 0.03, width: 0.06, inset: 0.03 },
  // `overhang` is how far the lid stands out past the body all round; its top is `boards` planks along x.
  lid: { height: 0.13, overhang: 0.008, boards: 4 },
  iron: 0.012,
  straps: { at: [-0.3, 0.3], width: 0.05 },
  corner: { reach: 0.07 },
  // The knuckle turns about the hinge line, `out` behind the back and level with the body's top; the lid's knuckle is
  // `share` of a strap's width, the body's two flank it.
  hinge: { radius: 0.012, out: 0.016, share: 0.4 },
  // Each end's bail: ears `span` apart along z with the bar at `drop` below `y` and `reach` out from the end.
  handle: { y: 0.34, span: 0.22, drop: 0.04, reach: 0.03, bar: 0.009, ear: 0.016 },
  // The hasp hangs `below` the body's top and runs `up` the lid; the staple pokes through it `proud`.
  hasp: { width: 0.05, below: 0.08, up: 0.075, plate: 0.09, staple: { width: 0.016, height: 0.02, proud: 0.016, y: 0.045 } },
  lock: { width: 0.075, height: 0.08, depth: 0.03, shackle: { width: 0.012, span: 0.048, rise: 0.045 } },
  mass: { body: 30, lid: 9 },
};

local cosd(a) = std.cos(a * std.pi / 180), sind(a) = std.sin(a * std.pi / 180);
local m = measures, half = m.length / 2, deep = m.depth / 2, t = m.wall + m.face, y0 = m.runner.height, top = m.height;
local hinge = { y: top, z: -deep - m.hinge.out };

// A wall's boards from `from` to `to` in y: `n` boards with a groove between each, as boxes given their y span.
local boards(n, from, to) =
  local tall = (to - from - (n - 1) * m.groove) / n;
  [[from + i * (tall + m.groove), from + i * (tall + m.groove) + tall] for i in std.range(0, n - 1)];

// The four walls of a box from y `from` to `to`, `x` and `z` its outside half-sizes: a backing ring and the faced boards.
local walls(prefix, x, z, from, to, n) =
  [
    h.box('%s-back-%s' % [prefix, s], 'backing', [-x + m.face, from, s * z - (if s > 0 then t else -m.face)], [x - m.face, to, s * z - (if s > 0 then m.face else -t)])
    for s in [-1, 1]
  ] + [
    h.box('%s-end-%s' % [prefix, s], 'backing', [s * x - (if s > 0 then t else -m.face), from, -z + m.face], [s * x - (if s > 0 then m.face else -t), to, z - m.face])
    for s in [-1, 1]
  ] + std.flattenArrays([
    [
      h.box('%s-board-z%d-%d' % [prefix, s, i], 'wood', [-x, b[0], if s > 0 then z - m.face else -z], [x, b[1], if s > 0 then z else -z + m.face]),
      h.box('%s-board-x%d-%d' % [prefix, s, i], 'wood', [if s > 0 then x - m.face else -x, b[0], -z], [if s > 0 then x else -x + m.face, b[1], z]),
    ]
    for s in [-1, 1]
    for i in std.range(0, n - 1)
    for b in [boards(n, from, to)[i]]
  ]);

// An angle iron on each vertical corner of a box `x` by `z`, from y `from` to `to`.
local corners(prefix, x, z, from, to) = std.flattenArrays([
  local r = m.corner.reach, i = m.iron;
  [
    h.box('%s-corner-%d%d-z' % [prefix, sx, sz], 'iron', [std.min(sx * (x - r), sx * (x + i)), from, std.min(sz * z, sz * (z + i))], [std.max(sx * (x - r), sx * (x + i)), to, std.max(sz * z, sz * (z + i))]),
    h.box('%s-corner-%d%d-x' % [prefix, sx, sz], 'iron', [std.min(sx * x, sx * (x + i)), from, std.min(sz * (z - r), sz * (z + i))], [std.max(sx * x, sx * (x + i)), to, std.max(sz * (z - r), sz * (z + i))]),
  ]
  for sx in [-1, 1]
  for sz in [-1, 1]
]);

// A box between two corners given in any order.
local span(id, slot, a, b) = h.box(id, slot, [std.min(a[k], b[k]) for k in [0, 1, 2]], [std.max(a[k], b[k]) for k in [0, 1, 2]]);
local hingeKnuckle(id, x0, x1) = h.turned(id, 'iron', 'x', [[0, 0], [0, m.hinge.radius], [x1 - x0, m.hinge.radius], [x1 - x0, 0]], [x0, hinge.y, hinge.z]);

// The chest, its lid swung `open` degrees up off the body about the hinge line, padlocked shut when `locked`.
local chest(open, locked) =
  assert !(locked && open != 0) : 'a padlocked lid stays shut';
  local i = m.iron, sw = m.straps.width / 2, hd = m.handle, hp = m.hasp, st = hp.staple;
  local stapleZ = deep + m.lid.overhang + i;
  local body = walls('body', half, deep, y0, top, m.boards) + corners('body', half, deep, y0, top) + [
    h.box('floor', 'backing', [-half + m.face, y0, -deep + m.face], [half - m.face, y0 + m.floor, deep - m.face]),
  ] + [
    span('runner-%d' % s, 'wood', [s * (half - m.runner.inset), 0, -deep + m.face], [s * (half - m.runner.inset - m.runner.width), y0, deep - m.face])
    for s in [-1, 1]
  ] + std.flattenArrays([
    [
      span('strap-%d-front' % k, 'iron', [x - sw, y0, deep], [x + sw, top, deep + i]),
      span('strap-%d-back' % k, 'iron', [x - sw, y0, -deep], [x + sw, top, -deep - i]),
      hingeKnuckle('knuckle-%d-a' % k, x - sw - 0.005, x - sw * m.hinge.share),
      hingeKnuckle('knuckle-%d-b' % k, x + sw * m.hinge.share, x + sw + 0.005),
    ]
    for k in std.range(0, std.length(m.straps.at) - 1)
    for x in [m.straps.at[k]]
  ]) + std.flattenArrays([
    local x = s * (half + i), bar = s * (half + i + hd.reach);
    [
      span('handle-plate-%d' % s, 'iron', [s * half, hd.y - 0.03, -hd.span / 2 - hd.ear], [x, hd.y + 0.03, hd.span / 2 + hd.ear]),
      span('handle-ear-%d-front' % s, 'iron', [x, hd.y - hd.drop, hd.span / 2 - hd.ear], [bar, hd.y + 0.012, hd.span / 2]),
      span('handle-ear-%d-back' % s, 'iron', [x, hd.y - hd.drop, -hd.span / 2], [bar, hd.y + 0.012, -hd.span / 2 + hd.ear]),
      h.turned('handle-bar-%d' % s, 'iron', 'z', [[0, 0], [0, hd.bar], [hd.span, hd.bar], [hd.span, 0]], [bar - s * hd.bar, hd.y - hd.drop + hd.bar, -hd.span / 2]),
    ]
    for s in [-1, 1]
  ]) + [
    // The staple's plate fills the gap behind the hasp, so the hasp lies on it when the lid is shut.
    span('staple-plate', 'iron', [-hp.plate / 2, top - hp.below - 0.01, deep], [hp.plate / 2, top - 0.005, deep + m.lid.overhang]),
    span('staple', 'iron', [-st.width / 2, top - st.y - st.height / 2, deep], [st.width / 2, top - st.y + st.height / 2, stapleZ + st.proud]),
  ] + (
    if !locked then [] else
      local lk = m.lock, sh = lk.shackle, z0 = stapleZ + 0.002, lockTop = top - st.y - st.height / 2 - sh.rise / 2;
      [
        span('lock-case', 'lock', [-lk.width / 2, lockTop - lk.height, z0], [lk.width / 2, lockTop, z0 + lk.depth]),
        span('shackle-left', 'shackle', [-sh.span / 2, lockTop, z0 + lk.depth / 2 - sh.width / 2], [-sh.span / 2 + sh.width, lockTop + sh.rise, z0 + lk.depth / 2 + sh.width / 2]),
        span('shackle-right', 'shackle', [sh.span / 2 - sh.width, lockTop, z0 + lk.depth / 2 - sh.width / 2], [sh.span / 2, lockTop + sh.rise, z0 + lk.depth / 2 + sh.width / 2]),
        span('shackle-top', 'shackle', [-sh.span / 2, lockTop + sh.rise - sh.width, z0 + lk.depth / 2 - sh.width / 2], [sh.span / 2, lockTop + sh.rise, z0 + lk.depth / 2 + sh.width / 2]),
      ]
  );
  // The lid is drawn in the body's frame and moved into its own, whose origin is the hinge line.
  local lx = half + m.lid.overhang, lz = deep + m.lid.overhang, lidTop = top + m.lid.height, under = lidTop - t;
  local inLid(piece) = piece + (
    if piece.kind == 'box' then { min: [piece.min[0], piece.min[1] - hinge.y, piece.min[2] - hinge.z], max: [piece.max[0], piece.max[1] - hinge.y, piece.max[2] - hinge.z] }
    else { origin: [piece.origin[0], piece.origin[1] - hinge.y, piece.origin[2] - hinge.z] }
  );
  local lid = walls('skirt', lx, lz, top, under, 1) + corners('lid', lx, lz, top, lidTop) + [
    h.box('top-backing', 'backing', [-lx, under, -lz], [lx, lidTop - m.face, lz]),
  ] + [
    span('top-board-%d' % k, 'wood', [-lx, lidTop - m.face, b[0]], [lx, lidTop, b[1]])
    for k in std.range(0, m.lid.boards - 1)
    for b in [boards(m.lid.boards, -lz, lz)[k]]
  ] + std.flattenArrays([
    [
      span('strap-%d-top' % k, 'iron', [x - sw, lidTop, -lz - i], [x + sw, lidTop + i, lz + i]),
      span('strap-%d-front' % k, 'iron', [x - sw, top, lz], [x + sw, lidTop, lz + i]),
      span('strap-%d-back' % k, 'iron', [x - sw, top, -lz], [x + sw, lidTop, -lz - i]),
      hingeKnuckle('knuckle-%d' % k, x - sw * m.hinge.share, x + sw * m.hinge.share),
    ]
    for k in std.range(0, std.length(m.straps.at) - 1)
    for x in [m.straps.at[k]]
  ]) + [
    span('hasp', 'iron', [-hp.width / 2, top - hp.below, lz], [hp.width / 2, top + hp.up, lz + i]),
  ];
  {
    exportMass: 'parts',
    voxelGrain: 0.006,
    parts: [
      h.part('body', 'compound', m.mass.body, { pieces: body }, { wood: 'wood-weathered', backing: 'bark', iron: 'iron-cast', lock: 'brass-dull', shackle: 'steel-grey' }, [
        // Opening turns the lid's front up about the hinge line, a turn about -x.
        h.port('lid', 'female', [0, hinge.y, hinge.z], [0, cosd(open), -sind(open)]),
      ]),
      h.part('lid', 'compound', m.mass.lid, { pieces: [inLid(p) for p in lid] }, { wood: 'wood-weathered', backing: 'bark', iron: 'iron-cast' }, [
        h.port('body', 'male', [0, 0, 0], [0, -1, 0]),
      ]),
    ],
    connections: [{ from: 'body.lid', to: 'lid.body' }],
    taxonomy: { category: 'containers', tags: { material: ['wood', 'metal'], setting: ['medieval', 'modern'] } },
  };

[
  // A plank chest 1.1 m long bound in iron, on two runners: a strap over it at each hinge, angle irons on every corner,
  // a bail handle at each end and a padlock through the hasp.
  chest(0, true) + { id: 'stash_chest', title: 'Stash chest' },
  // The same chest unlocked, its lid swung up and back on its hinges to show it empty.
  chest(100, false) + {
    id: 'stash_chest_open',
    title: 'Open stash chest',
    taxonomy+: { tags+: { state: ['opened', 'empty'] } },
  },
]
