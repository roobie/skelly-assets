local k = import 'kit.libsonnet';
local s = import 'apc_scifi_wheeled.spec.libsonnet';
local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local box = k.box;
local b = s.body;
local finish = { paint: s.paint, frame: s.frame, trim: s.trim, dark: 'plastic-black', glass: 'lens-smoke' };
local part(name, kg, pieces, anchors={}) = k.compound('apc_scifi_wheeled_' + name, kg, pieces, finish, anchors) + { voxelGrain: s.grain };

// Plates authored by their near-side corners, as cuts that keep `inside`, each mirrored onto the far side when it
// leans across.
local bothCuts(plates, inside) = std.flattenArrays([
  local near = k.plate(p[0], p[1], p[2], inside);
  [near] + (if near.normal[2] != 0 then [near { normal: [near.normal[0], near.normal[1], -near.normal[2]] }] else [])
  for p in std.objectValues(plates)
]);
local hullCuts = bothCuts(s.plates, b.inside);

// The hull's outline in side view, a band over its full height from x0 to x1 whose floor runs from y0 to y1.
local band(id, x0, y0, x1, y1, z) = k.clipped(k.prism(id, 'paint', [[x0, y0], [x1, y1], [x1, b.top], [x0, b.top]], z), hullCuts);
// Each arch is the top half of an octagon round its tyre, so its edges stay flat plates like the hull's. The flanks'
// floor runs along the belly and over each arch; between its corners it is straight, so each stretch is a convex band.
local w = s.wheel;
local reach = w.radius + s.archGap;
local corner = reach * (std.sqrt(2) - 1);
local floor = [[b.rear, b.belly]] + std.flattenArrays([
  [[x - reach, b.belly], [x - reach, w.radius + corner], [x - corner, w.radius + reach], [x + corner, w.radius + reach],
   [x + reach, w.radius + corner], [x + reach, b.belly]]
  for x in std.sort(s.axles)
]) + [[b.nose, b.belly]];
local flank = [
  band('band_%d' % i, floor[i][0], floor[i][1], floor[i + 1][0], floor[i + 1][1], [b.core, b.half])
  for i in std.range(0, std.length(floor) - 2)
  if floor[i + 1][0] > floor[i][0]
    // A stretch the plates cut away whole, as ahead of the front arch where the cheeks meet the core, is left out.
    && !k.cutAway([[x, y, z] for x in [floor[i][0], floor[i + 1][0]] for y in [b.belly, b.top] for z in [b.core, b.half]], hullCuts)
];

local h = s.hood;
local hoodCuts = bothCuts(h.plates, [(h.x[0] + h.x[1]) / 2, (h.y[0] + h.y[1]) / 2, 0]);
local visorX(y) = k.plateX(h.plates.front, y, 0);
local t = s.turret;
local ringTop = b.top + t.ring.height;
local rail = s.rails;
local railY = b.top + rail.height;
local p = s.pannier;
local r = s.ramp;
taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'], setting: ['sci-fi'] } }, [
  // The core between the wheels runs the hull's whole length and alone makes the nose ahead of the front arches.
  part('hull', 7800, [
    band('core', b.rear, b.belly, b.nose, b.belly, [-b.core, b.core]),
    box('tow_eye', 'frame', [b.nose - 0.05, 1.0, -0.12], [b.nose + 0.08, 1.08, 0.12]),
  ]),
  // Authored on the near side and fitted mirrored on the far.
  part('flank', 900, flank),
  part('axle', 420, [
    box('beam', 'frame', [-0.09, -0.09, -b.core], [0.09, 0.09, b.core]),
    box('differential', 'frame', [-0.24, -0.16, -0.24], [0.24, 0.16, 0.24]),
  ] + k.bothSides([
    // The stub reaches out of the arch wall to the face the brake disc's hat bolts to, inside the ring and clear of the
    // caliper.
    k.turned('stub', 'frame', 'z', k.disc(0.11, b.core, w.z + w.face)) + { sides: 24 },
  ])),
  part('hood', 140, [
    k.clipped(k.prism('shell', 'paint', [[h.x[0], h.y[0]], [h.x[1], h.y[0]], [h.x[1], h.y[1]], [h.x[0], h.y[1]]], [-h.half, h.half]), hoodCuts),
  ]),
  // One narrow slit across the hood's front, rather than a windscreen.
  part('visor', 5, [
    local y = h.visor.y;
    k.prism('slit', 'glass', [[visorX(y[0]), y[0]], [visorX(y[0]) + h.visor.depth, y[0]], [visorX(y[1]) + h.visor.depth, y[1]], [visorX(y[1]), y[1]]],
      [-h.visor.half, h.visor.half]),
  ]),
  part('weapon_station', 380, [
    k.turned('ring', 'frame', 'y', k.disc(t.ring.radius, b.top, ringTop), [t.x, 0, 0]) + { sides: 32 },
    k.clipped(k.yPrism('turret', 'paint', [[q[0], t.x + q[1]] for q in t.plan], [ringTop, t.top]), bothCuts(t.plates, t.inside)),
  ]),
  part('cannon', 160, [
    box('mantlet', 'frame', [t.x + 0.8, t.gunY - 0.1, -0.15], [t.x + 1.1, t.gunY + 0.1, 0.15]),
    k.turned('barrel', 'frame', 'x', k.disc(0.05, t.x + 1.1, t.muzzle - 0.14), [0, t.gunY, 0]) + { sides: 16 },
    k.turned('muzzle', 'dark', 'x', k.disc(0.075, t.muzzle - 0.14, t.muzzle), [0, t.gunY, 0]) + { sides: 16 },
  ]),
  // A box of launch tubes on an arm off the turret's near cheek; the tubes' mouths face ahead.
  local pod = t.pod;
  part('launcher', 90, [
    box('arm', 'frame', [pod.x[0] + 0.25, pod.y[0], 0.5], [pod.x[1] - 0.25, pod.y[0] + 0.08, pod.z[0]]),
    box('pod', 'paint', [pod.x[0], pod.y[0], pod.z[0]], [pod.x[1], pod.y[1], pod.z[1]]),
  ] + [
    box('mouth_%d' % i, 'dark', [pod.x[1], pod.y[0] + 0.05, pod.z[0] + 0.03 + i * 0.11], [pod.x[1] + 0.01, pod.y[1] - 0.05, pod.z[0] + 0.10 + i * 0.11])
    for i in [0, 1]
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
    box('plate', 'paint', [b.rear - 0.06, r.low, -r.half], [b.rear, r.high, r.half]),
    box('hinge_bar', 'frame', [b.rear - 0.10, r.low, -r.half + 0.05], [b.rear - 0.04, r.low + 0.06, r.half - 0.05]),
  ] + k.bothSides([
    box('rib', 'paint', [b.rear - 0.10, r.low + 0.10, r.half - 0.20], [b.rear - 0.06, r.high - 0.10, r.half - 0.14]),
  ]) + [
    box('handle', 'trim', [b.rear - 0.11, (r.low + r.high) / 2 - 0.03, -0.14], [b.rear - 0.06, (r.low + r.high) / 2 + 0.03, 0.14]),
  ], { hinge_a: ['hinge_bar', [0.5, 0.5, 0]], hinge_b: ['hinge_bar', [0.5, 0.5, 1]] }),
])
