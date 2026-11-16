local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local stow = import 'stowage-kit.libsonnet';
local slots = import 'models/stowage.libsonnet';
local box = k.box;
local s = import 'rescue_truck.spec.libsonnet';
local finish = { paint: s.paint, white: 'paint-white', frame: 'paint-charcoal', steel: 'steel-grey', alu: 'alu-bare', dark: 'plastic-black', hivis: 'plastic-hivis', blue: 'plastic-blue', yellow: 'plastic-yellow', orange: 'plastic-orange', wood: 'wood-pine', lamp: 'plastic-frosted', reflect: 'reflective-yellow', red: 'plastic-red', galv: 'steel-galvanised' };
local beams = [-3.3, -2.4, -1.5, -0.6, 0.3];
local blocks = std.range(0, 11);
local blockX0 = s.bodyRear + 0.1;
local blockLength = (s.bodyFront - 0.1 - blockX0) / 12;
local bar = 0.1;
local pitch = k.slatPitch;
local slats = std.range(0, std.ceil((s.shutterTop - s.shutterLow - bar) / pitch) - 1);
// The fire engine's body carries the lockers; stowed kit stands clear of the shutters' inner face.
local back = s.lockerBack;
local front = s.bodySide - 0.04 - 0.02;
local spans = s.lockerSpans;
// The rear compartment runs from the shutter to the racking, between the lockers' back walls.
local bay = { x: [s.bodyRear + 0.02, s.rackingRear], z: back - 0.04 };
// Heights above the locker floor.
local up(h) = s.bodyFloor + h;
// Each locker's fit-out, the shelves and board its kit stows on, and the slots the kit stows in. The kit is catalogue
// items a site's load-out names (rescue_truck.placements.libsonnet), so a game can loot it or stow more. Slots stay
// inside `front`, and the build keeps each item inside its slot (tools/stowage.mjs, loadOutProblems), so the shutters
// clear whatever a slot holds.
local middle = (back + front) / 2;
local outOf(z) = [back + 0.005 - z, front - z];
// Two rows of long kit lying side by side on a shelf, each row's envelope clear of the other's.
local rows = [{ id: 'back', z: back + 0.08, out: [-0.075, 0.075] }, { id: 'front', z: back + 0.235, out: [-0.075, front - back - 0.235] }];
local stowage = {
  fore: {
    fitOut: [
      stow.shelf('shelf_low', spans.fore, up(0.75), [back, front]),
      stow.shelf('shelf_high', spans.fore, up(1.3), [back, front]),
    ],
    slots: [
      slots.shelfSlot('floor_' + slot.id, ['machine'], [slot.x, s.bodyFloor, middle], slot.along, 0.65, outOf(middle))
      for slot in [{ id: 'a', x: -0.175, along: 0.6 }, { id: 'b', x: 0.48, along: 0.5 }]
    ] + [
      slots.shelfSlot('low_' + row.id, ['bar'], [-0.05, up(0.75), row.z], 0.84, 0.3, row.out)
      for row in rows
    ] + [
      slots.shelfSlot('high', ['bar'], [0.1, up(1.3), middle], 1.0, 0.3, outOf(middle)),
    ],
  },
  mid: {
    fitOut: [stow.shelf('shelf', spans.mid, up(0.45), [back, front])],
    slots: [
      slots.shelfSlot('pad_%s_%d' % [stack.id, layer], ['pad'], [stack.x, up(layer * 0.05), back + 0.145], 0.3, 0.05, [-0.14, front - back - 0.145])
      for stack in [{ id: 'a', x: -1.13 }, { id: 'b', x: -0.78 }]
      for layer in std.range(0, 3)
    ] + [
      slots.shelfSlot('case_%d' % layer, ['case', 'bottle'], [-1.15, up(0.45 + layer * 0.21), middle], 0.28, 0.21, outOf(middle))
      for layer in [0, 1]
    ] + [
      slots.shelfSlot('cylinder_%d' % i, ['bottle'], [-0.9 + i * 0.2, up(0.45), middle], 0.19, 0.7, outOf(middle))
      for i in [0, 1]
    ],
  },
  wheel: {
    fitOut: [
      stow.shelf('shelf_low', spans.wheel, up(0.5), [back, front]),
      stow.shelf('shelf_high', spans.wheel, up(1.15), [back, front]),
    ],
    slots: [
      slots.shelfSlot('block_%d_%s_%d' % [i, row.id, layer], ['block'], [-2.29 + i * 0.49, up(layer * 0.105), row.z], 0.47, 0.105, [-0.06, 0.06])
      for i in [0, 1]
      for row in [{ id: 'back', z: back + 0.07 }, { id: 'front', z: back + 0.2 }]
      for layer in std.range(0, 3)
    ] + [
      slots.shelfSlot('chock_%d' % i, ['block'], [-2.31 + i * 0.48, up(0.5), middle], 0.46, 0.3, outOf(middle))
      for i in [0, 1]
    ] + [
      slots.shelfSlot('strut_' + row.id, ['bar'], [-1.95, up(1.15), row.z], 1.12, 0.15, row.out)
      for row in rows
    ],
  },
  aft: {
    fitOut: [
      stow.shelf('shelf_low', spans.aft, up(0.6), [back, front]),
      stow.shelf('shelf_high', [spans.aft[0], -2.88], up(1.1), [back, front]),
      stow.board('board', [-2.84, -2.62], [up(0.75), up(1.75)], back),
    ],
    slots: [
      slots.shelfSlot('floor_machine', ['machine'], [-3.38, s.bodyFloor, middle], 0.56, 0.5, outOf(middle)),
      slots.shelfSlot('floor_case', ['case', 'bottle'], [-2.83, s.bodyFloor, middle], 0.44, 0.5, outOf(middle)),
      slots.shelfSlot('low_machine', ['machine'], [-3.3, up(0.6), middle], 0.86, 0.42, outOf(middle)),
      slots.shelfSlot('high_machine', ['machine'], [-3.3, up(1.1), middle], 0.86, 0.45, outOf(middle)),
      slots.boardSlot('hook', ['hung-tool'], [-2.73, up(1.72), back + 0.03125], 0.06, 1.0, front - back - 0.03125),
    ],
  },
};
// The rear compartment's kit faces the rear shutter: cases on the floor, first aid and cones on the low shelf and rope
// bags on the high one.
local bayMiddle = (bay.x[0] + bay.x[1]) / 2;
local rearStowage = {
  fitOut: [
    stow.shelf('shelf_low', bay.x, up(0.6), [-bay.z, bay.z]),
    stow.shelf('shelf_high', bay.x, up(1.2), [-bay.z, bay.z]),
  ],
  slots: [
    slots.baySlot('floor_%d' % i, ['case', 'bottle'], [bayMiddle, s.bodyFloor, (i - 1) * 0.55], 0.5, 0.55, 0.5)
    for i in [0, 1, 2]
  ] + [
    slots.baySlot('low_' + slot.id, slot.accepts, [bayMiddle, up(0.6), slot.z], slot.across, 0.5, 0.5)
    for slot in [
      { id: 'case_a', accepts: ['case', 'bottle'], z: -0.6, across: 0.3 },
      { id: 'case_b', accepts: ['case', 'bottle'], z: -0.22, across: 0.3 },
      { id: 'cone_a', accepts: ['cone'], z: 0.2, across: 0.32 },
      { id: 'cone_b', accepts: ['cone'], z: 0.56, across: 0.32 },
    ]
  ] + [
    slots.baySlot('high_%d' % i, ['bottle'], [bayMiddle, up(1.2), -0.5 + i * 0.27], 0.24, 0.45, 0.5)
    for i in [0, 1, 2]
  ],
};
taxonomy.inherit({ tags: { 'vehicle-body': ['truck'] } }, [
  k.compound('rescue_truck_racking', 2200, [
    box('racking', 'frame', [s.rackingRear, s.bodyFloor, -0.82], [0.4, s.bodyTop - 0.1, 0.82]),
  ], finish) + { title: 'Rescue truck racking' },
] + [
  k.compound('rescue_truck_locker_stowage_' + name, s.stowage[name].mass, stowage[name].fitOut, stow.finish) + { title: s.stowage[name].title }
  + slots.ports(stowage[name].slots)
  for name in std.objectFields(stowage)
] + [
  k.compound('rescue_truck_rear_stowage', s.rearStowage.mass, rearStowage.fitOut, stow.finish) + { title: s.rearStowage.title }
  + slots.ports(rearStowage.slots),
  k.compound('rescue_truck_marking', 8, k.bothSides([
    box('block_' + i, if i % 2 == 0 then 'hivis' else 'blue', [blockX0 + i * blockLength, s.bodyTop - 0.28, s.bodySide], [blockX0 + (i + 1) * blockLength, s.bodyTop - 0.1, s.bodySide + 0.032])
    for i in blocks
  ]), finish) + { title: 'Rescue truck marking' },
  // The curtain rolls up into the head and leaves its bar under it.
  k.compound('rescue_truck_rear_shutter', 40, [
    box('bar', 'dark', [s.bodyRear - 0.03, s.shutterLow, -s.shutterSide], [s.bodyRear, s.shutterLow + bar, s.shutterSide]),
  ] + [
    box('slat_' + i, if i % 2 == 0 then 'alu' else 'steel', [s.bodyRear - 0.03, s.shutterLow + bar + i * pitch, -s.shutterSide], [s.bodyRear, std.min(s.shutterLow + bar + (i + 1) * pitch, s.shutterTop), s.shutterSide])
    for i in slats
  ], finish, motion=k.motion.slide('up', s.shutterTop - s.shutterLow - bar, stow=true)) + { title: 'Rescue truck rear shutter' },
  k.compound('rescue_truck_rear_shutter_frame', 30, [
    box('head', 'frame', [s.bodyRear - 0.05, s.shutterTop, -s.shutterSide - 0.04], [s.bodyRear, s.shutterTop + 0.1, s.shutterSide + 0.04]),
  ] + k.bothSides([
    box('guide', 'frame', [s.bodyRear - 0.05, s.shutterLow, s.shutterSide], [s.bodyRear, s.shutterTop, s.shutterSide + 0.04]),
  ] + [
    box('chevron_' + i, if i % 2 == 0 then 'red' else 'reflect', [s.bodyRear - 0.01, s.bodyFloor + i * 0.3, s.shutterSide + 0.04], [s.bodyRear, s.bodyFloor + (i + 1) * 0.3, s.bodySide])
    for i in std.range(0, 5)
  ]), finish) + { title: 'Rescue truck rear shutter frame' },
  k.compound('rescue_truck_roof_rack', 170, [
    box('beam_' + i, 'frame', [beams[i] - 0.05, s.rackY - 0.05, -s.rackSide], [beams[i] + 0.05, s.rackY, s.rackSide])
    for i in std.range(0, std.length(beams) - 1)
  ] + [
    box('decking', 'galv', [s.rackRear, s.rackY, -s.rackSide], [s.rackFront, s.rackY + 0.03, s.rackSide]),
  ] + k.bothSides([
    box('rail', 'alu', [s.rackRear, s.rackY + 0.26, s.rackSide - 0.05], [s.rackFront, s.rackY + 0.31, s.rackSide]),
    box('rail_end_rear', 'alu', [s.rackRear, s.rackY + 0.26, 0], [s.rackRear + 0.05, s.rackY + 0.31, s.rackSide]),
    box('rail_end_front', 'alu', [s.rackFront - 0.05, s.rackY + 0.26, 0], [s.rackFront, s.rackY + 0.31, s.rackSide]),
  ] + std.flattenArrays([
    [
      box('stand_' + i, 'frame', [beams[i] - 0.04, s.bodyTop, s.rackSide - 0.1], [beams[i] + 0.04, s.rackY - 0.05, s.rackSide - 0.02]),
      box('upright_' + i, 'alu', [beams[i] - 0.025, s.rackY, s.rackSide - 0.05], [beams[i] + 0.025, s.rackY + 0.26, s.rackSide]),
    ]
    for i in std.range(0, std.length(beams) - 1)
  ])), finish) + { title: 'Rescue truck roof rack' },
  k.compound('rescue_truck_roof_gear', 320, [
    box('long_case', 'yellow', [-3.3, s.rackY + 0.03, 0.2], [-1.3, s.rackY + 0.36, 0.92]),
    box('long_case_lid', 'dark', [-3.3, s.rackY + 0.36, 0.2], [-1.3, s.rackY + 0.4, 0.92]),
    box('tool_case', 'orange', [-1.15, s.rackY + 0.03, 0.2], [-0.2, s.rackY + 0.42, 0.92]),
    box('tool_case_lid', 'dark', [-1.15, s.rackY + 0.42, 0.2], [-0.2, s.rackY + 0.46, 0.92]),
    box('cribbing_low', 'wood', [-3.3, s.rackY + 0.03, -0.92], [-2.0, s.rackY + 0.17, -0.2]),
    box('cribbing_high', 'wood', [-3.2, s.rackY + 0.17, -0.92], [-2.3, s.rackY + 0.31, -0.2]),
    box('strap_a', 'dark', [-3.05, s.rackY + 0.03, -0.92], [-2.95, s.rackY + 0.32, -0.2]),
    box('strap_b', 'dark', [-2.55, s.rackY + 0.03, -0.92], [-2.45, s.rackY + 0.32, -0.2]),
    box('stretcher_floor', 'orange', [-1.85, s.rackY + 0.03, -0.8], [0.25, s.rackY + 0.08, -0.26]),
  ] + [
    box('stretcher_side_a', 'orange', [-1.85, s.rackY + 0.08, -0.8], [0.25, s.rackY + 0.18, -0.75]),
    box('stretcher_side_b', 'orange', [-1.85, s.rackY + 0.08, -0.31], [0.25, s.rackY + 0.18, -0.26]),
    box('stretcher_end_a', 'orange', [-1.85, s.rackY + 0.08, -0.75], [-1.8, s.rackY + 0.18, -0.31]),
    box('stretcher_end_b', 'orange', [0.2, s.rackY + 0.08, -0.75], [0.25, s.rackY + 0.18, -0.31]),
  ], finish) + { title: 'Rescue truck roof gear' },
  k.compound('rescue_truck_light_mast', 90, [
    box('foot', 'frame', [s.mastX - 0.16, s.bodyTop, -0.16], [s.mastX + 0.0, s.bodyTop + 0.08, 0.16]),
    box('stage_a', 'white', [s.mastX - 0.13, s.bodyTop + 0.08, -0.1], [s.mastX - 0.03, 3.52, 0.1]),
    box('stage_b', 'steel', [s.mastX - 0.11, 3.52, -0.07], [s.mastX - 0.05, s.mastTop, 0.07]),
    box('head_bar', 'frame', [s.mastX - 0.12, s.mastTop, -0.72], [s.mastX - 0.04, s.mastTop + 0.08, 0.72]),
    box('lamp_a', 'frame', [s.mastX - 0.14, s.mastTop + 0.08, -0.72], [s.mastX, s.mastTop + 0.32, -0.3]),
    box('lamp_b', 'frame', [s.mastX - 0.14, s.mastTop + 0.08, 0.3], [s.mastX, s.mastTop + 0.32, 0.72]),
    box('glass_a', 'lamp', [s.mastX, s.mastTop + 0.1, -0.7], [s.mastX + 0.015, s.mastTop + 0.3, -0.32]),
    box('glass_b', 'lamp', [s.mastX, s.mastTop + 0.1, 0.32], [s.mastX + 0.015, s.mastTop + 0.3, 0.7]),
  ], finish) + { title: 'Rescue truck light mast' },
  k.compound('rescue_truck_winch', 130, [
    box('cradle_base', 'frame', [s.front, 0.72, -0.42], [s.front + 0.26, 0.78, 0.42]),
    box('cheek_near', 'frame', [s.front, 0.78, 0.34], [s.front + 0.26, 1.0, 0.4]),
    box('cheek_far', 'frame', [s.front, 0.78, -0.4], [s.front + 0.26, 1.0, -0.34]),
    k.turned('drum', 'dark', 'z', k.disc(0.09, -0.34, 0.34), [s.front + 0.13, 0.89, 0]) + { sides: 12 },
    box('fairlead', 'steel', [s.front + 0.26, 0.82, -0.14], [s.front + 0.3, 0.96, 0.14]),
    box('hook', 'yellow', [s.front + 0.3, 0.86, -0.04], [s.front + 0.36, 0.94, 0.04]),
  ], finish) + { title: 'Rescue truck winch' },
])
