local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local m = import 'machine-kit.libsonnet';
local s = import 'security_walker.spec.libsonnet';
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
  knee: { clevis: 0.26, tongue: 0.22, cheek: [0.13, 0.24] },
  ankle: { clevis: 0.22, tongue: 0.18, cheek: [0.11, 0.2] },
  foot: { clevis: 0.16, tongue: 0.15, cheek: [0.11, 0.22] },
};
local hub = 0.34;
local thighHalf = 0.24;
local shinHalf = 0.2;
local tarsusHalf = 0.16;
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
// slides the rod out of the barrel's mouth.
local rams = {
  hip: { base: [1.25, 3.2], end: along(s.hip, s.knee, 0.55, 0.1), z: [1.04, 1.2], bore: 0.16, massKg: [35, 8] },
  knee: { base: along(s.hip, s.knee, 0.35, -0.12), end: along(s.knee, s.ankle, 0.45, -0.12), z: [L + 0.28, L + 0.4], bore: 0.18, massKg: [40, 8] },
  ankle: { base: along(s.knee, s.ankle, 0.55, 0.12), end: along(s.ankle, s.foot, 0.5, 0.1), z: [L + 0.28, L + 0.38], bore: 0.16, massKg: [25, 5] },
};
local eye(ram) = ram.bore * 0.45;
local lug(id, at, ram, z) = m.axleDisc(id, 'frame', at[0], at[1], eye(ram) + 0.03, z, 12);
local ram(name, r) =
  local mouth = along(r.base, r.end, 0.55);
  local rodZ = [r.z[0] + 0.03, r.z[1] - 0.03];
  local finish = { dark: s.frame, bright: 'steel-stainless' };
  [
    k.compound('security_walker_%s_ram_barrel' % name, r.massKg[0], [
      m.axleDisc('base_eye', 'dark', r.base[0], r.base[1], eye(r), r.z, 12),
      k.bar('barrel', 'dark', r.base, mouth, r.bore, r.z),
    ], finish, { base: ['base_eye', centre] }),
    k.compound('security_walker_%s_ram_rod' % name, r.massKg[1], [
      k.bar('rod', 'bright', mouth, r.end, r.bore * 0.45, rodZ),
      m.axleDisc('end_eye', 'bright', r.end[0], r.end[1], eye(r) * 0.9, r.z, 12),
    ], finish, { end: ['end_eye', centre] }),
  ];

