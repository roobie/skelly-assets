local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local s = import 'stone.spec.libsonnet';
local metadata = (import 'metadata.libsonnet').stone;
local half = (s.bay - s.wall) / 2;
local finish = { stone: 'stone-grey', pale: 'stone-limestone', mortar: 'mortar-grey' };
local shade(i, j=0) = if std.modulo(i + 3 * j, 5) == 0 then 'pale' else 'stone';
local row(id, title, kg, pieces) = h.compound('medieval_stone_' + id, kg, pieces, finish) + {
  title: 'Medieval stone ' + title,
  voxelGrain: s.grain,
  taxonomy: { category: 'structures', tags: { setting: ['medieval'], material: ['stone'] }, keywords: ['building', 'castle'] },
  building: metadata['medieval_stone_' + id],
};
local rect(x0, y0, x1, y1) = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
local swap(poly) = [[p[1], p[0]] for p in poly];
local band(poly, lo, hi) = h.clipX(h.clipX(poly, lo, true), hi, false);
local clip(poly, x0, y0, x1, y1) = swap(band(swap(band(poly, x0, x1)), y0, y1));
local area(poly) = std.abs(std.sum([
  local q = poly[std.modulo(i + 1, std.length(poly))];
  p[0] * q[1] - p[1] * q[0] for i in std.range(0, std.length(poly) - 1) for p in [poly[i]]
]));
// Partition the region into disjoint stone cells and recessed grout strips. A full backing prism would share
// coplanar side faces with the blocks at openings and module ends, even if recessed on the front and rear.
// Tiny cut fragments must not become degenerate export solids.
local masonry(prefix, poly, depth=s.wall) =
  local lo = std.foldl(function(a, p) std.min(a, p[0]), poly, 1e9);
  local hi = std.foldl(function(a, p) std.max(a, p[0]), poly, -1e9);
  local columns = std.range(std.floor(lo / s.block) - 1, std.ceil(hi / s.block));
  local count = std.ceil(s.storey / s.course);
  [
    h.prism('%s-%s-%d-%d' % [prefix, kind, j, i], if kind == 'stone' then shade(i, j) else 'mortar', 'z', cut,
      -depth / 2 + (if kind == 'stone' then 0 else s.joint), depth / 2 - (if kind == 'stone' then 0 else s.joint))
    for j in std.range(0, count - 1) for i in columns
    for offset in [std.modulo(j, 2) * s.block / 2]
    for kind in ['stone', 'vertical-grout']
    for cut in [clip(poly,
      i * s.block + offset + (if kind == 'stone' then s.joint / 2 else -s.joint / 2), j * s.course + s.joint / 2,
      i * s.block + offset + (if kind == 'stone' then s.block - s.joint / 2 else s.joint / 2), (j + 1) * s.course - s.joint / 2)]
    if std.length(cut) >= 3 && area(cut) > 1e-8
  ] + [
    h.prism('%s-horizontal-grout-%d' % [prefix, j], 'mortar', 'z', cut, -depth / 2 + s.joint, depth / 2 - s.joint)
    for j in std.range(0, count)
    for cut in [clip(poly, lo, j * s.course - s.joint / 2, hi, j * s.course + s.joint / 2)]
    if std.length(cut) >= 3 && area(cut) > 1e-8
  ];

local wallRect(prefix, x0, y0, x1, y1) = masonry(prefix, rect(x0, y0, x1, y1));
local arcPoint(r, y, angle) = [r * std.cos(angle), y + r * std.sin(angle)];
local sector(ri, ro, y, a, b) = [arcPoint(ri, y, a), arcPoint(ro, y, a), arcPoint(ro, y, b), arcPoint(ri, y, b)];
// Cut joints on the existing faceted outline, not a newly sampled arc: that arc's shorter outer chords would
// protrude into the spandrel, leaving overlapping coplanar faces and speckled colours at the doorway crown.
local angleCut(poly, spring, angle, above) =
  local c = std.cos(angle), t = std.sin(angle);
  local rotated = [[-p[0] * t + (p[1] - spring) * c, p[0] * c + (p[1] - spring) * t] for p in poly];
  [[p[1] * c - p[0] * t, spring + p[1] * t + p[0] * c] for p in h.clipX(rotated, 0, above)];
