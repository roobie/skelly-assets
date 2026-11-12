local h = import '../tools/packages/thing-authoring-tool/compound.libsonnet';
local bolt = import 'bolt-gun.libsonnet';
local box = h.box;

// An oversized bolt carbine, about 0.94 m long and deep for its length: a slab receiver, an armoured barrel shroud
// nearly as deep as the receiver, a fat barrel ending in a slotted muzzle brake, a magazine of rocket bolts ahead of
// the grip and the family's skeleton stock. It comes with a straight box magazine or a rotary drum. Laid out with the
// muzzle at +x, the axis `gripOn` names, so the built model's muzzle faces +z; the side view shows its profile.

local w = 0.055;  // half the receiver's width
local barrelY = 0.245;

// The rocket bolts lie along the bore, so a magazine is as deep fore and aft as a bolt is long plus its walls. Its
// back stays clear of the trigger guard's front, which ends at x = 0.005.
local roundLength = 0.11;
local wall = 0.011;
local magBack = 0.025;
local magFront = magBack + roundLength + 2 * wall;
local magTop = 0.15;  // the receiver's underside

// A bolt seen side on in a window at `z`: a brass body and a pointed accent nose, its base at `x` and its foot at `y`.
local roundSide(id, x, y, z) = [
  box(id, 'round', [x, y, z], [x + roundLength - 0.016, y + 0.014, z + 0.0015]),
  h.prism(id + '-nose', 'accent', 'z', [[x + roundLength - 0.016, y], [x + roundLength - 0.004, y + 0.005], [x + roundLength - 0.004, y + 0.009], [x + roundLength - 0.016, y + 0.014]], z, z + 0.0015),
];

// The metal magwell collar either magazine seats in.
local magwell = h.prism('magwell', 'metal', 'z', [
  [magBack - 0.006, magTop], [magBack - 0.006, 0.136], [magBack, 0.128], [magFront, 0.128], [magFront + 0.006, 0.136], [magFront + 0.006, magTop],
], -0.049, 0.049);

// A straight box magazine square to the bore, with a bevelled brass base plate and a window in its right side showing
// the stacked bolts.
local boxMagazine = [
  h.prism('magazine', 'body', 'z', [[magBack, 0.012], [magFront, 0.012], [magFront, magTop], [magBack, magTop]], -0.045, 0.045),
  magwell,
  h.prism('mag-base', 'trim', 'z', [
    [magBack - 0.004, 0.004], [magBack, 0], [magFront, 0], [magFront + 0.004, 0.004], [magFront + 0.004, 0.014], [magBack - 0.004, 0.014],
  ], -0.049, 0.049),
  box('mag-window', 'vent', [magBack + wall, 0.032, 0.045], [magFront - wall, 0.118, 0.0465]),
] + std.flattenArrays([
  roundSide('round-%d' % i, magBack + wall + 0.002, 0.038 + i * 0.02, 0.0455)
  for i in [0, 1, 2, 3]
]);

// A rotary drum, a revolver cylinder hung on a neck below the magwell: its chambers lie along the bore around its
// axle, so it is as long as a box magazine is deep and holds more bolts. Brass bands bind it, and the bolts' noses
// and the axle cap show on its front face.
local drumRadius = 0.066;
local drumY = magTop - 0.022 - drumRadius;
local drumLength = magFront - magBack;
local chambers = 8;
local drumMagazine = [
  magwell,
  box('drum-neck', 'body', [magBack + 0.012, drumY + drumRadius - 0.01, -0.035], [magFront - 0.012, magTop, 0.035]),
  h.turned('drum', 'body', 'x', [[0, 0], [0, drumRadius - 0.006], [0.006, drumRadius], [drumLength - 0.006, drumRadius], [drumLength, drumRadius - 0.006], [drumLength, 0]], [magBack, drumY, 0]) + { sides: 8 },
] + [
  local x = if end == 'back' then magBack + 0.014 else magFront - 0.024;
  h.turned('drum-band-%s' % end, 'trim', 'x', [[0, 0], [0, drumRadius + 0.003], [0.01, drumRadius + 0.003], [0.01, 0]], [x, drumY, 0]) + { sides: 8 }
  for end in ['back', 'front']
] + [
  h.turned('drum-axle', 'metal', 'x', [[0, 0], [0, 0.02], [0.008, 0.015], [0.008, 0]], [magFront, drumY, 0]) + { sides: 8 },
] + [
  local a = 2 * std.pi * i / chambers;
  h.turned('drum-nose-%d' % i, 'accent', 'x', [[0, 0], [0, 0.011], [0.006, 0.005], [0.006, 0]], [magFront, drumY + 0.044 * std.cos(a), 0.044 * std.sin(a)])
  for i in std.range(0, chambers - 1)
];

