local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = import 'cab_over_field_car.spec.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local id = 'cab_over_field_car';
local finish = { paint: 'paint-olive', frame: 'steel-parkerized', dark: 'steel-spall-black', trim: 'paint-charcoal', glass: 'glass-clear' };
// Handles, hinges and lamps stay inside the skin so the body is as wide as the reference.
local shoulder = s.archTop - s.archChamfer;
local crown = s.archBase - s.archChamfer;
local sidePanel(name, c, x0, x1) = [
  box(name + '_aft', 'paint', [x0, s.sill, s.panelIn], [c - s.archBase, s.archTop, s.panel]),
  box(name + '_fore', 'paint', [c + s.archBase, s.sill, s.panelIn], [x1, s.archTop, s.panel]),
] + t.archCorners(name + '_corner', 'paint', c - s.archBase, c + s.archBase, s.archTop, s.archChamfer, s.panelIn, s.panel);
local rim(name, slot, c, w, z) = [
  box(name + '_head', slot, [c - crown - w, s.archTop, z[0]], [c + crown + w, s.archTop + w, z[1]]),
  box(name + '_jamb_aft', slot, [c - s.archBase - w, s.sill, z[0]], [c - s.archBase, shoulder, z[1]]),
  box(name + '_jamb_fore', slot, [c + s.archBase, s.sill, z[0]], [c + s.archBase + w, shoulder, z[1]]),
  prism(name + '_chamfer_aft', slot, [[c - s.archBase - w, shoulder], [c - s.archBase, shoulder], [c - crown, s.archTop], [c - crown - w, s.archTop]], z),
  prism(name + '_chamfer_fore', slot, [[c + s.archBase, shoulder], [c + s.archBase + w, shoulder], [c + crown + w, s.archTop], [c + crown, s.archTop]], z),
];
// The wall inboard of the tyre, so the arch shows a liner rather than the cab.
local well(name, c) = [
  box(name + '_liner', 'trim', [c - s.archBase - 0.04, s.sill, s.wellOut], [c + s.archBase + 0.04, s.archTop + 0.04, s.wellIn]),
] + rim(name + '_well', 'trim', c, 0.04, [s.wellIn, s.panelIn]);
local hingeLow = s.sill + 0.12;
local doorFrame = s.waist + 0.12;
local doorHead = s.roofUnder - 0.12;
local frontDoor(name) =
  local x0 = s.doorRear;
  local x1 = s.doorFront;
  k.compound(name, 55, [
    box('skin', 'paint', [x0, s.sill, s.panelIn], [x1, s.waist, s.panel]),
    box('window_sill', 'paint', [x0, s.waist, s.panelIn], [x1, doorFrame, s.panel]),
    box('window_head', 'paint', [x0, doorHead, s.panelIn], [x1, s.roofUnder, s.panel]),
    box('stile_rear', 'paint', [x0, doorFrame, s.panelIn], [x0 + 0.08, doorHead, s.panel]),
    box('stile_front', 'paint', [x1 - 0.08, doorFrame, s.panelIn], [x1, doorHead, s.panel]),
    box('glass', 'glass', [x0 + 0.08, doorFrame, s.panelIn + 0.005], [x1 - 0.08, doorHead, s.panel - 0.005]),
    box('handle', 'dark', [x0 + 0.1, s.waist - 0.2, s.panel - 0.03125], [x0 + 0.26, s.waist - 0.14, s.panel]),
    box('hinge_top', 'dark', [x1 - 0.1, s.waist - 0.2, s.panel - 0.03125], [x1, s.waist - 0.12, s.panel]),
    box('hinge_low', 'dark', [x1 - 0.1, hingeLow, s.panel - 0.03125], [x1, hingeLow + 0.08, s.panel]),
  ], finish, { hinge_a: ['skin', [1, 0.2, 1]], hinge_b: ['skin', [1, 0.8, 1]] });
