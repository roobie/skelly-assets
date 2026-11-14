local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local m = import 'machine-kit.libsonnet';
local s = import 'bulldozer.spec.libsonnet';
local track = import 'track-kit.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local skin = 0.04;
local doorRear = -1.0;
local doorFront = -0.25;
local post = 0.12;
// The moldboard curls forward round a centre ahead of the blade, `sweep` degrees above and below it, its cutting edge
// on the ground.
local blade = { cx: 3.6, cy: 0.72, radius: 1.0, sweep: 45, halfWidth: 1.63, back: 2.42, depth: 0.26 };
local bladeAngle(i) = 180 - blade.sweep + 2 * blade.sweep * i / 6;
local bladeFace = [
  [blade.cx + blade.radius * std.cos(k.rad(bladeAngle(i))), blade.cy + blade.radius * std.sin(k.rad(bladeAngle(i)))]
  for i in std.range(0, 6)
];
local lip = blade.cx - blade.radius * std.cos(k.rad(blade.sweep));
local ribs = [-1.2, -0.5, 0, 0.5, 1.2];
// Each push arm swings on a trunnion on its track frame's outer face; its front end and each lift cylinder's rod sit
// in a clevis on the blade's back, between two ears.
local arm = { pivot: [-0.1, 0.5], end: [blade.back - 0.02, 0.33], z: [1.24, 1.4] };
local lift = { foot: [1.6, 1.78], pin: [blade.back - 0.04, 1.2], z: [s.hoodSide + 0.04, s.hoodSide + 0.24] };
local ear = 0.04;
// One cylinder tilts the blade from a clevis on its push arm to the blade's upper back; the far arm carries a brace in
// its place, so the blade tips about the brace's end.
local tilt = { foot: [0.8, 0.7], pin: [blade.back - 0.04, 1.02] };
local armY(x) = arm.pivot[1] + (x - arm.pivot[0]) * (arm.end[1] - arm.pivot[1]) / (arm.end[0] - arm.pivot[0]);
local along(share) = [tilt.foot[i] + share * (tilt.pin[i] - tilt.foot[i]) for i in [0, 1]];
local clevis(name, x, y) = [
  box(name + '_ear_inner', 'paint', [x[0], y[0], arm.z[0] - ear], [x[1], y[1], arm.z[0]]),
  box(name + '_ear_outer', 'paint', [x[0], y[0], arm.z[1]], [x[1], y[1], arm.z[1] + ear]),
];
local ripper = { beam: [-2.95, -2.65], top: 1.1, mount: [-2.05, -1.9] };
local shankX = (ripper.beam[0] + ripper.beam[1]) / 2;
taxonomy.inherit({ tags: { 'vehicle-body': ['plant'] } }, [
  k.compound('bulldozer_mainframe', 3000, [
    box('belly_guard', 'steel', [-0.2, 0.36, -0.55], [1.88, 0.42, 0.55]),
    box('front_cross', 'steel', [1.8, 0.42, -0.38], [1.88, s.frameTop, 0.38]),
    box('equaliser_bar', 'steel', [1.42, 0.48, -0.78], [1.56, 0.62, 0.78]),
  ] + bothSides([
    box('rail', 'steel', [ripper.mount[1], 0.42, 0.38], [1.88, s.frameTop, s.hoodSide]),
    k.turned('pivot_shaft', 'steel', 'z', k.disc(0.1, 0.55, 0.78), [-0.6, 0.55, 0]) + { sides: 12 },
    box('lift_post', 'steel', [1.5, s.frameTop, s.hoodSide], [1.7, 1.88, lift.z[0]]),
  ]), { steel: 'paint-charcoal' }) + { title: 'Bulldozer mainframe' },
  k.compound('bulldozer_final_drive', 450, [
    m.axleDisc('housing', 'steel', -0.85, 1.0, 0.36, [0.55, 0.77]),
  ], { steel: 'paint-charcoal' }) + { title: 'Bulldozer final drive' },
  k.compound('bulldozer_hood', 400, [
    prism('top', 'paint', [[s.hoodRear, s.hoodTop - skin], [s.hoodFront, s.noseTop - skin], [s.hoodFront, s.noseTop], [s.hoodRear, s.hoodTop]], [skin - s.hoodSide, s.hoodSide - skin]),
    box('bulkhead', 'paint', [s.hoodRear, s.frameTop, -s.hoodSide], [s.hoodRear + 0.05, s.hoodTop - skin, s.hoodSide]),
    box('grille', 'grille', [s.hoodFront, s.frameTop, -s.hoodSide], [s.hoodFront + 0.1, s.noseTop, s.hoodSide]),
  ] + [
    box('grille_bar_%d' % i, 'paint', [s.hoodFront + 0.1, 1.08 + 0.16 * i, -0.46], [s.hoodFront + 0.12, 1.12 + 0.16 * i, 0.46])
    for i in std.range(0, 4)
  ], { paint: s.paint, grille: 'paint-charcoal' }) + { title: 'Bulldozer hood' },
  // An engine side panel lifts off for service, so it is a part of its own a scavenger can take.
  k.compound('bulldozer_engine_panel', 30, [
    prism('skin', 'paint', [[s.hoodRear + 0.05, s.frameTop], [s.hoodFront, s.frameTop], [s.hoodFront, s.noseTop], [s.hoodRear + 0.05, s.hoodTop]], [s.hoodSide - skin, s.hoodSide]),
  ] + [
    box('louvre_%d' % i, 'trim', [0.6, 1.3 + 0.1 * i, s.hoodSide], [1.5, 1.33 + 0.1 * i, s.hoodSide + 0.01])
    for i in std.range(0, 3)
  ], { paint: s.paint, trim: 'paint-charcoal' }) + { title: 'Bulldozer engine panel' },
  k.compound('bulldozer_deck', 500, [
    box('platform', 'paint', [-1.95, s.deck - 0.05, -1.32], [s.cabFront, s.deck, 1.32]),
  ] + bothSides([
    box('lamp_bracket', 'trim', [-1.95, 1.44, 0.92], [-1.9, s.deck - 0.05, 1.08]),
  ]), { paint: s.paint, trim: 'paint-charcoal' }) + { title: 'Bulldozer deck' },
  k.compound('bulldozer_fuel_tank', 160, [
    box('tank', 'steel', [-1.9, s.frameTop, -0.55], [s.cabRear - 0.02, s.deck - 0.05, 0.55]),
  ], { steel: 'paint-charcoal' }) + { title: 'Bulldozer fuel tank' },
  k.compound('bulldozer_cab', 950, [
    box('floor', 'floor', [s.cabRear, s.deck, -s.cabSide], [s.cabFront, s.deck + 0.05, s.cabSide]),
    box('roof', 'paint', [s.cabRear - 0.05, s.cabRoof, -s.cabSide - 0.05], [s.cabFront + 0.08, s.roofTop, s.cabSide + 0.05]),
    box('rear_panel', 'paint', [s.cabRear, s.deck, -s.cabSide + post], [s.cabRear + 0.05, s.belt, s.cabSide - post]),
    box('rear_glass', 'glass', [s.cabRear + 0.01, s.belt, -s.cabSide + post], [s.cabRear + 0.04, s.cabRoof, s.cabSide - post]),
    box('front_panel', 'paint', [s.cabFront - 0.05, s.deck, -s.cabSide + post], [s.cabFront, s.deck + 0.45, s.cabSide - post]),
    box('dash', 'trim', [s.cabFront - 0.3, s.deck + 0.05, -0.45], [s.cabFront - 0.05, s.deck + 0.85, 0.45]),
  ] + bothSides([
    box('post_rear', 'paint', [s.cabRear, s.deck, s.cabSide - post], [s.cabRear + post, s.cabRoof, s.cabSide]),
    box('post_front', 'paint', [s.cabFront - post, s.deck, s.cabSide - post], [s.cabFront, s.cabRoof, s.cabSide]),
    box('rear_quarter', 'paint', [s.cabRear + post, s.deck, s.cabSide - 0.04], [doorRear, s.belt, s.cabSide]),
    box('rear_quarter_glass', 'glass', [s.cabRear + post, s.belt, s.cabSide - 0.03], [doorRear, s.cabRoof, s.cabSide - 0.01]),
    box('front_quarter', 'paint', [doorFront, s.deck, s.cabSide - 0.04], [s.cabFront - post, s.belt, s.cabSide]),
    box('front_quarter_glass', 'glass', [doorFront, s.belt, s.cabSide - 0.03], [s.cabFront - post, s.cabRoof, s.cabSide - 0.01]),
    box('console', 'trim', [-0.55, s.deck + 0.05, 0.3], [-0.3, s.deck + 0.55, 0.45]),
  ]), { paint: s.paint, floor: 'rubber-black', trim: 'plastic-black', glass: 'glass-clear' }) + { title: 'Bulldozer cab' },
  m.cabDoor('bulldozer_cab_door', 45, [doorRear, doorFront], [s.deck + 0.05, s.belt, s.cabRoof - 0.06, s.cabRoof], s.cabSide, s.paint) + { title: 'Bulldozer cab door' },
  k.compound('bulldozer_windscreen', 22, [
    box('glass', 'glass', [s.cabFront - 0.045, s.deck + 0.45, -s.cabSide + post], [s.cabFront - 0.015, s.cabRoof, s.cabSide - post]),
  ], { glass: 'glass-clear' }) + { title: 'Bulldozer windscreen' },
  k.compound('bulldozer_blade', 2400,
    k.arc('moldboard', 'paint', blade.cx, blade.cy, blade.radius - 0.04, blade.radius, 180 - blade.sweep, 180 + blade.sweep, 6, [-blade.halfWidth, blade.halfWidth]) + [
      box('cutting_edge', 'edge', [lip - 0.03, 0, -blade.halfWidth], [lip + 0.06, 0.12, blade.halfWidth]),
      box('upper_beam', 'paint', [blade.back, 0.9, -1.5], [blade.back + blade.depth, 1.12, 1.5]),
      box('lower_beam', 'paint', [blade.back, 0.22, -1.5], [blade.back + blade.depth, 0.44, 1.5]),
    ] + [
      box('rib_%d' % i, 'paint', [blade.back, 0.44, ribs[i] - 0.03], [blade.back + blade.depth - 0.04, 0.9, ribs[i] + 0.03])
      for i in std.range(0, std.length(ribs) - 1)
    ] + bothSides([
      prism('end_plate', 'paint', bladeFace, [blade.halfWidth - 0.05, blade.halfWidth]),
      box('arm_ear_inner', 'paint', [blade.back - 0.16, 0.18, arm.z[0] - ear], [blade.back, 0.5, arm.z[0]]),
      box('arm_ear_outer', 'paint', [blade.back - 0.16, 0.18, arm.z[1]], [blade.back, 0.5, arm.z[1] + ear]),
      box('lift_ear_inner', 'paint', [blade.back - 0.08, 0.98, lift.z[0] - ear], [blade.back, 1.26, lift.z[0]]),
      box('lift_ear_outer', 'paint', [blade.back - 0.08, 0.98, lift.z[1]], [blade.back, 1.26, lift.z[1] + ear]),
    ] + clevis('tilt', [blade.back - 0.08, blade.back], [tilt.pin[1] - 0.12, tilt.pin[1] + 0.12])),
    { paint: s.paint, edge: 'steel-grey' }) + { title: 'Bulldozer blade' },
  k.compound('bulldozer_push_arm', 420, [
    k.bar('arm', 'paint', arm.pivot, arm.end, 0.26, arm.z),
    m.axleDisc('trunnion', 'steel', arm.pivot[0], arm.pivot[1], 0.1, [s.trackZ + track.frame('bulldozer_track').halfWidth, arm.z[0]]),
  ] + clevis('tilt', [tilt.foot[0] - 0.08, tilt.foot[0] + 0.08], [armY(tilt.foot[0]), tilt.foot[1] + 0.08]),
  { paint: s.paint, steel: 'paint-charcoal' }) + { title: 'Bulldozer push arm' },
  k.compound('bulldozer_lift_cylinder', 110, [
    k.bar('barrel', 'dark', lift.foot, [2.1, 1.42], 0.2, lift.z),
    k.bar('rod', 'bright', [2.04, 1.46], lift.pin, 0.08, [lift.z[0] + 0.06, lift.z[1] - 0.06]),
    m.axleDisc('pin', 'bright', lift.pin[0], lift.pin[1], 0.04, lift.z, 12),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }) + { title: 'Bulldozer lift cylinder' },
  k.compound('bulldozer_tilt_cylinder', 100, [
    m.axleDisc('foot_pin', 'bright', tilt.foot[0], tilt.foot[1], 0.04, arm.z, 12),
    k.bar('barrel', 'dark', tilt.foot, along(0.55), 0.18, arm.z),
    k.bar('rod', 'bright', along(0.5), tilt.pin, 0.08, [arm.z[0] + 0.04, arm.z[1] - 0.04]),
    m.axleDisc('pin', 'bright', tilt.pin[0], tilt.pin[1], 0.04, arm.z, 12),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }) + { title: 'Bulldozer tilt cylinder' },
  // A screw in the middle sets the blade's pitch, so the brace is a tube in two halves round a threaded rod.
  k.compound('bulldozer_tilt_brace', 70, [
    m.axleDisc('foot_pin', 'bright', tilt.foot[0], tilt.foot[1], 0.04, arm.z, 12),
    k.bar('tube_rear', 'dark', tilt.foot, along(0.42), 0.12, [arm.z[0] + 0.02, arm.z[1] - 0.02]),
    k.bar('screw', 'bright', along(0.4), along(0.6), 0.07, [arm.z[0] + 0.045, arm.z[1] - 0.045]),
    k.bar('tube_front', 'dark', along(0.58), tilt.pin, 0.12, [arm.z[0] + 0.02, arm.z[1] - 0.02]),
    m.axleDisc('pin', 'bright', tilt.pin[0], tilt.pin[1], 0.04, arm.z, 12),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }) + { title: 'Bulldozer tilt brace' },
  k.compound('bulldozer_ripper', 900, [
    box('mount', 'steel', [ripper.mount[0], 0.42, -0.5], [ripper.mount[1], 1.42, 0.5]),
    box('beam', 'paint', [ripper.beam[0], 0.55, -1.1], [ripper.beam[1], ripper.top, 1.1]),
  ] + bothSides([
    k.bar('upper_link', 'steel', [ripper.mount[0] + 0.05, 1.0], [ripper.beam[1] - 0.07, 1.0], 0.14, [0.4, 0.5]),
    k.bar('lower_link', 'steel', [ripper.mount[0] + 0.05, 0.6], [ripper.beam[1] - 0.07, 0.65], 0.14, [0.4, 0.5]),
  ]), { paint: s.paint, steel: 'paint-charcoal' }) + { title: 'Bulldozer ripper' },
  // A shank is pinned in its pocket in the beam, so one worn or broken is drawn out and swapped on its own.
  k.compound('bulldozer_ripper_shank', 120, [
    k.bar('shank', 'steel', [shankX + 0.02, 1.25], [shankX - 0.06, 0.32], 0.3, [-0.05, 0.05], 0.24),
    k.bar('foot', 'steel', [shankX - 0.06, 0.32], [shankX + 0.14, 0.12], 0.2, [-0.05, 0.05], 0.1),
    k.bar('tip', 'tip', [shankX + 0.1, 0.15], [shankX + 0.22, 0.08], 0.08, [-0.04, 0.04]),
  ], { steel: 'paint-charcoal', tip: 'steel-grey' }) + { title: 'Bulldozer ripper shank' },
  // Its eyes bear on the mount's back and the beam's front, where their pins run.
  k.compound('bulldozer_ripper_cylinder', 60, [
    m.axleDisc('foot_eye', 'dark', ripper.mount[0] - 0.06, 1.36, 0.06, [0.24, 0.38], 12),
    k.bar('barrel', 'dark', [ripper.mount[0] - 0.06, 1.36], [ripper.mount[0] - 0.42, 1.2], 0.18, [0.24, 0.38]),
    k.bar('rod', 'bright', [ripper.mount[0] - 0.38, 1.21], [ripper.beam[1] + 0.05, ripper.top - 0.03], 0.07, [0.28, 0.34]),
    m.axleDisc('rod_eye', 'bright', ripper.beam[1] + 0.05, ripper.top - 0.03, 0.05, [0.28, 0.34], 12),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }) + { title: 'Bulldozer ripper cylinder' },
] + track.classRows('crawler_heavy') + track.trackRows('bulldozer_track'))
