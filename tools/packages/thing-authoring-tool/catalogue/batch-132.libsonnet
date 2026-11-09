local h = import '../compound.libsonnet';
local box = h.box;
// A box from two opposite corners given in any order, for pieces mirrored across x.
local sbox(id, slot, a, b) = box(id, slot, [std.min(a[k], b[k]) for k in [0, 1, 2]], [std.max(a[k], b[k]) for k in [0, 1, 2]]);
local rad(d) = d * std.pi / 180;
local sq(v) = v * v;

// Helmets and helmet attachments, each standing or lying as it is found loose, front on +z.

// A band curved round [0, cz] at radius r, thick t, from angle a0 to a1 (0 points to +z), in segments whose bottom
// and top heights `y0(ang)` and `y1(ang)` follow the angle at each segment's middle: visors.
local wrapBand(prefix, slot, r, t, a0, a1, steps, cz, y0, y1) = std.flattenArrays([
  local ang = a0 + (a1 - a0) * (i + 0.5) / steps;
  h.crescent('%s-%d' % [prefix, i], slot, r - t, r, a0 + (a1 - a0) * i / steps, a0 + (a1 - a0) * (i + 1) / steps, 1, y0(ang), y1(ang), 0, cz)
  for i in std.range(0, steps - 1)
]);
// The [x, z] point at angle `ang` degrees on a circle of radius r round [0, cz].
local onArc(r, ang, cz) = [r * std.sin(rad(ang)), cz + r * std.cos(rad(ang))];

// A closed ring turned about y from y0 to y1 between radii r0 and r1.
local ring(id, slot, r0, r1, y0, y1) = h.turned(id, slot, 'y', [[0, r0], [0, r1], [y1 - y0, r1], [y1 - y0, r0], [0, r0]], [0, y0, 0]);

// A clear visor standing on its lower edge with a brow bracket and a slot clip at each end, as batch 130's face
// shields have. Slots: visor, bracket, clip.
local clip(id, x, y, z, s) = [
  sbox(id + '-blade', 'clip', [x - s * 0.003, y - 0.008, z], [x + s * 0.003, y + 0.008, z - 0.03]),
  sbox(id + '-tab', 'clip', [x - s * 0.003, y - 0.012, z - 0.004], [x + s * 0.008, y + 0.012, z + 0.004]),
];
local visorShield(id, mass, r, span, ht, t, fin) =
  local cz = -r;
  h.compound(id, mass, wrapBand('visor', 'visor', r, t, -span, span, 14, cz, function(a) 0.008 * sq(a / span), function(a) ht - 0.008 * sq(a / span))
                       + wrapBand('brow', 'bracket', r + 0.002, 0.006, -span - 2, span + 2, 14, cz, function(a) ht - 0.012 - 0.008 * sq(a / span), function(a) ht + 0.004 - 0.008 * sq(a / span))
                       + std.flattenArrays([
                         local p = onArc(r + 0.003, s * (span + 2), cz);
                         [
                           sbox('arm-%d' % (s + 1), 'bracket', [p[0] - s * 0.006, ht - 0.014, p[1] + 0.006], [p[0] + s * 0.001, ht + 0.002, p[1] - 0.04]),
                         ] + clip('clip-%d' % (s + 1), p[0] - s * 0.004, ht - 0.006, p[1] - 0.04, s)
                         for s in [-1, 1]
                       ]),
             fin)
  + { voxelGrain: 0.004 };

