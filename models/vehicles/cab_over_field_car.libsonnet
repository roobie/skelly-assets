local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local s = import 'cab_over_field_car.spec.libsonnet';
local box = k.box;
local prism = k.prism;
local bothSides = k.bothSides;
local id = 'cab_over_field_car';
local finish = { paint: 'paint-olive', frame: 'steel-spall-black', dark: 'steel-spall-black', trim: 'paint-charcoal', liner: 'steel-spall-black', glass: 'glass-clear', seal: 'rubber-black', seam: 'steel-spall-black' };

// Edges are functions of height, so a raked or diagonal edge draws as one piece.
local at(x) = function(y) x;
local line(p, q) = function(y) p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
local plus(edge, d) = function(y) edge(y) + d;
local frontLine = line([s.cowl, s.belt], [s.head, s.drip]);
local rearLine = line([s.rear, s.belt], [s.rearDrip, s.drip]);
local section(name, slot, aft, fore, low, high, z) = prism(name, slot, [[aft(low), low], [fore(low), low], [fore(high), high], [aft(high), high]], z);

local outerZ(y) = if y <= s.belt then s.side else s.side - (s.side - s.eaves) * (y - s.belt) / (s.drip - s.belt);
// A prism can't lean across z and rake along x at once, so a leaning panel is stepped in bands.
local leaning(name, slot, aft, fore, low, high, inset=0, depth=s.skin) =
  local bandEdges = [s.belt + (s.drip - s.belt) * i / s.leanBands for i in std.range(0, s.leanBands)];
  local edges = [low] + [e for e in bandEdges if e > low && e < high] + [high];
  [
    local z = outerZ((edges[i] + edges[i + 1]) / 2) - inset;
    section(name + '_' + i, slot, aft, fore, edges[i], edges[i + 1], [z - depth, z])
    for i in std.range(0, std.length(edges) - 2)
  ];
local flat(name, points) = prism(name, 'paint', points, [s.side - s.skin, s.side]);
local rect(name, x0, x1, y0, y1) = box(name, 'paint', [x0, y0, s.side - s.skin], [x1, y1, s.side]);

// A panel line is painted into its own panel's outer voxels, drawn after the skin so it wins them.
local cord(name, a, b) = k.bar(name, 'seam', a, b, s.voxel, [s.side - s.voxel, s.side]);
local cords(name, points) = [cord(name + '_' + i, points[i], points[i + 1]) for i in std.range(0, std.length(points) - 2)];
local leaningCord(name, edge, low, high) = leaning(name, 'seam', edge, plus(edge, s.voxel), low, high, 0, s.voxel);

local glazing(name, aft, fore, low, high, seal=s.seal) =
  leaning(name + '_seal_low', 'seal', aft, fore, low, low + seal)
  + leaning(name + '_seal_high', 'seal', aft, fore, high - seal, high)
  + leaning(name + '_seal_aft', 'seal', aft, plus(aft, seal), low + seal, high - seal)
  + leaning(name + '_seal_fore', 'seal', plus(fore, -seal), fore, low + seal, high - seal)
  + leaning(name + '_glass', 'glass', plus(aft, seal), plus(fore, -seal), low + seal, high - seal, 0.005, 0.03);
// A panel from the belt to the drip with one window in it.
local windowed(name, aft, fore, windowAft, windowFore, seal=s.seal) =
  leaning(name + '_under', 'paint', aft, fore, s.belt, s.windowLow)
  + leaning(name + '_over', 'paint', aft, fore, s.windowHigh, s.drip)
  + leaning(name + '_aft', 'paint', aft, windowAft, s.windowLow, s.windowHigh)
  + leaning(name + '_fore', 'paint', windowFore, fore, s.windowLow, s.windowHigh)
  + glazing(name, windowAft, windowFore, s.windowLow, s.windowHigh, seal);

local strap(name, fore, y) = box(name, 'dark', [fore - 0.2, y, s.side], [fore, y + 0.05, s.side + s.voxel]);
local handle(name, x) = box(name, 'dark', [x - 0.2, s.belt - 0.08, s.side], [x, s.belt - 0.04, s.side + s.voxel]);

