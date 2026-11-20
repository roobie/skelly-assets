// A bounded woodland kit. Its trees and shrubs grow from species (grown.libsonnet); the cone pine, saplings, deadwood,
// ground cover and rocks are drawn from the compound primitives.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local grown = import 'grown.libsonnet';
local s = import 'woodland.spec.libsonnet';
local add(a, b) = [a[i] + b[i] for i in [0, 1, 2]];
local mul(a, k) = [v * k for v in a];
local dot(a, b) = std.sum([a[i] * b[i] for i in [0, 1, 2]]);
local cross(a, b) = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
local unit(a) = mul(a, 1 / std.sqrt(dot(a, a)));
local polar(radius, angle, y=0) = [radius * std.cos(angle), y, radius * std.sin(angle)];
local flat(id, slot, lo, hi, planes) = h.prism(id, slot, 'y', [
  [lo[2], lo[0]], [lo[2], hi[0]], [hi[2], hi[0]], [hi[2], lo[0]],
], lo[1], hi[1]) + { clip: planes };
// A tapered octagonal branch between authored endpoints. Caps and radial planes form one convex solid;
// no rotation feature or general hull primitive is added to the exporter.
local branch(id, slot, a, b, r0, r1, floor=s.rootFloor) =
  local length = std.sqrt(dot(add(b, mul(a, -1)), add(b, mul(a, -1))));
  local d = unit(add(b, mul(a, -1)));
  local u = unit(cross(d, if std.abs(d[1]) < 0.9 then [0, 1, 0] else [0, 0, 1]));
  local v = cross(d, u);
  local taper = (r0 - r1) / length;
  local radius = std.max(r0, r1) * 1.1;
  local lo = [std.min(a[i], b[i]) - radius for i in [0, 1, 2]];
  local hi = [std.max(a[i], b[i]) + radius for i in [0, 1, 2]];
  flat(id, slot, lo, hi, [
    { normal: mul(d, -1), offset: -dot(d, a) }, { normal: d, offset: dot(d, b) },
    { normal: [0, -1, 0], offset: -floor },
  ] + [
    local radial = add(mul(u, std.cos(i * std.pi / 4)), mul(v, std.sin(i * std.pi / 4)));
    local n = add(radial, mul(d, taper));
    { normal: n, offset: r0 + dot(n, a) }
    for i in std.range(0, 7)
  ]);
// Faceted opaque crown/rock volumes. Unequal plane offsets give authored asymmetry without runtime randomness.
local lump(id, slot, c, r, seed, floor=-100) =
  local lo = [c[i] - r[i] for i in [0, 1, 2]], hi = [c[i] + r[i] for i in [0, 1, 2]];
  flat(id, slot, lo, hi, [{ normal: [0, -1, 0], offset: -floor }] + [
    local length = std.sqrt(x * x + y * y + z * z);
    local n = [x / r[0] / length, y / r[1] / length, z / r[2] / length];
    local skew = if length == 1 then 0 else 0.08 * std.sin(seed * 2.3 + x * 1.7 + y * 3.1 + z * 2.7);
    { normal: n, offset: 1 + skew + dot(n, c) }
    for x in [-1, 0, 1] for y in [-1, 0, 1] for z in [-1, 0, 1]
    if x != 0 || y != 0 || z != 0
  ]);
