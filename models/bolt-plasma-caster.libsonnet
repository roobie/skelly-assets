local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// The bolt carbine's plasma caster: the carbine's grip, guard, trigger and butt kept, a deeper receiver, a glowing coil
// core ringed with collars and ending in a blunt flared emitter with a glowing lens instead of the rifled barrel, and an
// energy cell with glowing windows instead of the magazine. Slot `glow` is the model's own light: crystal-glow-blue is
// a stand-in colour, the game decides what colour the glow is. About 0.82 m long. The muzzle is at +x.

local w = 0.07;  // half the receiver's width
local coreY = 0.25;
local muzzleX = 0.49;
[
  h.compound('bolt_plasma_caster', 12, [
    // A deeper receiver with a top ridge and a painted band.
    box('receiver', 'body', [-0.18, 0.14, -w], [0.15, 0.35, w]),
    box('ridge', 'body', [-0.16, 0.35, -0.045], [0.14, 0.37, 0.045]),
    box('receiver-band', 'accent', [-0.04, 0.14, -w - 0.003], [0.0, 0.35, w + 0.003]),
    // The coil: a glowing core with three collars round it, then the emitter cup and its lens.
    h.rod('core', 'glow', 0.045, 0.15, 0.47, coreY) + { sides: 16 },
    box('collar-a', 'metal', [0.17, coreY - 0.075, -0.075], [0.20, coreY + 0.075, 0.075]),
    box('collar-b', 'metal', [0.25, coreY - 0.075, -0.075], [0.28, coreY + 0.075, 0.075]),
    box('collar-c', 'metal', [0.33, coreY - 0.075, -0.075], [0.36, coreY + 0.075, 0.075]),
    box('emitter', 'trim', [0.40, coreY - 0.08, -0.08], [0.48, coreY + 0.08, 0.08]),
    box('lens', 'glow', [0.48, coreY - 0.055, -0.055], [muzzleX, coreY + 0.055, 0.055]),
  ] + [
    // Cooling fins along the top of the coil.
    box('fin-%d' % i, 'metal', [0.21 + i * 0.08, 0.325, -0.02], [0.225 + i * 0.08, 0.37, 0.02])
    for i in [0, 1, 2]
  ] + [
    // An energy cell hung under the receiver, with a glowing window on each side.
    box('cell', 'body', [0.0, 0.02, -0.055], [0.15, 0.15, 0.055]),
    box('cell-cap', 'trim', [-0.005, 0.01, -0.058], [0.155, 0.03, 0.058]),
    box('cell-window-l', 'glow', [0.03, 0.05, -0.0575], [0.12, 0.12, -0.055]),
    box('cell-window-r', 'glow', [0.03, 0.05, 0.055], [0.12, 0.12, 0.0575]),
    // Pistol grip, trigger guard and trigger.
    h.prism('grip', 'grip', 'z', [[-0.13, 0.155], [-0.07, 0.155], [-0.10, 0.03], [-0.155, 0.03]], -0.026, 0.026),
    box('guard', 'metal', [-0.075, 0.11, -0.008], [0.005, 0.122, 0.008]),
    box('guard-front', 'metal', [-0.005, 0.11, -0.008], [0.005, 0.155, 0.008]),
    box('trigger', 'metal', [-0.045, 0.122, -0.005], [-0.033, 0.153, 0.005]),
    // A stubby butt with a rubber pad, as the carbine's.
    h.prism('butt', 'body', 'z', [[-0.18, 0.16], [-0.18, 0.33], [-0.27, 0.325], [-0.30, 0.30], [-0.30, 0.15], [-0.27, 0.135]], -0.05, 0.05),
    box('butt-pad', 'grip', [-0.32, 0.14, -0.052], [-0.30, 0.31, 0.052]),
  ], {
    body: 'paint-charcoal',
    accent: 'paint-oxblood',
    trim: 'brass',
    metal: 'steel-parkerized',
    vent: 'rubber-black',
    grip: 'rubber-black',
    glow: 'crystal-glow-blue',
  }) + {
    handling: h.gripOn('bolt_plasma_caster', 'grip'),
    voxelGrain: 0.004,
  },
]
