local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local t = import 'truck-cab.libsonnet';
local k = import 'kit.libsonnet';
local stow = import 'stowage-kit.libsonnet';
local box = k.box;
local s = import 'fire_engine.spec.libsonnet';
local vehicle = import 'fire_engine.placements.libsonnet';
local round(piece) = piece + { sides: 16 };
local finish = { paint: s.paint, white: 'paint-white', reflect: 'reflective-yellow', frame: 'paint-charcoal', steel: 'steel-grey', alu: 'alu-bare', dark: 'plastic-black', tank: 'polymer-black', hose: 'plastic-red', gauge: 'plastic-yellow', chrome: 'steel-stainless' };
local archChamfer = 0.3;
local shutterTop = s.bodyTop - 0.1;
local bandLow = s.floor - 0.03;
local bandTop = s.floor + 0.07;
local shutterLow = bandTop;
local inset = s.bodySide - 0.04;
local lockerSpans = s.lockerSpans;
// The posts between neighbouring lockers, each with a partition behind it back to the lockers' back wall.
local spanList = std.sort([lockerSpans[name] for name in std.objectFields(lockerSpans)], function(span) span[0]);
local gaps = [[spanList[i][1], spanList[i + 1][0]] for i in std.range(0, std.length(spanList) - 2)];
local back = s.lockerBack;
// Stowed kit stands clear of the shutters' inner face, which they slide up past.
local front = inset - 0.02;
local stowFinish = stow.finish + { case_a: 'plastic-green', case_b: 'plastic-orange', sheet: 'plastic-blue', axe: 'paint-red', pump: 'paint-red' };
// Heights above the locker floor.
local up(h) = s.bodyFloor + h;
local stowage = {
  fore: std.flattenArrays([stow.cylinder('cylinder_' + i, -0.36 + i * 0.24, s.bodyFloor, back + 0.17, 0.085, 0.6) for i in std.range(0, 4)]) + [
    stow.strap('cylinder_strap', [-0.46, 0.73], up(0.4), back + 0.255),
    stow.shelf('shelf_low', lockerSpans.fore, up(0.75), [back, front]),
    stow.shelf('shelf_high', lockerSpans.fore, up(1.3), [back, front]),
    box('sheets_a', 'sheet', [-0.45, up(1.3), back + 0.04], [0.1, up(1.55), front - 0.03]),
    box('sheets_b', 'sheet', [0.17, up(1.3), back + 0.04], [0.72, up(1.51), front - 0.03]),
  ] + stow.case('first_aid', 'case_a', [-0.45, up(0.75), back + 0.06], [0.05, up(1.07), front - 0.03])
    + stow.case('camera', 'case_b', [0.12, up(0.75), back + 0.06], [0.72, up(1.0), front - 0.03]),
  mid: [
    stow.board('board', [-1.29, -0.62], [up(0.3), up(1.73)], back),
  ] + stow.hungTool('axe', -1.17, up(0.45), 0.9, [0.2, 0.12], back + 0.03125, 'axe')
    + stow.hungTool('bar', -0.97, up(0.35), 1.05, [0.12, 0.06], back + 0.03125, haftSlot='steel')
    + stow.hungTool('sledge', -0.78, up(0.45), 0.8, [0.16, 0.1], back + 0.03125)
    + stow.case('branches_a', 'case_b', [-1.28, s.bodyFloor, back + 0.06], [-0.98, up(0.25), front - 0.03])
    + stow.case('branches_b', 'case_b', [-0.92, s.bodyFloor, back + 0.06], [-0.63, up(0.25), front - 0.03]),
  wheel: std.flattenArrays([
    stow.hoseRoll('roll_' + row + '_' + i, -2.35 + i * 0.4, up(row * 0.36), [back + 0.16, front], 0.18)
    for row in [0, 1]
    for i in [0, 1, 2]
  ] + [
    stow.hoseRoll('roll_top_' + i, -2.35 + i * 0.4, up(1.25), [back + 0.16, front], 0.18)
    for i in [0, 1]
  ]) + [
    stow.shelf('shelf_low', lockerSpans.wheel, up(0.77), [back, front]),
    stow.shelf('shelf_high', lockerSpans.wheel, up(1.25), [back, front]),
    round(k.turned('standpipe', 'coupling', 'x', k.disc(0.045, -2.0, -1.42), [0, up(0.815), back + 0.12])),
    box('standpipe_head', 'steel', [-1.48, up(0.77), back + 0.06], [-1.4, up(0.95), back + 0.18]),
    box('key', 'steel', [-1.75, up(1.25), back + 0.19], [-1.38, up(1.29), back + 0.23]),
  ] + std.flattenArrays([
    [
      round(k.turned('branch_' + i, 'coupling', 'x', k.disc(0.045, -2.5, -2.12), [0, up(0.815), back + 0.12 + i * 0.12])),
      round(k.turned('branch_' + i + '_grip', 'lid', 'x', k.disc(0.055, -2.36, -2.26), [0, up(0.815), back + 0.12 + i * 0.12])),
    ]
    for i in [0, 1]
  ]),
  aft: [
    box('pump_base', 'steel', [-3.7, s.bodyFloor, back + 0.06], [-3.1, up(0.04), front - 0.02]),
    box('pump_engine', 'engine', [-3.62, up(0.04), back + 0.09], [-3.3, up(0.4), back + 0.26]),
    box('pump_tank', 'pump', [-3.62, up(0.4), back + 0.09], [-3.3, up(0.53), back + 0.26]),
    round(k.turned('pump_volute', 'pump', 'z', k.disc(0.12, back + 0.12, back + 0.26), [-3.2, up(0.21), 0])),
    box('pump_rail', 'steel', [-3.7, up(0.53), back + 0.26], [-3.1, up(0.57), front - 0.02]),
    box('pump_post_rear', 'steel', [-3.7, up(0.04), back + 0.26], [-3.66, up(0.53), front - 0.02]),
    box('pump_post_fore', 'steel', [-3.14, up(0.04), back + 0.26], [-3.1, up(0.53), front - 0.02]),
    stow.shelf('shelf', lockerSpans.aft, up(0.8), [back, front]),
    round(k.turned('fan_shroud', 'pump', 'z', k.disc(0.24, back + 0.1, back + 0.18), [-3.4, up(1.1), 0])),
    round(k.turned('fan_guard', 'steel', 'z', k.annulus(0.22, 0.28, back + 0.18, back + 0.24), [-3.4, up(1.1), 0])),
    round(k.turned('fan_hub', 'engine', 'z', k.disc(0.08, back + 0.18, back + 0.24), [-3.4, up(1.1), 0])),
    box('fan_foot', 'steel', [-3.65, up(0.8), back + 0.08], [-3.15, up(0.83), back + 0.24]),
  ] + std.flattenArrays([stow.cone('cone_' + i, -2.8, up(i * 0.08), back + 0.16) for i in [0, 1, 2]])
    + stow.case('lights', 'case_b', [-3.05, up(0.8), back + 0.06], [-2.62, up(1.15), front - 0.03]),
};
local rungs = std.range(0, 12);
local gantry = [s.bodyRear + 0.6, -1.2, 0.5];
taxonomy.inherit({ tags: { 'vehicle-body': ['truck'] } }, t.rows('fire_engine', vehicle.title, s) + [
  k.compound('fire_engine_body', 4880 - s.rearWallMass, [
    box('floor', 'frame', [s.bodyRear, s.bodyFloor - 0.05, -s.bodySide], [s.bodyFront, s.bodyFloor, s.bodySide]),
    box('roof', 'paint', [s.bodyRear, s.bodyTop - 0.05, -s.bodySide], [s.bodyFront, s.bodyTop, s.bodySide]),
    box('front_wall', 'paint', [s.bodyFront - 0.05, s.bodyFloor, -s.bodySide], [s.bodyFront, s.bodyTop, s.bodySide]),
  ] + k.bothSides([
    box('locker_back', 'alu', [s.bodyRear, s.bodyFloor, back - 0.04], [s.bodyFront, s.bodyTop - 0.05, back]),
    box('low_fore', 'paint', [s.archFront, s.bodyLow, inset], [s.bodyFront, s.bodyFloor - 0.05, s.bodySide]),
    box('low_aft', 'paint', [s.bodyRear, s.bodyLow, inset], [s.archRear, s.bodyFloor - 0.05, s.bodySide]),
    box('sill', 'paint', [s.bodyRear, s.bodyFloor - 0.05, inset], [s.bodyFront, bandLow, s.bodySide]),
  ] + t.archCorners('arch', 'paint', s.archRear, s.archFront, s.bodyFloor - 0.05, archChamfer, inset, s.bodySide)
    + t.archCorners('arch_liner', 'frame', s.archRear, s.archFront, s.bodyFloor - 0.05, archChamfer, 0.44, inset) + [
    box('arch_wall', 'frame', [s.archRear, 2 * s.r - 0.12, 0.5], [s.archFront, s.bodyFloor - 0.05, 0.53125]),
    box('arch_jamb_aft', 'frame', [s.archRear, s.bodyLow, 0.5], [s.archRear + 0.0625, s.bodyFloor - 0.05 - archChamfer, inset]),
    box('arch_jamb_fore', 'frame', [s.archFront - 0.0625, s.bodyLow, 0.5], [s.archFront, s.bodyFloor - 0.05 - archChamfer, inset]),
    box('band', 'reflect', [s.bodyRear, bandLow, inset], [s.bodyFront, bandTop, s.bodySide]),
    box('cap', 'white', [s.bodyRear, s.bodyTop - 0.1, inset], [s.bodyFront, s.bodyTop, s.bodySide]),
    box('post_rear', 'paint', [s.bodyRear, s.bodyFloor, back], [s.bodyRear + 0.08, s.bodyTop - 0.05, s.bodySide]),
    box('post_front', 'paint', [s.bodyFront - 0.08, s.bodyFloor, back], [s.bodyFront, s.bodyTop - 0.05, s.bodySide]),
    box('low_fore_handle', 'dark', [-0.6, 0.98, s.bodySide], [-0.2, 1.02, s.bodySide + 0.032]),
    box('low_aft_handle', 'dark', [-3.4, 0.98, s.bodySide], [-3.0, 1.02, s.bodySide + 0.032]),
  ] + std.flattenArrays([
    [
      box('partition_' + i, 'alu', [gaps[i][0], s.bodyFloor, back], [gaps[i][1], s.bodyTop - 0.05, inset]),
      box('post_' + i, 'paint', [gaps[i][0], bandTop, inset], [gaps[i][1], shutterTop, s.bodySide]),
    ]
    for i in std.range(0, std.length(gaps) - 1)
  ])), finish) + { title: 'Fire engine body' },
  // A part of its own, so a body that opens at the back, as the rescue truck's does, leaves it out. It closes the
  // middle between the lockers' back walls; the corner posts close the lockers.
  k.compound('fire_engine_rear_wall', s.rearWallMass, [
    box('wall', 'paint', [s.bodyRear, s.bodyFloor, 0.04 - back], [s.bodyRear + 0.05, s.bodyTop - 0.05, back - 0.04]),
  ], finish) + { title: 'Fire engine rear wall' },
  k.compound('fire_engine_cab_stripe', 6, k.bothSides([
    box('band', 'reflect', [s.cabBack, s.floor - 0.03, s.side], [s.face, s.floor + 0.07, s.side + 0.032]),
  ]), finish) + { title: 'Fire engine cab stripe' },
  k.compound('fire_engine_water_tank', 400, [
    box('tank', 'tank', [s.archRear + 0.1, s.bodyFloor, -0.82], [s.archFront + 0.5, s.bodyTop - 0.1, 0.82]),
  ], finish) + { title: 'Fire engine water tank' },
] + k.lockerShutters('fire_engine_locker_shutter_', s.lockersMass, lockerSpans, s.lockers, shutterLow, shutterTop, [inset, s.bodySide], finish) + [
  k.compound('fire_engine_locker_stowage_' + name, s.stowage[name].mass, stowage[name], stowFinish) + { title: s.stowage[name].title }
  for name in std.objectFields(stowage)
] + [
  k.compound('fire_engine_roof_ladder', 95, [
    box('rail_near', 'alu', [s.bodyRear + 0.1, s.ladderY, 0.26], [1.7, s.ladderY + 0.07, 0.32]),
    box('rail_far', 'alu', [s.bodyRear + 0.1, s.ladderY, -0.32], [1.7, s.ladderY + 0.07, -0.26]),
  ] + [
    box('rung_' + i, 'steel', [s.bodyRear + 0.25 + i * 0.44 - 0.02, s.ladderY + 0.02, -0.26], [s.bodyRear + 0.25 + i * 0.44 + 0.02, s.ladderY + 0.05, 0.26])
    for i in rungs
  ], finish) + { title: 'Fire engine roof ladder' },
  k.compound('fire_engine_gantry', 60, std.flattenArrays([
    [
      box('beam_' + i, 'frame', [gantry[i] - 0.04, s.ladderY - 0.04, -0.5], [gantry[i] + 0.04, s.ladderY, 0.5]),
    ] + k.bothSides([
      box('post_' + i, 'frame', [gantry[i] - 0.03, s.bodyTop, 0.44], [gantry[i] + 0.03, s.ladderY - 0.04, 0.5]),
    ])
    for i in std.range(0, 2)
  ]), finish) + { title: 'Fire engine gantry' },
  k.compound('fire_engine_pump_panel', 380, [
    box('panel', 'alu', [s.bodyRear - 0.02, 1.2, -0.82], [s.bodyRear, 2.2, 0.82]),
    box('surround', 'dark', [s.bodyRear - 0.015, 2.2, -0.82], [s.bodyRear, 2.25, 0.82]),
  ] + [
    box('gauge_' + i, 'gauge', [s.bodyRear - 0.03, 1.98, -0.64 + i * 0.32 - 0.06], [s.bodyRear - 0.02, 2.1, -0.64 + i * 0.32 + 0.06])
    for i in std.range(0, 4)
  ] + k.bothSides([
    box('valve', 'hose', [s.bodyRear - 0.1, 1.42, 0.42], [s.bodyRear - 0.02, 1.62, 0.62]),
    box('outlet', 'chrome', [s.bodyRear - 0.16, 1.47, 0.47], [s.bodyRear - 0.1, 1.57, 0.57]),
    box('chevron', 'reflect', [s.bodyRear - 0.006, s.bodyFloor, 0.9], [s.bodyRear, s.bodyTop - 0.1, 1.2]),
  ]), finish) + { title: 'Fire engine pump panel' },
  k.compound('fire_engine_hose_reel', 70, k.bothSides([
    k.turned('drum', 'hose', 'z', k.disc(0.21, -0.18, 0.18), [s.bodyRear - 0.25, 2.6, 0.5]) + { sides: 16 },
    k.turned('flange_in', 'chrome', 'z', k.disc(0.25, -0.22, -0.18), [s.bodyRear - 0.25, 2.6, 0.5]) + { sides: 16 },
    k.turned('flange_out', 'chrome', 'z', k.annulus(0.12, 0.25, 0.18, 0.22), [s.bodyRear - 0.25, 2.6, 0.5]) + { sides: 16 },
    box('arm', 'frame', [s.bodyRear - 0.25, 2.57, 0.24], [s.bodyRear, 2.63, 0.28]),
  ]), finish) + { title: 'Fire engine hose reel' },
  k.compound('fire_engine_rear_step', 50, [
    box('tread', 'alu', [s.rear, 0.9, -s.bodySide + 0.1], [s.bodyRear, 0.95, s.bodySide - 0.1]),
    box('skirt', 'dark', [s.rear, 0.82, -s.bodySide + 0.1], [s.bodyRear, 0.9, s.bodySide - 0.1]),
  ], finish) + { title: 'Fire engine rear step' },
])