// A close helm standing on its neck, front on +z: a rounded skull with a comb from brow to nape, side and back walls
// narrowing to the neck, a bevor closing the chin and mouth, a bulging visor with an eye slit hinged on a pivot at
// each temple, and gorget lames round the neck. `raised` swings the visor up a quarter turn over the brow, opening
// the face; `heavy` adds two more lames, a brow reinforce and rivets round the skull. Slots: steel, slit, rivet.
local closeHelm(id, mass, heavy, raised) =
  local yp = 0.19;  // the visor pivots' height; the pivot axis runs along x through z = 0.
  local lames = if heavy then 3 else 1;
  local neckTop = 0.016 * lames + (if heavy then 0 else 0.012);
  // Visor layers [y0, y1, radius at the edges, radius at the middle]: a pointed prow jutting forward round the eye
  // slit, which falls between the 3rd and 4th.
  local visorLayers = [[0.125, 0.145, 0.118, 0.122], [0.145, 0.162, 0.12, 0.138], [0.162, 0.178, 0.122, 0.152], [0.188, 0.205, 0.122, 0.148], [0.205, 0.222, 0.12, 0.134], [0.222, 0.238, 0.118, 0.12]];
  local span = 78, steps = 10;
  // The [x, z] quad of segment j of a prow layer t thick, its radius running from rEdge at the ends to rMid at the front.
  local prowQuad(rEdge, rMid, t, j, k=1) =
    local ang(i) = k * span * (2 * i / steps - 1);
    local r(i) = rEdge + (rMid - rEdge) * (1 - std.abs(2 * i / steps - 1));
    [onArc(r(j), ang(j), 0), onArc(r(j + 1), ang(j + 1), 0), onArc(r(j + 1) - t, ang(j + 1), 0), onArc(r(j) - t, ang(j), 0)];
  // A prow layer lying on y from y0 to y1, or swung up a quarter turn about the pivot axis when raised: height above
  // the pivot becomes depth behind it, and depth becomes height.
  local prow(prefix, slot, rEdge, rMid, t, y0, y1, k=1) = [
    local q = prowQuad(rEdge, rMid, t, j, k);
    if raised then h.prism('%s-%d' % [prefix, j], slot, 'z', [[p[0], yp + p[1]] for p in q], -(y1 - yp), -(y0 - yp))
    else h.prism('%s-%d' % [prefix, j], slot, 'y', [[p[1], p[0]] for p in q], y0, y1)
    for j in std.range(0, steps - 1)
  ];
  local visor = std.flattenArrays([prow('visor-%d' % i, 'steel', l[2], l[3], 0.004, l[0], l[1]) for i in std.range(0, std.length(visorLayers) - 1) for l in [visorLayers[i]]]);
  // The dark gap behind the eye slit, turned with the visor.
  local slit = prow('slit', 'slit', 0.12, 0.146, 0.006, 0.178, 0.188, 0.9);
  // Skull wall layers [y0, y1, radius], round the back and sides from the neck to the dome's rim.
  local wall = [[neckTop, 0.08, 0.1], [0.08, 0.12, 0.107], [0.12, 0.2, 0.11]];
  h.compound(id, mass,
             [
               // Gorget lames, each lapping over the one below.
               ring('lame-%d' % i, 'steel', 0.112 - 0.006 * i - (if heavy then 0 else 0.008), 0.118 - 0.006 * i - (if heavy then 0 else 0.008), 0.016 * i, 0.016 * i + (if heavy then 0.018 else 0.028))
               for i in std.range(0, lames - 1)
             ]
             + std.flattenArrays([
               h.crescent('wall-%d' % i, 'steel', wall[i][2] - 0.004, wall[i][2], 60, 300, 12, wall[i][0], wall[i][1])
               for i in std.range(0, std.length(wall) - 1)
             ])
             + [h.dome('skull', 'steel', 0.11, 0.09, 0.004, 'y', [0, 0.2, 0], 10)]
             // The comb, a raised ridge from brow to nape over the skull's circle (radius 0.1122 round y 0.178).
             + [
               local t0 = rad(-80 + 160 * i / 12), t1 = rad(-80 + 160 * (i + 1) / 12);
               local p(r, t) = [0.178 + r * std.cos(t), r * std.sin(t)];
               h.prism('comb-%d' % i, 'steel', 'x', [p(0.108, t0), p(0.126, t0), p(0.126, t1), p(0.108, t1)], -0.003, 0.003)
               for i in std.range(0, 11)
             ]
             // The bevor closing the chin and mouth, rounding forward at the chin.
             + h.crescent('bevor-0', 'steel', 0.1, 0.106, -75, 75, 10, neckTop, 0.08)
             + h.crescent('bevor-1', 'steel', 0.11, 0.116, -75, 75, 10, 0.08, 0.13)
             + visor
             + slit
             // The visor pivots at the temples, and the inner face showing behind a raised visor.
             + [
               h.turned('pivot-%d' % (s + 1), 'steel', 'x', [[0, 0], [0, 0.014], [0.008, 0.014], [0.012, 0.006], [0.012, 0]], [s * 0.112 - (if s < 0 then 0.012 else 0), yp, 0])
               for s in [-1, 1]
             ]
             + (if raised then h.crescent('face', 'slit', 0.1, 0.104, -60, 60, 8, 0.13, 0.2) else [])
             + (if heavy then
                  // A brow reinforce riveted over the front of the skull, under the visor's top.
                  h.crescent('reinforce', 'steel', 0.11, 0.116, -62, 62, 8, 0.2, 0.218)
                  + [
                    h.turned('rivet-%d' % i, 'rivet', 'y', [[0, 0], [0, 0.005], [0.003, 0.004], [0.004, 0]], [0.113 * std.sin(rad(a)), 0.13, 0.113 * std.cos(rad(a))])
                    for i in std.range(0, 7)
                    for a in [70 + 220 * i / 7]
                  ]
                else []),
             { steel: 'steel-hardened', slit: 'plastic-matte-black', rivet: 'steel-bright' })
  + { voxelGrain: 0.004 };

[

  // A hard hat sun shield lying flat, 540 mm across and 530 mm from front to back: a wide white plastic brim with a
  // raised collar round an opening that slips over a hard hat's rim, a deep flap at the back for the neck, and four
  // clips inside the collar that grip the rim.
  h.compound('sun_shield', 0.098,
             h.crescent('brim', 'brim', 0.118, 0.215, 0, 360, 24, 0, 0.003)
             + h.crescent('flap', 'brim', 0.214, 0.31, 118, 242, 10, 0, 0.003)
             + h.crescent('flap-hem', 'hem', 0.3, 0.31, 118, 242, 10, 0.003, 0.006)
             + h.crescent('hem', 'hem', 0.207, 0.215, -118, 118, 18, 0.003, 0.006)
             + [ring('collar', 'brim', 0.114, 0.118, 0, 0.03)]
             + [
               local p = onArc(0.112, a, 0);
               sbox('clip-%d' % i, 'clip', [p[0] - 0.008, 0.012, p[1] - 0.008], [p[0] + 0.008, 0.026, p[1] + 0.008])
               for i in std.range(0, 3)
               for a in [45 + 90 * i]
             ],
             { brim: 'plastic-white', hem: 'plastic-matte-black', clip: 'plastic-matte-black' })
  + { voxelGrain: 0.004, taxonomy: { category: 'clothing', tags: { slot: ['head'], material: ['plastic'], setting: ['modern'] } } },
]
