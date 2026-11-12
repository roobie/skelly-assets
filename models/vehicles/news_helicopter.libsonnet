local taxonomy = import 'tools/jsonnet/lib/taxonomy.libsonnet';
local k = import 'kit.libsonnet';
local h = import 'helicopter-kit.libsonnet';
local s = import 'news_helicopter.spec.libsonnet';
local box = k.box;
local turned = k.turned;
local trim = 'paint-charcoal';
local lower(id, x) =
  h.shell(id + '_band_near', 'band', s.body, thick=0.0625, x=x, arc=[90, s.bandArc], sides=48)
  + h.shell(id + '_band_far', 'band', s.body, thick=0.0625, x=x, arc=[360 - s.bandArc, 270], sides=48)
  + h.shell(id + '_keel', 'paint', s.body, thick=0.0625, x=x, arc=[s.bandArc, 360 - s.bandArc]);
local core = [
  station + { top: station.top - 0.05, bottom: station.bottom + 0.05, half: std.max(station.half - 0.05, 0.03) }
  for station in s.body
];
local proudCowl = h.proud(s.cowl, 0.035);
taxonomy.inherit({ tags: { 'vehicle-body': ['helicopter'] } }, [
  k.compound('news_helicopter_belly', s.shellMass,
             h.loft('core', 'floor', core, x=[s.doorRear, s.noseCap], arc=[90, 270])
             + lower('skin', [s.doorRear, s.nose - 0.02]),
             { paint: s.paint, band: s.band, floor: trim }) + { title: 'News helicopter belly' },
  k.compound('news_helicopter_rear_fairing', 25,
             h.shell('top', 'paint', s.body, thick=0.0625, x=[s.tail, s.doorRear], arc=h.dome)
             + lower('skin', [s.tail, s.doorRear])
             + h.loft('bulkhead', 'floor', s.body, x=[s.doorRear - 0.05, s.doorRear], step=0.05)
             + h.loft('tail_end', 'paint', s.body, x=[s.tail, s.tail + 0.05], step=0.05),
             { paint: s.paint, band: s.band, floor: trim }) + { title: 'News helicopter rear fairing' },
  k.compound('news_helicopter_nose_cap', 6,
             h.loft('cap', 'paint', s.body, x=[s.noseCap, s.nose], arc=h.dome, step=0.04),
             { paint: s.paint }) + { title: 'News helicopter nose cap' },
  k.compound('news_helicopter_windscreen', 15,
             h.shell('screen', 'glass', s.body, x=[s.doorFront + 0.035, s.noseCap], arc=h.dome)
             + h.shell('post', 'frame', s.body, x=[s.doorFront + 0.035, s.noseCap], arc=[-4, 4], sides=48),
             { glass: 'glass-clear', frame: s.paint }) + { title: 'News helicopter windscreen' },
  k.compound('news_helicopter_roof', 30,
             h.shell('roof', 'paint', s.body, x=[s.doorRear, s.doorFront + 0.035], arc=[-s.roofArc, s.roofArc])
             + h.bow('front_bow', s.body, s.doorFront)
             + h.bow('mid_bow', s.body, s.doorMid)
             + h.bow('rear_bow', s.body, s.doorRear + 0.035),
             { paint: s.paint }) + { title: 'News helicopter roof' },
  h.door('news_helicopter_front_door', 15, s.body, s.doorMid, s.doorFront, s.roofArc, s.paint) + { title: 'News helicopter front door' },
  h.door('news_helicopter_rear_door', 14, s.body, s.doorRear, s.doorMid, s.roofArc, s.paint) + { title: 'News helicopter rear door' },
  k.compound('news_helicopter_engine_cowl', 22,
             h.loft('cowl', 'paint', s.cowl)
             + h.shell('intake_near', 'dark', proudCowl, thick=0.05, x=[-0.8, -0.42], arc=[50, 110], sides=24)
             + h.shell('intake_far', 'dark', proudCowl, thick=0.05, x=[-0.8, -0.42], arc=[250, 310], sides=24)
             + [
               turned('pylon', 'paint', 'y', [[2.1, 0], [2.1, 0.34], [2.55, 0.14], [2.55, 0], [2.1, 0]]) + { sides: 12 },
               turned('exhaust', 'dark', 'x', k.annulus(0.05, 0.14, -2.02, -1.78), [0, 2.08, 0]) + { sides: 12 },
             ],
             { paint: s.band, dark: trim }) + { title: 'News helicopter engine cowl' },
  k.compound('news_helicopter_tail_boom', 35,
             h.boom('boom', 'paint', { x: -2.1, y: 1.6, r: 0.17 }, { x: s.tailRotor.x + 0.1, y: s.tailRotor.y, r: 0.07 })
             + [box('gearbox', 'dark', [s.tailRotor.x - 0.1, s.tailRotor.y - 0.08, -0.08], [s.tailRotor.x + 0.1, s.tailRotor.y + 0.08, 0.08])],
             { paint: s.paint, dark: trim }) + { title: 'News helicopter tail boom' },
  k.compound('news_helicopter_tail_surfaces', 8, [
    h.fin('fin', 'paint', [[-5.0, 1.7], [-5.55, 1.7], [-5.86, 2.72], [-5.5, 2.72]]),
    h.fin('ventral', 'paint', [[-5.14, 1.76], [-5.5, 1.76], [-5.72, 1.08], [-5.46, 1.08]]),
    box('stabiliser', 'paint', [-3.92, 1.64, -0.98], [-3.56, 1.7, 0.98]),
  ] + k.bothSides([
    box('endplate', 'paint', [-3.98, 1.5, 0.94], [-3.5, 1.84, 1.0]),
  ]), { paint: s.band }) + { title: 'News helicopter tail surfaces' },
  h.tailRotor('news_helicopter_tail_rotor', 6, s.tailRotor.radius, chord=0.14, shaft=s.tailRotor.z) + { title: 'News helicopter tail rotor' },
  h.mainRotor('news_helicopter_main_rotor', 70, s.rotorRadius, chord=0.28, droop=0.28) + { title: 'News helicopter main rotor' },
  h.mast('news_helicopter_mast', 20, s.hub - s.mastFoot) + { title: 'News helicopter mast' },
  k.compound('news_helicopter_main_gearbox', 60, [
    turned('case', 'steel', 'y', [[0, 0], [0, 0.22], [0.2, 0.15], [0.36, 0.09], [0.36, 0], [0, 0]]) + { sides: 12 },
  ], { steel: 'steel-grey' }) + { title: 'News helicopter main gearbox' },
  h.turbine('news_helicopter_turbine', 72, 0.9, 0.2) + { title: 'News helicopter turbine' },
  k.compound('news_helicopter_fuel_tank', 12, [
    box('tank', 'alu', [-0.25, 0, -0.42], [0.25, 0.6, 0.42]),
  ], { alu: 'alu-bare' }) + { title: 'News helicopter fuel tank' },
  h.skids('news_helicopter_skids', 40, [-1.05, 1.4], 0.98, [
    { x: 0.95, top: 0.62, root: 0.44 },
    { x: -0.35, top: 0.66, root: 0.42 },
  ]) + { title: 'News helicopter skids' },
  k.compound('news_helicopter_rear_bench', 12, [
    box('pan', 'dark', [-0.24, 0, -0.56], [0.22, 0.08, 0.56]),
    box('cushion', 'seat', [-0.24, 0.08, -0.56], [0.22, 0.18, 0.56]),
    k.prism('back', 'seat', [[-0.3, 0.14], [-0.2, 0.14], [-0.24, 0.78], [-0.33, 0.78]], [-0.56, 0.56]),
  ], { dark: trim, seat: 'cloth-seat' }) + { title: 'News helicopter rear bench' },
  k.compound('news_helicopter_console', 8, [
    box('pedestal', 'dark', [-0.12, 0, -0.14], [0.12, 0.34, 0.14]),
    k.prism('panel', 'dark', [[-0.08, 0.34], [0.14, 0.34], [0.06, 0.62], [-0.08, 0.6]], [-0.42, 0.42]),
  ], { dark: 'plastic-black' }) + { title: 'News helicopter console' },
  k.compound('news_helicopter_camera_ball', 22, [
    turned('ball', 'ball', 'y', [[-0.2, 0], [-0.2, 0.12], [-0.12, 0.2], [0.12, 0.2], [0.2, 0.12], [0.2, 0], [-0.2, 0]]) + { sides: 16 },
    turned('stem', 'dark', 'y', k.disc(0.06, 0.2, 0.42)) + { sides: 8 },
    turned('hood', 'dark', 'x', k.disc(0.12, 0.14, 0.22), [0, 0.02, 0]) + { sides: 12 },
    turned('lens', 'lens', 'x', k.disc(0.08, 0.22, 0.25), [0, 0.02, 0]) + { sides: 12 },
  ], { ball: 'paint-white', dark: trim, lens: 'lens-germanium' }) + { title: 'News helicopter camera ball' },
  k.compound('news_helicopter_downlink_dome', 3, [
    turned('dome', 'dome', 'y', [[-0.14, 0], [-0.14, 0.12], [-0.06, 0.2], [0.14, 0.2], [0.14, 0], [-0.14, 0]]) + { sides: 16 },
  ], { dome: 'paint-white' }) + { title: 'News helicopter downlink dome' },
])
