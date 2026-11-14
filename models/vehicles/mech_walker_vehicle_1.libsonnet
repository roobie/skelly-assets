local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local m = import 'machine-kit.libsonnet';
local s = import 'mech_walker_vehicle_1.spec.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local L = s.legZ;
local centre = [0.5, 0.5, 0.5];

// Plane geometry in the side view.
local plus(a, b) = [a[0] + b[0], a[1] + b[1]];
local scaled(a, f) = [a[0] * f, a[1] * f];
local length(a, b) = std.sqrt(std.pow(b[0] - a[0], 2) + std.pow(b[1] - a[1], 2));
// The left normal of the direction from a to b, so a positive offset lies counter-clockwise of it.
local normal(a, b) = scaled([a[1] - b[1], b[0] - a[0]], 1 / length(a, b));
// The point `t` of the way from a to b, `off` m to its left.
local along(a, b, t, off=0) = plus(plus(a, scaled([b[0] - a[0], b[1] - a[1]], t)), scaled(normal(a, b), off));
local reach(a, b, d) = along(a, b, d / length(a, b));
local area(poly) = std.foldl(function(sum, i) sum + poly[i][0] * poly[(i + 1) % std.length(poly)][1] - poly[(i + 1) % std.length(poly)][0] * poly[i][1], std.range(0, std.length(poly) - 1), 0) / 2;
// A prism's outline runs counter-clockwise, whichever way round the plane it was laid in.
local ccw(poly) = if area(poly) < 0 then std.reverse(poly) else poly;
// A convex outline cut to u >= lo, u being its first coordinate.
local keepAbove(poly, lo) =
  local n = std.length(poly);
  std.flattenArrays([
    local a = poly[i];
    local b = poly[(i + 1) % n];
    (if a[0] >= lo then [a] else [])
    + (if (a[0] >= lo) != (b[0] >= lo) then [[lo, a[1] + (b[1] - a[1]) * (lo - a[0]) / (b[0] - a[0])]] else [])
    for i in std.range(0, n - 1)
  ]);
// A clipped outline without the repeated corner a cut through a vertex leaves.
local distinct(poly) =
  local n = std.length(poly);
  [poly[i] for i in std.range(0, n - 1) if length(poly[i], poly[(i + n - 1) % n]) > 1e-6];
local flip(poly) = [[-p[0], p[1]] for p in poly];
local clipped(poly, lo, hi) = flip(keepAbove(flip(keepAbove(poly, lo)), -hi));
// The outline drawn `d` m inside a counter-clockwise convex outline, each corner on the mitre of its two edges.
local inset(poly, d) =
  local n = std.length(poly);
  [
    local before = normal(poly[(i + n - 1) % n], poly[i]);
    local after = normal(poly[i], poly[(i + 1) % n]);
    plus(poly[i], scaled(plus(before, after), d / (1 + before[0] * after[0] + before[1] * after[1])))
    for i in std.range(0, n - 1)
  ];

// Hazard stripes slanting at 45 degrees across a band `long` by `high`, alternately yellow and dark. `piece(id, slot,
// outline)` draws each stripe from its outline in the band's own (u, v), so one band can lie on any face.
local stripe = 0.12;
local hazard(id, long, high, piece) =
  local slant(u) = [[u, 0], [u + stripe, 0], [u + stripe + high, high], [u + high, high]];
  local outlines = [
    distinct(clipped(slant(i * stripe), 0, long))
    for i in std.range(-std.ceil(high / stripe), std.ceil(long / stripe))
  ];
  [
    piece('%s_%d' % [id, i], if i % 2 == 0 then 'stripe' else 'stripeDark', outlines[i])
    for i in std.range(0, std.length(outlines) - 1)
    if std.abs(area(outlines[i])) > 1e-4
  ];
