local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local t = import 'truck-cab.libsonnet';
local k = import 'kit.libsonnet';
local stow = import 'stowage-kit.libsonnet';
local slots = import 'models/stowage.libsonnet';
local box = k.box;
local s = import 'fire_engine.spec.libsonnet';
local vehicle = import 'fire_engine.placements.libsonnet';
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
// Heights above the locker floor.
local up(h) = s.bodyFloor + h;
// Each locker's fit-out, the shelves, board and strap its kit stows on, and the slots the kit stows in. The kit is
// catalogue items a site's load-out names (fire_engine.placements.libsonnet), so a game can loot it or stow more.
// Slots stay inside `front`, so the shutters clear whatever a slot holds.
local middle = (back + front) / 2;
local outOf(z) = [back + 0.005 - z, front - z];
local cylinders = [-0.36 + i * 0.24 for i in std.range(0, 4)];
local hoseRolls = [-2.35, -1.95, -1.55];
local stowage = {
  fore: {
    fitOut: [
      stow.strap('cylinder_strap', [-0.46, 0.73], up(0.4), back + 0.26),
      stow.shelf('shelf_low', lockerSpans.fore, up(0.75), [back, front]),
      stow.shelf('shelf_high', lockerSpans.fore, up(1.3), [back, front]),
    ],
    slots: [
      slots.shelfSlot('cylinder_%d' % i, ['bottle'], [cylinders[i], s.bodyFloor, back + 0.17], 0.22, 0.68, [-0.165, 0.09])
      for i in std.range(0, 4)
    ] + [
      slots.shelfSlot('low_' + slot.id, ['case', 'bottle'], [slot.x, up(0.75), middle], slot.along, 0.5, outOf(middle))
      for slot in [{ id: 'a', x: -0.25, along: 0.44 }, { id: 'b', x: 0.22, along: 0.44 }, { id: 'c', x: 0.6, along: 0.3 }]
    ] + [
      slots.shelfSlot('sheet_%s_%d' % [slot.id, layer], ['sheet'], [slot.x, up(1.3 + layer * 0.075), middle], 0.44, 0.075, outOf(middle))
      for slot in [{ id: 'a', x: -0.25 }, { id: 'b', x: 0.22 }]
      for layer in [0, 1, 2]
    ] + [
      slots.shelfSlot('high_c', ['case', 'bottle'], [0.6, up(1.3), middle], 0.3, 0.5, outOf(middle)),
    ],
  },
  mid: {
    fitOut: [stow.board('board', [-1.29, -0.62], [up(0.3), up(1.73)], back)],
    slots: [
      slots.boardSlot('hook_' + slot.id, ['hung-tool'], [slot.x, up(1.7), back + 0.03125], slot.along, 1.0, front - back - 0.03125)
      for slot in [{ id: 'a', x: -1.135, along: 0.32 }, { id: 'b', x: -0.845, along: 0.25 }, { id: 'c', x: -0.69, along: 0.06 }, { id: 'd', x: -0.635, along: 0.04 }]
    ] + [
      slots.shelfSlot('floor_' + slot.id, ['bottle', 'case'], [slot.x, s.bodyFloor, back + 0.17], 0.28, 0.6, [-0.12, front - back - 0.17])
      for slot in [{ id: 'a', x: -1.15 }, { id: 'b', x: -0.85 }]
    ],
  },
  wheel: {
    fitOut: [
      stow.shelf('shelf_low', lockerSpans.wheel, up(0.77), [back, front]),
      stow.shelf('shelf_high', lockerSpans.wheel, up(1.25), [back, front]),
    ],
    slots: [
      slots.shelfSlot('roll_%d_%d' % [layer, i], ['hose-roll'], [hoseRolls[i], up(layer * 0.365), back + 0.2], 0.38, 0.365, [-0.05, 0.1])
      for layer in [0, 1]
      for i in [0, 1, 2]
    ] + [
      slots.shelfSlot('roll_top_%d' % i, ['hose-roll'], [-2.36 + i * 0.39, up(1.25), back + 0.2], 0.38, 0.365, [-0.05, 0.1])
      for i in [0, 1]
    ] + [
      slots.shelfSlot('bar_back', ['bar'], [-1.75, up(0.77), back + 0.1], 0.72, 0.15, [-0.095, 0.07]),
      slots.shelfSlot('bar_fore', ['bar'], [-2.32, up(0.77), back + 0.1], 0.4, 0.12, [-0.095, 0.065]),
      slots.shelfSlot('bar_front', ['bar'], [-2.32, up(0.77), back + 0.24], 0.4, 0.12, [-0.065, front - back - 0.24]),
      slots.shelfSlot('bar_top', ['bar'], [-1.572, up(1.25), middle], 0.444, 0.15, outOf(middle)),
    ],
  },
  aft: {
    fitOut: [stow.shelf('shelf', lockerSpans.aft, up(0.8), [back, front])],
    slots: [
      slots.shelfSlot('floor_machine', ['machine'], [-3.4, s.bodyFloor, back + 0.17], 0.64, 0.6, [-0.165, front - back - 0.17]),
      slots.shelfSlot('floor_cone', ['cone'], [-2.82, s.bodyFloor, middle], 0.32, 0.47, outOf(middle)),
      slots.shelfSlot('shelf_machine', ['machine'], [-3.4, up(0.8), back + 0.17], 0.6, 0.62, [-0.165, front - back - 0.17]),
      slots.shelfSlot('shelf_case', ['case', 'bottle'], [-2.85, up(0.8), middle], 0.44, 0.5, outOf(middle)),
    ],
  },
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
  k.compound('fire_engine_locker_stowage_' + name, s.stowage[name].mass, stowage[name].fitOut, stow.finish) + { title: s.stowage[name].title }
  + slots.ports(stowage[name].slots)
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
