local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// Generic, unbranded gym equipment: free weights, a bench and rack for them, cardio machines and mats. Frames, pads
// and housings stand with their user's facing on +z; free weights lie along x.

local round = { sides: null };
local gym(category, materials, keywords) = { taxonomy: {
  category: category,
  tags: { material: materials, place: ['gym'], setting: ['modern'] },
  keywords: keywords,
} };
// A bar of radius `r` along z from z0 to z1, its axis at (x, y).
local barZ(id, slot, r, z0, z1, x, y) = h.turned(id, slot, 'z', [[0, 0], [0, r], [z1 - z0, r], [z1 - z0, 0]], [x, y, z0]);
// A bar of radius `r` along x from x0 to x1, its axis at (y, z).
local barX(id, slot, r, x0, x1, y, z=0) = h.turned(id, slot, 'x', [[0, 0], [0, r], [x1 - x0, r], [x1 - x0, 0]], [x0, y, z]);
// A flat bar `w` wide from x0 to x1, running in the yz plane from [y, z] point `a` to `b`: sloped uprights and legs.
local slant(id, slot, a, b, w, x0, x1) =
  local dy = b[0] - a[0], dz = b[1] - a[1], len = std.sqrt(dy * dy + dz * dz);
  local ny = -dz / len * w / 2, nz = dy / len * w / 2;
  h.prism(id, slot, 'x', [[a[0] + ny, a[1] + nz], [b[0] + ny, b[1] + nz], [b[0] - ny, b[1] - nz], [a[0] - ny, a[1] - nz]], x0, x1);
// A ring turned about `axis` between radii r0 and r1, `t` thick from `origin`: a plate with its bore.
local ring(id, slot, axis, r0, r1, t, origin) = h.turned(id, slot, axis, [[0, r0], [0, r1], [t, r1], [t, r0], [0, r0]], origin) + round;
// A box and its mirror across x = 0, named `id`-l and `id`-r; `min` and `max` give the +x one.
local pair(id, slot, min, max) = [
  box(id + '-l', slot, min, max),
  box(id + '-r', slot, [-max[0], min[1], min[2]], [-min[0], max[1], max[2]]),
];
// A wheel of radius `r`, `w` wide, turned about x from x0, its axle at (y, z).
local wheel(id, slot, r, w, x0, y, z) = barX(id, slot, r, x0, x0 + w, y, z) + round;

// A dumbbell lying along x on its heads: a knurled handle `grip` long and `hr` in radius between two heads `w` wide.
// Hex heads, `r` to their corners, rest on a flat; round heads roll. Slots: handle, knurl, head, collar.
local dumbbell(grip, hr, r, w, hex=true) =
  local cy = if hex then r * std.sin(std.pi / 3) else r, half = grip / 2, collar = 0.006;
  local head(id, x0, x1) =
    if hex then h.prism(id, 'head', 'x', [[cy + r * std.sin(k * std.pi / 3), r * std.cos(k * std.pi / 3)] for k in std.range(0, 5)], x0, x1)
    else h.turned(id, 'head', 'x', [[0, r * 0.85], [0, r], [x1 - x0, r], [x1 - x0, r * 0.85]], [x0, cy, 0]) + round;
  [
    barX('handle', 'handle', hr, -half - collar - w * 0.6, half + collar + w * 0.6, cy),
    barX('knurl', 'knurl', hr + 0.0008, -half * 0.75, half * 0.75, cy),
    barX('collar-l', 'collar', hr * 1.6, -half - collar, -half, cy),
    barX('collar-r', 'collar', hr * 1.6, half, half + collar, cy),
    head('head-l', -half - collar - w, -half - collar),
    head('head-r', half + collar, half + collar + w),
  ];