local stripes = { stripe: s.stripe, stripeDark: s.stripeDark };
// A band on a face across x, at x0..x1, its u along z from z0 and its v up y from y0.
local xBand(id, x, y0, z0, long, high) =
  hazard(id, long, high, function(name, slot, uv) k.xPrism(name, slot, ccw([[y0 + p[1], z0 + p[0]] for p in uv]), x));
// A band on a face across z, its u along x from x0 and its v up y from y0.
local zBand(id, z, x0, y0, long, high) =
  hazard(id, long, high, function(name, slot, uv) prism(name, slot, ccw([[x0 + p[0], y0 + p[1]] for p in uv]), z));

// The torso: a shell of plates round its side profile, hollow for the power pack.
local hull = s.torso;
local inner = inset(hull.profile, hull.plate);
local edges = std.length(hull.profile);
local faceEdge = 2;
local face = hull.profile[faceEdge][0];
local faceInner = face - hull.plate;
local rear = hull.profile[6][0];

// Each leg joint is a tongue on one segment turning between the two cheeks of a clevis on the next. Each segment's
// full-width body starts `clear` beyond the joint disc of the clevis it meets, so the joint can turn.
local clear = 0.08;
local joints = {
  knee: { clevis: 0.32, tongue: 0.27, cheek: [0.16, 0.3] },
  ankle: { clevis: 0.27, tongue: 0.22, cheek: [0.13, 0.25] },
  foot: { clevis: 0.2, tongue: 0.18, cheek: [0.13, 0.26] },
};
local hub = 0.4;
local thighHalf = 0.3;
local shinHalf = 0.25;
local tarsusHalf = 0.2;
// How far a joint's pin stands out of its outer cheek.
local pin = 0.04;
local tongueEnd(id, slot, at, toward, joint, thick) = [
  m.axleDisc(id + '_boss', slot, at[0], at[1], joint.tongue, [L - joint.cheek[0], L + joint.cheek[0]]),
  k.bar(id + '_tongue', slot, at, reach(at, toward, joint.clevis + clear), thick, [L - joint.cheek[0], L + joint.cheek[0]]),
];
local clevisEnd(id, slot, at, toward, joint, thick) = std.flattenArrays([
  [
    m.axleDisc(id + '_cheek_' + side.name, slot, at[0], at[1], joint.clevis, side.z),
    k.bar(id + '_cheek_bar_' + side.name, slot, at, reach(at, toward, joint.clevis + clear), thick, side.z),
  ]
  for side in [
    { name: 'outer', z: [L + joint.cheek[0], L + joint.cheek[1]] },
    { name: 'inner', z: [L - joint.cheek[1], L - joint.cheek[0]] },
  ]
]);
local body(a, b, from, to, thick, half, thickB=null) =
  k.bar('body', 'paint', reach(a, b, from), reach(b, a, to), thick, [L - half, L + half], thickB);

