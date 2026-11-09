local h = import '../compound.libsonnet';
local box = h.box;

// Underwear and wraps laid flat, outside up: tops and pants with the waist or neck towards -z, wraps half rolled up
// with the loose end lying towards +z.

// A box from two opposite corners given in any order, for pieces mirrored across x.
local sbox(id, slot, a, b) = box(id, slot, [std.min(a[k], b[k]) for k in [0, 1, 2]], [std.max(a[k], b[k]) for k in [0, 1, 2]]);
// A flat convex outline of [x, z] points lying on a top face from y to y + t.
local flat(id, slot, pts, y, t=0.003) = h.prism(id, slot, 'y', [[p[1], p[0]] for p in pts], y, y + t);
// A strip `w` wide lying on a top face at y, from [xa, za] to [xb, zb].
local strip(id, slot, a, b, y, w=0.01, t=0.003) =
  local dx = b[0] - a[0], dz = b[1] - a[1], len = std.sqrt(dx * dx + dz * dz);
  local nx = -dz / len * w / 2, nz = dx / len * w / 2;
  flat(id, slot, [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], y, t);
// A cord through the points of `pts`, as strips from each point to the next.
local cord(prefix, slot, pts, y, w=0.006, t=0.003) = [
  strip('%s-%d' % [prefix, i], slot, pts[i], pts[i + 1], y, w, t)
  for i in std.range(0, std.length(pts) - 2)
];

// A cloth wrap half rolled up: a roll `w` wide and `r` in radius lying across x at -z, and its loose end `tail`
// long and `t` thick running out to +z, finished by two tie strips. `patches` lie on the loose end as [x, z, w, l]
// with a stitched border when `stitched`; `tufts` sets ragged pelt edges along the loose end. Slots: cloth, layer,
// patch, stitch, tie.
local wrap(w, r, tail, t, patches=[], stitched=false, tufts=false) =
  local z0 = -tail / 2, z1 = z0 + tail;
  [
    h.turned('roll', 'cloth', 'x', [[0, 0], [0, r], [w, r], [w, 0]], [-w / 2, r, z0]),
    box('end', 'cloth', [-w / 2, 0, z0], [w / 2, t, z1]),
  ]
  // The turns of the roll showing at each end.
  + [
    h.tube('turn-%d-%d' % [s + 1, i], 'layer', r * f - 0.003, r * f, if s < 0 then -w / 2 - 0.002 else w / 2, if s < 0 then -w / 2 else w / 2 + 0.002, r, z0)
    for s in [-1, 1]
    for i in [0, 1, 2]
    for f in [[0.35, 0.62, 0.9][i]]
  ]
  + std.flattenArrays([
    local p = patches[n], x = p[0], z = p[1], pw = p[2], pl = p[3];
    [box('patch-%d' % n, 'patch', [x - pw / 2, t, z - pl / 2], [x + pw / 2, t + 0.002, z + pl / 2])]
    + (if stitched then [
         box('stitch-%d-%d' % [n, j], 'stitch', [x - pw / 2 + 0.004, t + 0.002, zz - 0.001], [x + pw / 2 - 0.004, t + 0.003, zz + 0.001])
         for j in [0, 1]
         for zz in [[z - pl / 2 + 0.005, z + pl / 2 - 0.005][j]]
       ] + [
         box('stitch-side-%d-%d' % [n, j], 'stitch', [xx - 0.001, t + 0.002, z - pl / 2 + 0.005], [xx + 0.001, t + 0.003, z + pl / 2 - 0.005])
         for j in [0, 1]
         for xx in [[x - pw / 2 + 0.005, x + pw / 2 - 0.005][j]]
       ] else [])
    for n in std.range(0, std.length(patches) - 1)
  ])
  // Ragged pelt edges: uneven tufts along both sides of the loose end.
  + (if tufts then [
       local dz = tail / 7, zz = z0 + r + i * (tail - r) / 7, out = [0.008, 0.014, 0.006, 0.012, 0.01, 0.016, 0.007][i];
       sbox('tuft-%d-%d' % [s + 1, i], 'cloth', [s * w / 2, 0, zz], [s * (w / 2 + out), t * 0.8, zz + dz * 0.6])
       for s in [-1, 1]
       for i in std.range(0, 6)
     ] else [])
  // Two tie strips from the end, splayed apart.
  + std.flattenArrays([
    cord('tie-%d' % (s + 1), 'tie', [[s * w * 0.3, z1 - 0.01], [s * w * 0.36, z1 + 0.07], [s * w * 0.5, z1 + 0.12]], t, 0.016, 0.003)
    for s in [-1, 1]
  ]);

