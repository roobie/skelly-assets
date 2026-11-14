local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local stow = import 'stowage-kit.libsonnet';
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
local round(piece) = piece + { sides: 16 };
// The fire engine's body carries the lockers; stowed kit stands clear of the shutters' inner face.
local back = s.lockerBack;
local front = s.bodySide - 0.04 - 0.02;
local spans = s.lockerSpans;
// The rear compartment runs from the shutter to the racking, between the lockers' back walls.
local bay = { x: [s.bodyRear + 0.02, s.rackingRear], z: back - 0.04 };
// Heights above the locker floor.
local up(h) = s.bodyFloor + h;
local stowFinish = stow.finish + { tool: 'plastic-yellow', hydraulic: 'plastic-orange', bag: 'rubber-black', case_a: 'plastic-red', case_b: 'plastic-orange', case_c: 'plastic-yellow', saw: 'plastic-orange', generator: 'paint-red', rope: 'cloth-blue' };
// A hydraulic tool lying on a shelf: its body, and two jaws tapering from it.
local jaws(id, x, y, z, length) = [
  box(id + '_body', 'tool', [x, y, z[0]], [x + length * 0.55, y + 0.14, z[1]]),
  box(id + '_handle', 'lid', [x + length * 0.15, y + 0.14, (z[0] + z[1]) / 2 - 0.03], [x + length * 0.4, y + 0.2, (z[0] + z[1]) / 2 + 0.03]),
  k.bar(id + '_jaw_a', 'steel', [x + length * 0.55, y + 0.1], [x + length, y + 0.075], 0.06, z),
  k.bar(id + '_jaw_b', 'steel', [x + length * 0.55, y + 0.04], [x + length, y + 0.065], 0.06, z),
];
local stowage = {
  fore: [
    box('pack', 'tool', [-0.45, s.bodyFloor, back + 0.06], [0.1, up(0.35), front - 0.02]),
    box('pack_engine', 'engine', [-0.4, up(0.35), back + 0.09], [0.05, up(0.53), back + 0.26]),
    round(k.turned('reel_flange', 'steel', 'z', k.disc(0.24, back + 0.07, back + 0.1), [0.42, up(0.3), 0])),
    round(k.turned('reel_drum', 'hydraulic', 'z', k.disc(0.2, back + 0.1, back + 0.29), [0.42, up(0.3), 0])),
    round(k.turned('reel_hub', 'steel', 'z', k.disc(0.06, back + 0.29, front), [0.42, up(0.3), 0])),
    box('reel_stand', 'steel', [0.24, s.bodyFloor, back + 0.08], [0.6, up(0.06), back + 0.26]),
    stow.shelf('shelf_low', spans.fore, up(0.75), [back, front]),
    stow.shelf('shelf_high', spans.fore, up(1.3), [back, front]),
    round(k.turned('ram', 'tool', 'x', k.disc(0.06, -0.45, 0.55), [0, up(1.36), back + 0.14])),
    round(k.turned('ram_head', 'steel', 'x', k.disc(0.075, 0.55, 0.65), [0, up(1.36), back + 0.14])),
  ] + jaws('spreader', -0.45, up(0.75), [back + 0.09, back + 0.27], 0.75) + jaws('cutter', 0.35, up(0.75), [back + 0.09, back + 0.27], 0.4),
  mid: [
    box('bag_' + i, if i % 2 == 0 then 'bag' else 'tool', [-1.26, up(i * 0.0625), back + 0.04], [-0.66, up((i + 1) * 0.0625), front - 0.02])
    for i in std.range(0, 4)
  ] + [
    stow.shelf('shelf', spans.mid, up(0.45), [back, front]),
    stow.strap('bag_strap', [-1.26, -0.66], up(0.15), front - 0.02 - 0.03125),
  ] + stow.case('controller', 'case_c', [-1.26, up(0.45), back + 0.06], [-0.95, up(0.7), front - 0.03])
    + std.flattenArrays([stow.cylinder('air_' + i, -0.82, up(0.45), back + 0.1 + i * 0.14, 0.07, 0.75, 'steel') for i in [0, 1]])
    + stow.case('hoses', 'case_b', [-1.26, up(0.7), back + 0.06], [-0.95, up(0.95), front - 0.03]),
  wheel: stow.cribbing('crib_low', -2.5, s.bodyFloor, [back + 0.04, front - 0.02], 8, 4)
    + [
      stow.shelf('shelf_low', spans.wheel, up(0.5), [back, front]),
      stow.shelf('shelf_high', spans.wheel, up(1.15), [back, front]),
    ] + std.flattenArrays([
      [
        k.prism('chock_' + i, 'timber', [[-2.5 + i * 0.3, up(0.5)], [-2.25 + i * 0.3, up(0.5)], [-2.25 + i * 0.3, up(0.75)], [-2.5 + i * 0.3, up(0.57)]], [back + 0.06, front - 0.02]),
      ]
      for i in [0, 1, 2]
    ]) + [
      box('strut_' + i, if i == 0 then 'tool' else 'steel', [-2.5, up(1.15), back + 0.09 + i * 0.1], [-1.4, up(1.23), back + 0.17 + i * 0.1])
      for i in [0, 1]
    ],
  aft: [
    box('generator_frame', 'steel', [-3.7, s.bodyFloor, back + 0.06], [-3.05, up(0.04), front - 0.02]),
    box('generator', 'generator', [-3.66, up(0.04), back + 0.08], [-3.09, up(0.47), front - 0.04]),
    box('generator_panel', 'lid', [-3.5, up(0.15), front - 0.04], [-3.25, up(0.35), front - 0.02]),
    box('generator_bar', 'steel', [-3.7, up(0.47), back + 0.26], [-3.05, up(0.51), front - 0.02]),
    stow.shelf('shelf', spans.aft, up(0.6), [back, front]),
    stow.board('board', [-3.74, -2.62], [up(0.6), up(1.7)], back),
    box('saw_body', 'saw', [-3.62, up(0.85), back + 0.03], [-3.38, up(1.07), back + 0.18]),
    box('saw_bar', 'steel', [-3.38, up(0.91), back + 0.08], [-2.95, up(0.99), back + 0.12]),
    round(k.turned('cutter_disc', 'steel', 'z', k.disc(0.15, back + 0.09, back + 0.13), [-3.2, up(1.4), 0])),
    box('cutter_body', 'saw', [-3.62, up(1.33), back + 0.06], [-3.32, up(1.51), back + 0.2]),
  ] + stow.hungTool('sledge', -2.8, up(0.7), 0.85, [0.16, 0.1], back + 0.03125)
    + stow.case('chains', 'case_a', [-2.95, s.bodyFloor, back + 0.06], [-2.65, up(0.3), front - 0.03]),
};
local rearStowage = [
  stow.shelf('shelf_low', bay.x, up(0.6), [-bay.z, bay.z]),
  stow.shelf('shelf_high', bay.x, up(1.2), [-bay.z, bay.z]),
] + stow.case('kit_a', 'case_b', [-3.8, s.bodyFloor, -0.78], [-3.34, up(0.4), -0.05])
  + stow.case('kit_b', 'case_c', [-3.8, s.bodyFloor, 0.05], [-3.34, up(0.3), 0.78])
  + stow.case('first_aid', 'case_a', [-3.8, up(0.6), -0.78], [-3.4, up(0.9), -0.3])
  + stow.case('lights', 'case_c', [-3.8, up(0.6), -0.2], [-3.4, up(0.95), 0.35])
  + std.flattenArrays([
    [round(k.turned('rope_' + i, 'rope', 'y', k.disc(0.12, up(1.2), up(1.6)), [-3.6, 0, i * 0.27 - 0.5]))]
    for i in [0, 1, 2]
  ]) + std.flattenArrays([stow.cone('cone_' + i, -3.6, up(0.6 + i * 0.08), 0.6) for i in [0, 1]]);
taxonomy.inherit({ tags: { 'vehicle-body': ['truck'] } }, [
  k.compound('rescue_truck_racking', 2200, [
    box('racking', 'frame', [s.rackingRear, s.bodyFloor, -0.82], [0.4, s.bodyTop - 0.1, 0.82]),
  ], finish) + { title: 'Rescue truck racking' },
] + [
  k.compound('rescue_truck_locker_stowage_' + name, s.stowage[name].mass, stowage[name], stowFinish) + { title: s.stowage[name].title }
  for name in std.objectFields(stowage)
] + [
  k.compound('rescue_truck_rear_stowage', s.rearStowage.mass, rearStowage, stowFinish) + { title: s.rearStowage.title },
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