local carbine(id, massKg, magazine) =
  bolt.gun(id, massKg, 'rifle', bolt.receiver(0.17, 0.15, 0.33, w, [0.15, 0.35, 0.038]) + [
    // Barrel shroud, an octagonal slab with vents along both sides and a brass band at its mouth.
    h.prism('shroud', 'body', 'x', [[0.17, -0.045], [0.17, 0.045], [0.19, 0.062], [0.30, 0.062], [0.32, 0.045], [0.32, -0.045], [0.30, -0.062], [0.19, -0.062]], 0.17, 0.38),
    h.prism('shroud-band', 'trim', 'x', [[0.165, -0.049], [0.165, 0.049], [0.187, 0.067], [0.303, 0.067], [0.325, 0.049], [0.325, -0.049], [0.303, -0.067], [0.187, -0.067]], 0.36, 0.38),
  ] + [
    box('vent-%d-%s' % [i, s], 'vent', [0.20 + i * 0.075, 0.215, if s == 'r' then 0.061 else -0.064], [0.25 + i * 0.075, 0.285, if s == 'r' then 0.064 else -0.061])
    for i in [0, 1]
    for s in ['l', 'r']
  ] + [
    // A fat barrel and a muzzle brake with three side ports and a dark bore.
    h.rod('barrel', 'metal', 0.03, 0.38, 0.43, barrelY) + { sides: 48 },  // round, as at the commit this was authored on; turned shapes default to eight sides
    h.prism('brake', 'metal', 'x', bolt.bevel(barrelY - 0.042, barrelY + 0.042, 0.046, 0.012), 0.43, 0.51),
    h.prism('brake-cap', 'metal', 'x', bolt.bevel(barrelY - 0.035, barrelY + 0.035, 0.04, 0.01), 0.51, 0.522),
  ] + [
    box('port-%d' % i, 'vent', [0.442 + i * 0.022, barrelY - 0.03, -0.0475], [0.456 + i * 0.022, barrelY + 0.03, 0.0475])
    for i in [0, 1, 2]
  ] + [
    box('bore', 'vent', [0.522, barrelY - 0.017, -0.017], [0.524, barrelY + 0.017, 0.017]),
  ] + magazine + bolt.grip(0.155) + bolt.stock(0.33, 0.045) + [
    // Sights: a rear block on the ridge and a front post over the shroud.
    box('rear-sight', 'metal', [-0.12, 0.35, -0.02], [-0.07, 0.375, 0.02]),
    box('rear-notch', 'vent', [-0.11, 0.365, -0.004], [-0.08, 0.3755, 0.004]),
    box('front-post', 'metal', [0.33, 0.32, -0.007], [0.35, 0.36, 0.007]),
    // Ejection port and a chunky charging lever on the right side.
    box('ejection', 'vent', [0.03, 0.25, w], [0.12, 0.29, w + 0.002]),
    box('lever', 'metal', [-0.15, 0.27, w], [-0.11, 0.29, w + 0.03]),
    box('lever-knob', 'metal', [-0.16, 0.263, w + 0.022], [-0.10, 0.297, w + 0.036]),
  ] + [
    box('rivet-%d-%s' % [p[0], s], 'trim', [p[1] - 0.007, p[2] - 0.007, if s == 'r' then w else -w - 0.003], [p[1] + 0.007, p[2] + 0.007, if s == 'r' then w + 0.003 else -w])
    for p in [[0, -0.15, 0.18], [1, -0.15, 0.30], [2, 0.14, 0.18], [3, 0.14, 0.30]]
    for s in ['l', 'r']
  ], { round: 'brass' });

[
  carbine('bolt_carbine', 11.5, boxMagazine),
  carbine('bolt_carbine_drum', 12.5, drumMagazine),
]
