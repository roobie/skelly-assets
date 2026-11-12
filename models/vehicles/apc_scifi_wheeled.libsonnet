local k = import 'kit.libsonnet';
local s = import 'apc_scifi_wheeled.spec.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local box = k.box;
local b = s.body;
local finish = { paint: s.paint, frame: s.frame, trim: s.trim, dark: 'plastic-black', glass: 'lens-smoke' };
local part(name, kg, pieces, anchors={}) = k.compound('apc_scifi_wheeled_' + name, kg, pieces, finish, anchors) + { voxelGrain: s.grain };

// A convex outline cut to the side of a line where `keep` is not negative; `keep` is linear in (z, x).
local clip(poly, keep) =
  local n = std.length(poly);
  local cut = std.flattenArrays([
    local p = poly[i]; local q = poly[(i + 1) % n];
    local dp = keep(p); local dq = keep(q);
    (if dp >= 0 then [p] else [])
    + (if (dp < 0 && dq > 0) || (dp > 0 && dq < 0) then [[p[j] + (q[j] - p[j]) * dp / (dp - dq) for j in [0, 1]]] else [])
    for i in std.range(0, n - 1)
  ]);
  local m = std.length(cut);
  local cross(a, o, c) = (o[0] - a[0]) * (c[1] - o[1]) - (o[1] - a[1]) * (c[0] - o[0]);
  // A prism needs a strictly convex profile, so a cut that leaves a point on a straight edge drops it.
  [cut[i] for i in std.range(0, m - 1) if m >= 3 && cross(cut[(i + m - 1) % m], cut[i], cut[(i + 1) % m]) > 1e-9];
local clipAll(poly, keeps) = std.foldl(clip, keeps, poly);
local area(poly) = local n = std.length(poly);
  if n < 3 then 0 else std.sum([poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in std.range(0, n - 1)]) / 2;
local slab(id, slot, poly, y) = if area(poly) > 1e-4 then [k.yPrism(id, slot, poly, y)] else [];

local band(i) = b.belly + (b.top - b.belly) * i / b.bands;
local bands = [
  local y = [band(i), band(i + 1)];
  { i: i, y: y, plan: clipAll(s.planAt((y[0] + y[1]) / 2), [function(p) p[1] - b.rearFace]), arch: s.archAt(y[0], y[1]) }
  for i in std.range(0, b.bands - 1)
];
local front = s.axles[0];
local rear = s.axles[1];
// Below the arches' crowns the hull is a core between the wheels and a flank either side, cut round each arch.
local flankCuts(a) = {
  ahead: [function(p) p[1] - front - a],
  between: [function(p) p[1] - rear - a, function(p) front - a - p[1]],
  behind: [function(p) rear - a - p[1]],
};
local hull = std.flattenArrays([
  if l.arch == null then slab('band_%d' % l.i, 'paint', l.plan, l.y)
  else slab('core_%d' % l.i, 'paint', clipAll(l.plan, [function(p) b.core - p[0], function(p) p[0] + b.core]), l.y)
  for l in bands
]);
local flank = std.flattenArrays([
  local outside = clip(l.plan, function(p) p[0] - b.core);
  local cuts = flankCuts(l.arch);
  std.flattenArrays([slab('%s_%d' % [name, l.i], 'paint', clipAll(outside, cuts[name]), l.y) for name in std.objectFields(cuts)])
  for l in bands if l.arch != null
]);

local w = s.wheel;
local rail = s.rails;
local railY = b.top + rail.height;
local ws = s.weaponStation;
local c = s.canopy;
local canopyY(j) = b.top + c.height * j / c.bands;
local canopyPlan(j) =
  local f = std.pow(1 - std.pow((j + 0.5) / c.bands, 2.5), 1 / 2.5);
  s.outline(c.x, c.half * f, c.front * f, c.back * f, 2.2, 1.6, 8);