// A top of two hide cups laid flat, neck at -z: each cup a rounded triangle `cw` across and `ch` tall, `t` thick, on
// a backing a little larger, laced together at the centre and tied with thongs round the back and neck. Slots:
// cup, backing, lace, stitch.
local hideTop(cw, ch, t, stitched) =
  local gap = 0.03, zb = ch / 2, zt = -ch / 2;
  local cupPts(cx, inset) = [
    [cx - cw / 2 + inset, zb - inset],
    [cx + cw / 2 - inset, zb - inset],
    [cx + cw * 0.38 - inset, zb - ch * 0.4],
    [cx + cw * 0.08, zt + inset],
    [cx - cw * 0.08, zt + inset],
    [cx - cw * 0.38 + inset, zb - ch * 0.4],
  ];
  std.flattenArrays([
    local cx = s * (gap / 2 + cw / 2);
    [
      flat('backing-%d' % (s + 1), 'backing', cupPts(cx, -0.004), 0, 0.002),
      flat('cup-%d' % (s + 1), 'cup', cupPts(cx, 0), 0.002, t),
    ]
    + (if stitched then [
         strip('stitch-%d-%d' % [s + 1, i], 'stitch', cupPts(cx, 0.008)[i], cupPts(cx, 0.008)[(i + 1) % 6], 0.002 + t, 0.002, 0.001)
         for i in std.range(0, 5)
       ] else [])
    // The thong round the back from the outer corner, and the neck thong from the point.
    + cord('band-%d' % (s + 1), 'lace', [[s * (gap / 2 + cw), zb - 0.006], [s * (gap / 2 + cw + 0.08), zb], [s * (gap / 2 + cw + 0.13), zb + 0.03]], 0)
    + cord('neck-%d' % (s + 1), 'lace', [[cx, zt], [cx + s * 0.015, zt - 0.06], [cx - s * 0.01, zt - 0.11]], 0)
    for s in [-1, 1]
  ])
  // Criss-cross lacing across the centre gap.
  + [
    strip('cross-%d-%d' % [i, j], 'lace', [-gap / 2 - 0.008, zb - 0.01 - i * 0.025 - (if j == 0 then 0 else 0.02)], [gap / 2 + 0.008, zb - 0.01 - i * 0.025 - (if j == 0 then 0.02 else 0)], 0.002 + t, 0.005, 0.002)
    for i in [0, 1]
    for j in [0, 1]
  ];

// A tied bow at [x, z]: a knot and two loops either side of it along x.
local bow(prefix, slot, x, z, y, s=0.01, t=0.003) = [
  flat(prefix + '-loop-a', slot, [[x - 0.002, z], [x - s, z - s * 0.6], [x - s, z + s * 0.6]], y, t),
  flat(prefix + '-loop-b', slot, [[x + 0.002, z], [x + s, z - s * 0.6], [x + s, z + s * 0.6]], y, t),
  box(prefix + '-knot', slot, [x - 0.003, y, z - 0.003], [x + 0.003, y + t + 0.001, z + 0.003]),
];

// Pants laid flat, waist at -z: a waist `w` across, a seat down to the crotch at `rise`, and then either a pouch
// narrowing to `crotch` across at `l` (briefs), or two legs to a hem at `l`, `hem` across each and splayed `flare`
// outward. A waistband `band` deep sits on top, and each leg or leg opening gets a hem strip. Slots: cloth, band,
// hem.
local pants(w, rise, l, band, legs, crotch=0.08, hem=0.15, flare=0, t=0.003) =
  local z0 = -l / 2, zr = z0 + rise, z1 = l / 2;
  (if legs then [
     box('seat', 'cloth', [-w / 2, 0, z0], [w / 2, t, zr]),
   ] + std.flattenArrays([
     local outer = s * (w / 2 + flare), inner = s * (w / 2 + flare - hem);
     [
       flat('leg-%d' % (s + 1), 'cloth', [[0, zr], [s * w / 2, zr], [outer, z1], [inner, z1]], 0, t),
       strip('leg-hem-%d' % (s + 1), 'hem', [inner, z1 - 0.004], [outer, z1 - 0.004], t, 0.008, 0.002),
     ]
     for s in [-1, 1]
   ]) else [
     flat('body', 'cloth', [[-w / 2, z0], [w / 2, z0], [w / 2, zr], [crotch / 2, z1], [-crotch / 2, z1], [-w / 2, zr]], 0, t),
   ] + [
     strip('leg-hem-%d' % (s + 1), 'hem', [s * (w / 2 - 0.003), zr], [s * (crotch / 2 - 0.002), z1 - 0.003], t, 0.007, 0.002)
     for s in [-1, 1]
   ])
  + [box('band', 'band', [-w / 2, t, z0], [w / 2, t + 0.003, z0 + band])];

