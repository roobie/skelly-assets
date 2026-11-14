// Kit a fire engine carries in its lockers, each piece a thing of its own so a game can loot it or stow it again.
local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local stow = import 'models/stowage.libsonnet';
local box = h.box;
local turned = h.turned;
local disc = h.disc;
local firefighting(category, material) = { taxonomy: { category: category, keywords: ['firefighting'], tags: { material: material, setting: ['modern'] } } };
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

  // A hydrant key lying flat: a 400 mm steel bar with a T handle 240 mm across at -x and a square socket at +x.
  h.compound('hydrant_key', 2.5, [
    box('bar', 'steel', [-0.2, 0, -0.011], [0.18, 0.022, 0.011]),
    box('handle', 'steel', [-0.222, 0, -0.12], [-0.2, 0.022, 0.12]),
    box('socket', 'socket', [0.18, 0, -0.018], [0.22, 0.036, 0.018]),
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
]