local d = s.cabDoor;
local doorFront(y) = frontLine(y) - s.skin;
local cabDoor = k.compound(id + '_cab_door', s.mass.cabDoor, [
  box('skin', 'paint', [d.stepAft, d.step, s.side - s.skin], [d.fore, s.belt, s.side]),
  flat('fore', [[d.foot, d.low], [d.fore, d.low], [d.fore, d.step], [d.stepFore, d.step]]),
  flat('aft', [[d.rear, d.stepAftTop], [d.stepAft, d.step], [d.stepAft, s.belt], [d.rear, s.belt]]),
  box('split', 'seal', [d.split - s.seal / 2, s.windowLow, s.side - 0.07], [d.split + s.seal / 2, s.windowHigh, s.side - 0.03]),
  strap('hinge_low', d.fore + 0.02, s.hinges.cab[0]),
  strap('hinge_high', d.fore + 0.02, s.hinges.cab[1]),
  handle('handle', d.rear + 0.3),
] + windowed('upper', at(d.rear), doorFront, at(d.rear + 0.05), plus(doorFront, -0.08))
  + cords('edge', [[d.fore, s.belt], [d.fore, d.low], [d.foot, d.low], [d.stepFore, d.step], [d.stepAft, d.step], [d.rear, d.stepAftTop], [d.rear, s.belt]])
  + leaningCord('rear_edge', at(d.rear), s.belt, s.drip),
  finish, { hinge_a: ['skin', [1, 0.2, 1]], hinge_b: ['skin', [1, 0.8, 1]] });

local e = s.sideDoor;
local sideDoor = k.compound(id + '_side_door', s.mass.sideDoor, [
  rect('skin', e.rear, e.fore, e.low, s.belt),
  strap('hinge_low', e.fore + 0.02, s.hinges.side[0]),
  strap('hinge_high', e.fore + 0.02, s.hinges.side[1]),
  handle('handle', e.rear + 0.3),
  box('rubbing_strip', 'trim', [e.strip[0], s.stripY - 0.02, s.side], [e.strip[1], s.stripY + 0.02, s.side + s.voxel]),
] + windowed('upper', at(e.rear), at(e.fore), at(e.window[0]), at(e.window[1]))
  + cords('edge', [[e.fore, s.belt], [e.fore, e.low], [e.rear, e.low], [e.rear, s.belt]])
  + leaningCord('fore_edge', at(e.fore - s.voxel), s.belt, s.drip)
  + leaningCord('rear_edge', at(e.rear), s.belt, s.drip),
  finish, { hinge_a: ['skin', [1, 0.2, 1]], hinge_b: ['skin', [1, 0.8, 1]] });

local rd = s.rearDoor;
local skinBack(edge) = plus(edge, s.skin);
local backAt(y) = if y <= s.belt then s.rear else rearLine(y);
local rearSection(name, slot, low, high, z) = section(name, slot, backAt, skinBack(backAt), low, high, z);
local rearDoor = k.compound(id + '_rear_door', s.mass.rearDoor, [
  rearSection('skin', 'paint', rd.low, s.belt, [-rd.half, rd.half]),
  rearSection('under_window', 'paint', s.belt, rd.windowLow, [-rd.half, rd.half]),
  rearSection('over_window', 'paint', rd.windowHigh, rd.top, [-rd.half, rd.half]),
  rearSection('glass', 'glass', rd.windowLow + s.seal, rd.windowHigh - s.seal, [-rd.half + rd.stile + s.seal, rd.half - rd.stile - s.seal]),
  rearSection('seal_low', 'seal', rd.windowLow, rd.windowLow + s.seal, [-rd.half + rd.stile, rd.half - rd.stile]),
  rearSection('seal_high', 'seal', rd.windowHigh - s.seal, rd.windowHigh, [-rd.half + rd.stile, rd.half - rd.stile]),
  rearSection('seam_low', 'seam', rd.low, rd.low + s.voxel, [-rd.half, rd.half]),
  rearSection('seam_high', 'seam', rd.top - s.voxel, rd.top, [-rd.half, rd.half]),
  box('hinge_low', 'dark', [s.rear - s.voxel, s.hinges.rear[0], -rd.half - 0.1], [s.rear, s.hinges.rear[0] + 0.05, -rd.half + 0.1]),
  box('hinge_high', 'dark', [s.rear - s.voxel, s.hinges.rear[1], -rd.half - 0.1], [s.rear, s.hinges.rear[1] + 0.05, -rd.half + 0.1]),
  box('handle', 'dark', [s.rear - s.voxel, 1.22, rd.half - 0.12], [s.rear, 1.42, rd.half - 0.07]),
] + bothSides([
  rearSection('stile', 'paint', rd.windowLow, rd.windowHigh, [rd.half - rd.stile, rd.half]),
  rearSection('seal_side', 'seal', rd.windowLow + s.seal, rd.windowHigh - s.seal, [rd.half - rd.stile - s.seal, rd.half - rd.stile]),
  rearSection('seam_side', 'seam', rd.low, rd.top, [rd.half - s.voxel, rd.half]),
]), finish, { hinge_a: ['skin', [0, 0.2, 0]], hinge_b: ['skin', [0, 0.8, 0]] });

