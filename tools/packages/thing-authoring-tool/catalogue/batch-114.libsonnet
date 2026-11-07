local h = import '../compound.libsonnet';
local box = h.box;

// Coats and jackets folded on a shelf: each lies on h.foldedGarment, `w` across x and `d` along z, its top face at
// `ht`, with the collar at the +z end (front) and the hem folded under at the -z end.

// A flat convex outline of [x, z] points lying on a top face from y to y + t.
local flat(id, slot, pts, y, t=0.004) = h.prism(id, slot, 'y', [[p[1], p[0]] for p in pts], y, y + t);

// A strip `w` wide lying on a top face at y, from [xa, za] to [xb, zb].
local strip(id, slot, a, b, y, w=0.012, t=0.004) =
  local dx = b[0] - a[0], dz = b[1] - a[1], len = std.sqrt(dx * dx + dz * dz);
  local nx = -dz / len * w / 2, nz = dx / len * w / 2;
  flat(id, slot, [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], y, t);

// A collar round the neck at (0, cz), open towards the hem by `gap` degrees either side.
local collar(prefix, slot, r, wd, y, ht, cz, gap=35) = h.crescent(prefix, slot, r, r + wd, -180 + gap, 180 - gap, 12, y, y + ht, 0, cz);

// Round buttons or snaps at x along each z in zs, on a face at y.
local buttons(prefix, slot, x, zs, y, r=0.007, t=0.004) = [
  h.disc('%s-%d' % [prefix, i], slot, r, y, y + t, x, zs[i])
  for i in std.range(0, std.length(zs) - 1)
];

// A patch pocket centred on (x, z) with an optional flap across its collar-side edge.
local pocket(id, slot, flapSlot, x, z, w, d, y, flap=0.03) = [
  box(id, slot, [x - w / 2, y, z - d / 2], [x + w / 2, y + 0.004, z + d / 2]),
] + (if flapSlot == null then [] else [
       box(id + '-flap', flapSlot, [x - w / 2 - 0.003, y + 0.004, z + d / 2 - flap], [x + w / 2 + 0.003, y + 0.008, z + d / 2 + 0.003]),
     ]);

// A belt, sash or tie wrapped across the bundle at z, over the top and down both sides.
local bandX(id, slot, z, bw, w, ht, t=0.004) = [
  box(id + '-top', slot, [-w / 2 - t, ht, z - bw / 2], [w / 2 + t, ht + t, z + bw / 2]),
  box(id + '-left', slot, [-w / 2 - t, 0, z - bw / 2], [-w / 2, ht, z + bw / 2]),
  box(id + '-right', slot, [w / 2, 0, z - bw / 2], [w / 2 + t, ht, z + bw / 2]),
];

// A hood folded flat on the top face behind the collar, its crown draped over the front edge.
local hood(prefix, slot, w, d, ht, hw, hl, t=0.012) = [
  flat(prefix + '-flat', slot, [[-hw / 2, d / 2], [hw / 2, d / 2], [hw / 2 - 0.02, d / 2 - hl * 0.6], [0, d / 2 - hl], [-hw / 2 + 0.02, d / 2 - hl * 0.6]], ht, t),
  box(prefix + '-drape', slot, [-hw / 2, ht * 0.35, d / 2], [hw / 2, ht + t, d / 2 + t]),
];

// The hakama folded in a long bundle, pleats running its length, the stiff back board at the +z end and the long
// ties crossed over the top and wrapped round it.
local hakama(id, mass) =
  local w = 0.3, d = 0.42, ht = 0.045;
  h.compound(id, mass, h.foldedGarment(w, d, ht, 3) + [
    strip('pleat-%d' % i, 'pleat', [x, d / 2 - 0.1], [x, -d / 2 + 0.02], ht, 0.006, 0.003)
    for i in std.range(0, 4)
    for x in [-0.1 + i * 0.05]
  ] + [
    flat('board', 'cloth', [[-0.1, d / 2], [0.1, d / 2], [0.075, d / 2 - 0.09], [-0.075, d / 2 - 0.09]], ht, 0.008),
    strip('tie-a', 'tie', [-w / 2, 0.08], [w / 2, -0.12], ht + 0.003, 0.016),
    strip('tie-b', 'tie', [w / 2, 0.08], [-w / 2, -0.12], ht + 0.007, 0.016),
    box('knot', 'tie', [-0.025, ht + 0.003, -0.04], [0.025, ht + 0.018, 0.0]),
  ] + bandX('tie-wrap', 'tie', -0.02, 0.016, w, ht), { cloth: 'cloth-navy', pleat: 'cloth-black', tie: 'cloth-navy' })
  + { voxelGrain: 0.004 };

[
  local w = 0.36, d = 0.3, ht = 0.07, cz = d / 2 - 0.08;
  h.compound('jacket_leather', 1.45, h.foldedGarment(w, d, ht, 3)
                                     + collar('collar', 'cloth', 0.06, 0.025, ht, 0.01, cz, 40)
                                     + [
                                       flat('lapel-l', 'cloth', [[-0.04, cz - 0.04], [-0.13, cz - 0.03], [-0.06, cz - 0.15]], ht, 0.008),
                                       flat('lapel-r', 'cloth', [[0.04, cz - 0.04], [0.13, cz - 0.03], [0.06, cz - 0.15]], ht, 0.008),
                                       strip('zip-a', 'zip', [0.07, cz - 0.07], [0.035, -0.04], ht, 0.008),
                                       strip('zip-b', 'zip', [0.035, -0.04], [0.035, -d / 2 + 0.04], ht, 0.008),
                                       strip('pocket-zip-l', 'zip', [-0.15, -0.1], [-0.07, -0.05], ht, 0.006),
                                       strip('pocket-zip-r', 'zip', [0.14, -0.1], [0.08, -0.06], ht, 0.006),
                                       box('belt', 'cloth', [-w / 2, ht, -d / 2], [w / 2, ht + 0.006, -d / 2 + 0.035]),
                                       box('buckle', 'zip', [0.12, ht + 0.006, -d / 2 + 0.002], [0.15, ht + 0.01, -d / 2 + 0.033]),
                                     ]
                                     + buttons('stud-l', 'zip', -0.11, [cz - 0.04], ht + 0.008, 0.005)
                                     + buttons('stud-r', 'zip', 0.11, [cz - 0.04], ht + 0.008, 0.005),
             { cloth: 'leather-black', zip: 'metal-silver' })
  + { voxelGrain: 0.004 },
]
