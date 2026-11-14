// Kit fire and rescue vehicles carry in their lockers, each piece a thing of its own so a game can loot it or stow it
// again.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local stow = import 'models/stowage.libsonnet';
local box = h.box;
local turned = h.turned;
local disc = h.disc;
local prism = h.prism;
local firefighting(category, material) = { taxonomy: { category: category, keywords: ['firefighting'], tags: { material: material, setting: ['modern'] } } };
// The body of a hydraulic rescue tool lying along x from `x0` to `x1` with radius `r`, its axis 100 mm up: a carry
// handle over it and two hose couplings standing behind the handle.
local hydraulicBody(x0, x1, r) = [
  turned('body', 'body', 'x', [[0, 0], [0, r], [x1 - x0, r], [x1 - x0, 0]], [x0, 0.1, 0]),
  box('handle-aft', 'grip', [x0 + 0.06, 0.1 + r - 0.01, -0.015], [x0 + 0.08, 0.15 + r, 0.015]),
  box('handle-fore', 'grip', [x1 - 0.1, 0.1 + r - 0.01, -0.015], [x1 - 0.08, 0.15 + r, 0.015]),
  box('handle', 'grip', [x0 + 0.06, 0.15 + r, -0.015], [x1 - 0.08, 0.175 + r, 0.015]),
] + [
  turned('coupling-%d' % i, 'coupling', 'y', [[0, 0], [0, 0.018], [0.04, 0.018], [0.04, 0]], [x0 + 0.025, 0.09 + r, 0.03 * (2 * i - 1)])
  for i in [0, 1]
];
local hydraulicFinish = { body: 'plastic-yellow', grip: 'plastic-black', coupling: 'steel-stainless', steel: 'steel-grey' };
[
  // A 6.8 litre breathing air cylinder 650 mm tall: a yellow wrapped cylinder 170 mm across with a domed shoulder, a
  // pale label band, a chrome valve with a black handwheel on -x and its outlet facing the front.
  h.compound('breathing_air_cylinder', 8, [
    turned('body', 'body', 'y', [[0, 0], [0, 0.081], [0.008, 0.085], [0.5, 0.085], [0.56, 0.06], [0.585, 0.025], [0.585, 0]]),
    disc('band', 'label', 0.0865, 0.3, 0.38),
    disc('neck', 'valve', 0.02, 0.585, 0.605),
    box('valve', 'valve', [-0.025, 0.6, -0.02], [0.03, 0.645, 0.02]),
    turned('wheel', 'wheel', 'x', [[0, 0], [0, 0.03], [0.014, 0.03], [0.014, 0]], [-0.04, 0.622, 0]),
    turned('outlet', 'valve', 'z', [[0, 0], [0, 0.012], [0.03, 0.012], [0.03, 0]], [0, 0.622, 0.02]),
  ], { body: 'plastic-yellow', label: 'paper-white', valve: 'steel-stainless', wheel: 'plastic-black' }) + { title: 'Breathing air cylinder' }
  + stow.stows(stow.resting('bottle', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['plastic', 'metal']),

  // A 25 m length of 45 mm lay-flat hose rolled 360 mm across and standing on its rim, its face to the front and
  // its coupling at the hub.
  h.compound('fire_hose_roll', 9, [
    turned('roll', 'hose', 'z', [[0, 0.04], [0, 0.18], [0.07, 0.18], [0.07, 0.04], [0, 0.04]], [0, 0.18, -0.035]),
    turned('hub', 'hose', 'z', [[0, 0], [0, 0.04], [0.07, 0.04], [0.07, 0]], [0, 0.18, -0.035]),
    turned('coupling', 'coupling', 'z', [[0, 0], [0, 0.034], [0.05, 0.034], [0.05, 0]], [0, 0.18, 0.02]),
    turned('lugs', 'coupling', 'z', [[0, 0], [0, 0.046], [0.012, 0.046], [0.012, 0]], [0, 0.18, 0.05]),
  ], { hose: 'cloth-cream', coupling: 'alu-bare' }) + { title: 'Fire hose roll' }
  + stow.stows(stow.resting('hose-roll', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['fabric', 'metal']),

  // A hydrant standpipe 680 mm long lying on its side: an aluminium pipe with a brass foot coupling on -x and a red
  // head on +x with two outlets.
  h.compound('standpipe', 9, [
    turned('foot', 'coupling', 'x', [[0, 0], [0, 0.045], [0.04, 0.045], [0.04, 0]], [-0.34, 0.06, 0]),
    turned('pipe', 'pipe', 'x', [[0, 0], [0, 0.035], [0.48, 0.035], [0.48, 0]], [-0.3, 0.06, 0]),
    box('head', 'head', [0.18, 0, -0.055], [0.28, 0.12, 0.055]),
  ] + [
    turned('outlet-%d' % i, 'coupling', 'x', [[0, 0], [0, 0.025], [0.06, 0.025], [0.06, 0]], [0.28, 0.06, 0.028 * (2 * i - 1)])
    for i in [0, 1]
  ], { coupling: 'brass', pipe: 'alu-bare', head: 'paint-red' }) + { title: 'Standpipe' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['metal']),

  // A hydrant key 420 mm long lying flat: a steel bar with a T handle 240 mm across at -x and a square socket at +x.
  h.compound('hydrant_key', 2.5, [
    box('bar', 'steel', [-0.188, 0, -0.011], [0.172, 0.022, 0.011]),
    box('handle', 'steel', [-0.21, 0, -0.12], [-0.188, 0.022, 0.12]),
    box('socket', 'socket', [0.172, 0, -0.018], [0.21, 0.036, 0.018]),
  ], { steel: 'paint-red', socket: 'steel-grey' }) + { title: 'Hydrant key' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['metal']),

  // A hose branch 350 mm long lying on its side: a coupling on -x, an aluminium barrel tapering to its tip at +x, a
  // rubber grip and a shut-off lever along its top.
  h.compound('branch_nozzle', 2, [
    turned('coupling', 'coupling', 'x', [[0, 0], [0, 0.04], [0.05, 0.04], [0.05, 0]], [-0.2, 0.045, 0]),
    turned('barrel', 'barrel', 'x', [[0, 0], [0, 0.035], [0.2, 0.03], [0.3, 0.02], [0.3, 0]], [-0.15, 0.045, 0]),
    turned('grip', 'grip', 'x', [[0, 0], [0, 0.045], [0.07, 0.045], [0.07, 0]], [-0.05, 0.045, 0]),
    box('lever', 'lever', [-0.14, 0.07, -0.008], [-0.02, 0.088, 0.008]),
  ], { coupling: 'brass', barrel: 'alu-bare', grip: 'rubber-black', lever: 'paint-red' }) + { title: 'Branch nozzle' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['metal']),

  // A 450 mm traffic cone on a square base 300 mm across, with a reflective band round its middle.
  h.compound('traffic_cone', 3, [
    box('base', 'cone', [-0.15, 0, -0.15], [0.15, 0.03, 0.15]),
    turned('cone', 'cone', 'y', [[0, 0], [0, 0.13], [0.42, 0.025], [0.42, 0]], [0, 0.03, 0]),
    turned('band', 'band', 'y', [[0, 0], [0, 0.0875], [0.1, 0.0635], [0.1, 0]], [0, 0.2, 0]),
  ], { cone: 'plastic-orange', band: 'reflective-yellow' }) + { title: 'Traffic cone' }
  + stow.stows(stow.resting('cone', [0, 0, 0])) + { voxelGrain: 0.004 } + { taxonomy: { category: 'structures', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A portable fire pump 600 mm long in a steel carry frame 570 mm tall: a black engine under a red fuel tank, and a
  // red pump volute on +x with its outlet to the front.
  h.compound('portable_fire_pump', 60, [
    box('base', 'frame', [-0.3, 0, -0.12], [0.3, 0.04, 0.12]),
    box('engine', 'engine', [-0.22, 0.04, -0.09], [0.06, 0.4, 0.08]),
    box('tank', 'body', [-0.22, 0.4, -0.09], [0.06, 0.53, 0.08]),
    turned('volute', 'body', 'z', [[0, 0], [0, 0.12], [0.14, 0.12], [0.14, 0]], [0.18, 0.21, -0.08]),
    turned('outlet', 'coupling', 'z', [[0, 0], [0, 0.035], [0.04, 0.035], [0.04, 0]], [0.18, 0.21, 0.06]),
  ] + std.flattenArrays([
    [
      box('rail-' + side.id, 'frame', [-0.3, 0.53, side.z], [0.3, 0.57, side.z + 0.04]),
      box('post-aft-' + side.id, 'frame', [-0.3, 0.04, side.z], [-0.26, 0.53, side.z + 0.04]),
      box('post-fore-' + side.id, 'frame', [0.26, 0.04, side.z], [0.3, 0.53, side.z + 0.04]),
    ]
    for side in [{ id: 'back', z: -0.12 }, { id: 'front', z: 0.08 }]
  ]), { frame: 'steel-grey', engine: 'plastic-black', body: 'paint-red', coupling: 'brass' }) + { title: 'Portable fire pump' }
  + stow.stows(stow.resting('machine', [0, 0, 0])) + { voxelGrain: 0.008 } + firefighting('machinery', ['metal']),

  // A smoke ventilation fan 600 mm tall on a steel foot: a red shroud 480 mm across facing the front behind a steel
  // guard, a black hub, and its motor behind.
  h.compound('ventilation_fan', 28, [
    box('foot', 'frame', [-0.25, 0, -0.08], [0.25, 0.03, 0.08]),
    box('leg-a', 'frame', [-0.2, 0.03, -0.04], [-0.16, 0.2, 0]),
    box('leg-b', 'frame', [0.16, 0.03, -0.04], [0.2, 0.2, 0]),
    turned('motor', 'motor', 'z', [[0, 0], [0, 0.1], [0.08, 0.1], [0.08, 0]], [0, 0.32, -0.14]),
    turned('shroud', 'shroud', 'z', [[0, 0], [0, 0.24], [0.08, 0.24], [0.08, 0]], [0, 0.32, -0.06]),
    turned('guard', 'frame', 'z', [[0, 0.22], [0, 0.28], [0.06, 0.28], [0.06, 0.22], [0, 0.22]], [0, 0.32, 0.02]),
    turned('hub', 'motor', 'z', [[0, 0], [0, 0.08], [0.06, 0.08], [0.06, 0]], [0, 0.32, 0.02]),
  ], { frame: 'steel-grey', motor: 'plastic-black', shroud: 'paint-red' }) + { title: 'Ventilation fan' }
  + stow.stows(stow.resting('machine', [0, 0, 0])) + { voxelGrain: 0.008 } + firefighting('machinery', ['metal']),

  // A 25 litre drum of foam concentrate 260 mm across and 420 mm tall, a blue plastic drum with a rolling hoop and two
  // bungs in its head.
  h.compound('foam_concentrate_drum', 28, h.drum(0.13, 0.42, 1), { body: 'plastic-blue', chime: 'plastic-blue', bung: 'plastic-black' })
  + { title: 'Foam concentrate drum' }
  + stow.stows(stow.resting('bottle', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('containers', ['plastic']),

  // A 1.3 m length of 110 mm hard suction hose lying on its side: black ribbed rubber with an alloy coupling at each end.
  h.compound('hard_suction_hose', 12, [
    turned('hose', 'hose', 'x', [[0, 0], [0, 0.055], [1.2, 0.055], [1.2, 0]], [-0.6, 0.065, 0]),
  ] + [
    turned('rib-%d' % i, 'hose', 'x', [[0, 0], [0, 0.061], [0.012, 0.061], [0.012, 0]], [-0.56 + i * 0.12, 0.065, 0])
    for i in std.range(0, 9)
  ] + [
    turned('coupling-' + end.id, 'coupling', 'x', [[0, 0], [0, 0.065], [0.05, 0.065], [0.05, 0]], [end.x, 0.065, 0])
    for end in [{ id: 'aft', x: -0.65 }, { id: 'fore', x: 0.6 }]
  ], { hose: 'rubber-black', coupling: 'alu-bare' }) + { title: 'Hard suction hose' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['rubber', 'metal']),

  // A hydraulic spreader 840 mm long lying on its side: its body at -x and two steel arms closing to ribbed tips at +x.
  h.compound('hydraulic_spreader', 20, hydraulicBody(-0.4, -0.02, 0.07) + [
    box('head', 'body', [-0.02, 0, -0.05], [0.08, 0.2, 0.05]),
    prism('arm-upper', 'steel', 'z', [[0.08, 0.12], [0.4, 0.104], [0.4, 0.112], [0.08, 0.2]], -0.03, 0.03),
    prism('arm-lower', 'steel', 'z', [[0.08, 0], [0.4, 0.088], [0.4, 0.096], [0.08, 0.08]], -0.03, 0.03),
    box('tips', 'grip', [0.36, 0.085, -0.035], [0.4, 0.115, 0.035]),
  ], hydraulicFinish) + { title: 'Hydraulic spreader' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['metal', 'plastic']),

  // A hydraulic cutter 600 mm long lying on its side: its body at -x and two curved blades open at +x.
  h.compound('hydraulic_cutter', 14, hydraulicBody(-0.3, 0, 0.065) + [
    box('head', 'body', [0, 0, -0.05], [0.1, 0.2, 0.05]),
    prism('blade-upper', 'steel', 'z', [[0.1, 0.12], [0.28, 0.13], [0.3, 0.16], [0.1, 0.2]], -0.025, 0.025),
    prism('blade-lower', 'steel', 'z', [[0.1, 0], [0.3, 0.04], [0.28, 0.07], [0.1, 0.08]], -0.025, 0.025),
  ], hydraulicFinish) + { title: 'Hydraulic cutter' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['metal', 'plastic']),

  // A telescopic rescue ram 1.02 m long lying on its side: its body, the chrome rod out of its +x end and a toothed
  // claw on each end.
  h.compound('rescue_ram', 18, hydraulicBody(-0.45, 0.25, 0.06) + [
    turned('rod', 'rod', 'x', [[0, 0], [0, 0.035], [0.17, 0.035], [0.17, 0]], [0.25, 0.1, 0]),
  ] + [
    box('claw-' + end.id, 'steel', [end.x, 0, -0.06], [end.x + 0.05, 0.2, 0.06])
    for end in [{ id: 'aft', x: -0.5 }, { id: 'fore', x: 0.42 }]
  ], hydraulicFinish + { rod: 'steel-stainless' }) + { title: 'Rescue ram' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['metal', 'plastic']),

  // A vehicle stabilisation strut 1.05 m long lying on its side: a yellow tube on a swivel foot at -x, a locking collar
  // and a steel inner tube ending in a point at +x.
  h.compound('rescue_strut', 8, [
    box('foot', 'steel', [-0.5, 0, -0.07], [-0.47, 0.12, 0.07]),
    turned('tube', 'tube', 'x', [[0, 0], [0, 0.035], [0.67, 0.035], [0.67, 0]], [-0.47, 0.06, 0]),
    turned('collar', 'collar', 'x', [[0, 0], [0, 0.045], [0.06, 0.045], [0.06, 0]], [0.17, 0.06, 0]),
    turned('inner', 'steel', 'x', [[0, 0], [0, 0.025], [0.28, 0.025], [0.28, 0]], [0.2, 0.06, 0]),
    turned('point', 'steel', 'x', [[0, 0], [0, 0.025], [0.07, 0.005], [0.07, 0]], [0.48, 0.06, 0]),
  ], { tube: 'plastic-yellow', collar: 'plastic-black', steel: 'steel-grey' }) + { title: 'Rescue strut' }
  + stow.stows(stow.resting('bar', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['metal']),

  // A high-pressure lifting bag 280 mm square and 25 mm thick lying flat: black rubber with a yellow face and its
  // inflation coupling on the front edge.
  h.compound('lifting_bag', 3, [
    box('bag', 'bag', [-0.14, 0, -0.14], [0.14, 0.025, 0.14]),
    box('face', 'face', [-0.09, 0.025, -0.09], [0.09, 0.029, 0.09]),
    turned('coupling', 'coupling', 'z', [[0, 0], [0, 0.008], [0.02, 0.008], [0.02, 0]], [0.08, 0.0125, 0.14]),
  ], { bag: 'rubber-black', face: 'rubber-yellow', coupling: 'steel-stainless' }) + { title: 'Lifting bag' }
  + stow.stows(stow.resting('pad', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['rubber']),

  // A cribbing block of 100 mm square pine 450 mm long lying along x, its ends painted yellow.
  h.compound('cribbing_block', 2.5, [
    box('timber', 'timber', [-0.215, 0, -0.05], [0.215, 0.1, 0.05]),
  ] + [
    box('end-' + end.id, 'end', [end.x, 0, -0.05], [end.x + 0.01, 0.1, 0.05])
    for end in [{ id: 'aft', x: -0.225 }, { id: 'fore', x: 0.215 }]
  ], { timber: 'wood-pine', end: 'paint-signal-yellow' }) + { title: 'Cribbing block' }
  + stow.stows(stow.resting('block', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['wood']),

  // A pine step chock 450 mm long and 200 mm wide, three steps of 80 mm rising toward +x.
  h.compound('step_chock', 5, [
    box('step-%d' % i, 'timber', [-0.225 + i * 0.15, i * 0.08, -0.1], [0.225, (i + 1) * 0.08, 0.1])
    for i in [0, 1, 2]
  ], { timber: 'wood-pine' }) + { title: 'Step chock' }
  + stow.stows(stow.resting('block', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['wood']),

  // A rescue rope bag 220 mm across and 400 mm tall: red fabric with a reflective band, a drawn cuff and a carry loop.
  h.compound('rope_bag', 5, [
    disc('bag', 'bag', 0.11, 0, 0.34),
    disc('band', 'band', 0.112, 0.24, 0.27),
    disc('cuff', 'cuff', 0.08, 0.34, 0.37),
    box('loop', 'cuff', [-0.015, 0.37, -0.05], [0.015, 0.4, 0.05]),
  ], { bag: 'cloth-red', band: 'reflective-yellow', cuff: 'cloth-black' }) + { title: 'Rope bag' }
  + stow.stows(stow.resting('bottle', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('tools', ['fabric']),

  // A hydraulic power pack 560 mm long and 550 mm tall in a steel carry frame: an orange oil tank with two outlets to
  // the front under a black engine.
  h.compound('hydraulic_power_pack', 45, [
    box('base', 'frame', [-0.28, 0, -0.12], [0.28, 0.04, 0.12]),
    box('tank', 'body', [-0.24, 0.04, -0.1], [0.24, 0.3, 0.1]),
    box('engine', 'engine', [-0.2, 0.3, -0.09], [0.1, 0.48, 0.09]),
  ] + [
    turned('outlet-%d' % i, 'coupling', 'z', [[0, 0], [0, 0.015], [0.03, 0.015], [0.03, 0]], [0.12 + i * 0.07, 0.17, 0.1])
    for i in [0, 1]
  ] + std.flattenArrays([
    [
      box('rail-' + side.id, 'frame', [-0.28, 0.51, side.z], [0.28, 0.55, side.z + 0.04]),
      box('post-aft-' + side.id, 'frame', [-0.28, 0.04, side.z], [-0.24, 0.51, side.z + 0.04]),
      box('post-fore-' + side.id, 'frame', [0.24, 0.04, side.z], [0.28, 0.51, side.z + 0.04]),
    ]
    for side in [{ id: 'back', z: -0.12 }, { id: 'front', z: 0.08 }]
  ]), { frame: 'steel-grey', body: 'plastic-orange', engine: 'plastic-black', coupling: 'steel-stainless' }) + { title: 'Hydraulic power pack' }
  + stow.stows(stow.resting('machine', [0, 0, 0])) + { voxelGrain: 0.008 } + firefighting('machinery', ['metal', 'plastic']),

  // A hydraulic hose reel on its stand, the reel 440 mm across facing the front: orange twin hose between steel
  // flanges, turned by a crank on its hub.
  h.compound('hydraulic_hose_reel', 22, [
    box('base', 'frame', [-0.2, 0, -0.12], [0.2, 0.04, 0.12]),
    box('post', 'frame', [-0.03, 0.04, -0.12], [0.03, 0.27, -0.1]),
    turned('flange-back', 'frame', 'z', [[0, 0], [0, 0.22], [0.01, 0.22], [0.01, 0]], [0, 0.27, -0.1]),
    turned('drum', 'hose', 'z', [[0, 0], [0, 0.17], [0.18, 0.17], [0.18, 0]], [0, 0.27, -0.09]),
    turned('flange-front', 'frame', 'z', [[0, 0], [0, 0.22], [0.01, 0.22], [0.01, 0]], [0, 0.27, 0.09]),
    turned('hub', 'coupling', 'z', [[0, 0], [0, 0.04], [0.02, 0.04], [0.02, 0]], [0, 0.27, 0.1]),
    box('crank', 'crank', [-0.015, 0.27, 0.12], [0.015, 0.4, 0.135]),
  ], { frame: 'steel-grey', hose: 'plastic-orange', coupling: 'steel-stainless', crank: 'plastic-black' }) + { title: 'Hydraulic hose reel' }
  + stow.stows(stow.resting('machine', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('machinery', ['metal', 'plastic']),

  // A slim inverter generator 520 mm long and 440 mm tall: a red case on rubber feet with its control panel and vent
  // on the front and a carry handle along its top.
  h.compound('inverter_generator', 22, [
    box('case', 'case', [-0.26, 0.02, -0.12], [0.26, 0.4, 0.12]),
    box('panel', 'panel', [-0.2, 0.1, 0.12], [0, 0.28, 0.128]),
    box('vent', 'panel', [0.06, 0.12, 0.12], [0.22, 0.3, 0.124]),
    box('handle', 'panel', [-0.16, 0.4, -0.025], [0.16, 0.44, 0.025]),
  ] + [
    box('foot-%d-%d' % [i, j], 'foot', [0.2 * (2 * i - 1) - 0.03, 0, 0.08 * (2 * j - 1) - 0.03], [0.2 * (2 * i - 1) + 0.03, 0.02, 0.08 * (2 * j - 1) + 0.03])
    for i in [0, 1]
    for j in [0, 1]
  ], { case: 'paint-red', panel: 'plastic-black', foot: 'rubber-black' }) + { title: 'Inverter generator' }
  + stow.stows(stow.resting('machine', [0, 0, 0])) + { voxelGrain: 0.004 } + firefighting('machinery', ['metal', 'plastic']),
]