// Each ram pins to a lug on one segment and a lug on the next, its barrel and rod parts of their own so an animation
// slides the rod out of the barrel's mouth. A ram as deep as it is wide reads as one round piston from any side, and a
// ram that spans a joint stands just clear of that joint's pin, so its lugs stay short enough to read as part of the leg.
local rams = {
  hip: { base: [1.25, 3.2], end: along(s.hip, s.knee, 0.55, 0.1), z0: 1.04, bore: 0.16, massKg: [35, 8] },
  knee: { base: along(s.hip, s.knee, 0.35, -0.15), end: along(s.knee, s.ankle, 0.45, -0.15), z0: L + joints.knee.cheek[1] + pin + 0.02, bore: 0.2, massKg: [45, 10] },
  ankle: { base: along(s.knee, s.ankle, 0.55, 0.15), end: along(s.ankle, s.foot, 0.5, 0.13), z0: L + joints.ankle.cheek[1] + pin + 0.02, bore: 0.18, massKg: [32, 8] },
};
local ramZ(r) = [r.z0, r.z0 + r.bore];
local eye(ram) = ram.bore * 0.45;
local lug(id, at, ram, z) = m.axleDisc(id, 'frame', at[0], at[1], eye(ram) + 0.05, z, 12);
local ram(name, label, r) =
  local mouth = along(r.base, r.end, 0.55);
  local gland = reach(mouth, r.base, 0.06);
  local rod = r.bore * 0.6;
  local rodZ = [r.z0 + (r.bore - rod) / 2, r.z0 + (r.bore + rod) / 2];
  local finish = { dark: s.frame, bright: 'steel-stainless' };
  [
    k.compound('security_walker_%s_ram_barrel' % name, r.massKg[0], [
      m.axleDisc('base_eye', 'dark', r.base[0], r.base[1], eye(r), ramZ(r), 12),
      k.bar('barrel', 'dark', r.base, gland, r.bore, ramZ(r)),
      // The gland collar at the mouth, where the rod leaves the barrel.
      k.bar('gland', 'dark', gland, mouth, r.bore * 1.3, ramZ(r)),
    ], finish, { base: ['base_eye', centre] }) + { title: 'Security walker %s ram barrel' % label },
    k.compound('security_walker_%s_ram_rod' % name, r.massKg[1], [
      k.bar('rod', 'bright', mouth, r.end, rod, rodZ),
      m.axleDisc('end_eye', 'bright', r.end[0], r.end[1], eye(r) * 0.9, ramZ(r), 12),
    ], finish, { end: ['end_eye', centre] }) + { title: 'Security walker %s ram rod' % label },
  ];

// A hose sags from a fitting at `a`, pulled toward `c`, to a fitting at `b`: a quadratic curve in the side view, which
// reads as slack hose where an arc about the joint would read as a ring. Each fitting reaches across z from the hose to
// the face it plugs into, `fitA` and `fitB`.
local hoseBore = 0.06;
local curve(a, c, b, t) = plus(plus(scaled(a, (1 - t) * (1 - t)), scaled(c, 2 * t * (1 - t))), scaled(b, t * t));
local hoseRun(id, run) =
  local steps = 10;
  local points = [curve(run.a, run.c, run.b, i / steps) for i in std.range(0, steps)];
  local z = [run.z, run.z + hoseBore];
  local fitting(name, at, span) =
    box('%s_%s' % [id, name], 'fitting', [at[0] - 0.05, at[1] - 0.05, std.min(span, z[0])], [at[0] + 0.05, at[1] + 0.05, std.max(span, z[1])]);
  [k.bar('%s_%d' % [id, i], 'hose', points[i], points[i + 1], hoseBore, z) for i in std.range(0, steps - 1)]
  // A round bend between each two straight runs, so the curve has no notches.
  + [m.axleDisc('%s_bend_%d' % [id, i], 'hose', points[i][0], points[i][1], hoseBore / 2, z, 8) for i in std.range(1, steps - 1)]
  + [fitting('fitting_a', run.a, run.fitA), fitting('fitting_b', run.b, run.fitB)];
local hoses(name, massKg, runs) =
  local title = 'Security walker %s hoses' % name;
  k.compound('security_walker_%s_hoses' % name, massKg, std.flattenArrays([
    hoseRun('hose_%d' % i, runs[i])
    for i in std.range(0, std.length(runs) - 1)
  ]), { hose: 'rubber-black', fitting: 'steel-grey' }) + { title: title };
local polar(at, degrees, r) = plus(at, [r * std.cos(k.rad(degrees)), r * std.sin(k.rad(degrees))]);