local scalePieces(pieces, k) = [
  if p.kind == 'prism' then p + {
    profile: [[q[0] * k[2], q[1] * k[0]] for q in p.profile], start: p.start * k[1], end: p.end * k[1],
    clip: [plane + { normal: [plane.normal[i] / k[i] for i in [0, 1, 2]] } for plane in p.clip],
  } else if p.kind == 'box' then p + { min: [p.min[i] * k[i] for i in [0, 1, 2]], max: [p.max[i] * k[i] for i in [0, 1, 2]] }
  else p + {
    profile: [[q[0] * k[1], q[1] * k[0]] for q in p.profile],
    origin: [p.origin[i] * k[i] for i in [0, 1, 2]],
  }
  for p in pieces
];
local roots(radius=0.42, reach=1, slot='trunk') = [
  branch('root-%d' % i, slot, polar(radius * 0.25, a, 0.2), polar(reach, a, 0.015), radius * 0.4, 0.04)
  for i in std.range(0, 4) for a in [i * 2 * std.pi / 5 + 0.3]
];
local oak(seed) = roots() + [
  branch('bole-base', 'trunk', [0, -0.08, 0], [0.12, 1.5, -0.04], 0.42, 0.32),
  branch('bole-mid', 'trunk', [0.12, 1.5, -0.04], [-0.12, 3, 0.1], 0.32, 0.24),
  branch('bole-fork', 'trunk', [-0.12, 3, 0.1], [0.25, 4.6, 0.08], 0.24, 0.16),
  branch('leader', 'trunk', [0.25, 4.6, 0.08], [0.4, 7.1, 0.04], 0.16, 0.045),
  lump('crown-centre', 'leaf', [0.1, 6.7, 0], [2, 1.75, 1.85], seed),
  lump('crown-top', 'leaf', [0.45, 8.05, 0.14], [1.2, 0.9, 1.1], seed + 2),
] + std.flattenArrays([
  local angle = seed + i * 2.4;
  local end = polar(2.1 + (i % 2) * 0.22, angle, 5.4 + 0.24 * (i % 3));
  local mid = polar(1, angle - 0.12, 4.45 + 0.2 * (i % 3));
  [
    branch('limb-%d' % i, 'trunk', [0, 3.1 + 0.2 * (i % 3), 0.05], mid, 0.18, 0.12),
    branch('twig-%d' % i, 'trunk', mid, end, 0.12, 0.055),
    lump('crown-%d' % i, 'leaf', add(end, [0.08, 0.65, 0.06]), [1.65, 1.25 + i * 0.025, 1.45], seed + i),
  ]
  for i in std.range(0, 5)
]);
local pine = roots(0.27, 0.75) + [
  branch('bole', 'trunk', [0, -0.08, 0], [0.06, 9.9, 0.03], 0.27, 0.025),
] + std.flattenArrays([
  local bottom = 2.3 + i * 0.95, rise = 2.25 - i * 0.12, r = 2.15 * (1 - i / 9);
  [h.turned('needles-%d' % i, 'leaf', 'y', [
    [0, 0], [0, r * 0.75], [0.12, r], [rise * 0.35, r * 0.7], [rise, 0.015], [rise, 0],
  ], [0.05 * std.sin(i * 2), bottom, 0.05 * std.cos(i * 2)]) + { sides: 8 }]
  + [branch('bough-%d-%d' % [i, j], 'trunk', [0, bottom + 0.45, 0], polar(r * 0.9, a, bottom + 0.14), 0.08 * (1 - i / 10), 0.02)
     for j in std.range(0, 3) for a in [j * std.pi / 2 + i * 0.4]]
  for i in std.range(0, 7)
]);
local finish = { trunk: 'bark', bark: 'bark', leaf: 'foliage-oak', cut: 'wood-oak', cavity: 'wood-weathered', stone: 'stone-grey', moss: 'moss-woodland' };
local row(id, title, kg, pieces, grain, materials, extra={}, keywords=[]) =
  h.compound(id, kg, pieces, finish + extra) + {
    title: title, voxelGrain: grain,
    taxonomy: { category: 'nature', tags: { material: materials }, keywords: keywords },
  };
