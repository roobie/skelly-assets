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
// The moldboard curls forward round a centre ahead of the blade, its cutting edge on the ground.
local blade = { cx: 3.6, cy: 0.72, radius: 1.0, halfWidth: 1.63, back: 2.42 };
local bladeFace = [
  [blade.cx + blade.radius * std.cos(k.rad(135 + 15 * i)), blade.cy + blade.radius * std.sin(k.rad(135 + 15 * i))]
  for i in std.range(0, 6)
];
local ribs = [-1.2, -0.5, 0, 0.5, 1.2];
local ripper = { beam: [-2.95, -2.65], mount: [-2.05, -1.9] };
taxonomy.inherit({ tags: { 'vehicle-body': ['plant'] } }, [
  k.compound('bulldozer_mainframe', 3000, [
    box('belly_guard', 'steel', [-0.2, 0.36, -0.55], [1.88, 0.42, 0.55]),
    box('front_cross', 'steel', [1.8, 0.42, -0.38], [1.88, s.frameTop, 0.38]),
    box('equaliser_bar', 'steel', [1.42, 0.48, -0.78], [1.56, 0.62, 0.78]),
  ] + bothSides([
    box('rail', 'steel', [ripper.mount[1], 0.42, 0.38], [1.88, s.frameTop, 0.55]),
    k.turned('pivot_shaft', 'steel', 'z', k.disc(0.1, 0.55, 0.78), [-0.6, 0.55, 0]) + { sides: 12 },
    box('lift_post', 'steel', [1.5, s.frameTop, s.hoodSide], [1.7, 1.88, s.hoodSide + 0.04]),
  ]), { steel: 'paint-charcoal' }),
  k.compound('bulldozer_final_drive', 450, [
    m.axleDisc('housing', 'steel', -0.85, 1.0, 0.36, [0.55, 0.77]),
  ], { steel: 'paint-charcoal' }),
  k.compound('bulldozer_hood', 400, [
    prism('top', 'paint', [[s.hoodRear, s.hoodTop - skin], [s.hoodFront, s.noseTop - skin], [s.hoodFront, s.noseTop], [s.hoodRear, s.hoodTop]], [-s.hoodSide, s.hoodSide]),
    box('bulkhead', 'paint', [s.hoodRear, s.frameTop, -s.hoodSide], [s.hoodRear + 0.05, s.hoodTop - skin, s.hoodSide]),
    box('grille', 'grille', [s.hoodFront, s.frameTop, -s.hoodSide], [s.hoodFront + 0.1, s.noseTop, s.hoodSide]),
  ] + [
    box('grille_bar_%d' % i, 'paint', [s.hoodFront + 0.1, 1.08 + 0.16 * i, -0.46], [s.hoodFront + 0.12, 1.12 + 0.16 * i, 0.46])
    for i in std.range(0, 4)
  ], { paint: s.paint, grille: 'paint-charcoal' }),
  // An engine side panel lifts off for service, so it is a part of its own a scavenger can take.
  k.compound('bulldozer_engine_panel', 30, [
    prism('skin', 'paint', [[s.hoodRear + 0.05, s.frameTop], [s.hoodFront, s.frameTop], [s.hoodFront, s.noseTop - skin], [s.hoodRear + 0.05, s.hoodTop - skin]], [s.hoodSide - skin, s.hoodSide]),
  ] + [
    box('louvre_%d' % i, 'trim', [0.6, 1.3 + 0.1 * i, s.hoodSide], [1.5, 1.33 + 0.1 * i, s.hoodSide + 0.01])
    for i in std.range(0, 3)
  ], { paint: s.paint, trim: 'paint-charcoal' }),
  k.compound('bulldozer_deck', 500, [
    box('platform', 'paint', [-1.95, s.deck - 0.05, -1.32], [s.cabFront, s.deck, 1.32]),
  ] + bothSides([
    box('lamp_bracket', 'trim', [-1.95, 1.44, 0.92], [-1.9, s.deck - 0.05, 1.08]),
  ]), { paint: s.paint, trim: 'paint-charcoal' }),
  k.compound('bulldozer_fuel_tank', 160, [
    box('tank', 'steel', [-1.9, s.frameTop, -0.55], [s.cabRear - 0.02, s.deck - 0.05, 0.55]),
  ], { steel: 'paint-charcoal' }),
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
  ]), { paint: s.paint, floor: 'rubber-black', trim: 'plastic-black', glass: 'glass-clear' }),
  m.cabDoor('bulldozer_cab_door', 45, [doorRear, doorFront], [s.deck + 0.05, s.belt, s.cabRoof - 0.06, s.cabRoof], s.cabSide, s.paint),
  k.compound('bulldozer_windscreen', 22, [
    box('glass', 'glass', [s.cabFront - 0.045, s.deck + 0.45, -s.cabSide + post], [s.cabFront - 0.015, s.cabRoof, s.cabSide - post]),
  ], { glass: 'glass-clear' }),
  k.compound('bulldozer_blade', 2400,
    k.arc('moldboard', 'paint', blade.cx, blade.cy, blade.radius - 0.04, blade.radius, 135, 225, 6, [-blade.halfWidth, blade.halfWidth]) + [
      box('cutting_edge', 'edge', [2.86, 0, -blade.halfWidth], [2.95, 0.12, blade.halfWidth]),
      box('upper_beam', 'paint', [blade.back, 0.9, -1.5], [2.68, 1.12, 1.5]),
      box('lower_beam', 'paint', [blade.back, 0.22, -1.5], [2.68, 0.44, 1.5]),
    ] + [
      box('rib_%d' % i, 'paint', [blade.back, 0.44, ribs[i] - 0.03], [2.64, 0.9, ribs[i] + 0.03])
      for i in std.range(0, std.length(ribs) - 1)
    ] + bothSides([
      prism('end_plate', 'paint', bladeFace, [blade.halfWidth - 0.05, blade.halfWidth]),
      box('arm_ear', 'paint', [2.3, 0.22, 1.22], [blade.back, 0.5, 1.42]),
      box('lift_ear_inner', 'paint', [2.34, 0.98, 0.52], [blade.back, 1.26, 0.56]),
      box('lift_ear_outer', 'paint', [2.34, 0.98, 0.76], [blade.back, 1.26, 0.8]),
    ]), { paint: s.paint, edge: 'steel-grey' }),
  k.compound('bulldozer_push_arm', 420, [
    k.bar('arm', 'paint', [-0.1, 0.47], [blade.back, 0.32], 0.26, [1.24, 1.4]),
    m.axleDisc('trunnion', 'steel', -0.1, 0.47, 0.14, [1.22, 1.42]),
  ], { paint: s.paint, steel: 'paint-charcoal' }),
  k.compound('bulldozer_lift_cylinder', 110, [
    k.bar('barrel', 'dark', [1.6, 1.78], [2.1, 1.42], 0.2, [0.56, 0.76]),
    k.bar('rod', 'bright', [2.04, 1.46], [blade.back, 1.18], 0.08, [0.62, 0.7]),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }),
  k.compound('bulldozer_ripper', 900, [
    box('mount', 'steel', [ripper.mount[0], 0.42, -0.5], [ripper.mount[1], 1.42, 0.5]),
    box('beam', 'paint', [ripper.beam[0], 0.55, -1.1], [ripper.beam[1], 1.1, 1.1]),
  ] + bothSides([
    k.bar('upper_link', 'steel', [-2.0, 1.0], [-2.72, 1.0], 0.14, [0.4, 0.5]),
    k.bar('lower_link', 'steel', [-2.0, 0.6], [-2.72, 0.65], 0.14, [0.4, 0.5]),
  ]), { paint: s.paint, steel: 'paint-charcoal' }),
  // A shank is pinned in its pocket in the beam, so one worn or broken is drawn out and swapped on its own.
  k.compound('bulldozer_ripper_shank', 120, [
    k.bar('shank', 'steel', [-2.78, 1.25], [-2.86, 0.32], 0.3, [-0.05, 0.05], 0.24),
    k.bar('foot', 'steel', [-2.86, 0.32], [-2.66, 0.12], 0.2, [-0.05, 0.05], 0.1),
    k.bar('tip', 'tip', [-2.7, 0.15], [-2.58, 0.08], 0.08, [-0.04, 0.04]),
  ], { steel: 'paint-charcoal', tip: 'steel-grey' }),
  k.compound('bulldozer_ripper_cylinder', 60, [
    k.bar('barrel', 'dark', [-1.95, 1.38], [-2.42, 1.19], 0.18, [0.24, 0.38]),
    k.bar('rod', 'bright', [-2.38, 1.2], [-2.72, 1.07], 0.07, [0.28, 0.34]),
  ], { dark: 'paint-charcoal', bright: 'steel-stainless' }),
] + track.classRows('crawler_heavy') + track.trackRows('bulldozer_track'))
