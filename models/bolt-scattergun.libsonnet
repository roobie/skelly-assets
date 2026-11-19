local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's trench scattergun: the family's grip and stock kept, a shorter taller receiver, a long slim barrel
// housed in a vented shroud with a magazine tube beneath it, and a short ribbed brass pump handle wrapped close round
// the tube. About 1.4 m long. Laid out with the muzzle at +x, the axis
// `gripOn` names, so the built model's muzzle faces +z.
// Hand-guard point (the off hand's hold on the pump handle), in this layout's metres: [0.4725, 0.215, 0].

local w = 0.06;  // half the receiver's width
local top = 0.34;  // the receiver's top
local barrelY = 0.29;  // the barrel's axis
local tubeY = 0.215;  // the magazine tube's axis
local muzzleX = 0.98;
local sightTop = 0.365;  // the front post's tip
// The barrel's shroud: its underside sits just above the pump so the pump still slides clear beneath it.
local shroud = { bottom: 0.255, halfWidth: 0.045, mouth: 0.955 };
local pumpX0 = 0.40;
local pumpX1 = 0.545;
[
  // A shorter, taller receiver than the carbine's.
  bolt.gun('bolt_scattergun', 12.5, 'shotgun', bolt.receiver(0.11, 0.14, top, w, { front: 0.11, top: 0.36, halfWidth: 0.04 }) + [
    // The breech block the barrel and tube are bolted into.
    h.prism('breech', 'trim', 'x', bolt.bevel(0.17, 0.335, 0.06, 0.012), 0.11, 0.15),
    // The barrel housed from the breech to its mouth in one shroud, level with the receiver's top and riding just
    // clear of the pump, vented down both sides and closed by a brass band; only the muzzle stands out of it.
    h.prism('shroud', 'body', 'x', bolt.bevel(shroud.bottom, top, shroud.halfWidth, 0.014), 0.15, shroud.mouth),
    h.prism('shroud-band', 'trim', 'x', bolt.bevel(shroud.bottom - 0.004, top + 0.004, shroud.halfWidth + 0.004, 0.016), shroud.mouth - 0.03, shroud.mouth),
  ] + [
    box('vent-%d-%s' % [i, s], 'vent', [0.20 + i * 0.1, barrelY - 0.015, if s == 'r' then shroud.halfWidth - 0.001 else -shroud.halfWidth - 0.002], [0.24 + i * 0.1, barrelY + 0.02, if s == 'r' then shroud.halfWidth + 0.002 else -shroud.halfWidth + 0.001])
    for i in [0, 1, 2, 3, 4, 5, 6]
    for s in ['l', 'r']
  ] + [
    h.prism('muzzle', 'metal', 'x', bolt.bevel(barrelY - 0.03, barrelY + 0.03, 0.03, 0.008), shroud.mouth - 0.01, muzzleX),
    box('bore', 'vent', [muzzleX, barrelY - 0.02, -0.02], [muzzleX + 0.002, barrelY + 0.02, 0.02]),
    box('front-post', 'metal', [shroud.mouth - 0.025, top + 0.004, -0.006], [shroud.mouth - 0.01, sightTop, 0.006]),
    // The magazine tube beneath, ending in a brass cap, and a clamp tying it up to the shroud.
    h.prism('tube', 'metal', 'x', bolt.bevel(tubeY - 0.022, tubeY + 0.022, 0.022, 0.006), 0.15, 0.80),
    h.prism('tube-cap', 'trim', 'x', bolt.bevel(tubeY - 0.028, tubeY + 0.028, 0.028, 0.008), 0.80, 0.83),
    box('clamp', 'trim', [0.84, tubeY - 0.03, -0.035], [0.865, shroud.bottom + 0.005, 0.035]),
  ] + [
    // The pump handle: a slim brass fore-end sleeve wrapped close round the magazine tube, with four dark grip ribs.
    h.prism('pump', 'trim', 'x', bolt.bevel(tubeY - 0.036, tubeY + 0.036, 0.036, 0.01), pumpX0, pumpX1),
  ] + [
    h.prism('rib-%d' % i, 'vent', 'x', bolt.bevel(tubeY - 0.038, tubeY + 0.038, 0.038, 0.011), pumpX0 + 0.015 + i * 0.032, pumpX0 + 0.027 + i * 0.032)
    for i in [0, 1, 2, 3]
  ] + [
  ] + bolt.grip(0.15) + bolt.stock(top, 0.05) + [
    // Three brass shells held on the right side of the receiver.
    h.turned('shell-%d' % i, 'round', 'z', [[0, 0], [0, 0.014], [0.012, 0.014], [0.014, 0.011], [0.014, 0]], [-0.135 + i * 0.045, 0.205, w])
    for i in [0, 1, 2]
  ], { round: 'brass' }) + { title: 'Basic scattergun' },
]
