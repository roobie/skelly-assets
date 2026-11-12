local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's trench scattergun: the family's grip and stock kept, a shorter taller receiver, a long slim barrel
// with a perforated heat shield and a magazine tube beneath it, and a short ribbed brass pump handle wrapped close round
// the tube. About 1.4 m long. Laid out with the muzzle at +x, the axis
// `gripOn` names, so the built model's muzzle faces +z.
// Hand-guard point (the off hand's hold on the pump handle), in this layout's metres: [0.4725, 0.215, 0].

local w = 0.06;  // half the receiver's width
local barrelY = 0.29;  // the barrel's axis
local tubeY = 0.215;  // the magazine tube's axis
local muzzleX = 0.98;
local pumpX0 = 0.40;
local pumpX1 = 0.545;
[
  // A shorter, taller receiver than the carbine's.
  bolt.gun('bolt_scattergun', 12.5, 'shotgun', bolt.receiver(0.11, 0.14, 0.34, w, { front: 0.11, top: 0.36, halfWidth: 0.04 }) + [
    // The breech block the barrel and tube are bolted into.
    h.prism('breech', 'trim', 'x', bolt.bevel(0.17, 0.335, 0.06, 0.012), 0.11, 0.15),
    // One long slim barrel with a dark mouth and a rib, and a magazine tube beneath it ending in a brass cap.
    h.prism('barrel', 'metal', 'x', bolt.bevel(barrelY - 0.03, barrelY + 0.03, 0.03, 0.008), 0.15, muzzleX),
    box('bore', 'vent', [muzzleX, barrelY - 0.02, -0.02], [muzzleX + 0.002, barrelY + 0.02, 0.02]),
    box('rib', 'trim', [0.15, barrelY + 0.03, -0.01], [muzzleX, barrelY + 0.037, 0.01]),
    h.prism('tube', 'metal', 'x', bolt.bevel(tubeY - 0.022, tubeY + 0.022, 0.022, 0.006), 0.15, 0.80),
    h.prism('tube-cap', 'trim', 'x', bolt.bevel(tubeY - 0.028, tubeY + 0.028, 0.028, 0.008), 0.80, 0.83),
    box('clamp', 'trim', [0.84, tubeY - 0.03, -0.035], [0.865, barrelY + 0.035, 0.035]),
    box('front-post', 'metal', [0.94, barrelY + 0.037, -0.006], [0.955, barrelY + 0.075, 0.006]),
    // A perforated heat shield over the rear of the barrel: a slab with dark holes down both sides.
    box('shield', 'body', [0.20, barrelY + 0.03, -0.045], [0.62, barrelY + 0.058, 0.045]),
  ] + [
    box('hole-%d' % i, 'vent', [0.23 + i * 0.065, barrelY + 0.036, -0.047], [0.26 + i * 0.065, barrelY + 0.052, 0.047])
    for i in [0, 1, 2, 3, 4, 5]
  ] + [
    // The pump handle: a slim brass fore-end sleeve wrapped close round the magazine tube, with four dark grip ribs.
    h.prism('pump', 'trim', 'x', bolt.bevel(tubeY - 0.036, tubeY + 0.036, 0.036, 0.01), pumpX0, pumpX1),
  ] + [
    h.prism('rib-%d' % i, 'vent', 'x', bolt.bevel(tubeY - 0.038, tubeY + 0.038, 0.038, 0.011), pumpX0 + 0.015 + i * 0.032, pumpX0 + 0.027 + i * 0.032)
    for i in [0, 1, 2, 3]
  ] + [
  ] + bolt.grip(0.15) + bolt.stock(0.34, 0.05) + [
    // Three brass shells held on the right side of the receiver.
    h.turned('shell-%d' % i, 'round', 'z', [[0, 0], [0, 0.014], [0.012, 0.014], [0.014, 0.011], [0.014, 0]], [-0.135 + i * 0.045, 0.205, w])
    for i in [0, 1, 2]
  ], { round: 'brass' }) + { title: 'Bolt scattergun' },
]