// Recess the continuous mortar core in radius and depth; no coplanar differently coloured skins in smooth exports.
local arch(prefix, ri, ro, spring, z0, z1, courses=1) = std.flattenArrays([
  local a = std.pi * i / s.vault.segments;
  local b = std.pi * (i + 1) / s.vault.segments;
  [h.prism('%s-core-%d' % [prefix, i], 'mortar', 'z',
    clip(sector(ri + s.grain, ro - s.grain, spring, a, b), -ro, spring + s.grain, ro, spring + ro), z0 + s.grain, z1 - s.grain)] + [
    h.prism('%s-stone-%d-%d' % [prefix, i, j], shade(i, j), 'z',
      angleCut(angleCut(sector(ri, ro, spring, a, b), spring, a + (if i == 0 then 0 else 0.008), true),
        spring, b - (if i == s.vault.segments - 1 then 0 else 0.008), false),
      z0 + (z1 - z0) * j / courses + (if j == 0 then 0 else s.joint / 2),
      z0 + (z1 - z0) * (j + 1) / courses - (if j == courses - 1 then 0 else s.joint / 2))
    for j in std.range(0, courses - 1)
  ] for i in std.range(0, s.vault.segments - 1)
]);
local pier = [h.box('pier-core', 'mortar', [-0.16, s.grain, -0.16], [0.16, s.storey - s.grain, 0.16])] + [
  h.box('quoin-%d' % j, shade(j), [-s.wall / 2, j * s.course + (if j == 0 then 0 else s.joint / 2), -s.wall / 2],
    [s.wall / 2, (j + 1) * s.course - (if j == 9 then 0 else s.joint / 2), s.wall / 2])
  for j in std.range(0, 9)
];
{
  rows: [
    row('pier', 'pier', 1050, pier),
    row('wall', 'ashlar wall', 4300, wallRect('wall', -half, 0, half, s.storey)),
    local w = s.slit;
    row('slit_window', 'slit window wall', 4000,
      wallRect('left', -half, 0, -w.halfWidth, s.storey)
      + wallRect('right', w.halfWidth, 0, half, s.storey)
      + wallRect('below', -w.halfWidth, 0, w.halfWidth, w.bottom)
      + wallRect('above', -w.halfWidth, w.top, w.halfWidth, s.storey)),
    local d = s.door;
    local outer = d.radius + d.ring;
    row('arch_doorway', 'arched doorway', 2600,
      wallRect('jamb-left', -half, 0, -d.radius, d.spring)
      + wallRect('jamb-right', d.radius, 0, half, d.spring)
      + arch('door-arch', d.radius, outer, d.spring, -s.wall / 2, s.wall / 2)
      + std.flattenArrays([
        local a = std.pi * i / s.vault.segments;
        local b = std.pi * (i + 1) / s.vault.segments;
        local p = arcPoint(outer, d.spring, a), q = arcPoint(outer, d.spring, b);
        masonry('spandrel-%d' % i, [p, [p[0], s.storey], [q[0], s.storey], q])
        for i in std.range(0, s.vault.segments - 1)
      ])),
    row('floor', 'flagstone floor bay', 1800, [
      h.box('bed', 'mortar', [-1, -s.floor, -1], [1, -s.joint, 1]),
    ] + [
      h.box('flag-%d-%d' % [i, j], shade(i, j),
        [-1 + i / 2 + (if i == 0 then 0 else s.joint / 2), -s.joint, -1 + j / 2 + (if j == 0 then 0 else s.joint / 2)],
        [-1 + (i + 1) / 2 - (if i == 3 then 0 else s.joint / 2), 0, -1 + (j + 1) / 2 - (if j == 3 then 0 else s.joint / 2)])
      for i in std.range(0, 3) for j in std.range(0, 3)
    ]),
    row('stair', 'half-storey stair flight', 6000, [
      // Alternate 14/16 cm risers on the 2 cm lattice, rather than rounding the final landing datum.
      h.box('step-%d' % i, shade(i), [-s.stair.width / 2, 0, -s.stair.run / 2 + s.stair.run * i / s.stair.steps],
        [s.stair.width / 2, std.round(s.stair.rise * (i + 1) / s.stair.steps / s.grain) * s.grain,
          -s.stair.run / 2 + s.stair.run * (i + 1) / s.stair.steps])
      for i in std.range(0, s.stair.steps - 1)
    ]),
    row('plinth', 'half-storey landing plinth', 13200, [
      h.box('core', 'mortar', [-0.98, 0.02, -0.98], [0.98, s.stair.rise - 0.02, 0.98]),
    ] + [
      h.box('block-%d-%d-%d' % [i, j, k], shade(i + k, j),
        [-1 + i / 2 + (if i == 0 then 0 else s.joint / 2), j * s.course + (if j == 0 then 0 else s.joint / 2),
          -1 + k / 2 + (if k == 0 then 0 else s.joint / 2)],
        [-1 + (i + 1) / 2 - (if i == 3 then 0 else s.joint / 2), (j + 1) * s.course - (if j == 4 then 0 else s.joint / 2),
          -1 + (k + 1) / 2 - (if k == 3 then 0 else s.joint / 2)])
      for i in std.range(0, 3) for j in std.range(0, 4) for k in std.range(0, 3)
    ]),
    row('battlement', 'crenellated parapet bay', 1200,
      wallRect('parapet', -1, 0, 1, s.parapet.base)
      + wallRect('left-merlon', -1, s.parapet.base, -0.8, s.parapet.height)
      + wallRect('middle-merlon', -0.2, s.parapet.base, 0.2, s.parapet.height)
      + wallRect('right-merlon', 0.8, s.parapet.base, 1, s.parapet.height)),
    row('arch_4m', 'arch, four metre span', 1150,
      arch('arch', s.vault.radius, s.vault.radius + s.vault.ring, 0, -s.wall / 2, s.wall / 2)),
    row('vault_4m', 'barrel vault bay, four metre span', 5700,
      arch('vault', s.vault.radius, s.vault.radius + s.vault.ring, 0, -s.bay / 2, s.bay / 2, 4)),
    row('vault_end_4m', 'vault end panel, four metre span', 5000,
      masonry('end-panel', [[-2, 0], [2, 0]] + [arcPoint(2, 0, std.pi * i / s.vault.segments) for i in std.range(1, s.vault.segments - 1)])),
    row('buttress', 'stepped buttress', 2450, std.flattenArrays([
      local depth = 1 - tier * 0.3;
      [h.box('core-%d' % tier, 'mortar', [-0.26, tier + s.grain, s.grain], [0.26, tier + 1 - s.grain, depth - s.joint])] + [
        h.box('stone-%d-%d' % [tier, i], shade(i, tier), [-0.3, tier + i / 4 + (if i == 0 then 0 else 0.02), 0],
          [0.3, tier + (i + 1) / 4 - (if i == 3 then 0 else 0.02), depth])
        for i in std.range(0, 3)
      ] for tier in std.range(0, 2)
    ])),
  ],
}
