local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// The bolt carbine's trench scattergun: the family's grip and stock kept, a shorter taller receiver, a long slim barrel
// housed in a vented shroud with a magazine tube beneath it, and a ribbed brass pump handle wrapped round the tube.
// About 1.4 m long. Laid out with the muzzle at +x, the axis `gripOn` names, so the built model's muzzle faces +z.
// Hand-guard point (the off hand's hold on the pump handle), in this layout's metres: [0.48, 0.18, 0].

local w = 0.06;  // half the receiver's width
local top = 0.34;  // the receiver's top
local front = 0.11;  // the receiver's front face
// The barrel's axis. The shroud is centred on it, so the muzzle can't drift off the shroud's centre; the shroud carries
// on the receiver's sides and top flush and steps up from its underside.
local barrelY = 0.29;
local shroudBottom = 2 * barrelY - top;
local shroudAt(grow) = bolt.bevel(shroudBottom - grow, top + grow, w + grow, 0.016);
local mouth = 0.955;  // where the shroud ends and the muzzle stands out
local muzzleX = 0.98;
local ridgeTop = 0.36;  // the top ridge's crest, the rear of the sight line
local sightTop = 0.375;  // the front post's tip, standing on the ridge
local tubeY = 0.18;  // the magazine tube's axis, low enough that the pump clears the shroud
local pump = { x0: 0.39, x1: 0.57, half: 0.042, ribs: 5, ribPitch: 0.032, ribLength: 0.012 };
local ribStart = pump.x0 + (pump.x1 - pump.x0 - (pump.ribs - 1) * pump.ribPitch - pump.ribLength) / 2;
[
  // A shorter, taller receiver than the carbine's.
  // Its top ridge runs on along the shroud to the mouth as the sighting rib.
  bolt.gun('bolt_scattergun', 12.5, 'shotgun', bolt.receiver(front, 0.14, top, w, { front: mouth, top: ridgeTop, halfWidth: 0.04 }) + [
    // The barrel housed from the receiver's face to its mouth in one shroud, vented down both sides, with a brass band
    // at either end; only the muzzle stands out of it.
    h.prism('shroud', 'body', 'x', shroudAt(0), front, mouth),
    h.prism('breech-band', 'trim', 'x', shroudAt(0.004), front, front + 0.03),
    h.prism('shroud-band', 'trim', 'x', shroudAt(0.004), mouth - 0.03, mouth),
  ] + [
    box('vent-%d-%s' % [i, s], 'vent', [0.20 + i * 0.1, barrelY - 0.02, if s == 'r' then w - 0.001 else -w - 0.002], [0.24 + i * 0.1, barrelY + 0.02, if s == 'r' then w + 0.002 else -w + 0.001])
    for i in [0, 1, 2, 3, 4, 5, 6]
    for s in ['l', 'r']
  ] + [
    h.prism('muzzle', 'metal', 'x', bolt.bevel(barrelY - 0.03, barrelY + 0.03, 0.03, 0.008), mouth - 0.01, muzzleX),
    box('bore', 'vent', [muzzleX, barrelY - 0.02, -0.02], [muzzleX + 0.002, barrelY + 0.02, 0.02]),
    box('front-post', 'metal', [mouth - 0.025, ridgeTop, -0.006], [mouth - 0.01, sightTop, 0.006]),
    // The magazine tube beneath, ending in a brass cap, and a clamp tying it up to the shroud.
    h.prism('tube', 'metal', 'x', bolt.bevel(tubeY - 0.022, tubeY + 0.022, 0.022, 0.006), front, 0.80),
    h.prism('tube-cap', 'trim', 'x', bolt.bevel(tubeY - 0.028, tubeY + 0.028, 0.028, 0.008), 0.80, 0.83),
    box('clamp', 'trim', [0.84, tubeY - 0.03, -0.035], [0.865, shroudBottom + 0.005, 0.035]),
    // The pump handle: a brass fore-end sleeve wrapped round the magazine tube, with dark grip ribs.
    h.prism('pump', 'trim', 'x', bolt.bevel(tubeY - pump.half, tubeY + pump.half, pump.half, 0.012), pump.x0, pump.x1),
  ] + [
    h.prism('rib-%d' % i, 'vent', 'x', bolt.bevel(tubeY - pump.half - 0.002, tubeY + pump.half + 0.002, pump.half + 0.002, 0.013), ribStart + i * pump.ribPitch, ribStart + i * pump.ribPitch + pump.ribLength)
    for i in std.range(0, pump.ribs - 1)
  ] + bolt.grip(0.15) + bolt.stock(top, 0.05) + [
    // Three brass shells held on the right side of the receiver.
    h.turned('shell-%d' % i, 'round', 'z', [[0, 0], [0, 0.014], [0.012, 0.014], [0.014, 0.011], [0.014, 0]], [-0.135 + i * 0.045, 0.205, w])
    for i in [0, 1, 2]
  ], { round: 'brass' }) + { title: 'Basic scattergun' },
]
