local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local t = import 'truck-cab.libsonnet';
local k = import 'kit.libsonnet';
local stow = import 'stowage-kit.libsonnet';
local vehicle = import 'airport_crash_tender.placements.libsonnet';
local box = k.box;
local s = t.spec(import 'airport_crash_tender.spec.libsonnet');
local finish = { paint: s.paint, white: 'paint-white', red: 'paint-red', frame: 'paint-charcoal', steel: 'steel-grey', alu: 'alu-bare', dark: 'plastic-black', tank: 'polymer-black', foam: 'plastic-red', pipe: 'steel-stainless' };
local round(piece) = piece + { sides: 16 };
// One opening spans the tandem, since its tyres stand too close for a pier between them.
local archRear = s.rearAxles[1] - s.r - 0.12;
local archFront = s.rearAxles[0] + s.r + 0.12;
local archTop = s.bodyFloor - 0.05;
local archChamfer = 0.3;
local bandLow = s.floor - 0.03;
local bandTop = s.floor + 0.07;
local shutterTop = s.bodyTop - 0.1;
local inset = s.bodySide - 0.04;
// The posts between lockers: their centres along the body, and their half width.
local dividers = { mid: 0.96, wheel: -2.4 };
local postHalf = 0.04;
// Each locker's span along the body; its shutter sits in the wall's skin depth.
local lockerSpans = {
  fore: [dividers.mid + postHalf, s.bodyFront - 2 * postHalf],
  mid: [archFront + 0.02, dividers.mid - postHalf],
  wheel_fore: [dividers.wheel + postHalf, archFront - 0.02],
  wheel_aft: [archRear + 0.02, dividers.wheel - postHalf],
  aft: [s.bodyRear + 2 * postHalf, archRear - 0.02],
};
local post(name, x) = box('post_' + name, 'paint', [x - postHalf, bandTop, inset], [x + postHalf, shutterTop, s.bodySide]);
// Between neighbouring lockers a partition runs back to the lockers' back wall.
local spanList = std.sort(std.objectValues(lockerSpans), function(span) span[0]);
local gaps = [[spanList[i][1], spanList[i + 1][0]] for i in std.range(0, std.length(spanList) - 2)];
local back = s.lockerBack;
local front = inset - 0.02;
local y0 = s.bodyFloor;
local stowFinish = stow.finish + {
  board: 'paint-charcoal', case_a: 'plastic-green', case_b: 'plastic-orange', drum: 'plastic-blue', sheet: 'plastic-blue',
  axe: 'paint-red', extinguisher: 'paint-red', co2: 'plastic-black', gauge: 'plastic-white', wheel: 'paint-red', suction: 'rubber-black',
};
// Each locker's kit, laid out from the body floor so it rides with the body's height.
local stowage = {
  fore: std.flattenArrays([stow.cylinder('cylinder_' + i, 1.15 + i * 0.24, y0, 1.3, 0.085, 0.6) for i in std.range(0, 4)]) + [
    stow.strap('cylinder_strap', [1.05, 2.25], y0 + 0.4, 1.385),
    stow.shelf('shelf_low', lockerSpans.fore, y0 + 0.85, [back, front]),
    stow.shelf('shelf_high', lockerSpans.fore, y0 + 1.4, [back, front]),
  ] + std.flattenArrays([stow.case('foam_' + i, 'drum', [2.3, y0 + i * 0.38, back + 0.04], [2.7, y0 + i * 0.38 + 0.34, front - 0.03]) for i in [0, 1]])
    + std.flattenArrays([stow.cylinder('drum_' + i, 1.9 + i * 0.3, y0 + 0.85, 1.2, 0.13, 0.42, 'drum') for i in [0, 1, 2]])
    + stow.case('masks', 'case_a', [1.05, y0 + 0.85, back + 0.04], [1.7, y0 + 1.15, front - 0.03])
    + stow.case('camera', 'case_b', [1.05, y0 + 1.4, back + 0.04], [1.6, y0 + 1.65, front - 0.03])
    + stow.case('first_aid', 'case_a', [1.7, y0 + 1.4, back + 0.04], [2.3, y0 + 1.72, front - 0.03]),
  mid: std.flattenArrays([
    stow.hoseRoll('roll_' + row + '_' + i, -0.6 + i * 0.4, y0 + row * 0.36, [1.36, front], 0.18)
    for row in [0, 1]
    for i in std.range(0, 3)
  ]) + std.flattenArrays([
    stow.hoseRoll('roll_top_' + i, -0.6 + i * 0.4, y0 + 0.75, [1.36, front], 0.18)
    for i in std.range(0, 3)
  ]) + [
    stow.shelf('shelf_low', lockerSpans.mid, y0 + 0.75, [back, front]),
    stow.shelf('shelf_high', lockerSpans.mid, y0 + 1.3, [back, front]),
  ] + stow.case('branches_a', 'case_b', [-0.7, y0 + 1.3, back + 0.04], [0.05, y0 + 1.55, front - 0.03])
    + stow.case('branches_b', 'case_b', [0.12, y0 + 1.3, back + 0.04], [0.85, y0 + 1.6, front - 0.03]),
  wheel_fore: [
    stow.board('board', [-2.3, -0.9], [y0 + 0.5, y0 + 1.8], back),
  ] + stow.hungTool('axe', -2.15, y0 + 0.55, 0.9, [0.2, 0.12], back + 0.03125, 'axe')
    + stow.hungTool('bar', -1.9, y0 + 0.5, 1.05, [0.12, 0.06], back + 0.03125, haftSlot='steel')
    + stow.hungTool('sledge', -1.65, y0 + 0.55, 0.8, [0.16, 0.1], back + 0.03125)
    + stow.hungTool('hook', -1.35, y0 + 0.5, 1.25, [0.06, 0.25], back + 0.03125)
    + stow.case('cutter', 'case_a', [-2.3, y0, back + 0.04], [-1.65, y0 + 0.4, front - 0.03])
    + stow.case('saw', 'case_b', [-1.55, y0, back + 0.04], [-0.9, y0 + 0.35, front - 0.03]),
  wheel_aft: std.flattenArrays([stow.cylinder('powder_' + i, -3.8 + i * 0.3, y0, 1.2, 0.12, 0.7, 'extinguisher') for i in std.range(0, 3)]) + [
    stow.strap('powder_strap', [-3.93, -2.83], y0 + 0.45, 1.32),
    stow.shelf('shelf_low', lockerSpans.wheel_aft, y0 + 0.95, [back, front]),
    stow.shelf('shelf_high', lockerSpans.wheel_aft, y0 + 1.5, [back, front]),
  ] + std.flattenArrays([stow.cylinder('co2_' + i, -3.82 + i * 0.24, y0 + 0.95, 1.2, 0.08, 0.45, 'co2') for i in std.range(0, 3)])
    + stow.case('lights', 'case_b', [-2.9, y0, back + 0.04], [-2.5, y0 + 0.4, front - 0.03])
    + [box('sheet_' + i, 'sheet', [-3.9, y0 + 1.5 + i * 0.1, back + 0.04], [-2.6, y0 + 1.58 + i * 0.1, front - 0.03]) for i in [0, 1]],
  // The pump's operator panel stands in the aft locker beside the pump, its gauges above the valve wheels, with hard
  // suction hose laid along the floor beneath.
  aft: [
    stow.board('panel', [-5.35, -4.1], [y0 + 0.5, y0 + 1.6], back),
  ] + [
    round(k.turned('gauge_' + i, 'gauge', 'z', k.disc(0.07, back + 0.03125, back + 0.0625), [-5.1 + i * 0.37, y0 + 1.35, 0]))
    for i in [0, 1, 2]
  ] + [
    round(k.turned('valve_' + i, 'wheel', 'z', k.disc(0.09, back + 0.03125, back + 0.09375), [-5.1 + i * 0.37, y0 + 0.85, 0]))
    for i in [0, 1, 2]
  ] + [
    round(k.turned('suction_' + i, 'suction', 'x', k.disc(0.07, -5.35, -4.1), [0, y0 + 0.07, 1.05 + i * 0.16]))
    for i in [0, 1]
  ],
};
// The roof turret stands on the cab's crown, the bumper turret on the bumper's top.
local turretY = s.crown;
local bumperTurretY = s.bumperTop;
local railY = s.bodyTop + 0.42;
local posts = [s.bodyRear + 0.15 + i * (s.bodyFront - s.bodyRear - 0.3) / 6 for i in std.range(0, 6)];
// The ladder stands inboard of the tail lamps.
local ladderZ = [0.5, 0.88];
local stays = [1.6, 3.0];
local rungs = std.range(0, std.floor((railY - 0.95) / 0.3));
// A monitor's head: a swivel under a housing between two cheeks, and a barrel ending in a flared nozzle, all about the
// head's pivot at `at`, scaled by `size` so the roof and bumper turrets share one shape.
local monitorHead(at, size, reach) = [
  round(k.turned('swivel', 'steel', 'y', k.disc(0.17 * size, 0, 0.1 * size), at)),
  box('housing', 'paint', [at[0] - 0.2 * size, at[1] + 0.1 * size, -0.16 * size], [at[0] + 0.12 * size, at[1] + 0.32 * size, 0.16 * size]),
  round(k.turned('barrel', 'pipe', 'x', k.disc(0.085 * size, 0.12 * size, reach), [at[0], at[1] + 0.22 * size, 0])),
  round(k.turned('nozzle', 'pipe', 'x', [[reach, 0], [reach, 0.11 * size], [reach + 0.35 * size, 0.14 * size], [reach + 0.35 * size, 0], [reach, 0]], [at[0], at[1] + 0.22 * size, 0])),
  round(k.turned('tip', 'dark', 'x', k.annulus(0.1 * size, 0.15 * size, reach + 0.35 * size, reach + 0.41 * size), [at[0], at[1] + 0.22 * size, 0])),
] + k.bothSides([
  box('cheek', 'paint', [at[0] - 0.12 * size, at[1] + 0.1 * size, 0.16 * size], [at[0] + 0.12 * size, at[1] + 0.38 * size, 0.22 * size]),
]);
taxonomy.inherit({ tags: { 'vehicle-body': ['truck'] } }, t.rows('airport_crash_tender', vehicle.title, s) + [
  k.compound('airport_crash_tender_body', s.bodyMass, [
    box('floor', 'frame', [s.bodyRear, s.bodyFloor - 0.05, -s.bodySide], [s.bodyFront, s.bodyFloor, s.bodySide]),
    box('roof', 'paint', [s.bodyRear, s.bodyTop - 0.05, -s.bodySide], [s.bodyFront, s.bodyTop, s.bodySide]),
    box('front_wall', 'paint', [s.bodyFront - 0.05, s.bodyFloor, -s.bodySide], [s.bodyFront, s.bodyTop, s.bodySide]),
    box('rear_wall', 'paint', [s.bodyRear, s.bodyFloor, -s.bodySide], [s.bodyRear + 0.05, s.bodyTop, s.bodySide]),
  ] + k.bothSides([
    box('wall', 'alu', [s.bodyRear, s.bodyFloor, back - 0.04], [s.bodyFront, s.bodyTop, back]),
  ] + [box('partition_' + i, 'alu', [gaps[i][0], s.bodyFloor, back], [gaps[i][1], shutterTop, inset]) for i in std.range(0, std.length(gaps) - 1)] + [
    box('low_fore', 'paint', [archFront, s.bodyLow, inset], [s.bodyFront, archTop, s.bodySide]),
    box('low_aft', 'paint', [s.bodyRear, s.bodyLow, inset], [archRear, archTop, s.bodySide]),
    box('sill', 'paint', [s.bodyRear, archTop, inset], [s.bodyFront, bandLow, s.bodySide]),
  ] + t.archCorners('arch', 'paint', archRear, archFront, archTop, archChamfer, inset, s.bodySide)
    + t.archCorners('arch_liner', 'frame', archRear, archFront, archTop, archChamfer, 0.56, inset) + [
    box('arch_wall', 'frame', [archRear, 2 * s.r - 0.12, 0.56], [archFront, archTop, 0.59125]),
    box('arch_jamb_aft', 'frame', [archRear, s.bodyLow, 0.56], [archRear + 0.0625, archTop - archChamfer, inset]),
    box('arch_jamb_fore', 'frame', [archFront - 0.0625, s.bodyLow, 0.56], [archFront, archTop - archChamfer, inset]),
    box('band', 'red', [s.bodyRear, bandLow, inset], [s.bodyFront, bandTop, s.bodySide]),
    box('cap', 'white', [s.bodyRear, s.bodyTop - 0.1, inset], [s.bodyFront, s.bodyTop, s.bodySide]),
    post('rear', s.bodyRear + postHalf),
    post('front', s.bodyFront - postHalf),
    post('mid', dividers.mid),
    post('wheel', dividers.wheel),
    box('low_fore_handle', 'dark', [0.9, archTop - 0.2, s.bodySide], [1.4, archTop - 0.16, s.bodySide + 0.032]),
    box('low_aft_handle', 'dark', [-5.1, archTop - 0.2, s.bodySide], [-4.6, archTop - 0.16, s.bodySide + 0.032]),
  ] + [
    box('chevron_' + i, if i % 2 == 0 then 'red' else 'white', [s.bodyRear - 0.006, s.bodyLow + i * 0.3, 0.6], [s.bodyRear, s.bodyLow + (i + 1) * 0.3, s.bodySide])
    for i in std.range(0, 7)
  ]), finish) + { title: 'Airport crash tender body' },
  k.compound('airport_crash_tender_cab_stripe', 6, k.bothSides([
    box('band', 'red', [s.cabBack, bandLow, s.side], [s.face, bandTop, s.side + 0.032]),
  ]), finish) + { title: 'Airport crash tender cab stripe' },
  // 12,500 l of water fill the body between the locker rows; the foam concentrate rides in a smaller tank ahead of it.
  k.compound('airport_crash_tender_water_tank', s.waterTankMass, [
    box('tank', 'tank', [archRear + 0.1, s.bodyFloor, -0.9], [0.6, shutterTop, 0.9]),
  ], finish) + { title: 'Airport crash tender water tank' },
  k.compound('airport_crash_tender_foam_tank', s.foamTankMass, [
    box('tank', 'foam', [0.7, s.bodyFloor, -0.9], [1.8, shutterTop, 0.9]),
  ], finish) + { title: 'Airport crash tender foam tank' },
  // The pump sits in the rear lockers behind the tandem, its suction drawn from the tank ahead.
  k.compound('airport_crash_tender_pump', s.pumpMass, [
    round(k.turned('volute', 'steel', 'z', k.disc(0.32, -0.22, 0.22), [-4.7, s.bodyFloor + 0.42, 0])),
    box('gearcase', 'frame', [-5.2, s.bodyFloor, -0.3], [-4.95, s.bodyFloor + 0.6, 0.3]),
    round(k.turned('suction', 'pipe', 'x', k.disc(0.1, -4.4, archRear + 0.1), [0, s.bodyFloor + 0.42, 0])),
    round(k.turned('riser', 'pipe', 'y', k.disc(0.08, s.bodyFloor + 0.74, shutterTop), [-4.7, 0, 0])),
  ], finish) + { title: 'Airport crash tender pump' },
] + k.lockerShutters('airport_crash_tender_locker_shutter_', s.lockersMass, lockerSpans, s.lockers, bandTop, shutterTop, [inset, s.bodySide], finish) + [
  k.compound('airport_crash_tender_locker_stowage_' + name, s.stowage[name].mass, stowage[name], stowFinish) + { title: s.stowage[name].title }
  for name in std.objectFields(stowage)
] + [
  // The water main runs from the body over the cab's back to the roof turret, which turns on it.
  k.compound('airport_crash_tender_roof_turret_mount', s.turretMountMass, [
    round(k.turned('base', 'frame', 'y', k.disc(0.26, 0, 0.06), [s.turretX, turretY, 0])),
    round(k.turned('riser', 'pipe', 'y', k.disc(0.13, 0.06, 0.3), [s.turretX, turretY, 0])),
    round(k.turned('main', 'pipe', 'x', k.disc(0.08, s.bodyFront, s.turretX), [0, turretY + 0.14, 0])),
  ], finish) + { title: 'Airport crash tender roof turret mount' },
  k.compound('airport_crash_tender_roof_turret', s.turretMass, monitorHead([s.turretX, turretY + 0.3, 0], 1, 1.3), finish) + { title: 'Airport crash tender roof turret' },
  k.compound('airport_crash_tender_bumper_turret', s.bumperTurretMass, [
    round(k.turned('base', 'frame', 'y', k.disc(0.12, 0, 0.05), [s.bumperTurretX, bumperTurretY, 0])),
  ] + monitorHead([s.bumperTurretX, bumperTurretY + 0.05, 0], 0.55, 0.42), finish) + { title: 'Airport crash tender bumper turret' },
  k.compound('airport_crash_tender_roof_rail', s.roofRailMass, [
    box('walkway', 'alu', [s.bodyRear + 0.1, s.bodyTop, -0.4], [s.bodyFront - 0.1, s.bodyTop + 0.03, 0.4]),
  ] + k.bothSides([
    box('rail', 'alu', [posts[0], railY, s.bodySide - 0.1], [posts[6] + 0.05, railY + 0.05, s.bodySide - 0.05]),
  ] + [
    box('post_' + i, 'alu', [posts[i], s.bodyTop, s.bodySide - 0.1], [posts[i] + 0.05, railY, s.bodySide - 0.05])
    for i in std.range(0, 6)
  ]), finish) + { title: 'Airport crash tender roof rail' },
  k.compound('airport_crash_tender_rear_ladder', s.ladderMass, [
    box('stile_in', 'alu', [s.bodyRear - 0.12, 0.95, ladderZ[0]], [s.bodyRear - 0.08, railY, ladderZ[0] + 0.04]),
    box('stile_out', 'alu', [s.bodyRear - 0.12, 0.95, ladderZ[1] - 0.04], [s.bodyRear - 0.08, railY, ladderZ[1]]),
  ] + [
    box('rung_' + i, 'steel', [s.bodyRear - 0.12, 1.0 + i * 0.3, ladderZ[0] + 0.04], [s.bodyRear - 0.09, 1.03 + i * 0.3, ladderZ[1] - 0.04])
    for i in rungs
  ] + [
    box('stay_' + i, 'alu', [s.bodyRear - 0.08, stays[i], ladderZ[0]], [s.bodyRear, stays[i] + 0.04, ladderZ[0] + 0.04])
    for i in std.range(0, std.length(stays) - 1)
  ], finish) + { title: 'Airport crash tender rear ladder' },
])
