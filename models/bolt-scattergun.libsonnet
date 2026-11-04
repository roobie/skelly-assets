local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// The bolt carbine's scattergun: the carbine's grip, guard, trigger and butt kept, a shorter taller receiver, twin fat
// bores one over the other instead of the barrel, no magazine, and a pump slide under the barrels. About 0.78 m long.
// The muzzle is at +x. Built by tools/model (tools/build_models.sh) into assets/own/skelly/bolt_scattergun.glb.

local w = 0.06;  // half the receiver's width
local hiY = 0.295;  // the upper bore's axis
local loY = 0.215;  // the lower bore's axis
local muzzleX = 0.46;
[
  h.compound('bolt_scattergun', 12.5, [
    // Receiver, a tall block with a top ridge and a painted band.
    box('receiver', 'body', [-0.18, 0.14, -w], [0.11, 0.34, w]),
    box('ridge', 'body', [-0.16, 0.34, -0.04], [0.11, 0.36, 0.04]),
    box('receiver-band', 'accent', [-0.04, 0.14, -w - 0.003], [0.0, 0.34, w + 0.003]),
    // The breech block the barrels are bolted into, wider than the receiver.
    box('breech', 'trim', [0.11, 0.15, -0.07], [0.15, 0.345, 0.07]),
    // Twin wide bores with dark mouths, a rib along the top and two clamps.
    box('barrel-up', 'metal', [0.15, hiY - 0.04, -0.04], [muzzleX, hiY + 0.04, 0.04]),
    box('barrel-low', 'metal', [0.15, loY - 0.04, -0.04], [muzzleX, loY + 0.04, 0.04]),
    box('bore-up', 'vent', [muzzleX, hiY - 0.026, -0.026], [muzzleX + 0.002, hiY + 0.026, 0.026]),
    box('bore-low', 'vent', [muzzleX, loY - 0.026, -0.026], [muzzleX + 0.002, loY + 0.026, 0.026]),
    box('rib', 'trim', [0.15, hiY + 0.04, -0.012], [muzzleX, hiY + 0.048, 0.012]),
    box('clamp-a', 'trim', [0.33, loY - 0.045, -0.05], [0.36, hiY + 0.045, 0.05]),
    box('clamp-b', 'trim', [0.43, loY - 0.045, -0.05], [0.455, hiY + 0.045, 0.05]),
    // The pump slide under the barrels, with three grooves.
    box('pump', 'grip', [0.16, 0.095, -0.052], [0.32, 0.176, 0.052]),
    box('groove', 'vent', [0.22, 0.1, -0.054], [0.23, 0.17, 0.054]),
    box('groove-b', 'vent', [0.26, 0.1, -0.054], [0.27, 0.17, 0.054]),
    // Pistol grip, trigger guard and trigger.
    h.prism('grip', 'grip', 'z', [[-0.13, 0.15], [-0.07, 0.15], [-0.10, 0.03], [-0.155, 0.03]], -0.026, 0.026),
    box('guard', 'metal', [-0.075, 0.105, -0.008], [0.005, 0.117, 0.008]),
    box('guard-front', 'metal', [-0.005, 0.105, -0.008], [0.005, 0.15, 0.008]),
    box('trigger', 'metal', [-0.045, 0.117, -0.005], [-0.033, 0.148, 0.005]),
    // A stubby butt with a rubber pad, as the carbine's.
    h.prism('butt', 'body', 'z', [[-0.18, 0.16], [-0.18, 0.34], [-0.27, 0.335], [-0.30, 0.30], [-0.30, 0.15], [-0.27, 0.135]], -0.05, 0.05),
    box('butt-pad', 'grip', [-0.32, 0.14, -0.052], [-0.30, 0.31, 0.052]),
  ] + [
    // Three brass shells held on the right side of the receiver.
    h.turned('shell-%d' % i, 'round', 'z', [[0, 0], [0, 0.014], [0.012, 0.014], [0.014, 0.011], [0.014, 0]], [-0.135 + i * 0.045, 0.205, w])
    for i in [0, 1, 2]
  ], {
    body: 'paint-charcoal',
    accent: 'paint-oxblood',
    trim: 'brass',
    metal: 'steel-parkerized',
    vent: 'rubber-black',
    grip: 'rubber-black',
    round: 'brass',
  }) + {
    handling: h.gripOn('bolt_scattergun', 'grip'),
    voxelGrain: 0.004,
  },
]