// An Olympic bar 2.2 m long lying along x with its axis at height `y`: a 28 mm shaft knurled either side of the
// middle, sleeve collars 1.31 m apart and 50 mm sleeves out to the end caps. Slots: shaft, knurl, sleeve.
local barbell(y) = [
  barX('shaft', 'shaft', 0.014, -0.655, 0.655, y),
  barX('knurl-l', 'knurl', 0.0145, -0.6, -0.1, y),
  barX('knurl-r', 'knurl', 0.0145, 0.1, 0.6, y),
  barX('collar-l', 'sleeve', 0.035, -0.685, -0.655, y),
  barX('collar-r', 'sleeve', 0.035, 0.655, 0.685, y),
  barX('sleeve-l', 'sleeve', 0.025, -1.1, -0.685, y),
  barX('sleeve-r', 'sleeve', 0.025, 0.685, 1.1, y),
];
// A weight plate `r` in radius and `t` thick turned about `axis` from `origin`, its 51 mm bore round a raised steel
// hub; a bumper plate is rubber to its edge, an iron plate has a raised rim. Slots: plate, hub.
local plate(prefix, axis, r, t, origin, rim=false) =
  local along(d) = [origin[0] + (if axis == 'x' then d else 0), origin[1] + (if axis == 'y' then d else 0), origin[2]];
  [
    ring(prefix + '-face', 'plate', axis, 0.0255, r, t, origin),
    ring(prefix + '-hub', 'hub', axis, 0.0255, 0.05, t + 0.004, along(-0.002)),
  ] + (if rim then [ring(prefix + '-rim', 'plate', axis, r - 0.012, r, t + 0.008, along(-0.004))] else []);

// A cast kettlebell standing on its flat foot: a ball `r` in radius centred at `cy`, cut flat at the floor, and a
// handle arching over it in the xy plane. Slots: bell, handle.
local kettlebell(r, cy) =
  local start = std.acos(cy / r), top = cy + r;
  [
    h.turned('bell', 'bell', 'y', [[0, 0]] + [
      local a = start + (std.pi - start) * i / 12;
      [cy - r * std.cos(a), r * std.sin(a)]
      for i in std.range(0, 12)
    ]) + round,
  ] + h.pipe('handle', 'handle', [[-r * 0.72, top - r * 0.55], [-r * 0.8, top + r * 0.15], [-r * 0.68, top + r * 0.6], [-r * 0.35, top + r * 0.77], [0, top + r * 0.79], [r * 0.35, top + r * 0.77], [r * 0.68, top + r * 0.6], [r * 0.8, top + r * 0.15], [r * 0.72, top - r * 0.55]], r * 0.17);

