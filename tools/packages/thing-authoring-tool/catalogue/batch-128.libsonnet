local h = import '../compound.libsonnet';
local box = h.box;

// Hats, caps and headscarves as found on a shelf: hats and caps standing upright on their band, the face at +z;
// scarves and veils folded flat; the frilled headpiece and ear pads laid flat.

local rad(d) = d * std.pi / 180;

// A solid crown turned on y: a superellipse of radius `r` and height `ht`, exponent `p` (2 round, higher squarer),
// standing on y0.
local crown(id, slot, r, ht, p, y0=0, x=0, z=0, n=10) =
  h.turned(id, slot, 'y', [[0, 0], [0, r]] + [
    [ht * std.pow(std.sin(rad(90 * i / n)), 2 / p), r * std.pow(std.cos(rad(90 * i / n)), 2 / p)]
    for i in std.range(1, n)
  ], [x, y0, z]);
// That crown's radius at height y above its base.
local crownR(r, ht, p, y) = r * std.pow(std.max(0, 1 - std.pow(std.min(1, y / ht), p)), 1 / p);

// A turned ring on y from radius r0 to r1 and height y0 to y1.
local ring(id, slot, r0, r1, y0, y1, x=0, z=0) =
  h.turned(id, slot, 'y', [[0, r0], [0, r1], [y1 - y0, r1], [y1 - y0, r0], [0, r0]], [x, y0, z]);

// A flat band lying on y from y0 to y1 between a circle of radius rIn and an ellipse of half-widths rx (across x)
// and rz (along z), over bearings a0 to a1 (0 faces +z), as convex quads: visors, brims, ear flaps. rIn may be an
// [x, z] pair of half-widths for an elliptical inner edge.
local sector(prefix, slot, rIn, rx, rz, a0, a1, steps, y0, y1) =
  local ang(i) = rad(a0 + (a1 - a0) * i / steps);
  local ri = if std.type(rIn) == 'array' then rIn else [rIn, rIn];
  local inner(i) = [ri[0] * std.sin(ang(i)), ri[1] * std.cos(ang(i))];
  local outer(i) = [rx * std.sin(ang(i)), rz * std.cos(ang(i))];
  [
    h.prism('%s-%d' % [prefix, i], slot, 'y', [[q[1], q[0]] for q in [outer(i), outer(i + 1), inner(i + 1), inner(i)]], y0, y1)
    for i in std.range(0, steps - 1)
  ];

// Thin upright ribs standing proud of a round wall, `n` of them `w` degrees wide: knit ribbing, panel seams.
local ribs(prefix, slot, r0, r1, n, w, y0, y1, offset=0) = std.flattenArrays([
  sector('%s-%d' % [prefix, i], slot, r0, r1, r1, offset + 360 * i / n, offset + 360 * i / n + w, 1, y0, y1)
  for i in std.range(0, n - 1)
]);

// Radial seams lying on a flat top at height y, from radius r0 to r1, `n` of them.
local seams(prefix, slot, r0, r1, n, y, w=0.003) = [
  local a = rad(360 * i / n + 22.5);
  local s = std.sin(a), c = std.cos(a);
  h.prism('%s-%d' % [prefix, i], slot, 'y', [
    [r0 * c - w * s, r0 * s + w * c], [r1 * c - w * s, r1 * s + w * c],
    [r1 * c + w * s, r1 * s - w * c], [r0 * c + w * s, r0 * s - w * c],
  ], y, y + 0.003)
  for i in std.range(0, n - 1)
];

// A cone tip lying along +x from x0, base radius r, length l, at height y: a drooping tip, a pompom stalk.
local coneX(id, slot, r, l, x0, y, z=0) = h.turned(id, slot, 'x', [[0, 0], [0, r], [l, 0]], [x0, y, z]);
// A ball of radius r centred at [x, y, z].
local ball(id, slot, r, x, y, z, n=8) = h.turned(id, slot, 'y', [[0, 0]] + [
  [r - r * std.cos(rad(180 * i / n)), r * std.sin(rad(180 * i / n))]
  for i in std.range(0, n)
], [x, y - r, z]);

// A folded square of thin cloth with a rolled hem along its front edge, for scarves and veils.
local foldedScarf(w, d, ht, folds) =
  h.foldedGarment(w, d, ht, folds)
  + [box('hem', 'hem', [-w / 2, ht, d / 2 - 0.012], [w / 2, ht + 0.003, d / 2])];

[

  // A cream cotton cap standing on its rim, 180 mm across and 90 mm tall: a straight brimless band rounded over a
  // flat top, embroidered in a yellow band of diamonds round the side.
  h.compound('kufi_cap', 0.088, [
    h.turned('cap', 'cloth', 'y', [[0, 0], [0, 0.088], [0.07, 0.088], [0.082, 0.082], [0.088, 0.07], [0.09, 0]]),
    ring('emb-top', 'emb', 0.086, 0.09, 0.05, 0.054),
    ring('emb-bottom', 'emb', 0.086, 0.09, 0.012, 0.016),
  ] + ribs('emb', 'emb', 0.086, 0.09, 24, 5, 0.022, 0.044, 0)
    + h.crescent('top-ring', 'emb', 0.045, 0.05, 0, 360, 16, 0.09, 0.093),
    { cloth: 'cloth-cream', emb: 'cloth-yellow' })
  + { voxelGrain: 0.004 },

  // A black cotton pointed hat resting on its brim, 400 mm across and 360 mm tall: a broad flat brim and a tall cone
  // whose tip leans over, a purple band with a brass buckle round its base.
  h.compound('pointed_hat', 0.04, [
    h.turned('brim', 'cloth', 'y', [[0, 0], [0, 0.2], [0.006, 0.2], [0.012, 0.19], [0.012, 0]]),
    h.turned('cone-1', 'cloth', 'y', [[0, 0], [0, 0.092], [0.12, 0.066], [0.12, 0]], [0, 0.012, 0]),
    h.turned('cone-2', 'cloth', 'y', [[0, 0], [0, 0.066], [0.1, 0.042], [0.1, 0]], [0.012, 0.132, 0]),
    h.turned('cone-3', 'cloth', 'y', [[0, 0], [0, 0.042], [0.07, 0.024], [0.07, 0]], [0.035, 0.232, 0]),
    coneX('tip', 'cloth', 0.024, 0.09, 0.05, 0.31),
    ring('band', 'band', 0.0, 0.094, 0.012, 0.04),
    box('buckle', 'buckle', [-0.018, 0.016, 0.088], [0.018, 0.038, 0.097]),
    box('buckle-hole', 'band', [-0.011, 0.022, 0.094], [0.011, 0.032, 0.098]),
  ], { cloth: 'cloth-charcoal', band: 'cloth-purple', buckle: 'brass-dull' }),
]