// The trapezoid wall and roof inboard of the tyre, so an arch shows a liner rather than the cabin.
local wheelBox(name, a) = [
  prism(name + '_wall', 'liner', [a.aftBase, a.foreBase, a.foreHead, a.aftHead], [s.wellIn - s.skin, s.wellIn]),
  box(name + '_roof', 'liner', [a.aftHead[0], a.aftHead[1], s.wellIn], [a.foreHead[0], a.aftHead[1] + s.skin, s.side - s.skin]),
  k.bar(name + '_fore', 'liner', a.foreBase, a.foreHead, s.skin, [s.wellIn, s.side - s.skin]),
  k.bar(name + '_aft', 'liner', a.aftBase, a.aftHead, s.skin, [s.wellIn, s.side - s.skin]),
];
local fa = s.frontArch;
local ra = s.rearArch;
local armY(x0, a, b) = a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0]);
local pillarFoot = armY(d.rear, fa.aftBase, fa.aftHead);
local beltLow = s.belt - s.voxel / 2;

local hullSide = [
  // Ahead of the cab door and round the front arch.
  flat('corner_low', [[d.fore, fa.foreBase[1]], [s.nose, s.noseLow], [d.fore, s.noseLow]]),
  rect('corner', d.fore, s.nose, s.noseLow, s.belt),
  rect('sill_fore', fa.foreBase[0], d.fore, fa.foreBase[1], d.low),
  k.bar('arch_lip_fore', 'paint', [fa.foreBase[0] + 0.02, fa.foreBase[1] + 0.02], [fa.foreHead[0] + 0.02, fa.foreHead[1] + 0.02], 0.05, [s.side - s.skin, s.side]),
  rect('arch_lip_head', fa.aftHead[0], fa.foreHead[0], fa.aftHead[1], d.step),
  // The pillar between the two doors.
  rect('pillar_low', e.fore, fa.aftBase[0], s.sill, s.belt),
  flat('pillar_arch', [fa.aftBase, [d.rear, pillarFoot], [d.rear, s.belt], [fa.aftBase[0], s.belt]]),
  flat('pillar_nib', [[d.rear, pillarFoot], [d.stepAft, d.step - 0.035], [d.stepAft, d.step], [d.rear, d.stepAftTop]]),
  rect('sill_mid', e.rear, e.fore, s.sill, e.low),
  // Behind the side door and round the rear arch.
  rect('quarter_fore', ra.foreBase[0], e.rear, s.sill, s.belt),
  flat('quarter_arch_fore', [ra.foreBase, [ra.foreBase[0], s.belt], [ra.foreHead[0], s.belt], ra.foreHead]),
  rect('quarter_head', ra.aftHead[0], ra.foreHead[0], ra.aftHead[1], s.belt),
  flat('quarter_arch_aft', [ra.aftBase, ra.aftHead, [ra.aftHead[0], s.belt], [ra.aftBase[0], s.belt]]),
  rect('quarter_aft', s.rear, ra.aftBase[0], s.rearLow, s.belt),
  box('rubbing_strip', 'trim', [s.rearStrip[0], s.stripY - 0.02, s.side], [s.rearStrip[1], s.stripY + 0.02, s.side + s.voxel]),
] + leaning('a_post', 'paint', doorFront, frontLine, s.belt, s.drip)
  + windowed('pillar', at(e.fore), at(d.rear), at(s.pillarWindow[0]), at(s.pillarWindow[1]), 0.05)
  + leaning('quarter', 'paint', rearLine, at(e.rear), s.belt, s.drip)
  + leaningCord('corner_line', at(s.rearCorner), s.belt, s.drip)
  + std.flattenArrays([
    leaning('swage_' + i, 'paint', at(s.rearCorner + 0.06), at(e.rear - 0.06), s.swages[i], s.swages[i] + 0.04, -s.voxel, s.voxel)
    for i in std.range(0, std.length(s.swages) - 1)
  ])
  + wheelBox('front_box', fa)
  + wheelBox('rear_box', ra)
  + [
    // Floors step up over the front axle; the wheel boxes interrupt them at the sides.
    box('floor_aft_side', 'trim', [ra.foreBase[0], s.floorUnder, s.wellIn], [s.floorStep, s.rearFloor, s.side - s.skin]),
    box('floor_tail_side', 'trim', [s.rear, s.floorUnder, s.wellIn], [ra.aftBase[0], s.rearFloor, s.side - s.skin]),
    box('floor_flank', 'trim', [s.coverBack, s.floorUnder, s.coverHalf], [s.floorStep, s.rearFloor, s.wellIn]),
    box('cab_floor_flank', 'trim', [s.floorStep, s.cabFloorUnder, s.coverHalf], [s.coverFore, s.cabFloor, s.wellIn]),
    box('cab_floor_outer', 'trim', [s.floorStep, s.cabFloorUnder, s.wellIn], [0.85, s.cabFloor, s.side - s.skin]),
    box('step', 'trim', [s.floorStep - s.skin, s.rearFloor, s.coverHalf], [s.floorStep, s.cabFloorUnder, s.side - s.skin]),
    // The corner panels flanking the rear door.
    section('rear_corner_low', 'paint', backAt, skinBack(backAt), s.rearLow, s.belt, [rd.half, s.side - s.skin]),
    section('rear_corner_high', 'paint', backAt, skinBack(backAt), s.belt, s.drip, [rd.half, s.eaves]),
    section('cowl_side', 'paint', plus(frontLine, -s.skin), frontLine, s.screenLow, s.screenHigh, [s.screenHalf, s.eaves + 0.03]),
  ];