// Hydraulic hoses loop round the outside of each joint's bend, laid against the inboard face at `z` that they flex beside.
local hoses(name, massKg, at, radius, from, to, z) =
  k.compound('security_walker_%s_hoses' % name, massKg,
             k.arc('lower', 'hose', at[0], at[1], radius, radius + 0.06, from, to, 10, [z - 0.035, z])
             + k.arc('upper', 'hose', at[0], at[1], radius + 0.07, radius + 0.13, from, to, 10, [z - 0.07, z - 0.035]),
             { hose: 'rubber-black' });

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
    lug('hip_ram_lug', rams.hip.base, rams.hip, [hull.half, rams.hip.z[0]]),
  ]), { paint: s.paint, frame: s.frame } + stripes),
  // Bolted to the flanks behind the hips, so a scavenger lifts one off on its own.
  k.compound('security_walker_flank_armour', 120, [
    box('plate', 'paint', [-1.45, 3.05, hull.half], [-0.6, 4.05, hull.half + 0.05]),
  ] + zBand('stripe', [hull.half + 0.05, hull.half + 0.08], -1.45, 3.08, 0.85, 0.18), { paint: s.paint } + stripes),
  k.compound('security_walker_face_guard', 110, [
    box('bar', 'frame', [face, 3.22, -0.94], [face + 0.05, 3.46, 0.94]),
  ] + xBand('stripe', [face + 0.05, face + 0.08], 3.24, -0.92, 1.84, 0.2), { frame: s.frame } + stripes),
  k.compound('security_walker_sensor_window', 35, [
    box('glass', 'glass', [face - 0.05, s.window.low, -s.window.half], [face - 0.01, s.window.high, s.window.half]),
  ], { glass: 'lens-smoke' }),
  // The walker sees through a row of sensor heads behind its window, in place of a cab or a face.
  k.compound('security_walker_sensor_array', 60, [
    box('housing', 'dark', [1.2, 3.48, -0.7], [face - 0.07, 3.8, 0.7]),
  ] + [
    k.turned('lens_%d' % i, if i == 2 then 'eye' else 'lens', 'x', k.disc(if i == 2 then 0.1 else 0.07, 0, 0.02), [face - 0.07, 3.64, (i - 2) * 0.26]) + { sides: 16 }
    for i in std.range(0, 4)
  ], { dark: 'plastic-black', lens: 'cell-glow-teal', eye: 'glass-lens-amber' }),
  k.compound('security_walker_hydraulic_pack', 180, [
    box('tank', 'paint', [0.1, inner[0][1], -0.85], [0.85, 3.3, -0.3]),
    k.turned('pump', 'steel', 'z', k.disc(0.12, 0, 0.3), [0.45, 3.42, -0.75]) + { sides: 16 },
    k.turned('filter', 'steel', 'y', k.disc(0.07, 0, 0.2), [0.25, 3.3, -0.4]) + { sides: 12 },
  ], { paint: s.frame, steel: 'steel-stainless' }),
  // The hip drive turns the thigh; it is the leg's root, bolted to the torso's flank.
  k.compound('security_walker_hip_drive', 260, [
    m.axleDisc('drive', 'frame', s.hip[0], s.hip[1], 0.42, [hull.half, L - thighHalf]),
  ], { frame: s.frame }, { pivot: ['drive', centre] }),
  k.compound('security_walker_thigh', 820, [
    m.axleDisc('hub', 'paint', s.hip[0], s.hip[1], hub, [L - thighHalf, L + thighHalf]),
    m.axleDisc('hip_cap', 'frame', s.hip[0], s.hip[1], 0.2, [L + thighHalf, L + thighHalf + 0.08]),
    body(s.hip, s.knee, 0, joints.knee.clevis + clear, 0.56, thighHalf, 0.46),
    m.axleDisc('knee_pin', 'frame', s.knee[0], s.knee[1], 0.1, [L + joints.knee.cheek[1], L + joints.knee.cheek[1] + 0.04], 12),
    lug('hip_ram_lug', rams.hip.end, rams.hip, [rams.hip.z[1], L - thighHalf]),
    lug('knee_ram_lug', rams.knee.base, rams.knee, [L + thighHalf, rams.knee.z[0]]),
  ] + clevisEnd('knee', 'paint', s.knee, s.hip, joints.knee, 0.46), { paint: s.paint, frame: s.frame }, {
    hip: ['hub', centre],
    knee: ['knee_cheek_outer', centre],
  }),
  k.compound('security_walker_shin', 640, [
    body(s.knee, s.ankle, joints.knee.clevis + clear, joints.ankle.clevis + clear, 0.44, shinHalf, 0.36),
    m.axleDisc('ankle_pin', 'frame', s.ankle[0], s.ankle[1], 0.09, [L + joints.ankle.cheek[1], L + joints.ankle.cheek[1] + 0.04], 12),
    lug('knee_ram_lug', rams.knee.end, rams.knee, [L + shinHalf, rams.knee.z[0]]),
    lug('ankle_ram_lug', rams.ankle.base, rams.ankle, [L + shinHalf, rams.ankle.z[0]]),
  ] + tongueEnd('knee', 'paint', s.knee, s.ankle, joints.knee, 0.4)
  + clevisEnd('ankle', 'paint', s.ankle, s.knee, joints.ankle, 0.32), { paint: s.paint, frame: s.frame }, {
    knee: ['knee_boss', centre],
    ankle: ['ankle_cheek_outer', centre],
  }),
  k.compound('security_walker_tarsus', 300, [
    body(s.ankle, s.foot, joints.ankle.clevis + clear, joints.foot.clevis + clear, 0.32, tarsusHalf),
    lug('ankle_ram_lug', rams.ankle.end, rams.ankle, [L + tarsusHalf, rams.ankle.z[0]]),
  ] + tongueEnd('ankle', 'paint', s.ankle, s.foot, joints.ankle, 0.28)
  + tongueEnd('foot', 'paint', s.foot, s.ankle, joints.foot, 0.24), { paint: s.paint, frame: s.frame }, {
    ankle: ['ankle_boss', centre],
    foot: ['foot_boss', centre],
  }),
  k.compound('security_walker_foot', 560, [
    k.yPrism('sole', 'paint', ccw([[p[1], p[0]] for p in [plan(22.5 + 45 * i, 0.32, 0) for i in std.range(0, 7)]]), [0, 0.22]),
  ] + std.flattenArrays([toe(t) for t in toes]) + std.flattenArrays([
    [
      prism('cheek_' + side.name, 'paint', [[s.foot[0] - 0.22, 0.22], [s.foot[0] + 0.22, 0.22], [s.foot[0] + 0.12, s.foot[1]], [s.foot[0] - 0.12, s.foot[1]]], side.z),
      m.axleDisc('cheek_disc_' + side.name, 'paint', s.foot[0], s.foot[1], joints.foot.clevis, side.z),
    ]
    for side in [
      { name: 'outer', z: [L + joints.foot.cheek[0], L + joints.foot.cheek[1]] },
      { name: 'inner', z: [L - joints.foot.cheek[1], L - joints.foot.cheek[0]] },
    ]
  ]), { paint: s.paint, claw: 'steel-gunmetal' }, { pivot: ['cheek_disc_outer', centre] }),
] + ram('hip', rams.hip) + ram('knee', rams.knee) + ram('ankle', rams.ankle) + [
  hoses('hip', 6, s.hip, 0.46, 105, 250, hull.half + 0.07),
  hoses('knee', 4, s.knee, 0.3, -130, 122, L - joints.knee.cheek[1]),
  hoses('ankle', 3, s.ankle, 0.27, 50, 300, L - joints.ankle.cheek[1]),
  k.compound('security_walker_pod_mount', 60, [
    box('bracket', 'frame', [-0.1, pod.low, hull.half], [0.5, 4.3, trunnion.z[0]]),
    m.axleDisc('trunnion', 'frame', s.trunnion[0], s.trunnion[1], trunnion.radius, trunnion.z),
  ], { frame: s.frame }),
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
    { paint: s.paint, frame: s.frame, bore: 'plastic-black' } + stripes, { trunnion: ['boss', centre] }),
])
