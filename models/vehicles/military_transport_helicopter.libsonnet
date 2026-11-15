local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local h = import 'helicopter-kit.libsonnet';
local m = import 'machine-kit.libsonnet';
local vehicle = import 'military_transport_helicopter.placements.libsonnet';
local s = import 'military_transport_helicopter.spec.libsonnet';
local box = k.box;
local e = s.engine;
local hull = (import 'military-helicopter-body.libsonnet').rows('military_transport_helicopter', vehicle.title, s);
taxonomy.inherit({ tags: { 'vehicle-body': ['helicopter'] } }, hull + [
  h.tailRotor('military_transport_helicopter_tail_rotor', 60, s.tailRotor.radius, blades=4, chord=0.22, shaft=s.tailRotor.z, phase=15) + { title: 'Military transport helicopter tail rotor' },
  h.mainRotor('military_transport_helicopter_main_rotor', 450, s.rotorRadius, blades=4, chord=0.52, droop=0.4, phase=20, hub=0.28, segments=14) + { title: 'Military transport helicopter main rotor' },
  h.mast('military_transport_helicopter_mast', 80, s.hub - s.mastFoot, radius=0.08) + { title: 'Military transport helicopter mast' },
  k.compound('military_transport_helicopter_main_gearbox', 500, [
    k.turned('case', 'steel', 'y', [[0, 0], [0, 0.42], [0.2, 0.3], [0.34, 0.18], [0.34, 0], [0, 0]]) + { sides: 16 },
  ], { steel: 'steel-grey' }) + { title: 'Military transport helicopter main gearbox' },
  h.turbine('military_transport_helicopter_turbine', 210, e.length, e.radius) + { title: 'Military transport helicopter turbine' },
  k.compound('military_transport_helicopter_fuel_tank', 110, [
    box('tank', 'alu', [-0.45, 0, -0.5], [0.45, 0.9, 0.5]),
  ], { alu: 'alu-bare' }) + { title: 'Military transport helicopter fuel tank' },
  h.mainGear('military_transport_helicopter_main_gear', 45, s.mainGear.x, s.mainGear.radius, s.mainGear.width, s.mainGear.z, s.mainGear.top, s.mainGear.root) + { title: 'Military transport helicopter main gear' },
  m.wheel('military_transport_helicopter_main_wheel', 48, s.mainGear.width, 0.2, s.mainGear.radius) + { title: 'Military transport helicopter main wheel' },
  m.wheel('military_transport_helicopter_tail_wheel', 14, s.tailGear.width, 0.14, s.tailGear.radius) + { title: 'Military transport helicopter tail wheel' },
  k.compound('military_transport_helicopter_crew_seat', 22, [
    box('pan', 'dark', [-0.26, 0, -0.26], [0.24, 0.3, 0.26]),
    box('cushion', 'seat', [-0.26, 0.3, -0.25], [0.24, 0.4, 0.25]),
    k.prism('back', 'seat', [[-0.34, 0.34], [-0.24, 0.34], [-0.26, 1.0], [-0.36, 1.0]], [-0.25, 0.25]),
  ], { dark: s.trim, seat: 'cloth-seat' }) + { title: 'Military transport helicopter crew seat' },
  k.compound('military_transport_helicopter_console', 18, [
    box('pedestal', 'dark', [-0.2, 0, -0.16], [0.2, 0.4, 0.16]),
    k.prism('panel', 'dark', [[-0.12, 0.4], [0.2, 0.4], [0.1, 0.72], [-0.12, 0.7]], [-0.75, 0.75]),
  ], { dark: 'plastic-black' }) + { title: 'Military transport helicopter console' },
  k.compound('military_transport_helicopter_landing_lamp', 4, [
    box('housing', 'dark', [-0.12, -0.1, -0.12], [0.12, 0.1, 0.12]),
    box('lens', 'lens', [-0.1, -0.13, -0.1], [0.1, -0.1, 0.1]),
  ], { dark: s.trim, lens: 'plastic-frosted' }) + { title: 'Military transport helicopter landing lamp' },
])