// A bra laid flat, cups up, neck at -z: two moulded cups `r` in rim radius on an underband with hook and eye tabs
// at its ends, a centre gore, lace along the top of each cup, and straps with sliders lying out towards -z. Slots:
// cup, band, trim, strap, hook.
local braFlat(r, depth) =
  local cx = r + 0.008, bz = r * 0.75;
  std.flattenArrays([
    [
      h.dome('cup-%d' % (s + 1), 'cup', r, depth, 0.003, 'y', [s * cx, 0.002, 0]),
      sbox('wing-%d' % (s + 1), 'band', [s * cx, 0, bz - 0.006], [s * (cx + r + 0.11), 0.003, bz + 0.02]),
      sbox('tab-%d' % (s + 1), if s < 0 then 'hook' else 'band', [s * (cx + r + 0.11), 0, bz - 0.004], [s * (cx + r + 0.13), 0.004, bz + 0.018]),
    ]
    + h.crescent('lace-%d' % (s + 1), 'trim', r - 0.002, r + 0.006, 95, 265, 8, 0.002, 0.005, s * cx, 0)
    + cord('strap-%d' % (s + 1), 'strap', [[s * cx, -r + 0.004], [s * (cx + 0.01), -r - 0.08], [s * (cx + 0.05), -r - 0.16]], 0, 0.012, 0.002)
    + [sbox('slider-%d' % (s + 1), 'hook', [s * (cx + 0.004), 0.002, -r - 0.07], [s * (cx + 0.024), 0.004, -r - 0.062])]
    for s in [-1, 1]
  ])
  + [
    box('gore', 'band', [-0.012, 0, -0.01], [0.012, 0.003, bz + 0.02]),
    box('under', 'band', [-cx, 0, bz - 0.006], [cx, 0.003, bz + 0.02]),
  ]
  + bow('gore-bow', 'trim', 0, -0.006, 0.003, 0.006, 0.002);

[

  // A chest binder laid flat, neck at -z, 300 mm across and 360 mm long with its straps: a short stretch tank
  // ending above the waist, wide shoulder straps, a doubled compression panel across the front with its seams
  // showing, and a hem band.
  h.compound('binder_top', 0.11, [
    flat('body', 'cloth', [[-0.12, -0.08], [0.12, -0.08], [0.15, -0.02], [0.15, 0.13], [-0.15, 0.13], [-0.15, -0.02]], 0, 0.003),
    box('panel', 'panel', [-0.13, 0.003, -0.05], [0.13, 0.005, 0.1]),
    box('hem', 'hem', [-0.15, 0.003, 0.11], [0.15, 0.005, 0.13]),
    box('seam-mid', 'seam', [-0.001, 0.005, -0.05], [0.001, 0.006, 0.1]),
  ] + std.flattenArrays([
    [
      sbox('strap-%d' % (s + 1), 'cloth', [s * 0.06, 0, -0.23], [s * 0.11, 0.003, -0.08]),
      sbox('strap-seam-%d' % (s + 1), 'seam', [s * 0.06, 0.003, -0.21], [s * 0.11, 0.004, -0.205]),
      sbox('panel-seam-%d' % (s + 1), 'seam', [s * 0.128, 0.005, -0.05], [s * 0.13, 0.006, 0.1]),
      sbox('neck-%d' % (s + 1), 'hem', [s * 0.0, 0.003, -0.08], [s * 0.06, 0.004, -0.072]),
    ]
    for s in [-1, 1]
  ]), {
    cloth: 'cloth-cream',
    panel: 'latex-pale',
    hem: 'cloth-heather-grey',
    seam: 'cloth-heather-grey',
  }) + { voxelGrain: 0.002 } + { taxonomy: { category: 'clothing', tags: { slot: ['torso'] } } },
]