// The near leaf, hinged at the side; the far leaf is its reflection.
local rearDoorSill = s.rearFloor + 0.04;
local rearDoorGlassLow = 1.55;
local rearDoorGlassHigh = 1.95;
local rearDoorTop = s.roofUnder - 0.055;
local rearDoor(name) =
  local x0 = s.rear;
  local x1 = s.rear + 0.04;
  k.compound(name, 32, [
    box('skin', 'paint', [x0, rearDoorSill, 0.005], [x1, rearDoorGlassLow - 0.1, s.panelIn]),
    box('window_sill', 'paint', [x0, rearDoorGlassLow - 0.1, 0.005], [x1, rearDoorGlassLow, s.panelIn]),
    box('window_head', 'paint', [x0, rearDoorGlassHigh, 0.005], [x1, rearDoorTop, s.panelIn]),
    box('stile_inner', 'paint', [x0, rearDoorGlassLow, 0.005], [x1, rearDoorGlassHigh, 0.07]),
    box('stile_outer', 'paint', [x0, rearDoorGlassLow, 0.73], [x1, rearDoorGlassHigh, s.panelIn]),
    box('glass', 'glass', [x0 + 0.005, rearDoorGlassLow, 0.07], [x1 - 0.005, rearDoorGlassHigh, 0.73]),
    box('handle', 'dark', [x0, 1.0, 0.06], [x0 + 0.03125, 1.2, 0.12]),
    box('hinge_top', 'dark', [x0, 1.7, 0.74], [x0 + 0.03125, 1.78, s.panelIn]),
    box('hinge_low', 'dark', [x0, 0.9, 0.74], [x0 + 0.03125, 0.98, s.panelIn]),
  ], finish, { hinge_a: ['skin', [0, 0.2, 1]], hinge_b: ['skin', [0, 0.8, 1]] });
