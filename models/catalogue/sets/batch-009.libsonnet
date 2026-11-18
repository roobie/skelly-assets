local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local stow = import 'models/stowage.libsonnet';
local box = h.box;
local turned = h.turned;
// A cylinder standing on y from `y0` to `y1`, centred at (x, z).
local disc(id, slot, radius, y0, y1, x=0, z=0) = turned(id, slot, 'y', [[0, 0], [0, radius], [y1 - y0, radius], [y1 - y0, 0]], [x, y0, z]);
// A drum shell standing on y, `height` tall, its top and bottom edges rolled in by `chime`.
local shell(id, slot, radius, height, chime) = turned(id, slot, 'y', [[0, 0], [0, radius - chime], [chime, radius], [height - chime, radius], [height, radius - chime], [height, 0]]);
[
  // A squat 50 ml jar of wintergreen ointment, 56 mm across and 42 mm tall with its lid: white with a
  // paper label band and a green screw lid.
  h.compound('wintergreen_ointment', 0.05, [
    turned('jar', 'jar', 'y', [[0, 0], [0, 0.026], [0.028, 0.026], [0.03, 0.024], [0.032, 0.024], [0.032, 0]]),
    turned('label', 'label', 'y', [[0, 0], [0, 0.0264], [0.018, 0.0264], [0.018, 0]], [0, 0.006, 0]),
    turned('lid', 'lid', 'y', [[0, 0], [0, 0.028], [0.011, 0.028], [0.012, 0.026], [0.012, 0]], [0, 0.03, 0]),
  ], { jar: 'enamel-white', label: 'paper-white', lid: 'plastic-green' }) + { title: 'Wintergreen ointment' }
  + h.inHand('wintergreen_ointment', 'jar') + { voxelGrain: 0.002 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] }, keywords: ['painkiller'] } },

  // A red plastic first aid case, 240 mm wide, 170 mm tall and 75 mm deep, standing on its edge with a
  // carry handle on top, a white cross on the front, a lid seam all round and two white latches.
  h.compound('first_aid_box', 0.6, [
    box('base', 'case', [-0.12, 0, -0.0375], [0.12, 0.17, 0.004]),
    box('lid', 'case', [-0.12, 0, 0.006], [0.12, 0.17, 0.0375]),
    box('seam', 'seam', [-0.119, 0.001, 0.004], [0.119, 0.169, 0.006]),
    box('cross-bar', 'cross', [-0.04, 0.072, 0.0375], [0.04, 0.098, 0.0395]),
    box('cross-post', 'cross', [-0.013, 0.045, 0.0375], [0.013, 0.125, 0.0395]),
    box('grip', 'handle', [-0.045, 0.19, -0.01], [0.045, 0.2, 0.01]),
    box('post-a', 'handle', [-0.045, 0.17, -0.01], [-0.035, 0.19, 0.01]),
    box('post-b', 'handle', [0.035, 0.17, -0.01], [0.045, 0.19, 0.01]),
    box('latch-a', 'latch', [-0.095, 0.17, -0.006], [-0.075, 0.176, 0.014]),
    box('latch-b', 'latch', [0.075, 0.17, -0.006], [0.095, 0.176, 0.014]),
  ], { case: 'plastic-red', seam: 'plastic-grey', cross: 'paint-white', handle: 'plastic-grey', latch: 'plastic-white' }) + { title: 'First aid box' } + stow.stows(stow.resting('case', [0, 0, 0]))
  + { voxelGrain: 0.004 } + { taxonomy: { category: 'medical', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A blue plastic 30 gallon closed-head barrel, 480 mm across and 720 mm tall, with two moulded rolling
  // ribs, a raised top ring and two screw bungs, one large and one small.
  h.compound('plastic_barrel', 5.1, [
    shell('body', 'body', 0.24, 0.7, 0.02),
    turned('rib-a', 'body', 'y', [[0, 0], [0, 0.25], [0.02, 0.25], [0.02, 0]], [0, 0.22, 0]),
    turned('rib-b', 'body', 'y', [[0, 0], [0, 0.25], [0.02, 0.25], [0.02, 0]], [0, 0.48, 0]),
    turned('ring', 'body', 'y', [[0, 0.2], [0, 0.236], [0.02, 0.236], [0.02, 0.2]], [0, 0.7, 0]),
    disc('bung-large', 'bung', 0.035, 0.7, 0.72, 0.12, 0),
    disc('bung-small', 'bung', 0.025, 0.7, 0.72, -0.12, 0),
  ], { body: 'plastic-blue', bung: 'plastic-white' }) + { title: 'Plastic barrel' } + { taxonomy: { category: 'containers', tags: { material: ['plastic'], setting: ['modern'] } } },

  // A red open-head 30 gallon steel drum, 465 mm across and 745 mm tall, with two rolled rolling hoops, a
  // lid held by a bolted clamp ring and a small bung in the lid.
  h.compound('steel_drum_100', 16, [
    shell('body', 'body', 0.2325, 0.72, 0.01),
    turned('hoop-a', 'body', 'y', [[0, 0], [0, 0.2425], [0.02, 0.2425], [0.02, 0]], [0, 0.24, 0]),
    turned('hoop-b', 'body', 'y', [[0, 0], [0, 0.2425], [0.02, 0.2425], [0.02, 0]], [0, 0.48, 0]),
    disc('lid', 'body', 0.236, 0.72, 0.73),
    turned('clamp', 'clamp', 'y', [[0, 0.215], [0, 0.242], [0.025, 0.242], [0.025, 0.215]], [0, 0.71, 0]),
    box('bolt', 'clamp', [0.235, 0.712, -0.025], [0.26, 0.732, 0.025]),
    disc('bung', 'bung', 0.025, 0.73, 0.745, -0.13, 0.06),
  ], { body: 'paint-red', clamp: 'steel', bung: 'steel-grey' }) + { title: '100-liter steel drum' } + { taxonomy: { category: 'containers', tags: { material: ['metal'], setting: ['modern'] } } },

  // An olive drab closed-head 55 gallon steel drum, 585 mm across and 880 mm tall, with two rolled rolling
  // hoops, rolled chimes top and bottom, and two screw bungs in the top, one large and one small.
  h.compound('steel_drum_200', 37, [
    shell('body', 'body', 0.2925, 0.88, 0.012),
    turned('hoop-a', 'body', 'y', [[0, 0], [0, 0.3025], [0.02, 0.3025], [0.02, 0]], [0, 0.285, 0]),
    turned('hoop-b', 'body', 'y', [[0, 0], [0, 0.3025], [0.02, 0.3025], [0.02, 0]], [0, 0.577, 0]),
    turned('chime-top', 'chime', 'y', [[0, 0.27], [0, 0.296], [0.02, 0.296], [0.02, 0.27]], [0, 0.868, 0]),
    turned('chime-foot', 'chime', 'y', [[0, 0.27], [0, 0.296], [0.014, 0.296], [0.014, 0.27]]),
    disc('bung-large', 'bung', 0.036, 0.87, 0.9, 0.18, 0),
    disc('bung-small', 'bung', 0.025, 0.87, 0.9, -0.18, 0),
  ], { body: 'paint-olive', chime: 'paint-olive', bung: 'steel-grey' }) + { title: '200-liter steel drum' } + { taxonomy: { category: 'containers', tags: { material: ['metal'], setting: ['modern'] } } },
]