local stump(hollow) = roots(0.55, 1.1) + (if hollow then [
  h.turned('hollow-bole', 'trunk', 'y', [[-0.08, 0.57], [0.12, 0.5], [0.76, 0.42], [0.76, 0.27], [0.12, 0.34], [-0.08, 0.34], [-0.08, 0.57]], [0, 0, 0]) + { sides: 12 },
  h.turned('cavity-bed', 'cavity', 'y', [[-0.08, 0], [-0.08, 0.35], [0.12, 0.35], [0.12, 0]], [0, 0, 0]) + { sides: 12 },
  h.turned('broken-rim', 'cut', 'y', [[0.76, 0.42], [0.8, 0.4], [0.8, 0.28], [0.76, 0.27], [0.76, 0.42]], [0, 0, 0]) + { sides: 12 },
] else [
  h.turned('bole', 'trunk', 'y', [[-0.08, 0], [-0.08, 0.6], [0.18, 0.5], [0.56, 0.46], [0.56, 0]], [0, 0, 0]) + { sides: 12 },
  h.turned('cut-face', 'cut', 'y', [[0.56, 0], [0.56, 0.41], [0.6, 0.41], [0.6, 0]], [0, 0, 0]) + { sides: 12 },
  h.turned('growth-ring', 'trunk', 'y', [[0.6, 0.24], [0.62, 0.24], [0.62, 0.21], [0.6, 0.21], [0.6, 0.24]], [0, 0, 0]) + { sides: 12 },
]);
local fern = [lump('crown', 'trunk', [0, 0.06, 0], [0.08, 0.1, 0.08], 0, 0)] + std.flattenArrays([
  local a = i * 2 * std.pi / 7;
  local end = polar(0.84, a, 0.25 + (i % 2) * 0.05);
  local mid = polar(0.4, a, 0.52);
  [branch('stalk-a-%d' % i, 'leaf', [0, 0.04, 0], mid, 0.025, 0.02, 0), branch('stalk-b-%d' % i, 'leaf', mid, end, 0.02, 0.008, 0)]
  + std.flattenArrays([
    local t = 0.22 + j * 0.12;
    local split = 0.4 / 0.84;
    local base = [0, 0.04, 0];
    // Use the actual two stalk segments, including their alternating tip heights, so leaflets cannot float.
    local c = if t < split then add(base, mul(add(mid, mul(base, -1)), t / split))
              else add(mid, mul(add(end, mul(mid, -1)), (t - split) / (1 - split)));
    local length = 0.24 * std.sin(t * std.pi);
    [
      local tip = add(c, polar(length, a + side * 1.08));
      local m = mul(add(c, tip), 0.5);
      local w = polar(0.035, a);
      h.prism('leaflet-%d-%d-%d' % [i, j, side], 'leaf', 'y', [
        [c[2], c[0]], [m[2] + w[2], m[0] + w[0]], [tip[2], tip[0]], [m[2] - w[2], m[0] - w[0]],
      ], c[1], c[1] + 0.04)
      for side in [-1, 1]
    ]
    for j in std.range(0, 5)
  ])
  for i in std.range(0, 6)
]);
// A finite-thickness blade in a radial vertical plane. Opaque prisms work in both existing render styles.
local grassBlade(i) =
  local a = i * 2.4;
  local d = polar(1, a), n = polar(1, a + std.pi / 2);
  local base = polar(0.06 + 0.04 * (i % 3), a);
  local height = 0.28 + (i % 5) * 0.055;
  local outline = [[-0.035, 0], [0.035, 0], [0.18, height * 0.6], [0.24, height]];
  local min = [base[0] - 0.3, 0, base[2] - 0.3], max = [base[0] + 0.3, height, base[2] + 0.3];
  flat('blade-%d' % i, 'leaf', min, max, [
    { normal: n, offset: dot(n, base) + 0.02 }, { normal: mul(n, -1), offset: -dot(n, base) + 0.02 },
  ] + [
    local p = outline[j], q = outline[(j + 1) % 4];
    local normal = add(mul(d, q[1] - p[1]), [0, p[0] - q[0], 0]);
    { normal: normal, offset: (q[1] - p[1]) * p[0] + (p[0] - q[0]) * p[1] + dot(normal, base) }
    for j in std.range(0, 3)
  ]);
{
  rows: [
    grown.row(t.id, t.title, t.species, t.seed, t.kg, std.get(t, 'grain', s.grownGrain), std.get(t, 'density', s.grownDensity))
    for t in s.grown
  ] + [
    row(t.id, t.title, t.kg, scalePieces(if t.form == 'oak' then oak(t.seed) else pine, t.scale), t.grain, ['wood', 'plant'],
      if t.form == 'pine' then { leaf: 'foliage-pine' } else {}, keywords=s.keywords.tree)
    for t in s.trees
  ] + [
    row('woodland_snag', 'Broken woodland snag', 1100, roots() + [
      branch('bole', 'trunk', [0, -0.08, 0], [0.1, 3.4, 0.05], 0.4, 0.22),
      branch('broken-leader', 'trunk', [0.1, 3.4, 0.05], [0.35, 5.5, 0.08], 0.22, 0.12),
      branch('split-tip', 'cut', [0.35, 5.45, 0.08], [0.43, 5.9, 0.12], 0.09, 0.045),
      branch('dead-limb-a', 'trunk', [0.08, 2.9, 0.04], [-1.1, 4.1, 0.35], 0.16, 0.07),
      branch('dead-limb-b', 'trunk', [-1.1, 4.1, 0.35], [-1.7, 4.4, 0.4], 0.07, 0.025),
      branch('dead-limb-c', 'trunk', [0.16, 3.9, 0.05], [0.9, 4.7, -0.7], 0.12, 0.035),
    ], 0.06, ['wood'], { trunk: 'wood-weathered' }, keywords=s.keywords.tree + s.keywords.deadwood),
    row('woodland_stump_cut', 'Cut woodland stump', 140, stump(false), 0.04, ['wood'], keywords=s.keywords.deadwood),
    row('woodland_stump_hollow', 'Hollow woodland stump', 100, stump(true), 0.04, ['wood'], keywords=s.keywords.deadwood),
    row('woodland_fallen_log', 'Fallen woodland log', 280, [
      branch('bole-a', 'trunk', [-1.9, 0.3, 0], [0.1, 0.31, 0.06], 0.34, 0.31, 0),
      branch('bole-b', 'trunk', [0.1, 0.31, 0.06], [1.8, 0.28, 0.02], 0.31, 0.28, 0),
      h.turned('cut-end', 'cut', 'x', [[0, 0], [0, 0.3], [0.04, 0.3], [0.04, 0]], [-1.94, 0.3, 0]) + { sides: 12 },
      branch('branch-stub', 'trunk', [-0.25, 0.5, 0.1], [0.2, 1, 0.4], 0.12, 0.07, 0),
      branch('broken-stub', 'cut', [0.2, 1, 0.4], [0.22, 1.025, 0.415], 0.07, 0.06, 0),
    ], 0.04, ['wood'], keywords=s.keywords.deadwood),
    row('woodland_fern', 'Woodland fern clump', 0.7, fern, 0.02, ['plant'], { leaf: 'foliage-understorey' }),
    row('woodland_grass', 'Woodland grass tuft', 0.3, [grassBlade(i) for i in std.range(0, 19)], 0.02, ['plant'], { leaf: 'grass-woodland' }),
  ] + [
    local body = lump('stone', 'stone', rock.centre, rock.radii, rock.seed, s.rockFloor);
    local pieces = if !rock.moss then [body] else [
      body + { clip+: [{ normal: [0, 1, 0], offset: s.mossBase }] },
      body + { id: 'moss-crown', slot: 'moss', clip+: [{ normal: [0, -1, 0], offset: -s.mossBase }] },
    ];
    row(rock.id, rock.title, rock.kg, pieces, s.rockGrain, if rock.moss then ['stone', 'plant'] else ['stone'])
    for rock in s.rocks
  ],
}