local lugCount = 24;
local lugs = [
  local a = 2 * std.pi * i / lugCount;
  local d = 0.035 / 0.431;
  local at(r, t) = [r * std.cos(t), r * std.sin(t)];
  prism('lug_' + i, 'tyre', [at(0.395, a - d), at(0.431, a - d), at(0.431, a + d), at(0.395, a + d)], if i % 2 == 0 then [-0.14, 0.01] else [-0.01, 0.14])
  for i in std.range(0, lugCount - 1)
];
local half = s.tyreWidth / 2;
local windscreenPane(zs) = prism('pane', 'glass', [[s.windscreenFoot - 0.03, s.waist + 0.02], [s.windscreenFoot, s.waist + 0.02], [s.windscreenTop, 2.05], [s.windscreenTop - 0.03, 2.05]], zs);
local grilleSlats = 7;
taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, [
  k.compound(id + '_wheel', 40, [
    k.turned('tyre', 'tyre', 'z', [[-half, s.rimRadius], [-half, 0.37], [-0.11, 0.411], [0.11, 0.411], [half, 0.37], [half, s.rimRadius], [-half, s.rimRadius]]) + { sides: 24 },
    k.turned('rim', 'rim', 'z', k.disc(s.rimRadius, -0.12, 0.12)) + { sides: 24 },
    k.turned('boss', 'boss', 'z', k.disc(0.09, -0.15, 0.15)) + { sides: 12 },
  ] + lugs, { tyre: 'rubber-black', rim: 'paint-olive', boss: 'steel-spall-black' }, { hub: ['rim', [0.5, 0.5, 0.5]] }),
  k.compound(id + '_axle', 115, [
    box('diff', 'steel', [-0.12, s.hub - 0.1, -0.16], [0.12, s.hub + 0.12, 0.16]),
    box('beam', 'steel', [-0.04, s.hub - 0.04, -0.62], [0.04, s.hub + 0.04, 0.62]),
  ] + bothSides([
    box('knuckle', 'steel', [-0.08, s.hub - 0.08, 0.5], [0.08, s.hub + 0.08, 0.62]),
    box('leaf_spring', 'steel', [-0.5, s.hub + 0.04, 0.38], [0.5, s.hub + 0.07, 0.44]),
  ]), { steel: 'steel-grey' }),
  k.compound(id + '_transfer_case', 45, [box('case', 'casting', [-0.2, 0, -0.18], [0.2, 0.36, 0.18])], { casting: 'steel-grey' }),
  k.compound(id + '_front_prop_shaft', 9, [k.turned('tube', 'steel', 'x', k.disc(0.04, -0.58, 0.58))], { steel: 'steel-grey' }),
  k.compound(id + '_rear_prop_shaft', 5, [k.turned('tube', 'steel', 'x', k.disc(0.04, -0.21, 0.21))], { steel: 'steel-grey' }),
  k.compound(id + '_frame', s.frameMass, [
    box('cross_' + i, 'frame', [[-1.95, 0.45, 0.95, 1.6][i] - 0.04, s.railLow, -s.railZ - 0.08], [[-1.95, 0.45, 0.95, 1.6][i] + 0.04, s.railTop, s.railZ + 0.08])
    for i in std.range(0, 3)
  ] + [
    box('rear_bumper', 'frame', [s.rear, s.sill - 0.1, -0.78], [s.rear + 0.07, s.sill + 0.02, 0.78]),
  ] + bothSides([
    box('rail', 'frame', [s.rear + 0.07, s.railLow, s.railZ], [s.nose - 0.04, s.railTop, s.railZ + 0.08]),
  ]), finish),
  k.compound(id + '_front_bumper', 28, [
    box('bar', 'frame', [s.nose, s.sill - 0.08, -s.panel], [s.front, s.sill + 0.08, s.panel]),
  ], finish),
  k.compound(id + '_hull', s.hullMass, bothSides(
    sidePanel('rear_panel', s.rearAxle, s.rear, s.doorRear)
    + sidePanel('front_panel', s.frontAxle, s.doorFront, s.nose)
    + well('rear', s.rearAxle)
    + well('front', s.frontAxle)
    + [
      box('belt_aft', 'paint', [s.rear, s.archTop, s.panelIn], [s.doorRear, s.waist, s.panel]),
      box('belt_fore', 'paint', [s.doorFront, s.archTop, s.panelIn], [s.nose, s.waist, s.panel]),
      // The rear quarter window.
      box('quarter_sill', 'paint', [s.rear, s.waist, s.panelIn], [s.doorRear, 1.45, s.panel]),
      box('quarter_head', 'paint', [s.rear, 1.85, s.panelIn], [s.doorRear, s.roofUnder, s.panel]),
      box('quarter_aft', 'paint', [s.rear, 1.45, s.panelIn], [-1.45, 1.85, s.panel]),
      box('quarter_fore', 'paint', [-0.45, 1.45, s.panelIn], [s.doorRear, 1.85, s.panel]),
      box('quarter_glass', 'glass', [-1.45, 1.45, s.panelIn + 0.005], [-0.45, 1.85, s.panel - 0.005]),
      prism('front_upper', 'paint', [[s.doorFront, s.waist], [s.windscreenFoot, s.waist], [s.windscreenTop - 0.005, s.roofUnder], [s.doorFront, s.roofUnder]], [s.panelIn, s.panel]),
      box('rear_lower', 'paint', [s.rear, s.sill, s.panelIn], [s.rear + 0.04, rearDoorSill, s.panel]),
      // The cab floor stands on risers above the rear load floor, clear of the gearbox.
      box('floor_side', 'trim', [s.doorRear + 0.4, s.floorUnder, 0.3], [s.nose - 0.04, s.floor, s.panelIn]),
      box('riser', 'trim', [s.doorRear + 0.36, s.rearFloor, 0.16], [s.doorRear + 0.4, s.floorUnder, s.panelIn]),
    ]
  ) + [
    box('rear_sill', 'dark', [s.rear, s.sill, -s.panel], [s.rear + 0.04, s.sill + 0.02, s.panel]),
    box('rear_header', 'paint', [s.rear, rearDoorTop, -s.panel], [s.rear + 0.04, s.roofUnder, s.panel]),
    box('rear_floor', 'trim', [s.rear + 0.04, s.railTop, -s.panelIn], [s.doorRear + 0.36, s.rearFloor, s.panelIn]),
    box('floor_aft', 'trim', [s.doorRear + 0.4, s.floorUnder, -0.3], [s.coverBack, s.floor, 0.3]),
    box('floor_fore', 'trim', [s.coverFront, s.floorUnder, -0.3], [s.nose - 0.04, s.floor, 0.3]),
    box('roof', 'paint', [s.rear, s.roofUnder, -s.panel], [s.windscreenTop + 0.03, s.roof, s.panel]),
    box('windscreen_head', 'paint', [s.windscreenTop - 0.075, 2.05, -s.panel], [s.windscreenTop + 0.03, s.roofUnder, s.panel]),
    // The flat nose, with an opening for the grille.
    box('face_low', 'paint', [s.nose - 0.04, s.sill, -s.panel], [s.nose, 0.6, s.panel]),
    box('face_high', 'paint', [s.nose - 0.04, 0.94, -s.panel], [s.nose, s.waist, s.panel]),
    box('face_near', 'paint', [s.nose - 0.04, 0.6, 0.4], [s.nose, 0.94, s.panel]),
    box('face_far', 'paint', [s.nose - 0.04, 0.6, -s.panel], [s.nose, 0.94, -0.4]),
    box('windscreen_sill', 'paint', [s.windscreenFoot - 0.08, s.waist, -s.panelIn], [s.nose, s.waist + 0.02, s.panelIn]),
  ], finish),
  k.compound(id + '_grille', 8, [
    box('backing', 'dark', [s.nose - 0.04, 0.6, -0.4], [s.nose, 0.94, 0.4]),
  ] + [
    box('bar_' + i, 'paint', [s.nose, 0.62, (i - 3) * 0.12 - 0.03125], [s.nose + 0.03125, 0.92, (i - 3) * 0.12 + 0.03125])
    for i in std.range(0, grilleSlats - 1)
  ], finish),
  k.compound(id + '_headlamp', 1.5, [
    box('pod', 'dark', [0, -0.11, -0.11], [0.03125, 0.11, 0.11]),
    k.turned('lens', 'lens', 'x', k.disc(0.08, 0.03125, 0.0625)) + { sides: 16 },
  ], { dark: 'steel-spall-black', lens: 'plastic-frosted' }),
  frontDoor(id + '_front_door'),
  rearDoor(id + '_rear_door'),
  k.compound(id + '_windscreen', 24, [
    windscreenPane(side.z) + { id: 'pane_' + side.n }
    for side in [{ n: 'near', z: [0.04, 0.78] }, { n: 'far', z: [-0.78, -0.04] }]
  ] + [
    box('centre_post', 'paint', [s.windscreenTop + 0.0, 1.3, -0.04], [s.windscreenFoot - 0.03, 2.05, 0.04]),
  ], finish),
  k.compound(id + '_dashboard', 15, [
    box('panel', 'trim', [1.74, s.floor, -s.panelIn], [s.windscreenFoot - 0.005, 1.3, s.panelIn]),
    box('column', 'dark', [1.66, 1.6, -s.seatZ - 0.03], [1.76, 1.64, -s.seatZ + 0.03]),
    box('column_foot', 'dark', [1.7, 1.3, -s.seatZ - 0.03], [1.76, 1.64, -s.seatZ + 0.03]),
  ], finish),
  k.compound(id + '_engine_cover', 14, [
    box('top', 'trim', [s.coverBack, s.coverTop - 0.04, -s.coverHalf], [s.coverFront, s.coverTop, s.coverHalf]),
    box('back', 'trim', [s.coverBack, s.floor, -s.coverHalf], [s.coverBack + 0.04, s.coverTop - 0.04, s.coverHalf]),
    box('front', 'trim', [s.coverFront - 0.04, s.floor, -s.coverHalf], [s.coverFront, s.coverTop - 0.04, s.coverHalf]),
  ] + bothSides([
    box('side', 'trim', [s.coverBack, s.floor, s.coverHalf - 0.04], [s.coverFront, s.coverTop - 0.04, s.coverHalf]),
  ]), finish),
])