// The foot: three clawed toes forward and a spur behind, splayed in plan round its pivot.
local toes = [
  { name: 'middle', angle: 0, long: 1.0 },
  { name: 'outer', angle: 28, long: 0.85 },
  { name: 'inner', angle: -28, long: 0.85 },
  { name: 'spur', angle: 180, long: 0.55 },
];
local plan(angle, r, side) = [
  s.foot[0] + r * std.cos(k.rad(angle)) - side * std.sin(k.rad(angle)),
  L + r * std.sin(k.rad(angle)) + side * std.cos(k.rad(angle)),
];
local toeTop = 0.15;
local toe(t) =
  local tip = plan(t.angle, t.long, 0);
  local hook = if std.cos(k.rad(t.angle)) > 0 then 1 else -1;
  [
    k.yPrism('toe_' + t.name, 'paint', ccw([[p[1], p[0]] for p in [plan(t.angle, 0.2, -0.13), plan(t.angle, t.long, -0.07), plan(t.angle, t.long, 0.07), plan(t.angle, 0.2, 0.13)]]), [0, toeTop]),
    k.bar('claw_' + t.name, 'claw', [tip[0] - hook * 0.08, toeTop], [tip[0] + hook * 0.14, 0], 0.12, [tip[1] - 0.05, tip[1] + 0.05], 0.05),
  ];

// The weapon pod tilts on a trunnion over the hip, a gun slung in a cradle under its belly.
local pod = { rear: -0.55, front: 0.95, low: 3.85, high: 4.4, z: [1.18, 1.68] };
local podMid = (pod.z[0] + pod.z[1]) / 2;
local trunnion = { z: [1.1, 1.14], boss: [1.14, 1.18], radius: 0.12 };
// The belly frame runs under the flat of the belly, short of the glacis and the rear bevel.
local belly = { y: hull.profile[0][1], rear: hull.profile[0][0] + 0.15, front: hull.profile[1][0] - 0.1, ribs: [-0.85, -0.25, 0.4] };
local tubes = [[y, z] for y in [4.0, 4.25] for z in [podMid - 0.15, podMid, podMid + 0.15]];