local visorFrom = c.x + c.front * 0.15;
local inVisor(j) = j >= c.visor[0] && j <= c.visor[1];
local p = s.pannier;
local r = s.ramp;
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'], setting: ['sci-fi'] } }, [
  part('hull', 7800, hull + [
    box('tow_eye', 'frame', [s.noseAt(0.75) - 0.08, 0.70, -0.10], [s.noseAt(0.75) + 0.06, 0.80, 0.10]),
  ]),
  // Authored on the near side and fitted mirrored on the far.
  part('flank', 900, flank),
  part('axle', 420, [
    box('beam', 'frame', [-0.09, -0.09, -b.core], [0.09, 0.09, b.core]),
    box('differential', 'frame', [-0.24, -0.16, -0.24], [0.24, 0.16, 0.24]),
  ] + k.bothSides([
    // The stub reaches out of the arch wall to the brake disc's hat, inside the ring and clear of the caliper.
    k.turned('stub', 'frame', 'z', k.disc(0.11, b.core, w.z)) + { sides: 24 },
  ])),
  part('canopy', 140, std.flattenArrays([
    local plan = canopyPlan(j);
    slab('band_%d' % j, 'paint', if inVisor(j) then clip(plan, function(q) visorFrom - q[1]) else plan, [canopyY(j), canopyY(j + 1)])
    for j in std.range(0, c.bands - 1)
  ])),
  // One curved visor across the canopy's front, rather than flat panes.
  part('visor', 20, std.flattenArrays([
    slab('band_%d' % j, 'glass', clip(canopyPlan(j), function(q) q[1] - visorFrom), [canopyY(j), canopyY(j + 1)])
    for j in std.range(c.visor[0], c.visor[1])
  ])),
  part('weapon_station', 380, [
    k.turned('ring', 'frame', 'y', k.disc(ws.ring, b.top, b.top + 0.07), [ws.x, 0, 0]) + { sides: 32 },
    k.turned('dome', 'paint', 'y', [[b.top + 0.07, 0], [b.top + 0.07, ws.dome], [b.top + 0.21, ws.dome - 0.02], [b.top + 0.33, ws.dome - 0.09],
      [b.top + 0.42, ws.dome - 0.22], [b.top + 0.47, ws.dome - 0.38], [b.top + 0.49, 0], [b.top + 0.07, 0]], [ws.x, 0, 0]) + { sides: 24 },
    box('sight', 'trim', [ws.x - 0.20, b.top + 0.18, -ws.dome - 0.10], [ws.x + 0.16, b.top + 0.36, -ws.dome + 0.12]),
    box('sight_lens', 'glass', [ws.x + 0.16, b.top + 0.21, -ws.dome - 0.07], [ws.x + 0.18, b.top + 0.33, -ws.dome + 0.03]),
  ]),
  part('cannon', 160, [
    box('mantlet', 'frame', [ws.x + 0.30, ws.gunY - 0.11, -0.17], [ws.x + 0.62, ws.gunY + 0.11, 0.17]),
    k.turned('barrel', 'frame', 'x', k.disc(0.05, ws.x + 0.62, ws.muzzle - 0.14), [0, ws.gunY, 0]) + { sides: 16 },
    k.turned('muzzle', 'dark', 'x', k.disc(0.075, ws.muzzle - 0.14, ws.muzzle), [0, ws.gunY, 0]) + { sides: 16 },
  ]),
  // Grab rails along the roof's edges, the bar held off the armour by posts.
  part('roof_rail', 30, [
    box('bar', 'trim', [rail.from, railY, rail.z - rail.bar / 2], [rail.to, railY + rail.bar, rail.z + rail.bar / 2]),
  ] + [
    box('post_%d' % i, 'trim', [rail.posts[i] - 0.03, b.top, rail.z - 0.03], [rail.posts[i] + 0.03, railY, rail.z + 0.03])
    for i in std.range(0, std.length(rail.posts) - 1)
  ]),
  // A stowage pannier between the arches, authored on the near side.
  part('pannier', 60, [
    k.xPrism('box', 'paint', [[p.y[0], p.z[0]], [p.y[1], p.z[0]], [p.y[1], p.z[1]], [p.y[0] + 0.08, p.z[1]]], p.x),
    box('lid_seam', 'dark', [p.x[0] + 0.04, p.y[1] - 0.10, p.z[1]], [p.x[1] - 0.04, p.y[1] - 0.08, p.z[1] + 0.012]),
  ] + [
    box('latch_%d' % i, 'trim', [x - 0.05, p.y[1] - 0.18, p.z[1]], [x + 0.05, p.y[1] - 0.11, p.z[1] + 0.025])
    for i in [0, 1] for x in [p.x[0] + (p.x[1] - p.x[0]) * (0.25 + 0.5 * i)]
  ]),
  part('ramp', 300, [
    box('plate', 'paint', [b.rearFace - 0.06, r.low, -r.half], [b.rearFace, r.high, r.half]),
    box('hinge_bar', 'frame', [b.rearFace - 0.10, r.low, -r.half + 0.05], [b.rearFace - 0.04, r.low + 0.06, r.half - 0.05]),
  ] + k.bothSides([
    box('rib', 'paint', [b.rearFace - 0.10, r.low + 0.10, r.half - 0.20], [b.rearFace - 0.06, r.high - 0.10, r.half - 0.14]),
  ]) + [
    box('handle', 'trim', [b.rearFace - 0.11, (r.low + r.high) / 2 - 0.03, -0.14], [b.rearFace - 0.06, (r.low + r.high) / 2 + 0.03, 0.14]),
  ], { hinge_a: ['hinge_bar', [0.5, 0.5, 0]], hinge_b: ['hinge_bar', [0.5, 0.5, 1]] }),
])