local roofLayer(name, slot, x0, x1, z, y0, y1) = [
  box(name + '_aft', slot, [x0, y0, -z], [x0 + 0.05, y1, z]),
  box(name + '_fore', slot, [x1 - 0.05, y0, -z], [x1, y1, z]),
] + bothSides([box(name + '_side', slot, [x0, y0, z - 0.05], [x1, y1, z])]);

local halfWheel = s.tyreWidth / 2;
local lugCount = 32;
local lugs = [
  local a = 2 * std.pi * i / lugCount;
  local dw = 0.02 / s.tyreOuter;
  local rimAt(r, t) = [r * std.cos(t), r * std.sin(t)];
  prism('lug_' + i, 'tyre', [rimAt(s.tyreOuter - 0.03, a - dw), rimAt(s.tyreOuter, a - dw), rimAt(s.tyreOuter, a + dw), rimAt(s.tyreOuter - 0.03, a + dw)], if i % 2 == 0 then [-0.14, 0.01] else [-0.01, 0.14])
  for i in std.range(0, lugCount - 1)
];
local tyrePieces = [
  k.turned('tyre', 'tyre', 'z', [[-halfWheel, s.rimRadius], [-halfWheel, 0.38], [-0.115, 0.415], [0.115, 0.415], [halfWheel, 0.38], [halfWheel, s.rimRadius], [-halfWheel, s.rimRadius]]) + { sides: 48 },
  k.turned('rim', 'rim', 'z', k.disc(s.rimRadius, -0.12, 0.12)) + { sides: 24 },
  k.turned('boss', 'boss', 'z', k.disc(0.09, -0.15, 0.15)) + { sides: 12 },
] + lugs;
local wheelFinish = { tyre: 'rubber-black', rim: 'paint-olive', boss: 'steel-spall-black' };
local shaft(name, mass, span) = local half = (span[1] - span[0]) / 2; k.compound(name, mass, [k.turned('tube', 'steel', 'x', k.disc(s.shaftRadius, -half, half))], { steel: 'paint-charcoal' });

