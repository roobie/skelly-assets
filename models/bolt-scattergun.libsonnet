local h = import 'packages/thing-authoring-tool/compound.libsonnet';
local box = h.box;

// The bolt carbine's trench scattergun: the carbine's grip, guard, trigger and butt kept, a shorter taller receiver, a long
// slim barrel with a perforated heat shield and a magazine tube beneath it, and a short ribbed brass pump handle
// wrapped close round the tube. About 1.3 m long. The muzzle is at +x.
// Hand-guard point (the off hand's hold on the pump handle), in this model's metres: [0.4725, 0.215, 0].

local w = 0.06;  // half the receiver's width
local barrelY = 0.29;  // the barrel's axis
local tubeY = 0.215;  // the magazine tube's axis
local muzzleX = 0.98;
local pumpX0 = 0.40;
local pumpX1 = 0.545;
[
  h.compound('bolt_scattergun', 12.5, [
    // Receiver, a tall block with a top ridge and a painted band.
    box('receiver', 'body', [-0.18, 0.14, -w], [0.11, 0.34, w]),
    box('ridge', 'body', [-0.16, 0.34, -0.04], [0.11, 0.36, 0.04]),
    box('receiver-band', 'accent', [-0.04, 0.14, -w - 0.003], [0.0, 0.34, w + 0.003]),
    // The breech block the barrel and tube are bolted into.
    box('breech', 'trim', [0.11, 0.17, -0.06], [0.15, 0.335, 0.06]),
    // One long slim barrel with a dark mouth and a rib, and a magazine tube beneath it ending in a brass cap.
    box('barrel', 'metal', [0.15, barrelY - 0.03, -0.03], [muzzleX, barrelY + 0.03, 0.03]),
    box('bore', 'vent', [muzzleX, barrelY - 0.02, -0.02], [muzzleX + 0.002, barrelY + 0.02, 0.02]),
    box('rib', 'trim', [0.15, barrelY + 0.03, -0.01], [muzzleX, barrelY + 0.037, 0.01]),
    box('tube', 'metal', [0.15, tubeY - 0.022, -0.022], [0.80, tubeY + 0.022, 0.022]),
    box('tube-cap', 'trim', [0.80, tubeY - 0.028, -0.028], [0.83, tubeY + 0.028, 0.028]),
    box('clamp', 'trim', [0.84, tubeY - 0.03, -0.035], [0.865, barrelY + 0.035, 0.035]),
    box('front-post', 'metal', [0.94, barrelY + 0.037, -0.006], [0.955, barrelY + 0.075, 0.006]),
    // A perforated heat shield over the rear of the barrel: a slab with dark holes down both sides.
    box('shield', 'body', [0.20, barrelY + 0.03, -0.045], [0.62, barrelY + 0.058, 0.045]),
  ] + [
    box('hole-%d' % i, 'vent', [0.23 + i * 0.065, barrelY + 0.036, -0.047], [0.26 + i * 0.065, barrelY + 0.052, 0.047])
    for i in [0, 1, 2, 3, 4, 5]
  ] + [
    // The pump handle: a slim brass fore-end sleeve wrapped close round the magazine tube, with four dark grip ribs.
    box('pump', 'trim', [pumpX0, tubeY - 0.036, -0.036], [pumpX1, tubeY + 0.036, 0.036]),
  ] + [
    box('rib-%d' % i, 'vent', [pumpX0 + 0.015 + i * 0.032, tubeY - 0.033, -0.038], [pumpX0 + 0.027 + i * 0.032, tubeY + 0.033, 0.038])
    for i in [0, 1, 2, 3]
  ] + [
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