taxonomy.inherit({ tags: { 'vehicle-body': ['armoured'], setting: ['modern', 'sci-fi'] } }, [
  k.compound('security_walker_hull', 3400, [
    prism('plate_%d' % i, 'paint', [hull.profile[i], hull.profile[(i + 1) % edges], inner[(i + 1) % edges], inner[i]], [hull.plate - hull.half, hull.half - hull.plate])
    for i in std.range(0, edges - 1)
    if i != faceEdge
  ] + [
    // The face is open across the sensor window.
    box('face_low', 'paint', [faceInner, hull.profile[faceEdge][1], -hull.half], [face, s.window.low, hull.half]),
    box('face_high', 'paint', [faceInner, s.window.high, -hull.half], [face, hull.profile[faceEdge + 1][1], hull.half]),
    box('rear_bumper', 'frame', [rear - 0.06, 3.08, -0.94], [rear, 3.32, 0.94]),
  ] + xBand('rear_stripe', [rear - 0.09, rear - 0.06], 3.1, -0.9, 1.8, 0.2)
  + bothSides([
    prism('side', 'paint', hull.profile, [hull.half - hull.plate, hull.half]),
    box('face_side', 'paint', [faceInner, s.window.low, s.window.half], [face, s.window.high, hull.half]),
    lug('hip_ram_lug', rams.hip.base, rams.hip, [hull.half, rams.hip.z0]),
  ]), { paint: s.paint, frame: s.frame } + stripes) + { title: 'Security walker hull' },
  // The belly is framed rather than bare: a keel skid and two stringers carry it if it settles on rough ground, ribs
  // tie them across, and service panels between them reach the power pack from below.
  k.compound('security_walker_belly', 240, [
    box('keel', 'frame', [belly.rear, belly.y - 0.12, -0.12], [belly.front, belly.y, 0.12]),
  ] + [
    box('rib_%d' % i, 'frame', [belly.ribs[i] - 0.05, belly.y - 0.06, -0.85], [belly.ribs[i] + 0.05, belly.y, 0.85])
    for i in std.range(0, std.length(belly.ribs) - 1)
  ] + bothSides([
    box('stringer', 'frame', [belly.rear, belly.y - 0.09, 0.55], [belly.front, belly.y, 0.65]),
    box('panel', 'paint', [belly.ribs[1] + 0.12, belly.y - 0.03, 0.2], [belly.ribs[2] - 0.12, belly.y, 0.47]),
    k.turned('drain', 'frame', 'y', k.disc(0.05, -0.04, 0), [belly.ribs[0] - 0.3, belly.y, 0.35]) + { sides: 12 },
  ]), { paint: s.paint, frame: s.frame }) + { title: 'Security walker belly' },
  // Bolted to the flanks behind the hips, so a scavenger lifts one off on its own.
  k.compound('security_walker_flank_armour', 120, [
    box('plate', 'paint', [-1.45, 3.05, hull.half], [-0.6, 4.05, hull.half + 0.05]),
  ] + zBand('stripe', [hull.half + 0.05, hull.half + 0.08], -1.45, 3.08, 0.85, 0.18), { paint: s.paint } + stripes) + { title: 'Security walker flank armour' },
  k.compound('security_walker_face_guard', 110, [
    box('bar', 'frame', [face, 3.22, -0.94], [face + 0.05, 3.46, 0.94]),
  ] + xBand('stripe', [face + 0.05, face + 0.08], 3.24, -0.92, 1.84, 0.2), { frame: s.frame } + stripes) + { title: 'Security walker face guard' },
  k.compound('security_walker_sensor_window', 35, [
    box('glass', 'glass', [face - 0.05, s.window.low, -s.window.half], [face - 0.01, s.window.high, s.window.half]),
  ], { glass: 'lens-smoke' }) + { title: 'Security walker sensor window' },
  // The walker sees through a row of sensor heads behind its window, in place of a cab or a face.
  k.compound('security_walker_sensor_array', 60, [
    box('housing', 'dark', [1.2, 3.48, -0.7], [face - 0.07, 3.8, 0.7]),
  ] + [
    k.turned('lens_%d' % i, if i == 2 then 'eye' else 'lens', 'x', k.disc(if i == 2 then 0.1 else 0.07, 0, 0.02), [face - 0.07, 3.64, (i - 2) * 0.26]) + { sides: 16 }
    for i in std.range(0, 4)
  ], { dark: 'plastic-black', lens: 'cell-glow-teal', eye: 'glass-lens-amber' }) + { title: 'Security walker sensor array' },
  k.compound('security_walker_hydraulic_pack', 180, [
    box('tank', 'paint', [0.1, inner[0][1], -0.85], [0.85, 3.3, -0.3]),
    k.turned('pump', 'steel', 'z', k.disc(0.12, 0, 0.3), [0.45, 3.42, -0.75]) + { sides: 16 },
    k.turned('filter', 'steel', 'y', k.disc(0.07, 0, 0.2), [0.25, 3.3, -0.4]) + { sides: 12 },
  ], { paint: s.frame, steel: 'steel-stainless' }) + { title: 'Security walker hydraulic pack' },
  // The hip drive turns the thigh; it is the leg's root, bolted to the torso's flank.
  k.compound('security_walker_hip_drive', 300, [
    m.axleDisc('drive', 'frame', s.hip[0], s.hip[1], 0.48, [hull.half, L - thighHalf]),
  ], { frame: s.frame }, { pivot: ['drive', centre] }) + { title: 'Security walker hip drive' },
  k.compound('security_walker_thigh', 1000, [
    m.axleDisc('hub', 'paint', s.hip[0], s.hip[1], hub, [L - thighHalf, L + thighHalf]),
    m.axleDisc('hip_cap', 'frame', s.hip[0], s.hip[1], 0.24, [L + thighHalf, L + thighHalf + 0.08]),
    body(s.hip, s.knee, 0, joints.knee.clevis + clear, 0.7, thighHalf, 0.56),
    m.axleDisc('knee_pin', 'frame', s.knee[0], s.knee[1], 0.11, [L + joints.knee.cheek[1], L + joints.knee.cheek[1] + pin], 12),
    lug('hip_ram_lug', rams.hip.end, rams.hip, [ramZ(rams.hip)[1], L - thighHalf]),
    lug('knee_ram_lug', rams.knee.base, rams.knee, [L + thighHalf, rams.knee.z0]),
  ] + clevisEnd('knee', 'paint', s.knee, s.hip, joints.knee, 0.56), { paint: s.paint, frame: s.frame }, {
    hip: ['hub', centre],
    knee: ['knee_cheek_outer', centre],
  }) + { title: 'Security walker thigh' },
  k.compound('security_walker_shin', 780, [
    body(s.knee, s.ankle, joints.knee.clevis + clear, joints.ankle.clevis + clear, 0.54, shinHalf, 0.44),
    m.axleDisc('ankle_pin', 'frame', s.ankle[0], s.ankle[1], 0.1, [L + joints.ankle.cheek[1], L + joints.ankle.cheek[1] + pin], 12),
    lug('knee_ram_lug', rams.knee.end, rams.knee, [L + shinHalf, rams.knee.z0]),
    lug('ankle_ram_lug', rams.ankle.base, rams.ankle, [L + shinHalf, rams.ankle.z0]),
  ] + tongueEnd('knee', 'paint', s.knee, s.ankle, joints.knee, 0.48)
  + clevisEnd('ankle', 'paint', s.ankle, s.knee, joints.ankle, 0.42), { paint: s.paint, frame: s.frame }, {
    knee: ['knee_boss', centre],
    ankle: ['ankle_cheek_outer', centre],
  }) + { title: 'Security walker shin' },
  k.compound('security_walker_tarsus', 380, [
    body(s.ankle, s.foot, joints.ankle.clevis + clear, joints.foot.clevis + clear, 0.42, tarsusHalf, 0.34),
    lug('ankle_ram_lug', rams.ankle.end, rams.ankle, [L + tarsusHalf, rams.ankle.z0]),
  ] + tongueEnd('ankle', 'paint', s.ankle, s.foot, joints.ankle, 0.36)
  + tongueEnd('foot', 'paint', s.foot, s.ankle, joints.foot, 0.3), { paint: s.paint, frame: s.frame }, {
    ankle: ['ankle_boss', centre],
    foot: ['foot_boss', centre],
  }) + { title: 'Security walker tarsus' },
  k.compound('security_walker_foot', 560, [
    k.yPrism('sole', 'paint', ccw([[p[1], p[0]] for p in [plan(22.5 + 45 * i, 0.32, 0) for i in std.range(0, 7)]]), [0, 0.22]),
  ] + std.flattenArrays([toe(t) for t in toes]) + std.flattenArrays([
    [
      prism('cheek_' + side.name, 'paint', [[s.foot[0] - 0.26, 0.22], [s.foot[0] + 0.26, 0.22], [s.foot[0] + 0.15, s.foot[1]], [s.foot[0] - 0.15, s.foot[1]]], side.z),
      m.axleDisc('cheek_disc_' + side.name, 'paint', s.foot[0], s.foot[1], joints.foot.clevis, side.z),
    ]
    for side in [
      { name: 'outer', z: [L + joints.foot.cheek[0], L + joints.foot.cheek[1]] },
      { name: 'inner', z: [L - joints.foot.cheek[1], L - joints.foot.cheek[0]] },
    ]
  ]), { paint: s.paint, claw: 'steel-gunmetal' }, { pivot: ['cheek_disc_outer', centre] }) + { title: 'Security walker foot' },
] + ram('hip', 'hip', rams.hip) + ram('knee', 'knee', rams.knee) + ram('ankle', 'ankle', rams.ankle) + [
  // The hip's hoses run in the gap between the flank and the thigh, from the flank behind the hip drive to the thigh.
  hoses('hip', 8, [
    { a: [-0.5, 3.72], c: [-0.9, 2.4], b: along(s.hip, s.knee, 0.6, -0.15), z: 1.09, fitA: hull.half, fitB: L - thighHalf },
    { a: [-0.42, 3.76], c: [-1.1, 2.25], b: along(s.hip, s.knee, 0.68, -0.08), z: 1.16, fitA: hull.half, fitB: L - thighHalf },
  ]),
  // The knee's and the ankle's sag round the outside of each bend on the leg's outer face, where the rams leave room.
  hoses('knee', 6, [
    { a: along(s.knee, s.hip, 0.42 / length(s.knee, s.hip), -0.2), c: polar(s.knee, -3.5, 0.95), b: along(s.knee, s.ankle, 0.42 / length(s.knee, s.ankle), 0.2), z: L + thighHalf, fitA: L + thighHalf, fitB: L + shinHalf },
    { a: along(s.knee, s.hip, 0.5 / length(s.knee, s.hip), -0.12), c: polar(s.knee, -3.5, 1.15), b: along(s.knee, s.ankle, 0.5 / length(s.knee, s.ankle), 0.12), z: L + thighHalf + hoseBore, fitA: L + thighHalf, fitB: L + shinHalf },
  ]),
  hoses('ankle', 5, [
    { a: along(s.ankle, s.knee, 0.4 / length(s.ankle, s.knee), 0.16), c: polar(s.ankle, 176, 0.8), b: along(s.ankle, s.foot, 0.36 / length(s.ankle, s.foot), -0.15), z: L + shinHalf, fitA: L + shinHalf, fitB: L + tarsusHalf },
    { a: along(s.ankle, s.knee, 0.48 / length(s.ankle, s.knee), 0.08), c: polar(s.ankle, 176, 0.98), b: along(s.ankle, s.foot, 0.52 / length(s.ankle, s.foot), -0.15), z: L + shinHalf + hoseBore, fitA: L + shinHalf, fitB: L + tarsusHalf },
  ]),
  k.compound('security_walker_pod_mount', 60, [
    box('bracket', 'frame', [-0.1, pod.low, hull.half], [0.5, 4.3, trunnion.z[0]]),
    m.axleDisc('trunnion', 'frame', s.trunnion[0], s.trunnion[1], trunnion.radius, trunnion.z),
  ], { frame: s.frame }) + { title: 'Security walker pod mount' },
  k.compound('security_walker_weapon_pod', 380, [
    box('housing', 'paint', [pod.rear, pod.low, pod.z[0]], [pod.front, pod.high, pod.z[1]]),
    m.axleDisc('boss', 'frame', s.trunnion[0], s.trunnion[1], trunnion.radius, trunnion.boss),
  ] + std.flattenArrays([
    [
      k.turned('tube_%d' % i, 'frame', 'x', k.annulus(0.045, 0.065, 0, 0.04), [pod.front, tubes[i][0], tubes[i][1]]) + { sides: 12 },
      k.turned('tube_bore_%d' % i, 'bore', 'x', k.disc(0.045, 0, 0.01), [pod.front, tubes[i][0], tubes[i][1]]) + { sides: 12 },
    ]
    for i in std.range(0, std.length(tubes) - 1)
  ]) + [
    box('cradle_%s' % side.name, 'frame', [0.45, 3.65, podMid + side.z[0]], [0.85, pod.low, podMid + side.z[1]])
    for side in [{ name: 'outer', z: [0.09, 0.13] }, { name: 'inner', z: [-0.13, -0.09] }]
  ] + zBand('stripe', [pod.z[1], pod.z[1] + 0.03], pod.rear + 0.05, pod.low + 0.03, 1.35, 0.18),
    { paint: s.paint, frame: s.frame, bore: 'plastic-black' } + stripes, { trunnion: ['boss', centre] }) + { title: 'Security walker weapon pod' },
])