local dp = s.downpipe;
local pipeZ = s.exhaustAt[2];
local pipeEnd = s.exhaustAt[0] + s.exhaustReach;
local dash = s.dashboard;
local g = s.grille;
local b = s.bumper;
local slotPitch = (g.high - g.low - 2 * g.frame) / g.slots;
local windscreenLow = s.screenLow;
local windscreenHigh = s.screenHigh;
local screenSection(name, slot, low, high, z) = section(name, slot, plus(frontLine, -0.03), frontLine, low, high, z);
local spring(i, reach, y) = box('leaf_' + i, 'steel', [-reach, y, s.springZ - 0.035], [reach, y + 0.02, s.springZ + 0.035]);

taxonomy.inherit({ tags: { 'vehicle-body': ['car'] } }, [
  k.compound(id + '_wheel', s.mass.wheel, tyrePieces, wheelFinish, { hub: ['rim', [0.5, 0.5, 0.5]] }),
  k.compound(id + '_spare_wheel', s.mass.spare, [
    box('bracket', 'boss', [-s.voxel, -0.12, -0.12], [0, 0.12, 0.12]),
    k.turned('boss', 'boss', 'x', k.disc(0.09, -halfWheel, halfWheel), [-s.voxel - halfWheel, 0, 0]) + { sides: 12 },
  ] + [p { axis: 'x', origin: [-s.voxel - halfWheel, 0, 0] } for p in tyrePieces if p.kind == 'turned' && p.id != 'boss'], wheelFinish),
  k.compound(id + '_jerry_can', s.mass.jerryCan, [
    box('can', 'can', [-0.195, 0, -0.17], [-0.03125, 0.43, 0.17]),
    box('handle', 'can', [-0.13, 0.43, -0.1], [-0.09, 0.47, 0.1]),
    box('bracket', 'frame', [-0.21, -0.03125, -0.19], [0, 0, 0.19]),
    box('strap', 'strap', [-0.21, 0, -0.03], [-0.195, 0.44, 0.03]),
  ], { can: 'polymer-od-green', frame: 'steel-parkerized', strap: 'plastic-orange' }),
  k.compound(id + '_axle', s.mass.axle, [
    box('diff', 'steel', [-s.diffHalf, s.diffLow, -0.16], [s.diffHalf, s.diffHigh, 0.16]),
    box('half_shaft', 'steel', [-0.04, s.shaftHigh - 0.04, -s.portalZ[0]], [0.04, s.shaftHigh + 0.04, s.portalZ[0]]),
  ] + bothSides([
    box('portal', 'steel', [-0.1, s.hub - 0.09, s.portalZ[0]], [0.1, s.shaftHigh + 0.09, s.portalZ[1]]),
    k.turned('drum', 'drum', 'z', k.disc(0.18, 0, s.portalZ[1] - s.portalZ[0] - 0.02), [0, s.hub, s.portalZ[0]]) + { sides: 16 },
    spring(0, s.springHalf, s.springBase + 0.04),
    spring(1, s.springHalf * 0.75, s.springBase + 0.02),
    spring(2, s.springHalf * 0.5, s.springBase),
  ]), { steel: 'paint-charcoal', drum: 'steel-spall-black' }),
  k.compound(id + '_transfer_case', s.mass.transfer, [box('case', 'casting', [-s.transferHalf, 0, -0.18], [s.transferHalf, s.transferHeight, 0.18])], { casting: 'paint-charcoal' }),
  shaft(id + '_front_prop_shaft', s.mass.frontShaft, s.frontShaft),
  shaft(id + '_rear_prop_shaft', s.mass.rearShaft, s.rearShaft),
  k.compound(id + '_downpipe', s.mass.downpipe, [
    box('riser', 'pipe', [dp.x[0], dp.low, dp.manifoldZ[0]], [dp.x[1], dp.manifoldTop, dp.manifoldZ[1]]),
    box('cross', 'pipe', [dp.x[0], dp.low, pipeZ - dp.half], [dp.x[1], dp.high, dp.manifoldZ[0]]),
    box('along', 'pipe', [dp.x[1], dp.low, pipeZ - dp.half], [pipeEnd + dp.half, dp.high, pipeZ + dp.half]),
    box('drop', 'pipe', [pipeEnd - dp.half, s.exhaustAt[1] + s.exhaustPipeTop - dp.half, pipeZ - dp.half], [pipeEnd + dp.half, dp.low, pipeZ + dp.half]),
  ], { pipe: 'steel-heat-tint' }),
  k.compound(id + '_frame', s.mass.frame, [
    box('cross_' + i, 'frame', [s.crossmembers[i] - 0.03, s.railTop - 0.035, -s.railZ[1]], [s.crossmembers[i] + 0.03, s.railTop, s.railZ[1]])
    for i in std.range(0, std.length(s.crossmembers) - 1)
  ] + bothSides([
    box('rail', 'frame', [s.rear, s.railLow, s.railZ[0]], [s.railFore, s.railTop, s.railZ[1]]),
  ]), finish),
  k.compound(id + '_front_bumper', s.mass.frontBumper, [
    box('beam', 'paint', [s.nose, b.low, -s.bumperHalf], [s.front - s.voxel, b.high, s.bumperHalf]),
    box('tow_eye', 'dark', [s.front - s.voxel, b.low + 0.01, -0.07], [s.front, b.high - 0.01, 0.07]),
  ] + bothSides([
    k.xPrism('gusset', 'paint', [[b.low, b.gussetZ - 0.13], [b.low, b.gussetZ + 0.13], [b.low - b.gussetDrop, b.gussetZ + 0.06], [b.low - b.gussetDrop, b.gussetZ - 0.06]], [s.nose + 0.02, s.front - 0.02]),
    k.bar('stay', 'dark', [s.nose + 0.02, b.low + 0.03], [fa.foreBase[0] + 0.02, fa.foreBase[1] - 0.03], s.voxel, [s.side - 0.05, s.side - 0.02]),
  ]), finish),
  k.compound(id + '_rear_bumper', s.mass.rearBumper, [
    box('beam', 'paint', [s.rearBumper, s.rearBumperY[0], -s.bumperHalf], [s.rear, s.rearBumperY[1], s.bumperHalf]),
  ] + bothSides([
    box('flap', 'flap', [s.rearBumper + 0.02, s.flapLow, s.flapZ[0]], [s.rearBumper + 0.05, s.rearBumperY[0], s.flapZ[1]]),
  ]), finish + { flap: 'rubber-black' }),
  k.compound(id + '_hull', s.mass.hull, bothSides(hullSide) + [
    box('rear_floor', 'trim', [s.rear, s.floorUnder, -s.wellIn], [s.coverBack, s.rearFloor, s.wellIn]),
    box('cab_floor', 'trim', [s.coverFore, s.cabFloorUnder, -s.wellIn], [s.nose - s.skin, s.cabFloor, s.wellIn]),
    box('rear_sill', 'paint', [s.rear, s.rearLow, -rd.half], [s.rear + s.skin, rd.low, rd.half]),
    rearSection('rear_header', 'paint', rd.top, s.drip, [-s.eaves, s.eaves]),
    // The roof is a separate pressed cap above a drip rail.
    box('drip_rail', 'paint', [s.rearDrip - 0.02, s.drip - 0.02, -s.eaves - 0.02], [s.head + 0.02, s.drip, s.eaves + 0.02]),
  ] + roofLayer('cap_low', 'paint', s.rearDrip, s.head, s.eaves - 0.01, s.drip, s.drip + 0.04)
    + roofLayer('cap_mid', 'paint', s.rearDrip + 0.03, s.head - 0.03, s.eaves - 0.05, s.drip + 0.04, s.roofUnder)
    + [
    box('roof', 'paint', [s.rearDrip + 0.08, s.roofUnder, -s.eaves + 0.11], [s.head - 0.08, s.roof, s.eaves - 0.11]),
    // The shoulder under the windscreen, and the raked cowl above it.
    box('shoulder', 'paint', [s.cowl - s.skin, s.belt, -s.side], [s.nose, s.belt + 0.03, s.side]),
    screenSection('cowl', 'paint', s.belt, windscreenLow, [-s.side + 0.02, s.side - 0.02]),
    screenSection('screen_head', 'paint', windscreenHigh, s.drip, [-s.eaves, s.eaves]),
    // The flat face, with an opening for the grille.
    box('face_low', 'paint', [s.nose - s.skin, s.noseLow, -s.side], [s.nose, g.low, s.side]),
    box('face_high', 'paint', [s.nose - s.skin, g.high, -s.side], [s.nose, s.belt, s.side]),
    box('face_near', 'paint', [s.nose - s.skin, g.low, g.half], [s.nose, g.high, s.side]),
    box('face_far', 'paint', [s.nose - s.skin, g.low, -s.side], [s.nose, g.high, -g.half]),
    // The tunnel behind the radiator.
    box('tunnel_back', 'trim', [s.tunnelBack, s.cabFloor, -s.tunnelHalf], [s.tunnelBack + s.skin, s.tunnelTop, s.tunnelHalf]),
    box('tunnel_top', 'trim', [s.tunnelBack, s.tunnelTop, -s.tunnelHalf], [s.nose - s.skin, s.tunnelTop + s.skin, s.tunnelHalf]),
  ] + bothSides([
    box('tunnel_side', 'trim', [s.tunnelBack, s.cabFloor, s.tunnelHalf], [s.nose - s.skin, s.tunnelTop, s.tunnelHalf + s.skin]),
  ]), finish),
  k.compound(id + '_grille', s.mass.grille, [
    box('backing', 'dark', [s.nose - s.skin, g.low, -g.half], [s.nose - 0.01, g.high, g.half]),
    box('frame_low', 'paint', [s.nose - 0.01, g.low, -g.half], [s.nose + s.voxel, g.low + g.frame, g.half]),
    box('frame_high', 'paint', [s.nose - 0.01, g.high - g.frame, -g.half], [s.nose + s.voxel, g.high, g.half]),
  ] + bothSides([
    box('frame_side', 'paint', [s.nose - 0.01, g.low, g.half - g.frame], [s.nose + s.voxel, g.high, g.half]),
  ]) + [
    box('bar_' + i, 'paint', [s.nose - 0.01, g.low + g.frame + i * slotPitch - s.voxel / 2, -g.half], [s.nose, g.low + g.frame + i * slotPitch + s.voxel / 2, g.half])
    for i in std.range(1, g.slots - 1)
  ], finish),
  k.compound(id + '_headlamp', s.mass.headlamp, [
    k.turned('bowl', 'dark', 'x', k.disc(0.12, -0.01, 0.03125)) + { sides: 24 },
    k.turned('lens', 'lens', 'x', k.disc(0.1, 0.03125, 0.0625)) + { sides: 24 },
  ], { dark: 'paint-olive', lens: 'plastic-frosted' }),
  k.compound(id + '_blackout_lamp', s.mass.blackoutLamp, [
    k.turned('bowl', 'dark', 'x', k.disc(0.075, 0, 0.0625)) + { sides: 16 },
  ], { dark: 'steel-spall-black' }),
  k.compound(id + '_tail_lamp', s.mass.tailLamp, [
    box('bracket', 'dark', [-0.03125, 0, -0.17], [0.06, 0.03125, 0.17]),
    k.turned('red', 'red', 'x', k.disc(0.08, -0.03125, 0.03125), [0, 0.1, 0.09]) + { sides: 16 },
    k.turned('clear', 'clear', 'x', k.disc(0.08, -0.03125, 0.03125), [0, 0.1, -0.09]) + { sides: 16 },
  ], { dark: 'steel-spall-black', red: 'plastic-red', clear: 'plastic-frosted' }),
  k.compound(id + '_wiper', s.mass.wiper, [
    box('blade', 'dark', [frontLine(windscreenLow + 0.04), windscreenLow + 0.03, 0.12], [frontLine(windscreenLow + 0.04) + s.voxel, windscreenLow + 0.03 + s.voxel, 0.68]),
  ], finish),
  k.compound(id + '_door_mirror', s.mass.mirror, [
    box('arm', 'dark', [-0.015, 0, 0], [0.015, s.voxel, 0.07]),
    box('stalk', 'dark', [-0.015, 0, 0.04], [0.015, 0.22, 0.07]),
    k.xPrism('head', 'dark', [[0.2, 0.04], [0.24, 0.01], [0.38, 0.01], [0.42, 0.04], [0.42, 0.13], [0.38, 0.16], [0.24, 0.16], [0.2, 0.13]], [-0.025, 0.025]),
  ], finish),
  cabDoor,
  sideDoor,
  rearDoor,
  k.compound(id + '_windscreen', s.mass.windscreen, [
    screenSection('centre_post', 'seal', windscreenLow, windscreenHigh, [-s.seal / 2, s.seal / 2]),
    screenSection('seal_low', 'seal', windscreenLow, windscreenLow + s.seal, [-s.screenHalf, s.screenHalf]),
    screenSection('seal_high', 'seal', windscreenHigh - s.seal, windscreenHigh, [-s.screenHalf, s.screenHalf]),
  ] + bothSides([
    screenSection('pane', 'glass', windscreenLow + s.seal, windscreenHigh - s.seal, [s.seal / 2, s.screenHalf - s.seal]),
    screenSection('seal_side', 'seal', windscreenLow + s.seal, windscreenHigh - s.seal, [s.screenHalf - s.seal, s.screenHalf]),
  ]),
  finish),
  k.compound(id + '_dashboard', s.mass.dashboard, [
    box('shelf', 'trim', [dash.back, s.tunnelTop + s.skin, -dash.half], [frontLine(dash.back) - 0.05, dash.top, dash.half]),
    box('dials', 'dark', [dash.back - s.voxel, s.tunnelTop + 0.1, -0.8], [dash.back, dash.top - 0.02, -0.4]),
    k.bar('column', 'dark', [dash.back, s.wheelY + 0.03], [s.wheelX + 0.03, s.wheelY], 0.05, [-s.seatZ - 0.025, -s.seatZ + 0.025]),
  ], finish),
  k.compound(id + '_engine_cover', s.mass.engineCover, [
    box('top', 'trim', [s.coverBack, s.coverTop - s.skin, -s.coverHalf], [s.coverFore, s.coverTop, s.coverHalf]),
    box('back', 'trim', [s.coverBack, s.rearFloor, -s.coverHalf], [s.coverBack + s.skin, s.coverTop - s.skin, s.coverHalf]),
    box('front', 'trim', [s.coverFore - s.skin, s.cabFloor, -s.coverHalf], [s.coverFore, s.coverTop - s.skin, s.coverHalf]),
  ] + bothSides([
    box('side', 'trim', [s.coverBack, s.cabFloor, s.coverHalf - s.skin], [s.coverFore, s.coverTop - s.skin, s.coverHalf]),
  ]), finish),
  k.compound(id + '_crew_seat', s.mass.crewSeat, [
    box('plank', 'seat', [-0.45, 0, -0.17], [0.45, 0.05, 0.17]),
    box('back', 'seat', [-0.45, 0, 0.15], [0.45, 0.55, 0.19]),
  ], { seat: 'polymer-black' }),
])