[
  // A 10 kg hex dumbbell 290 mm long: rubber-clad hex heads 110 mm across their flats on a chrome handle.
  h.compound('dumbbell', 10, dumbbell(0.13, 0.016, 0.064, 0.068), { handle: 'steel-bright', knurl: 'steel-hardened', head: 'rubber-black', collar: 'steel-bright' })
  + h.inHand('dumbbell', 'handle') + { voxelGrain: 0.004 } + gym('recreation', ['rubber', 'metal'], ['free-weights', 'strength-training']),

  // A 25 kg hex dumbbell 350 mm long, its heads 150 mm across their flats.
  h.compound('heavy_dumbbell', 25, dumbbell(0.135, 0.017, 0.088, 0.096), { handle: 'steel-bright', knurl: 'steel-hardened', head: 'rubber-black', collar: 'steel-bright' })
  + h.inHand('heavy_dumbbell', 'handle') + { voxelGrain: 0.004 } + gym('recreation', ['rubber', 'metal'], ['free-weights', 'strength-training']),

  // A 2 kg vinyl-coated dumbbell 210 mm long with round heads 90 mm across, for light toning work.
  h.compound('light_dumbbell', 2, dumbbell(0.11, 0.015, 0.045, 0.05, hex=false), { handle: 'plastic-blue', knurl: 'plastic-blue', head: 'plastic-blue', collar: 'plastic-blue' })
  + h.inHand('light_dumbbell', 'handle') + { voxelGrain: 0.004 } + gym('recreation', ['plastic'], ['free-weights', 'fitness']),

  // An empty 20 kg Olympic barbell, 2.2 m long, lying on its collars.
  h.compound('barbell', 20, barbell(0.035), { shaft: 'steel-bright', knurl: 'steel-hardened', sleeve: 'steel-bright' })
  + { voxelGrain: 0.004 } + gym('recreation', ['metal'], ['free-weights', 'weightlifting', 'strength-training']),

  // A loaded Olympic barbell, 60 kg: the 20 kg bar with a 20 kg bumper plate 450 mm across on each sleeve, held by
  // spring clips, standing on the plates.
  h.compound('loaded_barbell', 60, barbell(0.225) + plate('plate-l', 'x', 0.225, 0.065, [-0.752, 0.225, 0]) + plate('plate-r', 'x', 0.225, 0.065, [0.687, 0.225, 0]) + [
    ring('clip-l', 'clip', 'x', 0.0255, 0.035, 0.018, [-0.775, 0.225, 0]),
    ring('clip-r', 'clip', 'x', 0.0255, 0.035, 0.018, [0.757, 0.225, 0]),
  ], { shaft: 'steel-bright', knurl: 'steel-hardened', sleeve: 'steel-bright', plate: 'rubber-black', hub: 'steel-bright', clip: 'plastic-red' })
  + { voxelGrain: 0.004 } + gym('recreation', ['metal', 'rubber'], ['free-weights', 'weightlifting', 'strength-training']),

  // A 20 kg rubber bumper plate lying flat, 450 mm across and 65 mm thick, with a steel hub round its bore.
  h.compound('bumper_plate', 20, plate('plate', 'y', 0.225, 0.065, [0, 0.002, 0]), { plate: 'rubber-black', hub: 'steel-bright' })
  + { voxelGrain: 0.004 } + gym('recreation', ['rubber'], ['free-weights', 'weightlifting']),

  // A 5 kg cast iron plate lying flat, 230 mm across and 28 mm thick, with a raised rim.
  h.compound('iron_weight_plate', 5, plate('plate', 'y', 0.115, 0.028, [0, 0.004, 0], rim=true), { plate: 'iron-cast', hub: 'steel-bright' })
  + { voxelGrain: 0.004 } + gym('recreation', ['metal'], ['free-weights', 'weightlifting']),

  // A 16 kg cast iron kettlebell 280 mm tall: a ball 200 mm across on a flat foot under a 35 mm handle.
  h.compound('kettlebell', 16, kettlebell(0.1, 0.085), { bell: 'iron-cast', handle: 'iron-cast' })
  + h.inHand('kettlebell', 'handle-wide-3') + { voxelGrain: 0.004 } + gym('recreation', ['metal'], ['free-weights', 'strength-training']),

  // A 24 kg cast iron kettlebell 315 mm tall.
  h.compound('heavy_kettlebell', 24, h.scaled(kettlebell(0.1, 0.085), 1.13), { bell: 'iron-cast', handle: 'iron-cast' })
  + h.inHand('heavy_kettlebell', 'handle-wide-3') + { voxelGrain: 0.004 } + gym('recreation', ['metal'], ['free-weights', 'strength-training']),

  // An 8 kg kettlebell 225 mm tall, cast iron coated in red vinyl.
  h.compound('light_kettlebell', 8, h.scaled(kettlebell(0.1, 0.085), 0.8), { bell: 'paint-red', handle: 'paint-red' })
  + h.inHand('light_kettlebell', 'handle-wide-3') + { voxelGrain: 0.004 } + gym('recreation', ['metal'], ['free-weights', 'fitness']),

  // An adjustable weight bench set flat, 25 kg and 1.25 m long: back and seat pads 440 mm up on a square steel frame,
  // the head end on -z with transport wheels, a carry handle at the foot.
  h.compound('weight_bench', 25, [
    box('beam', 'frame', [-0.03, 0.06, -0.6], [0.03, 0.12, 0.5]),
    box('foot-rear', 'frame', [-0.3, 0, -0.62], [0.3, 0.06, -0.56]),
    box('foot-front', 'frame', [-0.26, 0, 0.44], [0.26, 0.06, 0.5]),
    box('post-front', 'frame', [-0.03, 0.12, 0.3], [0.03, 0.38, 0.36]),
    slant('post-rear', 'frame', [0.12, -0.45], [0.38, -0.3], 0.06, -0.03, 0.03),
    box('rail', 'frame', [-0.09, 0.37, -0.58], [0.09, 0.4, 0.46]),
    box('ladder', 'frame', [-0.025, 0.12, -0.25], [0.025, 0.15, 0.2]),
    barX('pin', 'pin', 0.012, -0.07, 0.07, 0.3, 0.33),
    box('back-pad', 'pad', [-0.14, 0.4, -0.62], [0.14, 0.465, 0.11]),
    box('seat-pad', 'pad', [-0.14, 0.4, 0.14], [0.14, 0.465, 0.48]),
    barZ('handle', 'frame', 0.015, 0.5, 0.62, 0, 0.09),
    barZ('grip', 'rubber', 0.018, 0.54, 0.62, 0, 0.09),
  ] + pair('cap-front', 'rubber', [0.2, 0, 0.43], [0.27, 0.065, 0.51]) + [
    wheel('wheel-l', 'rubber', 0.04, 0.03, 0.3, 0.04, -0.59),
    wheel('wheel-r', 'rubber', 0.04, 0.03, -0.33, 0.04, -0.59),
  ], { frame: 'paint-graphite', pin: 'paint-red', pad: 'vinyl-black', rubber: 'rubber-black' })
  + { voxelGrain: 0.004 } + gym('recreation', ['metal', 'plastic'], ['strength-training']),

  // A power rack 2.25 m tall, 120 kg: four 75 mm uprights on a 1.2 by 1.0 m footprint, a pull-up bar across the
  // front, J-hooks at squat height, safety bars through the uprights and plate horns behind.
  local up = 0.0375;
  local post(id, x, z) = box(id, 'frame', [x - up, 0.075, z - up], [x + up, 2.25, z + up]);
  h.compound('power_rack', 120, [
    post('post-fl', 0.56, 0.5),
    post('post-fr', -0.56, 0.5),
    post('post-bl', 0.56, -0.5),
    post('post-br', -0.56, -0.5),
    box('top-front', 'frame', [-0.56, 2.175, 0.5 - up], [0.56, 2.25, 0.5 + up]),
    box('top-back', 'frame', [-0.56, 2.175, -0.5 - up], [0.56, 2.25, -0.5 + up]),
    box('base-back', 'frame', [-0.56, 0, -0.5 - up], [0.56, 0.075, -0.5 + up]),
    barX('pull-up', 'bar', 0.016, -0.6, 0.6, 2.13, 0.5 + up + 0.02),
  ] + pair('foot', 'frame', [0.56 - up, 0, -0.62], [0.56 + up, 0.075, 0.62])
  + pair('top-side', 'frame', [0.56 - up, 2.175, -0.5], [0.56 + up, 2.25, 0.5])
  + pair('hook', 'frame', [0.53, 1.3, 0.5 - up - 0.08], [0.59, 1.36, 0.5 - up]) + pair('hook-lip', 'frame', [0.53, 1.36, 0.5 - up - 0.08], [0.59, 1.42, 0.5 - up - 0.065])
  + pair('liner', 'liner', [0.535, 1.36, 0.5 - up - 0.065], [0.585, 1.37, 0.5 - up])
  + pair('safety', 'frame', [0.535, 0.72, -0.62], [0.585, 0.77, 0.62])
  + [barZ('horn-%s-%d' % [side[0], i], 'bar', 0.025, -0.5 - up - 0.25, -0.5 - up, side[1], [0.45, 0.95][i]) for side in [['l', 0.56], ['r', -0.56]] for i in [0, 1]]
  + pair('pad', 'rubber', [0.56 - up - 0.005, 0, -0.64], [0.56 + up + 0.005, 0.01, -0.58]) + pair('pad-front', 'rubber', [0.56 - up - 0.005, 0, 0.58], [0.56 + up + 0.005, 0.01, 0.64]),
  { frame: 'paint-graphite', bar: 'steel-bright', liner: 'uhmw-white', rubber: 'rubber-black' })
  + { voxelGrain: 0.01 } + gym('recreation', ['metal'], ['strength-training', 'weightlifting']),

  // A motorised treadmill, 95 kg, 1.9 m long: a 500 mm belt between side rails, the motor hood and console at the
  // front, where the runner faces.
  h.compound('treadmill', 95, [
    box('frame', 'frame', [-0.35, 0.03, -0.9], [0.35, 0.16, 0.62]),
    box('belt', 'belt', [-0.25, 0.16, -0.88], [0.25, 0.19, 0.6]),
    box('rear-cap', 'shell', [-0.4, 0.04, -0.95], [0.4, 0.19, -0.88]),
    h.prism('hood', 'shell', 'x', [[0.04, 0.6], [0.04, 0.95], [0.24, 0.95], [0.31, 0.82], [0.3, 0.6]], -0.4, 0.4),
    h.prism('console', 'shell', 'x', [[1.1, 0.58], [1.13, 0.75], [1.3, 0.72], [1.34, 0.54]], -0.4, 0.4),
    box('screen', 'screen', [-0.14, 1.17, 0.545], [0.14, 1.29, 0.56]),
    box('readout', 'readout', [-0.1, 1.2, 0.54], [0.1, 1.26, 0.546]),
    box('key', 'key', [0.2, 1.2, 0.535], [0.24, 1.24, 0.56]),
    box('tray', 'shell', [-0.3, 1.08, 0.5], [0.3, 1.11, 0.62]),
  ] + pair('rail', 'shell', [0.25, 0.1, -0.88], [0.4, 0.2, 0.6]) + pair('tread', 'step', [0.27, 0.2, -0.86], [0.38, 0.205, 0.58])
  + [
    slant('upright-l', 'frame', [0.25, 0.82], [1.12, 0.64], 0.07, 0.32, 0.39),
    slant('upright-r', 'frame', [0.25, 0.82], [1.12, 0.64], 0.07, -0.39, -0.32),
    barZ('handrail-l', 'frame', 0.017, 0.28, 0.66, 0.36, 1.02),
    barZ('handrail-r', 'frame', 0.017, 0.28, 0.66, -0.36, 1.02),
    barZ('grip-l', 'step', 0.02, 0.3, 0.5, 0.36, 1.02),
    barZ('grip-r', 'step', 0.02, 0.3, 0.5, -0.36, 1.02),
  ] + pair('foot-rear', 'step', [0.3, 0, -0.9], [0.38, 0.04, -0.82]) + pair('foot-front', 'step', [0.3, 0, 0.82], [0.38, 0.04, 0.9]),
  { frame: 'paint-graphite', belt: 'rubber-tread', shell: 'plastic-charcoal', screen: 'screen-black', readout: 'lcd-green', key: 'paint-red', step: 'rubber-black' })
  + { voxelGrain: 0.01 } + gym('recreation', ['plastic', 'metal'], ['cardio', 'fitness']),

  // An air rowing machine, 26 kg and 2.4 m long: an aluminium monorail carrying the seat, the fan cage at the front,
  // where the rower faces, with the footrests, handle and monitor before it.
  h.compound('rowing_machine', 26, [
    box('rail', 'rail', [-0.04, 0.38, -1.18], [0.04, 0.44, 0.55]),
    box('leg-rear', 'frame', [-0.03, 0.04, -1.2], [0.03, 0.38, -1.14]),
    box('foot-rear', 'frame', [-0.28, 0, -1.22], [0.28, 0.04, -1.12]),
    slant('neck', 'frame', [0.41, 0.52], [0.6, 0.78], 0.07, -0.04, 0.04),
    box('leg-front', 'frame', [-0.05, 0.04, 0.82], [0.05, 0.5, 0.92]),
    box('foot-front', 'frame', [-0.28, 0, 0.85], [0.28, 0.04, 0.95]),
    barX('fan', 'cage', 0.27, -0.13, 0.13, 0.5, 0.9) + round,
    barX('cover-l', 'shell', 0.22, 0.13, 0.15, 0.5, 0.9) + round,
    barX('cover-r', 'shell', 0.22, -0.15, -0.13, 0.5, 0.9) + round,
    slant('arm', 'frame', [0.7, 0.75], [1.0, 0.56], 0.04, -0.02, 0.02),
    box('monitor', 'shell', [-0.1, 0.96, 0.5], [0.1, 1.12, 0.55]),
    box('readout', 'readout', [-0.075, 1.0, 0.495], [0.075, 1.09, 0.5]),
    box('carriage', 'frame', [-0.06, 0.44, -0.4], [0.06, 0.46, -0.15]),
    box('seat', 'shell', [-0.15, 0.46, -0.42], [0.15, 0.51, -0.13]),
    barX('handle', 'frame', 0.014, -0.27, 0.27, 0.56, 0.63),
    barX('grip-l', 'grip', 0.018, 0.14, 0.27, 0.56, 0.63),
    barX('grip-r', 'grip', 0.018, -0.27, -0.14, 0.56, 0.63),
  ] + [
    slant('footrest-' + s[0], 'shell', [0.36, 0.34], [0.52, 0.48], 0.02, s[1], s[1] + 0.13)
    for s in [['l', 0.04], ['r', -0.17]]
  ] + [
    slant('strap-' + s[0], 'strap', [0.44, 0.36], [0.47, 0.41], 0.05, s[1], s[1] + 0.13)
    for s in [['l', 0.04], ['r', -0.17]]
  ] + [
    wheel('wheel-l', 'rubber', 0.035, 0.025, 0.2, 0.035, 0.97),
    wheel('wheel-r', 'rubber', 0.035, 0.025, -0.225, 0.035, 0.97),
  ], { rail: 'alu-bare', frame: 'paint-charcoal', cage: 'mesh-black', shell: 'plastic-charcoal', readout: 'lcd-green', grip: 'rubber-black', strap: 'webbing-black', rubber: 'rubber-black' })
  + { voxelGrain: 0.01 } + gym('recreation', ['metal', 'plastic'], ['cardio', 'fitness']),

  // An exercise mat laid flat, 1.83 m by 610 mm and 10 mm thick, of closed-cell foam.
  h.compound('exercise_mat', 1.2, [box('mat', 'mat', [-0.305, 0, -0.915], [0.305, 0.01, 0.915])], { mat: 'foam-eva' })
  + { voxelGrain: 0.004 } + gym('recreation', ['rubber'], ['yoga', 'fitness']),

  // The exercise mat rolled up and strapped, 610 mm long and 150 mm across.
  h.compound('rolled_exercise_mat', 1.2, [
    ring('roll', 'mat', 'x', 0.02, 0.075, 0.61, [-0.305, 0.075, 0]),
    ring('strap-l', 'strap', 'x', 0.074, 0.079, 0.025, [0.17, 0.075, 0]),
    ring('strap-r', 'strap', 'x', 0.074, 0.079, 0.025, [-0.195, 0.075, 0]),
  ], { mat: 'foam-eva', strap: 'webbing-black' })
  + { voxelGrain: 0.004 } + gym('recreation', ['rubber'], ['yoga', 'fitness']) + { taxonomy+: { tags+: { state: ['folded'] } } },

  // A weight plate tree, 30 kg and 1.1 m tall: six storage horns on a square post over crossed feet.
  h.compound('plate_tree', 30, [
    box('post', 'frame', [-0.035, 0.05, -0.035], [0.035, 1.1, 0.035]),
    box('foot-x', 'frame', [-0.32, 0, -0.035], [0.32, 0.05, 0.035]),
    box('foot-z', 'frame', [-0.035, 0, -0.32], [0.035, 0.05, 0.32]),
  ] + [
    barZ('horn-%s-%d' % [s[0], i], 'horn', 0.025, s[1], s[2], 0, [0.3, 0.6, 0.9][i])
    for s in [['front', 0.035, 0.26], ['back', -0.26, -0.035]]
    for i in [0, 1, 2]
  ], { frame: 'paint-graphite', horn: 'steel-bright' })
  + { voxelGrain: 0.01 } + gym('recreation', ['metal'], ['free-weights']),

  // An empty two-tier dumbbell rack, 45 kg and 1.3 m long: two shelves sloping toward the user on steel end frames.
  h.compound('dumbbell_rack', 45, [
    slant('shelf-low', 'frame', [0.44, -0.05], [0.38, 0.3], 0.03, -0.62, 0.62),
    slant('shelf-high', 'frame', [0.8, -0.3], [0.74, 0.02], 0.03, -0.62, 0.62),
    box('lip-low', 'frame', [-0.62, 0.36, 0.29], [0.62, 0.42, 0.32]),
    box('lip-high', 'frame', [-0.62, 0.72, 0.01], [0.62, 0.78, 0.04]),
    slant('liner-low', 'liner', [0.465, -0.05], [0.405, 0.29], 0.02, -0.6, 0.6),
    slant('liner-high', 'liner', [0.825, -0.3], [0.765, 0.01], 0.02, -0.6, 0.6),
  ] + pair('leg-front', 'frame', [0.62, 0, 0.26], [0.68, 0.44, 0.32])
  + pair('leg-back', 'frame', [0.62, 0, -0.32], [0.68, 0.82, -0.26])
  + pair('foot', 'frame', [0.62, 0, -0.36], [0.68, 0.05, 0.36])
  + pair('end', 'frame', [0.62, 0.36, -0.32], [0.68, 0.42, 0.32])
  + pair('leg-mid', 'frame', [0.62, 0.42, -0.02], [0.68, 0.76, 0.04]), { frame: 'paint-graphite', liner: 'rubber-black' })
  + { voxelGrain: 0.01 } + gym('recreation', ['metal'], ['free-weights']),
]
